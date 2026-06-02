import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/bubble-shooter";
const TITLE = "Bubble Shooter — Free Online Game, No Download";
const DESCRIPTION =
  "Play Bubble Shooter free in your browser. Match and pop colored bubbles. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/bubble-shooter")({
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
            name: "Bubble Shooter",
            description:
              "Free browser-based Bubble Shooter game. Match 3 or more colored bubbles to pop them. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: BubbleShooterPage,
});

// ---------- Game constants ----------
const R = 18; // bubble radius
const COLS = 8;
const W = 306; // canvas width (R + 7*36 + R + 18 odd-row offset margin)
const H = 480;
const ROW_H = R * Math.sqrt(3); // ~31.18
const SHOOTER_Y = H - 30;
const BOTTOM_LIMIT = H - 70; // game over when any bubble crosses this
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4"] as const;
type Color = (typeof COLORS)[number];

type Cell = Color | null;
type Grid = Cell[][];

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: Color;
}

function cellX(r: number, c: number, parityOffset: number) {
  const odd = (r + parityOffset) % 2 === 1;
  return R + c * 2 * R + (odd ? R : 0);
}
function cellY(r: number) {
  return R + r * ROW_H;
}

function neighbors(r: number, c: number, parityOffset: number, rowsLen: number): Array<[number, number]> {
  const odd = (r + parityOffset) % 2 === 1;
  const out: Array<[number, number]> = [[r, c - 1], [r, c + 1]];
  if (odd) {
    out.push([r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]);
  } else {
    out.push([r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]);
  }
  return out.filter(([nr, nc]) => nr >= 0 && nr < rowsLen && nc >= 0 && nc < COLS);
}

function randColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function buildInitialGrid(level: number): Grid {
  const rows = Math.min(10, 5 + level);
  const g: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      // odd rows: leave last col empty to keep visual balance
      if ((r % 2 === 1) && c === COLS - 1) {
        row.push(null);
      } else {
        row.push(Math.random() < 0.85 ? randColor() : null);
      }
    }
    g.push(row);
  }
  return g;
}

function newTopRow(parityOffset: number, rowIndex: number): Cell[] {
  const odd = (rowIndex + parityOffset) % 2 === 1;
  const row: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    if (odd && c === COLS - 1) {
      row.push(null);
    } else {
      row.push(randColor());
    }
  }
  return row;
}

function activeColors(grid: Grid): Color[] {
  const set = new Set<Color>();
  for (const row of grid) for (const c of row) if (c) set.add(c);
  return set.size ? Array.from(set) : (COLORS as readonly Color[]).slice();
}

