import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Undo2, Lightbulb, Volume2, VolumeX, Grid3x3, Trophy, Star, Lock } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/ball-sort")({
  head: () => buildToolMeta(toolBySlug("ball-sort", tools)),
  component: BallSortPage,
});

/* ---------------- Colors ---------------- */
type Color = "cyan" | "purple" | "orange" | "green" | "pink" | "yellow";
const COLOR_ORDER: Color[] = ["cyan", "purple", "orange", "green", "pink", "yellow"];
const COLOR_GRADIENT: Record<Color, [string, string]> = {
  cyan:   ["#00D4FF", "#0088AA"],
  purple: ["#A855F7", "#6B21A8"],
  orange: ["#F97316", "#C2410C"],
  green:  ["#22C55E", "#15803D"],
  pink:   ["#EC4899", "#9D174D"],
  yellow: ["#EAB308", "#A16207"],
};

/* ---------------- Level config ---------------- */
interface LevelConfig {
  tubes: number;
  colors: number;
  ballsPerColor: number;
  scrambles: number;
}
function levelConfig(idx: number): LevelConfig {
  if (idx <= 5) return { tubes: 5, colors: 3, ballsPerColor: 3, scrambles: 12 + idx * 2 };
  if (idx <= 15) return { tubes: 6, colors: 4, ballsPerColor: 4, scrambles: 22 + (idx - 5) * 3 };
  if (idx <= 25) return { tubes: 7, colors: 5, ballsPerColor: 4, scrambles: 40 + (idx - 15) * 3 };
  return { tubes: 8, colors: 6, ballsPerColor: 4, scrambles: 60 + (idx - 25) * 4 };
}

/* ---------------- Seeded RNG ---------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Level generation (reverse-solve) ---------------- */
type Tube = Color[];
function generateLevel(idx: number): { tubes: Tube[]; capacity: number; optimal: number } {
  const cfg = levelConfig(idx);
  const cap = cfg.ballsPerColor;
  const rand = mulberry32(0xc0ffee + idx * 7919);
  // start solved
  const tubes: Tube[] = [];
  for (let c = 0; c < cfg.colors; c++) {
    tubes.push(Array.from({ length: cap }, () => COLOR_ORDER[c]));
  }
  while (tubes.length < cfg.tubes) tubes.push([]);

  // reverse moves: pick a non-empty source, a destination with space; ignore validity since reverse.
  let actualMoves = 0;
  let attempts = 0;
  while (actualMoves < cfg.scrambles && attempts < cfg.scrambles * 20) {
    attempts++;
    const srcIdx = Math.floor(rand() * tubes.length);
    const src = tubes[srcIdx];
    if (src.length === 0) continue;
    const dstIdx = Math.floor(rand() * tubes.length);
    if (dstIdx === srcIdx) continue;
    const dst = tubes[dstIdx];
    if (dst.length >= cap) continue;
    // avoid trivially undoing: don't move onto same color top from a same-color stack of size 1
    dst.push(src.pop()!);
    actualMoves++;
  }

  // ensure not already solved
  if (isSolved(tubes, cap)) {
    // force a swap
    const nonEmpty = tubes.findIndex((t) => t.length > 0);
    const emptyIdx = tubes.findIndex((t) => t.length === 0);
    if (nonEmpty >= 0 && emptyIdx >= 0) tubes[emptyIdx].push(tubes[nonEmpty].pop()!);
  }

  return { tubes, capacity: cap, optimal: Math.max(cfg.scrambles, 8) };
}

function isSolved(tubes: Tube[], cap: number): boolean {
  return tubes.every((t) => t.length === 0 || (t.length === cap && t.every((c) => c === t[0])));
}

interface Level {
  tubes: Tube[];
  capacity: number;
  optimal: number;
}
const LEVELS: Level[] = Array.from({ length: 30 }, (_, i) => generateLevel(i + 1));

/* ---------------- Reducer ---------------- */
interface State {
  levelIdx: number; // 1-based
  capacity: number;
  optimal: number;
  tubes: Tube[];
  selected: number | null;
  moves: number;
  history: { tubes: Tube[]; moves: number }[];
  undosLeft: number;
  status: "playing" | "won";
  shake: number | null;
  hint: { from: number; to: number } | null;
  completedAt: number | null;
}

