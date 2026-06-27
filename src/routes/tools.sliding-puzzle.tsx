import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shuffle, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
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
      showFileDisclaimer={false}
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

        <p className="text-center text-xs text-muted-foreground mt-4">Tip: use arrow keys to slide tiles on desktop.</p>
      </div>

      <AdZone id="sliding-puzzle-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Pick a difficulty, then tap Shuffle to scramble the board.",
          "Click a tile next to the empty space (or use arrow keys) to slide it.",
          "Sort the tiles in order with the empty space in the bottom-right to win.",
        ]}
      />

      <ToolSeoContent
        title="Free Sliding Puzzle Game Online — Solve the 15-Puzzle in Your Browser"
        description="Play the classic 15-Puzzle sliding game free online. Slide tiles into the correct order. Multiple grid sizes from 3×3 to 5×5. No signup required."
        body={[
          "Skycally's Sliding Puzzle presents a grid of numbered tiles with one empty space. Slide adjacent tiles into the empty space to rearrange them in numerical order from left to right, top to bottom. The classic 15-Puzzle uses a 4×4 grid (tiles 1–15), while smaller 3×3 (8-Puzzle) and larger 5×5 (24-Puzzle) variations are also available.",
          "The 15-Puzzle was invented by Noyes Chapman in the 1870s and marketed by Sam Loyd in 1880, who famously offered a $1,000 prize for anyone who could solve a specific impossible configuration — making it one of the first viral puzzles in history. Today it's a classic benchmark problem in computer science for testing search algorithms like A* and iterative deepening.",
          "Not all configurations are solvable — exactly half of all possible arrangements of the 15-Puzzle are reachable from a solved state. This tool only generates solvable puzzles by starting from the solved position and making a sequence of random valid moves in reverse, guaranteeing every puzzle has a solution.",
          "The minimum number of moves required to solve a shuffled 15-Puzzle (the 'optimal solution length') varies widely — easy shuffles take 20–40 moves, while harder configurations can require 80+ moves. The move counter tracks your total moves, and trying to solve it in fewer moves than your previous best adds a layer of competitive challenge.",
        ]}
        faqs={[
          {
            question: "How do I play the Sliding Puzzle?",
            answer:
              "Click any tile adjacent to the empty space to slide it into that space. Rearrange all tiles in numerical order from left to right, top to bottom, to win.",
          },
          {
            question: "What grid sizes are available?",
            answer:
              "3×3 (8-Puzzle, 8 tiles), 4×4 (15-Puzzle, 15 tiles), and 5×5 (24-Puzzle, 24 tiles). Larger grids are significantly harder.",
          },
          {
            question: "Is every puzzle solvable?",
            answer:
              "Yes. Puzzles are generated by starting from the solved state and making random moves, guaranteeing every generated puzzle has at least one solution.",
          },
          {
            question: "How many moves does it take to solve?",
            answer:
              "It depends on the shuffle. Easy positions take 20–40 moves. Hard positions can require 80+ moves for the optimal solution.",
          },
          {
            question: "Can I undo a move?",
            answer: "Check the game controls — an undo button may be available to reverse the last slide.",
          },
          {
            question: "What is the 15-Puzzle?",
            answer:
              "The 15-Puzzle is the classic version with a 4×4 grid and tiles numbered 1–15. It was invented in the 1870s and is one of the most famous mechanical puzzles in history.",
          },
          {
            question: "Is there a timer?",
            answer:
              "Yes. A timer tracks how long each puzzle takes to solve. Try to beat your best time on the same grid size.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. Tap tiles to slide them. The grid scales to fit any screen size.",
          },
        ]}
      />

      <RelatedTools currentSlug="sliding-puzzle" />
    </ToolPageShell>
  );
}
