import type { CrosswordPuzzle, CrosswordWord } from "./puzzles";

export type CellKey = string;

export const cellKey = (row: number, col: number): CellKey => `${row}:${col}`;

export interface GridCell {
  row: number;
  col: number;
  solution: string;
  /** Grid number, when this cell starts at least one word. */
  number: number | null;
  acrossIndex: number | null;
  downIndex: number | null;
}

export interface GridModel {
  rows: number;
  cols: number;
  /** Sparse map of playable cells, keyed by "row:col". */
  cells: Map<CellKey, GridCell>;
  /** Cells belonging to each word, in reading order. */
  wordCells: CellKey[][];
  across: { index: number; word: CrosswordWord }[];
  down: { index: number; word: CrosswordWord }[];
}

export function buildGrid(puzzle: CrosswordPuzzle): GridModel {
  const cells = new Map<CellKey, GridCell>();
  const wordCells: CellKey[][] = [];

  puzzle.words.forEach((word, index) => {
    const dr = word.direction === "down" ? 1 : 0;
    const dc = word.direction === "across" ? 1 : 0;
    const keys: CellKey[] = [];

    for (let i = 0; i < word.answer.length; i += 1) {
      const row = word.row + dr * i;
      const col = word.col + dc * i;
      const key = cellKey(row, col);
      keys.push(key);

      let cell = cells.get(key);
      if (!cell) {
        cell = {
          row,
          col,
          solution: word.answer[i],
          number: null,
          acrossIndex: null,
          downIndex: null,
        };
        cells.set(key, cell);
      }
      if (i === 0) cell.number = word.number;
      if (word.direction === "across") cell.acrossIndex = index;
      else cell.downIndex = index;
    }

    wordCells.push(keys);
  });

  const across = puzzle.words
    .map((word, index) => ({ index, word }))
    .filter((w) => w.word.direction === "across")
    .sort((a, b) => a.word.number - b.word.number);

  const down = puzzle.words
    .map((word, index) => ({ index, word }))
    .filter((w) => w.word.direction === "down")
    .sort((a, b) => a.word.number - b.word.number);

  return { rows: puzzle.rows, cols: puzzle.cols, cells, wordCells, across, down };
}

/** True when every playable cell holds its solution letter. */
export function isSolved(grid: GridModel, letters: Record<string, string>): boolean {
  for (const [key, cell] of grid.cells) {
    if ((letters[key] ?? "") !== cell.solution) return false;
  }
  return true;
}

export function countFilled(
  grid: GridModel,
  letters: Record<string, string>,
): { filled: number; total: number; correct: number } {
  let filled = 0;
  let correct = 0;
  for (const [key, cell] of grid.cells) {
    const v = letters[key] ?? "";
    if (v) filled += 1;
    if (v === cell.solution) correct += 1;
  }
  return { filled, total: grid.cells.size, correct };
}

/** Words that are fully and correctly filled in. */
export function solvedWordIndexes(
  grid: GridModel,
  letters: Record<string, string>,
): Set<number> {
  const out = new Set<number>();
  grid.wordCells.forEach((keys, index) => {
    const ok = keys.every((k) => (letters[k] ?? "") === grid.cells.get(k)!.solution);
    if (ok) out.add(index);
  });
  return out;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${m}:${String(rem).padStart(2, "0")}`;
}
