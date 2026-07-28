// localStorage helpers for the Daily Crossword. Keys are namespaced so they
// never collide with Wordle or Word Groups stats.

const STATS_KEY = "crossword-stats";
const HISTORY_KEY = "crossword-history";
const RECENT_KEY = "crossword-recent";
const PROGRESS_KEY = "crossword-progress";

export type CrosswordStats = {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDay: number | null;
  bestTimeSeconds: number | null;
};

export const DEFAULT_STATS: CrosswordStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  bestTimeSeconds: null,
};

export function loadStats(): CrosswordStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(s: CrosswordStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

/**
 * Records a finished daily puzzle and updates the streak.
 * A streak continues when the previous recorded day is exactly one day earlier.
 */
export function recordDailyResult(
  day: number,
  solvedClean: boolean,
  seconds: number,
): CrosswordStats {
  const prev = loadStats();
  if (prev.lastPlayedDay === day) return prev;

  const continues = prev.lastPlayedDay === day - 1;
  const currentStreak = solvedClean ? (continues ? prev.currentStreak : 0) + 1 : 0;

  const next: CrosswordStats = {
    played: prev.played + 1,
    solved: prev.solved + (solvedClean ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(prev.bestStreak, currentStreak),
    lastPlayedDay: day,
    bestTimeSeconds:
      solvedClean && seconds > 0
        ? prev.bestTimeSeconds === null
          ? seconds
          : Math.min(prev.bestTimeSeconds, seconds)
        : prev.bestTimeSeconds,
  };
  saveStats(next);
  return next;
}

// Per-day archive badges.
export type CrosswordResult = "solved" | "revealed";
export type HistoryMap = Record<string, CrosswordResult>;

export function loadHistory(): HistoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryMap) : {};
  } catch {
    return {};
  }
}

export function markDayCompleted(day: number, result: CrosswordResult) {
  if (typeof window === "undefined") return;
  try {
    const h = loadHistory();
    h[String(day)] = result;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* noop */
  }
}

// Recently-seen practice puzzles (by puzzle id, most recent first).
export function loadRecent(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id: number) {
  if (typeof window === "undefined") return;
  try {
    const cur = loadRecent().filter((x) => x !== id);
    cur.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 10)));
  } catch {
    /* noop */
  }
}

// In-progress letters for the current daily puzzle, so a refresh doesn't
// wipe the board. Stored as a flat "row:col" -> letter map.
export type ProgressBlob = { day: number; letters: Record<string, string> };

export function loadProgress(day: number): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const blob = JSON.parse(raw) as ProgressBlob;
    return blob && blob.day === day && blob.letters ? blob.letters : {};
  } catch {
    return {};
  }
}

export function saveProgress(day: number, letters: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ day, letters } satisfies ProgressBlob),
    );
  } catch {
    /* noop */
  }
}
