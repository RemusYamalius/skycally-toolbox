## Goal
Add the 5 PDF tools described in the uploaded brief to Skycally, matching the exact patterns of existing tools (`tools.rotate-pdf.tsx`, `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`).

## Changes

### 1. `src/lib/tools.ts`
- Add `FileSearch`, `FilePen`, `FileX`, `Shield`, `FileOutput` to the `lucide-react` import.
- Append the 5 new tool entries to the `tools` array (after `document-scanner`).

### 2. New route files (one per tool)

All follow the rotate-pdf shell: `ToolPageShell` → tool UI → `HowToUse` → `RelatedTools` → `ToolSeoContent`. Tailwind classes only, no `<form>`, all processing in-browser.

**a. `src/routes/tools.pdf-to-word.tsx`**
- DropZone (`accept="application/pdf"`).
- Extract text per page with `pdfjs-dist` (`page.getTextContent()` joining items with spaces, page break between pages).
- Build `.docx` with `docx` package: one `Paragraph` per text line.
- `downloadBlob` the resulting `.docx`.

**b. `src/routes/tools.delete-pdf-pages.tsx`**
- DropZone + page thumbnails rendered exactly like rotate-pdf (`pdfjs-dist`, scale 0.5, blob URLs).
- Each thumbnail card has a checkbox; clicking the card toggles selection.
- "Delete Selected" → `pdf-lib`: copy non-selected pages into a new `PDFDocument`, save, download.

**c. `src/routes/tools.pdf-page-numbers.tsx`**
- DropZone + controls: position (Bottom Center / Bottom Right / Bottom Left / Top Center), font size (small=10/medium=14/large=20), starting number (default 1).
- `pdf-lib`: embed `StandardFonts.Helvetica`, iterate pages, compute x/y for chosen position with margin 24, `page.drawText(String(start + i), { x, y, size, font })`.
- Download result.

**d. `src/routes/tools.protect-pdf.tsx`**
- DropZone + two password inputs (Set / Confirm) with eye toggle, validation (non-empty + matching + min 4 chars).
- Encryption: `pdf-lib` does **not** support encryption out of the box. Plan: add `@cantoo/pdf-lib` (drop-in fork that supports `save({ userPassword, ownerPassword, permissions })`). Use it only in this file; rest of app keeps `pdf-lib`. Strong default owner password generated via `crypto.getRandomValues`.
- Download protected PDF.

**e. `src/routes/tools.pdf-reader.tsx`**
- DropZone (PDF) **or** URL text input + Load button (fetch as `arrayBuffer`).
- Render all pages on stacked `<canvas>` elements with `pdfjs-dist`, current scale state.
- Toolbar: Previous / Next buttons, "Page X of Y" indicator (scrolls to that page's canvas via ref), Zoom -/+ buttons (range 0.5–2.5 step 0.25). Re-render pages on scale change.
- No download.

Each route uses `buildToolMeta(toolBySlug("<slug>", tools))`, the prescribed `HowToUse` steps tuple, and a `ToolSeoContent` block with the title from the brief, a 2-paragraph `body`, and 4 FAQs.

### 3. Dependency
- `bun add @cantoo/pdf-lib docx` (only `protect-pdf.tsx` imports `@cantoo/pdf-lib`; `docx` only used by `pdf-to-word.tsx`).

## Out of scope
- No changes to `tools.rotate-pdf.tsx`, shells, or unrelated files.
- No backend changes — `routeTree.gen.ts` is auto-regenerated.
