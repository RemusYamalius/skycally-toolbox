import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RefreshCw } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/word-search")({
  head: () => buildToolMeta(toolBySlug("word-search", tools)),
  component: WordSearchPage,
});

const WORD_BANK: Record<string, string[]> = {
  Animals:    ["LION","TIGER","ELEPHANT","GIRAFFE","PENGUIN","DOLPHIN","CHEETAH","GORILLA","FLAMINGO","KANGAROO","CROCODILE","BUTTERFLY"],
  Countries:  ["MOROCCO","BRAZIL","JAPAN","CANADA","FRANCE","GERMANY","EGYPT","INDIA","MEXICO","SPAIN","ITALY","GREECE"],
  Sports:     ["FOOTBALL","TENNIS","SWIMMING","BOXING","CYCLING","ARCHERY","SKIING","CRICKET","VOLLEYBALL","BASKETBALL","BADMINTON","GYMNASTICS"],
  Technology: ["COMPUTER","KEYBOARD","MONITOR","SOFTWARE","INTERNET","BLUETOOTH","PROCESSOR","DATABASE","ALGORITHM","JAVASCRIPT","FRAMEWORK","NETWORK"],
  Food:       ["PIZZA","SUSHI","BURGER","PASTA","TACOS","SALAD","CHOCOLATE","AVOCADO","BLUEBERRY","CROISSANT","PINEAPPLE","CINNAMON"],
  Space:      ["GALAXY","NEBULA","COMET","METEOR","SATURN","JUPITER","MERCURY","NEPTUNE","ASTEROID","UNIVERSE","TELESCOPE","ASTRONAUT"],
};

type Dir = "H" | "V" | "D1" | "D2" | "RH" | "RV" | "RD1" | "RD2";
type Difficulty = "easy" | "medium" | "hard";

const CONFIG: Record<Difficulty, { grid: number; words: number; directions: Dir[] }> = {
  easy:   { grid: 10, words: 6,  directions: ["H", "V"] },
  medium: { grid: 13, words: 9,  directions: ["H", "V", "D1", "D2"] },
  hard:   { grid: 15, words: 12, directions: ["H", "V", "D1", "D2", "RH", "RV", "RD1", "RD2"] },
};

interface PlacedWord {
  word: string;
  startR: number;
  startC: number;
  dir: Dir;
  found: boolean;
}

interface Cell {
  letter: string;
  wordIndices: number[];
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getDelta = (dir: Dir): [number, number] => ({
  H: [0, 1], V: [1, 0], D1: [1, 1], D2: [1, -1],
  RH: [0, -1], RV: [-1, 0], RD1: [-1, -1], RD2: [-1, 1],
}[dir] as [number, number]);

function generateGrid(size: number, wordList: string[], directions: Dir[]) {
  const grid: Cell[][] = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({ letter: "", wordIndices: [] as number[] }))
  );
  const placed: PlacedWord[] = [];

  for (let wi = 0; wi < wordList.length; wi++) {
    const word = wordList[wi];
    let success = false;
    for (let attempt = 0; attempt < 200 && !success; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const [dr, dc] = getDelta(dir);
      const len = word.length;
      const minR = dr < 0 ? len - 1 : 0;
      const maxR = dr > 0 ? size - len : size - 1;
      const minC = dc < 0 ? len - 1 : 0;
      const maxC = dc > 0 ? size - len : size - 1;
      if (minR > maxR || minC > maxC) continue;

      const startR = minR + Math.floor(Math.random() * (maxR - minR + 1));
      const startC = minC + Math.floor(Math.random() * (maxC - minC + 1));

      let valid = true;
      for (let i = 0; i < len; i++) {
        const r = startR + dr * i, c = startC + dc * i;
        if (grid[r][c].letter && grid[r][c].letter !== word[i]) { valid = false; break; }
      }
      if (!valid) continue;

      for (let i = 0; i < len; i++) {
        const r = startR + dr * i, c = startC + dc * i;
        grid[r][c].letter = word[i];
        grid[r][c].wordIndices.push(wi);
      }
      placed.push({ word, startR, startC, dir, found: false });
      success = true;
    }
  }

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c].letter)
        grid[r][c].letter = ALPHABET[Math.floor(Math.random() * 26)];

  return { grid, placed };
}

function getLineCells(start: [number, number], end: [number, number]): [number, number][] {
  const [r1, c1] = start, [r2, c2] = end;
  const dr = r2 - r1, dc = c2 - c1;
  if (dr === 0 && dc === 0) return [[r1, c1]];

  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

  if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) {
    if (Math.abs(dr) > Math.abs(dc))
      return Array.from({ length: Math.abs(dr) + 1 }, (_, i) => [r1 + stepR * i, c1] as [number, number]);
    return Array.from({ length: Math.abs(dc) + 1 }, (_, i) => [r1, c1 + stepC * i] as [number, number]);
  }

  const len = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: len + 1 }, (_, i) => [r1 + stepR * i, c1 + stepC * i] as [number, number]);
}

