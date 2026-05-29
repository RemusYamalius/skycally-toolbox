import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/2048")({
  head: () => buildToolMeta(toolBySlug("2048", tools)),
  component: Game2048,
});

type Cell = number | null;
type Board = Cell[][];
type Direction = "left" | "right" | "up" | "down";

const SIZE = 4;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2:    { bg: "#eee4da", text: "#776e65" },
  4:    { bg: "#ede0c8", text: "#776e65" },
  8:    { bg: "#f2b179", text: "#f9f6f2" },
  16:   { bg: "#f59563", text: "#f9f6f2" },
  32:   { bg: "#f67c5f", text: "#f9f6f2" },
  64:   { bg: "#f65e3b", text: "#f9f6f2" },
  128:  { bg: "#edcf72", text: "#f9f6f2" },
  256:  { bg: "#edcc61", text: "#f9f6f2" },
  512:  { bg: "#edc850", text: "#f9f6f2" },
  1024: { bg: "#edc53f", text: "#f9f6f2" },
  2048: { bg: "#edc22e", text: "#f9f6f2" },
};

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}

function cloneBoard(b: Board): Board {
  return b.map((row) => [...row]);
}

function addTile(b: Board): Board {
  const empty: [number, number][] = [];
  b.forEach((row, r) => row.forEach((cell, c) => { if (cell == null) empty.push([r, c]); }));
  if (!empty.length) return b;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = cloneBoard(b);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: Cell[]): { row: Cell[]; score: number } {
  const nums = row.filter((v): v is number => v != null);
  let score = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] = nums[i] * 2;
      score += nums[i];
      nums.splice(i + 1, 1);
    }
  }
  const padded: Cell[] = [...nums];
  while (padded.length < SIZE) padded.push(null);
  return { row: padded, score };
}

function transpose(b: Board): Board {
  return Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => b[c][r]));
}

function move(board: Board, dir: Direction): { board: Board; score: number; changed: boolean } {
  let b = cloneBoard(board);
  if (dir === "right") b = b.map((row) => [...row].reverse());
  if (dir === "up") b = transpose(b);
  if (dir === "down") b = transpose(b).map((row) => [...row].reverse());

  let gained = 0;
  b = b.map((row) => {
    const r = slideRow(row);
    gained += r.score;
    return r.row;
  });

  if (dir === "right") b = b.map((row) => [...row].reverse());
  if (dir === "up") b = transpose(b);
  if (dir === "down") b = transpose(b.map((row) => [...row].reverse()));

  const changed = !boardsEqual(board, b);
  return { board: b, score: gained, changed };
}

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function canMove(b: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c] == null) return true;
      if (c + 1 < SIZE && b[r][c] === b[r][c + 1]) return true;
      if (r + 1 < SIZE && b[r][c] === b[r + 1][c]) return true;
    }
  }
  return false;
}

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem("2048-best") || "0", 10) || 0; } catch { return 0; }
}

function initialBoard(): Board {
  return addTile(addTile(emptyBoard()));
}

