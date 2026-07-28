import { CROSSWORD_PUZZLES, type CrosswordPuzzle } from "./puzzles";

// Same rollover convention as Wordle and Word Groups: whole-day index off epoch.
export function dayIndex(now: number = Date.now()): number {
  return Math.floor(now / 86400000);
}

// Launch day — the puzzle bank's day zero. The archive is only browsable back
// to this day. Frozen numeric literal: never replace with a dayIndex() call.
export const LAUNCH_DAY_INDEX = 20662;

export function puzzleForDay(day: number): CrosswordPuzzle {
  const bank = CROSSWORD_PUZZLES.length;
  // deterministic mod, safe for negative offsets too
  const idx = (((day - LAUNCH_DAY_INDEX) % bank) + bank) % bank;
  return CROSSWORD_PUZZLES[idx];
}

export function todaysPuzzle(): CrosswordPuzzle {
  return puzzleForDay(dayIndex());
}

// Practice: pick a puzzle not seen in the last N sessions and not today's.
export function pickPracticePuzzle(
  recent: number[],
  today: number = dayIndex(),
): CrosswordPuzzle {
  const todayId = puzzleForDay(today).id;
  const excluded = new Set<number>([todayId, ...recent]);
  const pool = CROSSWORD_PUZZLES.filter((p) => !excluded.has(p.id));
  const arr = pool.length
    ? pool
    : CROSSWORD_PUZZLES.filter((p) => p.id !== todayId);
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dateFromDayIndex(day: number): Date {
  return new Date(day * 86400000);
}

export function formatDateISO(day: number): string {
  return dateFromDayIndex(day).toISOString().slice(0, 10);
}

export function formatDateLong(day: number): string {
  return dateFromDayIndex(day).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(day: number): string {
  return dateFromDayIndex(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
