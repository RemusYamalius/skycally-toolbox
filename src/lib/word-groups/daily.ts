import { PUZZLES, type Puzzle } from "./puzzles";

// Same rollover convention as Wordle: whole-day index off epoch.
export function dayIndex(now: number = Date.now()): number {
  return Math.floor(now / 86400000);
}

// Launch day — the puzzle bank's day zero. Archive is only browsable back
// to this day. Set to today's day index at build time so the archive begins
// on the first day the tool ships.
export const LAUNCH_DAY_INDEX = 20651;

export function puzzleForDay(day: number): Puzzle {
  const bank = PUZZLES.length;
  // deterministic mod, safe for negative offsets too
  const idx = ((day - LAUNCH_DAY_INDEX) % bank + bank) % bank;
  return PUZZLES[idx];
}

export function todaysPuzzle(): Puzzle {
  return puzzleForDay(dayIndex());
}

// Practice: pick a puzzle not seen in the last N sessions and not today's.
export function pickPracticePuzzle(recent: number[], today: number = dayIndex()): Puzzle {
  const todayId = puzzleForDay(today).id;
  const excluded = new Set<number>([todayId, ...recent]);
  const pool = PUZZLES.filter((p) => !excluded.has(p.id));
  const arr = pool.length ? pool : PUZZLES.filter((p) => p.id !== todayId);
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dateFromDayIndex(day: number): Date {
  return new Date(day * 86400000);
}

export function formatDateISO(day: number): string {
  const d = dateFromDayIndex(day);
  return d.toISOString().slice(0, 10);
}