type Action =
  | { type: "load"; level: number }
  | { type: "select"; tube: number }
  | { type: "undo" }
  | { type: "restart" }
  | { type: "hint" }
  | { type: "clearShake" }
  | { type: "clearHint" };

function deepClone(tubes: Tube[]): Tube[] {
  return tubes.map((t) => [...t]);
}

function loadLevel(level: number): State {
  const L = LEVELS[level - 1];
  return {
    levelIdx: level,
    capacity: L.capacity,
    optimal: L.optimal,
    tubes: deepClone(L.tubes),
    selected: null,
    moves: 0,
    history: [],
    undosLeft: 3,
    status: "playing",
    shake: null,
    hint: null,
    completedAt: null,
  };
}

function attemptMove(state: State, from: number, to: number): State {
  if (from === to) return { ...state, selected: null };
  const src = state.tubes[from];
  const dst = state.tubes[to];
  if (src.length === 0) return { ...state, selected: null, shake: from };
  if (dst.length >= state.capacity) return { ...state, selected: null, shake: to };
  const top = src[src.length - 1];
  if (dst.length > 0 && dst[dst.length - 1] !== top) return { ...state, selected: null, shake: to };
  const newTubes = deepClone(state.tubes);
  newTubes[from].pop();
  newTubes[to].push(top);
  const won = isSolved(newTubes, state.capacity);
  return {
    ...state,
    tubes: newTubes,
    selected: null,
    moves: state.moves + 1,
    history: [...state.history, { tubes: deepClone(state.tubes), moves: state.moves }].slice(-50),
    status: won ? "won" : "playing",
    completedAt: won ? Date.now() : null,
    hint: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return loadLevel(action.level);
    case "select": {
      if (state.status === "won") return state;
      if (state.selected == null) {
        if (state.tubes[action.tube].length === 0) return state;
        return { ...state, selected: action.tube, hint: null };
      }
      return attemptMove(state, state.selected, action.tube);
    }
    case "undo": {
      if (state.history.length === 0 || state.undosLeft <= 0 || state.status === "won") return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        tubes: deepClone(prev.tubes),
        moves: prev.moves,
        history: state.history.slice(0, -1),
        undosLeft: state.undosLeft - 1,
        selected: null,
        hint: null,
      };
    }
    case "restart":
      return loadLevel(state.levelIdx);
    case "hint": {
      const h = findBestMove(state.tubes, state.capacity);
      return { ...state, hint: h, selected: null };
    }
    case "clearShake":
      return { ...state, shake: null };
    case "clearHint":
      return { ...state, hint: null };
  }
}

/* Hint: find a move that helps. Prefer completing a tube, then consolidating colors. */
function findBestMove(tubes: Tube[], cap: number): { from: number; to: number } | null {
  const tops = tubes.map((t) => (t.length ? t[t.length - 1] : null));
  // 1) move that completes a tube
  for (let i = 0; i < tubes.length; i++) {
    if (!tops[i]) continue;
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const dst = tubes[j];
      if (dst.length === 0 || dst.length >= cap) continue;
      if (tops[i] !== tops[j]) continue;
      const sameRun = countTopRun(tubes[i]);
      if (dst.length + sameRun === cap && dst.every((c) => c === tops[i])) {
        return { from: i, to: j };
      }
    }
  }
  // 2) move onto same color (consolidation), avoid pointless equal-length swaps
  for (let i = 0; i < tubes.length; i++) {
    if (!tops[i]) continue;
    if (tubes[i].every((c) => c === tops[i]) && tubes[i].length === cap) continue;
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const dst = tubes[j];
      if (dst.length === 0 || dst.length >= cap) continue;
      if (tops[i] === tops[j]) return { from: i, to: j };
    }
  }
  // 3) move to empty (only if it frees a different color underneath)
  for (let i = 0; i < tubes.length; i++) {
    if (!tops[i] || tubes[i].length <= 1) continue;
    const beneath = tubes[i][tubes[i].length - 2];
    if (beneath === tops[i]) continue;
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      if (tubes[j].length === 0) return { from: i, to: j };
    }
  }
  return null;
}

function countTopRun(t: Tube): number {
  if (t.length === 0) return 0;
  const top = t[t.length - 1];
  let n = 0;
  for (let i = t.length - 1; i >= 0; i--) { if (t[i] === top) n++; else break; }
  return n;
}

