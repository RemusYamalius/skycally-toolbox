import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/flappy-bird")({
  head: () => buildToolMeta(toolBySlug("flappy-bird", tools)),
  component: FlappyBirdPage,
});

const W = 400;
const H = 600;
const GRAVITY = 0.5;
const FLAP_FORCE = -9;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 1600;
const BIRD_X = 80;
const BIRD_SIZE = 28;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

interface BirdState {
  y: number;
  vy: number;
}

type Phase = "idle" | "playing" | "dead";

function FlappyBirdPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(0);

  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem("flappy-best") || 0);
      if (v > 0) setBest(v);
    } catch { /* ignore */ }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdRef = useRef<BirdState>({ y: H / 2, vy: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const animRef = useRef<number>(0);
  const lastPipeRef = useRef<number>(0);
  const bestRef = useRef<number>(best);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#8B6914";
    ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = "#5D8A3C";
    ctx.fillRect(0, H - 44, W, 8);

    pipesRef.current.forEach((p) => {
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
      ctx.fillRect(p.x, p.topH + PIPE_GAP, PIPE_WIDTH, H - p.topH - PIPE_GAP);

      ctx.fillStyle = "#388E3C";
      ctx.fillRect(p.x - 4, p.topH - 20, PIPE_WIDTH + 8, 20);
      ctx.fillRect(p.x - 4, p.topH + PIPE_GAP, PIPE_WIDTH + 8, 20);
    });

    const bird = birdRef.current;
    const angle = Math.min(Math.max(bird.vy * 3, -30), 90) * (Math.PI / 180);
    ctx.save();
    ctx.translate(BIRD_X, bird.y);
    ctx.rotate(angle);

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.ellipse(-4, 4, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(10, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FF6B00";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(22, -2);
    ctx.lineTo(22, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(W / 2 - 40, 16, 80, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(scoreRef.current), W / 2, 42);
  };

  const drawOverlay = (ctx: CanvasRenderingContext2D, type: "idle" | "dead") => {
    draw(ctx);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";

    if (type === "idle") {
      ctx.fillText("Flappy Bird", W / 2, H / 2 - 40);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.fillText("Tap / Press Space to Start", W / 2, H / 2 + 10);
    } else {
      ctx.fillText("Game Over", W / 2, H / 2 - 60);
      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`Score: ${scoreRef.current}`, W / 2, H / 2 - 20);
      ctx.fillStyle = "#aaa";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Best: ${Math.max(scoreRef.current, bestRef.current)}`, W / 2, H / 2 + 16);
      ctx.fillStyle = "#fff";
      ctx.font = "18px sans-serif";
      ctx.fillText("Tap / Press Space to Restart", W / 2, H / 2 + 54);
    }
  };

  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (lastPipeRef.current === 0) lastPipeRef.current = timestamp;

    if (timestamp - lastPipeRef.current > PIPE_INTERVAL) {
      const topH = 80 + Math.random() * (H - PIPE_GAP - 160);
      pipesRef.current.push({ x: W, topH, passed: false });
      lastPipeRef.current = timestamp;
    }

    birdRef.current.vy += GRAVITY;
    birdRef.current.y += birdRef.current.vy;

    pipesRef.current = pipesRef.current
      .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
      .filter((p) => p.x > -PIPE_WIDTH);

    pipesRef.current.forEach((p) => {
      if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
        p.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playSound("score");
      }
    });

    const bird = birdRef.current;
    const birdTop = bird.y - BIRD_SIZE / 2;
    const birdBot = bird.y + BIRD_SIZE / 2;
    const birdL = BIRD_X - BIRD_SIZE / 2;
    const birdR = BIRD_X + BIRD_SIZE / 2;

    const hit =
      birdTop <= 0 ||
      birdBot >= H - 40 ||
      pipesRef.current.some((p) => {
        const pipeL = p.x;
        const pipeR = p.x + PIPE_WIDTH;
        const inX = birdR > pipeL + 4 && birdL < pipeR - 4;
        const inY = birdTop < p.topH || birdBot > p.topH + PIPE_GAP;
        return inX && inY;
      });

    if (hit) {
      phaseRef.current = "dead";
      setPhase("dead");
      playSound("hit");
      setTimeout(() => playSound("die"), 200);
      if (scoreRef.current > bestRef.current) {
        bestRef.current = scoreRef.current;
        setBest(scoreRef.current);
        try {
          window.localStorage.setItem("flappy-best", String(scoreRef.current));
        } catch {
          /* ignore */
        }
      }
      draw(ctx);
      return;
    }

    draw(ctx);
    animRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    birdRef.current = { y: H / 2, vy: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    lastPipeRef.current = 0;
    phaseRef.current = "playing";
    setScore(0);
    setPhase("playing");
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(gameLoop);
  };

  const flap = () => {
    if (phaseRef.current === "playing") {
      birdRef.current.vy = FLAP_FORCE;
      playSound("flap");
    } else {
      startGame();
      playSound("flap");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawOverlay(ctx, "idle");
  }, []);

  useEffect(() => {
    if (phase !== "dead") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawOverlay(ctx, "dead");
  }, [phase]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <ToolPageShell
      title="Flappy Bird"
      description="Tap to flap and fly through the pipes! How far can you go?"
    >
      <div className="flex flex-col items-center gap-4">
        {best > 0 && (
          <p className="text-yellow-400 font-bold text-sm">🏆 Best: {best}</p>
        )}

        {phase === "playing" && (
          <p className="text-muted-foreground text-sm">Score: {score}</p>
        )}

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={flap}
          onTouchStart={(e) => {
            e.preventDefault();
            flap();
          }}
          className="rounded-2xl border border-border cursor-pointer touch-none"
          style={{ maxWidth: "100%", maxHeight: "70vh" }}
        />

        <p className="text-muted-foreground text-xs">
          Tap canvas or press Space to flap
        </p>
      </div>

      <HowToUse
        steps={[
          "Tap the canvas or press Space to start the game.",
          "Keep tapping to flap the bird and fly between the pipes.",
          "Every pipe you pass scores a point — don't hit the pipes or the ground!",
        ]}
      />

      <RelatedTools currentSlug="flappy-bird" />

      <ToolSeoContent
        title="Flappy Bird — Free Online Flappy Bird Game"
        description="Play Flappy Bird online for free. Tap to flap through pipes, beat your high score, and challenge your reflexes. No download needed!"
        body={[
          "Flappy Bird is the iconic one-tap arcade game that took the world by storm. Guide a tiny yellow bird through an endless series of green pipes by tapping the screen or pressing Space to flap. Each pipe you clear earns you a point, and your personal best is saved automatically in your browser so you can keep chasing a new high score every session.",
          "This free online version runs entirely in your browser — no downloads, no installs, no signup. It works on desktop with the spacebar and on mobile with a simple tap. The physics are tuned to match the original: gravity pulls the bird down, every flap gives it a quick lift, and a single touch on a pipe or the ground ends the run. Simple to learn, brutally hard to master.",
        ]}
        faqs={[
          {
            question: "How do I control the bird?",
            answer:
              "Tap the canvas (on mobile) or click it with your mouse (on desktop) to flap. You can also press the Space key on your keyboard. Each flap gives the bird an instant upward boost; gravity pulls it down between flaps.",
          },
          {
            question: "How does scoring work?",
            answer:
              "You earn one point every time the bird successfully passes through a pair of pipes. Your current score is shown at the top of the canvas during play, and your best score is saved locally so it persists between sessions.",
          },
          {
            question: "Is there a keyboard shortcut?",
            answer:
              "Yes — press Space at any time to flap, start a new game, or restart after a game over. The keyboard control works exactly like tapping the canvas.",
          },
          {
            question: "Does it work on mobile and touch screens?",
            answer:
              "Absolutely. The canvas responds to touch events directly, so you can play on any phone or tablet. The game prevents accidental scrolling while you tap, giving you a smooth, native-feeling experience.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
