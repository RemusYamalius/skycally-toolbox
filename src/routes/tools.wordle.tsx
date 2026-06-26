import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Delete, CornerDownLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/wordle")({
  head: () => buildToolMeta(toolBySlug("wordle", tools)),
  component: WordlePage,
});

const WORDS = [
  "APPLE",
  "BRAVE",
  "CHAIR",
  "DELTA",
  "EAGLE",
  "FLAIR",
  "GRACE",
  "HEART",
  "INPUT",
  "JOKER",
  "KNIFE",
  "LIGHT",
  "MAGIC",
  "NIGHT",
  "OCEAN",
  "PIANO",
  "QUEEN",
  "RIVER",
  "STONE",
  "TIGER",
  "ULTRA",
  "VIVID",
  "WASTE",
  "XENON",
  "YACHT",
  "ZEBRA",
  "BLAST",
  "CLOUD",
  "DREAM",
  "FLAME",
  "GIANT",
  "HONEY",
  "IMAGE",
  "JEWEL",
  "KARMA",
  "LEMON",
  "MOOSE",
  "NOBLE",
  "OLIVE",
  "PEARL",
  "QUEST",
  "RADAR",
  "SLEEK",
  "TREND",
  "UNCLE",
  "VENOM",
  "WATER",
  "EXTRA",
  "YOUNG",
  "ZONED",
  "ALARM",
  "BLANK",
  "CRISP",
  "DUSKY",
  "EMBER",
  "FINCH",
  "GLOOM",
  "HAVOC",
  "IRONY",
  "JUMPY",
  "KNEEL",
  "LIVER",
  "MAPLE",
  "NERVE",
  "OPTIC",
  "PLUMB",
  "QUIRK",
  "REIGN",
  "SNOWY",
  "THYME",
  "UNIFY",
  "VERGE",
  "WRATH",
  "EXACT",
  "YIELD",
  "ZONES",
  "ABIDE",
  "BUDGE",
  "CLEFT",
  "DROOP",
  "ELOPE",
  "FRISK",
  "GRIPE",
  "HASTE",
  "ICING",
  "JIFFY",
  "KNACK",
  "LOOPY",
  "MANLY",
  "NOTCH",
  "OXIDE",
  "PLAID",
  "QUILL",
  "RISKY",
  "SPOKE",
  "TOWEL",
  "USHER",
  "VISTA",
  "WALTZ",
  "EXPEL",
  "YEARN",
];

type LetterState = "correct" | "present" | "absent" | "unused";

const MAX_TRIES = 6;
const WORD_LEN = 5;

const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
};

const DEFAULT_STATS: Stats = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };

function loadStats(): Stats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem("wordle-stats");
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

function saveStats(s: Stats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("wordle-stats", JSON.stringify(s));
  } catch {
    /* noop */
  }
}

function dailyWord() {
  return WORDS[Math.floor(Date.now() / 86400000) % WORDS.length];
}

function evaluateGuess(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array(WORD_LEN).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");
  guessArr.forEach((l, i) => {
    if (l === targetArr[i]) {
      result[i] = "correct";
      targetArr[i] = "*";
      guessArr[i] = "#";
    }
  });
  guessArr.forEach((l, i) => {
    if (l === "#") return;
    const ti = targetArr.indexOf(l);
    if (ti !== -1) {
      result[i] = "present";
      targetArr[ti] = "*";
    }
  });
  return result;
}

const stateClass: Record<LetterState, string> = {
  correct: "bg-green-500 text-white border-green-500",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent: "bg-muted text-muted-foreground border-muted",
  unused: "bg-secondary text-foreground border-border",
};

