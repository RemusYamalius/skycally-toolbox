import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/minesweeper")({
  head: () => buildToolMeta(toolBySlug("minesweeper", tools)),
  component: MinesweeperPage,
});

type Difficulty = "easy" | "medium" | "hard";

const CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number; label: string }> = {
  easy: { rows: 9, cols: 9, mines: 10, label: "Easy · 9×9 · 10 mines" },
  medium: { rows: 16, cols: 16, mines: 40, label: "Medium · 16×16 · 40 mines" },
  hard: { rows: 16, cols: 30, mines: 99, label: "Hard · 16×30 · 99 mines" },
};

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Phase = "setup" | "playing" | "won" | "lost";

const NUM_COLORS: Record<number, string> = {
  1: "text-blue-500",
  2: "text-green-500",
  3: "text-red-500",
  4: "text-purple-700",
  5: "text-red-800",
  6: "text-cyan-500",
  7: "text-black dark:text-white",
  8: "text-gray-500",
};

const DEFAULT_BEST: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

function makeEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array(rows)
    .fill(null)
    .map(() =>
      Array(cols)
        .fill(null)
        .map(() => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
    );
}

function placeMines(board: Cell[][], mines: number, safeR: number, safeC: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const b = board.map((r) => r.map((c) => ({ ...c })));
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (b[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    b[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (b[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && b[nr][nc].mine) count++;
        }
      }
      b[r][c].adjacent = count;
    }
  }
  return b;
}

function floodReveal(board: Cell[][], r: number, c: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const b = board.map((row) => row.map((cell) => ({ ...cell })));
  const queue: [number, number][] = [[r, c]];
  while (queue.length) {
    const [cr, cc] = queue.shift()!;
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    if (b[cr][cc].revealed || b[cr][cc].flagged || b[cr][cc].mine) continue;
    b[cr][cc].revealed = true;
    if (b[cr][cc].adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) queue.push([cr + dr, cc + dc]);
        }
      }
    }
  }
  return b;
}

function revealAllMines(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)));
}

