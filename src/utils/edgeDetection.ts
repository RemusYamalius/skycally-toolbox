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

// ─── Helpers ────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const fallbackCorners = (w: number, h: number): DocumentCorners => ({
  topLeft: { x: w * 0.08, y: h * 0.08 },
  topRight: { x: w * 0.92, y: h * 0.08 },
  bottomRight: { x: w * 0.92, y: h * 0.92 },
  bottomLeft: { x: w * 0.08, y: h * 0.92 },
  detected: false,
});

/** Sort 4 arbitrary points into [TL, TR, BR, BL] order */
function sortCorners(pts: Point[]): [Point, Point, Point, Point] | null {
  if (pts.length !== 4) return null;
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  const tl = pts.filter((p) => p.x < cx && p.y < cy);
  const tr = pts.filter((p) => p.x >= cx && p.y < cy);
  const br = pts.filter((p) => p.x >= cx && p.y >= cy);
  const bl = pts.filter((p) => p.x < cx && p.y >= cy);
  if (!tl.length || !tr.length || !br.length || !bl.length) return null;
  return [tl[0], tr[0], br[0], bl[0]];
}

// ─── Pure-Canvas Sobel edge detector ────────────────────────────────────────

function sobelEdges(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  // Convert to grayscale first
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Gaussian blur 5x5
  const blurred = new Float32Array(w * h);
  const kernel = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1];
  const kSum = 256;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y + ky) * w + (x + kx)] * kernel[ki++];
        }
      }
      blurred[y * w + x] = sum / kSum;
    }
  }

  // Sobel
  const edges = new Uint8Array(w * h);
  const threshold = 25;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -blurred[(y - 1) * w + (x - 1)] +
        blurred[(y - 1) * w + (x + 1)] -
        2 * blurred[y * w + (x - 1)] +
        2 * blurred[y * w + (x + 1)] -
        blurred[(y + 1) * w + (x - 1)] +
        blurred[(y + 1) * w + (x + 1)];
      const gy =
        -blurred[(y - 1) * w + (x - 1)] -
        2 * blurred[(y - 1) * w + x] -
        blurred[(y - 1) * w + (x + 1)] +
        blurred[(y + 1) * w + (x - 1)] +
        2 * blurred[(y + 1) * w + x] +
        blurred[(y + 1) * w + (x + 1)];
      edges[y * w + x] = Math.hypot(gx, gy) > threshold ? 255 : 0;
    }
  }
  return edges;
}

/** Simple dilation to thicken edges */
function dilate(edges: Uint8Array, w: number, h: number, r = 2): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = r; y < h - r; y++) {
    for (let x = r; x < w - r; x++) {
      let found = false;
      outer: for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (edges[(y + dy) * w + (x + dx)] === 255) {
            found = true;
            break outer;
          }
        }
      }
      if (found) out[y * w + x] = 255;
    }
  }
  return out;
}

// ─── Hough-line based corner detection ──────────────────────────────────────

interface Line {
  rho: number;
  theta: number;
  votes: number;
}

function houghLines(edges: Uint8Array, w: number, h: number, threshold = 60): Line[] {
  const diagonal = Math.ceil(Math.hypot(w, h));
  const numAngles = 180;
  const accumulator = new Int32Array(2 * diagonal * numAngles);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x] !== 255) continue;
      for (let t = 0; t < numAngles; t++) {
        const theta = (t * Math.PI) / numAngles;
        const rho = Math.round(x * Math.cos(theta) + y * Math.sin(theta)) + diagonal;
        accumulator[rho * numAngles + t]++;
      }
    }
  }

  const lines: Line[] = [];
  for (let r = 0; r < 2 * diagonal; r++) {
    for (let t = 0; t < numAngles; t++) {
      const v = accumulator[r * numAngles + t];
      if (v >= threshold) {
        lines.push({ rho: r - diagonal, theta: (t * Math.PI) / numAngles, votes: v });
      }
    }
  }
  return lines.sort((a, b) => b.votes - a.votes);
}

