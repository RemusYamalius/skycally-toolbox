import type { Difficulty } from "./puzzles";

const EMOJI: Record<Difficulty, string> = {
  yellow: "🟨",
  green: "🟩",
  blue: "🟦",
  purple: "🟪",
};

// Each row: 4 emojis representing the difficulty of the category each
// guessed word actually belongs to (or ⬛ for words that belonged to a
// still-unsolved category at time of guess — matches NYT's share format
// closely enough).
export type ShareRow = (Difficulty | null)[]; // length 4

export function buildShareText(opts: {
  dayLabel: string; // e.g. "Word Groups #12" or "Word Groups (Practice)"
  rows: ShareRow[];
  won: boolean;
  mistakes: number;
  url: string;
}): string {
  const grid = opts.rows
    .map((r) => r.map((d) => (d ? EMOJI[d] : "⬛")).join(""))
    .join("\n");
  const result = opts.won ? `Solved with ${4 - opts.mistakes} mistake${opts.mistakes === 1 ? "" : "s"} to spare` : `Missed it — ${opts.mistakes}/4 mistakes`;
  return `${opts.dayLabel}\n${result}\n\n${grid}\n\n${opts.url}`;
}
