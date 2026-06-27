import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/tunnel-dash";
const TITLE = "Tunnel Dash — Free Online Arcade Game, No Download";
const DESCRIPTION =
  "Play Tunnel Dash free in your browser. Dig tunnels, collect gems, and avoid enemies in this classic arcade game. No download, no signup required.";

export const Route = createFileRoute("/tools/tunnel-dash")({
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
            name: "Tunnel Dash",
            description:
              "Free browser-based tunnel digging arcade game. Collect gems and avoid enemies. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: TunnelDashPage,
});

// ---------- Grid ----------
const COLS = 18;
const ROWS = 14;
const CELL = 28;
const W = COLS * CELL;
const H = ROWS * CELL;
const MAX_LEVEL = 5;

type Cell = 0 | 1 | 2 | 3 | 4 | 5; // empty, dirt, wall, gem, rock, enemy

const EMPTY: Cell = 0;
const DIRT: Cell = 1;
const WALL: Cell = 2;
const GEM: Cell = 3;
const ROCK: Cell = 4;
const ENEMY: Cell = 5;

type Dir = "up" | "down" | "left" | "right";

interface EnemyState {
  x: number;
  y: number;
  dir: Dir;
}

function rand(n: number) {
  return Math.floor(Math.random() * n);
}

function buildLevel(level: number) {
  const grid: Cell[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      row.push(x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? WALL : DIRT);
    }
    grid.push(row);
  }
  // Player spawn area cleared
  const px = 1,
    py = 1;
  grid[py][px] = EMPTY;
  grid[py][px + 1] = EMPTY;
  grid[py + 1][px] = EMPTY;

  // Place a few internal walls (random pillars) for cover
  const pillars = 4 + level * 2;
  for (let i = 0; i < pillars; i++) {
    const x = 2 + rand(COLS - 4);
    const y = 3 + rand(ROWS - 5);
    if (grid[y][x] === DIRT) grid[y][x] = WALL;
  }

  // Place gems
  const gemCount = 14 + level * 3;
  let placed = 0,
    tries = 0;
  while (placed < gemCount && tries < 500) {
    tries++;
    const x = 1 + rand(COLS - 2);
    const y = 2 + rand(ROWS - 3);
    if (grid[y][x] === DIRT) {
      grid[y][x] = GEM;
      placed++;
    }
  }

  // Place rocks (more rocks on higher levels)
  const rockCount = 10 + level * 4;
  placed = 0;
  tries = 0;
  while (placed < rockCount && tries < 500) {
    tries++;
    const x = 1 + rand(COLS - 2);
    const y = 2 + rand(ROWS - 4);
    if (grid[y][x] === DIRT) {
      grid[y][x] = ROCK;
      placed++;
    }
  }

  // Place enemies
  const enemyCount = level; // 1..5
  const enemies: EnemyState[] = [];
  placed = 0;
  tries = 0;
  while (placed < enemyCount && tries < 500) {
    tries++;
    const x = COLS - 3 - rand(6);
    const y = ROWS - 3 - rand(4);
    if (grid[y][x] === DIRT) {
      grid[y][x] = ENEMY;
      enemies.push({ x, y, dir: "left" });
      placed++;
    }
  }

  const totalGems = gemCount;
  return { grid, enemies, player: { x: px, y: py }, totalGems };
}

function TunnelDashPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<Cell[][]>([]);
  const fallingRef = useRef<boolean[][]>([]); // rock-falling flags
  const playerRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });
  const enemiesRef = useRef<EnemyState[]>([]);
  const dirRef = useRef<Dir | null>(null);
  const tickRef = useRef(0);
  const remainingGemsRef = useRef(0);
  const timerRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const overRef = useRef(false);
  const wonRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [levelClear, setLevelClear] = useState(false);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelStateRef = useRef(1);

  // Load best
  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem("tunnel-dash-best") || "0", 10);
      if (!Number.isNaN(b)) setBest(b);
    } catch {}
  }, []);

  const saveBest = (s: number) => {
    setBest((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("tunnel-dash-best", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  };

  const initLevel = useCallback((lvl: number) => {
    const { grid, enemies, player, totalGems } = buildLevel(lvl);
    gridRef.current = grid;
    fallingRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    playerRef.current = player;
    enemiesRef.current = enemies;
    remainingGemsRef.current = totalGems;
    timerRef.current = 60 + lvl * 15;
    setTime(timerRef.current);
    dirRef.current = null;
    tickRef.current = 0;
    overRef.current = false;
    wonRef.current = false;
  }, []);

  const draw = useCallback(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    const grid = gridRef.current;
    if (!grid.length) return;

    // background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = grid[y][x];
        const px = x * CELL;
        const py = y * CELL;
        if (c === DIRT) {
          ctx.fillStyle = "#5a3a1f";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = "#3d2814";
          // sprinkle
          ctx.fillRect(px + 4, py + 6, 2, 2);
          ctx.fillRect(px + 14, py + 18, 2, 2);
          ctx.fillRect(px + 20, py + 8, 2, 2);
        } else if (c === WALL) {
          ctx.fillStyle = "#3a3a3a";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        } else if (c === GEM) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath();
          ctx.moveTo(px + CELL / 2, py + 4);
          ctx.lineTo(px + CELL - 5, py + CELL / 2);
          ctx.lineTo(px + CELL / 2, py + CELL - 4);
          ctx.lineTo(px + 5, py + CELL / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#a5f3fc";
          ctx.beginPath();
          ctx.moveTo(px + CELL / 2, py + 4);
          ctx.lineTo(px + CELL / 2 + 3, py + CELL / 2 - 2);
          ctx.lineTo(px + CELL / 2 - 3, py + CELL / 2 - 2);
          ctx.closePath();
          ctx.fill();
        } else if (c === ROCK) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = "#9ca3af";
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#d1d5db";
          ctx.beginPath();
          ctx.arc(px + CELL / 2 - 4, py + CELL / 2 - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (c === ENEMY) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(px + 8, py + 9, 4, 4);
          ctx.fillRect(px + 16, py + 9, 4, 4);
          ctx.fillStyle = "#000";
          ctx.fillRect(px + 9, py + 10, 2, 2);
          ctx.fillRect(px + 17, py + 10, 2, 2);
        } else {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(px, py, CELL, CELL);
        }
      }
    }

    // player
    const p = playerRef.current;
    const ppx = p.x * CELL;
    const ppy = p.y * CELL;
    ctx.fillStyle = "#facc15";
    ctx.fillRect(ppx + 3, ppy + 3, CELL - 6, CELL - 6);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(ppx + 8, ppy + 9, 3, 3);
    ctx.fillRect(ppx + 17, ppy + 9, 3, 3);
    ctx.fillStyle = "#000";
    ctx.fillRect(ppx + 9, ppy + 18, 10, 2);
  }, []);

  const handleDeath = useCallback(() => {
    if (overRef.current) return;
    playSound("die");
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      overRef.current = true;
      setGameOver(true);
      setRunning(false);
      saveBest(scoreRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    // Respawn at top-left
    const grid = gridRef.current;
    grid[playerRef.current.y][playerRef.current.x] = EMPTY;
    let nx = 1,
      ny = 1;
    outer: for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if (grid[y][x] === DIRT || grid[y][x] === EMPTY) {
          nx = x;
          ny = y;
          break outer;
        }
      }
    }
    playerRef.current = { x: nx, y: ny };
    if (grid[ny][nx] === DIRT) grid[ny][nx] = EMPTY;
  }, []);

  const tryMovePlayer = useCallback(() => {
    const d = dirRef.current;
    if (!d) return;
    const grid = gridRef.current;
    const p = playerRef.current;
    const dx = d === "left" ? -1 : d === "right" ? 1 : 0;
    const dy = d === "up" ? -1 : d === "down" ? 1 : 0;
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) return;
    const target = grid[ny][nx];
    if (target === WALL) return;
    if (target === ROCK) {
      // push horizontally if possible
      if (dy === 0) {
        const bx = nx + dx;
        if (bx >= 1 && bx < COLS - 1 && grid[ny][bx] === EMPTY) {
          grid[ny][bx] = ROCK;
          fallingRef.current[ny][bx] = false;
          grid[ny][nx] = EMPTY;
        } else return;
      } else return;
    }
    if (target === GEM) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      remainingGemsRef.current -= 1;
      playSound("score");
    } else if (target === DIRT) {
      playSound("click");
    }
    if (target === ENEMY) {
      grid[p.y][p.x] = EMPTY;
      playerRef.current = { x: nx, y: ny };
      handleDeath();
      return;
    }
    grid[p.y][p.x] = EMPTY;
    grid[ny][nx] = EMPTY;
    playerRef.current = { x: nx, y: ny };

    if (remainingGemsRef.current <= 0) {
      // level clear
      const timeBonus = Math.max(0, timerRef.current) * 5;
      scoreRef.current += timeBonus;
      setScore(scoreRef.current);
      wonRef.current = true;
      playSound("win");
      saveBest(scoreRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRunning(false);
      if (levelStateRef.current >= MAX_LEVEL) {
        setWon(true);
      } else {
        setLevelClear(true);
      }
    }
  }, [handleDeath]);

  const updateRocks = useCallback(() => {
    const grid = gridRef.current;
    const falling = fallingRef.current;
    // iterate bottom-up
    for (let y = ROWS - 2; y >= 1; y--) {
      for (let x = 1; x < COLS - 1; x++) {
        if (grid[y][x] !== ROCK) continue;
        const below = grid[y + 1][x];
        if (below === EMPTY) {
          grid[y + 1][x] = ROCK;
          grid[y][x] = EMPTY;
          falling[y + 1][x] = true;
          falling[y][x] = false;
        } else if (below === ENEMY && falling[y][x]) {
          // crush enemy
          const idx = enemiesRef.current.findIndex((e) => e.x === x && e.y === y + 1);
          if (idx >= 0) enemiesRef.current.splice(idx, 1);
          grid[y + 1][x] = ROCK;
          grid[y][x] = EMPTY;
          falling[y + 1][x] = true;
          falling[y][x] = false;
          scoreRef.current += 50;
          setScore(scoreRef.current);
          playSound("hit");
        } else {
          // hits player?
          const p = playerRef.current;
          if (falling[y][x] && p.x === x && p.y === y + 1) {
            falling[y][x] = false;
            handleDeath();
            return;
          }
          // rest
          if (falling[y][x]) playSound("tick");
          falling[y][x] = false;
        }
      }
    }
  }, [handleDeath]);

  const updateEnemies = useCallback(() => {
    const grid = gridRef.current;
    const dirs: Dir[] = ["up", "down", "left", "right"];
    for (const e of enemiesRef.current) {
      // try current dir, then random
      const tryDirs = [e.dir, ...dirs.filter((d) => d !== e.dir).sort(() => Math.random() - 0.5)];
      let moved = false;
      for (const d of tryDirs) {
        const dx = d === "left" ? -1 : d === "right" ? 1 : 0;
        const dy = d === "up" ? -1 : d === "down" ? 1 : 0;
        const nx = e.x + dx;
        const ny = e.y + dy;
        if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) continue;
        const t = grid[ny][nx];
        const p = playerRef.current;
        if (p.x === nx && p.y === ny) {
          // touched player
          handleDeath();
          return;
        }
        if (t === EMPTY) {
          grid[e.y][e.x] = EMPTY;
          grid[ny][nx] = ENEMY;
          e.x = nx;
          e.y = ny;
          e.dir = d;
          moved = true;
          break;
        }
      }
      if (!moved) {
        e.dir = dirs[rand(4)];
      }
    }
  }, [handleDeath]);

  const tick = useCallback(() => {
    if (overRef.current || wonRef.current) return;
    tickRef.current += 1;

    tryMovePlayer();
    if (overRef.current || wonRef.current) {
      draw();
      return;
    }
    updateRocks();
    if (overRef.current || wonRef.current) {
      draw();
      return;
    }
    if (tickRef.current % 2 === 0) {
      updateEnemies();
      if (overRef.current || wonRef.current) {
        draw();
        return;
      }
    }
    if (tickRef.current % 6 === 0) {
      timerRef.current -= 1;
      setTime(timerRef.current);
      if (timerRef.current <= 0) {
        handleDeath();
      }
    }
    draw();
  }, [draw, handleDeath, tryMovePlayer, updateEnemies, updateRocks]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(tick, 160);
  }, [tick]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    levelStateRef.current = 1;
    setLevel(1);
    initLevel(1);
    draw();
    setGameOver(false);
    setWon(false);
    setLevelClear(false);
    setRunning(true);
    startInterval();
  }, [draw, initLevel, startInterval]);

  const nextLevel = useCallback(() => {
    const lvl = levelStateRef.current + 1;
    levelStateRef.current = lvl;
    setLevel(lvl);
    initLevel(lvl);
    draw();
    setLevelClear(false);
    setRunning(true);
    startInterval();
  }, [draw, initLevel, startInterval]);

  // First render: build a level 1 board for preview
  useEffect(() => {
    initLevel(1);
    draw();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [draw, initLevel]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let d: Dir | null = null;
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") d = "up";
      else if (k === "ArrowDown" || k === "s" || k === "S") d = "down";
      else if (k === "ArrowLeft" || k === "a" || k === "A") d = "left";
      else if (k === "ArrowRight" || k === "d" || k === "D") d = "right";
      if (d) {
        e.preventDefault();
        dirRef.current = d;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D"].includes(k)) {
        dirRef.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const pressDir = (d: Dir) => {
    dirRef.current = d;
  };
  const releaseDir = () => {
    dirRef.current = null;
  };

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Tunnel Dash"
      description="Dig through the earth, collect gems, and outsmart the Crawlers!"
    >
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
            <p className="text-xs text-muted-foreground font-bold">Time</p>
            <p className="text-2xl font-black text-orange-400">{time}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Best</p>
            <p className="text-2xl font-black text-yellow-400">{best}</p>
          </div>
        </div>

        <div className="w-full max-w-[560px] mx-auto relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full rounded-xl border-2 border-border touch-none select-none bg-black"
          />
          {!running && !gameOver && !won && !levelClear && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">⛏️</p>
              <p className="text-white font-black text-2xl mb-1">Tunnel Dash</p>
              <p className="text-white/60 text-sm mb-4 px-4 text-center">
                Arrow keys / WASD on desktop. D-pad on mobile.
              </p>
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
          {levelClear && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">🎉 Level Cleared!</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-cyan-400 mb-4">Next Level: {level + 1}</p>
              <button
                onClick={nextLevel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors"
              >
                <Play className="w-4 h-4" /> Continue
              </button>
            </div>
          )}
          {won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">🏆 You Win!</p>
              <p className="text-white/70 mb-1">Final Score: {score}</p>
              <p className="text-yellow-400 mb-4">Best: {best}</p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          )}
        </div>

        {/* Mobile D-pad */}
        <div className="mt-6 flex justify-center sm:hidden">
          <div className="grid grid-cols-3 gap-2 w-44">
            <div />
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                pressDir("up");
              }}
              onPointerUp={releaseDir}
              onPointerLeave={releaseDir}
              className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center active:bg-yellow-400 active:text-black"
              aria-label="Up"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div />
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                pressDir("left");
              }}
              onPointerUp={releaseDir}
              onPointerLeave={releaseDir}
              className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center active:bg-yellow-400 active:text-black"
              aria-label="Left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div />
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                pressDir("right");
              }}
              onPointerUp={releaseDir}
              onPointerLeave={releaseDir}
              className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center active:bg-yellow-400 active:text-black"
              aria-label="Right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div />
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                pressDir("down");
              }}
              onPointerUp={releaseDir}
              onPointerLeave={releaseDir}
              className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center active:bg-yellow-400 active:text-black"
              aria-label="Down"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div />
          </div>
        </div>
      </div>

      <AdZone id="tunnel-dash-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Move with arrow keys or WASD on desktop, or hold the on-screen D-pad on mobile, to dig through the dirt.",
          "Collect every gem to clear the level. Push rocks sideways and let them fall on Crawlers for bonus points.",
          "Avoid Crawlers and falling rocks — you have 3 lives and a time bonus rewards a fast finish.",
        ]}
      />

      <ToolSeoContent
        title="Free Tunnel Dash Game Online — Dodge Obstacles at High Speed"
        description="Play Tunnel Dash free online. Navigate through an endless tunnel dodging walls and obstacles at increasing speed. Free, no signup, works on mobile."
        body={[
          "Skycally's Tunnel Dash is a fast-paced endless runner where you steer a ball through a rotating 3D tunnel, dodging colored obstacle sections that block part of the tunnel's circumference. Only the gaps in each obstacle let you pass — steer left or right to align with the gap before the obstacle reaches you.",
          "The game accelerates continuously as you progress, demanding faster reactions and more precise steering with each passing second. The tunnel's visual rotation creates a sense of vertiginous speed that intensifies with every obstacle survived. A single collision ends the run — there are no lives or second chances.",
          "Tunnel Dash belongs to the precision reflex genre — games where the core skill is rapid visual processing and motor response rather than strategy or planning. Reaction time, spatial awareness, and the ability to read upcoming obstacles while managing current position are the key competencies the game trains.",
          "The further you survive, the higher your score. Your best run is saved locally for a personal record. The deceptively simple mechanic — just steer left or right — becomes genuinely challenging at high speeds when multiple obstacles appear in rapid succession with shrinking gaps and faster rotation.",
        ]}
        faqs={[
          {
            question: "How do I control the ball?",
            answer:
              "Use left/right arrow keys or A/D on desktop. Tap left or right side of the screen on mobile. Steer to align with the gap in each obstacle before it reaches you.",
          },
          {
            question: "What ends the game?",
            answer:
              "Hitting any colored obstacle section ends your run immediately. There are no lives — one collision and it's over.",
          },
          {
            question: "Does the game get faster?",
            answer:
              "Yes. Speed increases continuously as you survive longer, making obstacles harder to react to over time.",
          },
          {
            question: "Is my high score saved?",
            answer: "Yes. Your best distance or score is saved in your browser's localStorage.",
          },
          {
            question: "What are the colored sections?",
            answer:
              "Colored sections are the obstacle walls. Only the gaps (uncolored sections) are safe to pass through. Steer to align with the gap.",
          },
          {
            question: "Is there a pause feature?",
            answer:
              "Check the game controls — pressing Escape or clicking a pause button may freeze the tunnel temporarily.",
          },
          {
            question: "How do I improve at Tunnel Dash?",
            answer:
              "Focus on reading the next obstacle's gap early, not the current one. Anticipating several obstacles ahead gives you more time to react.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. Tap the left or right side of the screen to steer. The game is optimized for touch controls.",
          },
        ]}
      />

      <RelatedTools currentSlug="tunnel-dash" />
    </ToolPageShell>
  );
}
