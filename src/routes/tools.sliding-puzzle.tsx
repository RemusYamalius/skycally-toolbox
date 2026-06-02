import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shuffle, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

const PATH = "/tools/sliding-puzzle";
const TITLE = "Sliding Puzzle — Free Online Game, No Download";
const DESCRIPTION =
  "Play Sliding Puzzle free in your browser. Slide tiles into order in the fewest moves. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/sliding-puzzle")({
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
            name: "Sliding Puzzle",
            description:
              "Free browser-based sliding puzzle game. Sort 15 tiles in the fewest moves possible. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Puzzle",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: SlidingPuzzlePage,
});

type Difficulty = "easy" | "medium" | "hard";
const SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const LABEL: Record<Difficulty, string> = { easy: "Easy 3×3", medium: "Medium 4×4", hard: "Hard 5×5" };

function solvedBoard(n: number): number[] {
  const arr = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
  return arr; // last cell is 0 (empty)
}

function shuffleBoard(n: number): { board: number[]; empty: number } {
  const board = solvedBoard(n);
  let empty = board.indexOf(0);
  const moves = n * n * 40;
  let prev = -1;
  for (let i = 0; i < moves; i++) {
    const neighbors = neighborsOf(empty, n).filter((p) => p !== prev);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [board[empty], board[pick]] = [board[pick], board[empty]];
    prev = empty;
    empty = pick;
  }
  // ensure not already solved
  if (isSolved(board)) return shuffleBoard(n);
  return { board, empty };
}

function neighborsOf(idx: number, n: number): number[] {
  const r = Math.floor(idx / n);
  const c = idx % n;
  const out: number[] = [];
  if (r > 0) out.push(idx - n);
  if (r < n - 1) out.push(idx + n);
  if (c > 0) out.push(idx - 1);
  if (c < n - 1) out.push(idx + 1);
  return out;
}

