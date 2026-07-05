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

function polygonArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

export function normalizeCornerOrder(pts: Point[]): [Point, Point, Point, Point] | null {
  if (pts.length !== 4 || pts.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;

  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  const ordered = pts.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const start = ordered.reduce((best, p, i) => (p.x + p.y < ordered[best].x + ordered[best].y ? i : best), 0);
  const rotated = [...ordered.slice(start), ...ordered.slice(0, start)];

  // Expected order is tl, tr, br, bl. If the polygon is counter-ordered after
  // rotation, swap the right-side points to make a convex clockwise quad.
  const quad = rotated as [Point, Point, Point, Point];
  if (polygonArea(quad) < 0) return [quad[0], quad[3], quad[2], quad[1]];
  return quad;
}

function quadBounds(quad: Point[]) {
  return {
    minX: Math.min(...quad.map((p) => p.x)),
    maxX: Math.max(...quad.map((p) => p.x)),
    minY: Math.min(...quad.map((p) => p.y)),
    maxY: Math.max(...quad.map((p) => p.y)),
  };
}

function isConvexQuad(quad: Point[]) {
  if (quad.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-3) return false;
    const currentSign = Math.sign(cross);
    if (!sign) sign = currentSign;
    else if (sign !== currentSign) return false;
  }
  return true;
}

export function validateDocumentQuad(pts: Point[], width: number, height: number): [Point, Point, Point, Point] | null {
  const quad = normalizeCornerOrder(pts);
  if (!quad || !isConvexQuad(quad)) return null;

  const bounds = quadBounds(quad);
  if (bounds.minX < -width * 0.03 || bounds.maxX > width * 1.03) return null;
  if (bounds.minY < -height * 0.03 || bounds.maxY > height * 1.03) return null;

  const area = Math.abs(polygonArea(quad));
  const areaFrac = area / Math.max(1, width * height);
  if (areaFrac < 0.025 || areaFrac > 0.94) return null;

  const topW = Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y);
  const botW = Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y);
  const leftH = Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y);
  const rightH = Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y);
  const minSide = Math.min(width, height);
  if (Math.min(topW, botW) < minSide * 0.08 || Math.min(leftH, rightH) < minSide * 0.12) return null;
  if (Math.min(topW, botW) / Math.max(topW, botW) < 0.45) return null;
  if (Math.min(leftH, rightH) / Math.max(leftH, rightH) < 0.62) return null;

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  const aspect = Math.max(avgW / Math.max(avgH, 1), avgH / Math.max(avgW, 1));
  if (aspect > 6.5) return null;

  return quad;
}

function scoreDocumentQuad(quad: Point[], width: number, height: number, areaHint?: number) {
  const bounds = quadBounds(quad);
  const quadArea = Math.abs(polygonArea(quad));
  const areaFrac = quadArea / Math.max(1, width * height);
  const bboxAreaFrac = ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) / Math.max(1, width * height);
  const margin = Math.min(width, height) * 0.025;
  const touches = quad.filter(
    (p) => p.x <= margin || p.x >= width - margin || p.y <= margin || p.y >= height - margin,
  ).length;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerBias = 1 - Math.min(1, Math.hypot(centerX - width / 2, centerY - height / 2) / Math.hypot(width / 2, height / 2));
  const documentSized = areaFrac > 0.06 && areaFrac < 0.78 ? 1 : 0.55;
  const borderPenalty = touches >= 3 ? 1.8 : touches >= 2 ? 0.9 : touches ? 0.35 : 0;
  const hugeOuterPenalty = bboxAreaFrac > 0.82 ? 1.2 : 0;
  const filledBonus = areaHint ? Math.min(1, areaHint / Math.max(1, quadArea)) : 0.5;
  return areaFrac * 2.2 + bboxAreaFrac * 0.55 + centerBias * 0.45 + documentSized + filledBonus * 0.35 - borderPenalty - hugeOuterPenalty;
}

export const fallbackCorners = (w: number, h: number): DocumentCorners => ({
  topLeft: { x: w * 0.08, y: h * 0.08 },
  topRight: { x: w * 0.92, y: h * 0.08 },
  bottomRight: { x: w * 0.92, y: h * 0.92 },
  bottomLeft: { x: w * 0.08, y: h * 0.92 },
  detected: false,
});

// ─── Main export ─────────────────────────────────────────────────────────────

