import { removeBackground as removeBg } from "@imgly/background-removal";

export const removeBackground = async (file: File): Promise<Blob> => {
  const blob = await removeBg(file, {
    publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/",
    output: { format: "image/png", quality: 0.9 },
  });
  return blob;
};
