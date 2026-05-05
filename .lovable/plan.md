## Goal
Add 3 new browser-only tools (QR Generator, QR Reader, Image-to-Text OCR). PDF Text Extractor already exists from previous turn — keep it. Wire all four into the homepage grid, /tools page, and footer.

## Packages (already installed)
- `pdfjs-dist`, `qrcode` (+ `@types/qrcode`), `jsqr`, `tesseract.js`

## File changes

### 1. `src/lib/tools.ts` — register 3 new tools
Add icons `QrCode, ScanLine, ScanText` from lucide-react. Append entries:
- `qr-generator` → category `text`, icon `QrCode`, path `/tools/qr-generator`
- `qr-reader` → category `text`, icon `ScanLine`, path `/tools/qr-reader`
- `image-to-text` → category `image`, icon `ScanText`, path `/tools/image-to-text`

### 2. New route: `src/routes/tools.qr-generator.tsx`
- Inputs: text/URL textarea, size selector (Small 200 / Medium 400 / Large 800), color + background color pickers
- Live preview using `qrcode.toCanvas` (re-render on changes via useEffect)
- Buttons: Download PNG (canvas → blob), Download SVG (`qrcode.toString` type:'svg')
- Wrapped in `ToolPageShell` + `<HowToUse>` + `<AdZone>` comment

### 3. New route: `src/routes/tools.qr-reader.tsx`
- `DropZone` for PNG/JPG/GIF → draw onto canvas → `jsQR(imageData.data, w, h)`
- "Scan from Camera" button: `navigator.mediaDevices.getUserMedia({video})`, run jsQR in a requestAnimationFrame loop until decoded, then stop tracks
- Result card with decoded text + Copy button. If `/^https?:\/\//` test passes, show "Open Link"
- Error: "No QR code found in this image"

### 4. New route: `src/routes/tools.image-to-text.tsx`
- `DropZone` for image (PNG/JPG/WEBP)
- Language `<select>`: English (eng), Arabic (ara), French (fra), Spanish (spa)
- Extract Text button → dynamic `import("tesseract.js")`, `createWorker(lang, 1, { logger })`
- Progress bar driven by logger `m.progress`
- Result textarea (`dir="auto"`), Copy + Download .txt buttons, character count

### 5. `src/components/site-footer.tsx`
- Categories list already maps over all categories — it auto-includes new tools (slice 3). No code change needed; verify it shows the new ones.

### 6. Homepage `src/routes/index.tsx`
- Grid already maps `tools` → new ones appear automatically. No change needed.

## Common UI patterns
Each new tool route includes:
- `ToolPageShell` (provides "No files stored on our servers" badge automatically)
- `<HowToUse>` 3-step guide
- `{/* ADSENSE_ZONE: <slug>-bottom 728x90 */}` comment + `<AdZone>` rendered below the tool

## Notes
- All processing happens client-side. tesseract.js + pdfjs-dist + jsqr are dynamically imported inside handlers to avoid SSR issues on Cloudflare Workers.
- Mobile responsive via existing Tailwind utility classes.
