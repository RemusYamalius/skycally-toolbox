import { removeBackground as imglyRemoveBg } from "@imgly/background-removal";

/**
 * Removes the background from an image using @imgly/background-removal
 * (AI-powered, runs fully in the browser via ONNX + WebAssembly).
 * Returns a transparent PNG blob.
 */
export const removeBackground = async (file: File, onProgress?: (pct: number) => void): Promise<Blob> => {
  const blob = await imglyRemoveBg(file, {
    output: { format: "image/png", quality: 1 },
    progress: (key, current, total) => {
      if (onProgress && total > 0) {
        onProgress(Math.round((current / total) * 100));
      }
    },
  });
  return blob;
};
