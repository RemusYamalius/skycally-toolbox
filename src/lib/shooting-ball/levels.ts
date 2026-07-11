// Logical table coordinates: 800 x 450. Pockets in six standard positions.

export interface BallSpec {
  x: number;
  y: number;
  color: string;
  number: number;
  stripe?: boolean;
}

export interface Level {
  id: number;
  name: string;
  lives: number;
  par: number; // par shots for 3 stars
  balls: BallSpec[];
  // Optional static obstacles (pegs)
  pegs?: Array<{ x: number; y: number; r: number }>;
}

const COLORS = [
  "#eab308", // 1 yellow
  "#2563eb", // 2 blue
  "#dc2626", // 3 red
  "#7c3aed", // 4 purple
  "#ea580c", // 5 orange
  "#166534", // 6 green
  "#7f1d1d", // 7 maroon
  "#0f172a", // 8 black
  "#eab308",
  "#2563eb",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#166534",
  "#7f1d1d",
];

function rack(cx: number, cy: number, rows: number): BallSpec[] {
  const R = 12;
  const gap = R * 2 + 0.5;
  const balls: BallSpec[] = [];
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= r; c++) {
      const x = cx + r * gap * Math.cos(Math.PI / 6);
      const y = cy - r * gap * 0.5 + c * gap;
      const idx = (n - 1) % COLORS.length;
      balls.push({ x, y, color: COLORS[idx], number: n, stripe: n > 8 });
      n++;
    }
  }
  return balls;
}

function line(cx: number, cy: number, count: number, dx: number, dy: number, startNum = 1): BallSpec[] {
  const balls: BallSpec[] = [];
  for (let i = 0; i < count; i++) {
    const n = startNum + i;
    const idx = (n - 1) % COLORS.length;
    balls.push({ x: cx + i * dx, y: cy + i * dy, color: COLORS[idx], number: n, stripe: n > 8 });
  }
  return balls;
}

export const LEVELS: Level[] = [
  { id: 1, name: "Warm-Up", lives: 5, par: 4, balls: line(560, 225, 3, 30, 0) },
  { id: 2, name: "Diagonal", lives: 5, par: 5, balls: line(500, 150, 4, 30, 30) },
  { id: 3, name: "Small Rack", lives: 6, par: 6, balls: rack(540, 225, 3) },
  { id: 4, name: "Two Lines", lives: 6, par: 6, balls: [...line(520, 170, 3, 30, 0), ...line(520, 280, 3, 30, 0)] },
  { id: 5, name: "Cluster", lives: 6, par: 7, balls: rack(560, 225, 4) },
  { id: 6, name: "Peg Alley", lives: 7, par: 7, balls: rack(560, 225, 3), pegs: [{ x: 400, y: 225, r: 10 }] },
  { id: 7, name: "V-Formation", lives: 7, par: 8, balls: [...line(500, 150, 4, 25, 25), ...line(500, 300, 4, 25, -25)] },
  { id: 8, name: "Full Rack", lives: 7, par: 8, balls: rack(560, 225, 5) },
  { id: 9, name: "Twin Pegs", lives: 7, par: 8, balls: rack(560, 225, 4), pegs: [{ x: 380, y: 180, r: 10 }, { x: 380, y: 270, r: 10 }] },
  { id: 10, name: "Long Shot", lives: 6, par: 6, balls: line(680, 225, 3, 25, 0) },
  { id: 11, name: "Scatter", lives: 8, par: 9, balls: [...line(450, 150, 3, 30, 0), ...line(500, 225, 3, 30, 0), ...line(450, 300, 3, 30, 0)] },
  { id: 12, name: "Diamond", lives: 8, par: 9, balls: [...line(500, 225, 1, 0, 0), ...line(540, 190, 1, 0, 0), ...line(540, 260, 1, 0, 0), ...line(580, 225, 1, 0, 0, 4)] },
  { id: 13, name: "Peg Wall", lives: 8, par: 9, balls: rack(600, 225, 4), pegs: [{ x: 400, y: 150, r: 10 }, { x: 400, y: 225, r: 10 }, { x: 400, y: 300, r: 10 }] },
  { id: 14, name: "Six Pack", lives: 8, par: 9, balls: rack(560, 225, 3), pegs: [{ x: 350, y: 200, r: 10 }, { x: 350, y: 250, r: 10 }] },
  { id: 15, name: "Big Rack", lives: 9, par: 10, balls: rack(560, 225, 5) },
  { id: 16, name: "Zig Zag", lives: 8, par: 9, balls: [...line(480, 160, 3, 30, 30), ...line(480, 290, 3, 30, -30)] },
  { id: 17, name: "Fortress", lives: 9, par: 10, balls: rack(600, 225, 4), pegs: [{ x: 420, y: 180, r: 10 }, { x: 420, y: 270, r: 10 }, { x: 380, y: 225, r: 10 }] },
  { id: 18, name: "Sniper", lives: 6, par: 7, balls: line(700, 200, 2, 0, 50) },
  { id: 19, name: "Chaos", lives: 10, par: 11, balls: [...rack(500, 180, 3), ...rack(500, 320, 3)] },
  { id: 20, name: "Master", lives: 10, par: 12, balls: rack(560, 225, 5), pegs: [{ x: 380, y: 200, r: 10 }, { x: 380, y: 250, r: 10 }] },
];

export function starsFor(shots: number, par: number): 1 | 2 | 3 {
  if (shots <= par) return 3;
  if (shots <= par + 2) return 2;
  return 1;
}
