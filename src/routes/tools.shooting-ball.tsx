import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, ArrowLeft, Volume2, VolumeX, Star } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { ModelLoadingSkeleton } from "@/components/ai-badges";

import { loadMatterJs, type MatterBody, type MatterEngine, type MatterGlobal } from "@/lib/shooting-ball/matter-loader";
import { LEVELS, starsFor, type Level } from "@/lib/shooting-ball/levels";
import { loadProgress, recordResult, saveProgress, type Progress } from "@/lib/shooting-ball/storage";
import {
  buildWorld,
  areBallsSettled,
  shootCue,
  BALL_R,
  TABLE_H,
  TABLE_W,
  CUE_START,
  POCKETS,
  POCKET_R,
} from "@/lib/shooting-ball/physics";
import { drawTable, drawPegs, drawBall, drawAim } from "@/lib/shooting-ball/render";

const PATH = "/tools/shooting-ball";
const TITLE = "Shooting Ball — Free Billiard Puzzle Game Online | Skycally";
const DESCRIPTION =
  "Play Shooting Ball free — aim, shoot, and pocket colored balls in this billiard puzzle game. 20 levels, no download, no signup, works on mobile.";

export const Route = createFileRoute("/tools/shooting-ball")({
  head: () => {
    const base = buildPageMeta({ title: TITLE, description: DESCRIPTION, path: PATH });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            name: "Shooting Ball",
            description:
              "Free browser-based billiard puzzle game. Aim the cue and pocket every colored ball to clear each level.",
            url: `${SITE_URL}${PATH}`,
            genre: ["Puzzle", "Sports"],
            playMode: "SinglePlayer",
            applicationCategory: "Game",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
      ],
    };
  },
  component: ShootingBallPage,
});

type Screen = "menu" | "levels" | "playing" | "won" | "lost";

// How long a ball takes to visually sink into a pocket (slide toward the
// pocket center while shrinking) before it's actually removed/respawned.
const FALL_DURATION_MS = 220;

function ShootingBallPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [levelId, setLevelId] = useState(1);
  const [livesLeft, setLivesLeft] = useState(0);
  const [shots, setShots] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [finalStars, setFinalStars] = useState<1 | 2 | 3>(1);

  const matterRef = useRef<MatterGlobal | null>(null);
  const engineRef = useRef<MatterEngine | null>(null);
  const cueRef = useRef<MatterBody | null>(null);
  const ballsRef = useRef<MatterBody[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Balls currently mid-pocketing animation: frozen physically, animated by
  // hand (position + shrink) over FALL_DURATION_MS, then either removed
  // (colored ball) or respawned (cue ball scratch).
  const fallingRef = useRef<
    Array<{
      body: MatterBody;
      isCue: boolean;
      pocketX: number;
      pocketY: number;
      startX: number;
      startY: number;
      startTime: number;
    }>
  >([]);

  // Aim state (imperative for perf; mirrored in ref)
  const aimRef = useRef<{ active: boolean; dx: number; dy: number; power: number }>({
    active: false,
    dx: 1,
    dy: 0,
    power: 0,
  });
  const settlingRef = useRef(false);
  const currentLevel = useMemo<Level>(() => LEVELS.find((l) => l.id === levelId) ?? LEVELS[0], [levelId]);

  // Load Matter.js once
  useEffect(() => {
    let alive = true;
    loadMatterJs()
      .then((m) => {
        if (!alive) return;
        matterRef.current = m;
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setError("Failed to load game engine. Check your connection and reload.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const teardownWorld = useCallback(() => {
    const M = matterRef.current;
    const engine = engineRef.current;
    if (M && engine) {
      M.World.clear(engine.world, false);
      M.Engine.clear(engine);
    }
    engineRef.current = null;
    cueRef.current = null;
    ballsRef.current = [];
    fallingRef.current = [];
  }, []);

  // Start / restart a level
  const startLevel = useCallback(
    (id: number) => {
      const M = matterRef.current;
      if (!M) return;
      const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];

      teardownWorld();
      const refs = buildWorld(M, level);
      engineRef.current = refs.engine;
      cueRef.current = refs.cue;
      ballsRef.current = refs.balls;

      setLevelId(id);
      setLivesLeft(level.lives);
      setShots(0);
      setRemaining(level.balls.length);
      settlingRef.current = false;

      // Collision handler for pockets
      M.Events.on(refs.engine, "collisionStart", (evt) => {
        for (const pair of evt.pairs) {
          const [ball, pocket] =
            pair.bodyA.label === "ball" || pair.bodyA.label === "cue"
              ? [pair.bodyA, pair.bodyB]
              : [pair.bodyB, pair.bodyA];
          if (!pocket.label.startsWith("pocket-")) continue;
          // Already sinking into a pocket — ignore further contacts.
          if (fallingRef.current.some((f) => f.body.id === ball.id)) continue;

          // Freeze the ball physically; we animate its position/size by hand
          // from here so it visibly slides into the pocket instead of
          // vanishing the instant it grazes the sensor's outer edge.
          M.Body.setVelocity(ball, { x: 0, y: 0 });
          M.Body.setStatic(ball, true);
          ball.isSensor = true;
          fallingRef.current.push({
            body: ball,
            isCue: ball.label === "cue",
            pocketX: pocket.position.x,
            pocketY: pocket.position.y,
            startX: ball.position.x,
            startY: ball.position.y,
            startTime: performance.now(),
          });

          if (ball.label === "cue") {
            playSound("lose");
            setLivesLeft((v) => v - 1);
          } else {
            ballsRef.current = ballsRef.current.filter((b) => b.id !== ball.id);
            playSound("score");
            setRemaining((v) => v - 1);
          }
        }
      });

      setScreen("playing");
    },
    [teardownWorld],
  );

  // End-of-shot / end-of-level detection driven by physics step
  const checkGameState = useCallback(() => {
    const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
    const cleared = ballsRef.current.length === 0;
    if (cleared) {
      const stars = starsFor(shots, level.par);
      setFinalStars(stars);
      setProgress((p) => recordResult(p, level.id, stars));
      playSound("win");
      setScreen("won");
      return;
    }
    if (livesLeft <= 0) {
      playSound("lose");
      setScreen("lost");
    }
  }, [levelId, livesLeft, shots]);

  useEffect(() => {
    if (screen !== "playing") return;
    // Only evaluate when balls are settled after a shot
    if (!settlingRef.current) return;
    const iv = window.setInterval(() => {
      const M = matterRef.current;
      const engine = engineRef.current;
      if (!M || !engine) return;
      if (
        areBallsSettled({ engine, cue: cueRef.current!, balls: ballsRef.current, pockets: [] }) &&
        fallingRef.current.length === 0
      ) {
        settlingRef.current = false;
        checkGameState();
      }
    }, 120);
    return () => window.clearInterval(iv);
  }, [screen, checkGameState, livesLeft, remaining]);

  // Main render + physics loop
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    const M = matterRef.current;
    if (!canvas || !M) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (ts: number) => {
      const engine = engineRef.current;
      const cue = cueRef.current;
      if (!engine || !cue) return;
      const dt = lastTsRef.current ? Math.min(32, ts - lastTsRef.current) : 16;
      lastTsRef.current = ts;
      M.Engine.update(engine, dt);

      // Render
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / TABLE_W, canvas.height / TABLE_H);
      const ox = (canvas.width - TABLE_W * scale) / 2;
      const oy = (canvas.height - TABLE_H * scale) / 2;
      ctx.setTransform(scale, 0, 0, scale, ox, oy);

      drawTable(ctx);
      drawPegs(ctx, currentLevel.pegs);
      for (const b of ballsRef.current) drawBall(ctx, b);
      const cueFalling = fallingRef.current.some((f) => f.isCue);
      if (!cueFalling) drawBall(ctx, cue);

      if (fallingRef.current.length > 0) {
        const now = performance.now();
        fallingRef.current = fallingRef.current.filter((f) => {
          const t = Math.min(1, (now - f.startTime) / FALL_DURATION_MS);
          const ease = 1 - Math.pow(1 - t, 3); // ease-out: quick pull into the pocket
          const fx = f.startX + (f.pocketX - f.startX) * ease;
          const fy = f.startY + (f.pocketY - f.startY) * ease;
          const shrink = Math.max(0.001, 1 - ease);

          M.Body.setPosition(f.body, { x: fx, y: fy });
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
          ctx.translate(fx, fy);
          ctx.scale(shrink, shrink);
          ctx.translate(-fx, -fy);
          drawBall(ctx, f.body);
          ctx.restore();

          if (t < 1) return true;

          if (f.isCue) {
            M.Body.setStatic(f.body, false);
            f.body.isSensor = false;
            M.Body.setPosition(f.body, { x: CUE_START.x, y: CUE_START.y });
            M.Body.setVelocity(f.body, { x: 0, y: 0 });
          } else {
            M.World.remove(engine.world, f.body);
          }
          return false;
        });
      }

      if (aimRef.current.active && !settlingRef.current) {
        drawAim(ctx, cue.position.x, cue.position.y, aimRef.current.dx, aimRef.current.dy, aimRef.current.power);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = 0;
    };
  }, [screen, currentLevel]);

  // Pointer aiming
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toTable = (evt: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / TABLE_W, rect.height / TABLE_H);
      const ox = (rect.width - TABLE_W * scale) / 2;
      const oy = (rect.height - TABLE_H * scale) / 2;
      return {
        x: (evt.clientX - rect.left - ox) / scale,
        y: (evt.clientY - rect.top - oy) / scale,
      };
    };

    const onDown = (e: PointerEvent) => {
      if (settlingRef.current) return;
      const cue = cueRef.current;
      if (!cue) return;
      const p = toTable(e);
      aimRef.current.active = true;
      aimRef.current.dx = p.x - cue.position.x;
      aimRef.current.dy = p.y - cue.position.y;
      aimRef.current.power = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!aimRef.current.active) return;
      const cue = cueRef.current;
      if (!cue) return;
      const p = toTable(e);
      const dx = p.x - cue.position.x;
      const dy = p.y - cue.position.y;
      aimRef.current.dx = dx;
      aimRef.current.dy = dy;
      const dist = Math.hypot(dx, dy);
      aimRef.current.power = Math.min(1, dist / 180);
    };
    const onUp = (e: PointerEvent) => {
      const M = matterRef.current;
      const cue = cueRef.current;
      if (!aimRef.current.active || !M || !cue) return;
      aimRef.current.active = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      const power = aimRef.current.power;
      if (power < 0.05) return;
      shootCue(M, cue, aimRef.current.dx, aimRef.current.dy, power);
      playSound("hit");
      setShots((s) => s + 1);
      setLivesLeft((v) => v - 1);
      settlingRef.current = true;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [screen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      teardownWorld();
    };
  }, [teardownWorld]);

  const toggleSound = () => {
    const next = { ...progress, sound: !progress.sound };
    setProgress(next);
    saveProgress(next);
  };

  return (
    <ToolPageShell
      title="Shooting Ball"
      description="Aim, shoot, and pocket colored balls in this free browser billiard puzzle game. 20 challenging levels."
      showFileDisclaimer={false}
    >
      {!ready && !error && <ModelLoadingSkeleton label="Loading physics engine…" />}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {ready && screen === "menu" && (
        <div className="mx-auto max-w-xl text-center rounded-2xl border border-border bg-card p-8">
          <div className="text-6xl mb-3" aria-hidden>
            🎱
          </div>
          <h2 className="font-display text-3xl font-bold">Shooting Ball</h2>
          <p className="mt-2 text-muted-foreground">
            Pocket every colored ball before you run out of shots. Cleaner runs earn more stars.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setScreen("levels")}
              className="rounded-xl px-6 py-3 font-semibold text-background"
              style={{ background: "var(--cyan-brand)" }}
            >
              Play
            </button>
            <button
              onClick={() => startLevel(progress.unlocked > 1 ? progress.unlocked - 1 : 1)}
              className="rounded-xl border border-border px-6 py-3 font-semibold"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {ready && screen === "levels" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setScreen("menu")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Menu
            </button>
            <button onClick={toggleSound} aria-label="Toggle sound" className="rounded-lg border border-border p-2">
              {progress.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {LEVELS.map((lvl) => {
              const locked = lvl.id > progress.unlocked;
              const st = progress.stars[lvl.id] ?? 0;
              return (
                <button
                  key={lvl.id}
                  disabled={locked}
                  onClick={() => startLevel(lvl.id)}
                  className={
                    "aspect-square rounded-xl border p-2 flex flex-col items-center justify-center gap-1 transition " +
                    (locked
                      ? "border-border bg-secondary/40 opacity-50 cursor-not-allowed"
                      : "border-border bg-card hover:border-primary")
                  }
                >
                  <div className="text-2xl font-bold">{lvl.id}</div>
                  <div className="text-[10px] text-muted-foreground">{lvl.name}</div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className="w-3 h-3"
                        fill={i <= st ? "#facc15" : "none"}
                        stroke={i <= st ? "#facc15" : "currentColor"}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <AdZone id="shooting-ball-mid" size="728x90" />
        </div>
      )}

      {ready && (screen === "playing" || screen === "won" || screen === "lost") && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  teardownWorld();
                  setScreen("levels");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Levels
              </button>
              <button
                onClick={() => startLevel(levelId)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Restart
              </button>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="rounded-lg bg-secondary/60 px-3 py-1.5">
                Level <b>{levelId}</b>
              </div>
              <div className="rounded-lg bg-secondary/60 px-3 py-1.5">
                Balls <b>{remaining}</b>
              </div>
              <div className="rounded-lg bg-secondary/60 px-3 py-1.5">
                Shots <b>{Math.max(0, livesLeft)}</b>
              </div>
            </div>
          </div>

          <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-border bg-black">
            <canvas
              ref={canvasRef}
              className="block w-full touch-none"
              style={{ aspectRatio: `${TABLE_W} / ${TABLE_H}`, height: "auto" }}
              aria-label="Billiard table"
            />

            {screen === "won" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                <h3 className="font-display text-3xl font-bold">Level cleared!</h3>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <Star key={i} className="w-8 h-8" fill={i <= finalStars ? "#facc15" : "none"} stroke="#facc15" />
                  ))}
                </div>
                <p className="mt-2 text-sm text-white/80">
                  {shots} shots · par {currentLevel.par}
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => startLevel(Math.min(LEVELS.length, levelId + 1))}
                    className="rounded-xl px-5 py-2.5 font-semibold text-background"
                    style={{ background: "var(--cyan-brand)" }}
                  >
                    Next level
                  </button>
                  <button onClick={() => startLevel(levelId)} className="rounded-xl border border-white/40 px-5 py-2.5">
                    Replay
                  </button>
                </div>
              </div>
            )}

            {screen === "lost" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                <h3 className="font-display text-3xl font-bold">Out of shots</h3>
                <p className="mt-2 text-sm text-white/80">{remaining} balls remaining</p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => startLevel(levelId)}
                    className="rounded-xl px-5 py-2.5 font-semibold text-background"
                    style={{ background: "var(--cyan-brand)" }}
                  >
                    Try again
                  </button>
                  <button
                    onClick={() => {
                      teardownWorld();
                      setScreen("levels");
                    }}
                    className="rounded-xl border border-white/40 px-5 py-2.5"
                  >
                    Levels
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            Drag from the cue ball to aim — the further you drag, the harder the shot.
          </p>
        </div>
      )}

      <HowToUse
        steps={[
          "Choose a level from the level select screen.",
          "Drag from the white cue ball to aim, and pull further for more power.",
          "Release to shoot. Pocket every colored ball before you run out of shots.",
        ]}
      />

      <ToolSeoContent
        title="Shooting Ball Game — Free Billiard Puzzle Online"
        description="Play Shooting Ball free online — an addictive billiard puzzle where you aim, shoot and pocket colored balls with realistic physics. 20 levels, no download, no signup."
        body={[
          "Shooting Ball is a free browser billiard puzzle inspired by pool and Ball Blast. Every level tasks you with pocketing every colored ball on the table before running out of shots. Realistic 2D physics powered by Matter.js models spin, restitution and friction so every carom feels authentic.",
          "Drag from the white cue ball to aim, then pull back further for more power — release to strike. Chain combos, ricochet off rails, and use the fewest shots possible to earn three stars on each of the 20 hand-crafted levels.",
          "Unlike traditional 8-ball or 9-ball pool, Shooting Ball is built as a puzzle: every level has a fixed layout of pegs, colored balls and pockets, and a limited number of shots to clear it. This turns each level into a small physics riddle — sometimes the fastest route is a direct pot, other times you need a bank shot off a rail or a peg to reach a ball tucked in a corner.",
          "The game runs entirely in your browser on desktop and mobile, with no download and no signup required. Progress, unlocked levels and star ratings are all saved locally in your browser, so you can close the tab and pick up right where you left off.",
        ]}
        faqs={[
          {
            question: "Is Shooting Ball really free?",
            answer:
              "Yes. Every level and feature is completely free with no signup, no download, and no in-app purchases.",
          },
          {
            question: "How do I earn 3 stars on a level?",
            answer:
              "Clear the level using no more shots than the level's par. One or two shots above par earns 2 stars; clearing at all earns 1 star.",
          },
          {
            question: "What happens if the cue ball is pocketed?",
            answer:
              "That's a scratch — the cue ball respawns on the left side of the table and you lose one shot from your remaining shots.",
          },
          {
            question: "Does it work on mobile?",
            answer:
              "Yes. Shooting Ball uses touch pointer events, so you can aim and shoot on any modern phone or tablet.",
          },
          {
            question: "How many levels are there?",
            answer:
              "There are 20 hand-crafted levels, each with its own layout of pegs, colored balls and pockets, and increasing in difficulty as you progress.",
          },
          {
            question: "Do I need to install anything to play?",
            answer:
              "No. Shooting Ball runs entirely in your browser using HTML canvas and JavaScript physics — there is nothing to download or install.",
          },
          {
            question: "Is my progress saved if I close the browser?",
            answer:
              "Yes. Your unlocked levels and star ratings are saved locally in your browser's storage, so they'll still be there next time you visit.",
          },
          {
            question: "What do the pegs on the table do?",
            answer:
              "Pegs act as obstacles and rebound points. Balls bounce off them just like rails, so you can use pegs to redirect a shot around a blocker toward a pocket.",
          },
          {
            question: "Can I mute the game's sound effects?",
            answer: "Yes. Use the speaker icon on the level select screen to toggle sound on or off at any time.",
          },
          {
            question: "What happens if I run out of shots before clearing the table?",
            answer: "The level ends and you can either retry the same level or return to the level select screen.",
          },
        ]}
      />

      <RelatedTools currentSlug="shooting-ball" />
    </ToolPageShell>
  );
}