function isSolved(board: number[]): boolean {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function SlidingPuzzlePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const n = SIZE[difficulty];

  const [board, setBoard] = useState<number[]>(() => solvedBoard(n));
  const [empty, setEmpty] = useState<number>(() => n * n - 1);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const startedRef = useRef(false);

  const reset = useCallback((d: Difficulty) => {
    const size = SIZE[d];
    setBoard(solvedBoard(size));
    setEmpty(size * size - 1);
    setMoves(0);
    setTime(0);
    setRunning(false);
    setWon(false);
    startedRef.current = false;
  }, []);

  const shuffle = useCallback(() => {
    const { board: b, empty: e } = shuffleBoard(n);
    setBoard(b);
    setEmpty(e);
    setMoves(0);
    setTime(0);
    setRunning(false);
    setWon(false);
    startedRef.current = false;
  }, [n]);

  useEffect(() => {
    reset(difficulty);
  }, [difficulty, reset]);

  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const tryMove = useCallback(
    (idx: number) => {
      if (won) return;
      if (!neighborsOf(empty, n).includes(idx)) return;
      const next = board.slice();
      [next[empty], next[idx]] = [next[idx], next[empty]];
      setBoard(next);
      setEmpty(idx);
      setMoves((m) => m + 1);
      playSound("click");
      if (!startedRef.current) {
        startedRef.current = true;
        setRunning(true);
      }
      if (isSolved(next)) {
        setRunning(false);
        setWon(true);
        playSound("win");
      }
    },
    [board, empty, n, won],
  );

  // Arrow keys move the tile that would slide INTO the empty space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (won) return;
      const r = Math.floor(empty / n);
      const c = empty % n;
      let target = -1;
      if (e.key === "ArrowUp" && r < n - 1) target = empty + n;
      else if (e.key === "ArrowDown" && r > 0) target = empty - n;
      else if (e.key === "ArrowLeft" && c < n - 1) target = empty + 1;
      else if (e.key === "ArrowRight" && c > 0) target = empty - 1;
      if (target >= 0) {
        e.preventDefault();
        tryMove(target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [empty, n, tryMove, won]);

  return (
    <ToolPageShell
      title="Sliding Puzzle"
      description="Slide the tiles into the correct order. How few moves can you do it in?"
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SIZE) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  difficulty === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {LABEL[d]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={shuffle} size="sm" variant="default" className="gap-1.5">
              <Shuffle className="w-4 h-4" /> Shuffle
            </Button>
            <Button onClick={() => reset(difficulty)} size="sm" variant="outline" className="gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-5">
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[100px]">
            <p className="text-xs text-muted-foreground font-bold">Moves</p>
            <p className="text-2xl font-black text-foreground">{moves}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[100px]">
            <p className="text-xs text-muted-foreground font-bold">Time</p>
            <p className="text-2xl font-black text-foreground">{formatTime(time)}</p>
          </div>
        </div>

        {/* Board */}
        <div className="w-full max-w-md mx-auto relative">
          <div
            className="grid gap-2 p-2 rounded-xl bg-secondary/40 border-2 border-border select-none"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {board.map((val, idx) => {
              const isEmpty = val === 0;
              const isAdjacent = !won && neighborsOf(empty, n).includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => tryMove(idx)}
                  disabled={isEmpty || won}
                  className={cn(
                    "aspect-square rounded-lg font-black flex items-center justify-center transition-all",
                    n === 3 && "text-4xl",
                    n === 4 && "text-3xl",
                    n === 5 && "text-2xl",
                    isEmpty
                      ? "bg-transparent cursor-default"
                      : "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-md",
                    isAdjacent && "hover:scale-105 hover:shadow-lg cursor-pointer",
                    !isAdjacent && !isEmpty && "cursor-default opacity-95",
                  )}
                >
                  {isEmpty ? "" : val}
                </button>
              );
            })}
          </div>

          {won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
              <p className="text-5xl mb-2">🎉</p>
              <p className="text-white font-black text-2xl mb-1">You did it!</p>
              <p className="text-white/80 text-sm">
                Solved in <span className="font-bold">{moves}</span> moves
              </p>
              <p className="text-white/80 text-sm mb-4">
                Time: <span className="font-bold">{formatTime(time)}</span>
              </p>
              <Button onClick={shuffle} className="gap-1.5">
                <Shuffle className="w-4 h-4" /> Play Again
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Tip: use arrow keys to slide tiles on desktop.
        </p>
      </div>

      <HowToUse
        steps={[
          "Pick a difficulty: Easy 3×3, Medium 4×4, or Hard 5×5.",
          "Tap Shuffle to randomize the board — the timer starts on your first move.",
          "Click a tile next to the empty space (or use arrow keys) to slide it into place.",
          "Sort the tiles 1 through 15 (or higher) with the empty space in the bottom-right to win.",
        ]}
      />

      <ToolSeoContent
        title="Sliding Puzzle — Classic 15-Puzzle Online Free"
        description="Play the classic sliding puzzle (15-puzzle) free in your browser. Solve 3×3, 4×4, or 5×5 grids in the fewest moves and the fastest time."
        body={[
          "The sliding puzzle — also known as the 15-puzzle — is a timeless brain teaser where you slide numbered tiles around a square grid to put them back in order. Our online version runs entirely in your browser with three difficulty levels: an approachable 3×3 (8-puzzle), the classic 4×4 with 15 tiles, and a brain-bending 5×5 with 24 tiles. No downloads, no accounts, and no ads getting in the way of your solve.",
          "Every shuffle is guaranteed solvable because the board is scrambled by performing random legal moves from the solved state. Track your progress with the live move counter and timer, then try to beat your own personal best. The puzzle works equally well with mouse, touch, or arrow keys — perfect for a quick mental workout on desktop or mobile.",
        ]}
        faqs={[
          {
            question: "How do I play the sliding puzzle?",
            answer:
              "Click or tap any tile that is directly next to the empty space to slide it into that space. Keep sliding tiles until they are arranged in order from 1 to the highest number, with the empty space in the bottom-right corner.",
          },
          {
            question: "Are the puzzles always solvable?",
            answer:
              "Yes. The board is shuffled by applying many random legal moves to the solved configuration, which guarantees the resulting puzzle can always be solved.",
          },
          {
            question: "Can I use keyboard controls?",
            answer:
              "Yes. On desktop you can use the arrow keys to slide the tile in the chosen direction into the empty space.",
          },
          {
            question: "Is it free and private?",
            answer:
              "Completely. The game runs entirely in your browser — there is no signup, no download, and no data is sent to our servers.",
          },
        ]}
      />

      <RelatedTools currentSlug="sliding-puzzle" />
    </ToolPageShell>
  );
}
