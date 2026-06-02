import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { playSound } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

const PATH = "/tools/whack-a-mole";
const TITLE = "Whack-a-Mole — Free Online Game, No Download";
const DESCRIPTION =
  "Play Whack-a-Mole free in your browser. Tap the moles before they disappear! No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/whack-a-mole")({
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
            name: "Whack-a-Mole",
            description:
              "Free browser-based Whack-a-Mole game. Tap moles before they disappear and beat your high score. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Arcade",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: WhackAMolePage,
});

type Difficulty = "easy" | "medium" | "hard";
const DURATION: Record<Difficulty, number> = { easy: 30, medium: 20, hard: 15 };
const SPAWN_MS: Record<Difficulty, number> = { easy: 900, medium: 650, hard: 450 };
const VISIBLE_MS: Record<Difficulty, number> = { easy: 850, medium: 600, hard: 420 };
const LABEL: Record<Difficulty, string> = { easy: "Easy 30s", medium: "Medium 20s", hard: "Hard 15s" };

const HOLES = 9;

function WhackAMolePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [active, setActive] = useState<number>(-1);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION.medium);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef<number>(-1);
  const whackedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = sessionStorage.getItem("whack-a-mole-high");
    if (v) setHighScore(parseInt(v, 10) || 0);
  }, []);

  const clearTimers = useCallback(() => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    spawnRef.current = null;
    hideRef.current = null;
    tickRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setRunning(false);
  }, [clearTimers]);

  const endGame = useCallback(
    (finalScore: number) => {
      stop();
      setActive(-1);
      activeRef.current = -1;
      setGameOver(true);
      if (typeof window !== "undefined" && finalScore > highScore) {
        setHighScore(finalScore);
        sessionStorage.setItem("whack-a-mole-high", String(finalScore));
      }
      playSound("win");
    },
    [highScore, stop],
  );

  const reset = useCallback(() => {
    clearTimers();
    setActive(-1);
    activeRef.current = -1;
    setScore(0);
    setMisses(0);
    setSpawned(0);
    setTimeLeft(DURATION[difficulty]);
    setRunning(false);
    setGameOver(false);
  }, [clearTimers, difficulty]);

  useEffect(() => {
    reset();
    return clearTimers;
  }, [difficulty, reset, clearTimers]);

  const spawnMole = useCallback(() => {
    // If previous mole still visible and not whacked -> miss
    if (activeRef.current !== -1 && !whackedRef.current) {
      setMisses((m) => m + 1);
    }
    let next = Math.floor(Math.random() * HOLES);
    if (next === activeRef.current) next = (next + 1) % HOLES;
    activeRef.current = next;
    whackedRef.current = false;
    setActive(next);
    setSpawned((s) => s + 1);

    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      if (!whackedRef.current && activeRef.current === next) {
        setMisses((m) => m + 1);
        activeRef.current = -1;
        setActive(-1);
      }
    }, VISIBLE_MS[difficulty]);
  }, [difficulty]);

  const start = useCallback(() => {
    reset();
    setRunning(true);
    setGameOver(false);
    setTimeLeft(DURATION[difficulty]);

    // Tick down
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // end on next frame using latest score
          setScore((s) => {
            endGame(s);
            return s;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // First mole immediately, then on interval
    spawnMole();
    spawnRef.current = setInterval(spawnMole, SPAWN_MS[difficulty]);
  }, [difficulty, endGame, reset, spawnMole]);

  const whack = useCallback(
    (idx: number) => {
      if (!running || gameOver) return;
      if (idx !== activeRef.current || whackedRef.current) return;
      whackedRef.current = true;
      setScore((s) => s + 1);
      setActive(-1);
      activeRef.current = -1;
      playSound("click");
    },
    [gameOver, running],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  const accuracy = spawned > 0 ? Math.round((score / spawned) * 100) : 0;

  return (
    <ToolPageShell
      title="Whack-a-Mole"
      description="Tap the moles before they disappear! How high can you score?"
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DURATION) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                disabled={running}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50",
                  difficulty === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {LABEL[d]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {!running ? (
              <Button onClick={start} size="sm" className="gap-1.5">
                <Play className="w-4 h-4" /> {gameOver ? "Play Again" : "Start"}
              </Button>
            ) : (
              <Button onClick={reset} size="sm" variant="outline" className="gap-1.5">
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-3 mb-5">
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Score</p>
            <p className="text-2xl font-black text-foreground">{score}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Time</p>
            <p className="text-2xl font-black text-foreground">{timeLeft}s</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Misses</p>
            <p className="text-2xl font-black text-foreground">{misses}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[90px]">
            <p className="text-xs text-muted-foreground font-bold">Best</p>
            <p className="text-2xl font-black text-foreground">{highScore}</p>
          </div>
        </div>

        {/* Board */}
        <div className="w-full max-w-md mx-auto relative">
          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-secondary/40 border-2 border-border select-none">
            {Array.from({ length: HOLES }).map((_, idx) => {
              const isUp = active === idx;
              return (
                <button
                  key={idx}
                  onClick={() => whack(idx)}
                  disabled={!running}
                  aria-label={isUp ? "Whack mole" : "Empty hole"}
                  className={cn(
                    "aspect-square rounded-full flex items-center justify-center text-4xl sm:text-5xl transition-transform",
                    "bg-gradient-to-br from-secondary to-background border-2 border-border",
                    isUp && "cursor-pointer active:scale-95",
                    !isUp && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "transition-all duration-150",
                      isUp ? "scale-100 opacity-100" : "scale-0 opacity-0",
                    )}
                  >
                    🐹
                  </span>
                </button>
              );
            })}
          </div>

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm p-4">
              <p className="text-5xl mb-2">🏆</p>
              <p className="text-white font-black text-2xl mb-1">Game Over!</p>
              <p className="text-white/80 text-sm">
                Score: <span className="font-bold">{score}</span>
              </p>
              <p className="text-white/80 text-sm">
                Accuracy: <span className="font-bold">{accuracy}%</span>
              </p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-300 text-xs font-bold mt-1">🎉 New high score!</p>
              )}
              <Button onClick={start} className="gap-1.5 mt-4">
                <Play className="w-4 h-4" /> Play Again
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Tap a mole the moment it appears. Each missed mole counts against your accuracy.
        </p>
      </div>

      <HowToUse
        steps={[
          "Pick a difficulty — Easy gives you 30 seconds, Hard only 15.",
          "Press Start, then tap or click each mole the instant it pops up.",
          "Beat your high score by maximizing hits and minimizing misses.",
        ]}
      />

      <ToolSeoContent
        title="Whack-a-Mole — Free Online Reaction Game"
        description="Play Whack-a-Mole free in your browser. Tap the moles before they disappear and challenge your reaction time across three difficulty levels."
        body={[
          "Whack-a-Mole is the classic arcade reaction game brought to your browser — no downloads, no accounts, and no ads in the way. Moles pop up at random from a 3×3 grid of holes, and your job is to tap each one before it ducks back down. Three difficulty levels adjust both the round length and how fast the moles appear: Easy gives you a relaxed 30 seconds with slower moles, Medium ramps things up for 20 seconds, and Hard pushes your reflexes to the limit with the fastest moles in just 15 seconds.",
          "The game tracks your score, misses, and live accuracy percentage, and your best score is saved for the rest of your session so you can keep chasing a new personal best. It's a perfect quick-break game on desktop or mobile — touch, mouse, and trackpad all work the same way. Because everything runs locally in your browser, your scores stay private and the game keeps working even offline.",
        ]}
        faqs={[
          {
            question: "How do I play Whack-a-Mole?",
            answer:
              "Press Start, then click or tap each mole the moment it pops up from a hole. Each successful hit earns one point. If a mole disappears before you tap it, it counts as a miss.",
          },
          {
            question: "What's the difference between difficulty levels?",
            answer:
              "Easy lasts 30 seconds with slower moles. Medium is 20 seconds with faster moles. Hard is only 15 seconds and the moles appear and vanish very quickly — best for testing your reaction speed.",
          },
          {
            question: "Is my high score saved?",
            answer:
              "Yes. Your best score is saved in your browser session so you can try to beat it across multiple rounds. It clears when you close the tab.",
          },
          {
            question: "Does it work on mobile?",
            answer:
              "Yes. The game is fully touch-friendly and runs in any modern mobile browser — no install required.",
          },
        ]}
      />

      <RelatedTools currentSlug="whack-a-mole" />
    </ToolPageShell>
  );
}
