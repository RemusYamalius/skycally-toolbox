export const MAX_UPSCALE_BYTES = 10 * 1024 * 1024;

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Loading image...");
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width * scale;
  const H = bitmap.height * scale;

  onProgress("Upscaling...");
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, W, H);

  onProgress("Sharpening...");
  const imageData = ctx.getImageData(0, 0, W, H);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const kSize = 3, half = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(W - 1, Math.max(0, x + kx - half));
          const py = Math.min(H - 1, Math.max(0, y + ky - half));
          const i = (py * W + px) * 4;
          const k = kernel[ky * kSize + kx];
          r += src[i] * k; g += src[i + 1] * k; b += src[i + 2] * k;
        }
      }
      const i = (y * W + x) * 4;
      out[i] = Math.min(255, Math.max(0, r));
      out[i + 1] = Math.min(255, Math.max(0, g));
      out[i + 2] = Math.min(255, Math.max(0, b));
      out[i + 3] = src[i + 3];
    }
  }
  ctx.putImageData(new ImageData(out, W, H), 0, 0);

  onProgress("Finalizing...");
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
};
