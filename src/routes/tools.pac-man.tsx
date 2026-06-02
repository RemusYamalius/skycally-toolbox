import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/pac-man";
const TITLE = "Pac-Man — Free Online Game, No Download";
const DESCRIPTION =
  "Play Pac-Man free in your browser. Eat all the dots and avoid the ghosts! No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/pac-man")({
  head: () => {
    const base = buildPageMeta({ title: TITLE, description: DESCRIPTION, path: PATH });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Game",
            name: "Pac-Man",
            description:
              "Free browser-based Pac-Man game. Eat all the dots and avoid the ghosts. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: PacManPage,
});

// ---------- Maze ----------
// # wall, . dot, o power pellet, = ghost door, space empty, P pacman start, G ghost start
const RAW_MAZE = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "####.#.......#.####",
  "####.#.##=##.#.####",
  "####.#.GGGG#.#.####",
  "####.#.#####.#.####",
  "####.#.......#.####",
  "####.###.#.###.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o.#....P....#...o#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################",
];

const COLS = RAW_MAZE[0].length; // 19
const ROWS = RAW_MAZE.length;    // 21
const CELL = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

type CellType = "wall" | "dot" | "pellet" | "empty" | "door";

interface ParsedMaze {
  grid: CellType[][];
  initialDots: CellType[][];
  pacStart: { x: number; y: number };
  ghostStarts: { x: number; y: number }[];
  totalPellets: number;
}

function parseMaze(): ParsedMaze {
  const grid: CellType[][] = [];
  const initialDots: CellType[][] = [];
  let pacStart = { x: 9, y: 15 };
  const ghostStarts: { x: number; y: number }[] = [];
  let totalPellets = 0;
  for (let r = 0; r < ROWS; r++) {
    const row: CellType[] = [];
    const drow: CellType[] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = RAW_MAZE[r][c];
      let t: CellType;
      if (ch === "#") t = "wall";
      else if (ch === ".") { t = "dot"; totalPellets++; }
      else if (ch === "o") { t = "pellet"; totalPellets++; }
      else if (ch === "=") t = "door";
      else if (ch === "P") { t = "empty"; pacStart = { x: c, y: r }; }
      else if (ch === "G") { t = "empty"; ghostStarts.push({ x: c, y: r }); }
      else t = "empty";
      row.push(t);
      drow.push(t);
    }
    grid.push(row);
    initialDots.push(drow);
  }
  return { grid, initialDots, pacStart, ghostStarts, totalPellets };
}

type Dir = "up" | "down" | "left" | "right" | "none";
const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left", none: "none" };

type Difficulty = "easy" | "medium" | "hard";
const DIFF: Record<Difficulty, { ghostSpeed: number; label: string }> = {
  easy: { ghostSpeed: 1.1, label: "Easy" },
  medium: { ghostSpeed: 1.45, label: "Medium" },
  hard: { ghostSpeed: 1.8, label: "Hard" },
};
const PAC_SPEED_BASE = 1.7;

const GHOST_COLORS = ["#ef4444", "#f9a8d4", "#67e8f9", "#fb923c"]; // Blinky, Pinky, Inky, Clyde
const GHOST_NAMES: ("blinky" | "pinky" | "inky" | "clyde")[] = ["blinky", "pinky", "inky", "clyde"];

interface Entity {
  x: number; // pixel center
  y: number;
  dir: Dir;
  nextDir: Dir;
  speed: number;
}

interface Ghost extends Entity {
  kind: typeof GHOST_NAMES[number];
  color: string;
  frightened: boolean;
  eaten: boolean; // returning to pen
  home: { x: number; y: number };
}

function tileAt(px: number, py: number) {
  return { tx: Math.floor(px / CELL), ty: Math.floor(py / CELL) };
}
function tileCenter(tx: number, ty: number) {
  return { x: tx * CELL + CELL / 2, y: ty * CELL + CELL / 2 };
}

function PacManPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const mazeRef = useRef<ParsedMaze | null>(null);
  const gridRef = useRef<CellType[][]>([]);
  const remainingRef = useRef(0);

  const pacRef = useRef<Entity>({ x: 0, y: 0, dir: "none", nextDir: "none", speed: PAC_SPEED_BASE });
  const ghostsRef = useRef<Ghost[]>([]);
  const frightenedTimerRef = useRef(0);
  const ghostEatStreakRef = useRef(0);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const runningRef = useRef(false);
  const overRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const mouthRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = parseInt(localStorage.getItem("pac-man-best") || "0", 10);
      if (!isNaN(v)) setBest(v);
    } catch { /* noop */ }
  }, []);

  const saveBest = useCallback((s: number) => {
    try {
      const cur = parseInt(localStorage.getItem("pac-man-best") || "0", 10) || 0;
      if (s > cur) {
        localStorage.setItem("pac-man-best", String(s));
        setBest(s);
      }
    } catch { /* noop */ }
  }, []);

  const isWalkable = useCallback((tx: number, ty: number, allowDoor: boolean) => {
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return false;
    const c = gridRef.current[ty][tx];
    if (c === "wall") return false;
    if (c === "door") return allowDoor;
    return true;
  }, []);

  const resetEntities = useCallback(() => {
    const m = mazeRef.current!;
    const p = tileCenter(m.pacStart.x, m.pacStart.y);
    pacRef.current = { x: p.x, y: p.y, dir: "none", nextDir: "none", speed: PAC_SPEED_BASE };
    ghostsRef.current = m.ghostStarts.slice(0, 4).map((g, i) => {
      const c = tileCenter(g.x, g.y);
      return {
        x: c.x, y: c.y,
        dir: "up",
        nextDir: "up",
        speed: DIFF[difficulty].ghostSpeed * (1 + (levelRef.current - 1) * 0.08),
        kind: GHOST_NAMES[i],
        color: GHOST_COLORS[i],
        frightened: false,
        eaten: false,
        home: { x: c.x, y: c.y },
      };
    });
    frightenedTimerRef.current = 0;
    ghostEatStreakRef.current = 0;
  }, [difficulty]);

  const resetLevel = useCallback(() => {
    const m = parseMaze();
    mazeRef.current = m;
    gridRef.current = m.grid.map((r) => r.slice());
    remainingRef.current = m.totalPellets;
    resetEntities();
  }, [resetEntities]);

  // ---------- Drawing ----------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000010";
    ctx.fillRect(0, 0, W, H);

    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r]?.[c];
        const x = c * CELL;
        const y = r * CELL;
        if (cell === "wall") {
          ctx.fillStyle = "#1e3a8a";
          ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
        } else if (cell === "door") {
          ctx.fillStyle = "#f9a8d4";
          ctx.fillRect(x + 2, y + CELL / 2 - 1, CELL - 4, 2);
        } else if (cell === "dot") {
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === "pellet") {
          ctx.fillStyle = "#fef3c7";
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 5 + Math.sin(Date.now() / 200) * 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Pac-Man
    const p = pacRef.current;
    const mouth = Math.abs(Math.sin(mouthRef.current)) * 0.5 + 0.05;
    let rot = 0;
    if (p.dir === "right") rot = 0;
    else if (p.dir === "down") rot = Math.PI / 2;
    else if (p.dir === "left") rot = Math.PI;
    else if (p.dir === "up") rot = -Math.PI / 2;
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, CELL / 2 - 1, rot + mouth * Math.PI, rot - mouth * Math.PI + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // Ghosts
    for (const g of ghostsRef.current) {
      const color = g.eaten ? "#94a3b8" : g.frightened ? (frightenedTimerRef.current < 90 && Math.floor(frightenedTimerRef.current / 10) % 2 === 0 ? "#ffffff" : "#3b82f6") : g.color;
      const radius = CELL / 2 - 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 1, radius, Math.PI, 0);
      // wavy bottom
      const bottom = g.y - 1 + radius;
      ctx.lineTo(g.x + radius, bottom);
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const px = g.x + radius - (i * 2 + 1) * (radius / steps);
        const py = bottom - (i % 2 === 0 ? 3 : 0);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(g.x - radius, bottom);
      ctx.closePath();
      ctx.fill();

      // Eyes
      const eyeOff = DIR_VEC[g.dir];
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(g.x - 3, g.y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(g.x + 3, g.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000033";
      ctx.beginPath();
      ctx.arc(g.x - 3 + eyeOff.x * 1.2, g.y - 2 + eyeOff.y * 1.2, 1.2, 0, Math.PI * 2);
      ctx.arc(g.x + 3 + eyeOff.x * 1.2, g.y - 2 + eyeOff.y * 1.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // ---------- AI ----------
  const chooseGhostDir = useCallback((g: Ghost): Dir => {
    const { tx, ty } = tileAt(g.x, g.y);
    const candidates: Dir[] = [];
    const dirs: Dir[] = ["up", "left", "down", "right"];
    for (const d of dirs) {
      if (d === OPPOSITE[g.dir]) continue;
      const v = DIR_VEC[d];
      if (isWalkable(tx + v.x, ty + v.y, g.eaten || g.frightened === false)) {
        candidates.push(d);
      }
    }
    if (candidates.length === 0) return OPPOSITE[g.dir];

    // Determine target tile
    const pacTile = tileAt(pacRef.current.x, pacRef.current.y);
    let target = { x: pacTile.tx, y: pacTile.ty };
    if (g.eaten) {
      // return to pen
      target = { x: 9, y: 9 };
    } else if (g.frightened) {
      // random
      return candidates[Math.floor(Math.random() * candidates.length)];
    } else if (g.kind === "blinky") {
      target = { x: pacTile.tx, y: pacTile.ty };
    } else if (g.kind === "pinky") {
      const pv = DIR_VEC[pacRef.current.dir];
      target = { x: pacTile.tx + pv.x * 4, y: pacTile.ty + pv.y * 4 };
    } else if (g.kind === "inky") {
      const pv = DIR_VEC[pacRef.current.dir];
      target = { x: pacTile.tx + pv.x * 2, y: pacTile.ty + pv.y * 2 };
    } else { // clyde
      const dist = Math.hypot(tx - pacTile.tx, ty - pacTile.ty);
      target = dist > 6 ? { x: pacTile.tx, y: pacTile.ty } : { x: 1, y: ROWS - 2 };
    }

    let best: Dir = candidates[0];
    let bestD = Infinity;
    for (const d of candidates) {
      const v = DIR_VEC[d];
      const nx = tx + v.x;
      const ny = ty + v.y;
      const dd = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }, [isWalkable]);

  // ---------- Step ----------
  const moveEntity = useCallback((e: Entity, allowDoor: boolean) => {
    const { tx, ty } = tileAt(e.x, e.y);
    const center = tileCenter(tx, ty);
    const onCenter = Math.abs(e.x - center.x) < 1 && Math.abs(e.y - center.y) < 1;

    // Try to honor nextDir at center
    if (onCenter && e.nextDir !== "none") {
      const v = DIR_VEC[e.nextDir];
      if (isWalkable(tx + v.x, ty + v.y, allowDoor)) {
        e.dir = e.nextDir;
      }
    }

    // Stop at wall
    const v = DIR_VEC[e.dir];
    const ahead = { x: tx + v.x, y: ty + v.y };
    if (onCenter && !isWalkable(ahead.x, ahead.y, allowDoor)) {
      e.x = center.x;
      e.y = center.y;
      return;
    }

    e.x += v.x * e.speed;
    e.y += v.y * e.speed;
  }, [isWalkable]);

  const handleLifeLost = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    playSound("fail");
    if (livesRef.current <= 0) {
      overRef.current = true;
      setGameOver(true);
      setRunning(false);
      runningRef.current = false;
      saveBest(scoreRef.current);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    resetEntities();
  }, [resetEntities, saveBest]);

  const advanceLevel = useCallback(() => {
    levelRef.current += 1;
    setLevel(levelRef.current);
    resetLevel();
    playSound("score");
  }, [resetLevel]);

  const step = useCallback(() => {
    const pac = pacRef.current;
    moveEntity(pac, false);
    mouthRef.current += pac.dir === "none" ? 0 : 0.25;

    // Eat dots/pellets
    const { tx: ptx, ty: pty } = tileAt(pac.x, pac.y);
    const cell = gridRef.current[pty]?.[ptx];
    if (cell === "dot") {
      gridRef.current[pty][ptx] = "empty";
      remainingRef.current -= 1;
      scoreRef.current += 10;
      setScore(scoreRef.current);
      saveBest(scoreRef.current);
    } else if (cell === "pellet") {
      gridRef.current[pty][ptx] = "empty";
      remainingRef.current -= 1;
      scoreRef.current += 50;
      setScore(scoreRef.current);
      saveBest(scoreRef.current);
      frightenedTimerRef.current = 60 * 6; // ~6 seconds
      ghostEatStreakRef.current = 0;
      for (const g of ghostsRef.current) {
        if (!g.eaten) {
          g.frightened = true;
          g.dir = OPPOSITE[g.dir];
        }
      }
      playSound("score");
    }

    if (frightenedTimerRef.current > 0) {
      frightenedTimerRef.current -= 1;
      if (frightenedTimerRef.current === 0) {
        for (const g of ghostsRef.current) g.frightened = false;
      }
    }

    // Ghosts
    for (const g of ghostsRef.current) {
      const { tx, ty } = tileAt(g.x, g.y);
      const center = tileCenter(tx, ty);
      const onCenter = Math.abs(g.x - center.x) < 1 && Math.abs(g.y - center.y) < 1;
      if (onCenter) {
        g.dir = chooseGhostDir(g);
        if (g.eaten && tx === 9 && ty === 9) {
          g.eaten = false;
          g.frightened = false;
        }
      }
      const v = DIR_VEC[g.dir];
      const ahead = { x: tx + v.x, y: ty + v.y };
      const allowDoor = g.eaten || (tx === 9 && (ty === 8 || ty === 9));
      if (onCenter && !isWalkable(ahead.x, ahead.y, allowDoor)) {
        g.x = center.x; g.y = center.y;
        continue;
      }
      const sp = g.eaten ? g.speed * 1.6 : g.frightened ? g.speed * 0.6 : g.speed;
      g.x += v.x * sp;
      g.y += v.y * sp;
    }

    // Collisions
    for (const g of ghostsRef.current) {
      const d = Math.hypot(g.x - pac.x, g.y - pac.y);
      if (d < CELL * 0.7) {
        if (g.eaten) continue;
        if (g.frightened) {
          ghostEatStreakRef.current += 1;
          const pts = 200 * Math.pow(2, ghostEatStreakRef.current - 1);
          scoreRef.current += pts;
          setScore(scoreRef.current);
          saveBest(scoreRef.current);
          g.eaten = true;
          g.frightened = false;
          playSound("score");
        } else {
          handleLifeLost();
          return;
        }
      }
    }

    if (remainingRef.current <= 0) {
      setWon(true);
      setRunning(false);
      runningRef.current = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      playSound("score");
    }
  }, [chooseGhostDir, handleLifeLost, isWalkable, moveEntity, saveBest]);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    step();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, step]);

  const startGame = useCallback(() => {
    scoreRef.current = 0; setScore(0);
    livesRef.current = 3; setLives(3);
    levelRef.current = 1; setLevel(1);
    resetLevel();
    overRef.current = false;
    setGameOver(false);
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, resetLevel]);

  const continueNext = useCallback(() => {
    advanceLevel();
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [advanceLevel, loop]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Initial draw with maze
  useEffect(() => {
    resetLevel();
    draw();
  }, [draw, resetLevel]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      let d: Dir | null = null;
      if (k === "ArrowUp" || k === "w" || k === "W") d = "up";
      else if (k === "ArrowDown" || k === "s" || k === "S") d = "down";
      else if (k === "ArrowLeft" || k === "a" || k === "A") d = "left";
      else if (k === "ArrowRight" || k === "d" || k === "D") d = "right";
      if (d) {
        e.preventDefault();
        pacRef.current.nextDir = d;
        if (pacRef.current.dir === "none") pacRef.current.dir = d;
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // Swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    let d: Dir;
    if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? "right" : "left";
    else d = dy > 0 ? "down" : "up";
    pacRef.current.nextDir = d;
    if (pacRef.current.dir === "none") pacRef.current.dir = d;
  };

  return (
    <ToolPageShell title="Pac-Man" description="Eat all the dots and avoid the ghosts. Classic arcade fun!">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Score</p>
            <p className="text-2xl font-black text-foreground">{score}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Lives</p>
            <p className="text-2xl font-black text-red-400">{"❤".repeat(Math.max(0, lives)) || "—"}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Level</p>
            <p className="text-2xl font-black text-cyan-400">{level}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Best</p>
            <p className="text-2xl font-black text-yellow-400">{best}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {(Object.keys(DIFF) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              disabled={running}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                difficulty === d
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {DIFF[d].label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-[420px] mx-auto relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="w-full rounded-xl border-2 border-border touch-none select-none"
          />
          {!running && !gameOver && !won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">👻</p>
              <p className="text-white font-black text-2xl mb-1">Pac-Man</p>
              <p className="text-white/60 text-sm mb-4 px-4 text-center">Arrow keys or WASD on desktop. Swipe on mobile.</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">💀 Game Over</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-white/70 mb-1">Level: {level}</p>
              <p className="text-yellow-400 mb-4">Best: {best}</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          )}
          {won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">🎉 Level Cleared!</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-cyan-400 mb-4">Next Level: {level + 1}</p>
              <button
                onClick={continueNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Continue
              </button>
            </div>
          )}
        </div>
      </div>

      <HowToUse steps={[
        "Pick your difficulty — Easy keeps ghosts slow, Hard makes them sprint.",
        "Use arrow keys or WASD on desktop, or swipe on mobile, to steer Pac-Man through the maze.",
        "Eat every dot to clear the level. Grab a power pellet to turn the ghosts blue and chomp them for bonus points!",
      ]} />

      <ToolSeoContent
        title="Pac-Man — Free Online Game, No Download"
        description="Play the classic Pac-Man arcade game free in your browser. Eat all the dots, dodge the ghosts, and grab power pellets for bonus points."
        body={[
          "Pac-Man is the legendary maze chase game that defined the golden age of arcades. Guide Pac-Man around the maze, gobbling up every dot while four colorful ghosts — Blinky, Pinky, Inky, and Clyde — try to corner you. Each ghost has its own personality and chase pattern, so reading their movement is the key to surviving longer levels.",
          "Power pellets sit in the corners of the maze. Grab one and the ghosts turn blue and vulnerable for a few seconds — chase them down for big bonus points that double with each ghost you eat in a row. Clear every dot and pellet to advance to the next level, where the ghosts get a little quicker and the pressure ramps up.",
          "This version runs entirely in your browser — no downloads, no signup, no ads. Three difficulty levels let you choose between a relaxed warm-up or an intense arcade-style challenge. Your best score is saved locally so you can keep chasing your personal record across sessions.",
        ]}
        faqs={[
          { question: "How do I control Pac-Man?", answer: "On desktop use the arrow keys or WASD to change direction. On mobile, swipe in the direction you want Pac-Man to move. Pac-Man will keep going until he hits a wall or you queue up a new direction." },
          { question: "What do the power pellets do?", answer: "Eating one of the four large pellets makes every ghost vulnerable for a few seconds. They turn blue, slow down, and you can eat them for bonus points (200, 400, 800, 1600 in a row). Eaten ghosts return to the pen and respawn." },
          { question: "How does scoring work?", answer: "Dots are worth 10 points, power pellets are worth 50, and eating frightened ghosts gives an escalating bonus. Clearing every dot in the maze advances you to the next level with faster ghosts." },
          { question: "Does Pac-Man work on mobile?", answer: "Yes. The game is fully responsive and uses swipe gestures on touch devices — no app install needed. It runs entirely in your browser and saves your high score locally." },
        ]}
      />

      <RelatedTools currentSlug="pac-man" />
    </ToolPageShell>
  );
}
