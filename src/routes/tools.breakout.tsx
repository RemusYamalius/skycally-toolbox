import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/breakout";
const TITLE = "Breakout — Free Online Brick Breaker Game, No Download";
const DESCRIPTION =
  "Play Breakout free in your browser. Break all the bricks with your paddle and ball. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/breakout")({
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
            name: "Breakout",
            description:
              "Free browser-based Breakout brick breaker game. Break all the bricks with your paddle and ball. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: BreakoutPage,
});

// ---------- Game constants ----------
const W = 360;
const H = 520;
const BRICK_ROWS = 6;
const BRICK_COLS = 9;
const BRICK_W = 36;
const BRICK_H = 16;
const BRICK_GAP = 2;
const BRICK_TOP = 50;
const BRICK_LEFT = (W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;
const BALL_R = 6;

type Difficulty = "easy" | "medium" | "hard";

const DIFF: Record<Difficulty, { paddle: number; speed: number; label: string }> = {
  easy:   { paddle: 90, speed: 3.6, label: "Easy" },
  medium: { paddle: 70, speed: 4.6, label: "Medium" },
  hard:   { paddle: 54, speed: 5.6, label: "Hard" },
};

// Brick tier: 1 hit (green/10), 2 hits (orange/20), 3 hits (red/30)
type Brick = { hits: number; tier: 1 | 2 | 3 };

const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: "#22c55e",
  2: "#f59e0b",
  3: "#ef4444",
};

function buildBricks(): Brick[][] {
  const out: Brick[][] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row: Brick[] = [];
    // Top rows = stronger
    const tier: 1 | 2 | 3 = r < 2 ? 3 : r < 4 ? 2 : 1;
    for (let c = 0; c < BRICK_COLS; c++) {
      row.push({ hits: tier, tier });
    }
    out.push(row);
  }
  return out;
}

