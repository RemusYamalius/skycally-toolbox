export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

export async function upscaleImage(file: File, scale: 2 | 4): Promise<string> {
  const apiKey = import.meta.env.VITE_REPLICATE_KEY as string | undefined;
  if (!apiKey) throw new Error("Missing API key. Get a free key at replicate.com and add VITE_REPLICATE_KEY.");
  if (file.size > MAX_UPSCALE_BYTES) throw new Error("Max file size is 5MB");

  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });

  const start = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      input: { image: base64, scale, face_enhance: false },
    }),
  });
  if (!start.ok) throw new Error(`Replicate error: ${start.status}`);
  let result = await start.json();

  while (result.status !== "succeeded" && result.status !== "failed" && result.status !== "canceled") {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    result = await poll.json();
  }
  if (result.status !== "succeeded") throw new Error(result.error || "Upscaling failed");
  return Array.isArray(result.output) ? result.output[0] : result.output;
}
