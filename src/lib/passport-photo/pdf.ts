import { loadScript } from "@/lib/cdnScript";
import type { PhotoTemplate } from "./templates";

const JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

// Standard photo-lab print sheet: 4 × 6 inches, landscape (152.4 × 101.6 mm)
const PAGE_W = 152.4;
const PAGE_H = 101.6;

type Doc = any;

interface Layout {
  cols: number;
  rows: number;
  gap: number;
  x0: number;
  y0: number;
}

/**
 * Fit as many copies of a photo as physically possible on the 4×6 sheet.
 * Gaps are tried from widest to tightest; a smaller gap is only accepted when
 * it actually yields more photos (e.g. 2×2 in photos tile exactly 2 × 3 with
 * zero gap, which is how photo labs print them).
 */
function bestLayout(w: number, h: number): Layout {
  let best: Layout = { cols: 1, rows: 1, gap: 0, x0: 0, y0: 0 };
  let bestCount = 0;
  for (const gap of [4, 3, 2, 1, 0]) {
    const cols = Math.floor((PAGE_W + gap) / (w + gap));
    const rows = Math.floor((PAGE_H + gap) / (h + gap));
    const count = cols * rows;
    if (cols < 1 || rows < 1) continue;
    if (count > bestCount) {
      bestCount = count;
      const gridW = cols * w + (cols - 1) * gap;
      const gridH = rows * h + (rows - 1) * gap;
      best = { cols, rows, gap, x0: (PAGE_W - gridW) / 2, y0: (PAGE_H - gridH) / 2 };
    }
  }
  return best;
}

/**
 * Printable 4 × 6 in sheet containing a grid of identical copies of the
 * finished passport photo, at its exact official millimetre size, with thin
 * cut guides around each copy.
 */
export async function exportPrintSheetPdf(
  dataUrl: string,
  template: PhotoTemplate,
  filename: string,
): Promise<number> {
  await loadScript(JSPDF_CDN);
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) throw new Error("PDF library failed to load");

  const doc: Doc = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "landscape" });

  const w = template.widthMm;
  const h = template.heightMm;
  const { cols, rows, gap, x0, y0 } = bestLayout(w, h);

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.2);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = x0 + c * (w + gap);
      const y = y0 + r * (h + gap);
      doc.addImage(dataUrl, "JPEG", x, y, w, h, undefined, "FAST");
      doc.rect(x, y, w, h);
    }
  }

  doc.save(filename);
  return cols * rows;
}
