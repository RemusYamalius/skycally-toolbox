import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  fileBase64: z.string().min(1),
  name: z.string().min(1).max(255),
});

export const pdfToWord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    enforceRateLimit("pdfco", 5);

    const key = process.env.PDFCO_KEY;
    if (!key) throw new Error("Service not configured");

    // Step 1: upload via multipart
    const bin = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, data.name);

    const uploadRes = await fetch("https://api.pdf.co/v1/file/upload", {
      method: "POST",
      headers: { "x-api-key": key },
      body: form,
    });
    if (!uploadRes.ok) throw new Error("UPLOAD_FAILED");
    const upload: any = await uploadRes.json();
    if (upload?.error) throw new Error(upload.message || "UPLOAD_FAILED");
    const fileUrl = upload.url;
    if (!fileUrl) throw new Error("UPLOAD_FAILED");

    // Step 2: convert PDF -> DOCX (correct endpoint is /to/doc, output is .docx)
    const outName = data.name.replace(/\.pdf$/i, ".docx");
    const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/doc", {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ url: fileUrl, async: false, inline: false, name: outName }),
    });
    if (!convertRes.ok) throw new Error("CONVERT_REQUEST_FAILED");
    const convert: any = await convertRes.json();
    if (convert?.error) throw new Error(convert.message || "CONVERT_REQUEST_FAILED");
    if (!convert?.url) throw new Error("CONVERT_REQUEST_FAILED");
    return { url: convert.url };
  });