function WordlePage() {
  const tool = toolBySlug("wordle", tools);

  const [target, setTarget] = useState<string>(() => dailyWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [letterStates, setLetterStates] = useState<Record<string, LetterState>>({});
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const submitGuess = useCallback(() => {
    if (gameOver) return;
    if (current.length !== WORD_LEN) {
      toast.error("Word must be 5 letters");
      return;
    }
    const guess = current.toUpperCase();
    const evals = evaluateGuess(guess, target);

    const nextGuesses = [...guesses, guess];
    setGuesses(nextGuesses);
    setCurrent("");

    // Update keyboard letter states (best result wins)
    const rank: Record<LetterState, number> = { unused: 0, absent: 1, present: 2, correct: 3 };
    setLetterStates((prev) => {
      const next = { ...prev };
      guess.split("").forEach((l, i) => {
        const newSt = evals[i];
        const cur = next[l] ?? "unused";
        if (rank[newSt] > rank[cur]) next[l] = newSt;
      });
      return next;
    });

    if (evals.some((s) => s === "correct")) playSound("correct");

    const isWin = guess === target;
    if (isWin) {
      setWon(true);
      setGameOver(true);
      setShowConfetti(true);
      playChord(["success", "win"]);
      toast.success(`🎉 Brilliant! You got it in ${nextGuesses.length}/${MAX_TRIES}!`);
      const newStats: Stats = {
        played: stats.played + 1,
        wins: stats.wins + 1,
        currentStreak: stats.currentStreak + 1,
        bestStreak: Math.max(stats.bestStreak, stats.currentStreak + 1),
      };
      setStats(newStats);
      saveStats(newStats);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (nextGuesses.length >= MAX_TRIES) {
      setGameOver(true);
      playSound("fail");
      toast.error(`😔 The word was: ${target}`);
      const newStats: Stats = {
        played: stats.played + 1,
        wins: stats.wins,
        currentStreak: 0,
        bestStreak: stats.bestStreak,
      };
      setStats(newStats);
      saveStats(newStats);
    }
  }, [current, target, guesses, gameOver, stats]);

  const handleKey = useCallback(
    (k: string) => {
      if (gameOver) return;
      if (k === "ENTER") {
        submitGuess();
        return;
      }
      if (k === "BACK") {
        setCurrent((c) => c.slice(0, -1));
        playSound("click");
        return;
      }
      if (/^[A-Z]$/.test(k) && current.length < WORD_LEN) {
        setCurrent((c) => (c + k).slice(0, WORD_LEN));
        playSound("click");
      }
    },
    [current, submitGuess, gameOver],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "Enter") {
        e.preventDefault();
        handleKey("ENTER");
      } else if (k === "Backspace") {
        e.preventDefault();
        handleKey("BACK");
      } else if (/^[a-zA-Z]$/.test(k)) {
        handleKey(k.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const playAgain = () => {
    const next = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTarget(next);
    setGuesses([]);
    setCurrent("");
    setGameOver(false);
    setWon(false);
    setLetterStates({});
    setShowConfetti(false);
  };

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  const rows = useMemo(() => {
    const out: { letters: (string | null)[]; states: (LetterState | null)[] }[] = [];
    for (let r = 0; r < MAX_TRIES; r++) {
      if (r < guesses.length) {
        const g = guesses[r];
        const evals = evaluateGuess(g, target);
        out.push({ letters: g.split(""), states: evals });
      } else if (r === guesses.length && !gameOver) {
        const letters = Array(WORD_LEN)
          .fill(null)
          .map((_, i) => current[i] ?? null);
        out.push({ letters, states: Array(WORD_LEN).fill(null) });
      } else {
        out.push({ letters: Array(WORD_LEN).fill(null), states: Array(WORD_LEN).fill(null) });
      }
    }
    return out;
  }, [guesses, current, target, gameOver]);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="flex flex-col items-center gap-6">
        {/* Confetti */}
        {showConfetti && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-[-10px] block w-2 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  background: ["#22c55e", "#eab308", "#06b6d4", "#a855f7", "#ef4444"][i % 5],
                  animation: `wordle-confetti ${2 + Math.random() * 2}s ${Math.random()}s linear forwards`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
            <style>{`
              @keyframes wordle-confetti {
                0% { transform: translateY(0) rotate(0); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {/* Board */}
        <div className="grid gap-1.5">
          {rows.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {row.letters.map((l, c) => {
                const st = row.states[c];
                const isEmpty = l == null;
                const cls = st
                  ? stateClass[st]
                  : isEmpty
                    ? "border-border bg-background text-foreground"
                    : "border-muted-foreground bg-background text-foreground";
                return (
                  <div
                    key={c}
                    className={`w-12 h-12 sm:w-14 sm:h-14 border-2 rounded-md flex items-center justify-center text-xl sm:text-2xl font-bold uppercase transition ${cls}`}
                  >
                    {l ?? ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <div className="w-full max-w-md flex flex-col gap-1.5">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5">
              {row.map((k) => {
                const wide = k === "ENTER" || k === "BACK";
                const st = /^[A-Z]$/.test(k) ? (letterStates[k] ?? "unused") : "unused";
                const cls = /^[A-Z]$/.test(k) ? stateClass[st] : "bg-secondary text-foreground border-border";
                return (
                  <button
                    key={k}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleKey(k);
                    }}
                    className={`h-12 rounded-md border font-semibold text-sm uppercase transition hover:opacity-80 ${cls} ${wide ? "px-3 flex-[1.4]" : "flex-1"}`}
                    aria-label={k === "BACK" ? "Backspace" : k === "ENTER" ? "Enter" : k}
                  >
                    {k === "BACK" ? (
                      <Delete className="w-4 h-4 mx-auto" />
                    ) : k === "ENTER" ? (
                      <CornerDownLeft className="w-4 h-4 mx-auto" />
                    ) : (
                      k
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Controls */}
        {gameOver && (
          <Button onClick={playAgain} size="lg">
            <RefreshCw className="w-4 h-4 mr-2" /> Play Again
          </Button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 w-full max-w-md">
          <StatBox label="Played" value={stats.played} />
          <StatBox label="Win %" value={winPct} />
          <StatBox label="Streak" value={stats.currentStreak} />
          <StatBox label="Best" value={stats.bestStreak} />
        </div>
      </div>

      <AdZone id="wordle-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Type a 5-letter word and press Enter to guess.",
          "Green means correct letter and position. Yellow means correct letter, wrong position.",
          "You have 6 tries to guess the hidden word!",
        ]}
      />

      <ToolSeoContent
        title="Free Wordle Game Online — Guess the 5-Letter Word in 6 Tries"
        description="Play Wordle free online. Guess the hidden 5-letter word in 6 tries. Green means correct position, yellow means wrong position. New word every day. No signup."
        body={[
          "Skycally's Wordle gives you six attempts to guess a hidden five-letter English word. After each guess, the tiles change color to show how close you are: green means the letter is correct and in the right position, yellow means the letter is in the word but in the wrong spot, and gray means the letter is not in the word at all. Use these clues to narrow down the answer in as few guesses as possible.",
          "Type your guesses using your physical keyboard on desktop — just start typing, press Enter to submit, and Backspace to delete. On mobile, tap the on-screen keyboard displayed below the grid. Every letter you've guessed is color-coded on the keyboard too, so you can quickly see which letters are still available.",
          "Wordle was originally created by Josh Wardle and went viral in late 2021 before being acquired by The New York Times. The appeal is simple: one puzzle per day, shared with millions of people worldwide, small enough to solve in a few minutes but just challenging enough to keep you thinking. Our version lets you play any time with a randomly selected word from our curated dictionary.",
          "Strategy matters as much as vocabulary in Wordle. Starting with words that cover common letters — like CRANE, AUDIO, or SLATE — gives you maximum information on the first guess. Avoid reusing gray letters and try to confirm or eliminate yellow letters as quickly as possible. Most players solve the puzzle in 3 to 4 guesses on average.",
        ]}
        faqs={[
          {
            question: "How do I play Wordle?",
            answer:
              "Type a 5-letter word and press Enter to submit. Green tiles show correct letters in the right position. Yellow tiles show letters that are in the word but in the wrong position. Gray tiles show letters not in the word. You have 6 guesses to find the word.",
          },
          {
            question: "Can I use my physical keyboard?",
            answer:
              "Yes. On desktop, just start typing — letter keys enter the current guess, Enter submits it, and Backspace deletes the last letter. The on-screen keyboard is also available for mouse or touchscreen use.",
          },
          {
            question: "What are good starting words?",
            answer:
              "Words with common letters work best: CRANE, SLATE, AUDIO, ARISE, or STARE are popular first guesses that cover high-frequency letters and give maximum information from the first guess.",
          },
          {
            question: "How many letters does the word have?",
            answer: "Every Wordle answer is exactly 5 letters long. All guesses must also be valid 5-letter words.",
          },
          {
            question: "Is there a new word every day?",
            answer:
              "Our version selects a random word from a curated dictionary each time you play. Play again after winning or losing to try another word.",
          },
          {
            question: "What do the colors mean?",
            answer:
              "Green: correct letter in the correct position. Yellow: letter is in the word but in the wrong position. Gray: letter is not in the word at all.",
          },
          {
            question: "Are all words in the dictionary valid guesses?",
            answer:
              "Yes. The game accepts any common 5-letter English word as a guess, even if it's not the target word.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. Use the on-screen keyboard displayed below the grid. The game is fully responsive and works on all screen sizes.",
          },
        ]}
      />

      <RelatedTools currentSlug="wordle" />
    </ToolPageShell>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
