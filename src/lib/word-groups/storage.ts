// localStorage helpers — mirrors the Wordle stats shape but uses distinct
// keys so the two games' stats never collide.

const STATS_KEY = "word-groups-stats";
const HISTORY_KEY = "word-groups-history";
const RECENT_KEY = "word-groups-recent";

export type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDay: number | null;
};

export const DEFAULT_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
};

export function loadStats(): Stats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(s: Stats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

// Records the daily result (win/lose) per day for archive badges.
export type HistoryMap = Record<string, "win" | "loss">;

export function loadHistory(): HistoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryMap) : {};
  } catch {
    return {};
  }
}

export function markDayCompleted(day: number, result: "win" | "loss") {
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
