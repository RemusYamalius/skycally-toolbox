export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  detected: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const fallbackCorners = (w: number, h: number): DocumentCorners => ({
  topLeft: { x: w * 0.08, y: h * 0.08 },
  topRight: { x: w * 0.92, y: h * 0.08 },
  bottomRight: { x: w * 0.92, y: h * 0.92 },
  bottomLeft: { x: w * 0.08, y: h * 0.92 },
  detected: false,
});

function sortCorners(pts: Point[]): [Point, Point, Point, Point] | null {
  if (pts.length !== 4) return null;
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  const tl = pts.filter((p) => p.x <= cx && p.y <= cy);
  const tr = pts.filter((p) => p.x > cx && p.y <= cy);
  const br = pts.filter((p) => p.x > cx && p.y > cy);
  const bl = pts.filter((p) => p.x <= cx && p.y > cy);
  if (!tl.length || !tr.length || !br.length || !bl.length) return null;
  const pick = (arr: Point[], fn: (a: Point, b: Point) => Point) => arr.reduce((best, p) => fn(best, p));
  return [
    pick(tl, (a, b) => (a.x + a.y < b.x + b.y ? a : b)),
    pick(tr, (a, b) => (b.x - b.y < a.x - a.y ? a : b)),
    pick(br, (a, b) => (a.x + a.y > b.x + b.y ? a : b)),
    pick(bl, (a, b) => (b.x - b.y > a.x - a.y ? a : b)),
  ];
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function detectDocumentCorners(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<DocumentCorners> {
  // Multiple strategies, first success wins
  const strategies = [
    () => detectByFloodFill(imageElement, width, height),
    () => detectByLargestBlob(imageElement, width, height),
    () => detectBySobel(imageElement, width, height),
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (result) return result;
    } catch (e) {
      console.warn("Detection strategy failed:", e);
    }
  }

  return fallbackCorners(width, height);
}

// ─── Strategy 1: Flood-fill from corners to isolate background ───────────────
// Works best when document is lighter than background OR has clear boundary.
// Flood-fills from the 4 image corners outward to find the background mask,
// then the document is whatever is NOT background.

function detectByFloodFill(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const scale = Math.min(1, 500 / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  // Convert to grayscale
  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Sample background color from corners (5x5 patch average)
  const patchSize = 5;
  let bgSum = 0,
    bgCount = 0;
  const cornerSeeds = [
    [0, 0],
    [sw - patchSize, 0],
    [0, sh - patchSize],
    [sw - patchSize, sh - patchSize],
  ];
  for (const [cx, cy] of cornerSeeds) {
    for (let dy = 0; dy < patchSize; dy++) {
      for (let dx = 0; dx < patchSize; dx++) {
        const x = clamp(cx + dx, 0, sw - 1);
        const y = clamp(cy + dy, 0, sh - 1);
        bgSum += gray[y * sw + x];
        bgCount++;
      }
    }
  }
  const bgColor = bgSum / bgCount;

  // Tolerance: how different from background to still be "background"
  // Adaptive: tighter for high-contrast scenes, looser for similar colors
  const tolerance = Math.max(20, Math.min(60, bgColor * 0.25));

  // BFS flood-fill from all 4 corners simultaneously
  const visited = new Uint8Array(sw * sh);
  const queue: number[] = [];

  const seed = (x: number, y: number) => {
    const idx = y * sw + x;
    if (!visited[idx] && Math.abs(gray[idx] - bgColor) <= tolerance) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  // Seed from all border pixels
  for (let x = 0; x < sw; x++) {
    seed(x, 0);
    seed(x, sh - 1);
  }
  for (let y = 0; y < sh; y++) {
    seed(0, y);
    seed(sw - 1, y);
  }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % sw,
      y = Math.floor(idx / sw);
    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < sw - 1 ? idx + 1 : -1,
      y > 0 ? idx - sw : -1,
      y < sh - 1 ? idx + sw : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      if (Math.abs(gray[n] - bgColor) <= tolerance) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  // Document pixels = NOT visited (not background)
  // Find bounding box of document pixels
  let minX = sw,
    maxX = 0,
    minY = sh,
    maxY = 0;
  let docPixels = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (!visited[y * sw + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        docPixels++;
      }
    }
  }

  // Validate: document should be at least 15% of image
  if (docPixels < sw * sh * 0.15) return null;
  if (maxX - minX < sw * 0.15 || maxY - minY < sh * 0.15) return null;

  // Now find the actual corner points using contour scanning
  // For each row, find leftmost/rightmost doc pixel
  // For each col, find topmost/bottommost doc pixel
  const corners = findDocumentCorners(visited, sw, sh, minX, maxX, minY, maxY);
  if (!corners) return null;

  // Scale back to original dimensions
  return {
    topLeft: { x: corners[0].x / scale, y: corners[0].y / scale },
    topRight: { x: corners[1].x / scale, y: corners[1].y / scale },
    bottomRight: { x: corners[2].x / scale, y: corners[2].y / scale },
    bottomLeft: { x: corners[3].x / scale, y: corners[3].y / scale },
    detected: true,
  };
}

// Find the 4 extreme corner points of the document mask
function findDocumentCorners(
  mask: Uint8Array, // 0 = background, nonzero = visited (background)
  sw: number,
  sh: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): [Point, Point, Point, Point] | null {
  // Collect edge points: for each scanline, leftmost and rightmost doc pixel
  const docPoints: Point[] = [];
  const step = Math.max(1, Math.round(sh / 60));

  for (let y = minY; y <= maxY; y += step) {
    let left = -1,
      right = -1;
    for (let x = minX; x <= maxX; x++) {
      if (!mask[y * sw + x]) {
        left = x;
        break;
      }
    }
    for (let x = maxX; x >= minX; x--) {
      if (!mask[y * sw + x]) {
        right = x;
        break;
      }
    }
    if (left >= 0) docPoints.push({ x: left, y });
    if (right >= 0 && right !== left) docPoints.push({ x: right, y });
  }

  for (let x = minX; x <= maxX; x += step) {
    let top = -1,
      bottom = -1;
    for (let y = minY; y <= maxY; y++) {
      if (!mask[y * sw + x]) {
        top = y;
        break;
      }
    }
    for (let y = maxY; y >= minY; y--) {
      if (!mask[y * sw + x]) {
        bottom = y;
        break;
      }
    }
    if (top >= 0) docPoints.push({ x, y: top });
    if (bottom >= 0 && bottom !== top) docPoints.push({ x, y: bottom });
  }

  if (docPoints.length < 8) return null;

  // Find 4 extreme corners using diagonal scoring
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // TL: minimize x+y, TR: maximize x-y, BR: maximize x+y, BL: minimize x-y
  let tl = docPoints[0],
    tr = docPoints[0],
    br = docPoints[0],
    bl = docPoints[0];
  let tlScore = Infinity,
    trScore = -Infinity,
    brScore = -Infinity,
    blScore = Infinity;

  for (const p of docPoints) {
    const sumXY = p.x + p.y;
    const diffXY = p.x - p.y;
    if (sumXY < tlScore) {
      tlScore = sumXY;
      tl = p;
    }
    if (diffXY > trScore) {
      trScore = diffXY;
      tr = p;
    }
    if (sumXY > brScore) {
      brScore = sumXY;
      br = p;
    }
    if (diffXY < blScore) {
      blScore = diffXY;
      bl = p;
    }
  }

  // Validate the quad makes geometric sense
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

  if (topW < width * 0.3 || botW < width * 0.3) return null;
  if (leftH < height * 0.3 || rightH < height * 0.3) return null;

  return [tl, tr, br, bl];
}

// ─── Strategy 2: Largest bright blob ─────────────────────────────────────────
// Finds the largest connected region of bright (document-like) pixels.
// Handles cases where the document IS the bright object.

function detectByLargestBlob(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const scale = Math.min(1, 400 / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  // Grayscale
  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Otsu threshold to separate bright (document) from dark (background)
  const hist = new Int32Array(256);
  for (let v of gray) hist[v]++;
  const total = sw * sh;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    max = 0,
    threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB,
      mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) {
      max = between;
      threshold = t;
    }
  }

  // Binary mask: 1 = bright (possible document)
  const bright = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) bright[i] = gray[i] >= threshold ? 1 : 0;

  // Find largest connected component of bright pixels
  const labels = new Int32Array(sw * sh).fill(-1);
  let maxLabel = -1,
    maxSize = 0;
  let label = 0;

  for (let start = 0; start < sw * sh; start++) {
    if (!bright[start] || labels[start] >= 0) continue;
    const queue = [start];
    labels[start] = label;
    let size = 0;
    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      size++;
      const x = idx % sw,
        y = Math.floor(idx / sw);
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < sw - 1 ? idx + 1 : -1,
        y > 0 ? idx - sw : -1,
        y < sh - 1 ? idx + sw : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && bright[n] && labels[n] < 0) {
          labels[n] = label;
          queue.push(n);
        }
      }
    }
    if (size > maxSize) {
      maxSize = size;
      maxLabel = label;
    }
    label++;
  }

  if (maxLabel < 0 || maxSize < total * 0.1) return null;

  // Build mask from largest blob
  const blobMask = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) blobMask[i] = labels[i] === maxLabel ? 0 : 1; // 0 = doc pixel

  let minX = sw,
    maxX = 0,
    minY = sh,
    maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (!blobMask[y * sw + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const corners = findDocumentCorners(blobMask, sw, sh, minX, maxX, minY, maxY);
  if (!corners) return null;

  return {
    topLeft: { x: corners[0].x / scale, y: corners[0].y / scale },
    topRight: { x: corners[1].x / scale, y: corners[1].y / scale },
    bottomRight: { x: corners[2].x / scale, y: corners[2].y / scale },
    bottomLeft: { x: corners[3].x / scale, y: corners[3].y / scale },
    detected: true,
  };
}

// ─── Strategy 3: Sobel edge + Hough lines ────────────────────────────────────
// Classic approach — works best for high-contrast edges.

function gaussianBlur(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const k = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let s = 0,
        ki = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s += gray[(y + dy) * w + (x + dx)] * k[ki++];
      out[y * w + x] = s / 256;
    }
  }
  return out;
}

