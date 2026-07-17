import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shuffle, Copy, RefreshCw, ChevronLeft, ChevronRight, Calendar, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { buildPageMeta_with_schema, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound, playChord } from "@/lib/sound";

import { PUZZLES, type Category, type Difficulty, type Puzzle } from "@/lib/word-groups/puzzles";
import {
  dayIndex,
  puzzleForDay,
  pickPracticePuzzle,
  LAUNCH_DAY_INDEX,
  dateFromDayIndex,
} from "@/lib/word-groups/daily";
import {
  loadStats,
  saveStats,
  loadHistory,
  markDayCompleted,
  loadRecent,
  pushRecent,
  DEFAULT_STATS,
  type Stats,
} from "@/lib/word-groups/storage";
import { buildShareText, type ShareRow } from "@/lib/word-groups/share";

const PATH = "/tools/word-groups";
const TITLE = "Word Groups — Free Daily Puzzle & Unlimited Archive | Skycally";
const DESCRIPTION =
  "Play Word Groups free — sort 16 words into 4 hidden categories, connections-style. New daily puzzle, unlimited practice mode, and free archive of every past puzzle. No signup.";

export const Route = createFileRoute("/tools/word-groups")({
  head: () =>
    buildPageMeta_with_schema({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      schema: {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "Word Groups",
        description:
          "Connections-style daily word puzzle. Sort 16 words into 4 hidden categories in a 4x4 grid. Free daily puzzle, unlimited practice, and free archive of every past puzzle.",
        url: `${SITE_URL}${PATH}`,
        genre: ["Puzzle", "Word"],
        playMode: "SinglePlayer",
        applicationCategory: "Game",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "New daily word grouping puzzle",
          "4 difficulty tiers (yellow, green, blue, purple)",
          "Free unlimited archive of every past puzzle",
          "Unlimited practice mode",
          "One-away hint on near-miss guesses",
          "Shareable emoji-grid result",
          "Streak and win-rate tracking",
          "Runs fully in your browser",
        ],
      },
    }),
  component: WordGroupsPage,
});

const COLORS: Record<Difficulty, { bg: string; text: string; ring: string }> = {
  yellow: { bg: "#f5c518", text: "#1a1a1a", ring: "#f5c518" },
  green: { bg: "#22c55e", text: "#0a1a0a", ring: "#22c55e" },
  blue: { bg: "#3b82f6", text: "#0a0f1a", ring: "#3b82f6" },
  purple: { bg: "#a855f7", text: "#1a0a1f", ring: "#a855f7" },
};

const DIFF_ORDER: Difficulty[] = ["yellow", "green", "blue", "purple"];
const MAX_MISTAKES = 4;

type Mode = "daily" | "practice" | "archive";

