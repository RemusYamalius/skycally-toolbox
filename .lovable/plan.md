## Goal

Add a new client-side PDF tool to Skycally: **PDF Watermark Remover** (Arabic UI: "إزالة العلامة المائية"). Runs 100% in the browser via `pdf-lib` + `pdfjs-dist`. No backend, no other tools touched.

## Files to create

### 1. `src/routes/tools.pdf-watermark-remover.tsx`
New route component following the existing tool pattern (same shell as `tools.split-pdf.tsx`):
- `ToolPageShell` + `HowToUse` + `RelatedTools` + `ToolSeoContent`
- `dir="rtl"` wrapper on the interactive area for Arabic UI
- Drop zone / file picker, accepts `.pdf` only
- "إزالة العلامة المائية" primary button
- Progress indicator (spinner + status text per stage)
- Error message block
- Auto-download + persistent "تحميل الملف" button after processing
- Conditional advanced-mode confirm prompt: "لم يتم اكتشاف علامة مائية قابلة للإزالة تلقائياً. هل تريد المحاولة بالوضع المتقدم؟ (قد يؤثر على جودة النص)" + "محاولة متقدمة" button

### 2. `src/lib/tools.ts` (single entry addition)
Append one Tool entry:
```ts
{ slug: "pdf-watermark-remover", name: "PDF Watermark Remover",
  description: "Remove watermarks from PDF files entirely in your browser.",
  category: "pdf", icon: Stamp, path: "/tools/pdf-watermark-remover" }
```
(`Stamp` already imported.) No other edits — homepage, footer, sitemap, related-tools, and SEO JSON-LD pick it up automatically from `tools[]`.

## Processing pipeline (in order, on a single `PDFDocument`)

**Strategy 1 — Text-layer watermarks (pdf-lib, low-level)**
- Load PDF, iterate pages.
- For each page, get its content stream(s) via `page.node.normalizedEntries().Contents`, decode with `PDFContentStream`/`decodePDFRawStream`.
- Tokenize the stream; track current graphics state (`gs` / `ca` for opacity, CTM for rotation via `cm`).
- Collect text-showing operators (`Tj`, `TJ`, `'`, `"`) and mark for removal when:
  - non-stroking alpha < 0.5 (resolved via `/GS` ExtGState referenced by `gs`), OR
  - the operator runs inside a CTM with rotation ≠ 0 (atan2(b,a) not in {0, ±π/2, π}), OR
  - the exact string appears on > 50% of pages (precompute string→pageCount map in a first pass).
- Re-encode the content stream with those operators (and their surrounding `BT`…`ET` block when emptied) stripped, write back via `page.node.set(PDFName.of('Contents'), newStream)`.

**Strategy 2 — Image overlay watermarks (pdf-lib)**
- For each page, read `Resources/XObject`; resolve each `/Image` XObject.
- Mark for removal when:
  - image's drawn CTM scale covers > 40% of page width AND height (scan content stream for the `Do` op + preceding `cm` to compute size), OR
  - same XObject ref (by indirect ref id) used on every page.
- Remove the matching `Do` operator from the content stream and drop the resource entry.

**Strategy 3 — Annotation watermarks (pdf-lib)**
- For each page, read `/Annots`; remove entries whose `/Subtype` is `/Stamp` or `/Watermark`, plus annots whose appearance stream (`/AP /N`) text content matches the repeated/rotated patterns detected in Strategy 1.

After 1–3: save with `pdfDoc.save()`, offer download. Track a `removedCount`. If `removedCount === 0` → show advanced-mode prompt.

**Strategy 4 — Raster rebuild (opt-in, pdfjs-dist + pdf-lib)**
- Lazy-load `pdfjs-dist` (dynamic `import()`) and set workerSrc to the bundled worker URL.
- For each page: render to offscreen `<canvas>` at `scale: 2`, convert to JPEG (quality 0.92).
- Build new `PDFDocument`, embed each JPEG, add page at original dimensions.
- Show warning: "هذا الوضع يحول الصفحات إلى صور — قد لا يبقى النص قابلاً للتحديد."

## State machine (component)

`idle → fileLoaded → processing(stage: "text"|"images"|"annots") → done(removedCount) → [optional] advancedPrompt → processing(stage: "raster") → done`

Errors set `error` and return to `fileLoaded`. Download is always offered once a result Blob exists, even when `removedCount === 0`.

## Dependencies

- `pdf-lib` — already installed (used by split-pdf, merge-pdf, etc.).
- `pdfjs-dist` — verify in `package.json`; if missing, `bun add pdfjs-dist` during implementation. Loaded dynamically only when Strategy 4 runs to keep initial bundle small.

## Constraints honored

- No edits to any other tool, route, component, style, or shared util.
- All processing in-browser (main thread; Strategy 4 uses `requestIdleCallback`/`await` between pages to keep UI responsive — Web Worker not required but tolerated).
- Arabic copy throughout the interactive area; SEO content block stays English for consistency with existing tools (or Arabic if preferred — confirm if needed).
- Result always downloadable, even when nothing was detected.

## Out of scope

Removing watermarks from scanned/embedded raster pages without Strategy 4; OCR; encrypted PDFs (will surface a clear error).
