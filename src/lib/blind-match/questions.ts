export type BlindMatchDimension = "values" | "communication" | "lifestyle" | "relationship";

export interface BlindMatchQuestion {
  id: number;
  dimension: BlindMatchDimension;
  question: string;
  options: [string, string, string, string];
}

export const DIMENSION_META: Record<
  BlindMatchDimension,
  { label: string; emoji: string; color: string }
> = {
  values: { label: "Values", emoji: "🧠", color: "#a78bfa" },
  communication: { label: "Communication", emoji: "💬", color: "#22d3ee" },
  lifestyle: { label: "Lifestyle", emoji: "🌙", color: "#facc15" },
  relationship: { label: "Relationship", emoji: "💘", color: "#fb7185" },
};

export const BLIND_MATCH_QUESTIONS: BlindMatchQuestion[] = [
  // ── VALUES 🧠 ────────────────────────────────────────────────
  {
    id: 1,
    dimension: "values",
    question: "When you have a free Sunday, you prefer...",
    options: [
      "Total solitude and recharging",
      "One or two close people",
      "A small group of friends",
      "The more the merrier",
    ],
  },
  {
    id: 2,
    dimension: "values",
    question: "Money is best spent on...",
    options: ["Experiences and travel", "Comfort and home", "Saving for the future", "Helping others"],
  },
  {
    id: 3,
    dimension: "values",
    question: "Your biggest non-negotiable in life is...",
    options: [
      "Freedom and independence",
      "Stability and security",
      "Growth and ambition",
      "Connection and love",
    ],
  },
  {
    id: 4,
    dimension: "values",
    question: "How punctual are you?",
    options: ["Always early", "On time, always", "A few minutes late usually", "Time is a concept"],
  },
  {
    id: 5,
    dimension: "values",
    question: "Conflict is best handled by...",
    options: [
      "Talking it out immediately",
      "Taking time to cool down first",
      "Writing it down",
      "Avoiding it if possible",
    ],
  },

  // ── COMMUNICATION 💬 ─────────────────────────────────────────
  {
    id: 6,
    dimension: "communication",
    question: "You text like...",
    options: ["Paragraphs with context", "Short and to the point", "Voice notes only", "I'll call you"],
  },
  {
    id: 7,
    dimension: "communication",
    question: "When someone upsets you, you...",
    options: [
      "Say it directly",
      "Drop hints and hope they notice",
      "Stay quiet until you explode",
      "Forgive and forget fast",
    ],
  },
  {
    id: 8,
    dimension: "communication",
    question: "Compliments make you feel...",
    options: ["Loved and seen", "Awkward but happy", "Suspicious", "Indifferent"],
  },
  {
    id: 9,
    dimension: "communication",
    question: "Your love language is closest to...",
    options: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service"],
  },
  {
    id: 10,
    dimension: "communication",
    question: "When you're upset, you need...",
    options: ["Someone to listen", "Space and silence", "To vent and move on", "Distraction and fun"],
  },

  // ── LIFESTYLE 🌙 ─────────────────────────────────────────────
  {
    id: 11,
    dimension: "lifestyle",
    question: "You are a...",
    options: [
      "Morning person (5-7am)",
      "Morning person (7-9am)",
      "Night owl (midnight+)",
      "Night owl (10pm-midnight)",
    ],
  },
  {
    id: 12,
    dimension: "lifestyle",
    question: "Your ideal home is...",
    options: ["Minimalist and calm", "Cozy and full of things", "Organized chaos", "Whatever feels right"],
  },
  {
    id: 13,
    dimension: "lifestyle",
    question: "Social media for you is...",
    options: ["Part of daily life", "Occasional check-in", "Barely use it", "What's that?"],
  },
  {
    id: 14,
    dimension: "lifestyle",
    question: "How important is physical fitness to you?",
    options: [
      "Core part of my identity",
      "I try to stay active",
      "I should do more",
      "Not really my thing",
    ],
  },
  {
    id: 15,
    dimension: "lifestyle",
    question: "Your relationship with food is...",
    options: [
      "I live to eat",
      "I eat to live",
      "Food is social for me",
      "I'm always trying something new",
    ],
  },

  // ── RELATIONSHIP 💘 ──────────────────────────────────────────
  {
    id: 16,
    dimension: "relationship",
    question: "Jealousy in a relationship is...",
    options: ["A sign of caring", "Natural but must be managed", "A red flag", "Depends on the context"],
  },
  {
    id: 17,
    dimension: "relationship",
    question: "How much alone time do you need?",
    options: ["Hours every day", "A few times a week", "Occasionally", "I prefer constant company"],
  },
  {
    id: 18,
    dimension: "relationship",
    question: "Your ideal relationship pace is...",
    options: [
      "Slow — let things grow naturally",
      "Medium — don't rush but don't stall",
      "Fast — when you know, you know",
      "Whatever feels right",
    ],
  },
  {
    id: 19,
    dimension: "relationship",
    question: "Deal-breakers for you include... (pick the most important)",
    options: ["Dishonesty", "Lack of ambition", "Poor communication", "Different life goals"],
  },
  {
    id: 20,
    dimension: "relationship",
    question: "You'd describe your relationship style as...",
    options: [
      "Secure and grounded",
      "Passionate and intense",
      "Independent but loving",
      "Still figuring it out",
    ],
  },
];

export const QUESTION_COUNT = BLIND_MATCH_QUESTIONS.length;

/** Zero-based indices of each dimension's questions. */
export const DIMENSION_INDICES: Record<BlindMatchDimension, number[]> = {
  values: BLIND_MATCH_QUESTIONS.map((q, i) => (q.dimension === "values" ? i : -1)).filter((i) => i >= 0),
  communication: BLIND_MATCH_QUESTIONS.map((q, i) => (q.dimension === "communication" ? i : -1)).filter(
    (i) => i >= 0,
  ),
  lifestyle: BLIND_MATCH_QUESTIONS.map((q, i) => (q.dimension === "lifestyle" ? i : -1)).filter((i) => i >= 0),
  relationship: BLIND_MATCH_QUESTIONS.map((q, i) => (q.dimension === "relationship" ? i : -1)).filter(
    (i) => i >= 0,
  ),
};
