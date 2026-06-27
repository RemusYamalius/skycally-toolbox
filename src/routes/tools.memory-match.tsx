import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Play } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/memory-match")({
  head: () => buildToolMeta(toolBySlug("memory-match", tools)),
  component: MemoryMatchPage,
});

const EMOJI_SETS = {
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐸", "🐙", "🦋", "🐬"],
  food: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🥝", "🍒", "🥥", "🍍", "🥭", "🍌", "🍉", "🍈", "🥑", "🍆"],
  sports: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "🎯", "🏹", "🛹", "🛷", "🎿"],
} as const;

type Theme = keyof typeof EMOJI_SETS;
type Difficulty = "easy" | "medium" | "hard";
type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

const CARD_COUNT: Record<Difficulty, number> = { easy: 8, medium: 16, hard: 24 };

const DEFAULT_BEST: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

function MemoryMatchPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [theme, setTheme] = useState<Theme>("animals");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<Record<Difficulty, number>>(DEFAULT_BEST);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("memory-best");
      if (raw) setBest({ ...DEFAULT_BEST, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const initBoard = useCallback(() => {
    const count = CARD_COUNT[difficulty] / 2;
    const pool = EMOJI_SETS[theme].slice(0, count);
    const pairs = [...pool, ...pool]
      .map((emoji) => ({ emoji, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .map((c, i) => ({ id: i, emoji: c.emoji, flipped: false, matched: false }));
    setCards(pairs);
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setWon(false);
    setRunning(true);
  }, [difficulty, theme]);

  const handleFlip = useCallback(
    (idx: number) => {
      if (flipped.length === 2) return;
      const card = cards[idx];
      if (!card || card.flipped || card.matched) return;

      const newFlipped = [...flipped, idx];
      setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: true } : c)));
      setFlipped(newFlipped);
      playSound("flip");

      if (newFlipped.length === 2) {
        const nextMoves = moves + 1;
        setMoves(nextMoves);
        const [a, b] = newFlipped;
        const match = cards[a].emoji === cards[b].emoji;

        if (match) {
          setTimeout(() => {
            setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true, flipped: true } : c)));
            setFlipped([]);
            setMatches((m) => {
              const newM = m + 1;
              if (newM === CARD_COUNT[difficulty] / 2) {
                setWon(true);
                setRunning(false);
                playChord(["match", "success"]);
                setBest((prev) => {
                  const cur = prev[difficulty];
                  const next = cur === 0 ? nextMoves : Math.min(cur, nextMoves);
                  const updated = { ...prev, [difficulty]: next };
                  if (typeof window !== "undefined") {
                    try {
                      window.localStorage.setItem("memory-best", JSON.stringify(updated));
                    } catch {
                      /* ignore */
                    }
                  }
                  return updated;
                });
              } else {
                playSound("match");
              }
              return newM;
            });
          }, 400);
        } else {
          setTimeout(() => {
            setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
            setFlipped([]);
            playSound("noMatch");
          }, 800);
        }
      }
    },
    [cards, flipped, moves, difficulty],
  );

  const exitToSetup = useCallback(() => {
    setCards([]);
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setRunning(false);
    setWon(false);
  }, []);

  const totalPairs = CARD_COUNT[difficulty] / 2;
  const inGame = cards.length > 0;

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Memory Match"
      description="Flip cards and find matching pairs. Choose a theme and difficulty to train your memory."
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {!inGame ? (
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(EMOJI_SETS) as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
                      theme === t
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-secondary",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
                      difficulty === d
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-secondary",
                    )}
                  >
                    {d}
                    <span className="block text-xs text-muted-foreground">{CARD_COUNT[d] / 2} pairs</span>
                  </button>
                ))}
              </div>
            </div>

            {mounted && best[difficulty] > 0 && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                🏆 Best on {difficulty}: <span className="font-bold text-foreground">{best[difficulty]} moves</span>
              </p>
            )}

            <Button onClick={initBoard} className="w-full gap-2" size="lg">
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-5 mb-5 text-sm">
              <span className="px-3 py-1 rounded-lg bg-muted">⏱ {time}s</span>
              <span className="px-3 py-1 rounded-lg bg-muted">🔄 {moves} moves</span>
              <span className="px-3 py-1 rounded-lg bg-muted">
                ✅ {matches}/{totalPairs}
              </span>
              {mounted && best[difficulty] > 0 && (
                <span className="px-3 py-1 rounded-lg bg-muted">🏆 {best[difficulty]}</span>
              )}
            </div>

            <div
              className={cn(
                "grid gap-2 w-full mx-auto",
                difficulty === "easy" && "grid-cols-4 max-w-xs",
                difficulty === "medium" && "grid-cols-4 max-w-sm",
                difficulty === "hard" && "grid-cols-6 max-w-md",
              )}
            >
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => handleFlip(i)}
                  disabled={card.flipped || card.matched || won}
                  className={cn(
                    "aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 border-2",
                    card.matched
                      ? "bg-green-500/20 border-green-500/40 scale-95"
                      : card.flipped
                        ? "bg-primary/20 border-primary/50"
                        : "bg-card border-border hover:border-primary/40 hover:bg-secondary/50 cursor-pointer",
                  )}
                  aria-label={card.flipped || card.matched ? `Card ${card.emoji}` : "Hidden card"}
                >
                  {card.flipped || card.matched ? card.emoji : ""}
                </button>
              ))}
            </div>

            {won && (
              <div className="mt-6 text-center rounded-2xl border-2 border-green-500/40 bg-green-500/10 p-5">
                <p className="text-2xl font-black text-foreground mb-1">🎉 You won!</p>
                <p className="text-sm text-muted-foreground">
                  Solved in <span className="font-bold text-foreground">{moves} moves</span> and{" "}
                  <span className="font-bold text-foreground">{time}s</span>.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Button onClick={initBoard} className="gap-2">
                <RefreshCw className="w-4 h-4" /> New Game
              </Button>
              <Button onClick={exitToSetup} variant="outline">
                Change Settings
              </Button>
            </div>
          </>
        )}
      </div>

      <AdZone id="memory-match-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose a theme and difficulty, then hit Start.",
          "Flip two cards to find matching pairs.",
          "Match all pairs in as few moves as possible to set a record!",
        ]}
      />

      <ToolSeoContent
        title="Free Memory Match Game Online — Flip Cards & Find Pairs"
        description="Play the classic Memory Match card game free online. Flip cards to find matching pairs. Multiple grid sizes and difficulty levels. No signup required."
        body={[
          "Skycally's Memory Match presents a grid of face-down cards. Click any card to flip it over, then click another to try to find its match. If the two cards match, they stay face up. If not, they flip back after a brief pause. Flip all pairs to complete the puzzle — in as few moves and as little time as possible.",
          "Memory Match (also called Concentration or Pairs) is one of the most widely played card games in the world, appearing in toy stores as a physical card game for over a century. The digital version preserves the core challenge: remembering the position of cards you've already seen to make better guesses on subsequent turns.",
          "Multiple grid sizes let you control the difficulty: a 4×4 grid (8 pairs) is accessible for beginners and children, while larger grids offer a meaningful challenge for adults. The move counter and timer track your performance so you can try to beat your best run — fewer moves and faster times indicate sharper spatial memory.",
          "Memory games are well-supported by cognitive research as a form of working memory training. Regularly playing concentration-style games exercises the hippocampus — the brain region responsible for short-term memory — and can improve recall speed in daily life. It's one of the few game types that is simultaneously entertaining and genuinely beneficial for brain health.",
        ]}
        faqs={[
          {
            question: "How do I play Memory Match?",
            answer:
              "Click any face-down card to flip it. Then click another card to try to find its pair. Matching pairs stay face up. Non-matching pairs flip back after a moment. Flip all pairs to win.",
          },
          {
            question: "How many cards are in the grid?",
            answer:
              "Grid size varies by difficulty. A 4×4 grid has 16 cards (8 pairs). Larger grids have more pairs and greater difficulty.",
          },
          {
            question: "Is there a timer?",
            answer: "Yes. A timer tracks how long each game takes. Try to beat your best time on repeated plays.",
          },
          {
            question: "Does the game track my moves?",
            answer: "Yes. A move counter shows how many pairs you've attempted. Fewer moves indicate sharper memory.",
          },
          {
            question: "Are the cards shuffled each game?",
            answer:
              "Yes. Cards are randomly shuffled at the start of every new game, so the layout is always different.",
          },
          {
            question: "What age group is this suitable for?",
            answer:
              "Memory Match is suitable for all ages — from young children learning to concentrate to adults looking for a brain training exercise. Smaller grids work well for children.",
          },
          {
            question: "Is there a high score?",
            answer: "Your best score (fewest moves or fastest time) may be tracked locally for the session.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. The card grid is touch-friendly and responsive on smartphones and tablets.",
          },
        ]}
      />

      <RelatedTools currentSlug="memory-match" />
    </ToolPageShell>
  );
}
