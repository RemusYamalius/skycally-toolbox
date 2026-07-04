# Preserve logo & repeated content — only mask the light watermark

## The problem

`detectWatermarkMask` builds a mask from **any non-white pixel that repeats in the same position across sample pages**. In a "student results" PDF, the header/logo/table borders are identical on every page, so they get flagged along with the "مؤقت" watermark. The cleaning pass then whitens those regions, degrading the logo and headings.

The current code has one threshold: `DARK_TH = 235` — a pixel counts as "non-white" if any channel is below 235. That accepts everything from near-black logo pixels (0–50) to light-gray watermark tint (~180–220). Pure black logo pixels pass the same gate as the watermark.

## The fix — filter the mask by watermark color range

A translucent watermark ("مؤقت" printed in light gray) always sits in a narrow **light** band. Real content (logo strokes, table borders, printed text) is dark. We keep the repetition test, but add a color-window gate.

### Change in `detectWatermarkMask` (only file: `src/routes/tools.pdf-watermark-remover.tsx`)

Inside the per-pixel loop that builds `raw`:

1. Replace the single `DARK_TH` gate with a **watermark band**:
   - `WM_MIN_LUMA = 140` — brighter than any real ink.
   - `WM_MAX_LUMA = 228` — darker than paper white.
   - `luma = 0.299*R + 0.587*G + 0.114*B`.
   - Pixel qualifies only if `WM_MIN_LUMA ≤ luma ≤ WM_MAX_LUMA` on **every** sample page.

2. Add a neutrality check: `max(|R-G|, |G-B|, |R-B|) ≤ 25` on every sample. The "مؤقت" watermark is neutral gray; the logo's colored elements fail this and are preserved.

3. Keep the existing cross-page similarity check (`SIM_TH = 28`) so lightly-repeated background artifacts don't sneak in.

Net effect: near-black pixels (logo, borders, body text) never enter the mask, even when they repeat. Only the light-gray "مؤقت" glyphs do.

### Second guard — shrink accidental mask growth

Current code dilates the mask by radius 2 to fatten watermark strokes. That is safe for isolated glyphs but risky when the mask is already touching logo edges. Reduce dilation radius from `2` to `1`. The pixel cleaner already has a luma/color-aware `clean()` step that preserves darker text under the mask, so a smaller dilation is enough.

### What stays the same

- Preview overlay, cleaning pipeline (`rebuildWithoutMask`), text-under-watermark preservation, UI flow — untouched.
- `wmR/wmG/wmB` sampling still runs on the (now smaller, gray-only) mask, so cleanup color is more accurate too.

## Why this works for the uploaded PDF

- "مؤقت" glyphs render at ~180–210 luma → pass the band, pass neutrality, appear on every page → **masked**.
- Ministry logo (rich colors, dark strokes) → fails band + fails neutrality → **preserved**.
- Table borders (near-black) → fails band → **preserved**.
- Header text (black Arabic) → fails band → **preserved**.

## Out of scope

- Watermarks that are dark (e.g., black "DRAFT") — would need a separate branch; not present here.
- Colored watermarks (e.g., red "COPY") — would need a color-cluster detector instead of a neutrality gate.

## Success check

Re-run on the uploaded transcript PDF: the red mask preview covers only the flowing "مؤقت" script (not the logo, header, or table). After removal, logo and every cell of text remain crisp and unchanged; only the watermark is gone.