export async function detectDocumentCorners(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<DocumentCorners> {
  // Multiple strategies, first success wins. The order matters: robust contour
  // and paper-mask strategies run before broad background/flood-fill fallbacks
  // so screenshots and camera frames do not get mistaken for the document.
  const strategies = [
    () => detectByPaperProjection(imageElement, width, height),
    () => detectByPaperMask(imageElement, width, height),
    () => detectByOpenCVContours(imageElement, width, height),
    () => detectByLargestBlob(imageElement, width, height),
    () => detectByFloodFill(imageElement, width, height),
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

function detectByPaperProjection(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const scale = Math.min(1, 700 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const mask = new Uint8Array(sw * sh);
  const col = new Uint16Array(sw);
  const row = new Uint16Array(sh);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx ? (mx - mn) / mx : 0;
      if (lum > 68 && sat < 0.34) {
        mask[y * sw + x] = 1;
        col[x]++;
        row[y]++;
      }
    }
  }

  const longestRun = (arr: Uint16Array, threshold: number, minRun: number) => {
    let bestStart = -1,
      bestEnd = -1,
      start = -1;
    for (let i = 0; i <= arr.length; i++) {
      const on = i < arr.length && arr[i] >= threshold;
      if (on && start < 0) start = i;
      if ((!on || i === arr.length) && start >= 0) {
        const end = i - 1;
        if (end - start + 1 >= minRun && end - start > bestEnd - bestStart) {
          bestStart = start;
          bestEnd = end;
        }
        start = -1;
      }
    }
    return bestStart >= 0 ? { start: bestStart, end: bestEnd } : null;
  };

  const xr = longestRun(col, sh * 0.1, sw * 0.08);
  const yr = longestRun(row, sw * 0.07, sh * 0.12);
  if (!xr || !yr) return null;

  // Tighten bounds inside the coarse projected page area.
  let minX = xr.end,
    maxX = xr.start,
    minY = yr.end,
    maxY = yr.start;
  for (let y = yr.start; y <= yr.end; y++) {
    for (let x = xr.start; x <= xr.end; x++) {
      if (!mask[y * sw + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const pad = Math.max(2, Math.round(Math.min(sw, sh) * 0.01));
  const raw = [
    { x: (minX - pad) / scale, y: (minY - pad) / scale },
    { x: (maxX + pad) / scale, y: (minY - pad) / scale },
    { x: (maxX + pad) / scale, y: (maxY + pad) / scale },
    { x: (minX - pad) / scale, y: (maxY + pad) / scale },
  ];
  const quad = validateDocumentQuad(raw, width, height);
  if (!quad) return null;
  return { topLeft: quad[0], topRight: quad[1], bottomRight: quad[2], bottomLeft: quad[3], detected: true };
}

// ─── Strategy 0: OpenCV contour quadrilateral detection ─────────────────────
// This is the closest browser equivalent to native scanner apps: detect strong
// contours, approximate them to 4-point polygons, then score the candidate that
// most looks like the actual paper rather than the outer photo/window frame.

function detectByOpenCVContours(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const cv = typeof window !== "undefined" ? (window as any).cv : null;
  if (!cv?.Mat || !cv?.findContours) return null;

  const scale = Math.min(1, 900 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);

  let src: any;
  let gray: any;
  let blurred: any;
  let edges: any;
  let closed: any;
  let contours: any;
  let hierarchy: any;
  let kernel: any;
  const candidates: { quad: [Point, Point, Point, Point]; area: number; score: number }[] = [];

  try {
    src = cv.imread(canvas);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    edges = new cv.Mat();
    closed = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    kernel = cv.Mat.ones(5, 5, cv.CV_8U);

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 45, 135, 3, false);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const approx = new cv.Mat();
      try {
        const peri = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.025 * peri, true);
        const area = Math.abs(cv.contourArea(contour, false));
        if (approx.rows !== 4 || area < sw * sh * 0.025) continue;

        const data = approx.data32S;
        const raw: Point[] = [
          { x: data[0] / scale, y: data[1] / scale },
          { x: data[2] / scale, y: data[3] / scale },
          { x: data[4] / scale, y: data[5] / scale },
          { x: data[6] / scale, y: data[7] / scale },
        ];
        const quad = validateDocumentQuad(raw, width, height);
        if (!quad) continue;
        candidates.push({ quad, area: area / (scale * scale), score: scoreDocumentQuad(quad, width, height, area / (scale * scale)) });
      } finally {
        approx.delete?.();
        contour.delete?.();
      }
    }
  } catch (e) {
    console.warn("OpenCV contour detection failed:", e);
  } finally {
    [src, gray, blurred, edges, closed, contours, hierarchy, kernel].forEach((m) => {
      try {
        m?.delete?.();
      } catch {}
    });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].quad;
  return {
    topLeft: best[0],
    topRight: best[1],
    bottomRight: best[2],
    bottomLeft: best[3],
    detected: true,
  };
}

// ─── Strategy 1: paper-colour connected components ──────────────────────────
// Scanner photos usually contain an off-white/grey low-saturation page even
// when the surroundings are complex. This mask finds paper-like components and
// rejects giant frames/background strips.

function detectByPaperMask(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  const scale = Math.min(1, 620 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  const brightness = new Uint8Array(sw * sh);
  let sum = 0;
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    brightness[i] = lum;
    sum += lum;
    const likelyPaper = lum > 92 && sat < 0.28 && r > 75 && g > 75 && b > 75;
    brightness[i] = likelyPaper ? lum : 0;
  }

  const mean = sum / Math.max(1, sw * sh);
  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < mask.length; i++) mask[i] = brightness[i] > Math.max(88, mean * 0.68) ? 1 : 0;

  // Light morphological close/dilate so document text and fold shadows do not
  // split the paper into many small pieces.
  const closed = new Uint8Array(mask.length);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) count += mask[(y + dy) * sw + x + dx];
      closed[y * sw + x] = count >= 3 ? 1 : 0;
    }
  }

  const labels = new Int32Array(sw * sh).fill(-1);
  const candidates: { quad: [Point, Point, Point, Point]; area: number; score: number }[] = [];
  let label = 0;

  for (let start = 0; start < sw * sh; start++) {
    if (!closed[start] || labels[start] >= 0) continue;
    const queue = [start];
    labels[start] = label;
    let qi = 0;
    let size = 0;
    let minX = sw,
      maxX = 0,
      minY = sh,
      maxY = 0;

    while (qi < queue.length) {
      const idx = queue[qi++];
      size++;
      const x = idx % sw;
      const y = Math.floor(idx / sw);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const neighbors = [x > 0 ? idx - 1 : -1, x < sw - 1 ? idx + 1 : -1, y > 0 ? idx - sw : -1, y < sh - 1 ? idx + sw : -1];
      for (const n of neighbors) {
        if (n >= 0 && closed[n] && labels[n] < 0) {
          labels[n] = label;
          queue.push(n);
        }
      }
    }

    const areaFrac = size / Math.max(1, sw * sh);
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (areaFrac < 0.018 || bw < sw * 0.08 || bh < sh * 0.1) {
      label++;
      continue;
    }

    const docMask = new Uint8Array(sw * sh).fill(1);
    for (let i = 0; i < labels.length; i++) if (labels[i] === label) docMask[i] = 0;
    const pad = Math.max(2, Math.round(Math.min(sw, sh) * 0.01));
    const raw = [
      { x: (minX - pad) / scale, y: (minY - pad) / scale },
      { x: (maxX + pad) / scale, y: (minY - pad) / scale },
      { x: (maxX + pad) / scale, y: (maxY + pad) / scale },
      { x: (minX - pad) / scale, y: (maxY + pad) / scale },
    ];
    const quad = validateDocumentQuad(raw, width, height);
    if (quad) candidates.push({ quad, area: size / (scale * scale), score: scoreDocumentQuad(quad, width, height, size / (scale * scale)) });
    label++;
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].quad;
  return {
    topLeft: best[0],
    topRight: best[1],
    bottomRight: best[2],
    bottomLeft: best[3],
    detected: true,
  };
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

  const quad = validateDocumentQuad(
    corners.map((p) => ({ x: p.x / scale, y: p.y / scale })),
    width,
    height,
  );
  if (!quad) return null;

  // Scale back to original dimensions
  return {
    topLeft: quad[0],
    topRight: quad[1],
    bottomRight: quad[2],
    bottomLeft: quad[3],
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
  const quad = validateDocumentQuad(
    corners.map((p) => ({ x: p.x / scale, y: p.y / scale })),
    width,
    height,
  );
  if (!quad) return null;

  return {
    topLeft: quad[0],
    topRight: quad[1],
    bottomRight: quad[2],
    bottomLeft: quad[3],
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

  const quad = validateDocumentQuad([scores.tl.p, scores.tr.p, scores.br.p, scores.bl.p], width, height);
  if (!quad) return null;

  return {
    topLeft: quad[0],
    topRight: quad[1],
    bottomRight: quad[2],
    bottomLeft: quad[3],
    detected: true,
  };
}
