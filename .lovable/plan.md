## Pro upgrade for QR Code Generator (`/tools/qr-generator`)

Single-file rewrite of `src/routes/tools.qr-generator.tsx`. No new deps — `qrcode` is already installed and supports rendering at high error-correction with a margin, which is all we need; everything else (dot styles, gradient, logo, frame) is post-processed on a 1000×1000 offscreen canvas and downscaled to a 300×300 preview.

### New top-level layout

```
[ URL | Text | Email | Phone | WiFi | vCard ]   ← type tabs
[ dynamic content inputs ]
▾ Style & Colors          (Collapsible, open by default)
▾ Center Logo             (Collapsible)
▾ Frame                   (Collapsible)
[ live preview 300×300 ]  [ PNG ] [ SVG ] [ Copy Image ]
```

Use existing `Collapsible`, `ToggleGroup`, `Slider`, `Input`, `Button`, `Tooltip` from `src/components/ui/`. Keep `ToolPageShell`, `AdZone`, `HowToUse` wrappers and the route's `head()` block unchanged.

### State shape

```ts
type QRType = 'url'|'text'|'email'|'phone'|'wifi'|'vcard';
type DotStyle = 'square'|'rounded'|'dots'|'classy'|'classy-rounded';
type ColorMode = 'solid'|'gradient';
type GradientType = 'linear'|'radial';
type FrameStyle = 'none'|'simple'|'rounded'|'badge';
type LogoChoice = { kind: 'none' } | { kind: 'builtin'; id: string } | { kind: 'upload'; dataUrl: string };
```

Per-type form data is held in one object keyed by type, e.g. `wifi: { ssid, password, security: 'WPA'|'WEP'|'nopass' }`, `vcard: { name, phone, email, website }`, `email: { address, subject }`. `formatQRContent(type, data)` returns the string fed to `qrcode`.

### Render pipeline (runs in a `useEffect` debounced via `requestAnimationFrame`)

1. Build content string from active type + form data; bail if empty.
2. Decide error correction: `'H'` if logo selected, else `'M'`.
3. `QRCode.toCanvas(offscreen, content, { width: 1000, margin: 2, errorCorrectionLevel, color: { dark:'#000', light: bg } })` into an offscreen 1000×1000 canvas — render in pure black so we can re-color it.
4. `applyDotStyle(offscreen, style, '#000', bg)` — rebuild modules with `detectModuleSize` + per-style path drawing (square/rounded/dots/classy/classy-rounded) per the snippet.
5. Apply color: render dark modules as black, then a separate "fill" pass via `globalCompositeOperation = 'source-in'` filling either solid `color1` or a `CanvasGradient` (linear with angle dial or radial).
6. If logo selected, draw white rounded background + logo image at the configured size (15–35%, default 22%) in the center.
7. If frame ≠ `none`, copy the QR onto a slightly larger canvas with stroke/rounded stroke, or onto a taller canvas with a colored badge below containing the CTA text.
8. Downscale the final canvas into the visible 300×300 `<canvas>` via `drawImage` for the live preview, with a CSS `opacity` fade-in transition keyed by a render counter.

The full-resolution offscreen canvas is kept in a ref so PNG download / clipboard copy use the high-quality version.

### Built-in logo set

Inline SVG data-URLs generated at module scope — colored circle + monogram for each: WiFi, Link, Email, Phone, Location, Instagram, Facebook, Twitter/X, WhatsApp, YouTube, TikTok, LinkedIn. Brand colors hard-coded. Upload accepts PNG/JPG/SVG, validates ≤200KB via `checkSize`-style guard, stores as data-URL in state.

When a logo is active, show a small badge above the preview: "⚡ High error correction enabled for logo compatibility".

### Downloads

- **PNG** — `offscreenRef.current.toBlob` → `downloadBlob(blob, 'qrcode.png')` (existing helper).
- **SVG** — keep `QRCode.toString({ type:'svg' })` for the basic case; when dot-style/gradient/logo/frame are active, SVG export falls back to a rasterized PNG inside an `<svg><image/></svg>` wrapper so users still get an `.svg` file. Surface a small note ("SVG embeds raster when styled") via tooltip.
- **Copy Image** — `canvas.toBlob` → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`, with `toast.success('QR code copied to clipboard!')` and a graceful fallback toast for unsupported browsers (Safari < 16).

### UI details

- Dot style: 5 buttons in a `ToggleGroup` with mini glyph previews and `Tooltip` describing each.
- Color mode: segmented toggle Solid / Gradient. Gradient reveals second color picker, Linear/Radial toggle, and 4 direction preset buttons (0/45/90/135°) plus a numeric angle input.
- Frame: style toggle + frame color picker; CTA fields appear only for `badge`. CTA presets ("SCAN ME", "Visit Website", "Follow Us", "Get Offer") as quick-fill chips, free-text input still available.
- All controls cause the pipeline above to re-run; preview fades in via a `key`-bumped wrapper class.
- Mobile: switch the two-column desktop grid to a single column and keep the preview sticky above downloads.

### Things explicitly preserved

- Route path, `head()` meta, page shell, ad zone, how-to-use steps.
- Existing PNG and SVG download buttons + sonner toasts.
- Existing size presets (Small/Medium/Large) become the *preview* sizing only; download is always 1000×1000 at H quality.

### Files touched

- `src/routes/tools.qr-generator.tsx` — full rewrite per above. No other files change. No new npm packages.
