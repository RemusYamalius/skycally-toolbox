## Bug

In `src/routes/tools.qr-generator.tsx`, the dot-style → color-fill pipeline destroys the QR pattern:

1. `applyDotStyle` repaints the full canvas with the background color, then draws the dark modules on top (opaque background everywhere).
2. `applyColorFill` then uses the resulting canvas as a mask with `globalCompositeOperation = "source-in"`. But `source-in` keys off **alpha**, not color — and every pixel is opaque. So the whole 1000×1000 square gets filled with the solid color or gradient, hiding the QR code entirely.

Result:
- Solid black (image 2): color1=#000 floods the whole square.
- White→blue gradient (image 1): gradient floods the whole square; preview shows a near-white box.
- Live preview also affected because it's just a downscale of the broken canvas.

## Fix (single file: `src/routes/tools.qr-generator.tsx`)

Make the dot-style pass produce a **transparent background with only the dark modules drawn**, so the mask correctly represents only the QR foreground. Then `applyColorFill` can paint color/gradient inside the modules and `destination-over` paints the background underneath.

Concrete changes inside `applyDotStyle` (lines ~132–176):

- Replace the initial `ctx.fillStyle = bg; ctx.fillRect(...)` with `ctx.clearRect(0, 0, size, size)` so the canvas is transparent before drawing modules.
- Drop the `ctx.fillStyle = fg` then `ctx.fill()` chain unchanged — modules are now the only opaque pixels (alpha = 255 on transparent), which is exactly the mask `applyColorFill` needs.
- Sample the **original** image data (already captured into `imageData` before clearing) to decide which cells are dark — current code already does this, just keep the `getImageData` call before `clearRect`.

No changes needed in `applyColorFill`: its existing `source-in` + `destination-over` sequence already does the right thing once the input mask only covers the modules.

Optional polish (same edit, low risk):
- In `QRCode.toCanvas` options keep `color.light: bg` (harmless) — `applyDotStyle` immediately clears it.
- Re-enable a tiny `imageSmoothingEnabled = false` before `applyDotStyle` reads pixels to avoid sub-pixel sampling drift on high-DPR canvases (set on the offscreen 2D context once at the top of `render`).

## Verification

After the fix, with the inputs from the screenshots:
- vCard + classy dots + white→#0EA5E9 linear gradient (45°) → preview shows a recognizable QR with gradient-tinted modules over white background.
- vCard + square dots + solid black + builtin logo + simple frame → preview shows black QR with white logo card and black frame stroke.
- PNG / SVG / Copy Image downloads use the same `finalRef`, so they're fixed by the same change.

No new dependencies. No other files touched.
