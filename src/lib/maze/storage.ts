// localStorage helpers for the Maze Puzzle. SSR-guarded, namespaced keys so
// they never collide with other games' stats.

const STATS_KEY = "maze-stats";
const PREFS_KEY = "maze-prefs";

export type MazeStats = {
  completed: number;
  totalMoves: number;
  /** best time in seconds, keyed by difficulty id */
  bestTimes: Record<string, number>;
};

export const DEFAULT_STATS: MazeStats = {
  completed: 0,
  totalMoves: 0,
  bestTimes: {},
};

export function loadStats(): MazeStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<MazeStats>;
    return { ...DEFAULT_STATS, ...parsed, bestTimes: { ...(parsed.bestTimes ?? {}) } };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(s: MazeStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export function recordCompletion(
  difficulty: string,
  seconds: number,
  moves: number,
  revealed: boolean,
): MazeStats {
  const prev = loadStats();
  const best = prev.bestTimes[difficulty];
  const next: MazeStats = {
    completed: prev.completed + 1,
    totalMoves: prev.totalMoves + moves,
    bestTimes: {
      ...prev.bestTimes,
      // A revealed solution doesn't earn a best time.
      ...(revealed || seconds <= 0
        ? {}
        : { [difficulty]: best === undefined ? seconds : Math.min(best, seconds) }),
    },
  };
  saveStats(next);
  return next;
}

export type MazePrefs = { muted: boolean; trail: boolean; fog: boolean };
export const DEFAULT_PREFS: MazePrefs = { muted: false, trail: true, fog: false };

export function loadPrefs(): MazePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: MazePrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

export function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
