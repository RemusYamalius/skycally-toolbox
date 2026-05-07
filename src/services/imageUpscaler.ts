export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Uploading image...");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("scale", String(scale));

  onProgress("Processing with AI...");

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/upscale?scale=${scale}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Upscaling failed");
  }

  onProgress("Almost done...");

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
