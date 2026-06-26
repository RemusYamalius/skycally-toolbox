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

export const Route = createFileRoute("/tools/hangman")({
  head: () => buildToolMeta(toolBySlug("hangman", tools)),
  component: HangmanPage,
});

const WORD_BANK: Record<string, string[]> = {
  Animals: [
    "ELEPHANT",
    "GIRAFFE",
    "PENGUIN",
    "DOLPHIN",
    "CHEETAH",
    "FLAMINGO",
    "KANGAROO",
    "CROCODILE",
    "BUTTERFLY",
    "HAMSTER",
  ],
  Countries: [
    "MOROCCO",
    "BRAZIL",
    "AUSTRALIA",
    "CANADA",
    "JAPAN",
    "GERMANY",
    "ARGENTINA",
    "PORTUGAL",
    "NIGERIA",
    "THAILAND",
  ],
  Sports: [
    "BASKETBALL",
    "SWIMMING",
    "VOLLEYBALL",
    "GYMNASTICS",
    "BADMINTON",
    "WRESTLING",
    "ARCHERY",
    "SKATEBOARD",
    "SNOWBOARD",
    "CRICKET",
  ],
  Technology: [
    "COMPUTER",
    "KEYBOARD",
    "INTERNET",
    "SOFTWARE",
    "ALGORITHM",
    "DATABASE",
    "FRAMEWORK",
    "BLUETOOTH",
    "PROCESSOR",
    "JAVASCRIPT",
  ],
  Food: [
    "SPAGHETTI",
    "CROISSANT",
    "AVOCADO",
    "BLUEBERRY",
    "CHOCOLATE",
    "PINEAPPLE",
    "MUSHROOM",
    "BROCCOLI",
    "CINNAMON",
    "RASPBERRY",
  ],
  Movies: [
    "INCEPTION",
    "GLADIATOR",
    "INTERSTELLAR",
    "TITANIC",
    "AVATAR",
    "FROZEN",
    "MATRIX",
    "JOKER",
    "GRAVITY",
    "PARASITE",
  ],
};

const MAX_WRONG = 6;

type Phase = "setup" | "playing" | "won" | "lost";

function pickWord(category: string): string {
  const list = WORD_BANK[category];
  return list[Math.floor(Math.random() * list.length)];
}