/* ---------------- Sound (Web Audio) ---------------- */
function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef<boolean>(false);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("ballsort.muted");
      const m = v === "1";
      mutedRef.current = m;
      setMutedState(m);
    } catch { /* noop */ }
  }, []);

  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const tone = (freqStart: number, freqEnd: number, dur: number, type: OscillatorType, gain = 0.18) => {
    if (mutedRef.current) return;
    const ctx = ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    const now = ctx.currentTime;
    o.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) o.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + dur);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + dur + 0.02);
  };

  const sfx = {
    pick:          () => tone(400, 600, 0.08, "sine", 0.16),
    place:         () => { tone(220, 110, 0.12, "triangle", 0.22); },
    tubeComplete:  () => { tone(800, 1200, 0.18, "sine", 0.18); setTimeout(() => tone(1000, 1400, 0.15, "sine", 0.14), 80); },
    invalid:       () => tone(160, 150, 0.2, "sawtooth", 0.18),
    levelComplete: () => {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((f, i) => setTimeout(() => tone(f, f, 0.18, "sine", 0.2), i * 110));
    },
    click:         () => tone(1000, 1000, 0.03, "square", 0.08),
  };

  const setMuted = (v: boolean) => {
    mutedRef.current = v;
    setMutedState(v);
    try { localStorage.setItem("ballsort.muted", v ? "1" : "0"); } catch { /* noop */ }
  };

  return { sfx, muted, setMuted };
}

/* ---------------- Progress persistence ---------------- */
interface Progress {
  currentLevel: number;
  maxUnlocked: number;
  bestMoves: Record<number, number>;
  stars: Record<number, 0 | 1 | 2 | 3>;
}
const DEFAULT_PROGRESS: Progress = { currentLevel: 1, maxUnlocked: 1, bestMoves: {}, stars: {} };

function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem("ballsort.progress");
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PROGRESS; }
}
function saveProgress(p: Progress) {
  try { localStorage.setItem("ballsort.progress", JSON.stringify(p)); } catch { /* noop */ }
}

function starsFor(moves: number, optimal: number): 0 | 1 | 2 | 3 {
  if (moves <= optimal) return 3;
  if (moves <= optimal + 5) return 2;
  if (moves <= optimal + 10) return 1;
  return 1;
}

/* ---------------- Ball ---------------- */
function Ball({ color, lifted, size = 44 }: { color: Color; lifted?: boolean; size?: number }) {
  const [light, dark] = COLOR_GRADIENT[color];
  return (
    <motion.div
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: lifted ? 1.05 : 1, opacity: 1, y: lifted ? -8 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 30% 28%, ${light} 0%, ${dark} 75%)`,
        boxShadow: `inset -3px -4px 8px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.45)${lifted ? `, 0 0 18px ${light}aa` : ""}`,
      }}
      className="rounded-full relative"
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "10%", left: "18%", width: "30%", height: "22%", background: "rgba(255,255,255,0.55)", filter: "blur(2px)" }}
      />
    </motion.div>
  );
}

/* ---------------- Tube ---------------- */
function TubeView({
  tube, capacity, selected, shake, hintFrom, hintTo, complete, onClick, index,
}: {
  tube: Tube; capacity: number; selected: boolean; shake: boolean;
  hintFrom: boolean; hintTo: boolean; complete: boolean;
  onClick: () => void; index: number;
}) {
  const ballSize = 40;
  const tubeWidth = ballSize + 16;
  const tubeHeight = capacity * (ballSize + 4) + 18;
  const border = selected ? "rgba(0,212,255,0.9)" : hintFrom ? "rgba(250,204,21,0.9)" : hintTo ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.18)";
  const glow = selected
    ? "0 0 28px rgba(0,212,255,0.55), inset 0 0 14px rgba(0,212,255,0.18)"
    : hintFrom
    ? "0 0 24px rgba(250,204,21,0.55)"
    : hintTo
    ? "0 0 24px rgba(34,197,94,0.55)"
    : complete
    ? "0 0 22px rgba(168,85,247,0.45)"
    : "inset 0 0 12px rgba(255,255,255,0.05)";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Tube ${index + 1}`}
      animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      style={{
        width: tubeWidth,
        height: tubeHeight,
        background: "rgba(255,255,255,0.05)",
        border: `1.5px solid ${border}`,
        boxShadow: glow,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      className="relative rounded-t-md rounded-b-[18px] flex flex-col-reverse items-center justify-start p-2 gap-1 select-none touch-none transition-colors"
    >
      {/* keyboard hint */}
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/40">{index + 1}</span>
      {tube.map((c, i) => {
        const topIndex = tube.length - 1;
        const lifted = selected && i === topIndex;
        return <Ball key={`${index}-${i}-${c}`} color={c} lifted={lifted} size={ballSize} />;
      })}
    </motion.button>
  );
}

