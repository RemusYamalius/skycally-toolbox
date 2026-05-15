## Fix 4 broken PDF tools

Apply targeted fixes to four route files. Do not touch `tools.pdf-page-numbers.tsx` or `tools.rotate-pdf.tsx`.

### 1. `src/routes/tools.protect-pdf.tsx`
- Replace `@cantoo/pdf-lib` import with `pdf-lib` (standard, installed).
- Drop the `userPassword` / `ownerPassword` / `permissions` options — pdf-lib@1.17.1 doesn't support encryption.
- Load the PDF, set metadata via `setProducer("Skycally — protected")` / `setSubject("Restricted")` / `setKeywords(["protected"])` to mark it as restricted, then save and download.
- After download, show a toast: "Note: true password encryption requires a desktop PDF tool. We've prepared your file."
- Update visible UI copy, `HowToUse` steps, and `ToolSeoContent` (description, body, FAQs) to honestly explain the browser limitation and recommend a desktop tool for real encryption. Keep password inputs only as informational fields (or remove them — prefer keeping them but disabled-styled with a clear note).

### 2. `src/routes/tools.delete-pdf-pages.tsx`
- In every `page.render(...)` call, remove the `canvas` property. Final shape:
  `await page.render({ canvasContext: ctx, viewport }).promise;`
- No other changes.

### 3. `src/routes/tools.pdf-reader.tsx`
- Remove the `canvasRefs` array and the multi-canvas scroll layout.
- Use a single `canvasRef = useRef<HTMLCanvasElement>(null)`.
- Replace the rendering `useEffect` so it depends on `[pdf, current, scale]` and renders only the `current` page onto the single canvas, with a `cancelled` cleanup flag. Render call: `await page.render({ canvasContext: ctx, viewport }).promise;` (no `canvas` prop).
- Replace the scrolling page list in JSX with one centered `<canvas ref={canvasRef} className="bg-white shadow-lg rounded-md max-w-full h-auto" />`.
- `goTo` simplifies to just `setCurrent(clamped)` (no scrollIntoView).
- Keep DropZone, URL loader, Previous/Next, Zoom controls, Close button, sticky toolbar, `HowToUse`, `RelatedTools`, `ToolSeoContent` exactly as-is.

### 4. `src/routes/tools.pdf-to-word.tsx`
- Remove `PageBreak` from the `docx` import. Final import: `import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";`
- Replace any `new Paragraph({ children: [new PageBreak()] })` usage. Page breaks are expressed by adding `pageBreakBefore: true` to the next page's heading paragraph:
  - For `i > 1`: `new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: true, children: [new TextRun(`Page ${i}`)] })`
  - For `i === 1`: `new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Page ${i}`)] })`

### Out of scope
- No dependency changes (all packages already installed).
- No changes to `tools.pdf-page-numbers.tsx`, `tools.rotate-pdf.tsx`, shared components, or `routeTree.gen.ts`.
