import { removeBackground as removeBg } from "@imgly/background-removal";

export const removeBackground = async (file: File): Promise<Blob> => {
  const blob = await removeBg(file, {
    publicPath: "https://unpkg.com/@imgly/background-removal@1.4.5/dist/",
    model: "small",
    output: { format: "image/png", quality: 0.9 },
  });
  return blob;
};
