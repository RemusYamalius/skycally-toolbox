import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/tetris")({
  head: () => buildToolMeta(toolBySlug("tetris", tools)),
  component: TetrisPage,
});

const COLS = 10;
const ROWS = 20;
const CELL = 30;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

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
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[1,0],[1,1],[1,0]],
    [[1,1,1],[0,1,0],[0,0,0]],
    [[0,1],[1,1],[0,1]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[1,0],[1,1],[0,1]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,1],[1,1],[1,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[1,1],[1,0],[1,0]],
    [[1,1,1],[0,0,1],[0,0,0]],
    [[0,1],[0,1],[1,1]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[1,0],[1,0],[1,1]],
    [[1,1,1],[1,0,0],[0,0,0]],
    [[1,1],[0,1],[0,1]],
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
const LEVEL_SPEEDS = [800,720,630,550,470,380,300,220,130,100,80,80,80,70,70,70,50,50,50,30];
const SCORE_TABLE = [0, 100, 300, 500, 800];

const createEmptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));

const randomPiece = (): PieceType =>
  PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];

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

function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextPieceRef = useRef<PieceType>(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "over">("idle");

  // Load best
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = parseInt(localStorage.getItem("tetris-best") || "0", 10);
      if (!isNaN(stored)) setBest(stored);
    } catch { /* noop */ }
  }, []);

  const drawCell = (ctx: CanvasRenderingContext2D, c: number, r: number, color: string) => {
    const x = c * CELL;
    const y = r * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
    ctx.fillRect(x + 1, y + 1, 4, CELL - 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4);
    ctx.fillRect(x + CELL - 5, y + 1, 4, CELL - 2);
  };

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(CANVAS_W, r * CELL); ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CANVAS_H); ctx.stroke();
    }

    boardRef.current.forEach((row, r) => {
      row.forEach((color, c) => {
        if (color) drawCell(ctx, c, r, color);
      });
    });

    const piece = pieceRef.current;
    if (piece) {
      // Ghost piece
      let ghostY = piece.y;
      while (!isColliding(boardRef.current, piece, 0, ghostY - piece.y + 1)) ghostY++;
      const shape = getShape(piece.type, piece.rotation);
      shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const x = (piece.x + c) * CELL;
            const y = (ghostY + r) * CELL;
            ctx.strokeStyle = COLORS[piece.type];
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
            ctx.globalAlpha = 1;
          }
        });
      });

      shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell && piece.y + r >= 0) {
            drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type]);
          }
        });
      });
    }
  }, []);

  const drawNextPiece = useCallback(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 100;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, size, size);

    const type = nextPieceRef.current;
    const shape = getShape(type, 0);
    const cellSize = 22;
    const offsetX = (size - shape[0].length * cellSize) / 2;
    const offsetY = (size - shape.length * cellSize) / 2;

    shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          ctx.fillStyle = COLORS[type];
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(x + 1, y + 1, cellSize - 2, 3);
        }
      });
    });
  }, []);

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
          try { localStorage.setItem("tetris-best", String(scoreRef.current)); } catch { /* noop */ }
        }
      }

      const nextType = nextPieceRef.current;
      const newPiece = spawnPiece(nextType);
      nextPieceRef.current = randomPiece();

      if (isColliding(clearedBoard, newPiece)) {
        pieceRef.current = null;
        setPhase("over");
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

  useEffect(() => { tickRef.current = tick; }, [tick]);

  const startGame = () => {
    boardRef.current = createEmptyBoard();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    const type = randomPiece();
    pieceRef.current = spawnPiece(type);
    nextPieceRef.current = randomPiece();
    setScore(0); setLines(0); setLevel(1);
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

  // Initial draw
  useEffect(() => {
    drawBoard();
    drawNextPiece();
  }, [drawBoard, drawNextPiece]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Keyboard
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
          if (!isColliding(boardRef.current, piece, -1)) {
            pieceRef.current = { ...piece, x: piece.x - 1 };
          }
          break;
        case "ArrowRight":
          if (!isColliding(boardRef.current, piece, 1)) {
            pieceRef.current = { ...piece, x: piece.x + 1 };
          }
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
          if (!isColliding(boardRef.current, rotated)) {
            pieceRef.current = rotated;
          } else if (!isColliding(boardRef.current, { ...rotated, x: rotated.x + 1 })) {
            pieceRef.current = { ...rotated, x: rotated.x + 1 };
          } else if (!isColliding(boardRef.current, { ...rotated, x: rotated.x - 1 })) {
            pieceRef.current = { ...rotated, x: rotated.x - 1 };
          }
          break;
        }
        case "z":
        case "Z": {
          const rotatedCCW = { ...piece, rotation: piece.rotation - 1 };
          if (!isColliding(boardRef.current, rotatedCCW)) {
            pieceRef.current = rotatedCCW;
          }
          break;
        }
        case " ": {
          e.preventDefault();
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

  // Touch
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
      const steps = Math.min(Math.round(Math.abs(dx) / 30), 5);
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

  return (
    <ToolPageShell title="Tetris" description="Stack falling blocks and clear lines in the ultimate classic arcade game!">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        <div className="relative mx-auto">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl border-2 border-border block touch-none"
            style={{ maxHeight: "70vh", width: "auto" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          {phase === "idle" && (
            <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center gap-4 p-4">
              <p className="text-5xl">🧱</p>
              <p className="text-white font-black text-3xl">TETRIS</p>
              <p className="text-white/60 text-xs text-center">Arrows to move • Up/X rotate • Space drop</p>
              <button onClick={startGame} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-black text-lg hover:opacity-90 transition">
                ▶ Play
              </button>
              {best > 0 && <p className="text-yellow-400 text-sm">🏆 Best: {best}</p>}
            </div>
          )}

          {phase === "paused" && (
            <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center gap-4">
              <p className="text-white font-black text-2xl">⏸ PAUSED</p>
              <button onClick={togglePause} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition">
                ▶ Resume
              </button>
            </div>
          )}

          {phase === "over" && (
            <div className="absolute inset-0 bg-black/85 rounded-xl flex flex-col items-center justify-center gap-3 p-4">
              <p className="text-4xl">💀</p>
              <p className="text-white font-black text-2xl">GAME OVER</p>
              <p className="text-white/70">Score: {score}</p>
              {score >= best && score > 0 && <p className="text-yellow-400 font-bold">🏆 New Best!</p>}
              <button onClick={startGame} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition mt-2">
                🔄 Play Again
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-row flex-wrap lg:flex-col gap-3 w-full lg:w-40">
          <div className="flex-1 min-w-[80px] lg:flex-none bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Score</p>
            <p className="text-xl font-black text-foreground">{score}</p>
          </div>
          <div className="flex-1 min-w-[80px] lg:flex-none bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Best</p>
            <p className="text-xl font-black text-yellow-400">{best}</p>
          </div>
          <div className="flex-1 min-w-[80px] lg:flex-none bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Level</p>
            <p className="text-xl font-black text-primary">{level}</p>
          </div>
          <div className="flex-1 min-w-[80px] lg:flex-none bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Lines</p>
            <p className="text-xl font-black text-foreground">{lines}</p>
          </div>
          <div className="w-full lg:w-auto bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Next</p>
            <canvas ref={nextCanvasRef} width={100} height={100} className="mx-auto rounded-lg" />
          </div>
          {phase === "playing" && (
            <button onClick={togglePause} className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition">
              ⏸ Pause
            </button>
          )}
        </div>
      </div>

      {/* Mobile on-screen controls */}
      <div className="flex flex-col items-center gap-2 mt-6 lg:hidden">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            const p = pieceRef.current; if (!p || phase !== "playing") return;
            const r = { ...p, rotation: p.rotation + 1 };
            if (!isColliding(boardRef.current, r)) pieceRef.current = r;
            drawBoard();
          }}
          className="w-14 h-14 rounded-xl bg-card border border-border text-xl flex items-center justify-center active:bg-secondary"
          aria-label="Rotate"
        >
          🔄
        </button>
        <div className="flex gap-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              const p = pieceRef.current; if (!p || phase !== "playing") return;
              if (!isColliding(boardRef.current, p, -1)) pieceRef.current = { ...p, x: p.x - 1 };
              drawBoard();
            }}
            className="w-14 h-14 rounded-xl bg-card border border-border text-xl flex items-center justify-center active:bg-secondary"
            aria-label="Left"
          >◄</button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              const p = pieceRef.current; if (!p || phase !== "playing") return;
              let dy = p.y;
              while (!isColliding(boardRef.current, p, 0, dy - p.y + 1)) dy++;
              scoreRef.current += (dy - p.y) * 2;
              pieceRef.current = { ...p, y: dy };
              setScore(scoreRef.current);
              tick();
            }}
            className="w-14 h-14 rounded-xl bg-primary text-primary-foreground text-xl flex items-center justify-center"
            aria-label="Hard drop"
          >▼▼</button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              const p = pieceRef.current; if (!p || phase !== "playing") return;
              if (!isColliding(boardRef.current, p, 1)) pieceRef.current = { ...p, x: p.x + 1 };
              drawBoard();
            }}
            className="w-14 h-14 rounded-xl bg-card border border-border text-xl flex items-center justify-center active:bg-secondary"
            aria-label="Right"
          >►</button>
        </div>
      </div>

      <HowToUse steps={[
        "Use arrow keys to move and rotate pieces — Space for instant drop.",
        "Clear complete horizontal lines to score points and level up.",
        "On mobile: tap to rotate, swipe left/right to move, swipe down to drop!",
      ]} />
      <RelatedTools currentSlug="tetris" />
      <ToolSeoContent
        title="Tetris — Free Online Classic Block Game"
        description="Play Tetris online for free. Stack blocks, clear lines and level up. Full keyboard controls and mobile touch support!"
        body={[
          "Tetris is one of the most iconic video games ever created. Stack falling tetrominoes, clear complete lines and keep going as long as you can — the speed increases with every level!",
          "Skycally's Tetris includes all 7 classic pieces, ghost piece preview, hard drop, wall kicks for smooth rotation, and a next piece display. Works on desktop with keyboard and on mobile with touch controls.",
        ]}
        faqs={[
          { question: "How do I rotate pieces?", answer: "Press the Up arrow or X key to rotate clockwise. Use Z to rotate counter-clockwise. On mobile, tap the screen or use the rotate button." },
          { question: "What is the ghost piece?", answer: "The ghost piece shows where your current tetromino will land if dropped straight down — it helps you aim more accurately." },
          { question: "How does scoring work?", answer: "Clear 1 line = 100pts × level, 2 lines = 300pts, 3 lines = 500pts, 4 lines (Tetris!) = 800pts. Soft drop adds 1pt per row, hard drop adds 2pts per row." },
          { question: "Does speed increase?", answer: "Yes! Every 10 lines cleared increases the level by 1, which speeds up the falling pieces. The game gets significantly faster after level 10." },
        ]}
      />
    </ToolPageShell>
  );
}
