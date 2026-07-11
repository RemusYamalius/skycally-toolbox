const KEY = "skycally.shooting-ball.v1";

export interface Progress {
  unlocked: number; // highest unlocked level id (1-based)
  stars: Record<number, 1 | 2 | 3>;
  sound: boolean;
}

const DEFAULT: Progress = { unlocked: 1, stars: {}, sound: true };

export function loadProgress(): Progress {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { ...DEFAULT, ...parsed, stars: { ...(parsed.stars ?? {}) } };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function recordResult(p: Progress, levelId: number, stars: 1 | 2 | 3): Progress {
  const prev = p.stars[levelId] ?? 0;
  const next: Progress = {
    ...p,
    stars: { ...p.stars, [levelId]: stars > prev ? stars : (prev as 1 | 2 | 3) },
    unlocked: Math.max(p.unlocked, levelId + 1),
  };
  saveProgress(next);
  return next;
}
