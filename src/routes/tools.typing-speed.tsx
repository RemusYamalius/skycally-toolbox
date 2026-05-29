import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/typing-speed")({
  head: () => buildToolMeta(toolBySlug("typing-speed", tools)),
  component: TypingSpeedPage,
});

const QUOTE_BANK: Record<string, string[]> = {
  General: [
    "The quick brown fox jumps over the lazy dog near the river bank.",
    "Practice makes perfect and every expert was once a beginner.",
    "Success is not final failure is not fatal it is the courage to continue that counts.",
    "The only way to do great work is to love what you do every single day.",
    "In the middle of every difficulty lies opportunity waiting to be discovered.",
    "Life is what happens when you are busy making other plans for the future.",
  ],
  Technology: [
    "A computer is a bicycle for the mind and software is what makes it fly.",
    "The internet is the world's largest library except all the books are on the floor.",
    "Any sufficiently advanced technology is indistinguishable from magic to the untrained eye.",
    "Software is eating the world one application at a time and AI is accelerating it.",
    "The best error message is the one that never shows up in production code.",
    "First solve the problem then write the code not the other way around.",
  ],
  Motivational: [
    "Believe you can and you are already halfway there to achieving your goals.",
    "It always seems impossible until it is done and then it seems obvious in hindsight.",
    "The secret of getting ahead is getting started with whatever you have right now.",
    "Do not watch the clock do what it does keep going no matter what happens.",
    "You are never too old to set another goal or to dream a new dream today.",
    "The harder you work for something the greater you will feel when you achieve it.",
  ],
  Science: [
    "The universe is under no obligation to make sense to you but it rewards curiosity.",
    "Science is not only compatible with spirituality it is a profound source of wonder.",
    "The good thing about science is that it is true whether or not you believe it.",
    "Research is to see what everybody else has seen and think what nobody else has thought.",
    "In science the credit goes to the man who convinces the world not to the first discoverer.",
    "Nothing in life is to be feared it is only to be understood through careful observation.",
  ],
};

type Difficulty = "easy" | "medium" | "hard";

const CONFIG: Record<Difficulty, { duration: number; label: string }> = {
  easy: { duration: 60, label: "60s" },
  medium: { duration: 30, label: "30s" },
  hard: { duration: 15, label: "15s" },
};

const CATEGORIES = Object.keys(QUOTE_BANK);
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface Result {
  wpm: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  duration: number;
}

function TypingSpeedPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<string>("General");
  const [quote, setQuote] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [started, setStarted] = useState<boolean>(false);
  const [result, setResult] = useState<Result | null>(null);
  const [best, setBest] = useState<Record<Difficulty, number>>(() => {
    if (typeof window === "undefined") return { easy: 0, medium: 0, hard: 0 };
    try {
      return JSON.parse(localStorage.getItem("typing-best-wpm") || '{"easy":0,"medium":0,"hard":0}');
    } catch {
      return { easy: 0, medium: 0, hard: 0 };
    }
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startGame = () => {
    const quotes = QUOTE_BANK[category];
    const selected = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(selected);
    setInput("");
    setTimeLeft(CONFIG[difficulty].duration);
    setStarted(false);
    setResult(null);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishGame = () => {
    const words = quote.trim().split(/\s+/);
    const typedWords = input.trim().split(/\s+/).filter(Boolean);
    const duration = CONFIG[difficulty].duration;

    let correct = 0;
    let incorrect = 0;
    typedWords.forEach((w, i) => {
      if (words[i] === w) correct++;
      else incorrect++;
    });

    const wpm = Math.round((correct / duration) * 60);
    const accuracy = typedWords.length > 0 ? Math.round((correct / typedWords.length) * 100) : 0;

    const res: Result = { wpm, accuracy, correct, incorrect, duration };
    setResult(res);
    setPhase("done");

    if (wpm > (best[difficulty] || 0)) {
      const upd = { ...best, [difficulty]: wpm };
      setBest(upd);
      try {
        localStorage.setItem("typing-best-wpm", JSON.stringify(upd));
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    if (phase !== "playing" || !started) return;
    if (timeLeft <= 0) {
      finishGame();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, started, timeLeft]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!started) setStarted(true);
    if (timeLeft <= 0) return;
    const val = e.target.value;
    setInput(val);
    if (val === quote) {
      setTimeout(() => finishGame(), 0);
    }
  };

  const renderQuote = () => {
    return quote.split("").map((char, i) => {
      let cls = "text-muted-foreground";
      if (i < input.length) {
        cls = input[i] === char ? "text-green-400" : "text-red-400 bg-red-500/20";
      }
      if (i === input.length) cls += " border-l-2 border-primary animate-pulse";
      return (
        <span key={i} className={cls}>
          {char}
        </span>
      );
    });
  };

  const progress = quote.length > 0 ? Math.min((input.length / quote.length) * 100, 100) : 0;

  const liveWpm = useMemo(() => {
    const elapsed = CONFIG[difficulty].duration - timeLeft;
    if (!started || elapsed === 0) return 0;
    const typedWords = input.trim().split(/\s+/).filter(Boolean).length;
    return Math.round((typedWords / elapsed) * 60);
  }, [input, timeLeft, started, difficulty]);

  return (
    <ToolPageShell
      title="Typing Speed Test"
      description="Test your typing speed and accuracy. Find out how many words per minute you can type!"
    >
      <div className="max-w-2xl mx-auto">
        {phase === "setup" && (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border font-medium text-sm transition",
                      category === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-secondary",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border font-medium text-sm capitalize transition",
                      difficulty === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-secondary",
                    )}
                  >
                    {d} <span className="opacity-70">({CONFIG[d].label})</span>
                  </button>
                ))}
              </div>
            </div>

            {best[difficulty] > 0 && (
              <p className="text-sm text-yellow-400">🏆 Best on {difficulty}: {best[difficulty]} WPM</p>
            )}

            <Button onClick={startGame} className="w-full" size="lg">
              Start Test
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className={cn("font-black text-lg text-foreground", timeLeft <= 5 && "text-red-400 animate-pulse")}>
                ⏱ {timeLeft}s
              </span>
              <span className="text-muted-foreground">~{liveWpm} WPM</span>
              {best[difficulty] > 0 ? (
                <span className="text-yellow-400">🏆 {best[difficulty]} WPM</span>
              ) : (
                <span className="text-muted-foreground opacity-50">—</span>
              )}
            </div>

            <div className="w-full h-1.5 bg-muted rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="font-mono text-base leading-8 tracking-wide mb-4 p-4 bg-muted/30 rounded-xl border border-border min-h-[80px] select-none">
              {renderQuote()}
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              disabled={timeLeft <= 0}
              placeholder={started ? "" : "Start typing to begin the timer..."}
              className="w-full resize-none rounded-xl border border-border bg-card text-foreground p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              rows={3}
            />

            <div className="flex justify-end mt-3">
              <button
                onClick={() => setPhase("setup")}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
              <p className="text-5xl mb-3">⌨️</p>
              <p className="text-3xl font-black text-foreground mb-1">
                {result.wpm} <span className="text-primary">WPM</span>
              </p>
              <p className="text-muted-foreground text-sm mb-4">Accuracy: {result.accuracy}%</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                  <p className="text-2xl font-black text-green-400">{result.correct}</p>
                  <p className="text-xs text-muted-foreground">Correct words</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <p className="text-2xl font-black text-red-400">{result.incorrect}</p>
                  <p className="text-xs text-muted-foreground">Wrong words</p>
                </div>
              </div>

              {result.wpm === best[difficulty] && best[difficulty] > 0 && (
                <p className="text-yellow-400 font-bold mb-3">🏆 New Personal Best!</p>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setPhase("setup")}
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-secondary transition"
                >
                  Change Settings
                </button>
              </div>
            </div>
          </div>
        )}

        <HowToUse
          steps={[
            "Choose a category and difficulty, then hit Start.",
            "Start typing the displayed text — the timer begins on your first keystroke.",
            "Finish as many words as you can before time runs out to maximize your WPM score!",
          ]}
        />

        <RelatedTools currentSlug="typing-speed" />

        <ToolSeoContent
          title="Typing Speed Test — Free Online WPM Typing Test"
          description="Play Typing Speed Test online for free. Get your WPM score, accuracy, and personal best. 4 categories, 3 difficulty levels, instant results."
          body={[
            "Our free online Typing Speed Test measures how many words per minute (WPM) you can type accurately. Pick one of four quote categories — General, Technology, Motivational, or Science — and choose a difficulty that controls your time limit: 60 seconds (Easy), 30 seconds (Medium), or 15 seconds (Hard). The timer only starts when you press your first key, so you can read the quote and get ready without losing time.",
            "As you type, every character is highlighted in real time: green for correct, red for wrong, with a pulsing cursor showing your current position. You'll see live WPM and a progress bar while typing, then a full report at the end with accuracy, correct and incorrect word counts, and a personal-best tracker stored on your device. No signup, no uploads — everything runs in your browser.",
          ]}
          faqs={[
            {
              question: "How is WPM calculated?",
              answer:
                "WPM (words per minute) is calculated as the number of correctly typed words divided by the test duration in seconds, multiplied by 60. Only words that exactly match the quote count toward your WPM score.",
            },
            {
              question: "When does the timer start?",
              answer:
                "The timer doesn't start until you press your first key. Take your time to read the quote, then begin typing whenever you're ready — the countdown begins on your first keystroke.",
            },
            {
              question: "What categories are available?",
              answer:
                "There are four quote categories: General (everyday quotes), Technology (programming and tech wisdom), Motivational (inspirational sayings), and Science (curiosity-driven thinking). A random quote is picked from your chosen category each round.",
            },
            {
              question: "How can I improve my typing speed?",
              answer:
                "Practice daily, keep your fingers on the home row, avoid looking at the keyboard, and focus on accuracy before speed. Try the Easy 60-second mode first to build rhythm, then move to Medium and Hard as your accuracy stays above 95%.",
            },
          ]}
        />
      </div>
    </ToolPageShell>
  );
}
