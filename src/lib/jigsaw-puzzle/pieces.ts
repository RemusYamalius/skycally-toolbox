// Jigsaw piece geometry.
//
// Every internal edge between two neighbouring pieces is a single shared
// curve: a tab (+1) bulging out of one piece is, by construction, the exact
// same curve as a blank (-1) cut into the other. Border edges (touching the
// outside of the whole puzzle) are always flat (0).

export interface PieceEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PieceGrid = PieceEdges[][];

/** Random ±1 tab/blank assignment for every internal seam in an R×C grid. */
export function generatePieceGrid(rows: number, cols: number): PieceGrid {
  const grid: PieceEdges[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  );

  // Vertical seams — between horizontally adjacent pieces.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const s = Math.random() < 0.5 ? 1 : -1;
      grid[r][c].right = s;
      grid[r][c + 1].left = -s;
    }
  }
  // Horizontal seams — between vertically adjacent pieces.
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 1; r++) {
      const s = Math.random() < 0.5 ? 1 : -1;
      grid[r][c].bottom = s;
      grid[r + 1][c].top = -s;
    }
  }
  return grid;
}

interface Pt {
  x: number;
  y: number;
}

/** One rounded tab/blank lobe (or a straight line when sign is 0), described
 *  relative to the edge's own outward normal so both sides of a shared seam
 *  produce the identical curve in absolute coordinates. */
function edgeCommand(p0: Pt, p1: Pt, normal: Pt, sign: number, amp: number): string {
  if (sign === 0) return `L ${p1.x} ${p1.y}`;
  const at = (f: number, lateral: number): Pt => ({
    x: p0.x + (p1.x - p0.x) * f + normal.x * lateral * amp,
    y: p0.y + (p1.y - p0.y) * f + normal.y * lateral * amp,
  });
  const c1 = at(0.35, 0);
  const c2 = at(0.35, sign);
  const mid = at(0.5, sign);
  const c3 = at(0.65, sign);
  const c4 = at(0.65, 0);
  return (
    `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${mid.x} ${mid.y} ` + `C ${c3.x} ${c3.y} ${c4.x} ${c4.y} ${p1.x} ${p1.y}`
  );
}

export interface PiecePath {
  /** SVG path 'd' — the piece's base rectangle sits at [pad,pad]..[pad+w,pad+h]
   *  inside this path's own coordinate space. */
  d: string;
  /** Padding around the base rectangle, large enough to contain every tab. */
  pad: number;
}

export function buildPiecePath(edges: PieceEdges, w: number, h: number): PiecePath {
  const pad = Math.round(Math.min(w, h) * 0.3);
  const amp = Math.min(w, h) * 0.22;

  const tl: Pt = { x: pad, y: pad };
  const tr: Pt = { x: pad + w, y: pad };
  const br: Pt = { x: pad + w, y: pad + h };
  const bl: Pt = { x: pad, y: pad + h };

  const d = [
    `M ${tl.x} ${tl.y}`,
    edgeCommand(tl, tr, { x: 0, y: -1 }, edges.top, amp),
    edgeCommand(tr, br, { x: 1, y: 0 }, edges.right, amp),
    edgeCommand(br, bl, { x: 0, y: 1 }, edges.bottom, amp),
    edgeCommand(bl, tl, { x: -1, y: 0 }, edges.left, amp),
    "Z",
  ].join(" ");

  return { d, pad };
}

export const DIFFICULTIES = {
  easy: { rows: 3, cols: 3, label: "Easy · 9 pieces" },
  medium: { rows: 5, cols: 5, label: "Medium · 25 pieces" },
  hard: { rows: 8, cols: 8, label: "Hard · 64 pieces" },
  expert: { rows: 10, cols: 10, label: "Expert · 100 pieces" },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;
