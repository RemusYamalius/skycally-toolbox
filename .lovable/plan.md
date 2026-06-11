# Rebuild `/tools/word-processor`

Full rewrite of `src/routes/tools.word-processor.tsx` using **TipTap** as the editor core. All other tool-page conventions (`ToolPageShell` + `HowToUse` + `ToolSeoContent` + `RelatedTools`) stay intact.

## Files changed

- `src/routes/tools.word-processor.tsx` — full rewrite (single file, local sub-components)
- `package.json` — add TipTap deps (keep `mammoth`, `docx`)
- `src/lib/tools.ts` — update tool description + SEO copy for new title/meta
- `.lovable/plan.md` — replace with this plan

## Dependencies to add

```
@tiptap/react @tiptap/pm @tiptap/starter-kit
@tiptap/extension-underline @tiptap/extension-text-style
@tiptap/extension-color @tiptap/extension-highlight
@tiptap/extension-font-family @tiptap/extension-text-align
@tiptap/extension-subscript @tiptap/extension-superscript
@tiptap/extension-table @tiptap/extension-table-row
@tiptap/extension-table-cell @tiptap/extension-table-header
@tiptap/extension-image @tiptap/extension-horizontal-rule
@tiptap/extension-link @tiptap/extension-placeholder
```
Custom TipTap extensions written inline: `FontSize`, `LineHeight`, `Direction` (RTL/LTR), `PageBreak` node (renders `<hr class="page-break">`).

## Editor architecture

- Single TipTap `EditorContent` rendered inside a CSS-scaled `.wp-page` (A4: 794×1123px, 2.54cm padding, white background, black text — forced with `!important` to override dark mode).
- **Pagination** = pure CSS columns trick: TipTap content renders inside one tall element styled with `column-width: 754px; column-gap: 24px; column-fill: auto; height: <Npages × 1123>px`. Each "column" visually becomes one A4 page (white card + shadow drawn via repeating linear-gradient background on the wrapping `.wp-canvas`). Page count derived from `editor.view.dom.scrollHeight / 1123` via `ResizeObserver`. Manual `PageBreak` node inserts `break-before: column`.
  - Fallback if the columns approach proves fragile during build: render a stack of N fixed-height `.wp-page` divs as a visual backdrop behind a single absolutely-positioned editor surface. Decision made in code; user-facing behavior identical.
- Outer wrapper: `.wp-canvas` — `bg-[#d0d0d0]`, `overflow-y:auto`, `height: calc(100vh - 220px)`, gray gap 24px (16px on mobile).
- **Dark mode safety**: `.wp-page { background:#fff !important; color:#1a1a1a !important; }` and all descendant text inherits. Only the canvas background and toolbar follow theme.
- **Mobile**: `@media (max-width: 768px)` wraps `.wp-page` in `transform: scale(var(--wp-scale))` where `--wp-scale = min(1, (100vw - 32px) / 794)`, set via `ResizeObserver` on the canvas.

## Rulers

- `TopRuler` component: 794px wide × 24px tall, `#e8e8e8`, SVG with ticks every 0.5cm, numbers every 1cm, draggable gray margin handles (left/right) that update editor padding state.
- `LeftRuler`: 24px wide × 1123px tall, same style, height-aware.
- cm/inch toggle in toolbar (state).
- Show/hide toggle in toolbar (state, default visible).
- Optional faint blue margin guide lines on the page (toggleable).

## Toolbar (ribbon — 6 rows)

Every control is wired directly to a TipTap chain command, guaranteeing it works:

- **Row 1 File**: New, Open (.txt/.html/.docx via dynamic `mammoth`), Save .txt, Export PDF (`window.print()`), Export .docx (dynamic `docx`), Print, **Templates** (opens modal).
- **Row 2 Font**: family dropdown (Google Fonts injected once via `<link>`), size 6–96 (custom `FontSize` mark), B / I / U / Strike / Sub / Sup, text color, highlight color, clear formatting.
- **Row 3 Paragraph**: align L/C/R/J, RTL/LTR (custom `Direction` attr on block), 8 bullet styles + 7 numbered styles via `list-style-type` on the active list node, indent +/-, line spacing dropdown (1/1.15/1.5/2/2.5/3), space before/after (custom block attrs), border presets (apply class to current block).
- **Row 4 Insert**: heading H1–H4 + Title/Subtitle/Quote, table grid picker 1×1–10×10 + contextual table toolbar (add/remove row/col, merge/split, bg color), image upload (file → dataURL), horizontal rule, page break, special characters picker grid, insert date/time.
- **Row 5 Layout**: page size (A4/A3/A5/Letter/Legal → swap CSS `--wp-w/--wp-h`), orientation, margins preset, columns (1/2/3 via CSS `column-count` on `.wp-page-inner`), page bg.
- **Row 6 Review**: Undo, Redo, Find & Replace modal (regex-free, case toggle, Replace / Replace All operating on `editor.state.doc`), Word Count modal, Spell Check toggle (`spellcheck` attr on editor DOM), Read Aloud (`speechSynthesis`), editor dark mode (chrome only — page stays white), Rulers toggle, cm/inch toggle.

All controls are real `<button>` elements with `min-h-9 min-w-9` for mobile touch.

## Hero banner

Above toolbar, dismissible (state + `localStorage` key `wp:hero_dismissed`):

```
✨ No Google account. No Microsoft account. Just open and write.
```

Subtle `bg-[color-mix(in_oklab,var(--cyan-brand)_10%,transparent)]` strip with an `X` button.

## Auto-save indicator

In toolbar status bar, three states cycling:
- `Saving…` (spinner) when a debounced write is in flight
- `💾 Auto-saved` + green dot after success
- Timestamp tooltip on hover

Save every 30s on a timer + on every `onUpdate` debounced (1.5s). Key: `skycally_word_doc` (also keep legacy `wp:doc` for migration).

## Templates modal

Triggered by Row 1 "Templates" button. 4 cards:
1. **CV / Resume**
2. **Cover Letter**
3. **Invoice** (uses a real TipTap table)
4. **Essay**

Each is a hard-coded HTML string loaded via `editor.commands.setContent(html)`. If editor has content, show confirmation dialog first.

## Keyboard shortcuts

TipTap covers Ctrl/Cmd+B/I/U/Z/Y by default. Add custom: Ctrl+S → download .txt, Ctrl+P → print, Ctrl+F → open Find modal, Ctrl+H → open Find & Replace modal.

## SEO updates

- Route `head()`:
  - Title: `Free Online Word Processor — No Signup, No Microsoft Account | Skycally`
  - Description: `Write and format documents free in your browser. No Google account, no Microsoft account needed. Supports Arabic RTL, exports to PDF and Word. Try Skycally's free word processor now.`
  - Canonical: `https://skycally.com/tools/word-processor`
- `ToolPageShell` title becomes `Free Online Word Processor — Write Anywhere, No Account Needed`.
- `ToolSeoContent` body paragraphs and FAQs naturally include all 6 target keywords.

## Notes / tradeoffs

- TipTap (~80KB gzip) is loaded eagerly because it IS the page. `mammoth` and `docx` stay dynamic.
- True mid-paragraph pagination across columns is a CSS approximation; manual page break is exact. Acceptable for a browser-only Word-style editor.
- `.docx` export covers paragraphs, headings, lists, tables, images, basic marks. Complex CSS (multi-column, custom borders) does not round-trip.
- Forcing `.wp-page` to white in dark mode is intentional — matches every real document editor.
- No backend, no network calls, no account.

Ask me anything before I switch to build mode, otherwise approve and I'll implement.