/** Suppress lines that are too close / parallel to each other */
function suppressLines(lines: Line[], rhoTol = 20, thetaTol = 0.2): Line[] {
  const kept: Line[] = [];
  for (const l of lines) {
    let dominated = false;
    for (const k of kept) {
      if (Math.abs(l.rho - k.rho) < rhoTol && Math.abs(l.theta - k.theta) < thetaTol) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(l);
  }
  return kept;
}

/** Intersect two Hough lines -> pixel coordinates */
function intersect(l1: Line, l2: Line): Point | null {
  const cos1 = Math.cos(l1.theta),
    sin1 = Math.sin(l1.theta);
  const cos2 = Math.cos(l2.theta),
    sin2 = Math.sin(l2.theta);
  const det = cos1 * sin2 - sin1 * cos2;
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (l1.rho * sin2 - l2.rho * sin1) / det,
    y: (l2.rho * cos1 - l1.rho * cos2) / det,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Detect the four corners of a document in an image.
 * 1. Tries OpenCV (if loaded) for best accuracy.
 * 2. Falls back to pure-Canvas Sobel + Hough line detection.
 * 3. Falls back to a padded rectangle as last resort.
 */
export async function detectDocumentCorners(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<DocumentCorners> {
  const fallback = fallbackCorners(width, height);

  // ── Attempt 1: OpenCV (already loaded, no extra wait) ──────────────────
  const cv = typeof window !== "undefined" ? (window as any).cv : null;
  if (cv && cv.Mat) {
    try {
      const result = await detectWithOpenCV(cv, imageElement, width, height);
      if (result) return result;
    } catch (e) {
      console.warn("OpenCV detection failed, trying pure-JS:", e);
    }
  }

  // ── Attempt 2: Pure Canvas / Sobel + Hough ─────────────────────────────
  try {
    const result = detectWithCanvas(imageElement, width, height);
    if (result) return result;
  } catch (e) {
    console.warn("Canvas detection failed:", e);
  }

  return fallback;
}

// ─── OpenCV path ─────────────────────────────────────────────────────────────

async function detectWithOpenCV(
  cv: any,
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<DocumentCorners | null> {
  let src: any, small: any, gray: any, blurred: any, edges: any;
  let kernel: any, dilated: any, contours: any, hierarchy: any;

  try {
    src = cv.imread(imageElement);
    if (!src || src.empty()) return null;

    const scale = Math.min(1, 800 / Math.max(src.cols, src.rows));
    small = new cv.Mat();
    cv.resize(src, small, new cv.Size(Math.floor(src.cols * scale), Math.floor(src.rows * scale)));

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    // Adaptive Gaussian blur based on image size
    const ksize = Math.max(3, Math.round(small.cols / 200) * 2 + 1);
    blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(ksize, ksize), 0);

    edges = new cv.Mat();
    // Auto-threshold using Otsu's method idea — median-based
    cv.Canny(blurred, edges, 20, 80);

    kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    dilated = new cv.Mat();
    cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 3);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = small.cols * small.rows;
    const minArea = imageArea * 0.1; // minimum 10% of image

    let bestCorners: DocumentCorners | null = null;
    let bestScore = 0;

    const numContours = contours.size();
    const candidates: { contour: any; area: number }[] = [];
    for (let i = 0; i < numContours; i++) {
      const c = contours.get(i);
      candidates.push({ contour: c, area: cv.contourArea(c) });
    }
    candidates.sort((a, b) => b.area - a.area);

    for (const { contour, area } of candidates.slice(0, 15)) {
      if (area < minArea) continue;
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();

      for (const eps of [0.01, 0.02, 0.03, 0.04, 0.05, 0.07, 0.1]) {
        cv.approxPolyDP(contour, approx, eps * perimeter, true);
        if (approx.rows !== 4) continue;
        if (!cv.isContourConvex(approx)) continue;

        const pts: Point[] = [];
        for (let j = 0; j < 4; j++) {
          pts.push({
            x: clamp(approx.data32S[j * 2] / scale, 0, width),
            y: clamp(approx.data32S[j * 2 + 1] / scale, 0, height),
          });
        }

        const sorted = sortCorners(pts);
        if (!sorted) continue;

        // Score: larger area is better, penalise non-rectangular shapes
        const [tl, tr, br, bl] = sorted;
        const topW = dist(tl, tr),
          botW = dist(bl, br);
        const leftH = dist(tl, bl),
          rightH = dist(tr, br);
        const rectangularity =
          ((Math.min(topW, botW) / Math.max(topW, botW)) * Math.min(leftH, rightH)) / Math.max(leftH, rightH);
        const score = area * rectangularity;

        if (score > bestScore) {
          bestScore = score;
          bestCorners = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl, detected: true };
        }
        break;
      }
      approx.delete();
      contour.delete();
    }

    return bestCorners;
  } finally {
    [src, small, gray, blurred, edges, kernel, dilated, contours, hierarchy].forEach((m) => {
      try {
        m?.delete?.();
      } catch {}
    });
  }
}

// ─── Pure-Canvas path ────────────────────────────────────────────────────────

function detectWithCanvas(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): DocumentCorners | null {
  // Work at reduced resolution for speed
  const scale = Math.min(1, 600 / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  // Edge detection
  let edges = sobelEdges(data, sw, sh);
  edges = dilate(edges, sw, sh, 2);

  // Hough lines — adaptive threshold
  const edgeCount = edges.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
  const houghThreshold = Math.max(30, Math.round(edgeCount * 0.03));
  const lines = houghLines(edges, sw, sh, houghThreshold);
  const filtered = suppressLines(lines, 15, 0.25).slice(0, 20);

  if (filtered.length < 4) return null;

  // Find the 4 best-intersecting corners inside image bounds
  const margin = 5;
  const candidates: Point[] = [];
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      // Skip near-parallel lines
      const dTheta = Math.abs(filtered[i].theta - filtered[j].theta);
      if (dTheta < 0.3 || dTheta > Math.PI - 0.3) continue;
      const pt = intersect(filtered[i], filtered[j]);
      if (!pt) continue;
      if (pt.x < -margin || pt.x > sw + margin || pt.y < -margin || pt.y > sh + margin) continue;
      candidates.push({
        x: clamp(pt.x / scale, 0, width),
        y: clamp(pt.y / scale, 0, height),
      });
    }
  }

  if (candidates.length < 4) return null;

  // Cluster candidates to find 4 corner regions
  // k-means style: seed with 4 extreme points
  const seeds: Point[] = [
    candidates.reduce((a, b) => (a.x + a.y < b.x + b.y ? a : b)), // TL
    candidates.reduce((a, b) => (a.x - a.y > b.x - b.y ? a : b)), // TR
    candidates.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b)), // BR
    candidates.reduce((a, b) => (a.x - a.y < b.x - b.y ? a : b)), // BL
  ];

  // Refine by averaging nearby candidates for each seed
  const radius = Math.max(width, height) * 0.25;
  const refined = seeds.map((seed) => {
    const nearby = candidates.filter((c) => dist(c, seed) < radius);
    if (!nearby.length) return seed;
    return {
      x: nearby.reduce((s, c) => s + c.x, 0) / nearby.length,
      y: nearby.reduce((s, c) => s + c.y, 0) / nearby.length,
    };
  });

  const sorted = sortCorners(refined);
  if (!sorted) return null;

  // Validate: the detected quadrilateral should cover a reasonable area
  const [tl, tr, br, bl] = sorted;
  const detectedArea = 0.5 * Math.abs((tr.x - bl.x) * (br.y - tl.y) - (br.x - tl.x) * (tr.y - bl.y));
  const imageArea = width * height;
  if (detectedArea < imageArea * 0.1) return null;

  return { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl, detected: true };
}