function detectBySobel(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const scale = Math.min(1, 500 / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  const gray = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  const blurred = gaussianBlur(gray, sw, sh);

  // Adaptive Canny-like threshold
  let sum = 0;
  for (const v of blurred) sum += v;
  const mean = sum / blurred.length;
  const loThr = mean * 0.2;
  const hiThr = mean * 0.6;

  const edges = new Uint8Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const gx =
        -blurred[(y - 1) * sw + (x - 1)] +
        blurred[(y - 1) * sw + (x + 1)] -
        2 * blurred[y * sw + (x - 1)] +
        2 * blurred[y * sw + (x + 1)] -
        blurred[(y + 1) * sw + (x - 1)] +
        blurred[(y + 1) * sw + (x + 1)];
      const gy =
        -blurred[(y - 1) * sw + (x - 1)] -
        2 * blurred[(y - 1) * sw + x] -
        blurred[(y - 1) * sw + (x + 1)] +
        blurred[(y + 1) * sw + (x - 1)] +
        2 * blurred[(y + 1) * sw + x] +
        blurred[(y + 1) * sw + (x + 1)];
      const mag = Math.hypot(gx, gy);
      edges[y * sw + x] = mag > hiThr ? 255 : mag > loThr ? 128 : 0;
    }
  }

  // Hough transform
  const diag = Math.ceil(Math.hypot(sw, sh));
  const nAngles = 180;
  const acc = new Int32Array(2 * diag * nAngles);
  const cosT = new Float32Array(nAngles);
  const sinT = new Float32Array(nAngles);
  for (let t = 0; t < nAngles; t++) {
    cosT[t] = Math.cos((t * Math.PI) / nAngles);
    sinT[t] = Math.sin((t * Math.PI) / nAngles);
  }

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (edges[y * sw + x] < 128) continue;
      for (let t = 0; t < nAngles; t++) {
        const rho = Math.round(x * cosT[t] + y * sinT[t]) + diag;
        acc[rho * nAngles + t]++;
      }
    }
  }

  // Collect lines above adaptive threshold
  let maxVotes = 0;
  for (const v of acc) if (v > maxVotes) maxVotes = v;
  const lineThr = Math.max(20, maxVotes * 0.25);

  const lines: { rho: number; theta: number; votes: number }[] = [];
  for (let r = 0; r < 2 * diag; r++) {
    for (let t = 0; t < nAngles; t++) {
      if (acc[r * nAngles + t] >= lineThr)
        lines.push({ rho: r - diag, theta: (t * Math.PI) / nAngles, votes: acc[r * nAngles + t] });
    }
  }
  lines.sort((a, b) => b.votes - a.votes);

  // NMS
  const kept: typeof lines = [];
  for (const l of lines) {
    if (!kept.some((k) => Math.abs(l.rho - k.rho) < 20 && Math.abs(l.theta - k.theta) < 0.2)) kept.push(l);
    if (kept.length >= 20) break;
  }

  if (kept.length < 4) return null;

  // Intersections
  const pts: Point[] = [];
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      const dTheta = Math.abs(kept[i].theta - kept[j].theta);
      if (dTheta < 0.3 || dTheta > Math.PI - 0.3) continue;
      const cos1 = Math.cos(kept[i].theta),
        sin1 = Math.sin(kept[i].theta);
      const cos2 = Math.cos(kept[j].theta),
        sin2 = Math.sin(kept[j].theta);
      const det = cos1 * sin2 - sin1 * cos2;
      if (Math.abs(det) < 1e-6) continue;
      const x = (kept[i].rho * sin2 - kept[j].rho * sin1) / det;
      const y = (kept[j].rho * cos1 - kept[i].rho * cos2) / det;
      if (x < -20 || x > sw + 20 || y < -20 || y > sh + 20) continue;
      pts.push({ x: clamp(x / scale, 0, width), y: clamp(y / scale, 0, height) });
    }
  }

  if (pts.length < 4) return null;

  // Pick 4 extreme corners
  const scores = {
    tl: { p: pts[0], s: Infinity },
    tr: { p: pts[0], s: -Infinity },
    br: { p: pts[0], s: -Infinity },
    bl: { p: pts[0], s: Infinity },
  };
  for (const p of pts) {
    if (p.x + p.y < scores.tl.s) {
      scores.tl = { p, s: p.x + p.y };
    }
    if (p.x - p.y > scores.tr.s) {
      scores.tr = { p, s: p.x - p.y };
    }
    if (p.x + p.y > scores.br.s) {
      scores.br = { p, s: p.x + p.y };
    }
    if (p.x - p.y < scores.bl.s) {
      scores.bl = { p, s: p.x - p.y };
    }
  }

  const quad = [scores.tl.p, scores.tr.p, scores.br.p, scores.bl.p];
  const area =
    0.5 *
    Math.abs((quad[1].x - quad[3].x) * (quad[2].y - quad[0].y) - (quad[2].x - quad[0].x) * (quad[1].y - quad[3].y));
  if (area < width * height * 0.1) return null;

  return {
    topLeft: quad[0],
    topRight: quad[1],
    bottomRight: quad[2],
    bottomLeft: quad[3],
    detected: true,
  };
}
