import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlatformEnum = z.enum(["instagram", "tiktok", "twitter", "linkedin", "dating"]);
const ToneEnum = z.enum(["funny", "professional", "minimalist", "aesthetic", "bold"]);
const EmojiEnum = z.enum(["none", "light", "heavy"]);

const InputSchema = z.object({
  platform: PlatformEnum,
  name: z.string().trim().max(80).optional().default(""),
  role: z.string().trim().min(1).max(240),
  interests: z.string().trim().min(1).max(400),
  tone: ToneEnum,
  emojiDensity: EmojiEnum,
  variations: z.number().int().min(3).max(5),
});

export type BioInput = z.infer<typeof InputSchema>;

export const PLATFORM_LIMITS: Record<z.infer<typeof PlatformEnum>, number> = {
  instagram: 150,
  tiktok: 80,
  twitter: 160,
  linkedin: 2600,
  dating: 500,
};

const PLATFORM_STRUCTURE: Record<z.infer<typeof PlatformEnum>, string> = {
  instagram:
    "Instagram bio: 3-5 short lines separated by line breaks, each line typically led by a relevant emoji. Punchy, scannable.",
  tiktok:
    "TikTok bio: 2-3 very short punchy lines with line breaks. Playful and vibey.",
  twitter:
    "X (Twitter) bio: ONE single line, short phrases separated by ' · ' or ' | '. No line breaks.",
  linkedin:
    "LinkedIn About: a first-person paragraph (or two short paragraphs). Professional but human, not a tagline.",
  dating:
    "Dating app bio: conversational, warm, sounds like a real person. End with a light hook or playful question inviting a reply.",
};

const TONE_LABEL: Record<z.infer<typeof ToneEnum>, string> = {
  funny: "funny and witty",
  professional: "professional and polished",
  minimalist: "minimalist and clean — few words, high signal",
  aesthetic: "aesthetic and poetic",
  bold: "bold and confident",
};

const EMOJI_LABEL: Record<z.infer<typeof EmojiEnum>, string> = {
  none: "no emoji at all",
  light: "sparing emoji use (1-3 total)",
  heavy: "generous emoji use, but never gimmicky",
};

const DELIMITER = "===VAR===";

function buildPrompt(d: BioInput): string {
  const lines: string[] = [
    `Write exactly ${d.variations} distinct bio variations for a ${d.platform} profile.`,
    `Structural convention: ${PLATFORM_STRUCTURE[d.platform]}`,
    `Character limit: strictly under ${PLATFORM_LIMITS[d.platform]} UTF-16 code units per variation. Count emoji as 2 units.`,
    `Tone: ${TONE_LABEL[d.tone]}.`,
    `Emoji density: ${EMOJI_LABEL[d.emojiDensity]}.`,
  ];
  if (d.name) lines.push(`Person's name or handle: ${d.name}`);
  lines.push(`What they do / their role: ${d.role}`);
  lines.push(`Interests / keywords to weave in: ${d.interests}`);
  lines.push(
    `Use the specific role and interests above — do NOT produce generic filler that could apply to anyone.`,
    `Each variation must feel distinct in angle or vibe from the others.`,
    `Output the variations separated by a line containing only: ${DELIMITER}`,
    `Do NOT number them, do NOT add labels, do NOT add commentary, do NOT wrap in quotes or markdown. Output only the bios and the delimiters.`,
  );
  return lines.join("\n");
}

const SYSTEM_PROMPT =
  "You are an expert social media bio writer. You write short, specific, human-sounding bios tailored to each platform's culture and length conventions. You never sound templated. You use the user's actual details, not filler.";

export const generateBios = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ bios: string[] }> => {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(data) },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) throw new Error("GENERATION_FAILED");

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("GENERATION_FAILED");

    const parts = raw
      .split(/^\s*={3,}VAR={3,}\s*$/im)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      // strip leading "1." / "1)" / "- " / surrounding quotes if the model added them
      .map((s) =>
        s
          .replace(/^\s*(?:\d+[.)]\s*|[-*•]\s*)/, "")
          .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
          .trim(),
      )
      .filter((s) => s.length > 0);

    if (parts.length === 0) throw new Error("GENERATION_FAILED");
    return { bios: parts.slice(0, data.variations) };
  });
