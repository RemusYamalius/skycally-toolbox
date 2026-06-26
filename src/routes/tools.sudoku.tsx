import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/sudoku")({
  head: () => buildToolMeta(toolBySlug("sudoku", tools)),
  component: SudokuPage,
});

type Grid = (number | null)[][];
type Difficulty = "easy" | "medium" | "hard";
type Phase = "setup" | "playing" | "won";

const CLUES: Record<Difficulty, number> = { easy: 45, medium: 35, hard: 25 };
const DEFAULT_BEST: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

const isValid = (grid: Grid, r: number, c: number, n: number): boolean => {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === n) return false;
    if (grid[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) if (grid[br + dr][bc + dc] === n) return false;
  return true;
};

const solveSudoku = (grid: Grid): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== null) continue;
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (solveSudoku(grid)) return true;
          grid[r][c] = null;
        }
      }
      return false;
    }
  }
  return true;
};

const generateSolved = (): Grid => {
  const grid: Grid = Array(9)
    .fill(null)
    .map(() => Array(9).fill(null));
  solveSudoku(grid);
  return grid;
};

const createPuzzle = (solved: Grid, clues: number): Grid => {
  const puzzle: Grid = solved.map((r) => [...r]);
  let removed = 0;
  const target = 81 - clues;
  const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);

  for (const pos of positions) {
    if (removed >= target) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = null;
    const test: Grid = puzzle.map((row) => [...row]);
    if (solveSudoku(test)) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }
  return puzzle;
};

const emptyNotes = (): Set<number>[][] =>
  Array(9)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => new Set<number>()),
    );

const emptyErrors = (): boolean[][] =>
  Array(9)
    .fill(null)
    .map(() => Array(9).fill(false));