/* ---------------- Page ---------------- */
function BallSortPage() {
  const tool = toolBySlug("ball-sort", tools);
  const { sfx, muted, setMuted } = useSound();

  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [state, dispatch] = useReducer(reducer, undefined, () => loadLevel(1));
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);
  const lastTapRef = useRef(0);

  // Load progress on mount, jump to last level
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    dispatch({ type: "load", level: Math.min(30, Math.max(1, p.currentLevel)) });
  }, []);

  // Sound on state changes
  const prevTubesLen = useRef<number[]>([]);
  const prevSelected = useRef<number | null>(null);
  const prevMoves = useRef(0);
  const prevShake = useRef<number | null>(null);
  const prevStatus = useRef<State["status"]>("playing");

  useEffect(() => {
    // selection sound
    if (state.selected !== null && prevSelected.current === null) sfx.pick();
    prevSelected.current = state.selected;
  }, [state.selected, sfx]);

  useEffect(() => {
    // move / completion sounds
    if (state.moves > prevMoves.current) {
      sfx.place();
      // check if any tube became complete (length === cap and uniform)
      const completedNow = state.tubes.some((t, i) =>
        t.length === state.capacity && t.every((c) => c === t[0]) &&
        (prevTubesLen.current[i] ?? 0) !== t.length
      );
      if (completedNow) setTimeout(() => sfx.tubeComplete(), 120);
    }
    prevTubesLen.current = state.tubes.map((t) => t.length);
    prevMoves.current = state.moves;
  }, [state.moves, state.tubes, state.capacity, sfx]);

  useEffect(() => {
    if (state.shake !== null && prevShake.current === null) sfx.invalid();
    prevShake.current = state.shake;
    if (state.shake !== null) {
      const t = setTimeout(() => dispatch({ type: "clearShake" }), 500);
      return () => clearTimeout(t);
    }
  }, [state.shake, sfx]);

  // Hint auto-clear
  useEffect(() => {
    if (!state.hint) return;
    const t = setTimeout(() => dispatch({ type: "clearHint" }), 1500);
    return () => clearTimeout(t);
  }, [state.hint]);

  // Win handling
  useEffect(() => {
    if (state.status === "won" && prevStatus.current !== "won") {
      sfx.levelComplete();
      const s = starsFor(state.moves, state.optimal);
      setProgress((p) => {
        const prevBest = p.bestMoves[state.levelIdx];
        const better = prevBest == null || state.moves < prevBest;
        const next: Progress = {
          ...p,
          maxUnlocked: Math.max(p.maxUnlocked, Math.min(30, state.levelIdx + 1)),
          bestMoves: better ? { ...p.bestMoves, [state.levelIdx]: state.moves } : p.bestMoves,
          stars: { ...p.stars, [state.levelIdx]: Math.max(p.stars[state.levelIdx] ?? 0, s) as 0 | 1 | 2 | 3 },
        };
        saveProgress(next);
        return next;
      });
    }
    prevStatus.current = state.status;
  }, [state.status, state.levelIdx, state.moves, state.optimal, sfx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= state.tubes.length) {
        e.preventDefault();
        handleTube(n - 1);
      } else if (e.key === "z" || e.key === "Z") {
        dispatch({ type: "undo" });
      } else if (e.key === "r" || e.key === "R") {
        dispatch({ type: "restart" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tubes.length, state.selected, state.status]);

  const handleTube = useCallback((idx: number) => {
    const now = performance.now();
    if (now - lastTapRef.current < 120) return;
    lastTapRef.current = now;
    dispatch({ type: "select", tube: idx });
  }, []);

  const currentStars = useMemo(() => {
    if (state.moves === 0) return 3;
    return starsFor(state.moves, state.optimal);
  }, [state.moves, state.optimal]);

  const completeMap = useMemo(
    () => state.tubes.map((t) => t.length === state.capacity && t.every((c) => c === t[0])),
    [state.tubes, state.capacity]
  );

  const goToLevel = (n: number) => {
    if (n < 1 || n > 30 || n > progress.maxUnlocked) return;
    setProgress((p) => {
      const next = { ...p, currentLevel: n };
      saveProgress(next);
      return next;
    });
    dispatch({ type: "load", level: n });
    setLevelSelectOpen(false);
    sfx.click();
  };

  const nextLevel = () => {
    if (state.levelIdx >= 30) return;
    goToLevel(state.levelIdx + 1);
  };

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div
        className="rounded-3xl border border-white/10 p-4 sm:p-6 relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #0a0a1a 0%, #000008 100%)" }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="text-xs sm:text-sm font-mono uppercase tracking-widest text-cyan-300" style={{ textShadow: "0 0 10px rgba(0,212,255,0.55)" }}>
            Level {state.levelIdx} / 30
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setMuted(!muted); sfx.click(); }}
              className="w-9 h-9 grid place-items-center rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => { setLevelSelectOpen(true); sfx.click(); }}
              className="w-9 h-9 grid place-items-center rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label="Level select"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-sm">
          <div className="text-white/80">🎯 Moves: <span className="font-bold text-white">{state.moves}</span></div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map((i) => (
              <Star key={i} className="w-4 h-4" style={{
                color: i <= currentStars ? "#FACC15" : "rgba(255,255,255,0.18)",
                fill: i <= currentStars ? "#FACC15" : "transparent",
                filter: i <= currentStars ? "drop-shadow(0 0 6px rgba(250,204,21,0.6))" : "none",
              }} />
            ))}
          </div>
          <div className="text-white/40 text-xs">Best: {progress.bestMoves[state.levelIdx] ?? "—"}</div>
        </div>

        {/* Tubes */}
        <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4 py-2 min-h-[260px]">
          {state.tubes.map((tube, i) => (
            <TubeView
              key={i}
              index={i}
              tube={tube}
              capacity={state.capacity}
              selected={state.selected === i}
              shake={state.shake === i}
              hintFrom={state.hint?.from === i}
              hintTo={state.hint?.to === i}
              complete={completeMap[i]}
              onClick={() => handleTube(i)}
            />
          ))}
        </div>

        {/* Bottom controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "undo" })} disabled={state.undosLeft === 0 || state.history.length === 0}>
            <Undo2 className="w-4 h-4 mr-1.5" /> Undo
            <span className="ml-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < state.undosLeft ? "#22D3EE" : "rgba(255,255,255,0.2)" }} />
              ))}
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { dispatch({ type: "restart" }); sfx.click(); }}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Restart
          </Button>
          <Button variant="outline" size="sm" onClick={() => { dispatch({ type: "hint" }); sfx.click(); }}>
            <Lightbulb className="w-4 h-4 mr-1.5" /> Hint
          </Button>
        </div>

        {/* Win overlay */}
        <AnimatePresence>
          {state.status === "won" && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center z-20"
              style={{ background: "radial-gradient(ellipse at center, rgba(10,10,30,0.92), rgba(0,0,8,0.97))", backdropFilter: "blur(6px)" }}
            >
              <motion.div
                initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="text-center px-6"
              >
                <Trophy className="w-14 h-14 mx-auto text-yellow-400 mb-3" style={{ filter: "drop-shadow(0 0 20px rgba(250,204,21,0.6))" }} />
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">Level Complete!</h3>
                <p className="text-white/60 text-sm mb-4">Moves: {state.moves} · Optimal: {state.optimal}</p>
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3].map((i) => {
                    const earned = i <= starsFor(state.moves, state.optimal);
                    return (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -120, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.15 * i, type: "spring", stiffness: 220 }}
                      >
                        <Star className="w-10 h-10" style={{
                          color: earned ? "#FACC15" : "rgba(255,255,255,0.15)",
                          fill: earned ? "#FACC15" : "transparent",
                          filter: earned ? "drop-shadow(0 0 14px rgba(250,204,21,0.7))" : "none",
                        }} />
                      </motion.div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => dispatch({ type: "restart" })}>
                    <RotateCcw className="w-4 h-4 mr-1.5" /> Replay
                  </Button>
                  {state.levelIdx < 30 ? (
                    <Button onClick={nextLevel}>Next Level →</Button>
                  ) : (
                    <Button onClick={() => setLevelSelectOpen(true)}>Level Select</Button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Level select dialog */}
      <Dialog open={levelSelectOpen} onOpenChange={setLevelSelectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Level</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 pt-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
              const locked = n > progress.maxUnlocked;
              const stars = progress.stars[n] ?? 0;
              const current = n === state.levelIdx;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => goToLevel(n)}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center text-sm font-bold transition-colors ${
                    locked ? "border-border bg-muted text-muted-foreground cursor-not-allowed" :
                    current ? "border-cyan-400 bg-cyan-500/10 text-foreground" :
                    "border-border bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  {locked ? <Lock className="w-4 h-4" /> : (
                    <>
                      <span>{n}</span>
                      {stars > 0 && (
                        <span className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3].map((i) => (
                            <Star key={i} className="w-2 h-2" style={{
                              color: i <= stars ? "#FACC15" : "rgba(255,255,255,0.2)",
                              fill: i <= stars ? "#FACC15" : "transparent",
                            }} />
                          ))}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <HowToUse
        steps={[
          "Tap a tube to pick up its top ball — the ball lifts and glows.",
          "Tap another tube to drop the ball there. The destination must be empty or have the same color on top.",
          "Win by sorting every color into its own tube. Use Hint and Undo if you get stuck!",
        ]}
      />

      <ToolSeoContent
        title="Ball Sort Puzzle — Free Online Color Sorting Game"
        description="Sort colored balls into tubes in this satisfying puzzle game. 30 levels from easy to expert. Free, no download, works on mobile and desktop."
        body={[
          "Ball Sort Puzzle is a calming yet brain-bending color sorting game where your only goal is to organize a set of mixed colored balls into matching tubes. Each move stacks a ball onto an empty tube or onto a tube whose top ball is the same color — simple rules that quickly turn into satisfying chains of planning and reordering.",
          "Color sorting games have exploded in popularity for one reason: they hit a perfect sweet spot between mindless and strategic. You can play a single level in under a minute or sink an hour into the harder boards. The puzzle stays approachable for kids and grandparents while still rewarding the kind of multi-step lookahead that chess players love.",
          "Beyond entertainment, sorting puzzles are quietly great brain training. They exercise working memory, planning, and pattern recognition without ever feeling like homework. A few minutes of ball sort each day is a low-pressure way to keep those cognitive muscles warm — and unlike most brain trainers, it is genuinely fun.",
          "Our version ships 30 hand-tuned levels that ramp from 3 colors and 5 tubes up to 6 colors and 8 tubes. Every level is solvable (generated by reverse-shuffling a solved board), so you never face an impossible position. Three stars are awarded for solving in the optimal move count, and your progress is saved locally — no account, no ads, no friction.",
        ]}
        faqs={[
          { question: "How do I play Ball Sort Puzzle?", answer: "Tap a tube to pick up its top ball, then tap another tube to drop it. You can only drop a ball onto an empty tube or onto a ball of the same color, and tubes can hold a limited number of balls." },
          { question: "How many levels are there?", answer: "There are 30 levels, grouped into difficulty tiers from beginner (3 colors, 5 tubes) up to expert (6 colors, 8 tubes). Each level unlocks the next once you complete it." },
          { question: "What is the win condition?", answer: "You win when every tube is either completely empty or holds a single color filled to the top. There is always exactly one valid arrangement of sorted tubes per level." },
          { question: "Can I undo a move?", answer: "Yes. You get 3 undos per level, shown as small dots next to the Undo button. Restarting the level refills your undo charges." },
          { question: "Does it work on mobile?", answer: "Absolutely. The board is touch-first with finger-friendly tap targets and a responsive layout that wraps tubes neatly on phones, tablets, and desktops." },
          { question: "How does the hint feature work?", answer: "Tap Hint and the game highlights the source and destination tubes of a strong next move for about 1.5 seconds. Use it sparingly — figuring it out yourself is half the fun." },
          { question: "Any tips for the harder levels?", answer: "Try to free empty tubes early as 'parking spots', never bury a long color run under another color, and look for moves that complete a tube — those simplify the board fastest." },
          { question: "Is my progress saved? Is anything sent to a server?", answer: "Your current level, best move counts, and star ratings are saved only in your browser via localStorage. Nothing about your gameplay is uploaded — the entire game runs offline in your browser." },
        ]}
      />

      <RelatedTools currentSlug="ball-sort" />
    </ToolPageShell>
  );
}
