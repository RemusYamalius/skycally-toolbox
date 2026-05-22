## Plan: Rewrite `src/routes/tools.word-to-pdf.tsx`

Replace the entire file with a working browser-based DOCX → PDF converter using `mammoth` + hidden iframe `window.print()`.

The snippet in your message has several rendering gaps (unterminated template literal, missing `<ToolPageShell>` wrapper, empty `<div>` blocks, missing hidden `<iframe>`). I will reconstruct a clean, working version preserving your exact intent:

### Behavior
- `DropZone` accepts `.docx` only, single file.
- On "Convert to PDF": read arrayBuffer → `mammoth.convertToHtml` → inject into hidden iframe via `srcdoc` → on load, focus + `print()`.
- Toast success/error via `sonner`.
- Hidden `<iframe ref={iframeRef}>` rendered with `style={{ display: "none" }}`.

### Structure (inside `<ToolPageShell title="Word to PDF" description="...">`)
1. `<DropZone accept=".docx" onFiles={(f) => setFile(f[0])} label="Drop your Word file here" hint=".docx files only" />`
2. If `file`: card showing filename + size + Convert button (styled like other tools: `w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50`).
3. Small muted helper text: "When the print dialog opens, choose Save as PDF…".
4. Hidden iframe.
5. `<HowToUse>`, `<RelatedTools currentSlug="word-to-pdf" />`, `<ToolSeoContent ... />` exactly as in your snippet.

### Inline print CSS
Complete template literal with closing `</style></head><body>{html}</body></html>`, including the body/heading/table/img styles you provided and `@media print { body { margin: 1cm; } }`.

### Out of scope
No other files touched. No new deps. No UI changes elsewhere.
