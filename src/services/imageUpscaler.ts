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
