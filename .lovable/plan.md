## Goal

Add reliable automatic document edge detection to the Document Scanner tool. Currently the editor opens with a fixed 5%/95% rectangle and no auto-detection. Apply all 6 fixes from the brief.

## Files

**New**
- `src/utils/opencvLoader.ts` — singleton loader for OpenCV.js from `https://docs.opencv.org/4.8.0/opencv.js`. Resolves once `window.cv.Mat` is ready. Reuses existing `<script id="opencv-script">` if already in DOM. 30s timeout.
- `src/utils/edgeDetection.ts` — `detectDocumentCorners(img, w, h)` returning `{ topLeft, topRight, bottomRight, bottomLeft, detected }`. Uses resize → grayscale → blur → adaptive threshold + Canny → bitwise_or → dilate → findContours → approxPolyDP with multiple epsilons. Picks largest 4-point contour ≥10% image area. Always returns fallback (5%/95% box) on any failure. Includes `sortCorners` helper for TL/TR/BR/BL ordering.

**Modified**
- `src/types/global.d.ts` — add `cv` to `Window` typing (loose `any` is fine).
- `src/routes/tools.document-scanner.tsx`:
  1. Replace fixed-fraction `crop: CropBox` model with a 4-point `corners: Point[]` model (image-pixel coordinates) so detected quadrilaterals — not just axis-aligned rectangles — can be represented and edited.
  2. After capture (`captureFromCamera`) and after upload (`onUpload`, first image only), call new `processImage(imgEl)` which: sets `detectionStatus='loading'` → `await loadOpenCV()` → `detectDocumentCorners(...)` → sets corners + status (`detected`|`fallback`). Catches all errors and falls back to default corners.
  3. Update `EditPanel` to render an **overlay canvas** (instead of CSS clip-path) that draws the dim mask, dashed cyan polygon outline, and 4 large draggable handles (outer 18px translucent ring, inner 10px solid, white 4px dot) per Fix 5. Implement `drawCornersOverlay`. Pointer events on the overlay convert client coords → image coords using the current display scale.
  4. Replace 4 corner-resize logic with per-corner drag (each handle moves one Point freely; clamped to image bounds). The crop+filter pipeline in `processPage` becomes a perspective-warp using the 4 corners: compute output width/height as max side lengths, build `cv.getPerspectiveTransform` + `cv.warpPerspective` (uses OpenCV which is already loaded). Keep current `applyFilter` step on the warped canvas.
  5. Add detection status badge below the editor (`loading` spinner / `detected` ✅ / `fallback` ⚠️) per Fix 4, themed with existing tokens.
  6. Add a collapsible `ScanTips` block above camera/upload area per Fix 6.

## Technical notes

- Loader script tag is added to `document.head` lazily (no SSR issue — only runs in `processImage` which fires after user interaction in the browser).
- All OpenCV `Mat`s are deleted in a `finally`-style cleanup to avoid WASM heap leaks.
- Fallback model still works without OpenCV (offline or CDN blocked) — user simply drags the default rectangle.
- No changes to exports (PDF/JPG/OCR/Copy) — they consume the already-warped page in `pages[]`.
- No changes to SEO content, route registration, or tool listing.

## Out of scope

- Live edge preview while the camera is streaming (only post-capture detection).
- Auto-capture on stable detection.
- Persisting OpenCV across navigations beyond the cached `<script>` tag.
