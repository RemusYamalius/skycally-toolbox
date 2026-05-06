export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

const API_URL =
  import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Uploading image...");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("scale", String(scale));

  const response = await fetch(`${API_URL}/api/upscale?scale=${scale}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (err.detail === "REPLICATE_KEY_MISSING") {
      throw new Error("API key not configured on server.");
    }
    throw new Error(err.detail || "Upscaling failed");
  }

  onProgress("Processing with AI...");
  const data = await response.json();
  onProgress("Almost done...");
  return data.output;
};
