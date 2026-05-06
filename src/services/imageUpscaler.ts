export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

export function hasReplicateKey(): boolean {
  return Boolean(import.meta.env.VITE_REPLICATE_KEY);
}

function mapHttpError(status: number): string {
  if (status === 401) return "Invalid API key. Check your Replicate key.";
  if (status === 429) return "Rate limit reached. Try again in a few minutes.";
  return "Upscaling failed. Please try again.";
}

export async function upscaleImage(file: File, scale: 2 | 4): Promise<string> {
  const apiKey = import.meta.env.VITE_REPLICATE_KEY as string | undefined;
  if (!apiKey) throw new Error("API key missing");
  if (file.size > MAX_UPSCALE_BYTES) throw new Error("Max file size is 5MB");

  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });

  const createRes = await fetch(
    "https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions",
    {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { image: base64, scale, face_enhance: false } }),
    }
  );
  if (!createRes.ok) throw new Error(mapHttpError(createRes.status));
  const prediction = await createRes.json();

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!pollRes.ok) throw new Error(mapHttpError(pollRes.status));
    const result = await pollRes.json();
    if (result.status === "succeeded") {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }
    if (result.status === "failed" || result.status === "canceled") {
      throw new Error("Upscaling failed. Please try again.");
    }
  }
  throw new Error("Processing took too long. Try a smaller image.");
}