function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Cell[][]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<Record<Difficulty, number>>(DEFAULT_BEST);
  const [mounted, setMounted] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [flagCount, setFlagCount] = useState(0);

  // Load best from localStorage after mount (SSR-safe)
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("minesweeper-best");
      if (raw) {
        const parsed = JSON.parse(raw);
        setBest({
          easy: Number(parsed.easy) || 0,
          medium: Number(parsed.medium) || 0,
          hard: Number(parsed.hard) || 0,
        });
      }
    } catch {
      /* noop */
    }
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = useCallback(
    (diff: Difficulty) => {
      const cfg = CONFIG[diff];
      setDifficulty(diff);
      setBoard(makeEmptyBoard(cfg.rows, cfg.cols));
      setPhase("playing");
      setFirstClick(true);
      setTime(0);
      setFlagCount(0);
    },
    [],
  );

  const resetGame = useCallback(() => {
    setPhase("setup");
    setBoard([]);
    setTime(0);
    setFlagCount(0);
    setFirstClick(true);
  }, []);

  const checkWin = (b: Cell[][], diff: Difficulty) => {
    const cfg = CONFIG[diff];
    const total = cfg.rows * cfg.cols;
    const revealed = b.flat().filter((c) => c.revealed).length;
    return revealed === total - cfg.mines;
  };

  const persistBest = (diff: Difficulty, t: number) => {
    setBest((prev) => {
      const current = prev[diff];
      if (current !== 0 && current <= t) return prev;
      const updated = { ...prev, [diff]: t };
      try {
        localStorage.setItem("minesweeper-best", JSON.stringify(updated));
      } catch {
        /* noop */
      }
      return updated;
    });
  };

  const handleClick = (r: number, c: number) => {
    if (phase !== "playing") return;
    if (board[r][c].revealed || board[r][c].flagged) return;

    let b = board.map((row) => row.map((cell) => ({ ...cell })));

    if (firstClick) {
      b = placeMines(b, CONFIG[difficulty].mines, r, c);
      setFirstClick(false);
    }

    if (b[r][c].mine) {
      b = revealAllMines(b);
      setBoard(b);
      setPhase("lost");
      return;
    }

    b = floodReveal(b, r, c);
    setBoard(b);

    if (checkWin(b, difficulty)) {
      setPhase("won");
      persistBest(difficulty, time);
    }
  };

  const handleRightClick = (e: React.MouseEvent | { preventDefault: () => void }, r: number, c: number) => {
    e.preventDefault();
    if (phase !== "playing" || board[r][c].revealed) return;
    const b = board.map((row) => row.map((cell) => ({ ...cell })));
    b[r][c].flagged = !b[r][c].flagged;
    setFlagCount((prev) => (b[r][c].flagged ? prev + 1 : prev - 1));
    setBoard(b);
  };

  const handleChord = (r: number, c: number) => {
    if (phase !== "playing") return;
    if (!board[r][c].revealed || board[r][c].adjacent === 0) return;
    const rows = board.length;
    const cols = board[0].length;
    let flagsAround = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].flagged) flagsAround++;
      }
    }
    if (flagsAround !== board[r][c].adjacent) return;

    let b = board.map((row) => row.map((cell) => ({ ...cell })));
    let hitMine = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !b[nr][nc].flagged && !b[nr][nc].revealed) {
          if (b[nr][nc].mine) hitMine = true;
          b = floodReveal(b, nr, nc);
        }
      }
    }
    if (hitMine) {
      b = revealAllMines(b);
      setBoard(b);
      setPhase("lost");
      return;
    }
    setBoard(b);
    if (checkWin(b, difficulty)) {
      setPhase("won");
      persistBest(difficulty, time);
    }
  };

  // Mobile long-press for flag
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const handleTouchStart = (r: number, c: number) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      handleRightClick({ preventDefault: () => {} }, r, c);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const CellEl = ({ cell, r, c }: { cell: Cell; r: number; c: number }) => {
    const isRevealed = cell.revealed;
    const isMine = cell.mine && isRevealed;

    return (
      <button
        onClick={() => {
          if (longPressFired.current) {
            longPressFired.current = false;
            return;
          }
          if (cell.revealed) handleChord(r, c);
          else handleClick(r, c);
        }}
        onContextMenu={(e) => handleRightClick(e, r, c)}
        onTouchStart={() => handleTouchStart(r, c)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className={cn(
          "w-8 h-8 flex items-center justify-center text-xs font-black border transition-all select-none touch-none",
          isRevealed
            ? isMine
              ? "bg-red-500 border-red-600"
              : "bg-background border-border"
            : phase === "lost" && cell.mine && !cell.flagged
              ? "bg-muted border-border"
              : "bg-secondary border-border hover:bg-secondary/70 active:bg-background cursor-pointer",
          cell.flagged && !isRevealed ? "bg-yellow-500/20 border-yellow-500/40" : "",
        )}
      >
        {isMine
          ? "💣"
          : cell.flagged && !isRevealed
            ? "🚩"
            : isRevealed && cell.adjacent > 0
              ? <span className={NUM_COLORS[cell.adjacent]}>{cell.adjacent}</span>
              : null}
      </button>
    );
  };

  const cfg = CONFIG[difficulty];

  return (
    <ToolPageShell
      title="Minesweeper"
      description="The classic puzzle of logic and luck. Reveal every safe cell without detonating a mine."
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {phase === "setup" ? (
          <div className="max-w-md mx-auto text-center space-y-6">
            <div>
              <p className="text-5xl mb-2">💣</p>
              <h2 className="text-2xl font-black mb-1">Choose Difficulty</h2>
              <p className="text-sm text-muted-foreground">Your first click is always safe.</p>
            </div>
            <div className="grid gap-3">
              {(Object.keys(CONFIG) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => startGame(d)}
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-secondary/60 hover:bg-secondary border border-border transition-colors text-left"
                >
                  <div>
                    <p className="font-bold capitalize">{d}</p>
                    <p className="text-xs text-muted-foreground">{CONFIG[d].label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="font-black text-yellow-400">
                      {mounted && best[d] > 0 ? `${best[d]}s` : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => startGame(difficulty)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" /> Start Game
            </button>
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="flex items-center justify-between w-full max-w-fit mx-auto mb-3 px-2 gap-6">
              <div className="flex items-center gap-1 text-sm font-bold tabular-nums">
                💣 {cfg.mines - flagCount}
              </div>
              <button
                onClick={resetGame}
                className="w-10 h-10 text-xl rounded-xl border border-border hover:bg-secondary transition"
                aria-label="Reset game"
              >
                {phase === "won" ? "😎" : phase === "lost" ? "😵" : "🙂"}
              </button>
              <div className="flex items-center gap-1 text-sm font-bold tabular-nums">
                ⏱ {time}s
              </div>
            </div>

            {/* Board */}
            <div className="overflow-auto max-w-full">
              <div className="inline-block border-2 border-border rounded-xl p-1 bg-muted/30 mx-auto">
                {board.map((row, r) => (
                  <div key={r} className="flex">
                    {row.map((cell, c) => (
                      <CellEl key={c} cell={cell} r={r} c={c} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Win overlay */}
            {phase === "won" && (
              <div className="text-center py-4 mt-4">
                <p className="text-3xl mb-1">😎</p>
                <p className="text-xl font-black text-green-400">You Win!</p>
                <p className="text-sm text-muted-foreground">
                  Time: {time}s{best[difficulty] === time && time > 0 ? " 🏆 New Best!" : ""}
                </p>
                <button
                  onClick={resetGame}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
              </div>
            )}

            {/* Loss overlay */}
            {phase === "lost" && (
              <div className="text-center py-4 mt-4">
                <p className="text-3xl mb-1">💥</p>
                <p className="text-xl font-black text-red-400">Boom! Game Over</p>
                <button
                  onClick={resetGame}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              Right-click to flag · Long-press on mobile · Click a number to chord-reveal
            </p>
          </>
        )}
      </div>

      <HowToUse
        steps={[
          "Click any cell to start — your first click is always safe.",
          "Right-click (or long-press on mobile) to place a flag on suspected mines.",
          "Reveal all safe cells without hitting a mine to win!",
        ]}
      />

      <ToolSeoContent
        title="Minesweeper — Free Online Classic Game"
        description="Play the classic Minesweeper game online for free. Easy, Medium and Hard difficulty. Works on mobile with long-press to flag!"
        body={[
          "Minesweeper is the legendary logic puzzle that shipped with Windows for decades and quietly stole millions of work hours. The rules are simple: uncover every cell on the grid that doesn't contain a mine. Each number you reveal tells you exactly how many mines are touching that square, and from that single clue a whole map of safe and dangerous tiles can be deduced. Your very first click is always safe — mines are placed only after you tap, so you never lose on turn one.",
          "This browser version supports the three classic difficulty levels (9×9 / 16×16 / 16×30), a built-in timer, and per-difficulty best times saved locally to your device. Right-click to plant a flag on desktop, or long-press on mobile. Once a number has all its mines flagged, click it to chord-reveal every remaining safe neighbor at once — the pro move that lets you fly through the board.",
        ]}
        faqs={[
          {
            question: "How do I flag a mine on mobile?",
            answer: "Long-press any covered cell for about half a second to toggle a flag. Tap normally to reveal a cell.",
          },
          {
            question: "What are the difficulty levels?",
            answer: "Easy is a 9×9 board with 10 mines, Medium is 16×16 with 40 mines, and Hard (Expert) is 16×30 with 99 mines — the classic Windows configurations.",
          },
          {
            question: "What is chord clicking?",
            answer: "If a revealed numbered cell already has the matching number of flagged neighbors, clicking it reveals all of its remaining unflagged neighbors at once. It speeds up clearing the board significantly — but if you flagged the wrong cell, you'll detonate a mine.",
          },
          {
            question: "Are my best times saved?",
            answer: "Yes. Your fastest clear time for each difficulty is stored in your browser's local storage and persists between sessions on the same device. Clearing browser data will reset them.",
          },
        ]}
      />

      <RelatedTools currentSlug="minesweeper" />
    </ToolPageShell>
  );
}
