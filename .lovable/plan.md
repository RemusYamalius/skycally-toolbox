# Online Word Processor — /tools/word-processor

A browser-only, Microsoft Word-style document editor. No uploads, no backend.

## Scope

Single route file `src/routes/tools.word-processor.tsx` using the standard `ToolPageShell` + `HowToUse` + `ToolSeoContent` + `RelatedTools` structure, plus registration in `src/lib/tools.ts` and `src/lib/related-tools.ts`.

## Files changed/created

1. `src/routes/tools.word-processor.tsx` — new route (the editor lives here, split into local sub-components in the same file to stay consistent with other tool pages).
2. `src/lib/tools.ts` — register new tool (utility category, FileText icon, slug `word-processor`).
3. `src/lib/related-tools.ts` — map: `word-processor → [currency-converter, weather-checker, text-to-speech]` and add reverse links where natural.

(Existing tool category labels are `utility`, `text`, etc. — there is no "Document Tools" category. I'll place it under `text` since it best matches an editor, with the requested name "Word Processor".)

## Editor architecture

- `contentEditable` div as the editing surface, using `document.execCommand` for formatting (bold/italic/underline/strike/sub/sup/foreColor/hiliteColor/justifyLeft|Center|Right|Full/insertOrderedList/insertUnorderedList/indent/outdent/insertHorizontalRule/removeFormat/undo/redo/fontName/fontSize).
- Multi-page illusion: render a stack of `<div class="page">` (A4 by default) with white background, drop shadow, fixed CSS size in `mm`, on a gray canvas. Auto-pagination is implemented by measuring content overflow with `ResizeObserver` and splitting on page-break boundaries (best-effort; manual Insert Page Break also supported via a styled `<hr class="page-break">` that triggers a new page).
- Rulers: simple SVG/divs above and to the left of the page showing cm marks (toggle cm/in).
- Status bar: fixed at the bottom of the editor card showing Page X of Y, words, chars (with/without spaces), line:col (derived from selection), LTR/RTL, zoom.
- Zoom: CSS `transform: scale()` on the page stack, 50–200%.
- Auto-save: `localStorage` key `wp:doc` every 30s + on blur; restore on mount.

## Toolbar (ribbon)

Implemented as 6 grouped rows inside a sticky toolbar component. Each control wraps `execCommand` or sets inline style on the current selection/block.

- Row 1 File: New, Open (.txt/.html parsed inline; .docx via dynamic `import("mammoth")` → HTML), Save .txt, Export PDF (`window.print()` with print stylesheet that hides UI and shows only `.page`), Export .docx (dynamic `import("docx")` building Document from current HTML — paragraphs + runs; tables/images best-effort), Print.
- Row 2 Font: family dropdown (Google Fonts loaded via a single injected `<link>` to `fonts.googleapis.com` with all requested families), size (6–96), B/I/U/Strike/Sub/Sup, text color, highlight color, clear formatting.
- Row 3 Paragraph: align L/C/R/J, RTL/LTR toggles (set `direction` on block), bullet styles dropdown (8 variants — via `list-style-type` on the inserted `<ul>`), numbered list dropdown (7 variants — via `list-style-type` on `<ol>`), increase/decrease indent, line spacing (Single/1.15 default/1.5/2/2.5/3/custom), space before/after, paragraph border presets.
- Row 4 Insert: heading style dropdown (Normal/H1–H4/Title/Subtitle/Quote), table grid picker 1×1–10×10 (+ contextual table toolbar that appears when caret is inside a table: add/remove rows & columns, merge/split via colspan/rowspan, border style, bg color), Insert Image (file → dataURL → resizable+floatable `<img>`), Horizontal Rule, Page Break, Special Characters picker (curated grid), Insert Date/Time.
- Row 5 Layout: page size (A4 default, A3, A5, Letter, Legal — sets CSS mm dimensions), orientation (Portrait/Landscape — swap w/h), margins (Normal/Narrow/Wide/Custom), columns (1/2/3 — CSS `column-count` on the page), page background color.
- Row 6 Review: Undo, Redo, Find & Replace modal (regex-free, case-insensitive toggle, Replace / Replace All on the contentEditable text), Word Count modal with detailed stats, Spell Check toggle (`spellcheck` attribute), Read Aloud (Web Speech API `speechSynthesis`), editor dark mode toggle (only the editor chrome; page stays white).

## Keyboard shortcuts

Single `keydown` listener on the editor: Ctrl/Cmd + B/I/U/Z/Y/A/C/X/V/F/H/P/S/L/E/R/J wired to corresponding actions. Default browser behavior used where it already matches (C/X/V/A); others are intercepted with `preventDefault`.

## Dependencies

Add as runtime imports (dynamic where possible to keep first paint fast):
- `mammoth` — .docx → HTML on open.
- `docx` — HTML → .docx on export.

Both are pure-JS and edge-safe (used only in the browser). No server functions needed.

## SEO content

Inside `ToolPageShell` after `HowToUse`, render `<ToolSeoContent>` with the 3-paragraph body and the 4 FAQs from the spec. Add the 5th FAQ ("Does it work offline?") so we have 5 — `ToolSeoContent` accepts an array.

Head meta via `buildToolMeta(toolBySlug("word-processor", tools))`. Confirm `seo.ts` builds canonical from slug → `/tools/word-processor`; if not, the route's `head()` will override with title/description/canonical exactly as specified.

## Related Tools

`<RelatedTools currentSlug="word-processor" />` shows the 3 listed: currency-converter, weather-checker, text-to-speech.

## Notes / Tradeoffs

- `execCommand` is deprecated but remains the only practical cross-browser way to build a rich editor without a 100KB+ framework (Slate/Lexical/TipTap). All major browsers still implement it.
- True multi-page flow-pagination (splitting a paragraph across pages mid-line) is not feasible without a layout engine. We approximate: each `.page` is a fixed-height container; when content height exceeds it, we auto-append a new `.page` and visually overflow content into it via `overflow: visible` + a page-break separator line. Manual Page Break is exact.
- `.docx` export covers text, formatting, headings, lists, tables, and images; complex CSS (multi-column, custom borders) may not round-trip perfectly.
- Auto-save stores HTML in `localStorage` only — no network calls ever.
