import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { DPad, PadButton } from "@/components/game-controls";

export const Route = createFileRoute("/tools/tetris")({
  head: () => buildToolMeta(toolBySlug("tetris", tools)),
  component: TetrisPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const DESKTOP_CELL = 30; // fixed on desktop — identical to original

const COLORS: Record<string, string> = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
};

const TETROMINOES: Record<string, number[][][]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  O: [
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 0],
    ],
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
      [0, 0, 0],
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
  ],
};

type PieceType = keyof typeof TETROMINOES;
type Board = (string | null)[][];
interface Piece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

const PIECE_TYPES = Object.keys(TETROMINOES) as PieceType[];
const LEVEL_SPEEDS = [800, 720, 630, 550, 470, 380, 300, 220, 130, 100, 80, 80, 80, 70, 70, 70, 50, 50, 50, 30];
const SCORE_TABLE = [0, 100, 300, 500, 800];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const createEmptyBoard = (): Board => Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
const randomPiece = (): PieceType => PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
const getShape = (type: PieceType, rotation: number): number[][] => {
  const rots = TETROMINOES[type];
  return rots[((rotation % rots.length) + rots.length) % rots.length];
};
const spawnPiece = (type: PieceType): Piece => ({
  type,
  rotation: 0,
  x: Math.floor(COLS / 2) - 2,
  y: 0,
});
const isColliding = (board: Board, piece: Piece, dx = 0, dy = 0, dr = 0): boolean => {
  const shape = getShape(piece.type, piece.rotation + dr);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx,
        ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  return false;
};
const placePiece = (board: Board, piece: Piece): Board => {
  const nb = board.map((r) => [...r]);
  const shape = getShape(piece.type, piece.rotation);
  shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) {
        const ny = piece.y + r,
          nx = piece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) nb[ny][nx] = COLORS[piece.type];
      }
    }),
  );
  return nb;
};
const clearLines = (board: Board): { board: Board; cleared: number } => {
  const kept = board.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - kept.length;
  return {
    board: [...Array.from({ length: cleared }, () => Array<string | null>(COLS).fill(null)), ...kept],
    cleared,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────
function TetrisPage() {
  // Separate canvas refs for desktop and mobile boards
  const canvasDesktopRef = useRef<HTMLCanvasElement>(null);
  const canvasMobileRef = useRef<HTMLCanvasElement>(null);
  // Two separate next-piece canvases: one for desktop, one for mobile
  const nextDesktopRef = useRef<HTMLCanvasElement>(null);
  const nextMobileRef = useRef<HTMLCanvasElement>(null);
  // Container for the mobile board column (measured by ResizeObserver)
  const boardColRef = useRef<HTMLDivElement>(null);

  const boardRef = useRef<Board>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextPieceRef = useRef<PieceType>(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cellSize: 30 on desktop, dynamic on mobile
  const [cellSize, setCellSize] = useState(DESKTOP_CELL);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "over">("idle");

  // ── Load best ──
  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem("tetris-best") || "0", 10);
      if (!isNaN(s)) setBest(s);
    } catch {
      /* noop */
    }
  }, []);

  // ── Mobile: measure board column via ResizeObserver ──
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setCellSize(DESKTOP_CELL);
      return;
    }
    const el = boardColRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      if (w > 0) setCellSize(Math.max(14, Math.min(Math.floor(w / COLS), DESKTOP_CELL)));
    });
    obs.observe(el);
    // Also handle orientation change
    const onResize = () => {
      if (window.innerWidth >= 1024) setCellSize(DESKTOP_CELL);
    };
    window.addEventListener("resize", onResize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const canvasW = COLS * cellSize;
  const canvasH = ROWS * cellSize;
  const nextSize = Math.max(60, cellSize * 4);

  // ── Draw helpers ──
  const drawCell = (ctx: CanvasRenderingContext2D, c: number, r: number, color: string, cs: number) => {
    const x = c * cs,
      y = r * cs;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 1, y + 1, cs - 2, Math.max(3, cs * 0.12));
    ctx.fillRect(x + 1, y + 1, Math.max(3, cs * 0.12), cs - 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + 1, y + cs - Math.max(4, cs * 0.14), cs - 2, Math.max(4, cs * 0.14));
    ctx.fillRect(x + cs - Math.max(4, cs * 0.14), y + 1, Math.max(4, cs * 0.14), cs - 2);
  };

  const drawBoard = useCallback(() => {
    const paint = (canvas: HTMLCanvasElement | null, cs: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = COLS * cs,
        h = ROWS * cs;

      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cs);
        ctx.lineTo(w, r * cs);
        ctx.stroke();
      }
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cs, 0);
        ctx.lineTo(c * cs, h);
        ctx.stroke();
      }

      boardRef.current.forEach((row, r) =>
        row.forEach((color, c) => {
          if (color) drawCell(ctx, c, r, color, cs);
        }),
      );

      const piece = pieceRef.current;
      if (piece) {
        let ghostY = piece.y;
        while (!isColliding(boardRef.current, piece, 0, ghostY - piece.y + 1)) ghostY++;
        const shape = getShape(piece.type, piece.rotation);
        if (ghostY !== piece.y) {
          shape.forEach((row, r) =>
            row.forEach((cv, c) => {
              if (!cv) return;
              ctx.strokeStyle = COLORS[piece.type];
              ctx.globalAlpha = 0.35;
              ctx.lineWidth = 1.5;
              ctx.strokeRect((piece.x + c) * cs + 2, (ghostY + r) * cs + 2, cs - 4, cs - 4);
              ctx.globalAlpha = 1;
            }),
          );
        }
        shape.forEach((row, r) =>
          row.forEach((cv, c) => {
            if (cv && piece.y + r >= 0) drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type], cs);
          }),
        );
      }
    };
    paint(canvasDesktopRef.current, DESKTOP_CELL);
    paint(canvasMobileRef.current, cellSize);
  }, [cellSize]);

  const drawNext = useCallback(() => {
    const paint = (canvas: HTMLCanvasElement | null, size: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, size, size);
      const type = nextPieceRef.current;
      const shape = getShape(type, 0);
      const cs = Math.floor(size / 5);
      const ox = (size - shape[0].length * cs) / 2;
      const oy = (size - shape.length * cs) / 2;
      shape.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (!cell) return;
          const x = ox + c * cs,
            y = oy + r * cs;
          ctx.fillStyle = COLORS[type];
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.fillRect(x + 1, y + 1, cs - 2, 3);
        }),
      );
    };
    paint(nextDesktopRef.current, 100);
    paint(nextMobileRef.current, nextSize);
  }, [nextSize]);

  useEffect(() => {
    drawBoard();
    drawNext();
  }, [cellSize, drawBoard, drawNext]);

  // ── Game loop ──
  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    const board = boardRef.current;
    const piece = pieceRef.current;
    if (!piece) return;

    if (!isColliding(board, piece, 0, 1)) {
      pieceRef.current = { ...piece, y: piece.y + 1 };
    } else {
      const nb = placePiece(board, piece);
      const { board: cb, cleared } = clearLines(nb);
      boardRef.current = cb;
      playSound("place");
      if (cleared > 0) playSound("clear");

      const pts = SCORE_TABLE[cleared] * levelRef.current;
      scoreRef.current += pts;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);

      try {
        const stored = parseInt(localStorage.getItem("tetris-best") || "0", 10) || 0;
        if (scoreRef.current > stored) {
          setBest(scoreRef.current);
          localStorage.setItem("tetris-best", String(scoreRef.current));
        }
      } catch {
        /* noop */
      }

      const nextType = nextPieceRef.current;
      const newPiece = spawnPiece(nextType);
      nextPieceRef.current = randomPiece();

      if (isColliding(cb, newPiece)) {
        pieceRef.current = null;
        setPhase("over");
        playSound("lose");
        if (intervalRef.current) clearInterval(intervalRef.current);
        drawBoard();
        drawNext();
        return;
      }
      pieceRef.current = newPiece;
      if (intervalRef.current) clearInterval(intervalRef.current);
      const speed = LEVEL_SPEEDS[Math.min(levelRef.current - 1, LEVEL_SPEEDS.length - 1)];
      intervalRef.current = setInterval(() => tickRef.current(), speed);
    }
    drawBoard();
    drawNext();
  }, [drawBoard, drawNext]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);
  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const startGame = () => {
    boardRef.current = createEmptyBoard();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    pieceRef.current = spawnPiece(randomPiece());
    nextPieceRef.current = randomPiece();
    setScore(0);
    setLines(0);
    setLevel(1);
    setPhase("playing");
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), LEVEL_SPEEDS[0]);
    drawBoard();
    drawNext();
  };

  const togglePause = () => {
    if (phase === "playing") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("paused");
    } else if (phase === "paused") {
      const speed = LEVEL_SPEEDS[Math.min(levelRef.current - 1, LEVEL_SPEEDS.length - 1)];
      intervalRef.current = setInterval(() => tickRef.current(), speed);
      setPhase("playing");
    }
  };

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "paused" && ["p", "P", "Escape"].includes(e.key)) {
        togglePause();
        return;
      }
      if (phase !== "playing") return;
      const p = pieceRef.current;
      if (!p) return;
      switch (e.key) {
        case "ArrowLeft":
          if (!isColliding(boardRef.current, p, -1)) pieceRef.current = { ...p, x: p.x - 1 };
          break;
        case "ArrowRight":
          if (!isColliding(boardRef.current, p, 1)) pieceRef.current = { ...p, x: p.x + 1 };
          break;
        case "ArrowDown":
          if (!isColliding(boardRef.current, p, 0, 1)) {
            pieceRef.current = { ...p, y: p.y + 1 };
            scoreRef.current++;
            setScore(scoreRef.current);
          }
          break;
        case "ArrowUp":
        case "x":
        case "X": {
          const r = { ...p, rotation: p.rotation + 1 };
          if (!isColliding(boardRef.current, r)) pieceRef.current = r;
          else if (!isColliding(boardRef.current, { ...r, x: r.x + 1 })) pieceRef.current = { ...r, x: r.x + 1 };
          else if (!isColliding(boardRef.current, { ...r, x: r.x - 1 })) pieceRef.current = { ...r, x: r.x - 1 };
          break;
        }
        case "z":
        case "Z": {
          const r = { ...p, rotation: p.rotation - 1 };
          if (!isColliding(boardRef.current, r)) pieceRef.current = r;
          break;
        }
        case " ": {
          e.preventDefault();
          playSound("tetrisDrop");
          let dy = p.y;
          while (!isColliding(boardRef.current, p, 0, dy - p.y + 1)) dy++;
          scoreRef.current += (dy - p.y) * 2;
          pieceRef.current = { ...p, y: dy };
          setScore(scoreRef.current);
          tick();
          return;
        }
        case "p":
        case "P":
        case "Escape":
          togglePause();
          return;
      }
      drawBoard();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Touch swipe on canvas ──
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || phase !== "playing") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const p = pieceRef.current;
    if (!p) return;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 200) {
      const r = { ...p, rotation: p.rotation + 1 };
      if (!isColliding(boardRef.current, r)) pieceRef.current = r;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      const dir = dx > 0 ? 1 : -1;
      const steps = Math.min(Math.round(Math.abs(dx) / cellSize), 5);
      let newX = p.x;
      for (let i = 0; i < steps; i++) if (!isColliding(boardRef.current, { ...p, x: newX + dir })) newX += dir;
      pieceRef.current = { ...p, x: newX };
    } else if (dy > 50) {
      let dropY = p.y;
      while (!isColliding(boardRef.current, p, 0, dropY - p.y + 1)) dropY++;
      pieceRef.current = { ...p, y: dropY };
      tick();
      return;
    } else if (dy < -50) {
      const r = { ...p, rotation: p.rotation + 1 };
      if (!isColliding(boardRef.current, r)) pieceRef.current = r;
    }
    drawBoard();
  };

  // ── Shared overlays ──
  const Overlay = () => (
    <>
      {phase === "idle" && (
        <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-4xl">🧱</p>
          <p className="text-white font-black text-2xl tracking-widest">TETRIS</p>
          <p className="text-white/50 text-[11px] text-center leading-relaxed">
            Arrows to move · Up/X rotate · Space drop
          </p>
          <button
            onClick={startGame}
            className="mt-1 px-7 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-base hover:opacity-90 transition"
          >
            ▶ Play
          </button>
          {best > 0 && <p className="text-yellow-400 text-xs">🏆 Best: {best}</p>}
        </div>
      )}
      {phase === "paused" && (
        <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center gap-4">
          <p className="text-white font-black text-xl">⏸ PAUSED</p>
          <button
            onClick={togglePause}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition"
          >
            ▶ Resume
          </button>
        </div>
      )}
      {phase === "over" && (
        <div className="absolute inset-0 bg-black/85 rounded-xl flex flex-col items-center justify-center gap-2.5 p-4">
          <p className="text-3xl">💀</p>
          <p className="text-white font-black text-xl">GAME OVER</p>
          <p className="text-white/60 text-sm">Score: {score}</p>
          {score >= best && score > 0 && <p className="text-yellow-400 font-bold text-sm">🏆 New Best!</p>}
          <button
            onClick={startGame}
            className="mt-1 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition"
          >
            🔄 Play Again
          </button>
        </div>
      )}
    </>
  );

  // ── DPad handler ──
  const handleDpad = (dir: "up" | "down" | "left" | "right") => {
    const p = pieceRef.current;
    if (!p || phase !== "playing") return;
    if (dir === "up") {
      const r = { ...p, rotation: p.rotation + 1 };
      if (!isColliding(boardRef.current, r)) pieceRef.current = r;
      else if (!isColliding(boardRef.current, { ...r, x: r.x + 1 })) pieceRef.current = { ...r, x: r.x + 1 };
      else if (!isColliding(boardRef.current, { ...r, x: r.x - 1 })) pieceRef.current = { ...r, x: r.x - 1 };
    } else if (dir === "left") {
      if (!isColliding(boardRef.current, p, -1)) pieceRef.current = { ...p, x: p.x - 1 };
    } else if (dir === "right") {
      if (!isColliding(boardRef.current, p, 1)) pieceRef.current = { ...p, x: p.x + 1 };
    } else if (dir === "down") {
      if (!isColliding(boardRef.current, p, 0, 1)) {
        pieceRef.current = { ...p, y: p.y + 1 };
        scoreRef.current++;
        setScore(scoreRef.current);
      }
    }
    drawBoard();
  };

  // ── Stat box ──
  const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-black ${color ?? "text-foreground"}`}>{value}</p>
    </div>
  );

  return (
    <ToolPageShell
      title="Tetris"
      description="Stack falling blocks and clear lines in the ultimate classic arcade game!"
    >
      {/* ══ DESKTOP layout (lg+) — identical to original ══ */}
      <div className="hidden lg:flex flex-row gap-6 items-start justify-center select-none">
        {/* Board */}
        <div className="relative">
          <canvas
            ref={canvasDesktopRef}
            width={COLS * DESKTOP_CELL}
            height={ROWS * DESKTOP_CELL}
            className="rounded-xl border-2 border-border block touch-none"
          />
          <Overlay />
        </div>
        {/* Side panel */}
        <div className="flex flex-col gap-3 w-40">
          <Stat label="Score" value={score} />
          <Stat label="Best" value={best} color="text-yellow-400" />
          <Stat label="Level" value={level} color="text-primary" />
          <Stat label="Lines" value={lines} />
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Next</p>
            <canvas ref={nextDesktopRef} width={100} height={100} className="mx-auto rounded-lg" />
          </div>
          {phase === "playing" && (
            <button
              onClick={togglePause}
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition"
            >
              ⏸ Pause
            </button>
          )}
        </div>
      </div>

      {/* ══ MOBILE layout (<lg) ══ */}
      <div className="flex lg:hidden select-none gap-2 w-full">
        {/* Compact side panel */}
        <div className="flex flex-col gap-1.5 shrink-0 w-[76px]">
          {(["Score", "Best", "Level", "Lines"] as const).map((l) => (
            <div key={l} className="bg-card border border-border rounded-lg p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-0.5">
                {l}
              </p>
              <p
                className={`text-sm font-black leading-none ${l === "Best" ? "text-yellow-400" : l === "Level" ? "text-primary" : "text-foreground"}`}
              >
                {l === "Score" ? score : l === "Best" ? best : l === "Level" ? level : lines}
              </p>
            </div>
          ))}
          <div className="bg-card border border-border rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-1">
              Next
            </p>
            <canvas
              ref={nextMobileRef}
              width={nextSize}
              height={nextSize}
              className="mx-auto rounded"
              style={{ width: nextSize, height: nextSize }}
            />
          </div>
          {phase === "playing" && (
            <button
              onClick={togglePause}
              className="w-full px-1 py-1 rounded-lg border border-border bg-card text-foreground text-[9px] font-bold hover:bg-secondary transition"
            >
              ⏸ Pause
            </button>
          )}
        </div>

        {/* Board column — measured by ResizeObserver */}
        <div ref={boardColRef} className="flex-1 min-w-0">
          <div className="relative" style={{ width: canvasW, height: canvasH }}>
            <canvas
              ref={canvasMobileRef}
              width={canvasW}
              height={canvasH}
              className="rounded-xl border-2 border-border block touch-none"
              style={{ width: canvasW, height: canvasH }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
            <Overlay />
          </div>
        </div>
      </div>

      {/* ══ Mobile controls ══ */}
      <div className="flex flex-col items-center gap-2 mt-3 lg:hidden">
        <DPad
          repeatMs={100}
          initialDelayMs={160}
          enabled={{ up: true, left: true, right: true, down: true }}
          onDirection={handleDpad}
        />
        <PadButton
          onPress={() => {
            const p = pieceRef.current;
            if (!p || phase !== "playing") return;
            let dy = p.y;
            while (!isColliding(boardRef.current, p, 0, dy - p.y + 1)) dy++;
            scoreRef.current += (dy - p.y) * 2;
            pieceRef.current = { ...p, y: dy };
            setScore(scoreRef.current);
            tick();
          }}
          aria-label="Hard drop"
          className="w-36 h-12 text-sm bg-primary text-primary-foreground border-primary"
        >
          ▼▼ HARD DROP
        </PadButton>
      </div>

      {/* ══ How to use ══ */}
      <HowToUse
        steps={[
          "Use the arrow keys to move and rotate pieces — Up or X rotates clockwise, Z rotates counter-clockwise.",
          "Press Space for an instant hard drop to the bottom.",
          "Clear complete horizontal lines to score points. Clearing 4 lines at once scores a Tetris bonus!",
          "On mobile: tap the board to rotate, swipe left/right to move, swipe down to drop. Use the D-Pad and Hard Drop button below.",
        ]}
      />

      <RelatedTools currentSlug="tetris" />

      {/* ══ SEO content ══ */}
      <ToolSeoContent
        title="Tetris Online — Free Classic Block Game, No Download"
        description="Play Tetris free in your browser. Stack tetrominoes, clear lines, and level up endlessly. Full keyboard controls and mobile touch support — no download, no account needed."
        body={[
          "Tetris is the most iconic puzzle game ever made. First released in 1984, it has been played by hundreds of millions of people worldwide. The goal is simple: rotate and position falling tetrominoes to fill complete horizontal lines, which then disappear and earn you points. As you clear more lines, the level increases and the blocks fall faster — making every game a thrilling race against time.",
          "Skycally's free Tetris includes all 7 classic tetrominoes (I, O, T, S, Z, J, L), a ghost piece that shows exactly where your block will land, instant hard drop, wall-kick rotation for tight spaces, and a next-piece preview so you can plan ahead. Your best score is automatically saved in your browser.",
          "No download, no account, no ads interrupting your game. Play directly in your browser on any device — desktop, tablet, or mobile. Controls adapt automatically: keyboard on desktop, touch swipes and on-screen D-Pad on mobile.",
        ]}
        faqs={[
          {
            question: "How do I play Tetris online?",
            answer:
              "Use the left/right arrow keys to move pieces, Up or X to rotate clockwise, Z to rotate counter-clockwise, Down for a soft drop, and Space for an instant hard drop. On mobile, tap the board to rotate and use the D-Pad buttons below the board.",
          },
          {
            question: "What is the ghost piece in Tetris?",
            answer:
              "The ghost piece is a transparent outline that shows exactly where your current tetromino will land if you drop it straight down. It helps you place pieces more accurately without guessing.",
          },
          {
            question: "How does scoring work in Tetris?",
            answer:
              "Clearing 1 line gives 100 × level points, 2 lines = 300 × level, 3 lines = 500 × level, and 4 lines (a Tetris!) = 800 × level. Soft drop adds 1 point per row, hard drop adds 2 points per row.",
          },
          {
            question: "Does the game get faster?",
            answer:
              "Yes! Every 10 lines cleared increases the level by 1, which speeds up the falling pieces. The game starts comfortably and becomes a serious challenge from level 10 onward.",
          },
          {
            question: "Does Tetris work on mobile?",
            answer:
              "Fully. Tap the board to rotate a piece, swipe left/right to move it, and swipe down to hard drop. You can also use the on-screen D-Pad and Hard Drop button that appears below the board on mobile.",
          },
          {
            question: "Is this Tetris game free?",
            answer:
              "Completely free — no download, no sign-up, and no account required. Just open the page and play instantly in your browser.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
