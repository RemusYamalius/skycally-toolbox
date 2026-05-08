# Add 6 Browser-Based Image Tools

All run client-side. Three tools need npm packages; three use only Canvas API.

## 1. Dependencies (one install)

```
bun add cropperjs react-cropper fabric jspdf
```

## 2. Tool registry & navigation

**`src/lib/tools.ts`** — append 6 entries to `tools[]`, all `category: "image"`:
- `image-resizer` (Maximize2) → `/tools/image-resizer`
- `image-cropper` (Crop) → `/tools/image-cropper`
- `add-text-to-image` (Type) → `/tools/add-text-to-image`
- `image-to-pdf` (FileImage) → `/tools/image-to-pdf`
- `collage-maker` (LayoutGrid) → `/tools/collage-maker`
- `meme-generator` (Laugh) → `/tools/meme-generator`

No changes needed in `tools.index.tsx` or `site-footer.tsx` — both already iterate the `image` category from `tools[]`. Homepage grid (`src/routes/index.tsx`) likewise pulls from `tools.ts`, so the new entries appear automatically.

## 3. Route files (each follows existing pattern)

Each route uses `createFileRoute` + `head()` meta + `<ToolPageShell>` + `<HowToUse>` 3-step block + `<AdZone>` comment marker `{/* ADSENSE_ZONE: image-tool-below-result 300x250 */}`. Toasts use `sonner`. Downloads use the `<a download>` pattern. TanStack auto code-splits each route — no manual `React.lazy` needed.

### `tools.image-resizer.tsx`
- Tabs/segmented control: "By Pixels" / "By Percentage".
- Inputs: width/height with lock-aspect toggle; percentage slider 10–200%.
- Format select (JPG/PNG/WEBP), quality slider (hidden for PNG).
- Preset buttons: HD, Full HD, 4K, IG Square, IG Story, Twitter Header, FB Cover.
- Live "before/after" size estimate via temp `canvas.toBlob`.
- `resizeImage()` exactly per spec.

### `tools.image-cropper.tsx`
- `react-cropper` with theme overrides injected via `<style>` tag (cyan-brand outline).
- Aspect-ratio buttons: Free / 1:1 / 4:3 / 16:9 / 3:4 / 9:16.
- Rotate ±90°, flip H/V via cropper instance methods.
- Live crop dims via `crop` event → `getData()`.
- Format select; download via `getCroppedCanvas().toBlob()`.

### `tools.add-text-to-image.tsx`
- Fabric.js canvas inside a sized container; image scales canvas to its dims.
- Right sidebar: text input, font family select (Arial/Georgia/Impact/Courier/Verdana/Comic Sans/Roboto/Montserrat), size slider 12–200, fill color, bg color + opacity, B/I/U toggles, alignment, shadow toggle, stroke (color + width).
- "Add Text" → `fabric.IText` with originX/Y center.
- Layer list (sidebar) with delete button; sync on `selection:created/updated/cleared`.
- Download via `canvas.toDataURL({ format: 'png' })`.
- Lazy-import `fabric` inside `useEffect` to keep initial bundle slim.

### `tools.image-to-pdf.tsx`
- Multi-file drop zone; thumbnail list with HTML5 drag handles to reorder (no extra lib — native `draggable`).
- Page size (A4/A3/Letter/Custom with mm inputs), orientation, margin slider 0–30mm, fit mode (fit/fill/original), filename input.
- "Convert to PDF" runs `imagesToPdf()` per spec; show page-count preview = file count.

### `tools.collage-maker.tsx`
- Upload zone (2–9 images).
- Layout selector — visual SVG grid previews per count (2/3/4/6/9 with the variants in the spec). Each layout = array of `{x,y,w,h}` fractional cells.
- Canvas-size preset buttons (Square 1080 / Landscape 1920×1080 / Portrait 1080×1920).
- Sliders: gap 0–30, border radius 0–30; bg color picker.
- Drag-to-cell reordering of uploaded photos.
- `generateCollage()` per spec → PNG download.

### `tools.meme-generator.tsx`
- Step 1: 12 imgflip template thumbnails grid + "Upload your own" tile.
- Step 2: top/bottom inputs, font-size slider 24–80, text color, outline color, outline width 1–8, ALL CAPS toggle (default on), font select (Impact/Arial/Oswald).
- Step 3: live `<canvas>` preview re-renders on every change; Download PNG; Share button shown only when `navigator.share` exists.
- All `<img>` use `crossOrigin="anonymous"` for clean canvas export. If imgflip blocks CORS at runtime, fall back to a friendly toast suggesting "Upload your own image".

## 4. Shared bits already present
- `<ToolPageShell>`, `<HowToUse>`, `<AdZone>`, `<DropZone>`, `sonner` toast — reuse as-is.
- "No files stored" badge already inside `ToolPageShell`.

## 5. Files

**Created (6):** `src/routes/tools.image-resizer.tsx`, `tools.image-cropper.tsx`, `tools.add-text-to-image.tsx`, `tools.image-to-pdf.tsx`, `tools.collage-maker.tsx`, `tools.meme-generator.tsx`.

**Edited (1):** `src/lib/tools.ts` (append 6 entries + 6 lucide icon imports).

**Auto-regenerated:** `src/routeTree.gen.ts`.

## Notes
- `fabric` and `jspdf` work in browsers fine; only loaded inside the route components, so SSR is unaffected.
- `cropperjs` CSS imported at the top of the cropper route — Vite handles it.
- All 6 tools are mobile-responsive: control panels stack below `md` via Tailwind grid.
- No backend, no env vars, no Cloud changes.
