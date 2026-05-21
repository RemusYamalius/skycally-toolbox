## Goal
Make PDF Watermark Remover generic — work for any watermark type on any PDF.

## File
`src/routes/tools.pdf-watermark-remover.tsx` (only file touched)

## Changes

### 1. Rewrite `stripWatermarkTextBlocks` (Strategy 1)
Replace current implementation with a two-pass version:
- Helpers: `isRotated(text)`, `hasLowAlpha(text)`, `matchesTargets(text)`.
- **Pass 1**: scan `q...Q` blocks; if block contains a `BT` and any of (rotated cm/Tm, low-alpha gs ref, matches a repeated target string), drop the entire `q...Q`.
- **Pass 2**: on the result, scan remaining `BT...ET` blocks and drop if rotated/lowAlpha/matchesTargets.
- Return `{ out, removed }`. Fix the dangling `var out = content;` from the user's snippet by declaring `let out = content;` at the top before Pass 1.

### 2. Lower repeated-string threshold
In `detectRepeatedStrings`, change:
```ts
const threshold = pageContents.length <= 2 ? 1 : Math.max(2, Math.floor(pageContents.length * 0.5));
```
So 1–2 page docs accept any string seen on a page; longer docs use 50%.

### 3. Confirm Strategy 2 size check (no change needed)
Verify `stripLargeImageDraws` already evaluates `wFrac > 0.4 && hFrac > 0.4` for any image in `imageNames` (not gated by `globalWatermarkImages`). Current code is correct — leave as-is.

### 4. Chain Advanced Mode after strategies 1–3
In `runAdvanced`, run `runStrategies1to3(buf)` first, then pass `cleaned.buffer` to `runRasterRebuild`.

### 5. Remove debug log
Delete the `console.log("[WatermarkRemover] Page ...")` line and its `// TODO` comment inside the per-page loop in `runStrategies1to3`.

## Out of scope
UI, styles, copy, other tools, other strategies' heuristics, file structure.

## Verification
Load preview, upload (a) a PDF with rotated diagonal text watermark wrapped in q...Q, (b) a 1–2 page PDF with a single repeated string watermark, (c) a PDF with one large background image watermark. All three should report `removed > 0` and download a cleaned file without showing the Advanced Mode prompt. Advanced Mode, when triggered, should operate on the already-stripped output.
