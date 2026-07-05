import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(32),
  mimeType: z.string().min(3).max(64),
});

export type DetectDocumentInput = z.infer<typeof InputSchema>;

export interface NormalizedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

const SYSTEM_PROMPT = `You are a professional document-boundary detector for a scanner app.
Find the exact four visible corners of the actual paper/document/receipt/card page the user wants to scan.
Ignore every outer container: phone screen, monitor screen, browser window, PDF reader window, Adobe Reader UI, black camera bars, table/background, shadows, page preview frame, and any crop already drawn by the app.
If a screenshot or camera photo contains a document inside another screen/window, detect ONLY the inner paper/document content, not the outer screen/window/viewer frame.
Prefer the page boundary even when the paper is grey, low contrast, skewed, folded, or partly surrounded by dark margins.
Return ONLY a compact JSON object — no prose, no markdown, no code fences — with this exact shape:
{"tl":{"x":0.00,"y":0.00},"tr":{"x":1.00,"y":0.00},"br":{"x":1.00,"y":1.00},"bl":{"x":0.00,"y":1.00}}
All x/y are normalized floats in [0,1] relative to image width/height (x = horizontal, y = vertical from top).
Corners MUST be ordered tl (top-left), tr (top-right), br (bottom-right), bl (bottom-left) of the document as it appears in the image (before any rotation correction).
If you cannot confidently locate a document, return {"tl":{"x":0.05,"y":0.05},"tr":{"x":0.95,"y":0.05},"br":{"x":0.95,"y":0.95},"bl":{"x":0.05,"y":0.95}}.`;

const CornerSchema = z.object({ x: z.number(), y: z.number() });
const ResponseSchema = z.object({
  tl: CornerSchema,
  tr: CornerSchema,
  br: CornerSchema,
  bl: CornerSchema,
});

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export const detectDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<NormalizedCorners> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("DETECTION_UNAVAILABLE");

    const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Detect the document corners in this image." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) throw new Error("DETECTION_FAILED");

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("DETECTION_FAILED");

    // Extract JSON block (model may occasionally wrap in fences)
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("DETECTION_FAILED");
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("DETECTION_FAILED");
    }
    const result = ResponseSchema.parse(parsed);

    return {
      topLeft: { x: clamp01(result.tl.x), y: clamp01(result.tl.y) },
      topRight: { x: clamp01(result.tr.x), y: clamp01(result.tr.y) },
      bottomRight: { x: clamp01(result.br.x), y: clamp01(result.br.y) },
      bottomLeft: { x: clamp01(result.bl.x), y: clamp01(result.bl.y) },
    };
  });