function canonicalKey(words: string[]): string {
  return [...words].sort().join("|");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialTileOrder(p: Puzzle): string[] {
  const all: string[] = [];
  for (const c of p.categories) all.push(...c.words);
  return shuffle(all);
}

// Given a set of 4 guessed words and the full puzzle, produce a share row —
// one difficulty tag per guessed word, showing which category each really
// belongs to.
function guessToShareRow(guess: string[], p: Puzzle): ShareRow {
  return guess.map((w) => {
    const cat = p.categories.find((c) => (c.words as readonly string[]).includes(w));
    return cat ? cat.difficulty : null;
  });
}

function WordGroupsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<Mode>("daily");
  const [today] = useState(() => dayIndex());
  const [archiveDay, setArchiveDay] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => puzzleForDay(dayIndex()));

  const [tileOrder, setTileOrder] = useState<string[]>(() => initialTileOrder(puzzle));
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<Category[]>([]);
  const [pastWrong, setPastWrong] = useState<Set<string>>(new Set());
  const [guessHistory, setGuessHistory] = useState<ShareRow[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: "info" | "error" | "success" } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [historyMap, setHistoryMap] = useState<Record<string, "win" | "loss">>({});
  const [archiveMonth, setArchiveMonth] = useState(() => {
    const d = dateFromDayIndex(dayIndex());
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  // Load persisted state once on client.
  useEffect(() => {
    setStats(loadStats());
    setHistoryMap(loadHistory());
    setHydrated(true);
  }, []);

  const remaining = useMemo(
    () => tileOrder.filter((w) => !solved.some((c) => (c.words as readonly string[]).includes(w))),
    [tileOrder, solved],
  );

  const resetGameFor = useCallback((p: Puzzle) => {
    setPuzzle(p);
    setTileOrder(initialTileOrder(p));
    setSelected([]);
    setSolved([]);
    setPastWrong(new Set());
    setGuessHistory([]);
    setMistakes(0);
    setBanner(null);
    setGameOver(false);
    setWon(false);
  }, []);

  const startDaily = useCallback(() => {
    setMode("daily");
    setArchiveDay(null);
    resetGameFor(puzzleForDay(today));
  }, [resetGameFor, today]);

  const startPractice = useCallback(() => {
    setMode("practice");
    setArchiveDay(null);
    const p = pickPracticePuzzle(loadRecent(), today);
    pushRecent(p.id);
    resetGameFor(p);
  }, [resetGameFor, today]);

  const openArchive = useCallback(() => {
    setMode("archive");
  }, []);

  const playArchiveDay = useCallback(
    (day: number) => {
      setMode("daily"); // reuse the play view; but mark it non-scoring via archiveDay
      setArchiveDay(day);
      resetGameFor(puzzleForDay(day));
    },
    [resetGameFor],
  );

  // Toggle tile selection (max 4).
  const toggleTile = (w: string) => {
    if (gameOver) return;
    setBanner(null);
    setSelected((cur) => {
      if (cur.includes(w)) return cur.filter((x) => x !== w);
      if (cur.length >= 4) return cur;
      playSound("click");
      return [...cur, w];
    });
  };

  const doShuffle = () => {
    setTileOrder((prev) => {
      const solvedWords = new Set(solved.flatMap((c) => c.words));
      const stay = prev.filter((w) => solvedWords.has(w));
      const rest = prev.filter((w) => !solvedWords.has(w));
      return [...stay, ...shuffle(rest)];
    });
    playSound("click");
  };

  const deselectAll = () => setSelected([]);

  const submitGuess = useCallback(() => {
    if (gameOver || selected.length !== 4) return;
    const key = canonicalKey(selected);
    if (pastWrong.has(key)) {
      setBanner({ text: "You already tried that group.", kind: "info" });
      return;
    }

    // Correct match?
    const match = puzzle.categories.find(
      (c) => canonicalKey(c.words as unknown as string[]) === key && !solved.includes(c),
    );

    const row = guessToShareRow(selected, puzzle);
    setGuessHistory((h) => [...h, row]);

    if (match) {
      const newSolved = [...solved, match];
      setSolved(newSolved);
      setSelected([]);
      setBanner({ text: `Nice — ${match.name}!`, kind: "success" });
      playChord(["success", "win"]);
      // Reorder tiles: solved words move to the front group by group.
      setTileOrder((prev) => {
        const solvedWords = new Set(newSolved.flatMap((c) => c.words));
        const stay = prev.filter((w) => solvedWords.has(w));
        const rest = prev.filter((w) => !solvedWords.has(w));
        return [...stay, ...rest];
      });
      if (newSolved.length === 4) {
        setWon(true);
        setGameOver(true);
        finalizeGame(true, mistakes, newSolved.length);
      }
      return;
    }

    // Wrong.
    const nextWrong = new Set(pastWrong);
    nextWrong.add(key);
    setPastWrong(nextWrong);

    // One-away detection.
    const oneAway = puzzle.categories.some((c) => {
      if (solved.includes(c)) return false;
      const catSet = new Set(c.words as readonly string[]);
      const overlap = selected.filter((w) => catSet.has(w)).length;
      return overlap === 3;
    });

    const newMistakes = mistakes + 1;
    setMistakes(newMistakes);
    playSound("fail");

    if (newMistakes >= MAX_MISTAKES) {
      // Reveal remaining, lose.
      const remainingCats = puzzle.categories.filter((c) => !solved.includes(c));
      const ordered = [...remainingCats].sort(
        (a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty),
      );
      setSolved([...solved, ...ordered]);
      setSelected([]);
      setBanner({ text: "Out of mistakes — here's the full answer.", kind: "error" });
      setGameOver(true);
      setWon(false);
      finalizeGame(false, MAX_MISTAKES, solved.length);
    } else if (oneAway) {
      setBanner({ text: "One away!", kind: "error" });
    } else {
      setBanner({
        text: `Not quite — ${MAX_MISTAKES - newMistakes} mistake${MAX_MISTAKES - newMistakes === 1 ? "" : "s"} left.`,
        kind: "error",
      });
    }
  }, [gameOver, selected, pastWrong, puzzle, solved, mistakes]);

  const finalizeGame = useCallback(
    (didWin: boolean, _mistakesUsed: number, _solvedCount: number) => {
      // Only the live daily puzzle updates streak / history.
      const isLiveDaily = mode === "daily" && archiveDay === null;
      if (!isLiveDaily) return;
      // Avoid double-counting if the player somehow finishes twice on the same day.
      if (stats.lastPlayedDay === today) return;
      const nextStats: Stats = {
        played: stats.played + 1,
        wins: stats.wins + (didWin ? 1 : 0),
        currentStreak: didWin ? stats.currentStreak + 1 : 0,
        bestStreak: didWin ? Math.max(stats.bestStreak, stats.currentStreak + 1) : stats.bestStreak,
        lastPlayedDay: today,
      };
      setStats(nextStats);
      saveStats(nextStats);
      markDayCompleted(today, didWin ? "win" : "loss");
      setHistoryMap((h) => ({ ...h, [String(today)]: didWin ? "win" : "loss" }));
    },
    [mode, archiveDay, stats, today],
  );

  const share = async () => {
    const label =
      mode === "daily" && archiveDay === null
        ? `Word Groups #${today - LAUNCH_DAY_INDEX + 1}`
        : archiveDay !== null
          ? `Word Groups (Archive ${dateFromDayIndex(archiveDay).toISOString().slice(0, 10)})`
          : "Word Groups (Practice)";
    const text = buildShareText({
      dayLabel: label,
      rows: guessHistory,
      won,
      mistakes,
      url: `${SITE_URL}${PATH}`,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied result to clipboard");
    } catch {
      toast.error("Could not copy — try selecting the text manually.");
    }
  };

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  // Layout: 4 columns fixed. Rows shrink as solved bands grow.
  const rowsRemaining = Math.max(0, Math.ceil(remaining.length / 4));

  return (
    <ToolPageShell
      title="Word Groups"
      description="Sort 16 words into 4 hidden groups. Fresh daily puzzle, unlimited practice mode, and a free archive of every past puzzle."
      showFileDisclaimer={false}
    >
      {/* Mode tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <ModeTab active={mode === "daily" && archiveDay === null} onClick={startDaily} label="Daily" icon={<Sparkles className="w-4 h-4" />} />
        <ModeTab active={mode === "practice"} onClick={startPractice} label="Practice" icon={<RefreshCw className="w-4 h-4" />} />
        <ModeTab active={mode === "archive"} onClick={openArchive} label="Archive" icon={<Calendar className="w-4 h-4" />} />
        {mode === "daily" && archiveDay === null && (
          <span className="ml-auto text-xs text-muted-foreground">Puzzle #{today - LAUNCH_DAY_INDEX + 1}</span>
        )}
        {archiveDay !== null && (
          <span className="ml-auto text-xs text-muted-foreground">
            Archive: {dateFromDayIndex(archiveDay).toISOString().slice(0, 10)}
          </span>
        )}
      </div>

      {mode === "archive" ? (
        <ArchiveView
          today={today}
          launch={LAUNCH_DAY_INDEX}
          month={archiveMonth}
          setMonth={setArchiveMonth}
          history={historyMap}
          onPick={playArchiveDay}
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          {/* Solved bands */}
          <div className="w-full max-w-2xl grid gap-2">
            {solved.map((c) => (
              <div
                key={c.name}
                className="rounded-lg px-4 py-3 text-center font-semibold"
                style={{ background: COLORS[c.difficulty].bg, color: COLORS[c.difficulty].text }}
              >
                <div className="uppercase tracking-wide text-sm">{c.name}</div>
                <div className="text-xs opacity-80 mt-0.5">{c.words.join(" · ")}</div>
              </div>
            ))}
          </div>

          {/* Inline banner */}
          <div aria-live="polite" className="min-h-[24px] text-sm">
            {banner && (
              <span
                className={
                  banner.kind === "success"
                    ? "text-green-500 font-medium"
                    : banner.kind === "error"
                      ? "text-red-500 font-medium"
                      : "text-muted-foreground"
                }
              >
                {banner.text}
              </span>
            )}
          </div>

          {/* Remaining grid */}
          {rowsRemaining > 0 && (
            <div
              className="grid gap-2 w-full max-w-2xl"
              style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
            >
              {remaining.map((w) => {
                const isSel = selected.includes(w);
                return (
                  <button
                    key={w}
                    onClick={() => toggleTile(w)}
                    aria-pressed={isSel}
                    disabled={gameOver}
                    className={`min-h-[64px] sm:min-h-[76px] rounded-md border-2 px-2 text-sm sm:text-base font-bold uppercase tracking-wide transition select-none ${
                      isSel
                        ? "bg-foreground text-background border-foreground scale-[0.97]"
                        : "bg-card text-foreground border-border hover:border-foreground/40"
                    } disabled:opacity-70`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mistakes indicator */}
          <div className="flex items-center gap-2 text-sm" aria-live="polite">
            <span className="text-muted-foreground">Mistakes left:</span>
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < MAX_MISTAKES - mistakes ? "bg-foreground" : "bg-muted"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          {!gameOver && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={doShuffle}>
                <Shuffle className="w-4 h-4 mr-1.5" /> Shuffle
              </Button>
              <Button variant="outline" onClick={deselectAll} disabled={selected.length === 0}>
                Deselect all
              </Button>
              <Button onClick={submitGuess} disabled={selected.length !== 4}>
                Submit
              </Button>
            </div>
          )}

          {/* End-of-game panel */}
          {gameOver && (
            <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5" style={{ color: won ? "var(--green-brand, #22c55e)" : "var(--muted-foreground)" }} />
                <h3 className="font-display text-xl font-bold">
                  {won ? "Solved!" : "Better luck next time"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {won
                  ? `You cracked all four groups with ${mistakes}/${MAX_MISTAKES} mistake${mistakes === 1 ? "" : "s"}.`
                  : `The full answer is above. Come back tomorrow, or try practice mode.`}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={share}>
                  <Copy className="w-4 h-4 mr-1.5" /> Share result
                </Button>
                {mode === "practice" && (
                  <Button variant="outline" onClick={startPractice}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Next puzzle
                  </Button>
                )}
                {archiveDay !== null && (
                  <Button variant="outline" onClick={startDaily}>
                    Back to today
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Stats — hidden until hydrated to avoid SSR mismatch */}
          {hydrated && (
            <div className="grid grid-cols-4 gap-3 w-full max-w-md mt-2">
              <StatBox label="Played" value={stats.played} />
              <StatBox label="Win %" value={winPct} />
              <StatBox label="Streak" value={stats.currentStreak} />
              <StatBox label="Best" value={stats.bestStreak} />
            </div>
          )}
        </div>
      )}

      <AdZone id="word-groups-mid" size="728x90" />

      <HowToUse
        steps={[
          "Tap four words you think share a hidden category, then press Submit.",
          "A correct guess reveals the group and its color; a wrong one costs a mistake — 'One away!' means three of your four were right.",
          "Solve all four groups before you run out of mistakes. Come back for a new puzzle daily, or open the archive to play any past puzzle free.",
        ]}
      />

      <ToolSeoContent
        title="Free Word Groups — Daily Connections-Style Word Puzzle Online"
        description="Word Groups is a free daily word-grouping puzzle: sort 16 words into 4 hidden categories. Play today's puzzle, browse the free archive of past puzzles, or hop into unlimited practice mode — no signup, no paywall."
        body={[
          "Word Groups is a daily word puzzle in the same family as the classic connections game. Every day you're given a 4×4 grid of 16 words, and your job is to sort them into 4 hidden categories of 4 words each. You select four words that seem to share a theme and press Submit — a correct guess reveals the category and slides those four words to the top of the grid, a wrong guess costs you one of four mistakes. Solve all four categories before you run out of mistakes and you win the day.",
          "Each puzzle uses four difficulty tiers, marked by color once you solve the group. Yellow is the most straightforward — usually a plain semantic category like 'fruits' or 'card suits.' Green is a step trickier. Blue tightens the theme further. Purple is the hardest, and almost always involves wordplay, puns, hidden words, or a shared prefix / suffix. Every puzzle is hand-authored with at least one deliberate 'trap' word — a word that plausibly fits more than one category — which is what makes the game feel clever rather than trivial and why the same word can sit in the grid looking like it belongs to two groups at once.",
          "A few strategy tips: start with the category you're most confident about, but stay suspicious of anything that feels too easy on the yellow tier — that's often where a trap word is hiding. Use the shuffle button freely: rearranging the tiles helps your brain spot new adjacencies you missed when the layout was fixed. When a wrong guess triggers a 'One away!' message, you know three of your four words are in the same real category — swap one word at a time to find the odd one out. Save the tier you're least sure about for last: elimination will often solve it for you.",
          "This version of the game beats the original on the two things it deliberately restricts. It's free — no subscription, no signup, no paywall on any past puzzle ever. The archive lets you play every daily puzzle since launch on its original date, and Unlimited Practice mode pulls hand-authored puzzles from the same bank whenever you want more, without touching your daily streak. All the puzzles here are original content authored for Skycally — we do not reuse the New York Times Connections categories or word groupings, since those are the newspaper's editorial work.",
        ]}
        faqs={[
          {
            question: "What is Word Groups?",
            answer:
              "Word Groups is a free daily word-grouping puzzle in the same family as connections. Sort 16 words into 4 hidden categories of 4 words each before running out of mistakes.",
          },
          {
            question: "How many mistakes am I allowed?",
            answer:
              "You have exactly 4 mistakes per puzzle. When you run out, the remaining categories are revealed and the game ends. This matches the standard connections rule set.",
          },
          {
            question: "What do the yellow, green, blue, and purple colors mean?",
            answer:
              "The colors mark difficulty. Yellow is the easiest tier — usually a plain semantic category. Green and blue get progressively trickier. Purple is the hardest and almost always involves wordplay, puns, hidden words, or a shared prefix/suffix.",
          },
          {
            question: "What does 'One away!' mean?",
            answer:
              "'One away!' means your wrong guess had exactly 3 of the 4 words from a real category. You're one swap away — try replacing one of your four selections and guessing again.",
          },
          {
            question: "Is there a new puzzle every day?",
            answer:
              "Yes. The daily puzzle is the same for every visitor and rotates once per calendar day (UTC), using the same rollover convention as this site's Wordle.",
          },
          {
            question: "Can I play past puzzles I missed?",
            answer:
              "Yes. Open the Archive tab to browse a calendar of every past daily puzzle since launch and play any of them in full — completely free, with no subscription required.",
          },
          {
            question: "Can I play more than once a day?",
            answer:
              "Yes. Practice mode gives you an unlimited stream of hand-authored puzzles from the same bank. Practice results do not affect your daily streak or win-rate stats.",
          },
          {
            question: "Is this really free, unlike the original?",
            answer:
              "Yes. Word Groups is 100% free — daily puzzle, full archive, and unlimited practice mode all with no signup, no paywall, and no account. Everything runs in your browser.",
          },
        ]}
      />

      {/* Contextual internal-links block */}
      <section className="max-w-2xl mx-auto mt-6 px-1 pb-6 text-sm text-muted-foreground space-y-2">
        <p>
          If you enjoy daily word puzzles, try today's{" "}
          <a href="/tools/wordle" className="underline hover:text-foreground">
            Wordle
          </a>{" "}
          — same six-guess, share-your-result rhythm in a different shape.
        </p>
        <p>
          For a more relaxed, no-pressure word game, our{" "}
          <a href="/tools/word-search" className="underline hover:text-foreground">
            Word Search
          </a>{" "}
          hides words in a grid you scan at your own pace.
        </p>
        <p>
          Or try another quick word-guessing game with{" "}
          <a href="/tools/hangman" className="underline hover:text-foreground">
            Hangman
          </a>{" "}
          — one hidden word, a limited number of wrong letters.
        </p>
      </section>

      <RelatedTools currentSlug="word-groups" />
    </ToolPageShell>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function ArchiveView({
  today,
  launch,
  month,
  setMonth,
  history,
  onPick,
}: {
  today: number;
  launch: number;
  month: { y: number; m: number };
  setMonth: (m: { y: number; m: number }) => void;
  history: Record<string, "win" | "loss">;
  onPick: (day: number) => void;
}) {
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const startWeekday = first.getUTCDay(); // 0..6
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    const y = month.m === 0 ? month.y - 1 : month.y;
    const m = month.m === 0 ? 11 : month.m - 1;
    setMonth({ y, m });
  };
  const nextMonth = () => {
    const y = month.m === 11 ? month.y + 1 : month.y;
    const m = month.m === 11 ? 0 : month.m + 1;
    setMonth({ y, m });
  };

  const monthLabel = new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-semibold">{monthLabel}</div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dayIdx = Math.floor(Date.UTC(month.y, month.m, d) / 86400000);
          const disabled = dayIdx < launch || dayIdx > today;
          const state = history[String(dayIdx)];
          const dot = state === "win" ? "#22c55e" : state === "loss" ? "#ef4444" : "transparent";
          return (
            <button
              key={i}
              onClick={() => !disabled && onPick(dayIdx)}
              disabled={disabled}
              className={`aspect-square rounded-md text-sm flex flex-col items-center justify-center border ${
                disabled
                  ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                  : "border-border hover:border-foreground/40 text-foreground"
              } ${dayIdx === today ? "ring-2 ring-foreground/40" : ""}`}
            >
              <span>{d}</span>
              <span
                className="mt-0.5 w-1.5 h-1.5 rounded-full"
                style={{ background: dot }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        Green dot = solved, red dot = missed, no dot = not played yet. Every past puzzle is free.
      </p>
    </div>
  );
}

// Silence unused-import warnings for future maintainers.
void PUZZLES;
