import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

interface Arrow {
  id: number;
  dir: Dir;
  cells: [number, number][]; // tail → head
  exiting: boolean;
}

interface LevelDef {
  id: number;
  label: string;
  rows: number;
  cols: number;
  shape: boolean[][];
  arrows: { dir: Dir; cells: [number, number][] }[];
}

type GridCell = number; // -1 outside, 0 empty, >0 arrowId

const DELTA: Record<Dir, [number, number]> = {
  U: [-1, 0],
  D: [1, 0],
  L: [0, -1],
  R: [0, 1],
};

const ARROW_SYMBOL: Record<Dir, string> = {
  U: "↑",
  D: "↓",
  L: "←",
  R: "→",
};

const S = (rows: string[]): boolean[][] =>
  rows.map((r) => r.split("").map((c) => c === "#"));

const ARROW_COLORS = [
  "bg-blue-500/80 text-white border-blue-400",
  "bg-red-500/80 text-white border-red-400",
  "bg-green-500/80 text-white border-green-400",
  "bg-yellow-500/80 text-black border-yellow-400",
  "bg-purple-500/80 text-white border-purple-400",
  "bg-orange-500/80 text-white border-orange-400",
  "bg-pink-500/80 text-white border-pink-400",
  "bg-cyan-500/80 text-white border-cyan-400",
  "bg-teal-500/80 text-white border-teal-400",
  "bg-indigo-500/80 text-white border-indigo-400",
];

