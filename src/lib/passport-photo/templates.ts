/**
 * Official passport / ID photo templates.
 *
 * Sources checked while authoring (official government pages):
 *  - US Passport & Visa: travel.state.gov — 2 x 2 inches (51 x 51 mm)
 *  - UK Passport:        gov.uk/photos-for-passports — 45 mm high x 35 mm wide
 *  - Schengen / EU:      EU visa code common standard — 35 x 45 mm
 *  - Canada Passport:    canada.ca passport photo specifications — 50 mm wide x 70 mm high
 *  - India Passport:     passportindia.gov.in — 2 x 2 inches (51 x 51 mm)
 *
 * Pixel size formula at 300 DPI (print quality required by most authorities):
 *   px = round(mm / 25.4 * 300)
 * For inch-defined templates (US, India) the exact inch value is used so the
 * result is a clean 600 x 600 px rather than the 51 mm rounding (602 px).
 */

export const DPI = 300;
export const MM_PER_INCH = 25.4;

/** px = mm / 25.4 * DPI */
export function mmToPx(mm: number, dpi: number = DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export interface PhotoTemplate {
  id: string;
  label: string;
  /** Official printed width in millimetres */
  widthMm: number;
  /** Official printed height in millimetres */
  heightMm: number;
  /** Human-readable official size, shown in the UI */
  sizeLabel: string;
  note: string;
}

export const TEMPLATES: PhotoTemplate[] = [
  {
    id: "us",
    label: "United States — Passport / Visa",
    // 2 x 2 in exactly = 50.8 x 50.8 mm (commonly written as 51 x 51 mm)
    widthMm: 50.8,
    heightMm: 50.8,
    sizeLabel: '2 × 2 in (51 × 51 mm)',
    note: "Head height must be 1 to 1 3/8 in (25–35 mm) from chin to top of head.",
  },
  {
    id: "uk",
    label: "United Kingdom — Passport",
    widthMm: 35,
    heightMm: 45,
    sizeLabel: "35 × 45 mm",
    note: "Head (chin to crown) must be 29–34 mm tall.",
  },
  {
    id: "schengen",
    label: "Schengen / EU — Passport & Visa",
    widthMm: 35,
    heightMm: 45,
    sizeLabel: "35 × 45 mm",
    note: "Face should fill roughly 70–80% of the photo height.",
  },
  {
    id: "canada",
    label: "Canada — Passport",
    widthMm: 50,
    heightMm: 70,
    sizeLabel: "50 × 70 mm",
    note: "Face measured from chin to crown must be 31–36 mm.",
  },
  {
    id: "india",
    label: "India — Passport",
    // Also specified as 2 x 2 in
    widthMm: 50.8,
    heightMm: 50.8,
    sizeLabel: '2 × 2 in (51 × 51 mm)',
    note: "Plain white background, face centred and covering ~70–80% of the frame.",
  },
];

/** Exact aspect ratio (width ÷ height) used to lock the cropper. */
export function aspectRatioOf(t: PhotoTemplate): number {
  return t.widthMm / t.heightMm;
}

/** Output pixel size at 300 DPI. */
export function pixelSizeOf(t: PhotoTemplate, dpi: number = DPI) {
  return { w: mmToPx(t.widthMm, dpi), h: mmToPx(t.heightMm, dpi) };
}
