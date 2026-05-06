## Replace Jimp with Canvas-based upscaler

Drop the `jimp` dependency entirely and use a native `<canvas>` for upscaling. Smaller bundle, no SSR/Rollup issues, faster on large images.

### 1. `src/services/imageUpscaler.ts` — full rewrite

```ts
export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Reading image...");
  const img = await loadImage(file);

  onProgress("Upscaling...");
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const dw = sw * scale;
  const dh = sh * scale;

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Stepped upscale for 3x/4x produces smoother results than a single draw
  if (scale >= 3) {
    const mid = document.createElement("canvas");
    mid.width = sw * 2;
    mid.height = sh * 2;
    const mctx = mid.getContext("2d")!;
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = "high";
    mctx.drawImage(img, 0, 0, mid.width, mid.height);
    ctx.drawImage(mid, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, 0, 0, dw, dh);
  }

  onProgress("Finalizing...");
  return canvas.toDataURL("image/png");
};
```

### 2. Remove `jimp` dependency
- `bun remove jimp`

### 3. `src/routes/tools.image-upscaler.tsx`
No changes required — it already imports `upscaleImage` and `MAX_UPSCALE_BYTES` from the same module and the function signature is unchanged. The existing 2x/4x toggle works as-is (4x will use the stepped path).

### Notes
- Same browser-only behavior, identical PNG data-URL output → before/after slider and download still work.
- Fixes the Rollup `jimp` build error by eliminating the dependency.
- Caption ("bicubic interpolation, in your browser") stays accurate — `imageSmoothingQuality: "high"` uses the browser's high-quality resampler (bicubic/Lanczos depending on engine).
