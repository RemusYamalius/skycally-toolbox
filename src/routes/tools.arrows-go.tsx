import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/arrows-go")({
  head: () => buildToolMeta(toolBySlug("arrows-go", tools)),
  component: ArrowsGoPage,
});

// ============ Types ============
type Dir = "U" | "D" | "L" | "R";
type CellState = "empty" | "unvisited" | "visited" | "current" | "dead";

interface Cell {
  dir: Dir | null;
  state: CellState;
}

interface Level {
  id: number;
  label: string;
  grid: (Dir | null)[][];
  startR: number;
  startC: number;
}

const ARROW_SYMBOL: Record<Dir, string> = {
  U: "↑",
  D: "↓",
  L: "←",
  R: "→",
};

const DIR_DELTA: Record<Dir, [number, number]> = {
  U: [-1, 0],
  D: [1, 0],
  L: [0, -1],
  R: [0, 1],
};

const LEVELS: Level[] = [
  { id: 1, label: "Level 1", startR: 0, startC: 0, grid: [["R","R","D"],["U","R","D"],["U","L","L"]] },
  { id: 2, label: "Level 2", startR: 0, startC: 0, grid: [["D","R","D"],["D","U","U"],["R","R","U"]] },
  { id: 3, label: "Level 3", startR: 0, startC: 0, grid: [["R","R","R","D"],["U","R","D","D"],["U","U","D","D"],["U","L","L","L"]] },
  { id: 4, label: "Level 4", startR: 0, startC: 0, grid: [["D","R","D","L"],["D","U","D","U"],["R","R","U","U"],["R","U","L","L"]] },
  { id: 5, label: "Level 5", startR: 0, startC: 0, grid: [["R","D","L","D"],["U","D","U","D"],["U","R","R","U"],["R","R","U","L"]] },
  { id: 6, label: "Level 6", startR: 0, startC: 0, grid: [["R","R","R","R","D"],["U","R","R","D","D"],["U","U","D","D","D"],["U","U","D","L","L"],["U","L","L","L","L"]] },
  { id: 7, label: "Level 7", startR: 0, startC: 0, grid: [["D","R","D","L","D"],["D","U","D","U","D"],["R","R","U","R","U"],["U","D","L","D","L"],["U","R","R","R","U"]] },
  { id: 8, label: "Level 8", startR: 0, startC: 0, grid: [["R","D","L","D","L"],["U","D","U","D","U"],["U","R","R","U","L"],["U","D","L","D","L"],["U","R","R","R","U"]] },
  { id: 9, label: "Level 9", startR: 0, startC: 0, grid: [["D","R","R","D","L"],["R","U","D","L","U"],["U","R","U","D","L"],["U","D","L","U","D"],["R","R","R","U","L"]] },
  { id: 10, label: "Level 10", startR: 0, startC: 0, grid: [["R","R","D","L","D"],["U","D","D","U","D"],["U","R","U","L","D"],["U","D","L","D","L"],["U","R","R","R","U"]] },
  { id: 11, label: "Level 11", startR: 0, startC: 0, grid: [["R","R","R","R","R","D"],["U","R","R","R","D","D"],["U","U","R","D","D","D"],["U","U","U","D","L","L"],["U","U","L","L","L","L"],["U","L","L","L","L","L"]] },
  { id: 12, label: "Level 12", startR: 0, startC: 0, grid: [["D","R","R","D","L","D"],["D","U","D","D","U","D"],["R","R","U","R","R","U"],["U","D","L","U","D","L"],["U","D","R","R","U","L"],["U","R","U","L","L","L"]] },
  { id: 13, label: "Level 13", startR: 0, startC: 0, grid: [["R","D","L","R","D","L"],["U","D","U","U","D","U"],["U","R","R","R","U","L"],["U","D","L","D","R","L"],["U","R","U","R","U","L"],["R","U","L","U","L","L"]] },
  { id: 14, label: "Level 14", startR: 0, startC: 0, grid: [["D","R","D","L","D","L"],["R","U","D","U","D","U"],["U","L","U","D","U","L"],["U","D","R","U","L","D"],["U","R","U","L","D","D"],["R","R","R","R","U","L"]] },
  { id: 15, label: "Level 15", startR: 0, startC: 0, grid: [["R","R","D","L","D","L"],["U","D","D","U","R","U"],["U","R","U","L","D","L"],["U","D","R","D","U","L"],["U","R","U","R","U","L"],["R","U","L","U","L","L"]] },
  { id: 16, label: "Level 16", startR: 0, startC: 0, grid: [["R","R","R","R","R","R","D"],["U","R","R","R","R","D","D"],["U","U","R","R","D","D","D"],["U","U","U","D","D","D","L"],["U","U","L","L","D","L","L"],["U","L","L","L","L","L","L"],["U","L","L","L","L","L","L"]] },
  { id: 17, label: "Level 17", startR: 0, startC: 0, grid: [["D","R","D","L","D","R","D"],["D","U","D","U","D","U","D"],["R","R","U","R","U","L","U"],["U","D","L","D","R","D","L"],["U","R","U","R","U","D","L"],["U","D","L","U","L","D","L"],["U","R","R","R","R","U","L"]] },
  { id: 18, label: "Level 18", startR: 0, startC: 0, grid: [["R","D","L","R","R","D","L"],["U","D","U","U","D","D","U"],["U","R","R","R","U","R","U"],["U","D","L","D","L","D","L"],["U","R","U","R","U","D","L"],["U","D","L","U","L","D","L"],["U","R","R","R","R","U","L"]] },
  { id: 19, label: "Level 19", startR: 0, startC: 0, grid: [["D","R","R","D","L","D","L"],["R","U","D","U","D","D","U"],["U","L","U","L","U","R","U"],["U","D","R","D","L","D","L"],["U","R","U","R","U","D","L"],["U","D","L","U","L","R","U"],["U","R","R","R","U","L","L"]] },
  { id: 20, label: "Level 20", startR: 0, startC: 0, grid: [["R","D","L","D","R","D","L"],["U","D","U","R","U","D","U"],["U","R","R","U","L","U","L"],["U","D","L","D","R","D","L"],["U","R","U","R","U","D","L"],["U","D","L","U","L","R","U"],["U","R","R","D","L","U","L"]] },
];