// ---------- Component ----------
function BubbleShooterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const gridRef = useRef<Grid>([]);
  const parityOffsetRef = useRef(0);
  const bulletRef = useRef<Bullet | null>(null);
  const currentColorRef = useRef<Color>("#ef4444");
  const nextColorRef = useRef<Color>("#3b82f6");
  const aimRef = useRef<number>(-Math.PI / 2); // pointing up
  const shotsRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const overRef = useRef(false);

  // Load best
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = parseInt(localStorage.getItem("bubble-shooter-best") || "0", 10);
      if (!isNaN(v)) setBest(v);
    } catch { /* noop */ }
  }, []);

  const saveBest = useCallback((s: number) => {
    try {
      const cur = parseInt(localStorage.getItem("bubble-shooter-best") || "0", 10) || 0;
      if (s > cur) {
        localStorage.setItem("bubble-shooter-best", String(s));
        setBest(s);
      }
    } catch { /* noop */ }
  }, []);

  const pickNextColor = useCallback((): Color => {
    const active = activeColors(gridRef.current);
    return active[Math.floor(Math.random() * active.length)];
  }, []);

  const reloadShooter = useCallback(() => {
    currentColorRef.current = nextColorRef.current;
    nextColorRef.current = pickNextColor();
  }, [pickNextColor]);

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

    // Danger line
    ctx.strokeStyle = "rgba(239,68,68,0.4)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, BOTTOM_LIMIT);
    ctx.lineTo(W, BOTTOM_LIMIT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid bubbles
    const grid = gridRef.current;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        const col = grid[r][c];
        if (!col) continue;
        const x = cellX(r, c, parityOffsetRef.current);
        const y = cellY(r);
        drawBubble(ctx, x, y, col);
      }
    }

    // Trajectory preview
    if (runningRef.current && !bulletRef.current && !overRef.current) {
      drawTrajectory(ctx, aimRef.current);
    }

    // Bullet
    const b = bulletRef.current;
    if (b) drawBubble(ctx, b.x, b.y, b.color);

    // Shooter cannon
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(W / 2, SHOOTER_Y, R + 6, 0, Math.PI * 2);
    ctx.fill();
    drawBubble(ctx, W / 2, SHOOTER_Y, currentColorRef.current);

    // Next bubble indicator
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px sans-serif";
    ctx.fillText("Next", W - 56, SHOOTER_Y - 20);
    drawBubble(ctx, W - 22, SHOOTER_Y, nextColorRef.current, 0.7);
  }, []);

  const drawTrajectory = (ctx: CanvasRenderingContext2D, angle: number) => {
    // Simulate up to ~2 bounces or until hitting a bubble / top
    let x = W / 2;
    let y = SHOOTER_Y;
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);
    if (dy > -0.05) return; // not aiming up enough
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const step = 4;
    const grid = gridRef.current;
    for (let i = 0; i < 400; i++) {
      x += dx * step;
      y += dy * step;
      if (x < R) { x = R; dx = -dx; }
      else if (x > W - R) { x = W - R; dx = -dx; }
      if (y < R) break;
      // Hit any bubble?
      let hit = false;
      for (let r = 0; r < grid.length && !hit; r++) {
        for (let c = 0; c < COLS && !hit; c++) {
          if (!grid[r][c]) continue;
          const bx = cellX(r, c, parityOffsetRef.current);
          const by = cellY(r);
          const ddx = bx - x;
          const ddy = by - y;
          if (ddx * ddx + ddy * ddy < (2 * R) * (2 * R)) hit = true;
        }
      }
      if (hit) break;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const findSnapCell = (bx: number, by: number): [number, number] | null => {
    const grid = gridRef.current;
    let best: { r: number; c: number; d: number } | null = null;
    const rowsToCheck = grid.length + 2;
    for (let r = 0; r < rowsToCheck; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r < grid.length && grid[r][c]) continue;
        // Skip the always-empty last cell of an odd row to avoid placing off-grid
        const odd = (r + parityOffsetRef.current) % 2 === 1;
        if (odd && c === COLS - 1) continue;
        const x = cellX(r, c, parityOffsetRef.current);
        const y = cellY(r);
        const d = (x - bx) ** 2 + (y - by) ** 2;
        // Must be adjacent to existing bubble OR be in top row
        const isAdjacent = r === 0 || neighbors(r, c, parityOffsetRef.current, Math.max(grid.length, r + 1)).some(([nr, nc]) => {
          return nr < grid.length && grid[nr] && grid[nr][nc];
        });
        if (!isAdjacent) continue;
        if (!best || d < best.d) best = { r, c, d };
      }
    }
    return best ? [best.r, best.c] : null;
  };

  const placeBubble = (r: number, c: number, color: Color) => {
    const grid = gridRef.current;
    while (grid.length <= r) {
      const row: Cell[] = [];
      const odd = (grid.length + parityOffsetRef.current) % 2 === 1;
      for (let i = 0; i < COLS; i++) row.push(odd && i === COLS - 1 ? null : null);
      grid.push(row);
    }
    grid[r][c] = color;

    // Find connected same-color cluster from (r,c)
    const cluster = findCluster(grid, r, c, color);
    if (cluster.length >= 3) {
      for (const [rr, cc] of cluster) grid[rr][cc] = null;
      scoreRef.current += cluster.length * 10;
      playSound("score");
      // Drop disconnected
      const dropped = removeDisconnected(grid);
      if (dropped > 0) scoreRef.current += dropped * 20;
      setScore(scoreRef.current);
      saveBest(scoreRef.current);
    }

    // Check win (board cleared)
    if (grid.every((row) => row.every((cl) => !cl))) {
      handleWin();
      return;
    }
    // Check game over (any bubble crosses bottom limit)
    for (let rr = 0; rr < grid.length; rr++) {
      for (let cc = 0; cc < COLS; cc++) {
        if (grid[rr][cc] && cellY(rr) + R >= BOTTOM_LIMIT) {
          handleGameOver();
          return;
        }
      }
    }
  };

  const findCluster = (grid: Grid, r: number, c: number, color: Color): Array<[number, number]> => {
    const seen = new Set<string>();
    const stack: Array<[number, number]> = [[r, c]];
    const out: Array<[number, number]> = [];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const key = `${cr},${cc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (grid[cr]?.[cc] !== color) continue;
      out.push([cr, cc]);
      for (const [nr, nc] of neighbors(cr, cc, parityOffsetRef.current, grid.length)) {
        if (!seen.has(`${nr},${nc}`)) stack.push([nr, nc]);
      }
    }
    return out;
  };

  const removeDisconnected = (grid: Grid): number => {
    const seen = new Set<string>();
    const stack: Array<[number, number]> = [];
    for (let c = 0; c < COLS; c++) {
      if (grid[0]?.[c]) stack.push([0, c]);
    }
    while (stack.length) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      if (!grid[r]?.[c]) continue;
      seen.add(key);
      for (const [nr, nc] of neighbors(r, c, parityOffsetRef.current, grid.length)) {
        if (!seen.has(`${nr},${nc}`)) stack.push([nr, nc]);
      }
    }
    let removed = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && !seen.has(`${r},${c}`)) {
          grid[r][c] = null;
          removed++;
        }
      }
    }
    return removed;
  };

  const handleGameOver = () => {
    overRef.current = true;
    setGameOver(true);
    setRunning(false);
    runningRef.current = false;
    playSound("fail");
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const handleWin = () => {
    levelRef.current += 1;
    setLevel(levelRef.current);
    overRef.current = true;
    setWon(true);
    setRunning(false);
    runningRef.current = false;
    playSound("score");
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const addRowFromTop = () => {
    const grid = gridRef.current;
    parityOffsetRef.current = (parityOffsetRef.current + 1) % 2;
    // Now old row index 0 should remain same parity. After flipping offset and unshifting:
    // new index 0 parity = (0 + newOffset) % 2; old index 0 parity = (0 + oldOffset) % 2.
    // We want old index 0 (now index 1) parity = (1 + newOffset) % 2 = (1 + 1 - oldOffset) % 2 = oldOffset. ✓
    const newRow = newTopRow(parityOffsetRef.current, 0);
    grid.unshift(newRow);
  };

  const shotsPerRow = () => Math.max(2, 6 - levelRef.current);

  const fire = () => {
    if (!runningRef.current || bulletRef.current || overRef.current) return;
    const angle = aimRef.current;
    if (Math.sin(angle) > -0.05) return; // must aim upward
    const speed = 9;
    bulletRef.current = {
      x: W / 2,
      y: SHOOTER_Y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: currentColorRef.current,
    };
  };

  const loop = useCallback(() => {
    const b = bulletRef.current;
    if (b) {
      // step bullet
      const steps = 3;
      for (let s = 0; s < steps && bulletRef.current; s++) {
        b.x += b.vx / steps;
        b.y += b.vy / steps;
        if (b.x < R) { b.x = R; b.vx = -b.vx; }
        else if (b.x > W - R) { b.x = W - R; b.vx = -b.vx; }

        // Top wall hit
        if (b.y <= R) {
          b.y = R;
          const snap = findSnapCell(b.x, b.y);
          if (snap) placeBubble(snap[0], snap[1], b.color);
          bulletRef.current = null;
          afterShot();
          break;
        }

        // Bubble collision
        const grid = gridRef.current;
        let hit = false;
        for (let r = 0; r < grid.length && !hit; r++) {
          for (let c = 0; c < COLS && !hit; c++) {
            if (!grid[r][c]) continue;
            const bx = cellX(r, c, parityOffsetRef.current);
            const by = cellY(r);
            const ddx = bx - b.x;
            const ddy = by - b.y;
            const dist2 = ddx * ddx + ddy * ddy;
            if (dist2 < (2 * R - 2) * (2 * R - 2)) {
              hit = true;
              const snap = findSnapCell(b.x, b.y);
              if (snap) placeBubble(snap[0], snap[1], b.color);
              bulletRef.current = null;
              afterShot();
            }
          }
        }
      }
    }

    draw();
    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const afterShot = () => {
    if (overRef.current) return;
    reloadShooter();
    shotsRef.current += 1;
    if (shotsRef.current >= shotsPerRow()) {
      shotsRef.current = 0;
      addRowFromTop();
      // Check immediate game over
      const grid = gridRef.current;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] && cellY(r) + R >= BOTTOM_LIMIT) {
            handleGameOver();
            return;
          }
        }
      }
    }
  };

  const startGame = useCallback(() => {
    levelRef.current = 1;
    setLevel(1);
    scoreRef.current = 0;
    setScore(0);
    parityOffsetRef.current = 0;
    shotsRef.current = 0;
    gridRef.current = buildInitialGrid(1);
    currentColorRef.current = pickNextColor();
    nextColorRef.current = pickNextColor();
    bulletRef.current = null;
    overRef.current = false;
    setGameOver(false);
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, pickNextColor]);

  const nextLevel = useCallback(() => {
    scoreRef.current = scoreRef.current; // keep score
    parityOffsetRef.current = 0;
    shotsRef.current = 0;
    gridRef.current = buildInitialGrid(levelRef.current);
    currentColorRef.current = pickNextColor();
    nextColorRef.current = pickNextColor();
    bulletRef.current = null;
    overRef.current = false;
    setWon(false);
    setRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, pickNextColor]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Pointer handlers
  const updateAimFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const y = ((clientY - rect.top) / rect.height) * H;
    const dx = x - W / 2;
    const dy = y - SHOOTER_Y;
    if (dy >= 0) return; // ignore aiming downward
    let angle = Math.atan2(dy, dx);
    // Clamp angle between ~ -170° and -10°
    const minA = Math.PI * (-170 / 180);
    const maxA = Math.PI * (-10 / 180);
    if (angle < minA) angle = minA;
    if (angle > maxA) angle = maxA;
    aimRef.current = angle;
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => updateAimFromEvent(e.clientX, e.clientY);
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateAimFromEvent(e.clientX, e.clientY);
    fire();
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (t) updateAimFromEvent(t.clientX, t.clientY);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.changedTouches[0];
    if (t) updateAimFromEvent(t.clientX, t.clientY);
    fire();
  };

  // Initial draw of empty board
  useEffect(() => { draw(); }, [draw]);

  return (
    <ToolPageShell title="Bubble Shooter" description="Aim, shoot, and pop bubbles before they reach the bottom!">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Score</p>
            <p className="text-2xl font-black text-foreground">{score}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Level</p>
            <p className="text-2xl font-black text-cyan-400">{level}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Best</p>
            <p className="text-2xl font-black text-yellow-400">{best}</p>
          </div>
        </div>

        <div className="w-full max-w-[306px] mx-auto relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={onMouseMove}
            onClick={onClick}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="w-full rounded-xl border-2 border-border touch-none select-none cursor-crosshair"
          />
          {!running && !gameOver && !won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">🫧</p>
              <p className="text-white font-black text-2xl mb-1">Bubble Shooter</p>
              <p className="text-white/60 text-sm mb-4 px-4 text-center">Aim with your mouse or finger, click to shoot</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
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
              <p className="text-cyan-400 mb-4">Next Level: {level}</p>
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
        "Move your mouse or finger to aim the cannon at the bottom of the board.",
        "Click or tap to launch the colored bubble — it bounces off the side walls.",
        "Match 3 or more bubbles of the same color to pop them. Don't let the bubbles reach the bottom!",
      ]} />

      <ToolSeoContent
        title="Bubble Shooter — Free Online Game, No Download"
        description="Play the classic Bubble Shooter game in your browser. Pop colored bubbles, clear the board, and climb the levels. No download or signup."
        body={[
          "Bubble Shooter is one of the most addictive arcade puzzle games ever made. Your goal is simple: aim the cannon at the bottom of the screen and shoot colored bubbles at a slowly-growing cluster at the top. Whenever three or more bubbles of the same color touch, they pop, and any disconnected bubbles fall down for bonus points. Clear the entire board to advance to the next level.",
          "Our version runs entirely in your browser — no downloads, no ads, no signup. It works on desktop with your mouse and on mobile with touch controls. Your best score is saved locally so you can keep improving across sessions. Every level speeds up the descent, so plan your shots, use wall bounces, and pop those bubbles before they reach the danger line!",
        ]}
        faqs={[
          { question: "How do I control the game?", answer: "Move your mouse (or finger on touch devices) to aim the cannon, then click or tap to shoot. A faint dotted line shows where the bubble will travel, including one bounce off the side walls." },
          { question: "How does scoring work?", answer: "You earn 10 points per popped bubble in a matched cluster, plus 20 points for every disconnected bubble that falls afterward. Bigger combos mean bigger scores." },
          { question: "How does the level system work?", answer: "Clear all bubbles on the board to advance to the next level. Higher levels start with more rows and add new rows faster, making each level a tougher challenge than the last." },
          { question: "Does Bubble Shooter work on mobile?", answer: "Yes. The board is fully touch-friendly — drag your finger to aim and lift to shoot. It runs smoothly on any modern phone or tablet browser." },
        ]}
      />

      <RelatedTools currentSlug="bubble-shooter" />
    </ToolPageShell>
  );
}

// ---------- Helpers ----------
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: Color, scale = 1) {
  const r = R * scale;
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, color);
  g.addColorStop(1, shade(color, -0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function shade(hex: string, amt: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
