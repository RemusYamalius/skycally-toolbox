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
  const lastSoundRef = useRef<number>(0);

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
    playChord(["finish", "success"]);

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
    if (timeLeft <= 5) playSound("tick");
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, started, timeLeft]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!started) setStarted(true);
    if (timeLeft <= 0) return;
    const val = e.target.value;
    const prevLen = input.length;
    if (val.length > prevLen) {
      const i = val.length - 1;
      const now = Date.now();
      if (val[i] === quote[i]) {
        if (now - lastSoundRef.current >= 80) {
          playSound("correct");
          lastSoundRef.current = now;
        }
      } else {
        if (now - lastSoundRef.current >= 80) {
          playSound("wrong");
          lastSoundRef.current = now;
        }
      }
    }
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

  const liveWpm = useMemo(() => {
    if (!started || !quote) return 0;
    const elapsed = CONFIG[difficulty].duration - timeLeft;
    if (elapsed <= 0) return 0;
    const typedWords = input.trim().split(/\s+/).filter(Boolean);
    const words = quote.trim().split(/\s+/);
    const correct = typedWords.filter((w, i) => words[i] === w).length;
    return Math.round((correct / elapsed) * 60);
  }, [input, timeLeft, started, difficulty, quote]);

  const progress = ((CONFIG[difficulty].duration - timeLeft) / CONFIG[difficulty].duration) * 100;

  return (
    <ToolPageShell
      title="Typing Speed Test"
      description="Test your typing speed in WPM. Choose a category and difficulty, then type as fast as you can."
    >
      <div className="space-y-6">
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
              <p className="text-sm text-yellow-400">
                🏆 Best on {difficulty}: {best[difficulty]} WPM
              </p>
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
            "Choose a quote category (General, Technology, Motivational, or Science) and a difficulty level (60s, 30s, or 15s).",
            "Click Start Test and begin typing the displayed text — the timer starts on your first keystroke.",
            "Type as accurately and quickly as possible. Green means correct, red means wrong. Your WPM and personal best are saved automatically.",
          ]}
        />

        <ToolSeoContent
          title="Free Typing Speed Test — WPM Test Online, No Signup"
          description="Test your typing speed in words per minute (WPM) with real-time feedback. 4 categories, 3 difficulty levels, personal best tracker. Free, instant, no signup required."
          body={[
            "Skycally's Typing Speed Test measures how many words per minute (WPM) you can type accurately. Choose from four quote categories — General, Technology, Motivational, or Science — and set your difficulty: 60 seconds for beginners, 30 seconds for intermediate typists, and 15 seconds for advanced users. The timer only starts when you press your first key, giving you time to read the text before beginning.",
            "Real-time character highlighting shows your progress as you type: green for correct characters, red for mistakes, with a pulsing cursor marking your position. A live WPM counter updates every second alongside a countdown timer and progress bar. At the end, you receive a full breakdown: WPM score, accuracy percentage, correct word count, and incorrect word count.",
            "Your personal best for each difficulty level is saved locally in your browser, so you can track your improvement over time without creating an account. The test uses a rotating bank of quotes for variety — each round presents a randomly selected text from your chosen category, keeping practice sessions fresh and engaging.",
            "The average typing speed for adults is 40 WPM. Touch typists typically reach 50–80 WPM, while professional typists and transcriptionists often exceed 100 WPM. Regular daily practice of 10–15 minutes is the most effective way to improve — focusing on accuracy first, then building speed gradually.",
          ]}
          faqs={[
            {
              question: "How is WPM calculated?",
              answer:
                "WPM (words per minute) equals the number of correctly typed words divided by the test duration in seconds, multiplied by 60. Only words that exactly match the displayed text count as correct. Partially typed or misspelled words count as incorrect and do not contribute to your WPM score.",
            },
            {
              question: "When does the timer start?",
              answer:
                "The timer starts on your first keystroke — not when you click Start. This gives you time to read the quote and position your fingers before the countdown begins. Take a moment to scan the text before you start typing.",
            },
            {
              question: "What is a good typing speed?",
              answer:
                "The average adult types 40 WPM. A speed of 50–70 WPM is considered good for general use. Touch typists typically reach 70–90 WPM. Professional typists, programmers, and transcriptionists often type at 90–120 WPM or faster. Above 120 WPM is considered elite.",
            },
            {
              question: "What categories are available?",
              answer:
                "Four categories: General (everyday quotes), Technology (programming and tech insights), Motivational (inspirational sayings), and Science (curiosity-driven thinking). A random quote is selected from your chosen category each round, so you get different text every time.",
            },
            {
              question: "How can I improve my typing speed?",
              answer:
                "Focus on accuracy before speed — aim for 95%+ accuracy at your current speed before trying to go faster. Keep your fingers on the home row (ASDF JKL;), avoid looking at the keyboard, and practice for 10–15 minutes daily. Start with Easy (60s) and move to harder difficulties as your accuracy improves.",
            },
            {
              question: "Is my score saved?",
              answer:
                "Yes. Your personal best WPM for each difficulty level (Easy, Medium, Hard) is saved locally in your browser using localStorage. It persists between sessions and is displayed during the test so you can track your progress. No account or server is involved.",
            },
            {
              question: "What is the difference between Easy, Medium, and Hard?",
              answer:
                "The difficulty controls the time limit: Easy gives you 60 seconds, Medium gives 30 seconds, and Hard gives only 15 seconds. A shorter time limit is harder because you must type faster with no room to correct mistakes. The text content is the same across all difficulties.",
            },
            {
              question: "Does this test work on mobile?",
              answer:
                "Yes, the test works on mobile devices with a keyboard attached. On-screen (virtual) keyboards on phones and tablets are generally too slow and inaccurate for a meaningful typing speed test — a physical keyboard gives the most accurate results.",
            },
          ]}
        />

        <RelatedTools currentSlug="typing-speed" />
      </div>
    </ToolPageShell>
  );
}
