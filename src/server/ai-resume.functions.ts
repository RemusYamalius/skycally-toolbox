import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ToneEnum = z.enum(["professional", "creative", "executive", "technical"]);
const LengthEnum = z.enum(["concise", "standard", "detailed"]);
const LanguageEnum = z.enum(["english", "french", "spanish", "german", "arabic"]);

const InputSchema = z.object({
  fullName:        z.string().trim().min(1).max(120),
  jobTitle:        z.string().trim().min(1).max(160),
  email:           z.string().trim().min(1).max(200),
  phone:           z.string().trim().max(50).optional().default(""),
  location:        z.string().trim().max(120).optional().default(""),
  linkedin:        z.string().trim().max(300).optional().default(""),
  website:         z.string().trim().max(300).optional().default(""),
  summary:         z.string().trim().max(1200).optional().default(""),
  yearsExperience: z.number().min(0).max(60).optional(),
  industry:        z.string().trim().max(120).optional().default(""),
  skills:          z.string().trim().min(1).max(800),
  experience:      z.string().trim().min(1).max(4000),
  education:       z.string().trim().max(800).optional().default(""),
  certifications:  z.string().trim().max(800).optional().default(""),
  languages:       z.string().trim().max(300).optional().default(""),
  jobDescription:  z.string().trim().max(4000).optional().default(""),
  tone:            ToneEnum,
  length:          LengthEnum,
  language:        LanguageEnum,
});

export type ResumeInput = z.infer<typeof InputSchema>;

const LENGTH_LABEL: Record<z.infer<typeof LengthEnum>, string> = {
  concise:  "concise one-page",
  standard: "standard one-to-two-page",
  detailed: "detailed two-page",
};

const LANGUAGE_LABEL: Record<z.infer<typeof LanguageEnum>, string> = {
  english: "English",
  french:  "French",
  spanish: "Spanish",
  german:  "German",
  arabic:  "Arabic",
};

const SYSTEM_PROMPT = `You are an expert resume writer and career coach with 15 years of experience helping candidates land jobs at top companies. You write resumes that:
- Pass ATS (Applicant Tracking Systems) by naturally incorporating keywords from the job description
- Open with a powerful professional summary that immediately communicates value
- Use strong action verbs (Led, Built, Increased, Reduced, Shipped, Managed, Designed, Implemented)
- Quantify achievements wherever possible (%, $, numbers, scale)
- Are tailored to the specific role and industry
- Follow a clean, scannable structure: Summary -> Experience -> Skills -> Education -> Certifications
- Sound human and specific, never generic or templated
- Never invent credentials, companies, or achievements not provided by the user
Output the resume as clean plain text with clear section headers (use === or --- separators), ready to copy or save. No markdown, no asterisks, no bullet symbols other than simple dashes.`;

function buildPrompt(d: ResumeInput): string {
  const lines: string[] = [
    `Write a ${LENGTH_LABEL[d.length]} resume in ${LANGUAGE_LABEL[d.language]} with a ${d.tone} tone.`,
    `Full name: ${d.fullName}`,
    `Target role: ${d.jobTitle}`,
    `Email: ${d.email}`,
  ];
  if (d.phone)           lines.push(`Phone: ${d.phone}`);
  if (d.location)        lines.push(`Location: ${d.location}`);
  if (d.linkedin)        lines.push(`LinkedIn: ${d.linkedin}`);
  if (d.website)         lines.push(`Website/Portfolio: ${d.website}`);
  if (typeof d.yearsExperience === "number")
                         lines.push(`Years of experience: ${d.yearsExperience}`);
  if (d.industry)        lines.push(`Industry/Field: ${d.industry}`);
  if (d.summary)         lines.push(`Professional summary (refine this): ${d.summary}`);
  lines.push(`Key skills: ${d.skills}`);
  lines.push(`Work experience:\n${d.experience}`);
  if (d.education)       lines.push(`Education: ${d.education}`);
  if (d.certifications)  lines.push(`Certifications: ${d.certifications}`);
  if (d.languages)       lines.push(`Languages: ${d.languages}`);
  if (d.jobDescription)  lines.push(`Target job description (optimize for ATS):\n${d.jobDescription}`);
  lines.push("Output only the resume content. No preamble, no commentary.");
  return lines.join("\n");
}

export const generateResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ resume: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("GENERATION_FAILED");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: buildPrompt(data) },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok)            throw new Error("GENERATION_FAILED");

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const resume = json.choices?.[0]?.message?.content?.trim();
    if (!resume) throw new Error("GENERATION_FAILED");

    return { resume };
  });
