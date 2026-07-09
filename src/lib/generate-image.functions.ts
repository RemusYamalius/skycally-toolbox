import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string().trim().min(3).max(1000),
  negativePrompt: z.string().max(500).optional().default(""),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  style: z.string().max(200).optional().default(""),
  quality: z.enum(["draft", "standard", "high"]),
});

export type GenerateImageInput = z.infer<typeof InputSchema>;

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";

const STEPS: Record<GenerateImageInput["quality"], number> = {
  draft: 2,
  standard: 4,
  high: 8,
};

interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
}

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ imageUrl: string }> => {
    const lovable = process.env.LOVABLE_API_KEY;
    const replicate = process.env.REPLICATE_API_KEY;
    if (!lovable || !replicate) throw new Error("REPLICATE_NOT_CONFIGURED");

    const fullPrompt = data.style ? `${data.prompt}, ${data.style}` : data.prompt;
    const negative =
      data.negativePrompt.trim() ||
      "blurry, low quality, distorted, watermark, ugly, deformed, text";

    const headers = {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": replicate,
      "Content-Type": "application/json",
      Prefer: "wait=55",
    } as const;

    const createRes = await fetch(
      `${GATEWAY}/models/black-forest-labs/flux-schnell/predictions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          input: {
            prompt: fullPrompt,
            negative_prompt: negative,
            num_inference_steps: STEPS[data.quality],
            aspect_ratio: data.aspectRatio,
            output_format: "webp",
            output_quality: 90,
          },
        }),
      },
    );

    if (createRes.status === 429) throw new Error("RATE_LIMITED");
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      console.error(`[generateImage] create failed [${createRes.status}]: ${body}`);
      throw new Error("GENERATION_FAILED");
    }

    let prediction = (await createRes.json()) as Prediction;

    // If Prefer: wait didn't terminate, poll.
    const pollHeaders = {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": replicate,
    };
    const deadline = Date.now() + 180_000;
    let delay = 2000;
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled" &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 1000, 6000);
      const pollRes = await fetch(`${GATEWAY}/predictions/${prediction.id}`, {
        headers: pollHeaders,
      });
      if (!pollRes.ok) {
        const body = await pollRes.text().catch(() => "");
        console.error(`[generateImage] poll failed [${pollRes.status}]: ${body}`);
        throw new Error("GENERATION_FAILED");
      }
      prediction = (await pollRes.json()) as Prediction;
    }

    if (prediction.status !== "succeeded") {
      console.error(`[generateImage] status=${prediction.status} err=${prediction.error ?? ""}`);
      throw new Error("GENERATION_FAILED");
    }

    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!url) throw new Error("GENERATION_FAILED");
    return { imageUrl: url };
  });
