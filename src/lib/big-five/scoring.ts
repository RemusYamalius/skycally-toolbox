import { ITEMS, type Trait } from "./items";

export type Response = 1 | 2 | 3 | 4 | 5;
export type Responses = Record<number, Response>;

export type Band = "Very Low" | "Low" | "Moderate" | "High" | "Very High";

export interface TraitResult {
  trait: Trait;
  raw1to5: number;   // average of scored (reverse-corrected) items, 1..5
  score0to100: number; // rescaled for display, 0..100
  band: Band;
}

export type Scores = Record<Trait, TraitResult>;

export function scoreResponses(responses: Responses): Scores {
  const totals: Record<Trait, { sum: number; count: number }> = {
    O: { sum: 0, count: 0 },
    C: { sum: 0, count: 0 },
    E: { sum: 0, count: 0 },
    A: { sum: 0, count: 0 },
    N: { sum: 0, count: 0 },
  };

  for (const item of ITEMS) {
    const r = responses[item.id];
    if (!r) continue;
    const scored = item.keyed === "+" ? r : 6 - r;
    totals[item.trait].sum += scored;
    totals[item.trait].count += 1;
  }

  const out = {} as Scores;
  (Object.keys(totals) as Trait[]).forEach((t) => {
    const raw = totals[t].count ? totals[t].sum / totals[t].count : 3;
    const score = Math.round(((raw - 1) / 4) * 100);
    out[t] = { trait: t, raw1to5: raw, score0to100: score, band: bandFor(score) };
  });
  return out;
}

export function bandFor(score0to100: number): Band {
  if (score0to100 < 20) return "Very Low";
  if (score0to100 < 40) return "Low";
  if (score0to100 < 60) return "Moderate";
  if (score0to100 < 80) return "High";
  return "Very High";
}

export const TRAIT_META: Record<
  Trait,
  { name: string; short: string; blurb: string; color: string }
> = {
  O: {
    name: "Openness to Experience",
    short: "Openness",
    blurb: "Curiosity, imagination, and interest in ideas and new experiences.",
    color: "#8b5cf6",
  },
  C: {
    name: "Conscientiousness",
    short: "Conscientiousness",
    blurb: "Organization, self-discipline, and follow-through on goals.",
    color: "#10b981",
  },
  E: {
    name: "Extraversion",
    short: "Extraversion",
    blurb: "Sociability, energy in company, and outward expressiveness.",
    color: "#f59e0b",
  },
  A: {
    name: "Agreeableness",
    short: "Agreeableness",
    blurb: "Warmth, cooperation, and consideration for others.",
    color: "#06b6d4",
  },
  N: {
    name: "Neuroticism",
    short: "Neuroticism",
    blurb: "Sensitivity to stress and tendency toward strong emotional reactions.",
    color: "#ec4899",
  },
};

// Non-pathologising descriptions for every trait × band.
export const BAND_DESCRIPTIONS: Record<Trait, Record<Band, string>> = {
  O: {
    "Very Low": "Strongly prefers the familiar, concrete, and practical over the abstract or novel.",
    "Low": "Down-to-earth and conventional; values routine and tried-and-true approaches.",
    "Moderate": "Balances curiosity with practicality — open to new ideas but grounded in reality.",
    "High": "Curious, imaginative, and drawn to art, ideas, and new experiences.",
    "Very High": "Deeply imaginative and intellectually adventurous; thrives on novelty and abstract thinking.",
  },
  C: {
    "Very Low": "Very spontaneous and flexible; may find schedules, deadlines, and detail work draining.",
    "Low": "Easy-going about structure; tends to work in bursts rather than a steady routine.",
    "Moderate": "Reasonably organised and reliable; can plan when needed but stays adaptable.",
    "High": "Organised, dependable, and goal-directed; follows through on commitments.",
    "Very High": "Highly disciplined and detail-focused; consistently plans, prepares, and executes.",
  },
  E: {
    "Very Low": "Strongly introverted; recharges alone and prefers deep one-on-one interaction over groups.",
    "Low": "Reserved and reflective; enjoys company in small doses.",
    "Moderate": "Comfortable in both social and solo settings — an ambivert.",
    "High": "Outgoing and energised by people; enjoys group activity and conversation.",
    "Very High": "Highly extraverted; thrives at the center of social activity and seeks out stimulation.",
  },
  A: {
    "Very Low": "Direct, skeptical, and competitive; prioritises honest disagreement over harmony.",
    "Low": "Straightforward and willing to push back; less concerned with pleasing others.",
    "Moderate": "Cooperative but able to hold your own; balances kindness with candor.",
    "High": "Warm, helpful, and considerate; values getting along and supporting others.",
    "Very High": "Deeply empathetic and cooperative; puts others' needs and group harmony first.",
  },
  N: {
    "Very Low": "Very calm and emotionally steady; rarely rattled by stress or setbacks.",
    "Low": "Generally relaxed; recovers quickly when things go wrong.",
    "Moderate": "Feels stress like most people do; usually settles back to baseline.",
    "High": "Emotionally sensitive; feels stress, worry, and mood shifts more intensely than average.",
    "Very High": "Highly reactive to stress; emotions run strong and can shift quickly.",
  },
};

export const TRAIT_ORDER: Trait[] = ["O", "C", "E", "A", "N"];
