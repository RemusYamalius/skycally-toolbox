import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/space-shooter")({
  head: () => buildToolMeta(toolBySlug("space-shooter", tools)),
  component: SpaceShooterPage,
});

// ---- Game constants ----
const W = 480;
const H = 640;
const PLAYER_W = 36;
const PLAYER_H = 24;
const PLAYER_SPEED = 280; // px/s
const BULLET_SPEED = 520;
const ENEMY_BULLET_SPEED = 240;
const SHOT_COOLDOWN = 220; // ms (manual)
const AUTO_COOLDOWN = 300; // ms
const TOUCH_AUTO_REPEAT = 200;
const ENEMY_COLS = 5;
const ENEMY_ROWS = 3;
const ENEMY_W = 32;
const ENEMY_H = 22;
const ENEMY_GAP_X = 24;
const ENEMY_GAP_Y = 22;

type Vec = { x: number; y: number };
type Bullet = Vec & { vy: number };
type Enemy = Vec & { alive: boolean; type: number };
type Particle = Vec & { vx: number; vy: number; life: number; max: number; color: string };
type Star = { x: number; y: number; r: number; speed: number };
type Scene = "start" | "play" | "over";

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function SpaceShooterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [autoFire, setAutoFire] = useState(true);
  const autoFireRef = useRef(true);
  const [hudScore, setHudScore] = useState(0);
  const [hudWave, setHudWave] = useState(1);
  const [hudHigh, setHudHigh] = useState(0);

  // Input refs
  const leftRef = useRef(false);
  const rightRef = useRef(false);
  const fireHeldRef = useRef(false);
  const lastShotRef = useRef(0);
  const lastTouchFireRef = useRef(0);
  // Joystick
  const joyActiveRef = useRef(false);
  const joyDxRef = useRef(0); // -1..1

  // Mutable game state
  const sceneRef = useRef<Scene>("start");
  const playerRef = useRef<Vec>({ x: W / 2 - PLAYER_W / 2, y: H - 60 });
  const playerVxRef = useRef(0);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const invincibleRef = useRef(0);
  const flashRef = useRef(0);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyDirRef = useRef<1 | -1>(1);
  const enemySpeedRef = useRef(40);
  const enemyShootTimerRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const nebulaRef = useRef<{ x: number; y: number; r: number; hue: number; speed: number } | null>(null);

  // Play Again button hitbox (canvas coords)
  const playAgainHitRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && "ontouchstart" in window);
    try {
      const stored = parseInt(localStorage.getItem("space-shooter:high") || "0", 10);
      if (!isNaN(stored)) setHudHigh(stored);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { autoFireRef.current = autoFire; }, [autoFire]);

  // ---- Setup helpers ----
  const initStars = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        speed: 10 + Math.random() * 50,
      });
    }
    starsRef.current = stars;
    nebulaRef.current = {
      x: Math.random() * W,
      y: -120,
      r: 90 + Math.random() * 80,
      hue: Math.floor(Math.random() * 360),
      speed: 8 + Math.random() * 10,
    };
  }, []);

  const spawnWave = useCallback((waveNum: number) => {
    const enemies: Enemy[] = [];
    const totalW = ENEMY_COLS * ENEMY_W + (ENEMY_COLS - 1) * ENEMY_GAP_X;
    const startX = (W - totalW) / 2;
    const startY = 60;
    for (let r = 0; r < ENEMY_ROWS; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({
          x: startX + c * (ENEMY_W + ENEMY_GAP_X),
          y: startY + r * (ENEMY_H + ENEMY_GAP_Y),
          alive: true,
          type: r, // top row = different look
        });
      }
    }
    enemiesRef.current = enemies;
    enemyDirRef.current = 1;
    enemySpeedRef.current = 40 + (waveNum - 1) * 18;
    enemyShootTimerRef.current = 0;
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = { x: W / 2 - PLAYER_W / 2, y: H - 60 };
    playerVxRef.current = 0;
    livesRef.current = 3;
    scoreRef.current = 0;
    waveRef.current = 1;
    invincibleRef.current = 0;
    flashRef.current = 0;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    particlesRef.current = [];
    spawnWave(1);
    setHudScore(0);
    setHudWave(1);
  }, [spawnWave]);

  const startGame = useCallback(() => {
    resetGame();
    sceneRef.current = "play";
  }, [resetGame]);

  // ---- Particles ----
  const explode = useCallback((cx: number, cy: number, color: string) => {
    const parts: Particle[] = particlesRef.current;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 50 + Math.random() * 180;
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: 0.4 + Math.random() * 0.5,
        color,
      });
    }
  }, []);

  // ---- Shooting ----
  const tryShoot = useCallback((cooldown: number) => {
    const now = performance.now();
    if (now - lastShotRef.current < cooldown) return;
    lastShotRef.current = now;
    const p = playerRef.current;
    bulletsRef.current.push({ x: p.x + PLAYER_W / 2 - 2, y: p.y - 4, vy: -BULLET_SPEED });
  }, []);

  // ---- Keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key;
      if (["ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(k)) e.preventDefault();
      if (k === "ArrowLeft" || k === "a" || k === "A") leftRef.current = down;
      else if (k === "ArrowRight" || k === "d" || k === "D") rightRef.current = down;
      else if (k === " " || k === "Spacebar") {
        if (down) {
          if (sceneRef.current === "start") startGame();
          else if (sceneRef.current === "over") startGame();
          else fireHeldRef.current = true;
        } else {
          fireHeldRef.current = false;
        }
      }
    };
    const dn = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [startGame]);

  // ---- Game loop ----
  useEffect(() => {
    initStars();
    let raf = 0;
    let last = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt, t);
      render(ctx);
      raf = requestAnimationFrame(loop);
    };

    const update = (dt: number, tNow: number) => {
      // Stars always animate
      for (const s of starsRef.current) {
        s.y += s.speed * dt;
        if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      }
      const neb = nebulaRef.current;
      if (neb) {
        neb.y += neb.speed * dt;
        if (neb.y - neb.r > H) {
          neb.x = Math.random() * W;
          neb.y = -neb.r - Math.random() * 200;
          neb.hue = Math.floor(Math.random() * 360);
        }
      }

      // Particles
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.life >= p.max) parts.splice(i, 1);
      }
      if (flashRef.current > 0) flashRef.current = Math.max(0, flashRef.current - dt);
      if (invincibleRef.current > 0) invincibleRef.current = Math.max(0, invincibleRef.current - dt);

      if (sceneRef.current !== "play") return;

      // Player movement
      let vx = 0;
      if (leftRef.current) vx -= 1;
      if (rightRef.current) vx += 1;
      if (joyActiveRef.current) vx = joyDxRef.current;
      const player = playerRef.current;
      player.x += vx * PLAYER_SPEED * dt;
      if (player.x < 6) player.x = 6;
      if (player.x > W - PLAYER_W - 6) player.x = W - PLAYER_W - 6;

      // Shooting
      if (isTouch && autoFireRef.current) {
        tryShoot(AUTO_COOLDOWN);
      }
      if (fireHeldRef.current) {
        tryShoot(SHOT_COOLDOWN);
      }
      if (isTouch && fireHeldRef.current === false && lastTouchFireRef.current > 0) {
        // touch fire button repeat handled by interval below (cleared on release)
      }

      // Player bullets
      const pb = bulletsRef.current;
      for (let i = pb.length - 1; i >= 0; i--) {
        pb[i].y += pb[i].vy * dt;
        if (pb[i].y < -10) pb.splice(i, 1);
      }

      // Enemy bullets
      const eb = enemyBulletsRef.current;
      for (let i = eb.length - 1; i >= 0; i--) {
        eb[i].y += eb[i].vy * dt;
        if (eb[i].y > H + 10) eb.splice(i, 1);
      }

      // Enemies
      const enemies = enemiesRef.current;
      let aliveCount = 0;
      let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const e of enemies) {
        if (!e.alive) continue;
        aliveCount++;
        e.x += enemyDirRef.current * enemySpeedRef.current * dt;
        if (e.x < minX) minX = e.x;
        if (e.x + ENEMY_W > maxX) maxX = e.x + ENEMY_W;
        if (e.y + ENEMY_H > maxY) maxY = e.y + ENEMY_H;
      }
      if (aliveCount === 0) {
        // next wave
        waveRef.current++;
        setHudWave(waveRef.current);
        spawnWave(waveRef.current);
      } else {
        if (minX < 8 && enemyDirRef.current === -1) {
          enemyDirRef.current = 1;
          for (const e of enemies) if (e.alive) e.y += 18;
        } else if (maxX > W - 8 && enemyDirRef.current === 1) {
          enemyDirRef.current = -1;
          for (const e of enemies) if (e.alive) e.y += 18;
        }
        // Reach bottom = lose
        if (maxY > player.y) {
          livesRef.current = 0;
          gameOver();
          return;
        }
      }

      // Enemy shooting
      enemyShootTimerRef.current -= dt;
      if (enemyShootTimerRef.current <= 0) {
        const aliveEnemies = enemies.filter((e) => e.alive);
        if (aliveEnemies.length) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          enemyBulletsRef.current.push({
            x: shooter.x + ENEMY_W / 2 - 2,
            y: shooter.y + ENEMY_H,
            vy: ENEMY_BULLET_SPEED,
          });
        }
        enemyShootTimerRef.current = Math.max(0.35, 1.4 - waveRef.current * 0.12) + Math.random() * 0.6;
      }

      // Collisions: player bullets vs enemies
      for (let i = pb.length - 1; i >= 0; i--) {
        const b = pb[i];
        for (const e of enemies) {
          if (!e.alive) continue;
          if (rectsOverlap(b.x, b.y, 4, 10, e.x, e.y, ENEMY_W, ENEMY_H)) {
            e.alive = false;
            pb.splice(i, 1);
            scoreRef.current += 10;
            setHudScore(scoreRef.current);
            explode(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, "#f97316");
            break;
          }
        }
      }

      // Enemy bullets vs player
      if (invincibleRef.current <= 0) {
        for (let i = eb.length - 1; i >= 0; i--) {
          const b = eb[i];
          if (rectsOverlap(b.x, b.y, 4, 10, player.x, player.y, PLAYER_W, PLAYER_H)) {
            eb.splice(i, 1);
            hitPlayer();
            break;
          }
        }
      }
    };

    const hitPlayer = () => {
      livesRef.current--;
      invincibleRef.current = 1.4;
      flashRef.current = 0.25;
      const player = playerRef.current;
      explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, "#22d3ee");
      if (livesRef.current <= 0) gameOver();
    };

    const gameOver = () => {
      sceneRef.current = "over";
      try {
        const prev = parseInt(localStorage.getItem("space-shooter:high") || "0", 10) || 0;
        if (scoreRef.current > prev) {
          localStorage.setItem("space-shooter:high", String(scoreRef.current));
          setHudHigh(scoreRef.current);
        }
      } catch { /* noop */ }
    };

    const render = (c: CanvasRenderingContext2D) => {
      // Background
      c.fillStyle = "#05060f";
      c.fillRect(0, 0, W, H);

      // Nebula
      const neb = nebulaRef.current;
      if (neb) {
        const grd = c.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
        grd.addColorStop(0, `hsla(${neb.hue},80%,55%,0.35)`);
        grd.addColorStop(0.6, `hsla(${neb.hue + 30},80%,40%,0.12)`);
        grd.addColorStop(1, "hsla(0,0%,0%,0)");
        c.fillStyle = grd;
        c.beginPath();
        c.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
        c.fill();
      }

      // Stars
      for (const s of starsRef.current) {
        c.globalAlpha = 0.4 + s.r * 0.4;
        c.fillStyle = "#fff";
        c.fillRect(s.x, s.y, s.r, s.r);
      }
      c.globalAlpha = 1;

      if (sceneRef.current === "play" || sceneRef.current === "over") {
        // Enemies
        for (const e of enemiesRef.current) {
          if (!e.alive) continue;
          drawEnemy(c, e);
        }
        // Bullets
        for (const b of bulletsRef.current) {
          c.fillStyle = "#22d3ee";
          c.shadowColor = "#22d3ee";
          c.shadowBlur = 8;
          c.fillRect(b.x, b.y, 4, 10);
        }
        for (const b of enemyBulletsRef.current) {
          c.fillStyle = "#f97316";
          c.shadowColor = "#f97316";
          c.shadowBlur = 8;
          c.fillRect(b.x, b.y, 4, 10);
        }
        c.shadowBlur = 0;
        // Player
        if (sceneRef.current === "play") {
          const blink = invincibleRef.current > 0 && Math.floor(performance.now() / 80) % 2 === 0;
          if (!blink) drawPlayer(c, playerRef.current);
        }
        // Particles
        for (const p of particlesRef.current) {
          const a = 1 - p.life / p.max;
          c.globalAlpha = Math.max(0, a);
          c.fillStyle = p.color;
          c.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        c.globalAlpha = 1;

        // HUD
        drawHud(c);

        if (flashRef.current > 0) {
          c.fillStyle = `rgba(239,68,68,${flashRef.current * 1.2})`;
          c.fillRect(0, 0, W, H);
        }
      }

      if (sceneRef.current === "start") {
        drawCenterPanel(c, "SPACE SHOOTER", isTouch ? "Tap to Start" : "Press Space to Start", [
          isTouch ? "Joystick to move • Fire button to shoot" : "← → / A D to move • Space to shoot",
          "Destroy all aliens to advance waves",
        ]);
        playAgainHitRef.current = null;
      } else if (sceneRef.current === "over") {
        drawGameOver(c);
      } else {
        playAgainHitRef.current = null;
      }
    };

    const drawPlayer = (c: CanvasRenderingContext2D, p: Vec) => {
      c.save();
      c.translate(p.x, p.y);
      // body
      c.fillStyle = "#22d3ee";
      c.beginPath();
      c.moveTo(PLAYER_W / 2, 0);
      c.lineTo(PLAYER_W, PLAYER_H);
      c.lineTo(0, PLAYER_H);
      c.closePath();
      c.fill();
      // cockpit
      c.fillStyle = "#0ea5b7";
      c.fillRect(PLAYER_W / 2 - 4, 6, 8, 8);
      // thruster
      c.fillStyle = "#fb923c";
      const flick = 4 + Math.random() * 4;
      c.fillRect(PLAYER_W / 2 - 3, PLAYER_H, 6, flick);
      c.restore();
    };

    const drawEnemy = (c: CanvasRenderingContext2D, e: Enemy) => {
      const colors = ["#a78bfa", "#f472b6", "#34d399"];
      c.fillStyle = colors[e.type % colors.length];
      c.fillRect(e.x + 4, e.y + 4, ENEMY_W - 8, ENEMY_H - 10);
      c.fillRect(e.x, e.y + 8, 4, 8);
      c.fillRect(e.x + ENEMY_W - 4, e.y + 8, 4, 8);
      c.fillRect(e.x + 6, e.y, 6, 4);
      c.fillRect(e.x + ENEMY_W - 12, e.y, 6, 4);
      c.fillStyle = "#020617";
      c.fillRect(e.x + 9, e.y + 9, 4, 4);
      c.fillRect(e.x + ENEMY_W - 13, e.y + 9, 4, 4);
    };

    const drawHud = (c: CanvasRenderingContext2D) => {
      c.fillStyle = "#fff";
      c.font = "bold 14px system-ui,sans-serif";
      // Lives (top-left)
      for (let i = 0; i < livesRef.current; i++) {
        const x = 12 + i * 22;
        const y = 14;
        c.fillStyle = "#22d3ee";
        c.beginPath();
        c.moveTo(x + 8, y);
        c.lineTo(x + 16, y + 12);
        c.lineTo(x, y + 12);
        c.closePath();
        c.fill();
      }
      // Wave (top-center)
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.textAlign = "center";
      c.fillText(`WAVE ${waveRef.current}`, W / 2, 22);
      // Score (top-right)
      c.textAlign = "right";
      c.fillText(`${scoreRef.current}`, W - 12, 22);
      c.textAlign = "left";
    };

    const drawCenterPanel = (c: CanvasRenderingContext2D, title: string, prompt: string, lines: string[]) => {
      c.fillStyle = "rgba(2,6,23,0.7)";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#22d3ee";
      c.font = "bold 36px system-ui,sans-serif";
      c.textAlign = "center";
      c.fillText(title, W / 2, H / 2 - 40);
      c.fillStyle = "#fff";
      c.font = "bold 18px system-ui,sans-serif";
      c.fillText(prompt, W / 2, H / 2);
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.font = "14px system-ui,sans-serif";
      lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + 32 + i * 20));
      c.textAlign = "left";
    };

    const drawGameOver = (c: CanvasRenderingContext2D) => {
      c.fillStyle = "rgba(2,6,23,0.78)";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#ef4444";
      c.font = "bold 42px system-ui,sans-serif";
      c.textAlign = "center";
      c.fillText("GAME OVER", W / 2, H / 2 - 60);
      c.fillStyle = "#fff";
      c.font = "bold 20px system-ui,sans-serif";
      c.fillText(`Score: ${scoreRef.current}`, W / 2, H / 2 - 20);
      c.fillStyle = "rgba(255,255,255,0.8)";
      c.font = "16px system-ui,sans-serif";
      c.fillText(`Wave reached: ${waveRef.current}`, W / 2, H / 2 + 6);
      c.fillText(`High score: ${Math.max(scoreRef.current, hudHighRef.current)}`, W / 2, H / 2 + 28);

      // Play Again button
      const bw = 180;
      const bh = 48;
      const bx = (W - bw) / 2;
      const by = H / 2 + 60;
      c.fillStyle = "#22d3ee";
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = "#020617";
      c.font = "bold 18px system-ui,sans-serif";
      c.fillText("PLAY AGAIN", W / 2, by + 30);
      c.textAlign = "left";
      playAgainHitRef.current = { x: bx, y: by, w: bw, h: bh };
    };

    raf = requestAnimationFrame((t) => { last = t; loop(t); });
    return () => cancelAnimationFrame(raf);
  }, [explode, initStars, isTouch, spawnWave, tryShoot]);

  // Track latest high for game-over draw
  const hudHighRef = useRef(0);
  useEffect(() => { hudHighRef.current = hudHigh; }, [hudHigh]);

  // ---- Canvas click / tap (start + play again) ----
  const handleCanvasPointer = useCallback((cx: number, cy: number) => {
    if (sceneRef.current === "start") {
      startGame();
      return;
    }
    if (sceneRef.current === "over") {
      const hit = playAgainHitRef.current;
      if (hit && cx >= hit.x && cx <= hit.x + hit.w && cy >= hit.y && cy <= hit.y + hit.h) {
        startGame();
      } else {
        // Tap anywhere also restarts on over screen for mobile UX
        startGame();
      }
    }
  }, [startGame]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    handleCanvasPointer(x, y);
  };

  // ---- Touch joystick ----
  const joyRef = useRef<HTMLDivElement>(null);
  const joyThumbRef = useRef<HTMLDivElement>(null);
  const joyTouchIdRef = useRef<number | null>(null);

  const onJoyStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyTouchIdRef.current = t.identifier;
    joyActiveRef.current = true;
    updateJoy(t.clientX);
  };
  const onJoyMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchIdRef.current) {
        updateJoy(t.clientX);
      }
    }
  };
  const onJoyEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchIdRef.current) {
        joyTouchIdRef.current = null;
        joyActiveRef.current = false;
        joyDxRef.current = 0;
        if (joyThumbRef.current) {
          joyThumbRef.current.style.transform = "translate(-50%, -50%)";
        }
      }
    }
  };
  const updateJoy = (clientX: number) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const max = r.width / 2 - 8;
    let dx = clientX - cx;
    if (dx > max) dx = max;
    if (dx < -max) dx = -max;
    joyDxRef.current = dx / max;
    if (joyThumbRef.current) {
      joyThumbRef.current.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
    }
  };

  // ---- Touch fire button ----
  const fireRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFireStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (sceneRef.current === "start" || sceneRef.current === "over") {
      startGame();
      return;
    }
    tryShoot(SHOT_COOLDOWN);
    lastTouchFireRef.current = performance.now();
    if (fireRepeatRef.current) clearInterval(fireRepeatRef.current);
    fireRepeatRef.current = setInterval(() => {
      tryShoot(TOUCH_AUTO_REPEAT - 20);
    }, TOUCH_AUTO_REPEAT);
  };
  const onFireEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (fireRepeatRef.current) {
      clearInterval(fireRepeatRef.current);
      fireRepeatRef.current = null;
    }
    lastTouchFireRef.current = 0;
  };
  useEffect(() => () => {
    if (fireRepeatRef.current) clearInterval(fireRepeatRef.current);
  }, []);

  return (
    <ToolPageShell title="Space Shooter" description="Destroy alien ships and survive the galaxy attack!">
      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-8">
        {/* Top bar with auto-fire toggle */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="text-sm text-muted-foreground">
            High score: <span className="text-yellow-400 font-bold">{hudHigh}</span>
          </div>
          {isTouch && (
            <button
              type="button"
              onClick={() => setAutoFire((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                autoFire
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              AUTO 🔥 {autoFire ? "ON" : "OFF"}
            </button>
          )}
          <div className="text-sm text-muted-foreground">
            Score: <span className="text-foreground font-bold">{hudScore}</span> · Wave{" "}
            <span className="text-foreground font-bold">{hudWave}</span>
          </div>
        </div>

        {/* Game canvas + overlay controls */}
        <div className="relative mx-auto w-full" style={{ maxWidth: 480 }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={onCanvasClick}
            className="block w-full rounded-xl border-2 border-border bg-black touch-none select-none"
            style={{ aspectRatio: `${W} / ${H}` }}
          />

          {isTouch && (
            <>
              {/* Joystick bottom-left */}
              <div
                ref={joyRef}
                onTouchStart={onJoyStart}
                onTouchMove={onJoyMove}
                onTouchEnd={onJoyEnd}
                onTouchCancel={onJoyEnd}
                className="absolute left-3 bottom-3 w-20 h-20 rounded-full border border-white/30 bg-black/40 touch-none select-none"
                style={{ opacity: 0.75 }}
              >
                <div
                  ref={joyThumbRef}
                  className="absolute left-1/2 top-1/2 rounded-full bg-white/70 border border-white/80"
                  style={{ width: 35, height: 35, transform: "translate(-50%, -50%)" }}
                />
              </div>

              {/* Fire button bottom-right */}
              <button
                type="button"
                onTouchStart={onFireStart}
                onTouchEnd={onFireEnd}
                onTouchCancel={onFireEnd}
                className="absolute right-3 bottom-3 w-20 h-20 rounded-full border border-white/30 bg-black/50 flex items-center justify-center touch-none select-none"
                style={{ opacity: 0.75 }}
                aria-label="Fire"
              >
                <Zap className="w-8 h-8 text-cyan-300" />
              </button>
            </>
          )}
        </div>

        {/* Desktop hint */}
        {!isTouch && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ← → to move • Space to shoot
          </p>
        )}
      </div>

      <HowToUse
        steps={[
          "Tap or press Space to start the game.",
          "Move left and right to dodge enemy bullets, and shoot to destroy alien ships.",
          "Clear every wave to advance — each new wave is faster and more aggressive.",
        ]}
      />

      <ToolSeoContent
        title="Space Shooter — Free Online Arcade Game"
        description="Play Space Shooter online for free. Destroy alien ships, dodge bullets and survive endless waves of invaders — no signup, no download."
        body={[
          "Space Shooter is a classic browser arcade game inspired by Space Invaders. You pilot a lone fighter against waves of alien ships descending from the top of the screen. The action is fast, the rules are simple, and every match runs entirely in your browser — there is nothing to install and no account to create. Just open the page and start blasting.",
          "Move your ship left and right to dodge incoming fire while shooting upward to destroy the alien grid. Each ship you take down is worth 10 points, and clearing the whole formation advances you to the next wave. Every wave moves faster, fires more often, and pushes deeper toward your position. You have three lives — survive as long as you can and chase a new high score.",
          "The game is fully mobile-friendly. A virtual joystick controls movement, a large fire button lets you shoot, and an AUTO 🔥 toggle keeps your guns blazing hands-free. Touch controls only appear on touch devices, so desktop players keep a clean keyboard experience. No ads, no downloads, no signup — just instant retro arcade action on any device.",
        ]}
        faqs={[
          { question: "Is Space Shooter free to play?", answer: "Yes, completely free with no signup or download required. Just open the page and start playing instantly." },
          { question: "Can I play on mobile?", answer: "Yes. The game includes a virtual joystick and fire button optimized for touch screens, plus an auto-fire toggle for hands-free shooting." },
          { question: "Does the game save my high score?", answer: "Your high score is saved locally in your browser so you can keep chasing your personal best on the same device." },
          { question: "How do I advance to the next wave?", answer: "Destroy all enemy ships in the current wave to advance. Each new wave is faster and more aggressive than the last." },
        ]}
      />

      <RelatedTools currentSlug="space-shooter" />
    </ToolPageShell>
  );
}
