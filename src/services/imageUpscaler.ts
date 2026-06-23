export const MAX_UPSCALE_BYTES = 10 * 1024 * 1024;

// ─── Lanczos kernel ───────────────────────────────────────────────────────────
function lanczos(x: number, a: number): number {
  if (x === 0) return 1;
  if (Math.abs(x) >= a) return 0;
  const px = Math.PI * x;
  return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
}

/**
 * Lanczos resampling — significantly sharper than browser bicubic,
 * preserves edge detail and avoids the blurriness of drawImage scaling.
 * a=3 is the standard "Lanczos3" used in Photoshop and FFmpeg.
 */
function lanczosResample(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  a = 3,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const sy = (dy + 0.5) * scaleY - 0.5;
    const sy0 = Math.floor(sy) - a + 1;
    const sy1 = Math.floor(sy) + a;

    for (let dx = 0; dx < dstW; dx++) {
      const sx = (dx + 0.5) * scaleX - 0.5;
      const sx0 = Math.floor(sx) - a + 1;
      const sx1 = Math.floor(sx) + a;

      let r = 0,
        g = 0,
        b = 0,
        alpha = 0,
        weight = 0;

      for (let ky = sy0; ky <= sy1; ky++) {
        const wy = lanczos((sy - ky) / scaleY, a);
        if (wy === 0) continue;
        const clampy = Math.min(srcH - 1, Math.max(0, ky));

        for (let kx = sx0; kx <= sx1; kx++) {
          const wx = lanczos((sx - kx) / scaleX, a);
          if (wx === 0) continue;
          const clampx = Math.min(srcW - 1, Math.max(0, kx));

          const w = wx * wy;
          const i = (clampy * srcW + clampx) * 4;
          r += src[i] * w;
          g += src[i + 1] * w;
          b += src[i + 2] * w;
          alpha += src[i + 3] * w;
          weight += w;
        }
      }

      const di = (dy * dstW + dx) * 4;
      dst[di] = Math.min(255, Math.max(0, Math.round(r / weight)));
      dst[di + 1] = Math.min(255, Math.max(0, Math.round(g / weight)));
      dst[di + 2] = Math.min(255, Math.max(0, Math.round(b / weight)));
      dst[di + 3] = Math.min(255, Math.max(0, Math.round(alpha / weight)));
    }
  }
  return dst;
}

/**
 * Unsharp mask — enhances perceived sharpness after upscaling.
 * Amount controls the strength (0.3–0.8 is a good range).
 */
function unsharpMask(data: Uint8ClampedArray, w: number, h: number, radius = 1, amount = 0.5): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const blurred = new Uint8ClampedArray(data);
  const r = Math.max(1, Math.round(radius));

  // Simple box blur approximation
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0,
        sg = 0,
        sb = 0,
        cnt = 0;
      for (let ky = -r; ky <= r; ky++) {
        for (let kx = -r; kx <= r; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx));
          const py = Math.min(h - 1, Math.max(0, y + ky));
          const i = (py * w + px) * 4;
          sr += data[i];
          sg += data[i + 1];
          sb += data[i + 2];
          cnt++;
        }
      }
      const i = (y * w + x) * 4;
      blurred[i] = sr / cnt;
      blurred[i + 1] = sg / cnt;
      blurred[i + 2] = sb / cnt;
      blurred[i + 3] = data[i + 3];
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    out[i] = Math.min(255, Math.max(0, Math.round(data[i] + amount * (data[i] - blurred[i]))));
    out[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] + amount * (data[i + 1] - blurred[i + 1]))));
    out[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] + amount * (data[i + 2] - blurred[i + 2]))));
    out[i + 3] = data[i + 3];
  }
  return out;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export const upscaleImage = async (file: File, scale: number, onProgress: (msg: string) => void): Promise<string> => {
  onProgress("Loading image…");
  const bitmap = await createImageBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const dstW = srcW * scale;
  const dstH = srcH * scale;

  // 1) Draw source at original size to get pixel data
  onProgress("Reading pixels…");
  const srcCanvas = new OffscreenCanvas(srcW, srcH);
  const srcCtx = srcCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  srcCtx.drawImage(bitmap, 0, 0, srcW, srcH);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

  // 2) Lanczos3 resampling
  onProgress("Upscaling with Lanczos3…");
  const upscaled = lanczosResample(srcData, srcW, srcH, dstW, dstH, 3);

  // 3) Unsharp mask for perceived sharpness
  onProgress("Sharpening…");
  const sharpened = unsharpMask(upscaled, dstW, dstH, 1, 0.45);

  // 4) Write to output canvas
  onProgress("Finalizing…");
  const dstCanvas = new OffscreenCanvas(dstW, dstH);
  const dstCtx = dstCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  const imgData = dstCtx.createImageData(dstW, dstH);
  imgData.data.set(sharpened);
  dstCtx.putImageData(imgData, 0, 0);

  const blob = await dstCanvas.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
};
