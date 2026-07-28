// Recursive-backtracker (randomized depth-first search) maze generation.
// Pure functions, no React. Always produces a "perfect maze": exactly one
// path between any two cells, no loops and no isolated areas.

export type Walls = { n: boolean; e: boolean; s: boolean; w: boolean };

export interface Maze {
  rows: number;
  cols: number;
  /** row-major grid of wall flags; true = wall present */
  cells: Walls[];
  start: number;
  end: number;
}

export const idx = (maze: { cols: number }, r: number, c: number) => r * maze.cols + c;
export const rowOf = (maze: { cols: number }, i: number) => Math.floor(i / maze.cols);
export const colOf = (maze: { cols: number }, i: number) => i % maze.cols;

type Dir = "n" | "e" | "s" | "w";
const OPPOSITE: Record<Dir, Dir> = { n: "s", s: "n", e: "w", w: "e" };
const DELTA: Record<Dir, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] };

export function generateMaze(rows: number, cols: number): Maze {
  const cells: Walls[] = Array.from({ length: rows * cols }, () => ({
    n: true,
    e: true,
    s: true,
    w: true,
  }));
  const maze: Maze = { rows, cols, cells, start: 0, end: rows * cols - 1 };

  const visited = new Uint8Array(rows * cols);
  const stack: number[] = [];
  const first = Math.floor(Math.random() * rows * cols);
  visited[first] = 1;
  stack.push(first);

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = rowOf(maze, cur);
    const c = colOf(maze, cur);
    const options: { dir: Dir; next: number }[] = [];
    (Object.keys(DELTA) as Dir[]).forEach((dir) => {
      const [dr, dc] = DELTA[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
      const next = idx(maze, nr, nc);
      if (!visited[next]) options.push({ dir, next });
    });

    if (!options.length) {
      stack.pop();
      continue;
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    cells[cur][pick.dir] = false;
    cells[pick.next][OPPOSITE[pick.dir]] = false;
    visited[pick.next] = 1;
    stack.push(pick.next);
  }

  // Choose the two cells that are furthest apart (double BFS) so the route is
  // long and interesting rather than a straight corner-to-corner dash.
  const a = farthestFrom(maze, idx(maze, 0, 0)).cell;
  const b = farthestFrom(maze, a);
  maze.start = a;
  maze.end = b.cell;

  if (import.meta.env.DEV) {
    // Lightweight sanity check: the exit must always be reachable.
    if (!solveMaze(maze).length) {
      throw new Error("Maze generation produced an unreachable exit");
    }
  }

  return maze;
}

export function neighbors(maze: Maze, i: number): number[] {
  const r = rowOf(maze, i);
  const c = colOf(maze, i);
  const w = maze.cells[i];
  const out: number[] = [];
  if (!w.n && r > 0) out.push(idx(maze, r - 1, c));
  if (!w.s && r < maze.rows - 1) out.push(idx(maze, r + 1, c));
  if (!w.w && c > 0) out.push(idx(maze, r, c - 1));
  if (!w.e && c < maze.cols - 1) out.push(idx(maze, r, c + 1));
  return out;
}

function farthestFrom(maze: Maze, from: number): { cell: number; dist: number } {
  const dist = new Int32Array(maze.rows * maze.cols).fill(-1);
  dist[from] = 0;
  const queue = [from];
  let best = { cell: from, dist: 0 };
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    for (const n of neighbors(maze, cur)) {
      if (dist[n] !== -1) continue;
      dist[n] = dist[cur] + 1;
      if (dist[n] > best.dist) best = { cell: n, dist: dist[n] };
      queue.push(n);
    }
  }
  return best;
}

/** Breadth-first search returning the single correct route from start to end. */
export function solveMaze(maze: Maze, from = maze.start, to = maze.end): number[] {
  const prev = new Int32Array(maze.rows * maze.cols).fill(-2);
  prev[from] = -1;
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    if (cur === to) break;
    for (const n of neighbors(maze, cur)) {
      if (prev[n] !== -2) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  if (prev[to] === -2) return [];
  const path: number[] = [];
  let cur = to;
  while (cur !== -1) {
    path.push(cur);
    cur = prev[cur];
  }
  return path.reverse();
}

/** Can the player step from cell `i` in direction `dir`? */
export function canMove(maze: Maze, i: number, dir: Dir): number | null {
  if (maze.cells[i][dir]) return null;
  const [dr, dc] = DELTA[dir];
  const r = rowOf(maze, i) + dr;
  const c = colOf(maze, i) + dc;
  if (r < 0 || c < 0 || r >= maze.rows || c >= maze.cols) return null;
  return idx(maze, r, c);
}

export type { Dir };
