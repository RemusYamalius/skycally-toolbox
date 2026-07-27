import { ITEMS, type Dimension } from "./items";

export type Response = 1 | 2 | 3 | 4 | 5;
export type Responses = Record<number, Response>;

export type StyleKey = "secure" | "anxious" | "avoidant" | "fearful";

export interface DimensionResult {
  /** Mean of the 14 keyed responses, 1–5. */
  mean: number;
  /** Mean rescaled to 0–100 for readability. */
  score0to100: number;
  band: "Low" | "Moderate" | "High";
}

export interface Scores {
  anxiety: DimensionResult;
  avoidance: DimensionResult;
  style: StyleKey;
}

function band(score: number): DimensionResult["band"] {
  if (score < 40) return "Low";
  if (score <= 60) return "Moderate";
  return "High";
}

function scoreDimension(responses: Responses, dimension: Dimension): DimensionResult {
  const items = ITEMS.filter((i) => i.dimension === dimension);
  let sum = 0;
  let n = 0;
  for (const item of items) {
    const raw = responses[item.id];
    if (!raw) continue;
    sum += item.keyed === "-" ? 6 - raw : raw;
    n++;
  }
  const mean = n ? sum / n : 3;
  // 1 → 0, 5 → 100
  const score0to100 = Math.round(((mean - 1) / 4) * 100);
  return { mean, score0to100, band: band(score0to100) };
}

/** Midpoint of the 0–100 scale — the quadrant split for both dimensions. */
export const MIDPOINT = 50;

export function classify(anxiety: number, avoidance: number): StyleKey {
  const highAnx = anxiety > MIDPOINT;
  const highAvo = avoidance > MIDPOINT;
  if (!highAnx && !highAvo) return "secure";
  if (highAnx && !highAvo) return "anxious";
  if (!highAnx && highAvo) return "avoidant";
  return "fearful";
}

export function scoreResponses(responses: Responses): Scores {
  const anxiety = scoreDimension(responses, "anxiety");
  const avoidance = scoreDimension(responses, "avoidance");
  return {
    anxiety,
    avoidance,
    style: classify(anxiety.score0to100, avoidance.score0to100),
  };
}

export const STYLE_META: Record<
  StyleKey,
  { name: string; short: string; color: string; tagline: string; description: string; strengths: string[]; growth: string[] }
> = {
  secure: {
    name: "Secure",
    short: "Low anxiety · Low avoidance",
    color: "var(--green-brand)",
    tagline: "Comfortable with closeness, comfortable with space.",
    description:
      "You tend to trust that the people close to you still care even when they're busy or distant, and you can be emotionally open without feeling exposed. Closeness doesn't feel suffocating and distance doesn't feel like abandonment, so conflict is something to work through rather than a threat to survive.",
    strengths: [
      "You can ask for support directly instead of hinting or withdrawing.",
      "Time apart doesn't read as rejection to you.",
      "You tend to repair after conflict rather than escalate or shut down.",
    ],
    growth: [
      "Secure isn't the same as always calm — notice which specific relationships pull you off centre.",
      "Watch for over-functioning: being the steady one for everyone can quietly cost you.",
    ],
  },
  anxious: {
    name: "Anxious (Preoccupied)",
    short: "High anxiety · Low avoidance",
    color: "var(--amber-brand, #f59e0b)",
    tagline: "You want closeness, and you fear losing it.",
    description:
      "You value connection highly and are comfortable being close — but you scan for signs that it's slipping away. Delays, tone shifts, and time apart can feel much bigger than they are, which can push you toward seeking reassurance in ways that feel exhausting to you afterwards.",
    strengths: [
      "You're attentive, emotionally available, and genuinely invested.",
      "You notice shifts in a relationship early, often before the other person does.",
      "You're willing to talk about the relationship rather than avoid it.",
    ],
    growth: [
      "Try naming the fear out loud (\"I'm feeling anxious about us\") instead of testing for reassurance indirectly.",
      "Build a delay between the anxious feeling and the message you send.",
      "Notice how often the feared outcome actually happens — the prediction is usually louder than the evidence.",
    ],
  },
  avoidant: {
    name: "Avoidant (Dismissing)",
    short: "Low anxiety · High avoidance",
    color: "var(--cyan-brand)",
    tagline: "Self-reliant, and wary of leaning on people.",
    description:
      "You're not especially worried about being left — but depending on someone, or being depended on, tends to feel uncomfortable. Under stress your instinct is to handle it alone and create some distance, which can read to others as coldness even when you care a great deal.",
    strengths: [
      "You're independent and steady under pressure.",
      "You don't need constant reassurance to feel secure.",
      "You give other people room without feeling threatened by it.",
    ],
    growth: [
      "Practise saying a small true thing about how you feel before you're forced to.",
      "When you feel the urge to withdraw, try saying \"I need an hour\" instead of just going quiet.",
      "Letting someone help with something small is a low-risk way to build the muscle.",
    ],
  },
  fearful: {
    name: "Fearful-Avoidant (Disorganised)",
    short: "High anxiety · High avoidance",
    color: "var(--pink-brand, #ec4899)",
    tagline: "Wanting closeness and pulling away from it at the same time.",
    description:
      "You score high on both dimensions, which usually feels like a push-pull: you want connection badly, and closeness also feels unsafe. That can look like intensity followed by sudden distance, and it's often confusing for you as much as for the other person.",
    strengths: [
      "You're highly attuned to emotional undercurrents in a relationship.",
      "You're capable of deep connection when you feel safe.",
      "You already know something is happening — that awareness is the starting point.",
    ],
    growth: [
      "Slow, predictable relationships are more useful to you than intense ones.",
      "Try to name the pull-away out loud as it happens rather than acting on it silently.",
      "This pattern is the one most commonly connected to earlier relational hurt — talking it through with a therapist tends to help more than self-help alone.",
    ],
  },
};

export const STYLE_ORDER: StyleKey[] = ["secure", "anxious", "avoidant", "fearful"];

export function buildShareText(scores: Scores, url: string): string {
  const meta = STYLE_META[scores.style];
  return [
    `Attachment Style — Skycally`,
    `Result: ${meta.name}`,
    `Anxiety ${scores.anxiety.score0to100}/100 · Avoidance ${scores.avoidance.score0to100}/100`,
    ``,
    meta.tagline,
    ``,
    url,
  ].join("\n");
}