function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const bricksRef = useRef<Brick[][]>([]);
  const paddleXRef = useRef(W / 2);
  const paddleWRef = useRef(DIFF.medium.paddle);
  const baseSpeedRef = useRef(DIFF.medium.speed);
  const ballRef = useRef({ x: W / 2, y: H - 40, vx: 0, vy: 0 });
  const launchedRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const runningRef = useRef(false);
  const overRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = parseInt(localStorage.getItem("breakout-best") || "0", 10);
      if (!isNaN(v)) setBest(v);
    } catch { /* noop */ }
  }, []);

  const saveBest = useCallback((s: number) => {
    try {
      const cur = parseInt(localStorage.getItem("breakout-best") || "0", 10) || 0;
      if (s > cur) {
        localStorage.setItem("breakout-best", String(s));
        setBest(s);
      }
    } catch { /* noop */ }
  }, []);

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: paddleXRef.current,
      y: H - 30,
      vx: 0,
      vy: 0,
    };
    launchedRef.current = false;
  }, []);

  const launchBall = useCallback(() => {
    if (launchedRef.current || overRef.current || !runningRef.current) return;
    const speed = baseSpeedRef.current * (1 + (levelRef.current - 1) * 0.12);
    const angle = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3);
    ballRef.current.vx = Math.cos(angle) * speed;
    ballRef.current.vy = Math.sin(angle) * speed;
    launchedRef.current = true;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Bricks
    const bricks = bricksRef.current;
    for (let r = 0; r < bricks.length; r++) {
      for (let c = 0; c < bricks[r].length; c++) {
        const b = bricks[r][c];
        if (b.hits <= 0) continue;
        const x = BRICK_LEFT + c * (BRICK_W + BRICK_GAP);
        const y = BRICK_TOP + r * (BRICK_H + BRICK_GAP);
        const color = TIER_COLORS[b.hits as 1 | 2 | 3] ?? TIER_COLORS[b.tier];
        ctx.fillStyle = color;
        ctx.fillRect(x, y, BRICK_W, BRICK_H);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x, y, BRICK_W, 3);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, BRICK_W - 1, BRICK_H - 1);
      }
    }

    // Paddle
    const pw = paddleWRef.current;
    const px = paddleXRef.current - pw / 2;
    const py = H - 20;
    const pgrad = ctx.createLinearGradient(0, py, 0, py + 10);
    pgrad.addColorStop(0, "#67e8f9");
    pgrad.addColorStop(1, "#0891b2");
    ctx.fillStyle = pgrad;
    ctx.fillRect(px, py, pw, 10);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, 9);

    // Ball
    const b = ballRef.current;
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
  }, []);

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
    resetBall();
  }, [resetBall, saveBest]);

  const handleWin = useCallback(() => {
    overRef.current = true;
    setWon(true);
    setRunning(false);
    runningRef.current = false;
    playSound("score");
    saveBest(scoreRef.current);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, [saveBest]);

  const allCleared = () => {
    const bricks = bricksRef.current;
    for (const row of bricks) for (const b of row) if (b.hits > 0) return false;
    return true;
  };

  const step = useCallback(() => {
    // Paddle keyboard movement
    const paddleSpeed = 6;
    if (keysRef.current.left) paddleXRef.current -= paddleSpeed;
    if (keysRef.current.right) paddleXRef.current += paddleSpeed;
    const halfP = paddleWRef.current / 2;
    if (paddleXRef.current < halfP) paddleXRef.current = halfP;
    if (paddleXRef.current > W - halfP) paddleXRef.current = W - halfP;

    const b = ballRef.current;

    if (!launchedRef.current) {
      // Stick ball to paddle
      b.x = paddleXRef.current;
      b.y = H - 30;
    } else {
      // Substep collision
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx / steps;
        b.y += b.vy / steps;

        // Walls
        if (b.x < BALL_R) { b.x = BALL_R; b.vx = -b.vx; }
        else if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -b.vx; }
        if (b.y < BALL_R) { b.y = BALL_R; b.vy = -b.vy; }

        // Paddle
        const py = H - 20;
        const px = paddleXRef.current - paddleWRef.current / 2;
        if (
          b.vy > 0 &&
          b.y + BALL_R >= py &&
          b.y - BALL_R <= py + 10 &&
          b.x >= px &&
          b.x <= px + paddleWRef.current
        ) {
          b.y = py - BALL_R;
          const rel = (b.x - paddleXRef.current) / (paddleWRef.current / 2); // -1..1
          const speed = Math.hypot(b.vx, b.vy);
          const angle = (-Math.PI / 2) + rel * (Math.PI / 3); // ±60°
          b.vx = Math.cos(angle) * speed;
          b.vy = Math.sin(angle) * speed;
          playSound("click");
        }

        // Bricks
        const bricks = bricksRef.current;
        let hit = false;
        for (let r = 0; r < bricks.length && !hit; r++) {
          for (let c = 0; c < bricks[r].length && !hit; c++) {
            const br = bricks[r][c];
            if (br.hits <= 0) continue;
            const bx = BRICK_LEFT + c * (BRICK_W + BRICK_GAP);
            const by = BRICK_TOP + r * (BRICK_H + BRICK_GAP);
            if (b.x + BALL_R < bx || b.x - BALL_R > bx + BRICK_W) continue;
            if (b.y + BALL_R < by || b.y - BALL_R > by + BRICK_H) continue;
            // Determine bounce side
            const prevX = b.x - b.vx / steps;
            const prevY = b.y - b.vy / steps;
            const wasOutsideX = prevX + BALL_R < bx || prevX - BALL_R > bx + BRICK_W;
            const wasOutsideY = prevY + BALL_R < by || prevY - BALL_R > by + BRICK_H;
            if (wasOutsideY) b.vy = -b.vy;
            else if (wasOutsideX) b.vx = -b.vx;
            else b.vy = -b.vy;

            br.hits -= 1;
            scoreRef.current += br.tier * 10;
            setScore(scoreRef.current);
            saveBest(scoreRef.current);
            playSound("score");
            hit = true;
          }
        }

        // Fell below
        if (b.y - BALL_R > H) {
          handleLifeLost();
          return;
        }

        // Win check
        if (allCleared()) {
          handleWin();
          return;
        }
      }
    }
  }, [handleLifeLost, handleWin, saveBest]);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    step();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, step]);

  const applyDifficulty = useCallback((d: Difficulty) => {
    paddleWRef.current = DIFF[d].paddle;
    baseSpeedRef.current = DIFF[d].speed;
  }, []);

  const startGame = useCallback(() => {
    applyDifficulty(difficulty);
    scoreRef.current = 0; setScore(0);
    livesRef.current = 3; setLives(3);
    levelRef.current = 1; setLevel(1);
    bricksRef.current = buildBricks();
    paddleXRef.current = W / 2;
    resetBall();
    overRef.current = false;
    setGameOver(false);
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [applyDifficulty, difficulty, loop, resetBall]);

  const nextLevel = useCallback(() => {
    levelRef.current += 1;
    setLevel(levelRef.current);
    bricksRef.current = buildBricks();
    paddleXRef.current = W / 2;
    resetBall();
    overRef.current = false;
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, resetBall]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keysRef.current.left = true;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysRef.current.right = true;
      else if (e.key === " " || e.key === "Enter") {
        if (runningRef.current && !launchedRef.current) launchBall();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keysRef.current.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [launchBall]);

  // Pointer handlers
  const movePaddle = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const halfP = paddleWRef.current / 2;
    paddleXRef.current = Math.max(halfP, Math.min(W - halfP, x));
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => movePaddle(e.clientX);
  const onClick = () => launchBall();
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (t) movePaddle(t.clientX);
  };
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (t) movePaddle(t.clientX);
    launchBall();
  };

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  return (
    <ToolPageShell title="Breakout" description="Break all the bricks before you run out of lives!">
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
              onClick={() => { setDifficulty(d); if (!running) applyDifficulty(d); }}
              disabled={running}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                difficulty === d
                  ? "bg-cyan-500 text-black border-cyan-500"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {DIFF[d].label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-[360px] mx-auto relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={onMouseMove}
            onClick={onClick}
            onTouchMove={onTouchMove}
            onTouchStart={onTouchStart}
            className="w-full rounded-xl border-2 border-border touch-none select-none cursor-pointer"
          />
          {!running && !gameOver && !won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">🧱</p>
              <p className="text-white font-black text-2xl mb-1">Breakout</p>
              <p className="text-white/60 text-sm mb-4 px-4 text-center">Move with mouse, arrows or touch. Click/tap to launch.</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
            </div>
          )}
          {running && !launchedRef.current && (
            <div className="absolute top-2 left-0 right-0 text-center text-white/70 text-xs pointer-events-none">
              Click or press Space to launch
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">💥 Game Over</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-white/70 mb-1">Level: {level}</p>
              <p className="text-yellow-400 mb-4">Best: {best}</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors"
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
                onClick={nextLevel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Continue
              </button>
            </div>
          )}
        </div>
      </div>

      <HowToUse steps={[
        "Pick your difficulty — Easy gives a wider paddle and slower ball, Hard makes it tight and fast.",
        "Move the paddle with your mouse, arrow keys, or finger. Click, tap, or press Space to launch.",
        "Break every brick to clear the level. Red bricks take 3 hits, orange 2, green 1. Don't lose all 3 lives!",
      ]} />

      <ToolSeoContent
        title="Breakout — Free Online Brick Breaker Game, No Download"
        description="Play the classic Breakout / Arkanoid brick breaker game in your browser. Bounce the ball with your paddle to smash every brick. No download or signup."
        body={[
          "Breakout is the iconic arcade brick breaker game first popularized by Atari in the 1970s and reinvented countless times since. Your mission is simple: move the paddle at the bottom of the screen, bounce the ball, and chip away at the wall of colored bricks at the top. Red bricks are tough and take three hits, orange take two, and green pop on the first hit — each worth different points. Clear the entire wall to advance to the next level, where the ball speeds up just enough to keep things interesting.",
          "Our version runs entirely in your browser — no downloads, no ads, no signup. It works great on desktop with your mouse or arrow keys, and on mobile with smooth touch controls. Three difficulty levels let you choose between a forgiving wide paddle for casual play or a razor-thin paddle and a fast ball for a serious challenge. Your best score is saved locally between sessions, so you can keep pushing for that perfect run.",
        ]}
        faqs={[
          { question: "How do I control Breakout?", answer: "On desktop, move the paddle with your mouse or with the arrow keys (or A/D). Click anywhere or press Space / Enter to launch the ball. On mobile, drag your finger across the board to move the paddle and tap to launch." },
          { question: "How does scoring work?", answer: "Each brick is worth points based on its toughness: green bricks give 10 points, orange give 20, and red give 30. Your highest score is saved automatically in your browser." },
          { question: "What do the difficulty levels change?", answer: "Easy gives you a wide paddle and a slower ball — perfect for beginners. Medium is the classic experience. Hard shrinks the paddle and speeds up the ball for an arcade-style challenge." },
          { question: "Does Breakout work on mobile?", answer: "Yes. The game is fully responsive and touch-friendly. Drag your finger to move the paddle and tap to launch the ball — no app install needed." },
        ]}
      />

      <RelatedTools currentSlug="breakout" />
    </ToolPageShell>
  );
}
