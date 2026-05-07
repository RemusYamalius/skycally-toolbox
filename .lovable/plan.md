# Plan: Update Image Upscaler to use backend API

Replace the current in-browser canvas upscaling in `src/services/imageUpscaler.ts` with a call to the backend `/api/upscale` endpoint that returns the upscaled image as a binary blob.

## Changes

### 1. `src/services/imageUpscaler.ts`
- Remove the `loadImage` helper and all canvas-based upscaling logic.
- Keep `MAX_UPSCALE_BYTES = 5 * 1024 * 1024`.
- Replace `upscaleImage` with a fetch-based version that:
  - Uploads the file via `FormData` (`file`, `scale`).
  - POSTs to `${import.meta.env.VITE_API_URL}/api/upscale?scale=${scale}`.
  - Reads response as a blob and returns `URL.createObjectURL(blob)`.
  - On non-OK, parses JSON error and throws `err.detail` or "Upscaling failed".
  - Calls `onProgress` with: "Uploading image...", "Processing with AI...", "Almost done...".

### 2. `src/routes/tools.image-upscaler.tsx`
No code change required — it already calls `upscaleImage(file, scale, onProgress)` and uses the returned URL as `<img src={output}>` and as the download href. The blob URL works identically to the previous data URL.

Note: `download="upscaled.png"` will still trigger download, though the actual file extension depends on what the backend returns.

## Backend dependency (out of this change)
The FastAPI service in `skycally-api/main.py` does not currently expose `/api/upscale`. For this to work end-to-end, an `/api/upscale` endpoint must exist on `https://skycally-api-production.up.railway.app` accepting multipart `file` + `scale` and returning an image blob. This plan only updates the frontend; backend work is assumed to be done separately (or can be added in a follow-up).
