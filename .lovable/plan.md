# Preserve text under the watermark

## Problem

The current pixel pipeline builds a binary mask of "watermark pixels" and fills every masked pixel with white. Where the watermark crosses body text, the mask covers the text too, so cleaning wipes both the watermark glyphs AND the letters beneath them. Result: readable pages become blank stripes where "فروجكس" used to cross.

## Root cause

A watermark is a *semi-transparent overlay*, not a solid shape. A masked pixel can be one of two things:
1. Watermark over white background → pixel color ≈ watermark color (light gray).
2. Watermark over black text → pixel color = watermark blended with black text → noticeably darker than the watermark color.

Treating both the same and painting white is what deletes the text.

## Fix — color-aware removal

Only whiten pixels that actually look like the watermark. Keep (or restore) pixels that are darker, because those carry underlying text.

### Steps (all inside `src/routes/tools.pdf-watermark-remover.tsx`, no new deps)

1. **Sample the watermark color during detection.**
   In `detectWatermarkMask`, after building the intersection mask, average the RGB of masked pixels across all sample pages where the local neighborhood is otherwise near-white. That gives `wmColor = {r,g,b}` — the true watermark tint (typically light gray, ~180–220).

2. **Store `wmColor` alongside the mask** in `ScanResult`.

3. **Rewrite `rebuildWithoutMask` per-pixel logic.** For every masked pixel on each page:
   - Compute `d = ΔE(pixel, wmColor)` and `lum = perceived luminance`.
   - If `d < TOL` (pixel matches watermark) → paint white/background. Watermark gone.
   - Else if `lum < wmLum - MARGIN` (pixel is darker than watermark → text underneath) → **keep the pixel as-is**, or optionally lighten it slightly to compensate for the overlay. Text preserved.
   - Else → leave unchanged (safety fallback).

   Constants: `TOL = 18` in RGB Euclidean distance, `MARGIN = 25` in luma. Tunable.

4. **Optional refinement (cheap):** for kept "text" pixels, subtract the watermark contribution:
   `out = clamp((pixel - wmColor*α) / (1-α))` with α estimated from average opacity (~0.35). This recovers original text darkness. Skip if it introduces noise — the "keep as-is" branch already fixes the visible bug.

5. **Preview overlay unchanged** — user still sees the red mask on page 1.

## What the user sees

- Before: watermark gone, but every line of text the watermark crossed is missing.
- After: watermark gone, and text under it stays legible.

## Out of scope

- OCR reconstruction of text that was fully opaque under the mark.
- Handling watermarks with dark colors that overlap dark text (rare; would need a different heuristic).

## Success check

Re-run on `123.pdf`: the "فروجكس" mark is removed and the code sample text underneath (`import { useState, useRef } from "react"` etc.) remains fully readable on every page.
