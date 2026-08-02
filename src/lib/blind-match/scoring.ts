import { BLIND_MATCH_QUESTIONS, DIMENSION_INDICES, QUESTION_COUNT } from "./questions";

/** Per-question compatibility: identical = 1, max distance = 0. */
export function scoreQuestion(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 3;
}

/** Average compatibility (0-100) across a set of question indices. */
export function scoreDimension(answersA: number[], answersB: number[], indices: number[]): number {
  const scores = indices.map((i) => scoreQuestion(answersA[i], answersB[i]));
  return Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100);
}

export interface MatchHighlight {
  question: string;
  score: number;
  answerA: string;
  answerB: string;
}

export interface MatchResult {
  values: number;
  communication: number;
  lifestyle: number;
  relationship: number;
  overall: number;
  biggestMatch: MatchHighlight;
  biggestDiff: MatchHighlight;
}

export interface Tier {
  min: number;
  label: string;
  blurb: string;
  color: string;
}

export const TIERS: Tier[] = [
  {
    min: 90,
    label: "Married at First Sight 💍",
    blurb: "The matchmakers approve.",
    color: "#34d399",
  },
  {
    min: 70,
    label: "Strong Foundation 🏗️",
    blurb: "A few things to navigate together.",
    color: "#4ade80",
  },
  {
    min: 50,
    label: "Opposites Attract? 🤔",
    blurb: "Could work. Could be beautifully chaotic.",
    color: "#facc15",
  },
  {
    min: 30,
    label: "Different Wavelengths 😅",
    blurb: "This is why we don't let algorithms date for us.",
    color: "#fb923c",
  },
  {
    min: 0,
    label: "Plot Twist Energy 🙈",
    blurb: "These 20 questions went in opposite directions — which mostly just makes for a fun conversation.",
    color: "#f87171",
  },
];

export function tierFor(overall: number): Tier {
  return TIERS.find((t) => overall >= t.min) ?? TIERS[TIERS.length - 1];
}

export function isValidAnswers(a: unknown): a is number[] {
  return (
    Array.isArray(a) &&
    a.length === QUESTION_COUNT &&
    a.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 3)
  );
}

export function computeMatch(answersA: number[], answersB: number[]): MatchResult {
  const values = scoreDimension(answersA, answersB, DIMENSION_INDICES.values);
  const communication = scoreDimension(answersA, answersB, DIMENSION_INDICES.communication);
  const lifestyle = scoreDimension(answersA, answersB, DIMENSION_INDICES.lifestyle);
  const relationship = scoreDimension(answersA, answersB, DIMENSION_INDICES.relationship);
  const overall = Math.round((values + communication + lifestyle + relationship) / 4);

  const per = BLIND_MATCH_QUESTIONS.map((q, i) => ({
    question: q.question,
    score: Math.round(scoreQuestion(answersA[i], answersB[i]) * 100),
    answerA: q.options[answersA[i]],
    answerB: q.options[answersB[i]],
  }));

  const sorted = [...per].sort((x, y) => y.score - x.score);
  const biggestMatch = sorted[0];
  const biggestDiff = sorted[sorted.length - 1];

  return { values, communication, lifestyle, relationship, overall, biggestMatch, biggestDiff };
}

/** URL-safe-ish base64 of the answer array. */
export function encodeAnswers(answers: number[]): string {
  return btoa(JSON.stringify(answers));
}

export function decodeAnswers(encoded: string): number[] | null {
  try {
    const parsed = JSON.parse(atob(encoded));
    return isValidAnswers(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
