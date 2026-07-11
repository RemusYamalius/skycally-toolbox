import { BALL_R, POCKETS, POCKET_R, RAIL, TABLE_H, TABLE_W } from "./physics";
import type { MatterBody } from "./matter-loader";

export function drawTable(ctx: CanvasRenderingContext2D): void {
  // Wood rail
  const rail = ctx.createLinearGradient(0, 0, 0, TABLE_H);
  rail.addColorStop(0, "#5a3a1e");
  rail.addColorStop(1, "#3b2410");
  ctx.fillStyle = rail;
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);

  // Felt
  const felt = ctx.createRadialGradient(TABLE_W / 2, TABLE_H / 2, 40, TABLE_W / 2, TABLE_H / 2, TABLE_W / 1.4);
  felt.addColorStop(0, "#14834a");
  felt.addColorStop(1, "#0a5230");
  ctx.fillStyle = felt;
  ctx.fillRect(RAIL, RAIL, TABLE_W - RAIL * 2, TABLE_H - RAIL * 2);

  // Inner shadow
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(RAIL + 1, RAIL + 1, TABLE_W - RAIL * 2 - 2, TABLE_H - RAIL * 2 - 2);

  // Pockets
  for (const p of POCKETS) {
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, POCKET_R);
    g.addColorStop(0, "#000");
    g.addColorStop(1, "#111");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPegs(ctx: CanvasRenderingContext2D, pegs?: Array<{ x: number; y: number; r: number }>): void {
  if (!pegs) return;
  for (const p of pegs) {
    const g = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.r);
    g.addColorStop(0, "#94a3b8");
    g.addColorStop(1, "#334155");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface BallPlugin { color: string; number: number; stripe: boolean }

export function drawBall(ctx: CanvasRenderingContext2D, body: MatterBody): void {
  const plugin = (body.plugin ?? {}) as Partial<BallPlugin>;
  const color = plugin.color ?? "#fff";
  const num = plugin.number ?? 0;
  const stripe = !!plugin.stripe;
  const { x, y } = body.position;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, BALL_R, BALL_R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base
  ctx.fillStyle = stripe ? "#fff" : color;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  if (stripe) {
    // Colored stripe band
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x - BALL_R, y - BALL_R * 0.45, BALL_R * 2, BALL_R * 0.9);
    ctx.restore();
  }

  // Number circle (skip on cue ball)
  if (num > 0) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, BALL_R * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(BALL_R * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(num), x, y + 0.5);
  }

  // Highlight
  const hl = ctx.createRadialGradient(x - BALL_R * 0.4, y - BALL_R * 0.4, 1, x - BALL_R * 0.4, y - BALL_R * 0.4, BALL_R * 0.7);
  hl.addColorStop(0, "rgba(255,255,255,0.7)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

export function drawAim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  power: number,
): void {
  const mag = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / mag;
  const ny = dirY / mag;

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + nx * (BALL_R + 2), cy + ny * (BALL_R + 2));
  ctx.lineTo(cx + nx * 260, cy + ny * 260);
  ctx.stroke();
  ctx.restore();

  // Cue stick behind the ball
  const stickLen = 140 + power * 80;
  const bx = cx - nx * (BALL_R + 6 + power * 40);
  const by = cy - ny * (BALL_R + 6 + power * 40);
  const ex = bx - nx * stickLen;
  const ey = by - ny * stickLen;
  const grad = ctx.createLinearGradient(bx, by, ex, ey);
  grad.addColorStop(0, "#f5deb3");
  grad.addColorStop(1, "#6b4423");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}
