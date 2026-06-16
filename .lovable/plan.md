# Word Processor — 3 targeted fixes

All edits stay inside `src/routes/tools.word-processor.tsx`. No other file or feature is touched.

---

## Fix 1 — DOCX export must never silently refuse

**Root cause (most likely):** `marksToRunProps` passes raw values straight into the `docx` library:
- `fontFamily` often comes from the editor as a CSS stack like `Georgia, "Times New Roman", serif` → invalid `<w:rFonts>` → Packer throws.
- `color` may arrive as `rgb(...)`, a named color, or a malformed `#xyz` → invalid hex.
- `fontSize` parsed value can be `NaN`/non-finite for odd inputs.
- `highlight` lookup falls through to `"yellow"` which is fine, but an `rgb(...)` highlight makes `hex.toLowerCase()` produce a non-matching key (still fine, defaults to yellow) — kept as-is.

**Changes inside `exportDocx`:**
1. Add small sanitizers used by `marksToRunProps`:
   - `sanitizeFont(v)` → take first family, strip quotes/whitespace, drop generic keywords (`serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`), return `undefined` if empty.
   - `sanitizeHex(v)` → accept `#rgb`/`#rrggbb` only, expand short form, return 6-char uppercase or `undefined`. For `rgb(r,g,b)` convert to hex.
   - `sanitizeSizePt(v)` → parse number, clamp 1–400, return `undefined` if invalid.
2. Use the sanitizers; only set `props.font`/`props.color`/`props.size` when defined.
3. Wrap the final `Packer.toBlob(doc)` call in a try/catch. On failure, retry once with a **safe-mode** rebuild that strips `textStyle`/`highlight` marks (keeps bold/italic/underline/strike/sub/super and structure). This guarantees the user always gets a `.docx`.
4. Replace the `alert(...)` failure path with a console error only (kept as a last-resort safety net — should now be unreachable for normal content).

No change to image handling, list numbering, page size, or margins.

---

## Fix 2 — Print/PDF shows 6 duplicated pages

**Root cause:** the print CSS uses `visibility: hidden` on everything outside `.wp-canvas`. `visibility:hidden` **preserves layout**, so the (now invisible) hero, ad zones, SEO block, FAQ, related tools, and footer keep occupying their full height — that empty space is what renders as the extra A4 pages after the real document. The repeating content the user sees is actually the same canvas printed once followed by blank padded pages produced by hidden siblings.

**Change (in the `@media print` block only):** pull the canvas out of normal flow so siblings' reserved space stops creating pages.

```css
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
  body * { visibility: hidden !important; }
  .wp-canvas, .wp-canvas * { visibility: visible !important; }
  .wp-canvas {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 100% !important;
    background: white !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .wp-stage { transform: none !important; width: auto !important; margin: 0 !important; }
  .wp-page {
    box-shadow: none !important; margin: 0 auto !important; background-image: none !important;
    min-height: 0 !important; height: auto !important; width: 100% !important;
  }
  .wp-editor-content { min-height: 0 !important; }
  .wp-ruler-h, .wp-ruler-v, .wp-toolbar, .wp-hero { display: none !important; }
  .wp-page-break { page-break-after: always; }
  .wp-page-break::after { display: none !important; }
}
```

The page now prints exactly the pages required by the document content (1 page in the user's example, more when real page-breaks or overflow exist).

---

## Fix 3 — Toolbar distributes across the full width on desktop

Currently every row is `flex-wrap` + left-aligned, leaving the right half empty on wide screens. Fix purely in CSS, desktop only (≥ 1024 px); mobile/tablet keep current behavior so nothing breaks.

Add to `WP_CSS`:

```css
@media (min-width: 1024px) {
  .wp-toolbar .wp-row { gap: 8px; }
  /* Push the SaveBadge / right-side cluster fully to the right */
  .wp-toolbar .wp-row .wp-spacer { flex: 1 1 auto; }
  /* Let the long selects (Font / Size / Zoom) and button groups breathe */
  .wp-toolbar .wp-row > .wp-select { flex: 0 1 auto; }
  .wp-toolbar .wp-row > .wp-btn { flex: 0 0 auto; }
  /* Distribute buttons so groups span the full row instead of bunching left */
  .wp-toolbar .wp-row { justify-content: flex-start; }
  .wp-toolbar .wp-row.wp-row-justify { justify-content: space-between; }
}
```

Then, in the JSX, add the `wp-row-justify` modifier class to the four content rows (Font, Paragraph, Insert, Review) — the File row already uses a `wp-spacer` + SaveBadge layout, so it keeps `wp-row` only. The justify-between rule spreads the existing buttons evenly across the full toolbar width on desktop while preserving order, sizes, and active states. Below 1024 px nothing changes.

No new buttons added, none removed, no handlers changed.

---

## Out of scope (explicitly unchanged)
- Editor extensions, content model, autosave, templates, find/replace, painter, rulers, margins, fullscreen, zoom.
- SEO block, HowToUse, related tools, route metadata.
- Mobile toolbar layout.
