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
  return await image.getBase64(JimpMime.png);
};
