import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(1),
  mime: z.string().min(1),
});

export const removeBg = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ pngBase64: string }> => {
    const key = process.env.REMOVEBG_KEY;
    if (!key) throw new Error("Service not configured");

    const bin = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: data.mime });
    const fd = new FormData();
    fd.append("image_file", blob, "image");
    fd.append("size", "auto");

    let res: Response;
    try {
      res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": key },
        body: fd,
      });
    } catch {
      throw new Error("Connection error. Please try again.");
    }
    if (res.status === 402) throw new Error("Monthly quota exceeded on remove.bg");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t.includes("insufficient") ? "Quota exceeded" : "Background removal failed");
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return { pngBase64: btoa(s) };
  });
