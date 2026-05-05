## Goal
Replace the existing "PDF to Word" tool with a fully client-side "PDF Text Extractor" that uses pdfjs-dist to extract text from any PDF (Arabic + all languages supported).

## Changes

### 1. New route: `src/routes/tools.pdf-text-extractor.tsx`
- Path: `/tools/pdf-text-extractor`
- Title meta: "Extract Text from PDF — Skycally"
- UI built with `ToolPageShell`:
  - `DropZone` accepting `application/pdf`
  - On file selected: load pdfjs-dist, iterate pages, concatenate `textContent.items` into a single string (page separators)
  - Show extracted text in a `<Textarea>` (large, RTL-friendly, `dir="auto"`)
  - Two buttons:
    - **Copy** — `navigator.clipboard.writeText(...)` + toast
    - **Download .txt** — Blob download as `<originalName>.txt`
  - Loading spinner while extracting
- Add `<HowToUse>` steps

### 2. Install pdfjs-dist
- `bun add pdfjs-dist`
- Import via ESM: `import * as pdfjsLib from "pdfjs-dist"` and set worker:
  ```ts
  import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  ```
- Dynamic import inside the extract handler so SSR isn't affected.

### 3. Update tool registry: `src/lib/tools.ts`
- Replace the `pdf-to-word` entry with:
  ```ts
  { slug: "pdf-text-extractor", name: "Extract Text from PDF",
    description: "Extract all text from any PDF instantly.",
    category: "pdf", icon: FileText, path: "/tools/pdf-text-extractor" }
  ```

### 4. Delete old files
- `src/routes/tools.pdf-to-word.tsx`
- `src/services/pdfToWord.ts`

The auto-generated `routeTree.gen.ts` will refresh on dev/build — no manual edit.

## Notes
- 100% browser-based; no server function or external API used.
- `dir="auto"` on the textarea ensures Arabic renders RTL correctly.
- pdfjs-dist worker is bundled by Vite via `?url` import (works in dev + Cloudflare Worker SSR since extraction runs client-side only).