const LEVELS: LevelDef[] = [
  {
    id: 1, label: "Level 1", rows: 4, cols: 4,
    shape: S(["####", "####", "####", "####"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1]] },
      { dir: "D", cells: [[0, 2], [1, 2]] },
      { dir: "L", cells: [[0, 3]] },
      { dir: "R", cells: [[1, 0]] },
      { dir: "D", cells: [[1, 3], [2, 3]] },
      { dir: "R", cells: [[2, 0]] },
      { dir: "L", cells: [[2, 2]] },
      { dir: "U", cells: [[3, 0], [2, 0]] },
      { dir: "R", cells: [[3, 1], [3, 2]] },
      { dir: "U", cells: [[3, 3]] },
    ],
  },
  {
    id: 2, label: "Level 2", rows: 5, cols: 5,
    shape: S(["#####", "#####", "#####", "#####", "#####"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3]] },
      { dir: "L", cells: [[0, 4]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "D", cells: [[1, 4], [2, 4]] },
      { dir: "L", cells: [[2, 0], [2, 1]] },
      { dir: "D", cells: [[2, 2], [3, 2]] },
      { dir: "R", cells: [[2, 3]] },
      { dir: "L", cells: [[3, 1]] },
      { dir: "R", cells: [[3, 3], [3, 4]] },
      { dir: "U", cells: [[4, 0]] },
      { dir: "R", cells: [[4, 1], [4, 2]] },
      { dir: "L", cells: [[4, 4]] },
    ],
  },
  {
    id: 3, label: "Level 3", rows: 5, cols: 5,
    shape: S(["..#..", ".###.", "#####", ".###.", "..#.."]),
    arrows: [
      { dir: "D", cells: [[0, 2], [1, 2]] },
      { dir: "L", cells: [[1, 1]] },
      { dir: "R", cells: [[1, 3]] },
      { dir: "L", cells: [[2, 0], [2, 1]] },
      { dir: "D", cells: [[2, 2], [3, 2]] },
      { dir: "R", cells: [[2, 3], [2, 4]] },
      { dir: "L", cells: [[3, 1]] },
      { dir: "R", cells: [[3, 3]] },
      { dir: "D", cells: [[4, 2]] },
    ],
  },
  {
    id: 4, label: "Level 4", rows: 5, cols: 5,
    shape: S([".###.", ".###.", "#####", ".###.", ".###."]),
    arrows: [
      { dir: "D", cells: [[0, 1], [1, 1]] },
      { dir: "U", cells: [[0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3]] },
      { dir: "L", cells: [[1, 2]] },
      { dir: "L", cells: [[2, 0], [2, 1]] },
      { dir: "R", cells: [[2, 3], [2, 4]] },
      { dir: "D", cells: [[3, 1]] },
      { dir: "R", cells: [[3, 2], [3, 3]] },
      { dir: "U", cells: [[4, 1]] },
      { dir: "D", cells: [[4, 2]] },
      { dir: "U", cells: [[4, 3], [3, 3]] },
    ],
  },
  {
    id: 5, label: "Level 5", rows: 6, cols: 6,
    shape: S([".##.##", "######", "######", ".####.", "..##..", "...#.."]),
    arrows: [
      { dir: "R", cells: [[0, 1]] },
      { dir: "L", cells: [[0, 3], [0, 4]] },
      { dir: "D", cells: [[1, 0], [2, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "L", cells: [[1, 3], [1, 4]] },
      { dir: "U", cells: [[1, 5], [0, 5]] },
      { dir: "D", cells: [[2, 1], [3, 1]] },
      { dir: "R", cells: [[2, 2]] },
      { dir: "L", cells: [[2, 3]] },
      { dir: "L", cells: [[2, 5]] },
      { dir: "R", cells: [[3, 2], [3, 3]] },
      { dir: "L", cells: [[3, 4]] },
      { dir: "D", cells: [[4, 2]] },
      { dir: "R", cells: [[4, 3]] },
      { dir: "D", cells: [[5, 3]] },
    ],
  },
  {
    id: 6, label: "Level 6", rows: 5, cols: 7,
    shape: S(["...#...", "..###..", "#######", "..###..", "...#..."]),
    arrows: [
      { dir: "U", cells: [[0, 3]] },
      { dir: "L", cells: [[1, 2]] },
      { dir: "R", cells: [[1, 4]] },
      { dir: "L", cells: [[2, 0], [2, 1], [2, 2]] },
      { dir: "U", cells: [[2, 3], [1, 3]] },
      { dir: "R", cells: [[2, 4], [2, 5], [2, 6]] },
      { dir: "L", cells: [[3, 2]] },
      { dir: "R", cells: [[3, 4]] },
      { dir: "D", cells: [[4, 3]] },
    ],
  },
  {
    id: 7, label: "Level 7", rows: 6, cols: 6,
    shape: S(["######", "######", "######", "######", "######", "######"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3]] },
      { dir: "L", cells: [[0, 4], [0, 5]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "D", cells: [[1, 4], [2, 4]] },
      { dir: "L", cells: [[1, 5]] },
      { dir: "D", cells: [[2, 0], [3, 0]] },
      { dir: "L", cells: [[2, 1], [2, 2], [2, 3]] },
      { dir: "R", cells: [[2, 5]] },
      { dir: "R", cells: [[3, 2], [3, 3]] },
      { dir: "D", cells: [[3, 4], [4, 4]] },
      { dir: "U", cells: [[3, 5]] },
      { dir: "R", cells: [[4, 0], [4, 1]] },
      { dir: "L", cells: [[4, 2], [4, 3]] },
      { dir: "U", cells: [[4, 5]] },
      { dir: "U", cells: [[5, 0]] },
      { dir: "R", cells: [[5, 1], [5, 2], [5, 3]] },
      { dir: "D", cells: [[5, 4]] },
      { dir: "L", cells: [[5, 5]] },
    ],
  },
  {
    id: 8, label: "Level 8", rows: 7, cols: 7,
    shape: S(["...#...", "..###..", "#######", "##.#.##", "#######", "..###..", "...#..."]),
    arrows: [
      { dir: "U", cells: [[0, 3]] },
      { dir: "L", cells: [[1, 2]] },
      { dir: "R", cells: [[1, 4]] },
      { dir: "L", cells: [[2, 0], [2, 1], [2, 2]] },
      { dir: "D", cells: [[2, 3], [3, 3]] },
      { dir: "R", cells: [[2, 4], [2, 5], [2, 6]] },
      { dir: "L", cells: [[3, 0], [3, 1]] },
      { dir: "R", cells: [[3, 5], [3, 6]] },
      { dir: "L", cells: [[4, 0], [4, 1], [4, 2]] },
      { dir: "R", cells: [[4, 4], [4, 5], [4, 6]] },
      { dir: "L", cells: [[5, 2]] },
      { dir: "R", cells: [[5, 4]] },
      { dir: "D", cells: [[6, 3]] },
    ],
  },
  {
    id: 9, label: "Level 9", rows: 5, cols: 7,
    shape: S(["#######", "#######", "..###..", "..###..", "..###.."]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3]] },
      { dir: "L", cells: [[0, 4], [0, 5], [0, 6]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "L", cells: [[1, 4], [1, 5]] },
      { dir: "U", cells: [[1, 6]] },
      { dir: "D", cells: [[2, 2], [3, 2]] },
      { dir: "D", cells: [[2, 4], [3, 4]] },
      { dir: "L", cells: [[3, 3]] },
      { dir: "U", cells: [[4, 2]] },
      { dir: "D", cells: [[4, 3]] },
      { dir: "U", cells: [[4, 4]] },
    ],
  },
  {
    id: 10, label: "Level 10", rows: 7, cols: 6,
    shape: S([".####.", ".####.", "######", ".####.", "#.##.#", "#.##.#", ".####."]),
    arrows: [
      { dir: "R", cells: [[0, 1], [0, 2]] },
      { dir: "L", cells: [[0, 3], [0, 4]] },
      { dir: "D", cells: [[1, 1], [2, 1]] },
      { dir: "U", cells: [[1, 2]] },
      { dir: "D", cells: [[1, 3], [2, 3]] },
      { dir: "U", cells: [[1, 4]] },
      { dir: "L", cells: [[2, 0]] },
      { dir: "R", cells: [[2, 2]] },
      { dir: "L", cells: [[2, 4]] },
      { dir: "R", cells: [[2, 5]] },
      { dir: "D", cells: [[3, 1], [4, 1]] },
      { dir: "U", cells: [[3, 2]] },
      { dir: "D", cells: [[3, 3], [4, 3]] },
      { dir: "U", cells: [[3, 4]] },
      { dir: "L", cells: [[4, 0]] },
      { dir: "R", cells: [[4, 5]] },
      { dir: "D", cells: [[5, 1], [6, 1]] },
      { dir: "U", cells: [[5, 2]] },
      { dir: "D", cells: [[5, 3], [6, 3]] },
      { dir: "U", cells: [[5, 4]] },
      { dir: "R", cells: [[6, 2]] },
      { dir: "L", cells: [[6, 4]] },
    ],
  },
  {
    id: 11, label: "Level 11", rows: 7, cols: 7,
    shape: S(["#######", "#######", "#######", "#######", "#######", "#######", "#######"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3], [2, 3]] },
      { dir: "L", cells: [[0, 4], [0, 5], [0, 6]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "L", cells: [[1, 4], [1, 5]] },
      { dir: "U", cells: [[1, 6]] },
      { dir: "D", cells: [[2, 0], [3, 0]] },
      { dir: "L", cells: [[2, 1], [2, 2]] },
      { dir: "R", cells: [[2, 4], [2, 5]] },
      { dir: "U", cells: [[2, 6]] },
      { dir: "R", cells: [[3, 1], [3, 2]] },
      { dir: "L", cells: [[3, 4], [3, 5]] },
      { dir: "D", cells: [[3, 6], [4, 6]] },
      { dir: "U", cells: [[4, 0]] },
      { dir: "D", cells: [[4, 1], [5, 1]] },
      { dir: "R", cells: [[4, 2], [4, 3]] },
      { dir: "L", cells: [[4, 4], [4, 5]] },
      { dir: "D", cells: [[5, 0], [6, 0]] },
      { dir: "R", cells: [[5, 3], [5, 4]] },
      { dir: "U", cells: [[5, 5]] },
      { dir: "L", cells: [[5, 6]] },
      { dir: "R", cells: [[6, 1], [6, 2], [6, 3]] },
      { dir: "L", cells: [[6, 4], [6, 5], [6, 6]] },
    ],
  },
  {
    id: 12, label: "Level 12", rows: 6, cols: 8,
    shape: S(["##...##.", "####.###", "########", "########", "###.####", ".##...##"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1]] },
      { dir: "L", cells: [[0, 5], [0, 6]] },
      { dir: "D", cells: [[1, 0], [2, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2], [1, 3]] },
      { dir: "L", cells: [[1, 5], [1, 6], [1, 7]] },
      { dir: "R", cells: [[2, 1], [2, 2]] },
      { dir: "L", cells: [[2, 4], [2, 5]] },
      { dir: "U", cells: [[2, 6]] },
      { dir: "D", cells: [[2, 7], [3, 7]] },
      { dir: "D", cells: [[3, 0], [4, 0]] },
      { dir: "L", cells: [[3, 1], [3, 2], [3, 3]] },
      { dir: "R", cells: [[3, 4], [3, 5], [3, 6]] },
      { dir: "D", cells: [[4, 1], [5, 1]] },
      { dir: "U", cells: [[4, 2]] },
      { dir: "R", cells: [[4, 4]] },
      { dir: "L", cells: [[4, 5]] },
      { dir: "D", cells: [[4, 6], [5, 6]] },
      { dir: "U", cells: [[4, 7]] },
      { dir: "R", cells: [[5, 2]] },
      { dir: "L", cells: [[5, 7]] },
    ],
  },
  {
    id: 13, label: "Level 13", rows: 7, cols: 8,
    shape: S(["#####..#", "########", "########", "########", ".######.", ".##.##..", ".##.##.."]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1]] },
      { dir: "D", cells: [[0, 2], [1, 2]] },
      { dir: "L", cells: [[0, 3], [0, 4]] },
      { dir: "D", cells: [[0, 7], [1, 7]] },
      { dir: "D", cells: [[1, 0], [2, 0]] },
      { dir: "R", cells: [[1, 1]] },
      { dir: "R", cells: [[1, 3], [1, 4]] },
      { dir: "L", cells: [[1, 5], [1, 6]] },
      { dir: "U", cells: [[2, 1], [1, 1]] },
      { dir: "R", cells: [[2, 2], [2, 3]] },
      { dir: "L", cells: [[2, 4], [2, 5]] },
      { dir: "D", cells: [[2, 6], [3, 6]] },
      { dir: "D", cells: [[2, 7], [3, 7]] },
      { dir: "L", cells: [[3, 0], [3, 1], [3, 2]] },
      { dir: "R", cells: [[3, 3], [3, 4], [3, 5]] },
      { dir: "D", cells: [[4, 1], [5, 1]] },
      { dir: "R", cells: [[4, 2], [4, 3]] },
      { dir: "L", cells: [[4, 4], [4, 5]] },
      { dir: "D", cells: [[4, 6], [5, 6]] },
      { dir: "D", cells: [[5, 2], [6, 2]] },
      { dir: "D", cells: [[5, 4], [6, 4]] },
      { dir: "D", cells: [[6, 1]] },
      { dir: "L", cells: [[6, 5]] },
    ],
  },
  {
    id: 14, label: "Level 14", rows: 7, cols: 7,
    shape: S(["#######", "#######", ".#####.", "..###..", "..###..", ".#####.", ".#####."]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3]] },
      { dir: "L", cells: [[0, 4], [0, 5], [0, 6]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "L", cells: [[1, 4], [1, 5]] },
      { dir: "U", cells: [[1, 6]] },
      { dir: "D", cells: [[2, 1], [3, 1]] },
      { dir: "R", cells: [[2, 2]] },
      { dir: "L", cells: [[2, 4]] },
      { dir: "U", cells: [[2, 5], [1, 5]] },
      { dir: "U", cells: [[3, 2]] },
      { dir: "D", cells: [[3, 3], [4, 3]] },
      { dir: "U", cells: [[3, 4]] },
      { dir: "R", cells: [[4, 2]] },
      { dir: "L", cells: [[4, 4]] },
      { dir: "D", cells: [[5, 1], [6, 1]] },
      { dir: "R", cells: [[5, 2], [5, 3]] },
      { dir: "L", cells: [[5, 4], [5, 5]] },
      { dir: "R", cells: [[6, 2]] },
      { dir: "U", cells: [[6, 3], [5, 3]] },
      { dir: "L", cells: [[6, 4], [6, 5]] },
    ],
  },
  {
    id: 15, label: "Level 15", rows: 8, cols: 8,
    shape: S(["########", "########", "########", "########", "########", "########", "########", "########"]),
    arrows: [
      { dir: "R", cells: [[0, 0], [0, 1], [0, 2]] },
      { dir: "D", cells: [[0, 3], [1, 3], [2, 3]] },
      { dir: "L", cells: [[0, 4], [0, 5]] },
      { dir: "R", cells: [[0, 6], [0, 7]] },
      { dir: "U", cells: [[1, 0]] },
      { dir: "R", cells: [[1, 1], [1, 2]] },
      { dir: "D", cells: [[1, 4], [2, 4]] },
      { dir: "L", cells: [[1, 5], [1, 6]] },
      { dir: "U", cells: [[1, 7]] },
      { dir: "L", cells: [[2, 0], [2, 1], [2, 2]] },
      { dir: "R", cells: [[2, 5], [2, 6], [2, 7]] },
      { dir: "U", cells: [[3, 0]] },
      { dir: "R", cells: [[3, 1], [3, 2]] },
      { dir: "L", cells: [[3, 3], [3, 4]] },
      { dir: "L", cells: [[3, 5], [3, 6]] },
      { dir: "D", cells: [[3, 7], [4, 7]] },
      { dir: "D", cells: [[4, 0], [5, 0]] },
      { dir: "U", cells: [[4, 1]] },
      { dir: "R", cells: [[4, 2], [4, 3]] },
      { dir: "L", cells: [[4, 4], [4, 5]] },
      { dir: "U", cells: [[4, 6]] },
      { dir: "R", cells: [[5, 1], [5, 2], [5, 3]] },
      { dir: "D", cells: [[5, 4], [6, 4]] },
      { dir: "L", cells: [[5, 5], [5, 6], [5, 7]] },
      { dir: "U", cells: [[6, 0]] },
      { dir: "D", cells: [[6, 1], [7, 1]] },
      { dir: "L", cells: [[6, 2], [6, 3]] },
      { dir: "R", cells: [[6, 5], [6, 6]] },
      { dir: "U", cells: [[6, 7]] },
      { dir: "R", cells: [[7, 0]] },
      { dir: "R", cells: [[7, 2], [7, 3], [7, 4]] },
      { dir: "U", cells: [[7, 5]] },
      { dir: "L", cells: [[7, 6], [7, 7]] },
    ],
  },
];

