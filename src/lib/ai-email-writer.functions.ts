import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailTypeEnum = z.enum([
  "cold-outreach",
  "follow-up",
  "apology",
  "sales-pitch",
  "job-application",
  "thank-you",
  "meeting-request",
  "complaint",
]);
const ToneEnum = z.enum([
  "professional",
  "friendly",
  "formal",
  "concise",
  "persuasive",
  "empathetic",
]);
const LengthEnum = z.enum(["short", "standard", "detailed"]);
const LanguageEnum = z.enum(["english", "french", "spanish", "arabic", "german"]);

const InputSchema = z.object({
  emailType: EmailTypeEnum,
  yourName: z.string().trim().min(1).max(120),
  yourRole: z.string().trim().max(160).optional().default(""),
  recipientName: z.string().trim().max(120).optional().default(""),
  recipientRole: z.string().trim().max(160).optional().default(""),
  keyPoints: z.string().trim().min(1).max(2000),
  context: z.string().trim().max(2000).optional().default(""),
  tone: ToneEnum,
  length: LengthEnum,
  language: LanguageEnum,
  includeSubject: z.boolean(),
});

export type EmailWriterInput = z.infer<typeof InputSchema>;

const TONE_LABEL: Record<z.infer<typeof ToneEnum>, string> = {
  professional: "professional",
  friendly: "friendly and warm",
  formal: "formal and authoritative",
  concise: "concise and direct",
  persuasive: "persuasive",
  empathetic: "empathetic",
};

const LENGTH_LABEL: Record<z.infer<typeof LengthEnum>, string> = {
  short: "short (3-4 sentences)",
  standard: "standard (2-3 paragraphs)",
  detailed: "detailed (4-5 paragraphs)",
};

const LANGUAGE_LABEL: Record<z.infer<typeof LanguageEnum>, string> = {
  english: "English",
  french: "French",
  spanish: "Spanish",
  arabic: "Arabic",
  german: "German",
};

function buildSystemPrompt(includeSubject: boolean): string {
  return `You are an expert email copywriter with 15 years of experience writing high-converting professional emails. You write emails that:
- Get opened, read, and replied to
- Sound natural and human — never robotic or templated
- Are tailored to the specific context and relationship
- Use the right tone for the situation
- Have a clear purpose and a specific call to action
- Avoid clichés like "I hope this email finds you well" or "Per my last email"
- Open with a hook that immediately communicates value or relevance
${includeSubject ? "Include a compelling subject line at the top, formatted as: Subject: [subject line]" : "Do NOT include a subject line."}
Output only the email content. No preamble, no commentary, no explanations.`;
}

function buildUserPrompt(d: EmailWriterInput): string {
  const lines: string[] = [
    `Write a ${LENGTH_LABEL[d.length]} ${d.emailType.replace("-", " ")} email in ${LANGUAGE_LABEL[d.language]} with a ${TONE_LABEL[d.tone]} tone.`,
    `From: ${d.yourName}${d.yourRole ? ` (${d.yourRole})` : ""}`,
  ];
  if (d.recipientName)
    lines.push(`To: ${d.recipientName}${d.recipientRole ? ` (${d.recipientRole})` : ""}`);
  lines.push(`Key points to cover: ${d.keyPoints}`);
  if (d.context) lines.push(`Additional context: ${d.context}`);
  lines.push("Write the email now.");
  return lines.join("\n");
}

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ email: string }> => {
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
          { role: "system", content: buildSystemPrompt(data.includeSubject) },
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
    const email = json.choices?.[0]?.message?.content?.trim();
    if (!email) throw new Error("GENERATION_FAILED");
    return { email };
  });