function ArrowsGoPage() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [, setPath] = useState<[number, number][]>([]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [totalCells, setTotalCells] = useState(0);
  const [phase, setPhase] = useState<"playing" | "won" | "dead">("playing");
  const [lives, setLives] = useState(5);
  const [hints, setHints] = useState(3);
  const [moves, setMoves] = useState(0);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("arrowsgo-best");
      if (raw) setBestMoves(JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }, []);

  const initLevel = useCallback((idx: number) => {
    const level = LEVELS[idx];
    const newGrid: Cell[][] = level.grid.map((row) =>
      row.map((dir) => ({
        dir,
        state: dir === null ? ("empty" as CellState) : ("unvisited" as CellState),
      })),
    );
    newGrid[level.startR][level.startC].state = "current";
    const total = level.grid.flat().filter((d) => d !== null).length;
    setGrid(newGrid);
    setPos([level.startR, level.startC]);
    setPath([[level.startR, level.startC]]);
    setVisitedCount(1);
    setTotalCells(total);
    setPhase("playing");
    setMoves(0);
    setHints(3);
  }, []);

  useEffect(() => {
    initLevel(levelIndex);
  }, [levelIndex, initLevel]);

  const handleDead = useCallback(() => {
    playSound("fail");
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setPhase("dead");
        playSound("die");
      } else {
        setPhase("dead");
        setTimeout(() => {
          const level = LEVELS[levelIndex];
          const newGrid: Cell[][] = level.grid.map((row) =>
            row.map((dir) => ({
              dir,
              state: dir === null ? ("empty" as CellState) : ("unvisited" as CellState),
            })),
          );
          newGrid[level.startR][level.startC].state = "current";
          const total = level.grid.flat().filter((d) => d !== null).length;
          setGrid(newGrid);
          setPos([level.startR, level.startC]);
          setPath([[level.startR, level.startC]]);
          setVisitedCount(1);
          setTotalCells(total);
          setPhase("playing");
          setMoves(0);
        }, 800);
      }
      return newLives;
    });
  }, [levelIndex]);

  const step = useCallback(() => {
    if (phase !== "playing") return;
    const level = LEVELS[levelIndex];
    const [r, c] = pos;
    const dir = level.grid[r][c];
    if (!dir) return;
    const [dr, dc] = DIR_DELTA[dir];
    const nr = r + dr;
    const nc = c + dc;
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || level.grid[nr][nc] === null) {
      handleDead();
      return;
    }
    if (grid[nr][nc].state === "visited" || grid[nr][nc].state === "current") {
      handleDead();
      return;
    }
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    newGrid[r][c].state = "visited";
    newGrid[nr][nc].state = "current";
    const newVisited = visitedCount + 1;
    setGrid(newGrid);
    setPos([nr, nc]);
    setPath((p) => [...p, [nr, nc]]);
    setVisitedCount(newVisited);
    setMoves((m) => m + 1);
    playSound("click");

    if (newVisited === totalCells) {
      setPhase("won");
      playChord(["success", "win"]);
      const newMoves = moves + 1;
      setBestMoves((prev) => {
        const cur = prev[levelIndex + 1];
        if (!cur || newMoves < cur) {
          const upd = { ...prev, [levelIndex + 1]: newMoves };
          try { localStorage.setItem("arrowsgo-best", JSON.stringify(upd)); } catch (_) { /* ignore */ }
          return upd;
        }
        return prev;
      });
    }
  }, [phase, levelIndex, pos, grid, visitedCount, totalCells, moves, handleDead]);

  const useHint = useCallback(() => {
    if (hints <= 0 || phase !== "playing") return;
    const [r, c] = pos;
    const dir = LEVELS[levelIndex].grid[r][c];
    if (!dir) return;
    const [dr, dc] = DIR_DELTA[dir];
    setHintCell([r + dr, c + dc]);
    setHints((h) => h - 1);
    playSound("click");
    setTimeout(() => setHintCell(null), 1200);
  }, [hints, phase, pos, levelIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        step();
      }
      if (e.code === "KeyR") initLevel(levelIndex);
      if (e.code === "KeyH") useHint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, useHint, initLevel, levelIndex]);

  const level = LEVELS[levelIndex];
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const cellSize = Math.min(Math.floor(360 / Math.max(rows, cols)), 56);
  const progress = totalCells > 0 ? (visitedCount / totalCells) * 100 : 0;

  return (
    <ToolPageShell
      title="Arrows GO!"
      description="Follow the arrows and visit every cell exactly once. Can you clear the board?"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Top bar */}
        <div className="w-full max-w-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "text-lg transition",
                  i < lives ? "text-red-500" : "text-muted-foreground/30",
                )}
              >
                ♥
              </span>
            ))}
          </div>
          <span className="font-bold text-foreground text-sm">{level.label}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {visitedCount}/{totalCells}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Board */}
        <div
          className="grid gap-1 p-3 rounded-2xl bg-card border border-border"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              if (cell.dir === null) {
                return <div key={`${r}-${c}`} />;
              }
              const isCurrent = cell.state === "current";
              const isVisited = cell.state === "visited";
              const isHint = hintCell?.[0] === r && hintCell?.[1] === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "flex items-center justify-center rounded-lg font-bold transition-all select-none border",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary scale-105 shadow-lg"
                      : isVisited
                        ? "bg-primary/20 text-primary/70 border-primary/30"
                        : isHint
                          ? "bg-yellow-400/30 text-yellow-500 border-yellow-400 animate-pulse"
                          : "bg-secondary text-foreground border-border",
                    phase === "dead" && lives > 0 && "bg-red-500/30 border-red-500",
                  )}
                  style={{ fontSize: cellSize * 0.5 }}
                >
                  {ARROW_SYMBOL[cell.dir]}
                </div>
              );
            }),
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <button
            onClick={step}
            disabled={phase !== "playing"}
            className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
          >
            GO →
          </button>
          <button
            onClick={useHint}
            disabled={hints <= 0 || phase !== "playing"}
            className="px-4 py-3 rounded-xl border border-border font-bold text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            💡 {hints}
          </button>
          <button
            onClick={() => {
              initLevel(levelIndex);
              setLives(5);
            }}
            className="px-4 py-3 rounded-xl border border-border font-bold text-foreground hover:bg-secondary transition"
            aria-label="Reset"
          >
            ↺
          </button>
        </div>

        {/* Level selector */}
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-2 text-center">Select level</p>
          <div className="grid grid-cols-10 gap-1.5">
            {LEVELS.map((lv, i) => (
              <button
                key={lv.id}
                onClick={() => {
                  setLevelIndex(i);
                  setLives(5);
                }}
                className={cn(
                  "w-full aspect-square rounded-lg text-xs font-bold border transition",
                  i === levelIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : bestMoves[lv.id]
                      ? "bg-green-500/20 text-green-500 border-green-500/30"
                      : "bg-card text-foreground border-border hover:bg-secondary",
                )}
              >
                {lv.id}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary">Space</kbd> to go ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary">H</kbd> for hint ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary">R</kbd> to reset
        </p>
      </div>

      {/* Win overlay */}
      {phase === "won" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-2xl font-black text-foreground mb-1">Level Cleared!</p>
            <p className="text-muted-foreground text-sm mb-2">Moves: {moves}</p>
            {bestMoves[levelIndex + 1] === moves && (
              <p className="text-yellow-500 font-bold text-sm mb-4">🏆 New Best!</p>
            )}
            <div className="flex gap-2 justify-center mt-4">
              {levelIndex < LEVELS.length - 1 && (
                <button
                  onClick={() => {
                    setLevelIndex((i) => i + 1);
                    setLives(5);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
                >
                  Next Level →
                </button>
              )}
              <button
                onClick={() => {
                  initLevel(levelIndex);
                  setLives(5);
                }}
                className="px-6 py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-secondary transition"
              >
                Replay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === "dead" && lives <= 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">💔</p>
            <p className="text-2xl font-black text-foreground mb-1">No Lives Left!</p>
            <p className="text-muted-foreground text-sm mb-6">Take a breath and try again.</p>
            <button
              onClick={() => {
                initLevel(levelIndex);
                setLives(5);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Press GO or tap the glowing cell to follow the arrow to the next cell.",
          "Your goal is to visit every cell on the board exactly once.",
          "If you hit a visited cell or go out of bounds you lose a life — use hints wisely!",
        ]}
      />

      <RelatedTools currentSlug="arrows-go" />

      <ToolSeoContent
        title="Arrows GO! — Free Online Arrow Puzzle Game"
        description="Play Arrows GO! online for free. Follow the arrows and clear every cell in 20 handcrafted levels. Logic puzzle with increasing difficulty!"
        body={[
          "Arrows GO! is a minimalist logic puzzle where every cell on the board points in a fixed direction. Starting from the top-left tile, you follow the arrows step by step and try to visit every single cell exactly once. Each tap of the GO button moves you one square in the direction the current arrow points. Sounds simple — until a row of arrows sends you crashing into a tile you already visited or right off the edge of the board.",
          "The game ships with 20 handcrafted levels that ramp up from gentle 3×3 warm-ups to brain-bending 7×7 expert puzzles. You have five lives per attempt and three hints per level that briefly highlight the next cell, so you can plan your route without spoiling the whole solution. Your best move count for each level is saved locally, so you can come back and try to beat your own personal record any time.",
        ]}
        faqs={[
          {
            question: "How do I win a level?",
            answer:
              "You win when every cell on the board has been visited exactly once. The current cell glows, visited cells are dimmed, and a progress counter at the top shows how many tiles are left to clear.",
          },
          {
            question: "What happens if I hit a dead end?",
            answer:
              "If the arrow you're standing on points off the board or into a cell you have already visited, you lose a life, the board flashes red, and the level resets so you can try a different opening move. Run out of lives and you'll see the game-over screen and start fresh with all five lives.",
          },
          {
            question: "Are there keyboard shortcuts?",
            answer:
              "Yes — press Space or the right-arrow key to take a step, H to use a hint, and R to reset the current level. On mobile you can use the GO, hint, and reset buttons at the bottom of the board.",
          },
          {
            question: "How does the hint system work?",
            answer:
              "You start each level with three hints. Tapping the lightbulb briefly highlights the next cell your current arrow points to, so you can verify the move is safe before committing. Hints reset automatically every time you start or restart a level.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
