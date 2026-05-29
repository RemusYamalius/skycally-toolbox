import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/snake")({
  head: () => buildToolMeta(toolBySlug("snake", tools)),
  component: SnakePage,
});

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID = 20;
const CELL = 20;
const SIZE = GRID * CELL; // 400
const INITIAL_SPEED = 150;

const OPPOSITE: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };

function randomEmpty(occupied: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!occupied.some((o) => o.x === p.x && o.y === p.y)) return p;
  }
}

function SnakePage() {
  const initialSnake: Point[] = [{ x: 10, y: 10 }];

  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);

  const snakeRef = useRef<Point[]>(initialSnake);
  const foodRef = useRef<Point>({ x: 15, y: 15 });
  const dirRef = useRef<Dir>("RIGHT");
  const pendingDirRef = useRef<Dir>("RIGHT");
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load best from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = parseInt(localStorage.getItem("snake-best") || "0", 10);
      if (!isNaN(stored)) setBest(stored);
    } catch { /* noop */ }
  }, []);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const gameOver = useCallback(() => {
    stopLoop();
    setRunning(false);
    setDead(true);
    playSound("fail");
  }, [stopLoop]);

  const tick = useCallback(() => {
    const s = snakeRef.current;
    dirRef.current = pendingDirRef.current;
    const d = dirRef.current;
    const head = { ...s[0] };

    if (d === "UP") head.y--;
    else if (d === "DOWN") head.y++;
    else if (d === "LEFT") head.x--;
    else if (d === "RIGHT") head.x++;

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      gameOver();
      return;
    }
    if (s.some((p) => p.x === head.x && p.y === head.y)) {
      gameOver();
      return;
    }

    const newSnake = [head, ...s];
    const f = foodRef.current;

    if (head.x === f.x && head.y === f.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      playSound("score");
      try {
        const stored = parseInt(localStorage.getItem("snake-best") || "0", 10) || 0;
        if (scoreRef.current > stored) {
          localStorage.setItem("snake-best", String(scoreRef.current));
          setBest(scoreRef.current);
        }
      } catch { /* noop */ }

      // Speed up every 50 points
      if (scoreRef.current % 50 === 0) {
        const newSpeed = Math.max(60, INITIAL_SPEED - (scoreRef.current / 50) * 15);
        speedRef.current = newSpeed;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(tick, newSpeed);
        }
      }

      const newFood = randomEmpty(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    setSnake(newSnake);
  }, [gameOver]);

  const startGame = useCallback(() => {
    const startSnake: Point[] = [{ x: 10, y: 10 }];
    snakeRef.current = startSnake;
    setSnake(startSnake);
    const startFood = randomEmpty(startSnake);
    foodRef.current = startFood;
    setFood(startFood);
    dirRef.current = "RIGHT";
    pendingDirRef.current = "RIGHT";
    scoreRef.current = 0;
    setScore(0);
    speedRef.current = INITIAL_SPEED;
    setDead(false);
    setRunning(true);
    stopLoop();
    intervalRef.current = setInterval(tick, INITIAL_SPEED);
  }, [stopLoop, tick]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const changeDir = useCallback((nd: Dir) => {
    if (!running) return;
    // prevent 180° reversal vs current committed direction
    if (OPPOSITE[dirRef.current] === nd) return;
    pendingDirRef.current = nd;
  }, [running]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
      if (k === "ArrowUp" || k === "w" || k === "W") changeDir("UP");
      else if (k === "ArrowDown" || k === "s" || k === "S") changeDir("DOWN");
      else if (k === "ArrowLeft" || k === "a" || k === "A") changeDir("LEFT");
      else if (k === "ArrowRight" || k === "d" || k === "D") changeDir("RIGHT");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDir]);

  // Swipe controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? "RIGHT" : "LEFT");
    else changeDir(dy > 0 ? "DOWN" : "UP");
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    snake.forEach((p, i) => {
      const alpha = 1 - (i / Math.max(snake.length, 1)) * 0.5;
      ctx.fillStyle = i === 0 ? "#22c55e" : `rgba(34,197,94,${alpha})`;
      const x = p.x * CELL + 1;
      const y = p.y * CELL + 1;
      const w = CELL - 2;
      const h = CELL - 2;
      const r = 4;
      ctx.beginPath();
      const anyCtx = ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
      if (typeof anyCtx.roundRect === "function") {
        anyCtx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    });

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food]);

  return (
    <ToolPageShell title="Snake" description="The classic arcade snake. Eat the food, grow longer, don't crash into walls or your tail.">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Score */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[100px]">
            <p className="text-xs text-muted-foreground font-bold">Score</p>
            <p className="text-2xl font-black text-foreground">{score}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[100px]">
            <p className="text-xs text-muted-foreground font-bold">Best</p>
            <p className="text-2xl font-black text-yellow-400">{best}</p>
          </div>
        </div>

        {/* Canvas */}
        <div className="w-full max-w-sm mx-auto relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="w-full rounded-xl border-2 border-border touch-none select-none"
          />
          {!running && !dead && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">🐍</p>
              <p className="text-white font-black text-2xl mb-1">Snake</p>
              <p className="text-white/60 text-sm mb-4">Use arrow keys, WASD or swipe</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
            </div>
          )}
          {dead && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">💀 Game Over</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-yellow-400 mb-4">Best: {best}</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          )}
        </div>

        {/* On-screen D-pad */}
        <div className="grid grid-cols-3 gap-1 w-36 mx-auto mt-4 select-none">
          <div />
          <button onClick={() => changeDir("UP")} className={cn("aspect-square rounded-lg bg-secondary border border-border text-foreground font-bold hover:bg-secondary/70 active:bg-secondary/50")}>▲</button>
          <div />
          <button onClick={() => changeDir("LEFT")} className={cn("aspect-square rounded-lg bg-secondary border border-border text-foreground font-bold hover:bg-secondary/70 active:bg-secondary/50")}>◄</button>
          <button onClick={() => changeDir("DOWN")} className={cn("aspect-square rounded-lg bg-secondary border border-border text-foreground font-bold hover:bg-secondary/70 active:bg-secondary/50")}>▼</button>
          <button onClick={() => changeDir("RIGHT")} className={cn("aspect-square rounded-lg bg-secondary border border-border text-foreground font-bold hover:bg-secondary/70 active:bg-secondary/50")}>►</button>
        </div>
      </div>

      <HowToUse steps={[
        "Press Start and use arrow keys or WASD to move the snake.",
        "Eat the red food to grow longer and score points.",
        "Don't hit the walls or your own tail — speed increases as you score!",
      ]} />

      <ToolSeoContent
        title="Snake Game — Play Classic Snake Online Free"
        description="Play the classic Snake game online for free. Eat food, grow longer, avoid walls and your tail. Works on mobile with swipe controls!"
        body={[
          "Snake is the iconic arcade game everyone grew up with, now playable instantly in your browser. Guide the snake around the grid to eat the red food, growing one segment at a time. Each bite scores 10 points, and every 50 points the game speeds up — how long can you survive once the snake gets really fast?",
          "Our version saves your best score locally so you can keep chasing your personal record across sessions. It works on desktop with arrow keys or WASD, and on mobile with swipe gestures or the on-screen D-pad. No downloads, no ads, no sign-up — just pure retro arcade fun.",
        ]}
        faqs={[
          { question: "How do I control the snake?", answer: "On desktop, use the arrow keys or WASD. On mobile, swipe in any direction on the board, or tap the on-screen D-pad below the board." },
          { question: "Is my best score saved?", answer: "Yes. Your best score is saved in your browser's local storage and persists between sessions on the same device. Clearing your browser data will reset it." },
          { question: "Does the game get harder?", answer: "Yes — the snake speeds up every 50 points you score, capping at a fast but playable speed. Combined with the snake getting longer, it gets challenging quickly." },
          { question: "Why did I lose?", answer: "Snake ends if you hit a wall or run into your own tail. Plan ahead, especially as your snake grows long enough to fill the board." },
        ]}
      />

      <RelatedTools currentSlug="snake" />
    </ToolPageShell>
  );
}