function Game2048() {
  const tool = toolBySlug("2048", tools);

  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setBoard(initialBoard());
    setBest(loadBest());
    setMounted(true);
  }, []);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const doMove = useCallback((dir: Direction) => {
    setBoard((cur) => {
      if (gameOver) return cur;
      const { board: moved, score: gained, changed } = move(cur, dir);
      if (!changed) return cur;
      const withTile = addTile(moved);
      setScore((s) => {
        const ns = s + gained;
        if (ns > best) {
          setBest(ns);
          if (typeof window !== "undefined") {
            try { localStorage.setItem("2048-best", String(ns)); } catch { /* noop */ }
          }
        }
        return ns;
      });
      if (!won && withTile.flat().some((v) => v === 2048)) {
        setWon(true);
        toast.success("🎉 You reached 2048! Keep going for a higher score.");
      }
      if (!canMove(withTile)) {
        setGameOver(true);
        toast.error("Game over — no more moves!");
      }
      return withTile;
    });
  }, [gameOver, best, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); doMove("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); doMove("right"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); doMove("up"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); doMove("down"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  // Swipe
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
    const THRESH = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESH) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
  };

  const newGame = () => {
    setBoard(initialBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex justify-between items-center max-w-sm mx-auto w-full">
          <h2 className="text-3xl font-black text-foreground">2048</h2>
          <div className="flex gap-2">
            <div className="bg-[#bbada0] rounded-lg px-4 py-2 text-center min-w-[72px]">
              <p className="text-[10px] text-white/70 uppercase font-bold">Score</p>
              <p className="text-white font-extrabold">{score}</p>
            </div>
            <div className="bg-[#bbada0] rounded-lg px-4 py-2 text-center min-w-[72px]">
              <p className="text-[10px] text-white/70 uppercase font-bold">Best</p>
              <p className="text-white font-extrabold">{best}</p>
            </div>
          </div>
        </div>

        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="grid grid-cols-4 gap-2 bg-[#bbada0] p-3 rounded-xl w-full max-w-sm mx-auto aspect-square touch-none select-none"
        >
          {board.flat().map((val, i) => {
            const style = val
              ? { backgroundColor: TILE_COLORS[val]?.bg ?? "#3c3a32", color: TILE_COLORS[val]?.text ?? "#f9f6f2" }
              : { backgroundColor: "#cdc1b4" };
            const fontSize = !val ? "" : val < 100 ? "text-3xl" : val < 1000 ? "text-2xl" : "text-xl";
            return (
              <div
                key={i}
                className={`flex items-center justify-center rounded-lg font-extrabold transition-all duration-100 ${fontSize}`}
                style={style}
              >
                {val || ""}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={newGame} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> New Game
          </Button>
        </div>

        {gameOver && (
          <p className="text-sm text-muted-foreground">Game over! Final score: <span className="font-bold text-foreground">{score}</span></p>
        )}

        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Use arrow keys on desktop, or swipe on mobile.
        </p>
      </div>

      <HowToUse
        steps={[
          "Use arrow keys or swipe to slide all tiles.",
          "When two tiles with the same number collide, they merge!",
          "Reach the 2048 tile to win — but keep going for a higher score!",
        ]}
      />

      <ToolSeoContent
        title="2048 Game — Free Online Puzzle Game"
        description="Play 2048 online for free. Slide and merge tiles to reach 2048. No download, works on mobile and desktop."
        body={[
          "2048 is a single-player sliding tile puzzle that is incredibly easy to learn but surprisingly hard to master. Every move slides all the tiles on a 4×4 grid in one of four directions. When two tiles with the same number collide, they merge into a single tile with double the value. The goal is to combine your way up to the legendary 2048 tile — but the real challenge is keeping the board from filling up before you get there.",
          "Our free online version of 2048 runs entirely in your browser, on phones, tablets, and laptops alike. Swipe on touchscreens or use arrow keys on a keyboard. Your best score is saved locally so you can keep pushing your personal record without any account or signup. Quick to start, satisfying to play, and impossible to put down.",
        ]}
        faqs={[
          { question: "How do I play 2048?", answer: "Slide tiles in any of the four directions using arrow keys or swipes. Tiles with the same number merge when they touch. Try to reach the 2048 tile without filling the board." },
          { question: "What happens when I reach 2048?", answer: "You win — but the game does not stop. You can keep merging tiles to chase a higher score and bigger tiles like 4096 and beyond." },
          { question: "Is my best score saved?", answer: "Yes. Your highest score is stored in your browser's local storage, so it stays with you between sessions on the same device." },
          { question: "Does it work on mobile?", answer: "Absolutely. The board is responsive and supports swipe gestures, so it plays great on phones and tablets." },
        ]}
      />

      <RelatedTools currentSlug="2048" />
    </ToolPageShell>
  );
}
