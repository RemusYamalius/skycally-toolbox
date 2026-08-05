import { TOTAL_STATEMENTS } from "./statements";

/** Score = percentage of statements the user did NOT check. */
export function computeScore(checkedCount: number): number {
  return Math.round(((TOTAL_STATEMENTS - checkedCount) / TOTAL_STATEMENTS) * 100);
}

export interface Tier {
  min: number;
  label: string;
  emoji: string;
  blurb: string;
  gradient: string;
}

export const TIERS: Tier[] = [
  {
    min: 90,
    label: "Practically a Saint",
    emoji: "😇",
    blurb: "You've barely dipped a toe into any of this. Impressive — or possibly suspicious.",
    gradient: "linear-gradient(135deg,#38bdf8,#a78bfa)",
  },
  {
    min: 75,
    label: "Mostly Innocent",
    emoji: "🙂",
    blurb: "A few stories to tell, but nothing that would surprise your grandmother.",
    gradient: "linear-gradient(135deg,#22d3ee,#3b82f6)",
  },
  {
    min: 60,
    label: "Balanced Human",
    emoji: "😌",
    blurb: "A healthy mix of good decisions and questionable ones. Very relatable.",
    gradient: "linear-gradient(135deg,#34d399,#06b6d4)",
  },
  {
    min: 45,
    label: "Well-Lived",
    emoji: "😏",
    blurb: "You've clearly lived a little. Probably have a great story for most of these.",
    gradient: "linear-gradient(135deg,#a3e635,#22c55e)",
  },
  {
    min: 30,
    label: "No Regrets",
    emoji: "😅",
    blurb: "Most of this checklist reads like your highlight reel.",
    gradient: "linear-gradient(135deg,#fbbf24,#f97316)",
  },
  {
    min: 15,
    label: "Full Send",
    emoji: "🙈",
    blurb: "There aren't many boxes left unchecked. Respect.",
    gradient: "linear-gradient(135deg,#fb7185,#ec4899)",
  },
  {
    min: 0,
    label: "Living Legend",
    emoji: "🔥",
    blurb: "You've basically completed the checklist. Someone should write a book.",
    gradient: "linear-gradient(135deg,#ef4444,#b91c1c)",
  },
];

export function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

export function buildShareText(score: number): string {
  const tier = tierFor(score);
  return [
    "🕊️ PURITY TEST RESULTS",
    `⭐ Score: ${score}/100`,
    `${tier.emoji} ${tier.label}`,
    `"${tier.blurb}"`,
    "skycally.com/tools/purity-test",
  ].join("\n");
}