// ============ Helpers ============
const buildGrid = (level: LevelDef, arrows: Arrow[]): GridCell[][] => {
  const grid: GridCell[][] = Array.from({ length: level.rows }, (_, r) =>
    Array.from({ length: level.cols }, (_, c) => (level.shape[r][c] ? 0 : -1)),
  );
  arrows.forEach((arrow) => {
    arrow.cells.forEach(([r, c]) => {
      if (r >= 0 && r < level.rows && c >= 0 && c < level.cols) {
        grid[r][c] = arrow.id;
      }
    });
  });
  return grid;
};

const isFree = (arrow: Arrow, grid: GridCell[][], level: LevelDef): boolean => {
  if (arrow.exiting) return false;
  const head = arrow.cells[arrow.cells.length - 1];
  const [dr, dc] = DELTA[arrow.dir];
  let r = head[0] + dr;
  let c = head[1] + dc;
  while (r >= 0 && r < level.rows && c >= 0 && c < level.cols) {
    if (!level.shape[r][c]) return true; // hit hole = path to exit
    if (grid[r][c] !== 0) return false;
    r += dr;
    c += dc;
  }
  return true;
};

function ArrowsGoPage() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [phase, setPhase] = useState<"playing" | "won">("playing");
  const [lives, setLives] = useState(5);
  const [hints, setHints] = useState(3);
  const [moves, setMoves] = useState(0);
  const [hintArrowId, setHintArrowId] = useState<number | null>(null);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});
  const animatingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("arrowsgo-best");
      if (raw) setBestMoves(JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }, []);

  const initLevel = useCallback((idx: number, keepLives?: number) => {
    const level = LEVELS[idx];
    const newArrows: Arrow[] = level.arrows.map((a, i) => ({
      id: i + 1,
      dir: a.dir,
      cells: a.cells.map((c) => [c[0], c[1]] as [number, number]),
      exiting: false,
    }));
    setArrows(newArrows);
    setGrid(buildGrid(level, newArrows));
    setPhase("playing");
    setLives(keepLives ?? 5);
    setMoves(0);
    setHintArrowId(null);
    animatingRef.current = false;
  }, []);

  useEffect(() => {
    initLevel(levelIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  const handleArrowClick = useCallback((arrowId: number) => {
    if (phase !== "playing" || animatingRef.current) return;
    const level = LEVELS[levelIndex];
    const arrow = arrows.find((a) => a.id === arrowId);
    if (!arrow || arrow.exiting) return;

    if (!isFree(arrow, grid, level)) {
      playSound("fail");
      setLives((prev) => {
        const nl = prev - 1;
        if (nl <= 0) playSound("die");
        return nl;
      });
      return;
    }

    playSound("correct");
    setMoves((m) => m + 1);
    animatingRef.current = true;

    const [dr, dc] = DELTA[arrow.dir];
    let currentCells: [number, number][] = arrow.cells.map((c) => [c[0], c[1]]);

    setArrows((prev) =>
      prev.map((a) => (a.id === arrowId ? { ...a, exiting: true } : a)),
    );

    const interval = setInterval(() => {
      const head = currentCells[currentCells.length - 1];
      const newHead: [number, number] = [head[0] + dr, head[1] + dc];
      currentCells = [...currentCells.slice(1), newHead];

      const allOut = currentCells.every(
        ([r, c]) =>
          r < 0 || r >= level.rows || c < 0 || c >= level.cols || !level.shape[r][c],
      );

      setArrows((prev) => {
        if (allOut) {
          clearInterval(interval);
          const remaining = prev.filter((a) => a.id !== arrowId);
          setGrid(buildGrid(level, remaining));
          if (remaining.length === 0) {
            setPhase("won");
            playChord(["success", "win"]);
            setMoves((curMoves) => {
              setBestMoves((bm) => {
                const cur = bm[levelIndex + 1];
                if (!cur || curMoves < cur) {
                  const upd = { ...bm, [levelIndex + 1]: curMoves };
                  try {
                    localStorage.setItem("arrowsgo-best", JSON.stringify(upd));
                  } catch (_) { /* ignore */ }
                  return upd;
                }
                return bm;
              });
              return curMoves;
            });
          } else {
            playSound("score");
          }
          animatingRef.current = false;
          return remaining;
        }
        const updated = prev.map((a) =>
          a.id === arrowId ? { ...a, cells: currentCells.map((c) => [c[0], c[1]] as [number, number]) } : a,
        );
        // rebuild grid with updated arrow positions (only in-bounds cells)
        setGrid(buildGrid(level, updated));
        return updated;
      });
    }, 80);
  }, [phase, levelIndex, arrows, grid]);

  const useHint = useCallback(() => {
    if (hints <= 0 || phase !== "playing") return;
    const level = LEVELS[levelIndex];
    const free = arrows.find((a) => !a.exiting && isFree(a, grid, level));
    if (!free) return;
    setHintArrowId(free.id);
    setHints((h) => h - 1);
    playSound("click");
    setTimeout(() => setHintArrowId(null), 1500);
  }, [hints, phase, levelIndex, arrows, grid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") initLevel(levelIndex, lives);
      if (e.code === "KeyH") useHint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [initLevel, levelIndex, lives, useHint]);

  const level = LEVELS[levelIndex];
  const cellPx = Math.min(Math.floor(380 / Math.max(level.rows, level.cols)), 48);

  const arrowMeta = useMemo(() => {
    const map: Record<string, { arrowId: number; isHead: boolean; isTail: boolean; dir: Dir; exiting: boolean }> = {};
    arrows.forEach((arrow) => {
      arrow.cells.forEach(([r, c], i) => {
        if (r < 0 || r >= level.rows || c < 0 || c >= level.cols) return;
        if (!level.shape[r][c]) return;
        map[`${r}-${c}`] = {
          arrowId: arrow.id,
          isHead: i === arrow.cells.length - 1,
          isTail: i === 0,
          dir: arrow.dir,
          exiting: arrow.exiting,
        };
      });
    });
    return map;
  }, [arrows, level]);

  const freeArrowIds = useMemo(() => {
    const set = new Set<number>();
    arrows.forEach((a) => {
      if (!a.exiting && isFree(a, grid, level)) set.add(a.id);
    });
    return set;
  }, [arrows, grid, level]);

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
            {arrows.length} left
          </span>
        </div>

        {/* Board */}
        <div
          className="grid gap-1 p-3 rounded-2xl bg-card border border-border"
          style={{
            gridTemplateColumns: `repeat(${level.cols}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${level.rows}, ${cellPx}px)`,
          }}
        >
          {Array.from({ length: level.rows }, (_, r) =>
            Array.from({ length: level.cols }, (_, c) => {
              const inShape = level.shape[r][c];
              const meta = arrowMeta[`${r}-${c}`];
              if (!inShape) {
                return <div key={`${r}-${c}`} className="bg-transparent" />;
              }
              if (!meta) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded border border-border bg-secondary/40"
                  />
                );
              }
              const isFreeArrow = freeArrowIds.has(meta.arrowId) && !meta.exiting;
              const isHint = meta.arrowId === hintArrowId;
              const colorClass = ARROW_COLORS[(meta.arrowId - 1) % ARROW_COLORS.length];
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleArrowClick(meta.arrowId)}
                  disabled={meta.exiting}
                  className={cn(
                    "flex items-center justify-center rounded border font-bold transition-all duration-100 select-none",
                    colorClass,
                    isFreeArrow && "ring-2 ring-white/80 shadow-lg cursor-pointer",
                    !isFreeArrow && !meta.exiting && "cursor-pointer opacity-90",
                    meta.exiting && "opacity-60 scale-95",
                    isHint && "ring-4 ring-yellow-300 animate-pulse",
                  )}
                  style={{ fontSize: cellPx * 0.55 }}
                  aria-label={`Arrow ${meta.dir}`}
                >
                  {meta.isHead ? ARROW_SYMBOL[meta.dir] : ""}
                </button>
              );
            }),
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <button
            onClick={useHint}
            disabled={hints <= 0 || phase !== "playing"}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            💡 Hint ({hints})
          </button>
          <button
            onClick={() => initLevel(levelIndex, lives > 0 ? lives : 5)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-foreground hover:bg-secondary transition"
          >
            ↺ Reset
          </button>
        </div>

        {/* Level selector */}
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-2 text-center">Select level</p>
          <div className="grid grid-cols-8 gap-1.5">
            {LEVELS.map((lv, i) => (
              <button
                key={lv.id}
                onClick={() => setLevelIndex(i)}
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
          Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary">H</kbd> for hint ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary">R</kbd> to reset
        </p>
      </div>

      {/* Win overlay */}
      {phase === "won" && lives > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-2xl font-black text-foreground mb-1">Level Cleared!</p>
            <p className="text-muted-foreground text-sm mb-2">Moves: {moves}</p>
            {bestMoves[levelIndex + 1] === moves && (
              <p className="text-yellow-500 font-bold text-sm mb-4">🏆 Best!</p>
            )}
            <div className="flex gap-2 justify-center mt-4">
              {levelIndex < LEVELS.length - 1 && (
                <button
                  onClick={() => setLevelIndex((i) => i + 1)}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
                >
                  Next →
                </button>
              )}
              <button
                onClick={() => initLevel(levelIndex)}
                className="px-6 py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-secondary transition"
              >
                Replay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {lives <= 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">💔</p>
            <p className="text-2xl font-black text-foreground mb-1">No Lives Left!</p>
            <p className="text-muted-foreground text-sm mb-6">Plan your moves carefully next time.</p>
            <button
              onClick={() => initLevel(levelIndex)}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Tap any glowing arrow — glowing means it has a clear path to exit the shape.",
          "The arrow will slide out snake-style, freeing space for other arrows behind it.",
          "Clear all arrows from the board to complete the level — plan your order carefully!",
        ]}
      />

      <RelatedTools currentSlug="arrows-go" />

      <ToolSeoContent
        title="Arrows GO! — Free Online Arrow Puzzle Game"
        description="Play Arrows GO! online for free. Tap free arrows to slide them out of the shape. 15 handcrafted levels with increasing difficulty. No download needed!"
        body={[
          "Arrows GO! is a satisfying logic puzzle where each colored arrow on a uniquely shaped board wants to leave the playing field. An arrow can only slide off when nothing is blocking its path in the direction it points — those arrows glow with a bright ring around them and are ready to be tapped. Once you tap a free arrow it slithers out snake-style, head first, freeing up the cells it occupied and often unlocking a chain of other arrows behind it. The challenge is finding the right order: clear the wrong arrow first and you'll lock yourself out of solving the puzzle.",
          "The game ships with 15 handcrafted levels across nine different shapes — squares, diamonds, plus signs, hearts, arrows, stars, T-shapes, anchors, butterflies, dogs, trophies, and an 8×8 expert grid. You start each attempt with five lives and three hints per level. Tap a non-free arrow and you'll lose a life; tap the lightbulb to briefly highlight one arrow that's safe to clear. Your best move count is saved locally for every level, so you can come back and try to beat your own personal records.",
        ]}
        faqs={[
          {
            question: "How do I know which arrow is free?",
            answer:
              "Free arrows glow with a bright white ring around them. An arrow is free when nothing blocks its path between its head and the edge of the shape — empty cells and holes in the shape are both fine to pass through.",
          },
          {
            question: "What happens if I tap the wrong arrow?",
            answer:
              "If you tap an arrow that's blocked by another arrow, you'll hear a buzz, lose one of your five lives, and the arrow stays put. Lose all five lives and the game-over screen appears so you can restart the level with a fresh set of lives.",
          },
          {
            question: "How does the hint system work?",
            answer:
              "You start every level with three hints. Tap the lightbulb button (or press H on your keyboard) and one currently-free arrow will pulse with a yellow ring for a moment so you know it's safe to clear. Hints reset every time you start or restart a level.",
          },
          {
            question: "Is there a keyboard shortcut to restart?",
            answer:
              "Yes — press R at any time to reset the current level while keeping your remaining lives. Use the level selector at the bottom of the board to jump to any unlocked level instantly.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
