import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ToneEnum = z.enum(["professional", "friendly", "enthusiastic", "formal"]);
const LengthEnum = z.enum(["short", "medium", "long"]);
const LanguageEnum = z.enum(["english", "spanish", "french", "german", "arabic"]);

const InputSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().min(1).max(160),
  companyName: z.string().trim().min(1).max(160),
  hiringManager: z.string().trim().max(120).optional().default(""),
  yearsExperience: z.number().min(0).max(60).optional(),
  skills: z.string().trim().max(800).optional().default(""),
  achievements: z.string().trim().max(1200).optional().default(""),
  tone: ToneEnum,
  length: LengthEnum,
  language: LanguageEnum,
  jobDescription: z.string().trim().max(4000).optional().default(""),
});

export type CoverLetterInput = z.infer<typeof InputSchema>;

const LENGTH_WORDS: Record<z.infer<typeof LengthEnum>, string> = {
  short: "about 150 words",
  medium: "about 250 words",
  long: "about 400 words",
};

const LANGUAGE_LABEL: Record<z.infer<typeof LanguageEnum>, string> = {
  english: "English",
  spanish: "Spanish",
  french: "French",
  german: "German",
  arabic: "Arabic",
};

function buildUserPrompt(d: CoverLetterInput): string {
  const lines: string[] = [
    `Write a complete, ready-to-send cover letter in ${LANGUAGE_LABEL[d.language]}.`,
    `Tone: ${d.tone}. Length: ${LENGTH_WORDS[d.length]}.`,
    `Applicant name: ${d.fullName}`,
    `Target role: ${d.jobTitle}`,
    `Company: ${d.companyName}`,
  ];
  if (d.hiringManager) lines.push(`Hiring manager: ${d.hiringManager}`);
  if (typeof d.yearsExperience === "number") lines.push(`Years of experience: ${d.yearsExperience}`);
  if (d.skills) lines.push(`Key skills: ${d.skills}`);
  if (d.achievements) lines.push(`Notable achievements: ${d.achievements}`);
  if (d.jobDescription) lines.push(`Job description / context:\n${d.jobDescription}`);
  lines.push(
    "Output only the letter body (greeting, 2-4 paragraphs, sign-off with the applicant's name). No preamble, no commentary, no markdown headings.",
  );
  return lines.join("\n");
}

export const generateCoverLetter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ letter: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("GENERATION_FAILED");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a professional career writer. Produce polished, personalised cover letters that sound human, specific, and confident. Never invent credentials the user did not supply.",
          },
          { role: "user", content: buildUserPrompt(data) },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) throw new Error("GENERATION_FAILED");

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const letter = json.choices?.[0]?.message?.content?.trim();
    if (!letter) throw new Error("GENERATION_FAILED");
    return { letter };
  });
