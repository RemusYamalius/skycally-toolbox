import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  fileBase64: z.string().min(1),
  name: z.string().min(1).max(255),
});

export const pdfToWord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const key = process.env.PDFCO_KEY;
    if (!key) throw new Error("Service not configured");

    // Step 1: get presigned upload URL
    const presignRes = await fetch(
      `https://api.pdf.co/v1/file/upload/get-presigned-url?name=${encodeURIComponent(data.name)}&contenttype=application/pdf`,
      { headers: { "x-api-key": key } },
    );
    if (!presignRes.ok) throw new Error("Upload failed");
    const presign: any = await presignRes.json();
    if (presign.error) throw new Error(presign.message || "Upload failed");

    // Step 2: PUT bytes
    const bin = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    const putRes = await fetch(presign.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: bin,
    });
    if (!putRes.ok) throw new Error("Upload failed");

    // Step 3: convert
    const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/docx", {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ url: presign.url, async: false }),
    });
    const convert: any = await convertRes.json();
    if (!convertRes.ok || convert.error) {
      throw new Error(convert?.message || "Conversion failed");
    }
    return { url: convert.url };
  });