function HangmanSVG({ wrong }: { wrong: number }) {
  return (
    <svg viewBox="0 0 200 220" className="w-44 h-44 sm:w-48 sm:h-48 mx-auto text-foreground">
      <line x1="20" y1="210" x2="180" y2="210" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="210" x2="60" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="20" x2="130" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="130" y1="20" x2="130" y2="45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {wrong >= 1 && <circle cx="130" cy="60" r="15" stroke="currentColor" strokeWidth="3" fill="none" />}
      {wrong >= 2 && (
        <line x1="130" y1="75" x2="130" y2="135" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
      {wrong >= 3 && (
        <line x1="130" y1="90" x2="105" y2="115" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
      {wrong >= 4 && (
        <line x1="130" y1="90" x2="155" y2="115" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
      {wrong >= 5 && (
        <line x1="130" y1="135" x2="105" y2="165" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
      {wrong >= 6 && (
        <line x1="130" y1="135" x2="155" y2="165" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}

function HangmanPage() {
  const [category, setCategory] = useState<string>("Animals");
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("setup");
  const [streak, setStreak] = useState(0);

  const wrongLetters = [...guessed].filter((l) => !word.includes(l));
  const wrongCount = wrongLetters.length;
  const livesLeft = MAX_WRONG - wrongCount;

  const startGame = useCallback(
    (cat?: string) => {
      const useCat = cat ?? category;
      setCategory(useCat);
      setWord(pickWord(useCat));
      setGuessed(new Set());
      setPhase("playing");
    },
    [category],
  );

  const nextWord = useCallback(() => {
    setWord(pickWord(category));
    setGuessed(new Set());
    setPhase("playing");
  }, [category]);

  const guess = useCallback(
    (letter: string) => {
      if (phase !== "playing") return;
      if (guessed.has(letter)) return;
      const next = new Set(guessed);
      next.add(letter);
      setGuessed(next);

      const wordSet = new Set(word.split(""));
      const allFound = [...wordSet].every((l) => next.has(l));
      const wrong = [...next].filter((l) => !word.includes(l)).length;
      const isCorrect = word.includes(letter);

      if (allFound) {
        setPhase("won");
        setStreak((s) => s + 1);
        playChord(["success", "win"]);
      } else if (wrong >= MAX_WRONG) {
        setPhase("lost");
        setStreak(0);
        playSound("fail");
      } else if (isCorrect) {
        playSound("click");
      } else {
        playSound("wrong");
      }
    },
    [phase, guessed, word],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const l = e.key.toUpperCase();
      if (/^[A-Z]$/.test(l)) guess(l);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, guess]);

  const reveal = phase === "lost";

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Hangman"
      description="Guess the hidden word letter by letter. You have 6 wrong guesses before the hangman is complete."
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {phase === "setup" ? (
          <div className="max-w-md mx-auto">
            <p className="text-sm font-semibold text-muted-foreground mb-3 text-center">Pick a category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {Object.keys(WORD_BANK).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    category === cat
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-secondary",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button onClick={() => startGame()} className="w-full gap-2" size="lg">
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-4 text-sm">
              <span className="px-3 py-1 rounded-lg bg-muted">
                Category: <span className="text-primary font-semibold">{category}</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-muted">🔥 Streak: {streak}</span>
            </div>

            <HangmanSVG wrong={wrongCount} />

            <div className="flex gap-1 justify-center mt-4 mb-1">
              {Array.from({ length: MAX_WRONG }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-6 h-2 rounded-full transition-all",
                    i < livesLeft ? "bg-green-500" : "bg-red-500/30",
                  )}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mb-4">
              {livesLeft} {livesLeft === 1 ? "life" : "lives"} remaining
            </p>

            <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap my-6">
              {word.split("").map((letter, i) => {
                const shown = guessed.has(letter) || reveal;
                return (
                  <div key={i} className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-2xl font-black w-7 sm:w-8 text-center",
                        shown
                          ? phase === "lost" && !guessed.has(letter)
                            ? "text-red-500"
                            : phase === "won"
                              ? "text-green-500"
                              : "text-foreground"
                          : "text-transparent",
                      )}
                    >
                      {shown ? letter : "_"}
                    </span>
                    <div className="w-7 sm:w-8 h-0.5 bg-foreground mt-1" />
                  </div>
                );
              })}
            </div>

            {phase === "won" && (
              <div className="mb-5 text-center rounded-2xl border-2 border-green-500/40 bg-green-500/10 p-4">
                <p className="text-xl font-black text-foreground">🎉 You got it!</p>
              </div>
            )}
            {phase === "lost" && (
              <div className="mb-5 text-center rounded-2xl border-2 border-red-500/40 bg-red-500/10 p-4">
                <p className="text-xl font-black text-foreground mb-1">💀 Game Over</p>
                <p className="text-sm text-muted-foreground">
                  The word was <span className="font-bold text-red-500">{word}</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 justify-center max-w-md mx-auto">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => {
                const used = guessed.has(l);
                const correct = used && word.includes(l);
                const wrong = used && !word.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() => guess(l)}
                    disabled={used || phase !== "playing"}
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-sm font-bold transition-all",
                      correct && "bg-green-500/30 text-green-500 border border-green-500/40",
                      wrong && "bg-muted text-muted-foreground border border-transparent opacity-40",
                      !used &&
                        "bg-card border border-border hover:border-primary/50 hover:bg-secondary text-foreground",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {phase === "won" && (
                <Button onClick={nextWord} className="gap-2">
                  <Play className="w-4 h-4" /> Next Word
                </Button>
              )}
              {phase === "lost" && (
                <Button onClick={() => startGame()} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </Button>
              )}
              <Button onClick={() => setPhase("setup")} variant="outline">
                Change Category
              </Button>
            </div>
          </>
        )}
      </div>

      <AdZone id="hangman-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose a word category and start the game.",
          "Click letters or type on your keyboard to guess.",
          "You have 6 wrong guesses before the hangman is complete — find the word!",
        ]}
      />

      <ToolSeoContent
        title="Free Hangman Game Online — Guess the Word Before the Man Falls"
        description="Play Hangman free online. Guess letters to reveal the hidden word before running out of attempts. Multiple categories. Free, no signup, works on mobile."
        body={[
          "Skycally's Hangman presents a hidden word and gives you 6 attempts to guess it letter by letter. Click a letter or press a key on your keyboard to guess. Correct letters are revealed in their positions; wrong guesses add a part to the hangman drawing. Guess the word before the figure is complete to win.",
          "Hangman is one of the oldest word-guessing games in the world, appearing in print as early as 1894. It's a staple of classrooms, road trips, and family game nights because it requires no equipment beyond paper and a pen. The digital version preserves the original tension — each wrong guess brings the figure closer to completion.",
          "Words are drawn from multiple categories including Animals, Countries, Sports, Technology, Food, and Nature. Each new game picks a random word from a randomly selected category, ensuring variety across sessions. The category is shown as a hint so you can narrow down the possibilities.",
          "Strategy matters in Hangman. Start with the most common English letters: E, T, A, O, I, N, S, H, R. Then use the pattern of revealed letters to make educated guesses about the remaining ones. Short words with unusual letter combinations are the hardest — a 4-letter word with a Q or Z can be brutal even for experienced players.",
        ]}
        faqs={[
          {
            question: "How do I play Hangman?",
            answer:
              "A hidden word is shown as blank spaces. Click letters or use your keyboard to guess. Correct guesses reveal the letter in its position(s). Wrong guesses draw parts of the hangman. Guess the word in 6 wrong attempts or fewer to win.",
          },
          {
            question: "How many wrong guesses do I get?",
            answer:
              "6 wrong guesses — head, body, left arm, right arm, left leg, right leg. The game ends when all 6 parts are drawn.",
          },
          {
            question: "Can I use my physical keyboard?",
            answer:
              "Yes. Press any letter key on your keyboard to guess it. The keyboard on-screen is also available for mouse or touch input.",
          },
          {
            question: "What categories are available?",
            answer:
              "Words come from Animals, Countries, Sports, Technology, Food, and Nature categories. The category is shown as a hint when a new game starts.",
          },
          {
            question: "What are the best letters to guess first?",
            answer:
              "Start with the most common English letters: E, T, A, O, I, N, S, H, R. These appear most frequently and give you the most information early.",
          },
          { question: "Is there a time limit?", answer: "No. Take as long as you need to think through each guess." },
          {
            question: "Is my score tracked?",
            answer: "The game tracks wins and losses in the current session. Closing the tab resets the count.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. The on-screen keyboard is touch-friendly and the hangman drawing scales to all screen sizes.",
          },
        ]}
      />

      <RelatedTools currentSlug="hangman" />
    </ToolPageShell>
  );
}
