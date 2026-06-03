import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/pinball";
const TITLE = "Pinball — Free Online Arcade Game, No Download";
const DESCRIPTION =
  "Play free Pinball in your browser. 3 tables including Amazon Hunt, Space Odyssey, and Dragon's Lair. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/pinball")({
  head: () => {
    const base = buildPageMeta({ title: TITLE, description: DESCRIPTION, path: PATH });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Game",
            name: "Pinball",
            description:
              "Free browser-based pinball game with 3 tables. Realistic physics and full sound effects. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: PinballPage,
});

// ---------- Constants ----------
const W = 420;
const H = 640;
const BALL_R = 9;
const GRAVITY = 0.32;
const FRICTION = 0.998;
const WALL_REST = 0.72;
const BUMPER_KICK = 7.5;
const SLING_KICK = 6.5;
const MAX_SPEED = 16;
const FLIPPER_LEN = 64;
const FLIPPER_REST = 0.45;   // radians from horizontal (downward angle)
const FLIPPER_ACTIVE = -0.5; // up angle
const FLIPPER_SPEED = 0.45;

type TableId = "amazon" | "space" | "dragon";

interface Bumper {
  x: number; y: number; r: number;
  flash: number;
  score: number;
}
interface Sling {
  x1: number; y1: number; x2: number; y2: number;
  flash: number;
}
interface Target {
  x: number; y: number; w: number; h: number;
  hit: boolean;
  group?: string;
  score: number;
  flash: number;
}
interface Ramp {
  // a line segment that acts as a one-way wall; entering through it adds score and multiplier
  x1: number; y1: number; x2: number; y2: number;
  label: string;
  score: number;
  flash: number;
}

interface TableTheme {
  id: TableId;
  name: string;
  bg1: string; bg2: string;
  accent: string;
  wallColor: string;
  bumperColor: string;
  targetColor: string;
  rampColor: string;
  special: string;
}

const THEMES: Record<TableId, TableTheme> = {
  amazon: {
    id: "amazon",
    name: "Amazon Hunt",
    bg1: "#0a3b1f", bg2: "#06210f",
    accent: "#fbbf24",
    wallColor: "#854d0e",
    bumperColor: "#facc15",
    targetColor: "#fde68a",
    rampColor: "#65a30d",
    special: "Clear all 4 targets to trigger Amazon Bonus multiball!",
  },
  space: {
    id: "space",
    name: "Space Odyssey",
    bg1: "#0b1140", bg2: "#040622",
    accent: "#22d3ee",
    wallColor: "#6366f1",
    bumperColor: "#a78bfa",
    targetColor: "#22d3ee",
    rampColor: "#8b5cf6",
    special: "Hit the wormhole loop to enter Hyperspace (2× speed for 10s)!",
  },
  dragon: {
    id: "dragon",
    name: "Dragon's Lair",
    bg1: "#3b0a0a", bg2: "#1a0303",
    accent: "#f97316",
    wallColor: "#7c2d12",
    bumperColor: "#ef4444",
    targetColor: "#fb923c",
    rampColor: "#dc2626",
    special: "Hit the dragon 3 times for the Dragon Fire bonus!",
  },
};

function buildTable(id: TableId): {
  bumpers: Bumper[];
  slings: Sling[];
  targets: Target[];
  ramps: Ramp[];
} {
  if (id === "amazon") {
    return {
      bumpers: [
        { x: 130, y: 180, r: 22, flash: 0, score: 100 },
        { x: 290, y: 180, r: 22, flash: 0, score: 100 },
        { x: 210, y: 130, r: 24, flash: 0, score: 150 },
      ],
      slings: [
        { x1: 70, y1: 440, x2: 130, y2: 500, flash: 0 },
        { x1: 350, y1: 440, x2: 290, y2: 500, flash: 0 },
      ],
      targets: [
        { x: 80, y: 260, w: 36, h: 10, hit: false, group: "amazon", score: 250, flash: 0 },
        { x: 165, y: 260, w: 36, h: 10, hit: false, group: "amazon", score: 250, flash: 0 },
        { x: 250, y: 260, w: 36, h: 10, hit: false, group: "amazon", score: 250, flash: 0 },
        { x: 335, y: 260, w: 36, h: 10, hit: false, group: "amazon", score: 250, flash: 0 },
      ],
      ramps: [
        { x1: 40, y1: 340, x2: 100, y2: 320, label: "Vine Ramp", score: 500, flash: 0 },
        { x1: 380, y1: 340, x2: 320, y2: 320, label: "Temple Ramp", score: 500, flash: 0 },
      ],
    };
  }
  if (id === "space") {
    return {
      bumpers: [
        { x: 140, y: 200, r: 22, flash: 0, score: 120 },
        { x: 280, y: 200, r: 22, flash: 0, score: 120 },
        { x: 210, y: 140, r: 26, flash: 0, score: 180 },
      ],
      slings: [
        { x1: 70, y1: 440, x2: 130, y2: 500, flash: 0 },
        { x1: 350, y1: 440, x2: 290, y2: 500, flash: 0 },
      ],
      targets: [
        { x: 100, y: 280, w: 40, h: 10, hit: false, group: "wormhole", score: 300, flash: 0 },
        { x: 200, y: 280, w: 40, h: 10, hit: false, group: "wormhole", score: 300, flash: 0 },
        { x: 300, y: 280, w: 40, h: 10, hit: false, group: "wormhole", score: 300, flash: 0 },
      ],
      ramps: [
        { x1: 40, y1: 340, x2: 100, y2: 320, label: "Rocket Ramp", score: 600, flash: 0 },
        { x1: 380, y1: 340, x2: 320, y2: 320, label: "Asteroid Ramp", score: 600, flash: 0 },
      ],
    };
  }
  // dragon
  return {
    bumpers: [
      { x: 130, y: 200, r: 22, flash: 0, score: 100 },
      { x: 290, y: 200, r: 22, flash: 0, score: 100 },
      { x: 170, y: 130, r: 22, flash: 0, score: 130 },
      { x: 250, y: 130, r: 22, flash: 0, score: 130 },
    ],
    slings: [
      { x1: 70, y1: 440, x2: 130, y2: 500, flash: 0 },
      { x1: 350, y1: 440, x2: 290, y2: 500, flash: 0 },
    ],
    targets: [
      { x: 180, y: 260, w: 60, h: 14, hit: false, group: "dragon", score: 400, flash: 0 },
    ],
    ramps: [
      { x1: 40, y1: 340, x2: 100, y2: 320, label: "Castle Ramp", score: 500, flash: 0 },
      { x1: 380, y1: 340, x2: 320, y2: 320, label: "Drawbridge", score: 500, flash: 0 },
      { x1: 160, y1: 350, x2: 260, y2: 350, label: "Lair Loop", score: 700, flash: 0 },
    ],
  };
}

// ---------- Audio ----------
class SoundEngine {
  ctx: AudioContext | null = null;
  muted = false;
  bgInterval: number | null = null;

  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      } catch { /* noop */ }
    }
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  beep(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, sweepTo?: number) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), ctx.currentTime + dur);
    }
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  noise(dur: number, vol = 0.12, hp = 800) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  flipper() { this.noise(0.04, 0.18, 2000); this.beep(900, 0.05, "square", 0.06); }
  launch() { this.beep(220, 0.35, "sawtooth", 0.18, 80); }
  bumper() { this.beep(700, 0.1, "square", 0.18, 400); }
  ramp()   { this.noise(0.25, 0.08, 600); }
  target() { this.beep(180, 0.18, "sine", 0.2, 90); }
  multiball() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.25, "triangle", 0.18), i * 90));
  }
  drain() {
    this.beep(330, 0.5, "sawtooth", 0.18, 80);
    this.noise(0.3, 0.06, 200);
  }
  jingle() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, "triangle", 0.2), i * 110));
  }
  tilt() { this.beep(80, 0.2, "square", 0.22); }
  shootAgain() {
    [600, 900].forEach((f, i) => setTimeout(() => this.beep(f, 0.18, "triangle", 0.18), i * 120));
  }

  startBg(table: TableId) {
    this.stopBg();
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const scales: Record<TableId, number[]> = {
      amazon: [196, 233, 262, 294, 349, 392, 440],
      space:  [220, 277, 330, 370, 415, 466, 554],
      dragon: [165, 196, 220, 247, 277, 330, 370],
    };
    const scale = scales[table];
    let step = 0;
    const tempo = table === "dragon" ? 360 : table === "space" ? 280 : 320;
    this.bgInterval = window.setInterval(() => {
      if (this.muted) return;
      const note = scale[step % scale.length];
      const c = this.ensure();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.05, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.26);
      step++;
    }, tempo);
  }
  stopBg() {
    if (this.bgInterval !== null) { clearInterval(this.bgInterval); this.bgInterval = null; }
  }
}

