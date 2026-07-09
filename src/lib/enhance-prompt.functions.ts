import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string().trim().min(2).max(500),
});

const SYSTEM = `You are a professional AI art prompt engineer for Flux and Stable Diffusion. Expand the user's simple prompt into a detailed, vivid image generation prompt. Include: subject details, lighting (golden hour, studio, moonlight, etc.), mood, art style, composition, and technical quality terms (8k, sharp focus, detailed). Keep it under 150 words. Output ONLY the enhanced prompt as a single paragraph — no explanation, no quotes, no labels.`;

export const enhancePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ enhanced: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("GENERATION_FAILED");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[enhancePrompt] failed [${res.status}]: ${body}`);
      throw new Error("GENERATION_FAILED");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const enhanced = json.choices?.[0]?.message?.content?.trim();
    if (!enhanced) throw new Error("GENERATION_FAILED");
    return { enhanced };
  });
