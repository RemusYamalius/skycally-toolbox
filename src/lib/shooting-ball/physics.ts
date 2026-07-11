import type { Level } from "./levels";
import type { MatterBody, MatterEngine, MatterGlobal } from "./matter-loader";

export const TABLE_W = 800;
export const TABLE_H = 450;
export const BALL_R = 12;
export const POCKET_R = 22;
export const RAIL = 20;

export const POCKETS: Array<{ x: number; y: number }> = [
  { x: RAIL, y: RAIL },
  { x: TABLE_W / 2, y: RAIL - 4 },
  { x: TABLE_W - RAIL, y: RAIL },
  { x: RAIL, y: TABLE_H - RAIL },
  { x: TABLE_W / 2, y: TABLE_H - RAIL + 4 },
  { x: TABLE_W - RAIL, y: TABLE_H - RAIL },
];

export const CUE_START = { x: 200, y: TABLE_H / 2 };

export interface WorldRefs {
  engine: MatterEngine;
  cue: MatterBody;
  balls: MatterBody[]; // does NOT include cue
  pockets: MatterBody[];
}

export function buildWorld(M: MatterGlobal, level: Level): WorldRefs {
  const engine = M.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });

  const wallOpts = { isStatic: true, restitution: 0.85, friction: 0.02, label: "wall" };
  const WALL_THICK = 20;

  // Walls sit flush with the felt boundary (RAIL) rather than the outer
  // table edge — previously the felt started at RAIL but the walls were at
  // the table's outer edge, leaving a dead zone where balls could drift
  // onto the wooden rail. Each side is also split into two segments with a
  // real gap around every pocket, so a ball only falls in when it actually
  // travels through the opening — not just by passing within POCKET_R of a
  // pocket that had no physical wall guarding it.
  const midX = TABLE_W / 2;
  const pocketGap = POCKET_R; // half-width of the opening left at each pocket
  const topY = RAIL - WALL_THICK / 2;
  const bottomY = TABLE_H - RAIL + WALL_THICK / 2;
  const leftX = RAIL - WALL_THICK / 2;
  const rightX = TABLE_W - RAIL + WALL_THICK / 2;

  const hSeg = (xFrom: number, xTo: number, y: number) =>
    M.Bodies.rectangle((xFrom + xTo) / 2, y, xTo - xFrom, WALL_THICK, wallOpts);
  const vSeg = (yFrom: number, yTo: number, x: number) =>
    M.Bodies.rectangle(x, (yFrom + yTo) / 2, WALL_THICK, yTo - yFrom, wallOpts);

  M.World.add(engine.world, [
    // Top rail, gapped at the top-middle pocket (corner pockets carve the ends)
    hSeg(RAIL + pocketGap, midX - pocketGap, topY),
    hSeg(midX + pocketGap, TABLE_W - RAIL - pocketGap, topY),
    // Bottom rail
    hSeg(RAIL + pocketGap, midX - pocketGap, bottomY),
    hSeg(midX + pocketGap, TABLE_W - RAIL - pocketGap, bottomY),
    // Left rail (gapped only at the two corner pockets)
    vSeg(RAIL + pocketGap, TABLE_H - RAIL - pocketGap, leftX),
    // Right rail
    vSeg(RAIL + pocketGap, TABLE_H - RAIL - pocketGap, rightX),
  ]);

  // Pockets as static sensors
  const pockets = POCKETS.map((p, i) =>
    M.Bodies.circle(p.x, p.y, POCKET_R, {
      isStatic: true,
      isSensor: true,
      label: `pocket-${i}`,
    }),
  );
  M.World.add(engine.world, pockets);

  // Pegs
  if (level.pegs) {
    for (const peg of level.pegs) {
      M.World.add(
        engine.world,
        M.Bodies.circle(peg.x, peg.y, peg.r, { isStatic: true, restitution: 0.9, friction: 0.02, label: "peg" }),
      );
    }
  }

  const ballOpts = {
    restitution: 0.92,
    friction: 0.005,
    frictionAir: 0.018,
    density: 0.02,
    label: "ball",
  };
  const balls: MatterBody[] = [];
  for (const spec of level.balls) {
    const body = M.Bodies.circle(spec.x, spec.y, BALL_R, ballOpts);
    body.plugin = { color: spec.color, number: spec.number, stripe: !!spec.stripe };
    balls.push(body);
  }
  M.World.add(engine.world, balls);

  const cue = M.Bodies.circle(CUE_START.x, CUE_START.y, BALL_R, { ...ballOpts, label: "cue" });
  cue.plugin = { color: "#f8fafc", number: 0, stripe: false };
  M.World.add(engine.world, cue);

  return { engine, cue, balls, pockets };
}

export function areBallsSettled(refs: WorldRefs): boolean {
  const threshold = 0.08;
  if (Math.hypot(refs.cue.velocity.x, refs.cue.velocity.y) > threshold) return false;
  for (const b of refs.balls) {
    if (Math.hypot(b.velocity.x, b.velocity.y) > threshold) return false;
  }
  return true;
}

// A full-power shot should be able to cross most of the table; a very light
// tap should still travel a meaningful distance rather than barely creeping.
// With frictionAir = 0.018 (see ballOpts above), a ball's total travel
// distance before stopping is approximately v0 / frictionAir, so these
// speeds are chosen to land in the ~140–780 unit range on an 800-unit table.
const MIN_SHOT_SPEED = 3.5;
const MAX_SHOT_SPEED = 20;

export function shootCue(M: MatterGlobal, cue: MatterBody, dirX: number, dirY: number, power: number): void {
  const mag = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / mag;
  const ny = dirY / mag;
  const clampedPower = Math.max(0, Math.min(1, power));
  const speed = MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * clampedPower;
  // Setting velocity directly (rather than Body.applyForce, which only
  // contributes force/mass * deltaTime^2 for a single physics step) gives a
  // predictable, visible shot regardless of frame timing or ball mass.
  M.Body.setVelocity(cue, { x: nx * speed, y: ny * speed });
}