// ---------- Geometry helpers ----------
function reflectCircleSegment(
  bx: number, by: number, vx: number, vy: number, r: number,
  x1: number, y1: number, x2: number, y2: number
): { hit: boolean; nx?: number; ny?: number; vx?: number; vy?: number; bx?: number; by?: number } {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((bx - x1) * dx + (by - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t, py = y1 + dy * t;
  const ox = bx - px, oy = by - py;
  const dist2 = ox * ox + oy * oy;
  if (dist2 > r * r) return { hit: false };
  const dist = Math.sqrt(dist2) || 0.001;
  const nx = ox / dist, ny = oy / dist;
  const vDotN = vx * nx + vy * ny;
  if (vDotN > 0) return { hit: false };
  const nvx = (vx - 2 * vDotN * nx) * WALL_REST;
  const nvy = (vy - 2 * vDotN * ny) * WALL_REST;
  const push = r - dist + 0.5;
  return { hit: true, nx, ny, vx: nvx, vy: nvy, bx: bx + nx * push, by: by + ny * push };
}

interface Ball { x: number; y: number; vx: number; vy: number; stuck: boolean; }

function PinballPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [table, setTable] = useState<TableId>("amazon");
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tiltMeter, setTiltMeter] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const tableRef = useRef<TableId>("amazon");
  const dataRef = useRef(buildTable("amazon"));
  const ballsArrRef = useRef<Ball[]>([]);
  const onPlateRef = useRef(true); // ball on plunger
  const plungerRef = useRef(0);    // 0..1 charge
  const flipperLRef = useRef(FLIPPER_REST);
  const flipperRRef = useRef(FLIPPER_REST);
  const flipperLTargetRef = useRef(FLIPPER_REST);
  const flipperRTargetRef = useRef(FLIPPER_REST);
  const flipperLPrevRef = useRef(FLIPPER_REST);
  const flipperRPrevRef = useRef(FLIPPER_REST);
  const ballsLeftRef = useRef(3);
  const scoreRef = useRef(0);
  const multRef = useRef(1);
  const highRef = useRef(0);
  const runningRef = useRef(false);
  const overRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const tiltRef = useRef(0);
  const dragonHitsRef = useRef(0);
  const hyperspaceUntilRef = useRef(0);
  const flashRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const shootAgainRef = useRef(false);
  const soundRef = useRef<SoundEngine>(new SoundEngine());
  const mutedRef = useRef(false);

  const keysRef = useRef({ L: false, R: false, launch: false, nudge: false });

  // ---------- Lifecycle ----------
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    soundRef.current.stopBg();
  }, []);

  useEffect(() => { mutedRef.current = muted; soundRef.current.muted = muted; }, [muted]);

  const resetBall = useCallback(() => {
    ballsArrRef.current = [{ x: W - 18, y: H - 80, vx: 0, vy: 0, stuck: true }];
    onPlateRef.current = true;
    plungerRef.current = 0;
  }, []);

  const newGame = useCallback((t: TableId) => {
    tableRef.current = t;
    dataRef.current = buildTable(t);
    scoreRef.current = 0; setScore(0);
    multRef.current = 1; setMultiplier(1);
    ballsLeftRef.current = 3; setBalls(3);
    tiltRef.current = 0; setTiltMeter(0);
    dragonHitsRef.current = 0;
    hyperspaceUntilRef.current = 0;
    shootAgainRef.current = false;
    overRef.current = false;
    setGameOver(false);
    setStatusMsg("");
    resetBall();
    setRunning(true);
    runningRef.current = true;
    soundRef.current.ensure();
    soundRef.current.startBg(t);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetBall]);

  const flashStatus = (msg: string, ms = 1500) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((cur) => (cur === msg ? "" : cur)), ms);
  };

  const addScore = (pts: number) => {
    scoreRef.current += pts * multRef.current;
    setScore(scoreRef.current);
    if (scoreRef.current > highRef.current) {
      highRef.current = scoreRef.current;
      setHighScore(highRef.current);
    }
  };

  const bumpMult = () => {
    const order = [1, 2, 3, 5];
    const idx = order.indexOf(multRef.current);
    if (idx >= 0 && idx < order.length - 1) {
      multRef.current = order[idx + 1];
      setMultiplier(multRef.current);
      flashStatus(`Multiplier ${multRef.current}×`);
    }
  };

  const spawnParticles = (x: number, y: number, color: string, n = 10) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      particlesRef.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 20 + Math.random() * 20, color });
    }
  };

  const triggerMultiball = () => {
    flashRef.current = 12;
    flashStatus("MULTIBALL!", 2500);
    soundRef.current.multiball();
    const b = ballsArrRef.current[0];
    if (b) {
      ballsArrRef.current.push({ x: b.x, y: b.y, vx: -5, vy: -6, stuck: false });
      ballsArrRef.current.push({ x: b.x, y: b.y, vx: 5, vy: -6, stuck: false });
    }
  };

  const onBallDrained = () => {
    soundRef.current.drain();
    if (shootAgainRef.current) {
      shootAgainRef.current = false;
      flashStatus("Shoot Again!");
      soundRef.current.shootAgain();
      resetBall();
      return;
    }
    ballsLeftRef.current -= 1;
    setBalls(ballsLeftRef.current);
    // bonus
    addScore(500);
    multRef.current = 1; setMultiplier(1);
    if (ballsLeftRef.current <= 0) {
      overRef.current = true;
      setGameOver(true);
      setRunning(false);
      runningRef.current = false;
      soundRef.current.stopBg();
      soundRef.current.jingle();
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    if (scoreRef.current > 5000 && !shootAgainRef.current) {
      // half chance based on threshold
    }
    resetBall();
  };

  // ---------- Step ----------
  const stepFlippers = () => {
    flipperLPrevRef.current = flipperLRef.current;
    flipperRPrevRef.current = flipperRRef.current;
    const lerp = (cur: number, tgt: number) => {
      if (cur < tgt) return Math.min(tgt, cur + FLIPPER_SPEED);
      if (cur > tgt) return Math.max(tgt, cur - FLIPPER_SPEED);
      return cur;
    };
    flipperLRef.current = lerp(flipperLRef.current, flipperLTargetRef.current);
    flipperRRef.current = lerp(flipperRRef.current, flipperRTargetRef.current);
  };

  const flipperEndpoints = () => {
    // Left flipper anchor
    const lAnchor = { x: 130, y: H - 80 };
    const rAnchor = { x: W - 130, y: H - 80 };
    const lTip = {
      x: lAnchor.x + Math.cos(-flipperLRef.current) * FLIPPER_LEN,
      y: lAnchor.y + Math.sin(-flipperLRef.current) * FLIPPER_LEN,
    };
    const rTip = {
      x: rAnchor.x - Math.cos(-flipperRRef.current) * FLIPPER_LEN,
      y: rAnchor.y + Math.sin(-flipperRRef.current) * FLIPPER_LEN,
    };
    return { lAnchor, rAnchor, lTip, rTip };
  };

  const collideBall = (ball: Ball) => {
    const data = dataRef.current;
    const theme = THEMES[tableRef.current];

    // Walls (outer)
    if (ball.x < BALL_R + 8) { ball.x = BALL_R + 8; ball.vx = -ball.vx * WALL_REST; }
    if (ball.x > W - BALL_R - 8) { ball.x = W - BALL_R - 8; ball.vx = -ball.vx * WALL_REST; }
    if (ball.y < BALL_R + 8) { ball.y = BALL_R + 8; ball.vy = -ball.vy * WALL_REST; }

    // Plunger lane wall (vertical at x = W - 28)
    if (ball.x > W - 28 - BALL_R && ball.y < H - 130) {
      // bounce back if entering from left while above lane top
      ball.x = W - 28 - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_REST;
    }

    // Sloped guide walls down to flippers (V shape)
    // Left slope: from (8, H-200) to (130, H-80)
    {
      const r = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, 8, H - 200, 130, H - 80);
      if (r.hit && r.bx !== undefined) { ball.x = r.bx; ball.y = r.by!; ball.vx = r.vx!; ball.vy = r.vy!; }
    }
    // Right slope: from (W-8, H-200) to (W-130, H-80)
    {
      const r = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, W - 8, H - 200, W - 130, H - 80);
      if (r.hit && r.bx !== undefined) { ball.x = r.bx; ball.y = r.by!; ball.vx = r.vx!; ball.vy = r.vy!; }
    }

    // Bumpers (circles)
    for (const b of data.bumpers) {
      const dx = ball.x - b.x, dy = ball.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minD = BALL_R + b.r;
      if (dist < minD) {
        const nx = dx / (dist || 1), ny = dy / (dist || 1);
        ball.x = b.x + nx * minD;
        ball.y = b.y + ny * minD;
        const sp = Math.hypot(ball.vx, ball.vy);
        const newSp = Math.min(MAX_SPEED, Math.max(sp, BUMPER_KICK));
        ball.vx = nx * newSp;
        ball.vy = ny * newSp;
        b.flash = 10;
        addScore(b.score);
        soundRef.current.bumper();
        spawnParticles(b.x, b.y, theme.accent, 8);
      }
    }

    // Slingshots (segments with kick)
    for (const s of data.slings) {
      const r = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, s.x1, s.y1, s.x2, s.y2);
      if (r.hit && r.bx !== undefined) {
        ball.x = r.bx; ball.y = r.by!;
        // amplify
        const sp = Math.hypot(r.vx!, r.vy!);
        const k = Math.max(SLING_KICK, sp);
        const nrm = Math.hypot(r.vx!, r.vy!) || 1;
        ball.vx = (r.vx! / nrm) * k;
        ball.vy = (r.vy! / nrm) * k;
        s.flash = 8;
        addScore(50);
        soundRef.current.bumper();
      }
    }

    // Targets (rects)
    for (const t of data.targets) {
      if (t.hit) continue;
      if (ball.x + BALL_R < t.x || ball.x - BALL_R > t.x + t.w) continue;
      if (ball.y + BALL_R < t.y || ball.y - BALL_R > t.y + t.h) continue;
      t.hit = true;
      t.flash = 20;
      addScore(t.score);
      soundRef.current.target();
      ball.vy = -Math.abs(ball.vy) - 1;
      // Special triggers
      if (t.group === "amazon") {
        if (data.targets.every((x) => x.hit)) {
          triggerMultiball();
          data.targets.forEach((x) => (x.hit = false));
        }
      } else if (t.group === "wormhole") {
        if (data.targets.every((x) => x.hit)) {
          flashStatus("HYPERSPACE!", 2500);
          flashRef.current = 12;
          hyperspaceUntilRef.current = Date.now() + 10000;
          soundRef.current.multiball();
          data.targets.forEach((x) => (x.hit = false));
        }
      } else if (t.group === "dragon") {
        dragonHitsRef.current += 1;
        if (dragonHitsRef.current >= 3) {
          dragonHitsRef.current = 0;
          flashStatus("DRAGON FIRE!", 2500);
          flashRef.current = 12;
          addScore(25000);
          soundRef.current.multiball();
        }
        t.hit = false;
      }
    }

    // Ramps (segments; entering bumps multiplier)
    for (const r of data.ramps) {
      const res = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, r.x1, r.y1, r.x2, r.y2);
      if (res.hit && res.bx !== undefined) {
        ball.x = res.bx; ball.y = res.by!;
        ball.vx = res.vx!; ball.vy = res.vy! - 1.5;
        r.flash = 12;
        addScore(r.score);
        soundRef.current.ramp();
        bumpMult();
      }
    }

    // Flippers
    const { lAnchor, rAnchor, lTip, rTip } = flipperEndpoints();
    const lFlap = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, lAnchor.x, lAnchor.y, lTip.x, lTip.y);
    if (lFlap.hit && lFlap.bx !== undefined) {
      ball.x = lFlap.bx; ball.y = lFlap.by!;
      ball.vx = lFlap.vx!; ball.vy = lFlap.vy!;
      // angular kick when flipping up
      if (flipperLRef.current < flipperLPrevRef.current) {
        const kick = (flipperLPrevRef.current - flipperLRef.current) * 18;
        ball.vy -= kick;
        ball.vx += kick * 0.3;
      }
    }
    const rFlap = reflectCircleSegment(ball.x, ball.y, ball.vx, ball.vy, BALL_R, rAnchor.x, rAnchor.y, rTip.x, rTip.y);
    if (rFlap.hit && rFlap.bx !== undefined) {
      ball.x = rFlap.bx; ball.y = rFlap.by!;
      ball.vx = rFlap.vx!; ball.vy = rFlap.vy!;
      if (flipperRRef.current < flipperRPrevRef.current) {
        const kick = (flipperRPrevRef.current - flipperRRef.current) * 18;
        ball.vy -= kick;
        ball.vx -= kick * 0.3;
      }
    }
  };

  const step = useCallback(() => {
    stepFlippers();

    // Flash decay
    const data = dataRef.current;
    for (const b of data.bumpers) if (b.flash > 0) b.flash--;
    for (const s of data.slings) if (s.flash > 0) s.flash--;
    for (const t of data.targets) if (t.flash > 0) t.flash--;
    for (const r of data.ramps) if (r.flash > 0) r.flash--;
    if (flashRef.current > 0) flashRef.current--;
    if (tiltRef.current > 0) {
      tiltRef.current = Math.max(0, tiltRef.current - 0.3);
      setTiltMeter(tiltRef.current);
    }

    // Nudge
    if (keysRef.current.nudge) {
      tiltRef.current = Math.min(100, tiltRef.current + 6);
      setTiltMeter(tiltRef.current);
      for (const b of ballsArrRef.current) b.vx += (Math.random() - 0.5) * 2;
      keysRef.current.nudge = false;
      soundRef.current.tilt();
      if (tiltRef.current >= 100) {
        flashStatus("TILT!", 1500);
        // drain all balls
        ballsArrRef.current = [];
        onBallDrained();
        return;
      }
    }

    // Plunger charge
    if (keysRef.current.launch && onPlateRef.current) {
      plungerRef.current = Math.min(1, plungerRef.current + 0.03);
    }

    // Speed factor
    const speedMul = Date.now() < hyperspaceUntilRef.current ? 2 : 1;

    // Particles update
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 1;
      return p.life > 0;
    });

    // Move balls
    for (const ball of ballsArrRef.current) {
      if (ball.stuck) continue;
      ball.vy += GRAVITY;
      ball.vx *= FRICTION;
      ball.vy *= FRICTION;
      const sp = Math.hypot(ball.vx, ball.vy) * speedMul;
      const cap = Math.min(MAX_SPEED * speedMul, sp);
      if (sp > 0.001) {
        const k = cap / Math.hypot(ball.vx, ball.vy);
        ball.vx *= k; ball.vy *= k;
      }
      const substeps = 3;
      for (let s = 0; s < substeps; s++) {
        ball.x += ball.vx / substeps;
        ball.y += ball.vy / substeps;
        collideBall(ball);
      }
    }

    // Drain detection (ball passed bottom between flippers)
    ballsArrRef.current = ballsArrRef.current.filter((b) => {
      if (b.stuck) return true;
      if (b.y > H + 20) return false;
      return true;
    });
    // Plunger ball drained from plate doesn't count; but stuck plunger ball stays.
    if (ballsArrRef.current.length === 0) {
      onBallDrained();
    } else if (ballsArrRef.current.length === 1 && !ballsArrRef.current[0].stuck) {
      // Threshold for shoot again
      if (!shootAgainRef.current && scoreRef.current >= 10000) {
        shootAgainRef.current = true;
        flashStatus("Shoot Again ready");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Draw ----------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const theme = THEMES[tableRef.current];
    const data = dataRef.current;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, theme.bg1);
    grad.addColorStop(1, theme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Outer playfield border
    ctx.strokeStyle = theme.wallColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // Plunger lane
    ctx.strokeStyle = theme.wallColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W - 28, 8);
    ctx.lineTo(W - 28, H - 130);
    ctx.stroke();

    // Slope walls
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.wallColor;
    ctx.beginPath();
    ctx.moveTo(8, H - 200); ctx.lineTo(130, H - 80);
    ctx.moveTo(W - 8, H - 200); ctx.lineTo(W - 130, H - 80);
    ctx.stroke();

    // Ramps
    for (const r of data.ramps) {
      ctx.strokeStyle = r.flash > 0 ? "#ffffff" : theme.rampColor;
      ctx.lineWidth = r.flash > 0 ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "9px sans-serif";
      ctx.fillText(r.label, (r.x1 + r.x2) / 2 - 25, (r.y1 + r.y2) / 2 - 8);
    }

    // Slingshots
    for (const s of data.slings) {
      ctx.strokeStyle = s.flash > 0 ? "#fff" : theme.accent;
      ctx.lineWidth = s.flash > 0 ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }

    // Targets
    for (const t of data.targets) {
      ctx.fillStyle = t.flash > 0 ? "#ffffff" : t.hit ? "#444" : theme.targetColor;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
    }

    // Bumpers
    for (const b of data.bumpers) {
      const glow = b.flash > 0 ? "#ffffff" : theme.bumperColor;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(b.x - 5, b.y - 5, b.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flippers
    const { lAnchor, rAnchor, lTip, rTip } = flipperEndpoints();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lAnchor.x, lAnchor.y); ctx.lineTo(lTip.x, lTip.y);
    ctx.moveTo(rAnchor.x, rAnchor.y); ctx.lineTo(rTip.x, rTip.y);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Plunger
    const plungerY = H - 80 + plungerRef.current * 30;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(W - 22, plungerY, 12, 30);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeRect(W - 22 + 0.5, plungerY + 0.5, 11, 29);

    // Particles
    for (const p of particlesRef.current) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Balls
    for (const ball of ballsArrRef.current) {
      const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, BALL_R);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#94a3b8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();
    }

    // Screen flash
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashRef.current / 24})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    step();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, step]);

  // ---------- Inputs ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "ArrowLeft") {
        if (!keysRef.current.L) { keysRef.current.L = true; flipperLTargetRef.current = FLIPPER_ACTIVE; soundRef.current.flipper(); }
      } else if (e.key === "/" || e.key === "ArrowRight") {
        if (!keysRef.current.R) { keysRef.current.R = true; flipperRTargetRef.current = FLIPPER_ACTIVE; soundRef.current.flipper(); }
      } else if (e.key === " ") {
        e.preventDefault();
        if (onPlateRef.current && runningRef.current) keysRef.current.launch = true;
      } else if (e.key === "x" || e.key === "X") {
        if (runningRef.current) keysRef.current.nudge = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "ArrowLeft") {
        keysRef.current.L = false; flipperLTargetRef.current = FLIPPER_REST;
      } else if (e.key === "/" || e.key === "ArrowRight") {
        keysRef.current.R = false; flipperRTargetRef.current = FLIPPER_REST;
      } else if (e.key === " ") {
        if (onPlateRef.current && plungerRef.current > 0) {
          const ball = ballsArrRef.current[0];
          if (ball && ball.stuck) {
            ball.stuck = false;
            ball.vy = -(8 + plungerRef.current * 14);
            ball.vx = -0.5;
            soundRef.current.launch();
          }
          onPlateRef.current = false;
          plungerRef.current = 0;
        }
        keysRef.current.launch = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  // ---------- Touch button handlers ----------
  const pressLeft = (down: boolean) => {
    keysRef.current.L = down;
    flipperLTargetRef.current = down ? FLIPPER_ACTIVE : FLIPPER_REST;
    if (down) soundRef.current.flipper();
  };
  const pressRight = (down: boolean) => {
    keysRef.current.R = down;
    flipperRTargetRef.current = down ? FLIPPER_ACTIVE : FLIPPER_REST;
    if (down) soundRef.current.flipper();
  };
  const tapLaunch = () => {
    if (!runningRef.current) return;
    if (!onPlateRef.current) return;
    const ball = ballsArrRef.current[0];
    if (ball && ball.stuck) {
      ball.stuck = false;
      ball.vy = -16; ball.vx = -0.5;
      soundRef.current.launch();
    }
    onPlateRef.current = false;
    plungerRef.current = 0;
  };
  const tapNudge = () => {
    if (!runningRef.current) return;
    keysRef.current.nudge = true;
  };

  const switchTable = (t: TableId) => {
    if (t === tableRef.current && running) return;
    setTable(t);
    tableRef.current = t;
    if (running || gameOver) {
      newGame(t);
    } else {
      dataRef.current = buildTable(t);
      draw();
    }
  };

  const theme = THEMES[table];

  return (
    <ToolPageShell title="Pinball" description="Choose your table and beat the high score. Classic arcade pinball!">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Stats */}
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Score</p>
            <p className="text-xl font-black text-foreground">{score}</p>
          </div>
          <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 border border-border min-w-[60px]">
            <p className="text-xs text-muted-foreground font-bold">Mult</p>
            <p className="text-xl font-black text-yellow-400">{multiplier}×</p>
          </div>
          <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 border border-border min-w-[60px]">
            <p className="text-xs text-muted-foreground font-bold">Balls</p>
            <p className="text-xl font-black text-red-400">{"●".repeat(Math.max(0, balls)) || "—"}</p>
          </div>
          <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">High</p>
            <p className="text-xl font-black text-cyan-400">{highScore}</p>
          </div>
        </div>

        {/* Table picker */}
        <div className="flex justify-center gap-2 mb-3 flex-wrap">
          {(Object.keys(THEMES) as TableId[]).map((tid) => (
            <button
              key={tid}
              onClick={() => switchTable(tid)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                table === tid
                  ? "text-black border-transparent"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              }`}
              style={table === tid ? { backgroundColor: THEMES[tid].accent } : undefined}
            >
              {THEMES[tid].name}
            </button>
          ))}
          <button
            onClick={() => setMuted((m) => !m)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border bg-secondary/60 text-muted-foreground border-border hover:text-foreground inline-flex items-center gap-1"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Tilt meter */}
        <div className="max-w-[420px] mx-auto mb-3">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${tiltMeter}%`, background: tiltMeter > 70 ? "#ef4444" : theme.accent }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-0.5">Tilt</p>
        </div>

        {/* Canvas */}
        <div className="w-full max-w-[420px] mx-auto relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full rounded-xl border-2 border-border touch-none select-none"
            style={{ background: theme.bg2 }}
          />
          {statusMsg && (
            <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-black"
                style={{ background: theme.accent, color: "#000" }}
              >
                {statusMsg}
              </span>
            </div>
          )}
          {!running && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
              <p className="text-4xl mb-2">🎯</p>
              <p className="text-white font-black text-2xl mb-1">{theme.name}</p>
              <p className="text-white/60 text-xs mb-3 px-6 text-center">{theme.special}</p>
              <button
                onClick={() => newGame(table)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-black font-bold transition-colors"
                style={{ background: theme.accent }}
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl">
              <p className="text-white font-black text-2xl mb-1">Game Over</p>
              <p className="text-white/70 mb-1">Score: {score}</p>
              <p className="text-cyan-400 mb-4">High: {highScore}</p>
              <button
                onClick={() => newGame(table)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-black font-bold transition-colors"
                style={{ background: theme.accent }}
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          )}
        </div>

        {/* Touch controls */}
        <div className="max-w-[420px] mx-auto mt-4 grid grid-cols-4 gap-2 sm:hidden">
          <button
            onPointerDown={(e) => { e.preventDefault(); pressLeft(true); }}
            onPointerUp={() => pressLeft(false)}
            onPointerLeave={() => pressLeft(false)}
            className="col-span-1 py-4 rounded-xl bg-secondary border border-border font-bold text-foreground active:bg-secondary/70 touch-none"
          >Left</button>
          <button
            onClick={tapLaunch}
            className="col-span-1 py-4 rounded-xl bg-secondary border border-border font-bold text-foreground active:bg-secondary/70"
          >Launch</button>
          <button
            onClick={tapNudge}
            className="col-span-1 py-4 rounded-xl bg-secondary border border-border font-bold text-foreground active:bg-secondary/70"
          >Nudge</button>
          <button
            onPointerDown={(e) => { e.preventDefault(); pressRight(true); }}
            onPointerUp={() => pressRight(false)}
            onPointerLeave={() => pressRight(false)}
            className="col-span-1 py-4 rounded-xl bg-secondary border border-border font-bold text-foreground active:bg-secondary/70 touch-none"
          >Right</button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Desktop: Z / ← left flipper · / / → right flipper · Space launch (hold to charge) · X nudge
        </p>
      </div>

      <HowToUse steps={[
        "Pick a table — Amazon Hunt, Space Odyssey, or Dragon's Lair — each with its own theme and special mode.",
        "Hold Space (or tap Launch) to charge the plunger and shoot the ball into play.",
        "Use Z / left arrow and / / right arrow to flip. Hit bumpers, ramps, and targets to score and trigger specials. Don't drain all 3 balls!",
      ]} />

      <ToolSeoContent
        title="Pinball — Free Online Arcade Game, No Download"
        description="Play classic arcade pinball free in your browser. Three full tables with realistic physics, multiball, multipliers, and full sound effects — no download, no signup."
        body={[
          "Pinball is the timeless arcade classic, reimagined here as a smooth, browser-based game that runs on any device. Pick from three distinct themed tables — Amazon Hunt with its lush jungle bumpers, Space Odyssey with its wormhole multiball loop, and Dragon's Lair with its fire-breathing target — each with its own visual style, color palette, and special game mode. The physics engine simulates real pinball: gravity pulls the ball, bumpers send it flying with satisfying pops, slingshots add chaos, and your flippers can impart real momentum when timed right.",
          "Every table has the same goal: keep the ball in play for as long as possible, light up the bumpers and targets, hit the ramps to climb your score multiplier from 1× all the way to 5×, and trigger the table's special mode for a massive bonus. Drain the ball and you lose one — three balls per game, plus a Shoot Again reward when you cross the score threshold. The classic tilt mechanic is there too: nudge gently with X to nudge the ball, but lean on it too hard and you'll lose the ball to a TILT penalty.",
          "Everything runs locally in your browser — no installs, no signup, no ads. Full Web Audio sound design gives every bumper, ramp, and multiball its own unmistakable noise, and you can mute it any time. On mobile, dedicated touch buttons replace the keyboard so your left and right thumbs handle the flippers naturally. Beat your high score, switch tables, and keep flipping.",
        ]}
        faqs={[
          { question: "How do I control Pinball?", answer: "On desktop, use Z or the left arrow for the left flipper, / or the right arrow for the right flipper, Space to charge and launch the ball (hold longer for more power), and X to nudge the table. On mobile, tap the on-screen Left, Right, Launch, and Nudge buttons." },
          { question: "What are the three tables?", answer: "Amazon Hunt is the default jungle-themed table with 3 bumpers, 2 ramps, and a multiball Amazon Bonus when you clear all 4 targets. Space Odyssey is a neon space table with a wormhole loop that triggers Hyperspace (2× ball speed for 10 seconds). Dragon's Lair is a medieval fantasy table where hitting the dragon target three times triggers a massive Dragon Fire bonus." },
          { question: "How does the multiplier work?", answer: "Every time you complete a ramp shot, your score multiplier goes up one step: 1× → 2× → 3× → 5×. The multiplier resets at the end of each ball, so use it while it lasts. Multiball and special modes stack with the multiplier for huge scores." },
          { question: "Does Pinball work on mobile?", answer: "Yes. The game is fully responsive and includes dedicated touch buttons for both flippers, the plunger, and the nudge action. Sound works on mobile too, but it requires you to tap the screen first because of browser audio policies." },
        ]}
      />

      <RelatedTools currentSlug="pinball" />
    </ToolPageShell>
  );
}
