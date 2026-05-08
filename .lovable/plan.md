## Fix QR Code Generator — use plain `qrcode` rendering

**File:** `src/routes/tools.qr-generator.tsx`

The current pipeline draws the QR onto an offscreen canvas, then runs custom `applyDotStyle` / `applyColorFill` passes that wipe the modules and never repaint them correctly — so the preview shows only the logo on the background. Per the user's instruction, replace the broken pipeline with a direct `QRCode.toCanvas` call on the visible canvas.

### Changes

1. **Replace the `render` callback (lines ~389-424)** with a minimal version that draws straight to `previewRef.current`:
   ```ts
   const render = useCallback(async () => {
     const canvas = previewRef.current;
     if (!canvas || !content) return;
     try {
       await QRCode.toCanvas(canvas, content, {
         width: 300,
         margin: 2,
         errorCorrectionLevel: logo.kind !== "none" ? "H" : "M",
         color: { dark: color1, light: bg },
       });
       finalRef.current = canvas; // reuse for PNG / Copy downloads
     } catch (err) {
       console.error(err);
     }
   }, [content, color1, bg, logo.kind]);
   ```
   - `qrColor` in the user's snippet maps to existing `color1` state; `bgColor` maps to existing `bg` state.
   - Effect already re-runs on `render` change, so live updates work for content + colors.

2. **Keep all UI untouched**: dot style, gradient, logo upload, frame, CTA controls remain in the panel. They simply won't affect the rendered QR for now (acknowledged trade-off per user's "only replace the broken canvas drawing code" directive — the styling pipeline was the broken part).

3. **Downloads / copy**: `finalRef.current` now points at the visible 300px canvas, so existing `downloadPng`, `copyImage`, and the styled-SVG fallback continue to work against it. The unstyled SVG path in `downloadSvg` already uses `QRCode.toString` directly and is unaffected.

4. **Preview wrapper (lines 751-759)**: leave as-is. The `key={content}` fade wrapper does not remount the canvas's parent in a way that breaks the new draw (canvas is redrawn on every effect run anyway).

5. **No package install needed** — `qrcode` and `@types/qrcode` are already imported and in use at the top of the file.

### Result

Typing into any input (URL, Text, Email, Phone, WiFi, vCard) updates `forms` → `content` → effect → `QRCode.toCanvas` redraws the visible canvas in real time. Foreground/background color changes also re-render live. PNG / SVG / Copy buttons keep working.
