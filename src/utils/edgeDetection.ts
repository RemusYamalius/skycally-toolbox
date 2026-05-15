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

const sortCorners = (pts: Point[]): Omit<DocumentCorners, "detected"> | null => {
  if (pts.length !== 4) return null;
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return {
    topLeft: top[0],
    topRight: top[1],
    bottomRight: bottom[1],
    bottomLeft: bottom[0],
  };
};

export const fallbackCorners = (width: number, height: number): DocumentCorners => ({
  topLeft: { x: width * 0.05, y: height * 0.05 },
  topRight: { x: width * 0.95, y: height * 0.05 },
  bottomRight: { x: width * 0.95, y: height * 0.95 },
  bottomLeft: { x: width * 0.05, y: height * 0.95 },
  detected: false,
});

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const detectDocumentCorners = async (
  imageElement: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<DocumentCorners> => {
  const fallback = fallbackCorners(width, height);

  const cv = (typeof window !== "undefined" ? window.cv : null) as any;
  if (!cv || !cv.Mat) return fallback;

  let src: any, small: any, gray: any, blurred: any, edges: any;
  let kernel: any, dilated: any, contours: any, hierarchy: any;

  try {
    src = cv.imread(imageElement);
    if (!src || src.empty()) return fallback;

    const scale = Math.min(1, 800 / Math.max(src.cols, src.rows));
    small = new cv.Mat();
    const smallSize = new cv.Size(
      Math.floor(src.cols * scale),
      Math.floor(src.rows * scale),
    );
    cv.resize(src, small, smallSize);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    edges = new cv.Mat();
    cv.Canny(blurred, edges, 30, 100);

    kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    dilated = new cv.Mat();
    cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 2);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(
      dilated,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    const imgW = small.cols;
    const imgH = small.rows;
    const imageArea = imgW * imgH;
    const diagonal = Math.hypot(imgW, imgH);
    const minSide = diagonal * 0.05;
    const minArea = imageArea * 0.15;

    const indexed: { contour: any; area: number }[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      indexed.push({ contour: c, area: cv.contourArea(c) });
    }
    indexed.sort((a, b) => b.area - a.area);
    const top = indexed.slice(0, 10);

    let bestCorners: DocumentCorners | null = null;
    let bestArea = 0;

    for (const { contour, area } of top) {
      if (area < minArea) continue;

      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();

      for (const epsilon of [0.01, 0.02, 0.03, 0.04, 0.05, 0.06]) {
        cv.approxPolyDP(contour, approx, epsilon * perimeter, true);

        if (approx.rows !== 4) continue;
        if (!cv.isContourConvex(approx)) continue;

        // Read points (scaled to original image)
        const pts: Point[] = [];
        let inBounds = true;
        for (let j = 0; j < 4; j++) {
          const x = approx.data32S[j * 2] / scale;
          const y = approx.data32S[j * 2 + 1] / scale;
          if (x < 0 || y < 0 || x > width || y > height) {
            inBounds = false;
          }
          pts.push({ x, y });
        }
        if (!inBounds) continue;

        const sorted = sortCorners(pts);
        if (!sorted) continue;

        // Validate side lengths in scaled-down (small) image space
        const sidesSmall = [
          dist(
            { x: sorted.topLeft.x * scale, y: sorted.topLeft.y * scale },
            { x: sorted.topRight.x * scale, y: sorted.topRight.y * scale },
          ),
          dist(
            { x: sorted.topRight.x * scale, y: sorted.topRight.y * scale },
            { x: sorted.bottomRight.x * scale, y: sorted.bottomRight.y * scale },
          ),
          dist(
            { x: sorted.bottomRight.x * scale, y: sorted.bottomRight.y * scale },
            { x: sorted.bottomLeft.x * scale, y: sorted.bottomLeft.y * scale },
          ),
          dist(
            { x: sorted.bottomLeft.x * scale, y: sorted.bottomLeft.y * scale },
            { x: sorted.topLeft.x * scale, y: sorted.topLeft.y * scale },
          ),
        ];
        if (sidesSmall.some((s) => s < minSide)) continue;

        if (area > bestArea) {
          bestArea = area;
          bestCorners = { ...sorted, detected: true };
        }
        break;
      }

      approx.delete();
      contour.delete();
    }

    if (!bestCorners) return fallback;

    // Clamp corners to image bounds
    const clampPt = (p: Point): Point => ({
      x: clamp(p.x, 0, width),
      y: clamp(p.y, 0, height),
    });

    return {
      topLeft: clampPt(bestCorners.topLeft),
      topRight: clampPt(bestCorners.topRight),
      bottomRight: clampPt(bestCorners.bottomRight),
      bottomLeft: clampPt(bestCorners.bottomLeft),
      detected: true,
    };
  } catch (error) {
    console.warn("Edge detection failed:", error);
    return fallback;
  } finally {
    [src, small, gray, blurred, edges, kernel, dilated, contours, hierarchy].forEach(
      (m) => {
        try {
          m?.delete?.();
        } catch {
          // ignore
        }
      },
    );
  }
};
