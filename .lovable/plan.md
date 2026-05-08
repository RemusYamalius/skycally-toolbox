# Add 5 AI-Powered Tools (Browser-Only)

All 5 tools run 100% client-side via CDN-loaded models. No backend changes, no new dependencies in package.json — scripts are injected at runtime.

## 1. New "AI Tools" category

**`src/lib/tools.ts`**
- Add `"ai"` to `ToolCategory` union.
- Add `categoryMeta.ai` → `{ label: "AI Tools", color: "var(--violet-brand)", icon: "🤖" }`.
- Append 5 tool entries:
  - `background-blur` → `/tools/background-blur` (icon: `Aperture`)
  - `face-landmarks` → `/tools/face-landmarks` (icon: `ScanFace`)
  - `hand-gesture` → `/tools/hand-gesture` (icon: `Hand`)
  - `object-detection` → `/tools/object-detection` (icon: `Boxes`)
  - `sentiment-analysis` → `/tools/sentiment-analysis` (icon: `Brain`)

**`src/routes/tools.index.tsx`** — add `"ai"` to `VALID_CATS`, the cats list, and the "all" view category order.

**`src/components/site-footer.tsx`** — add `"ai"` to `categoryOrder`.

## 2. Shared helpers

**`src/lib/cdnScript.ts`** (new) — `loadScript(src: string): Promise<void>` that injects a `<script>` tag once, dedupes by src, resolves on `onload`. Used by all MediaPipe / TF.js tools.

**`src/components/ai-badges.tsx`** (new) — small components:
- `<PoweredBy name="MediaPipe" />` — footer pill
- `<BrowserOnlyBadge />` — "Works entirely in your browser — your data never leaves your device"
- `<ModelLoadingSkeleton label="Loading AI model..." />`
- `<CameraPermissionError />` — friendly denied-message card with retry

## 3. The 5 route files

Each follows the existing pattern: `createFileRoute` + `head()` meta + `ToolPageShell` wrapper + `HowToUse` 3-step block + an `AdZone` comment marker `{/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}` + `<PoweredBy>` + `<BrowserOnlyBadge>`. Models load lazily inside `useEffect` on mount (per-route bundle is already split by TanStack auto code-splitting).

### `src/routes/tools.background-blur.tsx`
- `Tabs`: "Upload Image" | "Live Camera".
- Loads `selfie_segmentation.js` via `loadScript`.
- Blur slider 5–30 (default 15).
- Upload: drop image → run once → show canvas + Download PNG button.
- Camera: `getUserMedia({ video: true })` → `Camera` utility from MediaPipe (also CDN: `camera_utils.js`) → continuous `send({image: video})`.
- Compositing exactly as in the spec (destination-over blur, destination-in mask).

### `src/routes/tools.face-landmarks.tsx`
- Loads `face_mesh.js` (+ `drawing_utils.js` for connections).
- Image upload + camera tabs.
- Toggles: show landmark dots / show connections (FACEMESH_TESSELATION) / show mesh overlay.
- Info cards: face count, "468 landmarks" stat.
- Download annotated PNG.

### `src/routes/tools.hand-gesture.tsx`
- Camera-only.
- Loads `hands.js` + `drawing_utils.js`.
- Draw skeleton (HAND_CONNECTIONS) + dots.
- `detectGesture(landmarks)` exactly as in spec → large badge with emoji + label.
- Show hand count and FPS counter (rolling avg of last 30 frames).

### `src/routes/tools.object-detection.tsx`
- Loads `tf.min.js` then `coco-ssd.min.js`.
- Tabs: Upload | Camera.
- `model.detect()` → draw color-coded boxes (hash class name → HSL).
- Sidebar list: each detection with confidence bar.
- Stats: total detections, unique classes.
- Loading copy: "Loading COCO-SSD model (~5MB)..."

### `src/routes/tools.sentiment-analysis.tsx`
- Uses Transformers.js loaded via dynamic ESM import:
  `await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js')`
  cached in a module-level promise.
- Textarea (max 1000 chars, live counter), Analyze button.
- Result card: emoji + label + animated progress bar, color-coded (green/red/gray).
- Batch mode: textarea, one text per line → list of results.
- History: last 5 analyses kept in component state.
- One-time notice: "⚡ First analysis takes ~15 seconds to load the AI model. Subsequent analyses are instant."

## 4. Mobile / responsive

Camera-tab layouts use `aspect-[3/4] sm:aspect-video` so phones get portrait framing. Controls stack vertically below `sm`.

## 5. Window typings

Add `src/types/global.d.ts` (new) declaring `interface Window { SelfieSegmentation: any; FaceMesh: any; Hands: any; Camera: any; cocoSsd: any; tf: any; drawConnectors: any; drawLandmarks: any; FACEMESH_TESSELATION: any; HAND_CONNECTIONS: any; }` to keep TS happy without pulling npm packages.

## Files created
- `src/lib/cdnScript.ts`
- `src/components/ai-badges.tsx`
- `src/types/global.d.ts`
- `src/routes/tools.background-blur.tsx`
- `src/routes/tools.face-landmarks.tsx`
- `src/routes/tools.hand-gesture.tsx`
- `src/routes/tools.object-detection.tsx`
- `src/routes/tools.sentiment-analysis.tsx`

## Files edited
- `src/lib/tools.ts` (add category + 5 tools)
- `src/routes/tools.index.tsx` (add "ai" to filter)
- `src/components/site-footer.tsx` (add "ai" to footer column order)

## Notes / caveats
- No npm installs — everything via CDN. Offline preview won't load models.
- TanStack Start auto code-splits route components, so React.lazy isn't needed; each tool's heavy logic only loads when the user visits its route.
- CDN scripts run only in the browser (inside `useEffect`), so SSR won't try to evaluate them.
