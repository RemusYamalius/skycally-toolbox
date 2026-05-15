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
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestCorners: DocumentCorners | null = null;
    let maxArea = 0;
    const imageArea = small.cols * small.rows;

    const indexed: { contour: any; area: number }[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      indexed.push({ contour: c, area: cv.contourArea(c) });
    }
    indexed.sort((a, b) => b.area - a.area);
    const top = indexed.slice(0, 10);

    let earlyBreak = false;
    for (const { contour, area } of top) {
      if (earlyBreak) break;
      if (area < imageArea * 0.1) continue;

      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();

      for (const epsilon of [0.01, 0.02, 0.03, 0.04, 0.05, 0.06]) {
        cv.approxPolyDP(contour, approx, epsilon * perimeter, true);

        if (approx.rows === 4 && area > maxArea) {
          const pts: Point[] = [];
          for (let j = 0; j < 4; j++) {
            pts.push({
              x: approx.data32S[j * 2] / scale,
              y: approx.data32S[j * 2 + 1] / scale,
            });
          }
          const sorted = sortCorners(pts);
          if (sorted) {
            maxArea = area;
            bestCorners = { ...sorted, detected: true };
            if (area > imageArea * 0.5) earlyBreak = true;
          }
          break;
        }
      }

      approx.delete();
      contour.delete();
    }

    return bestCorners || fallback;
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
