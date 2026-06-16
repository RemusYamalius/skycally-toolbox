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

// ─── Constants ───────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;

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
  const r = ((rotation % rots.length) + rots.length) % rots.length;
  return rots[r];
};

const spawnPiece = (type: PieceType): Piece => ({
  type,
  rotation: 0,
  x: Math.floor(COLS / 2) - 2,
  y: 0,
});

const isColliding = (board: Board, piece: Piece, dx = 0, dy = 0, dr = 0): boolean => {
  const shape = getShape(piece.type, piece.rotation + dr);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
};

const placePiece = (board: Board, piece: Piece): Board => {
  const newBoard = board.map((r) => [...r]);
  const shape = getShape(piece.type, piece.rotation);
  shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          newBoard[ny][nx] = COLORS[piece.type];
        }
      }
    });
  });
  return newBoard;
};

const clearLines = (board: Board): { board: Board; cleared: number } => {
  const kept = board.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - kept.length;
  const empty: Board = Array.from({ length: cleared }, () => Array<string | null>(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
};

// ─── Component ────────────────────────────────────────────────────────────────
function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasMobileRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const boardRef = useRef<Board>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextPieceRef = useRef<PieceType>(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Responsive cell size: fills available width
  const [cellSize, setCellSize] = useState(30);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "over">("idle");

  // ── Load best ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = parseInt(localStorage.getItem("tetris-best") || "0", 10);
      if (!isNaN(stored)) setBest(stored);
    } catch {
      /* noop */
    }
  }, []);

  // ── Responsive sizing: compute cell size so board fits inside container ──
  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        // On mobile: board takes full width minus side panel (≈80px) and some padding
        const available = containerRef.current.clientWidth - 88 - 16; // side panel + gap
        const cell = Math.floor(available / COLS);
        setCellSize(Math.max(16, Math.min(cell, 32)));
      } else {
        // Desktop: limit board height to 72vh
        const maxH = window.innerHeight * 0.72;
        const cellByH = Math.floor(maxH / ROWS);
        setCellSize(Math.min(cellByH, 34));
      }
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // ── Canvas dimensions derived from cellSize ──
  const canvasW = COLS * cellSize;
  const canvasH = ROWS * cellSize;
  const nextSize = cellSize * 4;

  // ── Draw helpers ──
  const drawCell = (ctx: CanvasRenderingContext2D, c: number, r: number, color: string, cell: number) => {
    const x = c * cell;
    const y = r * cell;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 1, y + 1, cell - 2, Math.max(3, cell * 0.13));
    ctx.fillRect(x + 1, y + 1, Math.max(3, cell * 0.13), cell - 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + 1, y + cell - Math.max(4, cell * 0.15), cell - 2, Math.max(4, cell * 0.15));
    ctx.fillRect(x + cell - Math.max(4, cell * 0.15), y + 1, Math.max(4, cell * 0.15), cell - 2);
  };

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = cellSize;
    const w = COLS * cell;
    const h = ROWS * cell;

    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cell);
      ctx.lineTo(w, r * cell);
      ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cell, 0);
      ctx.lineTo(c * cell, h);
      ctx.stroke();
    }

    // Board cells
    boardRef.current.forEach((row, r) => {
      row.forEach((color, c) => {
        if (color) drawCell(ctx, c, r, color, cell);
      });
    });

    const piece = pieceRef.current;
    if (piece) {
      // Ghost
      let ghostY = piece.y;
      while (!isColliding(boardRef.current, piece, 0, ghostY - piece.y + 1)) ghostY++;
      const shape = getShape(piece.type, piece.rotation);
      if (ghostY !== piece.y) {
        shape.forEach((row, r) => {
          row.forEach((cv, c) => {
            if (cv) {
              const x = (piece.x + c) * cell;
              const y = (ghostY + r) * cell;
              ctx.strokeStyle = COLORS[piece.type];
              ctx.globalAlpha = 0.35;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
              ctx.globalAlpha = 1;
            }
          });
        });
      }
      // Active piece
      shape.forEach((row, r) => {
        row.forEach((cv, c) => {
          if (cv && piece.y + r >= 0) {
            drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type], cell);
          }
        });
      });
    }
  }, [cellSize]);

  const drawNextPiece = useCallback(() => {
    const drawOn = (canvas: HTMLCanvasElement | null, size: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, size, size);
      const type = nextPieceRef.current;
      const shape = getShape(type, 0);
      const cs = Math.floor(size / 5);
      const offsetX = (size - shape[0].length * cs) / 2;
      const offsetY = (size - shape.length * cs) / 2;
      shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const x = offsetX + c * cs;
            const y = offsetY + r * cs;
            ctx.fillStyle = COLORS[type];
            ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            ctx.fillStyle = "rgba(255,255,255,0.28)";
            ctx.fillRect(x + 1, y + 1, cs - 2, 3);
          }
        });
      });
    };
    drawOn(nextCanvasRef.current, 100);
    drawOn(nextCanvasMobileRef.current, nextSize);
  }, [nextSize]);

  // Re-draw when cellSize changes
  useEffect(() => {
    drawBoard();
    drawNextPiece();
  }, [cellSize, drawBoard, drawNextPiece]);

  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    const board = boardRef.current;
    const piece = pieceRef.current;
    if (!piece) return;

    if (!isColliding(board, piece, 0, 1)) {
      pieceRef.current = { ...piece, y: piece.y + 1 };
    } else {
      const newBoard = placePiece(board, piece);
      const { board: clearedBoard, cleared } = clearLines(newBoard);
      boardRef.current = clearedBoard;
      playSound("place");
      if (cleared > 0) playSound("clear");

      const points = SCORE_TABLE[cleared] * levelRef.current;
      scoreRef.current += points;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;

      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);

      if (typeof window !== "undefined") {
        const storedBest = parseInt(localStorage.getItem("tetris-best") || "0", 10) || 0;
        if (scoreRef.current > storedBest) {
          setBest(scoreRef.current);
          try {
            localStorage.setItem("tetris-best", String(scoreRef.current));
          } catch {
            /* noop */
          }
        }
      }

      const nextType = nextPieceRef.current;
      const newPiece = spawnPiece(nextType);
      nextPieceRef.current = randomPiece();

      if (isColliding(clearedBoard, newPiece)) {
        pieceRef.current = null;
        setPhase("over");
        playSound("lose");
        if (intervalRef.current) clearInterval(intervalRef.current);
        drawBoard();
        drawNextPiece();
        return;
      }
      pieceRef.current = newPiece;

      if (intervalRef.current) clearInterval(intervalRef.current);
      const speed = LEVEL_SPEEDS[Math.min(levelRef.current - 1, LEVEL_SPEEDS.length - 1)];
      intervalRef.current = setInterval(() => tickRef.current(), speed);
    }

    drawBoard();
    drawNextPiece();
  }, [drawBoard, drawNextPiece]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startGame = () => {
    boardRef.current = createEmptyBoard();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    const type = randomPiece();
    pieceRef.current = spawnPiece(type);
    nextPieceRef.current = randomPiece();
    setScore(0);
    setLines(0);
    setLevel(1);
    setPhase("playing");
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), LEVEL_SPEEDS[0]);
    drawBoard();
    drawNextPiece();
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

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "paused" && (e.key === "p" || e.key === "P" || e.key === "Escape")) {
        togglePause();
        return;
      }
      if (phase !== "playing") return;
      const piece = pieceRef.current;
      if (!piece) return;

      switch (e.key) {
        case "ArrowLeft":
          if (!isColliding(boardRef.current, piece, -1)) pieceRef.current = { ...piece, x: piece.x - 1 };
          break;
        case "ArrowRight":
          if (!isColliding(boardRef.current, piece, 1)) pieceRef.current = { ...piece, x: piece.x + 1 };
          break;
        case "ArrowDown":
          if (!isColliding(boardRef.current, piece, 0, 1)) {
            pieceRef.current = { ...piece, y: piece.y + 1 };
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
          break;
        case "ArrowUp":
        case "x":
        case "X": {
          const rotated = { ...piece, rotation: piece.rotation + 1 };
          if (!isColliding(boardRef.current, rotated)) pieceRef.current = rotated;
          else if (!isColliding(boardRef.current, { ...rotated, x: rotated.x + 1 }))
            pieceRef.current = { ...rotated, x: rotated.x + 1 };
          else if (!isColliding(boardRef.current, { ...rotated, x: rotated.x - 1 }))
            pieceRef.current = { ...rotated, x: rotated.x - 1 };
          break;
        }
        case "z":
        case "Z": {
          const rotatedCCW = { ...piece, rotation: piece.rotation - 1 };
          if (!isColliding(boardRef.current, rotatedCCW)) pieceRef.current = rotatedCCW;
          break;
        }
        case " ": {
          e.preventDefault();
          playSound("tetrisDrop");
          let dropY = piece.y;
          while (!isColliding(boardRef.current, piece, 0, dropY - piece.y + 1)) dropY++;
          scoreRef.current += (dropY - piece.y) * 2;
          pieceRef.current = { ...piece, y: dropY };
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
    const piece = pieceRef.current;
    if (!piece) return;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 200) {
      const rotated = { ...piece, rotation: piece.rotation + 1 };
      if (!isColliding(boardRef.current, rotated)) pieceRef.current = rotated;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      const dir = dx > 0 ? 1 : -1;
      const steps = Math.min(Math.round(Math.abs(dx) / cellSize), 5);
      let newX = piece.x;
      for (let i = 0; i < steps; i++) {
        if (!isColliding(boardRef.current, { ...piece, x: newX + dir })) newX += dir;
      }
      pieceRef.current = { ...piece, x: newX };
    } else if (dy > 50) {
      let dropY = piece.y;
      while (!isColliding(boardRef.current, piece, 0, dropY - piece.y + 1)) dropY++;
      pieceRef.current = { ...piece, y: dropY };
      tick();
      return;
    } else if (dy < -50) {
      const rotated = { ...piece, rotation: piece.rotation + 1 };
      if (!isColliding(boardRef.current, rotated)) pieceRef.current = rotated;
    }
    drawBoard();
  };

  // ── Stat box ──
  const StatBox = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div className="bg-card border border-border rounded-lg p-2 text-center">
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className={`text-base font-black leading-none ${color ?? "text-foreground"}`}>{value}</p>
    </div>
  );

  // ── Board canvas (shared) ──
  const BoardCanvas = () => (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="rounded-xl border-2 border-border block touch-none"
        style={{ width: canvasW, height: canvasH }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

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
    </div>
  );

  return (
    <ToolPageShell
      title="Tetris"
      description="Stack falling blocks and clear lines in the ultimate classic arcade game!"
    >
      {/* ══ DESKTOP layout (lg+): board left, side panel right — identical to original ══ */}
      <div ref={containerRef} className="hidden lg:flex flex-row gap-6 items-start justify-center select-none">
        {/* Board */}
        <BoardCanvas />

        {/* Side panel */}
        <div className="flex flex-col gap-3 w-40">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Score</p>
            <p className="text-xl font-black text-foreground">{score}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Best</p>
            <p className="text-xl font-black text-yellow-400">{best}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Level</p>
            <p className="text-xl font-black text-primary">{level}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Lines</p>
            <p className="text-xl font-black text-foreground">{lines}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Next</p>
            <canvas ref={nextCanvasRef} width={100} height={100} className="mx-auto rounded-lg" />
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

      {/* ══ MOBILE layout (<lg): side panel + board side by side, controls below ══ */}
      <div className="flex lg:hidden flex-row gap-3 w-full items-start select-none">
        {/* Side panel — compact column */}
        <div className="flex flex-col gap-2 w-20 shrink-0">
          <StatBox label="Score" value={score} />
          <StatBox label="Best" value={best} color="text-yellow-400" />
          <StatBox label="Level" value={level} color="text-primary" />
          <StatBox label="Lines" value={lines} />
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-1">
              Next
            </p>
            <canvas
              ref={nextCanvasMobileRef}
              width={nextSize}
              height={nextSize}
              className="mx-auto rounded"
              style={{ width: nextSize, height: nextSize }}
            />
          </div>
          {phase === "playing" && (
            <button
              onClick={togglePause}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-[10px] font-bold hover:bg-secondary transition"
            >
              ⏸ Pause
            </button>
          )}
        </div>

        {/* Board — takes remaining width */}
        <div className="flex-1 min-w-0">
          <BoardCanvas />
        </div>
      </div>

      {/* ── Mobile on-screen controls — below board, same screen on most phones ── */}
      <div className="flex flex-col items-center gap-2 mt-4 lg:hidden">
        <DPad
          repeatMs={100}
          initialDelayMs={160}
          enabled={{ up: true, left: true, right: true, down: true }}
          onDirection={(dir: "up" | "down" | "left" | "right") => {
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
                scoreRef.current += 1;
                setScore(scoreRef.current);
              }
            }
            drawBoard();
          }}
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

      {/* ── How to use ── */}
      <HowToUse
        steps={[
          "Use the arrow keys to move pieces left, right, or down. Press Up or X to rotate clockwise.",
          "Press Space for an instant hard drop — the piece falls straight to the bottom.",
          "Clear complete horizontal lines to score points. The more lines at once, the bigger the bonus!",
          "On mobile: tap the board to rotate, swipe left/right to move, swipe down to drop. Use the D-Pad buttons below the board.",
        ]}
      />

      {/* ── Related games ── */}
      <RelatedTools currentSlug="tetris" />

      {/* ── SEO content ── */}
      <ToolSeoContent
        title="Tetris Online — Free Classic Block Game, No Download"
        description="Play Tetris free in your browser. Stack blocks, clear lines and level up endlessly. Full keyboard and mobile touch support — no download, no account needed."
        body={[
          "Tetris is the most iconic puzzle game ever made. First released in 1984, it has been played by hundreds of millions of people worldwide. The goal is simple: rotate and position falling tetrominoes to fill complete horizontal lines, which then disappear and earn you points. As you clear more lines, the level increases and the blocks fall faster — making every game a thrilling race against speed.",
          "Skycally's free online Tetris includes all 7 classic tetrominoes (I, O, T, S, Z, J, L), a ghost piece that shows exactly where your block will land, hard drop for instant placement, wall kick rotation for tight spaces, and a next piece preview so you can plan ahead. Your best score is saved automatically in your browser.",
          "No download, no account, no ads interrupting your game. Play Tetris directly in your browser on any device — desktop, tablet, or mobile phone. The controls adapt automatically: keyboard on desktop, touch swipes and on-screen buttons on mobile.",
        ]}
        faqs={[
          {
            question: "How do I play Tetris online?",
            answer:
              "Use the left/right arrow keys to move pieces, Up or X to rotate clockwise, Z to rotate counter-clockwise, Down to soft drop, and Space for an instant hard drop. On mobile, tap the board to rotate and use the D-Pad buttons below.",
          },
          {
            question: "What is the ghost piece in Tetris?",
            answer:
              "The ghost piece is a transparent outline that shows exactly where your current tetromino will land if you drop it straight down. It helps you place pieces more accurately without guessing.",
          },
          {
            question: "How does scoring work in Tetris?",
            answer:
              "Clearing 1 line gives 100 × level points, 2 lines = 300 × level, 3 lines = 500 × level, and 4 lines (a 'Tetris!') = 800 × level. Soft drop (Down arrow) adds 1 point per row, hard drop (Space) adds 2 points per row.",
          },
          {
            question: "Does the game get faster?",
            answer:
              "Yes! Every 10 lines cleared increases the level by 1, which speeds up how fast pieces fall. The game starts at a comfortable pace and becomes a genuine challenge from level 10 onward.",
          },
          {
            question: "Does Tetris work on mobile?",
            answer:
              "Yes, fully. Tap the board to rotate a piece, swipe left or right to move it, and swipe down for a hard drop. You can also use the on-screen D-Pad and Hard Drop button that appears below the board on mobile.",
          },
          {
            question: "Is this Tetris game free?",
            answer:
              "Completely free — no download, no sign-up, and no account required. Just open the page and play instantly.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
