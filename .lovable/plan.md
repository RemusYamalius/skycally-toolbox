## Replace AI Image Upscaler with browser-side Jimp

Move upscaling fully into the browser using `jimp`. Remove the FastAPI proxy path and all server calls for this tool.

### 1. Install dependency
- `bun add jimp` (modern Jimp v1 ships ESM and works in browsers via Vite).

### 2. Rewrite `src/services/imageUpscaler.ts`
Replace the fetch-to-backend implementation with a pure-client function:

```ts
import { Jimp, JimpMime, ResizeStrategy } from "jimp";

export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Reading image...");
  const arrayBuffer = await file.arrayBuffer();

  onProgress("Upscaling...");
  const image = await Jimp.read(arrayBuffer);
  const newWidth = image.bitmap.width * scale;
  const newHeight = image.bitmap.height * scale;
  image.resize({ w: newWidth, h: newHeight, mode: ResizeStrategy.BICUBIC });

  onProgress("Finalizing...");
  return await image.getBase64(JimpMime.png); // returns "data:image/png;base64,..."
};
```

Note: the spec uses the older `Jimp.RESIZE_BICUBIC` / `getBase64Async` API. Jimp v1 renamed these to `ResizeStrategy.BICUBIC` and `getBase64`. Behavior is identical (bicubic interpolation, PNG data URL). If the user prefers the legacy API we can pin `jimp@0.22`, but v1 is recommended.

### 3. Update `src/routes/tools.image-upscaler.tsx`
- Keep current UI: drop zone, scale 2x/4x toggle, before/after slider, download button, `progressMsg` driven by `onProgress`.
- Update the bottom caption from "Powered by Real-ESRGAN AI" to: **"Uses bicubic interpolation — best for photos and general images. Runs entirely in your browser."**
- Update page `<title>` / description to drop "AI" wording (now "Image Upscaler — bicubic, in-browser").
- Update `HowToUse` step 2 to remove "AI" wording.

### 4. Cleanup
- `skycally-api/main.py`: remove the `/api/upscale` endpoint and any helpers/imports only used by it (keep `httpx` only if still used elsewhere — will check and trim `requirements.txt` accordingly).
- `.env`: nothing to remove (no `VITE_REPLICATE_KEY` left); `VITE_API_URL` stays for other tools.
- Recommend rotating the previously-shared Replicate token; it's no longer referenced anywhere in the project after this change.

### Files touched
- `package.json` (+ `jimp`)
- `src/services/imageUpscaler.ts` (full rewrite)
- `src/routes/tools.image-upscaler.tsx` (caption + meta tweaks)
- `skycally-api/main.py`, `skycally-api/requirements.txt` (remove upscale route)

### Caveats
- 4x upscaling on large images is CPU-heavy on the main thread and may briefly freeze the UI. If this becomes a problem we can move it into a Web Worker in a follow-up.
- Bicubic resize is a quality enlarger, not an AI super-resolution model — output won't match Real-ESRGAN's detail reconstruction. The new caption makes this honest.