const CELL_COLORS = [
  "bg-red-500/30 text-red-300",
  "bg-blue-500/30 text-blue-300",
  "bg-green-500/30 text-green-300",
  "bg-yellow-500/30 text-yellow-300",
  "bg-purple-500/30 text-purple-300",
  "bg-pink-500/30 text-pink-300",
  "bg-cyan-500/30 text-cyan-300",
  "bg-orange-500/30 text-orange-300",
  "bg-teal-500/30 text-teal-300",
  "bg-indigo-500/30 text-indigo-300",
  "bg-rose-500/30 text-rose-300",
  "bg-lime-500/30 text-lime-300",
];

const CATEGORIES = Object.keys(WORD_BANK);

function readBest(): Record<Difficulty, number> {
  if (typeof window === "undefined") return { easy: 0, medium: 0, hard: 0 };
  try {
    const raw = window.localStorage.getItem("wordsearch-best");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { easy: 0, medium: 0, hard: 0 };
}

function WordSearchPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [category, setCategory] = useState<string>("Animals");
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [currentCell, setCurrentCell] = useState<[number, number] | null>(null);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"setup" | "playing" | "won">("setup");
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<Record<Difficulty, number>>(() => readBest());

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = () => {
    const cfg = CONFIG[difficulty];
    const all = WORD_BANK[category];
    const selected = [...all].sort(() => Math.random() - 0.5).slice(0, cfg.words);
    const { grid: g, placed } = generateGrid(cfg.grid, selected, cfg.directions);
    setGrid(g);
    setPlacedWords(placed);
    setFoundCells(new Set());
    setStartCell(null);
    setCurrentCell(null);
    setSelecting(false);
    setTime(0);
    setPhase("playing");
  };

  const wordColors = useMemo(() => {
    const map: Record<string, string> = {};
    placedWords.forEach((pw, i) => { map[pw.word] = CELL_COLORS[i % CELL_COLORS.length]; });
    return map;
  }, [placedWords]);

  const foundCellColors = useMemo(() => {
    const map: Record<string, string> = {};
    placedWords.forEach((pw) => {
      if (!pw.found) return;
      const [dr, dc] = getDelta(pw.dir);
      for (let i = 0; i < pw.word.length; i++) {
        const r = pw.startR + dr * i, c = pw.startC + dc * i;
        map[`${r}-${c}`] = wordColors[pw.word];
      }
    });
    return map;
  }, [placedWords, wordColors]);

  const selectedCells = useMemo(() => {
    if (!selecting || !startCell || !currentCell) return new Set<string>();
    return new Set(getLineCells(startCell, currentCell).map(([r, c]) => `${r}-${c}`));
  }, [selecting, startCell, currentCell]);

  const getCellFromEvent = (e: React.MouseEvent | React.TouchEvent): [number, number] | null => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX; clientY = touch.clientY;
    } else {
      clientX = e.clientX; clientY = e.clientY;
    }
    const size = CONFIG[difficulty].grid;
    const cellW = rect.width / size;
    const cellH = rect.height / size;
    const c = Math.floor((clientX - rect.left) / cellW);
    const r = Math.floor((clientY - rect.top) / cellH);
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    return [r, c];
  };

  const checkSelection = (cells: [number, number][]) => {
    const letters = cells.map(([r, c]) => grid[r][c].letter).join("");
    const reversed = letters.split("").reverse().join("");

    let matchedWord: string | null = null;
    const updated = placedWords.map((pw) => {
      if (pw.found) return pw;
      if (pw.word === letters || pw.word === reversed) {
        matchedWord = pw.word;
        return { ...pw, found: true };
      }
      return pw;
    });

    if (matchedWord) {
      setPlacedWords(updated);
      setFoundCells((fc) => {
        const next = new Set(fc);
        cells.forEach(([r, c]) => next.add(`${r}-${c}`));
        return next;
      });
      if (updated.every((pw) => pw.found)) {
        setPhase("won");
        if (best[difficulty] === 0 || time < best[difficulty]) {
          const upd = { ...best, [difficulty]: time };
          setBest(upd);
          try { window.localStorage.setItem("wordsearch-best", JSON.stringify(upd)); } catch {}
        }
      }
    }
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    setSelecting(true);
    setStartCell(cell);
    setCurrentCell(cell);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!selecting) return;
    if ("touches" in e) e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) setCurrentCell(cell);
  };

  const handlePointerUp = () => {
    if (selecting && startCell && currentCell) {
      const cells = getLineCells(startCell, currentCell);
      if (cells.length > 1) checkSelection(cells);
    }
    setSelecting(false);
    setStartCell(null);
    setCurrentCell(null);
  };

  const foundCount = placedWords.filter((w) => w.found).length;

  return (
    <ToolPageShell
      title="Word Search"
      description="Find hidden words in the letter grid — horizontally, vertically and diagonally!"
    >
      {phase === "setup" && (
        <div className="max-w-md mx-auto rounded-3xl border border-border bg-card/50 p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold mb-4">Choose a category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-bold border transition",
                  category === c
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card border-border text-foreground hover:bg-secondary"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <h2 className="font-display text-xl font-bold mb-4">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-bold border capitalize transition",
                  difficulty === d
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card border-border text-foreground hover:bg-secondary"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <Button onClick={startGame} className="w-full" size="lg">
            <Play className="w-4 h-4 mr-2" /> Start Game
          </Button>
        </div>
      )}

      {phase !== "setup" && (
        <div className="max-w-md mx-auto">
          <div className="flex justify-center gap-4 mb-3 text-sm flex-wrap">
            <span className="text-foreground font-bold">
              ✅ {foundCount}/{placedWords.length} found
            </span>
            <span className="text-muted-foreground">⏱ {time}s</span>
            {best[difficulty] > 0 && (
              <span className="text-yellow-400">🏆 Best: {best[difficulty]}s</span>
            )}
          </div>

          <div
            ref={gridRef}
            className="w-full max-w-sm mx-auto touch-none select-none rounded-xl overflow-hidden border border-border bg-card"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ display: "grid", gridTemplateColumns: `repeat(${CONFIG[difficulty].grid}, 1fr)` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r}-${c}`;
                const isFound = foundCells.has(key);
                const isSelected = selectedCells.has(key);
                const foundColor = foundCellColors[key];
                return (
                  <div
                    key={key}
                    className={cn(
                      "aspect-square flex items-center justify-center text-[10px] sm:text-xs font-black border border-border/20 transition-colors",
                      isFound && foundColor ? foundColor :
                      isSelected ? "bg-primary/40 text-white" :
                      "text-foreground bg-card hover:bg-muted/40"
                    )}
                  >
                    {cell.letter}
                  </div>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 max-w-sm mx-auto">
            {placedWords.map((pw) => (
              <div
                key={pw.word}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold text-center border transition-all",
                  pw.found
                    ? cn(wordColors[pw.word], "border-transparent line-through opacity-70")
                    : "bg-card border-border text-foreground"
                )}
              >
                {pw.found ? "✓ " : ""}{pw.word}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <Button onClick={startGame} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" /> New Game
            </Button>
            <Button onClick={() => setPhase("setup")} variant="outline">
              Change Category
            </Button>
          </div>
        </div>
      )}

      {phase === "won" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-2xl font-black text-foreground mb-1">All Words Found!</p>
            <p className="text-muted-foreground mb-1">Time: {time}s</p>
            {best[difficulty] === time && time > 0 && (
              <p className="text-yellow-400 font-bold mb-3">🏆 New Best!</p>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
              >
                Play Again
              </button>
              <button
                onClick={() => setPhase("setup")}
                className="px-6 py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-secondary transition"
              >
                Change Category
              </button>
            </div>
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Choose a category and difficulty, then hit Start.",
          "Click and drag (or touch and swipe) to select hidden words in the grid.",
          "Find all words as fast as you can — horizontally, vertically or diagonally!",
        ]}
      />

      <RelatedTools currentSlug="word-search" />

      <ToolSeoContent
        title="Word Search — Free Online Word Finding Puzzle"
        description="Play Word Search online for free. Find hidden words in letter grids across 6 categories. Easy, Medium and Hard difficulty with timer!"
        body={[
          "Word Search is a timeless puzzle that sharpens your focus, vocabulary and pattern recognition. Pick from six themed categories — Animals, Countries, Sports, Technology, Food and Space — and scan the letter grid for hidden words tucked away in every direction. The game runs entirely in your browser with no signup, no downloads and no ads getting in the way.",
          "Three difficulty levels keep the challenge fresh. Easy uses a 10×10 grid with words running horizontally or vertically only — perfect for warming up. Medium adds diagonals on a 13×13 grid, while Hard packs 12 words into a 15×15 grid with words running in all 8 directions, including backwards. Beat your best time on each difficulty and try to clear the board faster every round.",
        ]}
        faqs={[
          { question: "Which directions can words go?", answer: "On Easy, words run horizontally or vertically. Medium adds both diagonals. On Hard, words can run in all 8 directions, including reversed (right-to-left, bottom-to-top, and reversed diagonals)." },
          { question: "What categories are available?", answer: "Six themed word lists: Animals, Countries, Sports, Technology, Food and Space. Each category contains 12 words and the game picks a random subset every round so no two games are the same." },
          { question: "How are the difficulties different?", answer: "Easy is a 10×10 grid with 6 words and 2 directions. Medium is 13×13 with 9 words and 4 directions. Hard is 15×15 with 12 words and all 8 directions including reverses." },
          { question: "Does it work on mobile?", answer: "Yes. The grid responds to both mouse drag and touch swipe. Tap and hold the first letter, then drag your finger across the line of letters to select a word and release to confirm." },
        ]}
      />
    </ToolPageShell>
  );
}
