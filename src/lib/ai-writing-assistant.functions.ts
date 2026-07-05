import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ModeEnum = z.enum(["grammar", "paraphrase", "summarize"]);
const ParaphraseModeEnum = z.enum([
  "standard",
  "fluency",
  "formal",
  "simple",
  "creative",
  "concise",
]);
const SummaryLengthEnum = z.enum(["short", "medium", "detailed"]);
const SummaryStyleEnum = z.enum(["paragraph", "bullets", "takeaways"]);

const InputSchema = z
  .object({
    mode: ModeEnum,
    text: z.string().trim().min(1).max(8000),
    paraphraseMode: ParaphraseModeEnum.optional(),
    summaryLength: SummaryLengthEnum.optional(),
    summaryStyle: SummaryStyleEnum.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "grammar" && val.text.length > 5000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Grammar input capped at 5000 chars" });
    }
    if (val.mode === "paraphrase" && val.text.length > 3000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Paraphrase input capped at 3000 chars" });
    }
  });

export type WritingAssistantInput = z.infer<typeof InputSchema>;

const PARAPHRASE_PROMPTS: Record<z.infer<typeof ParaphraseModeEnum>, string> = {
  standard:
    "Rewrite the following text in a different way while preserving the original meaning. Keep the same length and tone. Output only the rewritten text, no preamble.",
  fluency:
    "Rewrite the following text to improve its flow, readability, and natural phrasing. Fix any awkward constructions. Output only the rewritten text, no preamble.",
  formal:
    "Rewrite the following text in a formal, professional, and academic tone. Use precise vocabulary and formal sentence structures. Output only the rewritten text, no preamble.",
  simple:
    "Rewrite the following text using simple, clear language that anyone can understand. Avoid jargon and complex sentences. Output only the rewritten text, no preamble.",
  creative:
    "Rewrite the following text in a more expressive, creative, and engaging way. Use varied vocabulary and interesting phrasing. Output only the rewritten text, no preamble.",
  concise:
    "Rewrite the following text in a more concise way, removing redundancy and unnecessary words while preserving the core meaning. Make it shorter. Output only the rewritten text, no preamble.",
};

const GRAMMAR_PROMPT =
  'You are an expert grammar and style editor. Analyse the text and:\n1. Fix ALL grammar, spelling, punctuation, and style errors\n2. Return the corrected text first\n3. Then list each change made as: • Original: "..." → Fixed: "..."\n4. If no errors found, say "No errors found — your text looks great!"\nFormat: corrected text first, then a blank line, then "--- Changes ---", then the list.';

function buildSummaryPrompt(
  length: z.infer<typeof SummaryLengthEnum>,
  style: z.infer<typeof SummaryStyleEnum>,
): string {
  const lengthMap: Record<z.infer<typeof SummaryLengthEnum>, string> = {
    short: "1-2 sentences",
    medium: "one concise paragraph",
    detailed: "3-4 paragraphs",
  };
  const styleMap: Record<z.infer<typeof SummaryStyleEnum>, string> = {
    paragraph: "Write as flowing prose paragraphs.",
    bullets: "Write as a bullet-point list of the main points, one point per line prefixed with •.",
    takeaways:
      "Write as a 'Key Takeaways' section with 3-7 numbered points. Start with the heading 'Key Takeaways:' on its own line, then the numbered list.",
  };
  return `Summarize the following text in ${lengthMap[length]}. ${styleMap[style]} Output only the summary, no preamble.`;
}

function buildPrompts(d: WritingAssistantInput): { system: string; user: string } {
  if (d.mode === "grammar") {
    return { system: GRAMMAR_PROMPT, user: d.text };
  }
  if (d.mode === "paraphrase") {
    const p = d.paraphraseMode ?? "standard";
    return { system: PARAPHRASE_PROMPTS[p], user: d.text };
  }
  const len = d.summaryLength ?? "medium";
  const style = d.summaryStyle ?? "paragraph";
  return { system: buildSummaryPrompt(len, style), user: d.text };
}

export const runWritingAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("GENERATION_FAILED");

    const { system, user } = buildPrompts(data);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) throw new Error("GENERATION_FAILED");

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = json.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error("GENERATION_FAILED");
    return { result };
  });
