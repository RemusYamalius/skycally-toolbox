# PDF Watermark Remover — Definitive Fix

## Why the current tool fails on your file

Your `123.pdf` uses an Arabic diagonal text watermark ("فروجكس"). In PDF content streams this is drawn as either:
- CID-encoded text (bytes like `<001A00FF...>` — no readable string to fingerprint), or
- Outlined vector glyphs (hundreds of tiny path ops per page, never identical byte-for-byte).

Strategy 6's fingerprinting compares text strings and path-op hashes. Neither survives Arabic CID text or glyph outlining, so **zero candidates are found → preview never opens → the "no watermark detected" banner appears**. Strategies 1–5 also miss it (no `/Artifact`, no low opacity, no keyword, no XObject named "Watermark"). This is a dead end at the PDF-object level for this class of file.

## New approach — pixel-based detection (works on any watermark)

Rasterize a few pages, find pixels that repeat at the **same position across pages but differ from the page background** — that is, by definition, the watermark. Then rebuild the PDF with those pixels erased. No dependency on text encoding, opacity, keywords, or object names.

```text
[Upload PDF]
     ↓
Rasterize pages 1, mid, last at 150 DPI (pdfjs, already in project)
     ↓
Build watermark mask:
  mask[x,y] = 1  if  all sampled pages have a non-white pixel
              AND those pixels are ~identical (ΔE < threshold)
     ↓
Show REAL preview: page 1 thumbnail + red overlay of the mask
     ↓
User confirms →
  For every page:
    rasterize → inpaint masked pixels with local background (white/near-white) → embed as JPEG
  Rebuild PDF (image-per-page, same page size)
     ↓
Download
```

## What changes in the UI

The preview area is the core fix — it will **always** render once scanning finishes:

- **Left**: page 1 thumbnail with the detected watermark highlighted in red.
- **Right**: coverage stats ("Detected on 3/3 sampled pages, covers 4.2% of page area") + three buttons: **Remove watermark**, **Try another sample**, **Cancel**.
- If the mask is empty (truly no repeating mark), show a clear empty-state with an explicit **Advanced rebuild** button instead of silently falling through.

The current bug where the preview panel doesn't appear is fixed by making preview stage unconditional after scan — it either shows the candidate OR shows the empty-state, never nothing.

## Removal quality

- Output is raster (image-per-page) PDF — this is the only reliable way to erase a burned-in vector/CID watermark. Text becomes non-selectable on cleaned pages, matching how LightPDF / Unwatermark.ai deliver these files.
- 150 DPI default (readable, ~same size as input). Toggle for 200 DPI if user wants sharper.
- Mask is dilated by 2px so anti-aliased glyph edges are fully covered.
- Inpaint = fill with median color of a 12px ring around each masked pixel (fast, works because watermarks sit over near-uniform backgrounds).

## Files to change

Only `src/routes/tools.pdf-watermark-remover.tsx`. All logic client-side, no new npm packages (pdfjs-dist + pdf-lib + canvas already in project).

### Structure

1. **Remove Strategy 6 fingerprint code** (it can't handle CID/outlined text — replaced entirely).
2. **Add `detectWatermarkMask(file)`**: rasterize 3 sample pages via pdfjs → per-pixel intersection → return `{ maskCanvas, coveragePct, sampleThumb }`.
3. **Add `rebuildWithoutMask(file, mask, dpi)`**: for each page rasterize → apply mask + inpaint → `pdf-lib` new doc with JPEG per page.
4. **Rewrite the run pipeline**: `idle → scanning → preview (always) → processing → done`.
5. **Preview stage always renders** the panel with either the candidate or the empty state — this is what the user reported missing.
6. Keep strategies 1–5 as a fallback path behind an "Object-mode (experimental)" toggle for edge cases where the user explicitly wants selectable text preserved.

### Technical notes

- Rasterization via `pdfjs-dist` `getDocument` + `page.render` to an `OffscreenCanvas` (already used in `pdf-to-images` tool — same import path).
- Per-page canvas is reused (single buffer, cleared between pages) to keep memory flat for 30+ page PDFs.
- Final PDF assembly uses `pdf-lib` `embedJpg` + `drawImage` at original page dimensions in points.
- Progress reported per page in the existing status UI.

## Out of scope

- OCR to re-inject selectable text after rasterization.
- Preserving original vector text on cleaned pages (impossible without object-level match, which failed for this file class).
- Detecting watermarks that appear only on a subset of pages (< 60% coverage across samples).

## Success criteria

1. Upload `123.pdf` → preview panel appears with red overlay on the "فروجكس" text on page 1.
2. Click **Remove watermark** → downloaded `123-clean.pdf` has no watermark on any of the 34 pages.
3. Upload a PDF with no watermark → preview shows empty-state with "no repeating mark found", never a blank screen.