function SudokuPage() {
  const [mounted, setMounted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [solution, setSolution] = useState<Grid>([]);
  const [userGrid, setUserGrid] = useState<Grid>([]);
  const [given, setGiven] = useState<boolean[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notes, setNotes] = useState<Set<number>[][]>(emptyNotes);
  const [noteMode, setNoteMode] = useState(false);
  const [errors, setErrors] = useState<boolean[][]>(emptyErrors);
  const [phase, setPhase] = useState<Phase>("setup");
  const [time, setTime] = useState(0);
  const [hints, setHints] = useState(3);
  const [best, setBest] = useState<Record<Difficulty, number>>(DEFAULT_BEST);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("sudoku-best");
      if (raw) setBest({ ...DEFAULT_BEST, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = useCallback(() => {
    const solved = generateSolved();
    const p = createPuzzle(solved, CLUES[difficulty]);
    const g = p.map((row) => row.map((v) => v !== null));
    const u: Grid = p.map((row) => [...row]);
    setSolution(solved);
    setGiven(g);
    setUserGrid(u);
    setNotes(emptyNotes());
    setErrors(emptyErrors());
    setSelected(null);
    setTime(0);
    setHints(3);
    setPhase("playing");
  }, [difficulty]);

  const handleInput = useCallback(
    (n: number) => {
      if (!selected || phase !== "playing") return;
      const [r, c] = selected;
      if (given[r]?.[c]) return;

      if (n !== 0 && noteMode) {
        const newNotes = notes.map((row) => row.map((s) => new Set(s)));
        if (newNotes[r][c].has(n)) newNotes[r][c].delete(n);
        else newNotes[r][c].add(n);
        setNotes(newNotes);
        return;
      }

      const newGrid: Grid = userGrid.map((row) => [...row]);
      newGrid[r][c] = n === 0 ? null : newGrid[r][c] === n ? null : n;
      setUserGrid(newGrid);
      playSound("click");

      const newErrors = emptyErrors();
      let hasError = false;
      for (let row = 0; row < 9; row++)
        for (let col = 0; col < 9; col++)
          if (newGrid[row][col] !== null && newGrid[row][col] !== solution[row][col]) {
            newErrors[row][col] = true;
            hasError = true;
          }
      setErrors(newErrors);
      if (n !== 0 && newGrid[r][c] !== null && newGrid[r][c] !== solution[r][c]) {
        playSound("wrong");
      }

      const complete = newGrid.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]));
      if (complete) {
        setPhase("won");
        playChord(["success", "win"]);
        if (best[difficulty] === 0 || time < best[difficulty]) {
          const updated = { ...best, [difficulty]: time };
          setBest(updated);
          try {
            localStorage.setItem("sudoku-best", JSON.stringify(updated));
          } catch {
            /* ignore */
          }
        }
      }
      void hasError;
    },
    [selected, phase, given, noteMode, notes, userGrid, solution, best, difficulty, time],
  );

  const useHint = useCallback(() => {
    if (hints <= 0 || !selected || phase !== "playing") return;
    const [r, c] = selected;
    if (given[r]?.[c] || userGrid[r][c] === solution[r][c]) return;
    const newGrid: Grid = userGrid.map((row) => [...row]);
    newGrid[r][c] = solution[r][c];
    setUserGrid(newGrid);
    setHints((h) => h - 1);
    const newErrors = errors.map((row) => [...row]);
    newErrors[r][c] = false;
    setErrors(newErrors);

    const complete = newGrid.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]));
    if (complete) {
      setPhase("won");
      playChord(["success", "win"]);
      if (best[difficulty] === 0 || time < best[difficulty]) {
        const updated = { ...best, [difficulty]: time };
        setBest(updated);
        try {
          localStorage.setItem("sudoku-best", JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }
    }
  }, [hints, selected, phase, given, userGrid, solution, errors, best, difficulty, time]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key >= "1" && e.key <= "9") {
        handleInput(parseInt(e.key, 10));
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        handleInput(0);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        setNoteMode((m) => !m);
        return;
      }
      if (!selected) return;
      const [r, c] = selected;
      if (e.key === "ArrowUp" && r > 0) setSelected([r - 1, c]);
      if (e.key === "ArrowDown" && r < 8) setSelected([r + 1, c]);
      if (e.key === "ArrowLeft" && c > 0) setSelected([r, c - 1]);
      if (e.key === "ArrowRight" && c < 8) setSelected([r, c + 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, selected, handleInput]);

  const getCellClass = (r: number, c: number): string => {
    const isSelected = selected?.[0] === r && selected?.[1] === c;
    const sel = selected;
    const isHighlight =
      sel &&
      (sel[0] === r ||
        sel[1] === c ||
        (Math.floor(sel[0] / 3) === Math.floor(r / 3) && Math.floor(sel[1] / 3) === Math.floor(c / 3)));
    const isSameNum = sel && userGrid[sel[0]]?.[sel[1]] != null && userGrid[r][c] === userGrid[sel[0]][sel[1]];

    if (isSelected) return "bg-primary/30";
    if (isSameNum) return "bg-primary/15";
    if (isHighlight) return "bg-muted/60";
    return "bg-background";
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Sudoku"
      description="Fill the 9×9 grid so every row, column and box contains digits 1–9."
    >
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 min-h-[500px] relative">
        {phase === "setup" && (
          <div className="text-center space-y-6 py-4">
            <p className="text-5xl">🔢</p>
            <h2 className="text-2xl font-black text-foreground">Sudoku</h2>
            <div className="flex gap-3 justify-center flex-wrap">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl font-bold border-2 capitalize transition-all",
                    difficulty === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50",
                  )}
                >
                  {d}
                  <span className="block text-xs opacity-70 font-normal">
                    {d === "easy" ? "45 clues" : d === "medium" ? "35 clues" : "25 clues"}
                  </span>
                </button>
              ))}
            </div>
            {mounted && (
              <div className="space-y-1">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) =>
                  best[d] > 0 ? (
                    <p key={d} className="text-xs text-muted-foreground capitalize">
                      {d} best: {fmt(best[d])}
                    </p>
                  ) : null,
                )}
              </div>
            )}
            <button
              onClick={startGame}
              className="px-10 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:opacity-90 transition"
            >
              ▶ Start Game
            </button>
          </div>
        )}

        {phase !== "setup" && (
          <>
            <div className="flex items-center justify-between w-full max-w-sm mx-auto mb-3 gap-2">
              <div className="flex items-center gap-1 text-sm font-bold text-foreground">⏱ {fmt(time)}</div>
              <div className="flex gap-1.5 flex-wrap justify-center">
                <button
                  onClick={() => setNoteMode((m) => !m)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                    noteMode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border",
                  )}
                >
                  ✏️ Notes
                </button>
                <button
                  onClick={useHint}
                  disabled={hints === 0 || !selected}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:border-yellow-500/50 disabled:opacity-40 transition-all"
                >
                  💡 {hints}
                </button>
                <button
                  onClick={startGame}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:border-primary/50 transition-all"
                >
                  🔄
                </button>
              </div>
              <div className="text-xs font-bold text-muted-foreground capitalize">{difficulty}</div>
            </div>

            <div className="grid grid-cols-9 border-2 border-foreground rounded-xl overflow-hidden w-full max-w-sm mx-auto">
              {userGrid.map((row, r) =>
                row.map((val, c) => {
                  const noteSet = notes[r][c];
                  const isError = errors[r][c];
                  const isGiven = given[r]?.[c];
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => setSelected([r, c])}
                      className={cn(
                        "aspect-square flex items-center justify-center text-sm sm:text-base font-bold transition-colors relative select-none",
                        c % 3 === 0 && c !== 0 ? "border-l-2 border-l-foreground/40" : "border-l border-l-border/30",
                        r % 3 === 0 && r !== 0 ? "border-t-2 border-t-foreground/40" : "border-t border-t-border/30",
                        getCellClass(r, c),
                        isGiven ? "text-foreground font-black" : isError ? "text-red-500" : "text-primary",
                      )}
                    >
                      {val !== null ? (
                        val
                      ) : noteSet.size > 0 ? (
                        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <span
                              key={n}
                              className={cn(
                                "text-[6px] sm:text-[8px] flex items-center justify-center",
                                noteSet.has(n) ? "text-muted-foreground" : "text-transparent",
                              )}
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>

            <div className="flex gap-1.5 justify-center mt-4 flex-wrap max-w-sm mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => handleInput(n)}
                  className="w-9 h-10 sm:w-10 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-secondary font-bold text-foreground transition-all"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handleInput(0)}
                className="w-9 h-10 sm:w-10 rounded-xl border-2 border-border bg-card hover:border-red-500/50 hover:bg-red-500/10 text-muted-foreground transition-all text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </>
        )}

        {phase === "won" && (
          <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
              <p className="text-5xl mb-3">🎉</p>
              <p className="text-2xl font-black text-foreground mb-1">Puzzle Solved!</p>
              <p className="text-muted-foreground mb-1">Time: {fmt(time)}</p>
              {best[difficulty] === time && time > 0 && (
                <p className="text-yellow-500 font-bold mb-3">🏆 New Best Time!</p>
              )}
              <div className="flex gap-3 justify-center mt-4 flex-wrap">
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
                >
                  New Puzzle
                </button>
                <button
                  onClick={() => setPhase("setup")}
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-secondary transition"
                >
                  Change Difficulty
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdZone id="sudoku-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose a difficulty and tap any empty cell to select it.",
          "Type a number or use the number pad — enable Notes mode to pencil in possibilities.",
          "Use hints if you're stuck — fill every cell correctly to win!",
        ]}
      />

      <ToolSeoContent
        title="Free Sudoku Puzzle Online — Play Easy, Medium & Hard Sudoku"
        description="Play free Sudoku puzzles online with three difficulty levels. Fill the 9×9 grid so every row, column, and 3×3 box contains the digits 1–9. No signup required."
        body={[
          "Skycally's Sudoku generates a fresh puzzle every game across three difficulty levels: Easy (many cells pre-filled), Medium (balanced challenge), and Hard (minimal clues for experienced solvers). Click or tap any empty cell, then type or tap a number to fill it. Conflicting entries are highlighted automatically so you can catch mistakes immediately.",
          "Sudoku is a logic puzzle played on a 9×9 grid divided into nine 3×3 boxes. The rule is simple: fill every empty cell with a digit from 1 to 9 such that each row, each column, and each 3×3 box contains every digit exactly once. No arithmetic is required — just logic and deduction.",
          "The puzzle has a rich history: it was popularized by Japanese publisher Nikoli in 1986 under the name Sūdoku (数独, meaning 'single number'). Before that, similar puzzles existed in French newspapers in the 1890s. Today Sudoku appears in newspapers, magazines, and apps worldwide, and is one of the most popular logic puzzles ever created.",
          "For beginners, start with Easy mode and look for rows, columns, or boxes that only have one empty cell — those can be filled immediately. As you improve, learn techniques like naked singles, hidden singles, and box-line reduction. Hard puzzles may require more advanced techniques like X-wing or swordfish patterns.",
        ]}
        faqs={[
          {
            question: "How do I play Sudoku?",
            answer:
              "Fill every empty cell in the 9×9 grid with a digit 1–9 so that each row, each column, and each 3×3 box contains every digit exactly once. No cell can repeat a number in its row, column, or box.",
          },
          {
            question: "What are the three difficulty levels?",
            answer:
              "Easy has many pre-filled cells and can be solved with basic techniques. Medium requires some deduction. Hard has minimal clues and requires advanced logic techniques.",
          },
          {
            question: "Does the puzzle highlight mistakes?",
            answer:
              "Yes. Cells that conflict with another number in the same row, column, or box are highlighted in red automatically.",
          },
          {
            question: "Is every puzzle solvable?",
            answer:
              "Yes. Every generated puzzle has exactly one valid solution, which is confirmed before the puzzle is presented.",
          },
          {
            question: "Can I use pencil marks / notes?",
            answer:
              "Check if the tool supports a note mode — some implementations include a toggle for candidate numbers.",
          },
          {
            question: "What is a naked single?",
            answer:
              "A naked single is a cell where only one digit is possible — all other digits already appear in the same row, column, or box. Finding naked singles is the most basic solving technique.",
          },
          {
            question: "Is my progress saved?",
            answer: "Progress is kept while you have the browser tab open. Refreshing the page starts a new puzzle.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. Tap a cell to select it, then tap a number from the on-screen number pad. Fully responsive for smartphone and tablet play.",
          },
        ]}
      />

      <RelatedTools currentSlug="sudoku" />
    </ToolPageShell>
  );
}
