import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  Lightbulb,
  Printer,
  RefreshCw,
  Share2,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { buildPageMeta_with_schema, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

import { CROSSWORD_PUZZLES, type CrosswordPuzzle } from "@/lib/crossword/puzzles";
import {
  LAUNCH_DAY_INDEX,
  dateFromDayIndex,
  dayIndex,
  formatDateLong,
  pickPracticePuzzle,
  puzzleForDay,
} from "@/lib/crossword/daily";
import {
  DEFAULT_STATS,
  loadHistory,
  loadProgress,
  loadRecent,
  loadStats,
  markDayCompleted,
  pushRecent,
  recordDailyResult,
  saveProgress,
  type CrosswordResult,
  type CrosswordStats,
} from "@/lib/crossword/storage";
import {
  buildGrid,
  cellKey,
  countFilled,
  formatClock,
  isSolved,
  solvedWordIndexes,
  type GridModel,
} from "@/lib/crossword/grid";
import { exportCrosswordPdf } from "@/lib/crossword/pdf";

const PATH = "/tools/crossword";
const TITLE = "Daily Crossword Puzzle — Free Online & Printable | Skycally";
const DESCRIPTION =
  "Play a free daily crossword puzzle online. Unlimited practice mode, a free archive of every past puzzle, and printable PDF worksheets with answer keys. No signup, no paywall.";

export const Route = createFileRoute("/tools/crossword")({
  head: () =>
    buildPageMeta_with_schema({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      schema: {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "Daily Crossword Puzzle",
        description:
          "A free daily crossword puzzle you can solve online or print. Includes unlimited practice puzzles, a free archive of every past daily puzzle, and printable PDF worksheets with answer keys.",
        url: `${SITE_URL}${PATH}`,
        genre: ["Puzzle", "Word"],
        playMode: "SinglePlayer",
        applicationCategory: "Game",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "New crossword puzzle every day",
          "Unlimited practice puzzles",
          "Free archive of every past daily puzzle",
          "Tap or swipe to select an across or down entry",
          "Native keyboard input with auto-advance",
          "Check letter, check word, and reveal helpers",
          "Printable PDF worksheet with a separate answer key",
          "Solve timer, streak, and completion tracking",
          "Runs entirely in your browser",
        ],
      },
    }),
  component: CrosswordPage,
});

type Mode = "daily" | "practice" | "archive";
type Letters = Record<string, string>;

function CrosswordPage() {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<Mode>("daily");
  const [today] = useState(() => dayIndex());
  const [archiveDay, setArchiveDay] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle>(() =>
    puzzleForDay(dayIndex()),
  );

  const [letters, setLetters] = useState<Letters>({});
  const [active, setActive] = useState<string | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [usedReveal, setUsedReveal] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<string[]>([]);
  const [finished, setFinished] = useState<null | CrosswordResult>(null);

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const [stats, setStats] = useState<CrosswordStats>(DEFAULT_STATS);
  const [history, setHistory] = useState<Record<string, CrosswordResult>>({});
  const [month, setMonth] = useState(() => {
    const d = dateFromDayIndex(dayIndex());
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const grid: GridModel = useMemo(() => buildGrid(puzzle), [puzzle]);

  const isDaily = mode === "daily" && archiveDay === null;
  const playedDay = archiveDay ?? today;

  /* ---------------------------------------------------------------- setup */

  useEffect(() => {
    setHydrated(true);
    setStats(loadStats());
    setHistory(loadHistory());
    const saved = loadProgress(dayIndex());
    if (Object.keys(saved).length) setLetters(saved);
    setRunning(true);
  }, []);

  // Timer ticks only while a board is open and unsolved.
  useEffect(() => {
    if (!running || finished || mode === "archive") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running, finished, mode]);

  // Persist daily progress so a refresh doesn't wipe the board.
  useEffect(() => {
    if (!hydrated || !isDaily) return;
    saveProgress(today, letters);
  }, [letters, hydrated, isDaily, today]);

  // Default selection: first across entry.
  useEffect(() => {
    const first = grid.across[0] ?? grid.down[0];
    if (first) {
      setActive(cellKey(first.word.row, first.word.col));
      setDirection(first.word.direction);
    }
  }, [grid]);

  /* ------------------------------------------------------------ selection */

  const activeWordIndex = useMemo(() => {
    if (!active) return null;
    const cell = grid.cells.get(active);
    if (!cell) return null;
    const primary = direction === "across" ? cell.acrossIndex : cell.downIndex;
    const fallback = direction === "across" ? cell.downIndex : cell.acrossIndex;
    return primary ?? fallback;
  }, [active, direction, grid]);

  const activeWordCells = useMemo(
    () => (activeWordIndex === null ? [] : grid.wordCells[activeWordIndex]),
    [activeWordIndex, grid],
  );

  const solvedWords = useMemo(
    () => solvedWordIndexes(grid, letters),
    [grid, letters],
  );

  const progress = useMemo(() => countFilled(grid, letters), [grid, letters]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const selectCell = useCallback(
    (key: string, toggle: boolean) => {
      const cell = grid.cells.get(key);
      if (!cell) return;
      if (toggle && key === active) {
        const other = direction === "across" ? "down" : "across";
        const hasOther = other === "across" ? cell.acrossIndex : cell.downIndex;
        if (hasOther !== null) setDirection(other);
      } else {
        const hasCurrent =
          direction === "across" ? cell.acrossIndex : cell.downIndex;
        if (hasCurrent === null) {
          setDirection(direction === "across" ? "down" : "across");
        }
      }
      setActive(key);
      focusInput();
    },
    [active, direction, grid, focusInput],
  );

  const selectWord = useCallback(
    (index: number) => {
      const keys = grid.wordCells[index];
      if (!keys?.length) return;
      const firstEmpty = keys.find((k) => !(letters[k] ?? "")) ?? keys[0];
      setDirection(
        grid.across.some((a) => a.index === index) ? "across" : "down",
      );
      setActive(firstEmpty);
      focusInput();
    },
    [grid, letters, focusInput],
  );

  /* --------------------------------------------------------------- typing */

  const step = useCallback(
    (key: string, delta: number): string | null => {
      const idx = activeWordCells.indexOf(key);
      if (idx === -1) return null;
      const next = idx + delta;
      if (next < 0 || next >= activeWordCells.length) return null;
      return activeWordCells[next];
    },
    [activeWordCells],
  );

  const typeLetter = useCallback(
    (raw: string) => {
      if (!active || finished) return;
      const ch = raw.toUpperCase();
      if (!/^[A-Z]$/.test(ch)) return;
      setLetters((prev) => ({ ...prev, [active]: ch }));
      // Auto-advance to the next empty square in the current entry, else next square.
      const after = activeWordCells.slice(activeWordCells.indexOf(active) + 1);
      const nextEmpty = after.find((k) => !(letters[k] ?? ""));
      const next = nextEmpty ?? step(active, 1);
      if (next) setActive(next);
    },
    [active, activeWordCells, finished, letters, step],
  );

  const backspace = useCallback(() => {
    if (!active || finished) return;
    if (letters[active]) {
      setLetters((prev) => {
        const copy = { ...prev };
        delete copy[active];
        return copy;
      });
      return;
    }
    const prevKey = step(active, -1);
    if (prevKey) {
      setActive(prevKey);
      setLetters((prev) => {
        const copy = { ...prev };
        delete copy[prevKey];
        return copy;
      });
    }
  }, [active, finished, letters, step]);

  const moveBy = useCallback(
    (dr: number, dc: number) => {
      if (!active) return;
      const cell = grid.cells.get(active);
      if (!cell) return;
      const wantDir = dr !== 0 ? "down" : "across";
      if (wantDir !== direction) {
        const hasDir = wantDir === "across" ? cell.acrossIndex : cell.downIndex;
        if (hasDir !== null) {
          setDirection(wantDir);
          return;
        }
      }
      let r = cell.row + dr;
      let c = cell.col + dc;
      while (r >= 0 && c >= 0 && r < grid.rows && c < grid.cols) {
        const key = cellKey(r, c);
        if (grid.cells.has(key)) {
          setActive(key);
          return;
        }
        r += dr;
        c += dc;
      }
    },
    [active, direction, grid],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveBy(-1, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveBy(1, 0);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveBy(0, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveBy(0, 1);
      } else if (e.key === "Tab") {
        e.preventDefault();
        const list = direction === "across" ? grid.across : grid.down;
        const pos = list.findIndex((w) => w.index === activeWordIndex);
        const nextEntry = list[(pos + (e.shiftKey ? -1 + list.length : 1)) % list.length];
        if (nextEntry) selectWord(nextEntry.index);
      } else if (e.key === " ") {
        e.preventDefault();
        setDirection((d) => (d === "across" ? "down" : "across"));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        typeLetter(e.key);
      }
    },
    [activeWordIndex, backspace, direction, grid, moveBy, selectWord, typeLetter],
  );

  /* ------------------------------------------------- swipe-to-select (touch) */

  const dragStart = useRef<{ row: number; col: number } | null>(null);

  const cellFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const holder = el?.closest("[data-cell]") as HTMLElement | null;
    return holder?.dataset.cell ?? null;
  };

  const onPointerDown = (e: React.PointerEvent, key: string) => {
    const cell = grid.cells.get(key);
    if (!cell) return;
    // Keep focus on the hidden input so the keyboard keeps driving the board.
    e.preventDefault();
    dragStart.current = { row: cell.row, col: cell.col };
    selectCell(key, true);
  };


  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const key = cellFromPoint(e.clientX, e.clientY);
    if (!key) return;
    const cell = grid.cells.get(key);
    if (!cell) return;
    const dr = cell.row - dragStart.current.row;
    const dc = cell.col - dragStart.current.col;
    if (dr === 0 && dc === 0) return;
    // A drag across a row picks the across entry; down a column picks down.
    const wanted = Math.abs(dc) >= Math.abs(dr) ? "across" : "down";
    const startCell = grid.cells.get(
      cellKey(dragStart.current.row, dragStart.current.col),
    );
    if (!startCell) return;
    const hasWanted =
      wanted === "across" ? startCell.acrossIndex : startCell.downIndex;
    if (hasWanted !== null) setDirection(wanted);
  };

  const onPointerUp = () => {
    dragStart.current = null;
  };

  /* --------------------------------------------------------------- helpers */

  const flash = (keys: string[]) => {
    setWrongFlash(keys);
    window.setTimeout(() => setWrongFlash([]), 900);
  };

  const checkLetter = () => {
    if (!active) return;
    const cell = grid.cells.get(active);
    if (!cell) return;
    const v = letters[active] ?? "";
    if (!v) {
      toast.info("That square is still empty.");
      return;
    }
    if (v === cell.solution) toast.success("That letter is correct.");
    else {
      flash([active]);
      toast.error("That letter is wrong.");
    }
  };

  const checkWord = () => {
    if (activeWordIndex === null) return;
    const keys = grid.wordCells[activeWordIndex];
    const bad = keys.filter(
      (k) => (letters[k] ?? "") && letters[k] !== grid.cells.get(k)!.solution,
    );
    if (bad.length) {
      flash(bad);
      toast.error(`${bad.length} wrong letter${bad.length > 1 ? "s" : ""} in this entry.`);
    } else if (keys.every((k) => letters[k])) {
      toast.success("This entry is complete and correct.");
    } else {
      toast.info("No wrong letters so far — keep going.");
    }
  };

  const revealWord = () => {
    if (activeWordIndex === null) return;
    const keys = grid.wordCells[activeWordIndex];
    setUsedReveal(true);
    setLetters((prev) => {
      const copy = { ...prev };
      for (const k of keys) copy[k] = grid.cells.get(k)!.solution;
      return copy;
    });
  };

  const revealPuzzle = () => {
    setUsedReveal(true);
    const all: Letters = {};
    for (const [k, cell] of grid.cells) all[k] = cell.solution;
    setLetters(all);
  };

  const clearBoard = () => {
    setLetters({});
    setFinished(null);
    setUsedReveal(false);
    setSeconds(0);
  };

  /* --------------------------------------------------------- win detection */

  useEffect(() => {
    if (finished || !hydrated) return;
    if (grid.cells.size === 0) return;
    if (!isSolved(grid, letters)) return;

    const result: CrosswordResult = usedReveal ? "revealed" : "solved";
    setFinished(result);
    setRunning(false);

    if (isDaily) {
      setStats(recordDailyResult(today, result === "solved", seconds));
      markDayCompleted(today, result);
      setHistory(loadHistory());
    } else if (archiveDay !== null) {
      markDayCompleted(archiveDay, result);
      setHistory(loadHistory());
    }
  }, [
    archiveDay,
    finished,
    grid,
    hydrated,
    isDaily,
    letters,
    seconds,
    today,
    usedReveal,
  ]);

  /* ----------------------------------------------------------------- modes */

  const openBoard = (p: CrosswordPuzzle) => {
    setPuzzle(p);
    setLetters({});
    setFinished(null);
    setUsedReveal(false);
    setSeconds(0);
    setRunning(true);
  };

  const startDaily = () => {
    setMode("daily");
    setArchiveDay(null);
    setPuzzle(puzzleForDay(today));
    setLetters(loadProgress(today));
    setFinished(null);
    setUsedReveal(false);
    setSeconds(0);
    setRunning(true);
  };

  const startPractice = () => {
    setMode("practice");
    setArchiveDay(null);
    const p = pickPracticePuzzle(loadRecent(), today);
    pushRecent(p.id);
    openBoard(p);
  };

  const openArchive = () => {
    setMode("archive");
    setRunning(false);
  };

  const playArchiveDay = (day: number) => {
    setMode("daily");
    setArchiveDay(day);
    openBoard(puzzleForDay(day));
  };

  /* ----------------------------------------------------------------- share */

  const shareResult = async () => {
    const label = isDaily
      ? `Daily Crossword #${today - LAUNCH_DAY_INDEX + 1}`
      : archiveDay !== null
        ? `Crossword ${dateFromDayIndex(archiveDay).toISOString().slice(0, 10)}`
        : `Practice Crossword`;
    const text = [
      `Skycally ${label}`,
      `${finished === "solved" ? "Solved clean" : "Finished with reveals"} in ${formatClock(seconds)} — ${grid.cells.size} squares, ${grid.wordCells.length} entries.`,
      `${SITE_URL}${PATH}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Result copied to clipboard");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const printPdf = async () => {
    const subtitle = isDaily
      ? formatDateLong(today)
      : archiveDay !== null
        ? formatDateLong(archiveDay)
        : "Practice puzzle";
    try {
      toast.info("Building your printable PDF…");
      await exportCrosswordPdf(
        puzzle,
        subtitle,
        `skycally-crossword-${puzzle.id}.pdf`,
      );
      toast.success("PDF downloaded — grid on page 1, answer key on page 2.");
    } catch {
      toast.error("Could not build the PDF. Please try again.");
    }
  };

  /* ------------------------------------------------------------------ view */

  const activeClue =
    activeWordIndex === null ? null : puzzle.words[activeWordIndex];

  const solveRate = stats.played
    ? Math.round((stats.solved / stats.played) * 100)
    : 0;

  return (
    <ToolPageShell
      title="Daily Crossword Puzzle"
      description="Solve a fresh crossword every day, play unlimited practice puzzles, browse the free archive, or print any puzzle with its answer key."
      showFileDisclaimer={false}
    >
      {/* Mode tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <ModeTab
          active={isDaily}
          onClick={startDaily}
          label="Daily"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <ModeTab
          active={mode === "practice"}
          onClick={startPractice}
          label="Practice"
          icon={<RefreshCw className="w-4 h-4" />}
        />
        <ModeTab
          active={mode === "archive"}
          onClick={openArchive}
          label="Archive"
          icon={<Calendar className="w-4 h-4" />}
        />
        {isDaily && (
          <span className="ml-auto text-xs text-muted-foreground">
            Puzzle #{today - LAUNCH_DAY_INDEX + 1}
          </span>
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
          month={month}
          setMonth={setMonth}
          history={history}
          onPick={playArchiveDay}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Board column */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm font-mono">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                {formatClock(seconds)}
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.filled}/{progress.total} squares filled
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {puzzle.title}
              </span>
            </div>

            {/* Active clue bar */}
            <div
              className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
              aria-live="polite"
            >
              {activeClue ? (
                <>
                  <span className="font-semibold">
                    {activeClue.number} {activeClue.direction === "across" ? "Across" : "Down"}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>{activeClue.clue}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({activeClue.answer.length})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Pick a square to start.</span>
              )}
            </div>

            {/* Grid */}
            <div
              className="relative w-full select-none touch-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className="mx-auto grid w-full max-w-[560px] gap-[2px]"
                style={{
                  gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
                }}
                role="grid"
                aria-label={`${puzzle.title} crossword grid`}
              >
                {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
                  const r = Math.floor(i / grid.cols);
                  const c = i % grid.cols;
                  const key = cellKey(r, c);
                  const cell = grid.cells.get(key);
                  if (!cell) {
                    return (
                      <div key={key} className="aspect-square" aria-hidden="true" />
                    );
                  }
                  const inWord = activeWordCells.includes(key);
                  const isActive = key === active;
                  const wrong = wrongFlash.includes(key);
                  const value = letters[key] ?? "";
                  const done =
                    (cell.acrossIndex !== null && solvedWords.has(cell.acrossIndex)) ||
                    (cell.downIndex !== null && solvedWords.has(cell.downIndex));

                  return (
                    <div
                      key={key}
                      data-cell={key}
                      role="gridcell"
                      aria-label={`Row ${r + 1} column ${c + 1}${value ? `, letter ${value}` : ", empty"}`}
                      onPointerDown={(e) => onPointerDown(e, key)}
                      className={[
                        "relative aspect-square cursor-pointer rounded-[3px] border transition-colors",
                        isActive
                          ? "border-primary"
                          : "border-border/70",
                        wrong
                          ? "bg-destructive/60"
                          : isActive
                            ? "bg-primary/40"
                            : inWord
                              ? "bg-primary/25"
                              : done
                                ? "bg-emerald-500/15"
                                : "bg-muted",
                      ].join(" ")}
                    >
                      {cell.number !== null && (
                        <span className="pointer-events-none absolute left-[2px] top-0 text-[8px] leading-tight text-muted-foreground sm:text-[10px]">
                          {cell.number}
                        </span>
                      )}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase leading-none sm:text-lg">
                        {value}
                      </span>
                    </div>
                  );

                })}
              </div>

              {/* Hidden input drives the native mobile keyboard. */}
              <input
                ref={inputRef}
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) typeLetter(v[v.length - 1]);
                  e.target.value = "";
                }}
                onKeyDown={onKeyDown}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-label="Crossword letter input"
                className="absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 opacity-0"
              />
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={checkLetter}>
                <Check className="mr-1.5 h-4 w-4" /> Check letter
              </Button>
              <Button size="sm" variant="outline" onClick={checkWord}>
                <Lightbulb className="mr-1.5 h-4 w-4" /> Check entry
              </Button>
              <Button size="sm" variant="outline" onClick={revealWord}>
                <Eye className="mr-1.5 h-4 w-4" /> Reveal entry
              </Button>
              <Button size="sm" variant="outline" onClick={revealPuzzle}>
                <Eye className="mr-1.5 h-4 w-4" /> Reveal all
              </Button>
              <Button size="sm" variant="outline" onClick={clearBoard}>
                <Eraser className="mr-1.5 h-4 w-4" /> Clear
              </Button>
              <Button size="sm" variant="outline" onClick={printPdf}>
                <Printer className="mr-1.5 h-4 w-4" /> Print PDF
              </Button>
              {mode === "practice" && (
                <Button size="sm" onClick={startPractice}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> New practice puzzle
                </Button>
              )}
            </div>

            {finished && (
              <div className="mt-5 rounded-xl border border-border bg-card p-5 text-center">
                <h2 className="text-lg font-bold">
                  {finished === "solved" ? "Solved!" : "Grid complete"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {finished === "solved"
                    ? `You filled all ${grid.cells.size} squares in ${formatClock(seconds)} with no reveals.`
                    : `All ${grid.cells.size} squares are filled — you used the reveal helper on this one.`}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={shareResult}>
                    <Share2 className="mr-1.5 h-4 w-4" /> Share result
                  </Button>
                  <Button size="sm" variant="outline" onClick={startPractice}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Play another
                  </Button>
                  <Button size="sm" variant="outline" onClick={printPdf}>
                    <Printer className="mr-1.5 h-4 w-4" /> Print this puzzle
                  </Button>
                </div>
              </div>
            )}

            {hydrated && (
              <div className="mx-auto mt-6 grid max-w-md grid-cols-4 gap-3">
                <StatBox label="Played" value={stats.played} />
                <StatBox label="Solve %" value={solveRate} />
                <StatBox label="Streak" value={stats.currentStreak} />
                <StatBox label="Best" value={stats.bestStreak} />
              </div>
            )}
          </div>

          {/* Clue column */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <ClueList
              heading="Across"
              entries={grid.across}
              activeIndex={activeWordIndex}
              solved={solvedWords}
              onSelect={selectWord}
            />
            <ClueList
              heading="Down"
              entries={grid.down}
              activeIndex={activeWordIndex}
              solved={solvedWords}
              onSelect={selectWord}
            />
          </div>
        </div>
      )}

      <AdZone id="crossword-mid" size="728x90" />

      <HowToUse
        steps={[
          "Tap a square (or swipe across a row or down a column) to pick an entry — tapping the same square again flips between Across and Down.",
          "Type letters with your keyboard or phone keypad; the cursor advances automatically, and Backspace steps back through the entry.",
          "Stuck? Use Check letter or Check entry to test what you have, or Reveal entry to open one answer. Solving with no reveals keeps your daily streak.",
          "Prefer paper? Press Print PDF for a two-page worksheet: the blank grid with all clues on page 1 and the full answer key on page 2.",
        ]}
      />

      <ToolSeoContent
        title="Free Daily Crossword Puzzle — Play Online or Print with Answers"
        description="Solve a free crossword puzzle every day online, play unlimited practice grids, browse a free archive of every past daily puzzle, and download printable PDF worksheets with answer keys — no signup and no paywall."
        body={[
          "This daily crossword gives you a brand-new grid every single day, playable straight in your browser on a phone, tablet, or desktop. Each puzzle is a hand-built criss-cross grid of interlocking Across and Down entries with original clues written for this site — geography, science, food, music, history, sport, technology, animals, and everyday vocabulary all take their turn. Tap or swipe to pick an entry, type with your normal keyboard, and the cursor advances through the entry for you so you can keep your eyes on the clues instead of the caret.",
          "The tool is built for people who want to actually finish a puzzle rather than get stonewalled. Check letter tells you whether the single square under the cursor is right, Check entry scans the whole word you're working on and highlights any wrong letters, and Reveal entry opens a single answer when a clue simply won't come. Every square you fill correctly lights the entry green so you can see progress at a glance, and a running timer tracks how long today's grid took you. Solving the daily grid without using a reveal extends your streak; the reveal helpers are always there when you'd rather finish than stall.",
          "Everything is free, permanently. The Archive tab shows a calendar of every daily puzzle since launch, and any past date is playable in full at no cost — no subscription and no account, which is the main thing that separates this from most newspaper crosswords. Practice mode pulls unlimited extra grids from the same puzzle bank whenever you want more, and practice results never touch your daily streak. If you'd rather solve on paper, or you're a teacher printing a class set, Print PDF builds a clean two-page A4 worksheet from the real puzzle data: the numbered blank grid with the complete Across and Down clue lists on page one, and the filled answer key on page two.",
        ]}
        faqs={[
          {
            question: "Is this daily crossword really free?",
            answer:
              "Yes. The daily puzzle, the complete archive of past puzzles, unlimited practice mode, and the printable PDF worksheets are all free. There is no signup, no account, and no paywall at any point.",
          },
          {
            question: "How often does a new crossword appear?",
            answer:
              "A new puzzle rolls over once per calendar day (UTC), using the same day-index convention as the other daily games on this site. Everyone who visits on the same day gets the same grid.",
          },
          {
            question: "Can I play crossword puzzles I missed?",
            answer:
              "Yes. Open the Archive tab to browse a month-by-month calendar of every daily puzzle since launch and play any past date in full, for free.",
          },
          {
            question: "How do I switch between Across and Down?",
            answer:
              "Tap the same square twice to flip direction, press the space bar on a keyboard, or swipe along a row for Across and down a column for Down. The clue bar above the grid always shows the entry you're currently in.",
          },
          {
            question: "Can I print the crossword with the answers?",
            answer:
              "Yes. Press Print PDF and you'll get a two-page A4 worksheet generated from the real puzzle data — the numbered blank grid with all clues on page one, and the complete answer key on page two.",
          },
          {
            question: "Does using a hint break my streak?",
            answer:
              "Check letter and Check entry are free to use and never affect your streak. Revealing an answer marks the puzzle as completed with reveals, which keeps your progress saved but does not extend the solve streak.",
          },
          {
            question: "Is my progress saved if I close the tab?",
            answer:
              "Yes. The letters you've entered on the current daily puzzle, along with your streak and completion history, are stored locally in your own browser. Nothing is uploaded to a server.",
          },
          {
            question: "Are these crossword clues original?",
            answer:
              "Yes. Every grid, answer, and clue in this tool was authored specifically for Skycally. No clues or grids are reproduced from newspaper crosswords.",
          },
        ]}
      />

      {/* Contextual internal-links block */}
      <section className="mx-auto mt-6 max-w-2xl space-y-2 px-1 pb-6 text-sm text-muted-foreground">
        <p>
          If you like a daily puzzle habit, try{" "}
          <a href="/tools/word-groups" className="underline hover:text-foreground">
            Word Groups
          </a>{" "}
          — sort 16 words into 4 hidden categories, with the same free archive.
        </p>
        <p>
          Prefer guessing one word at a time? Play{" "}
          <a href="/tools/wordle" className="underline hover:text-foreground">
            Wordle
          </a>{" "}
          for the classic six-guess challenge.
        </p>
        <p>
          For a slower, no-pressure word hunt, our{" "}
          <a href="/tools/word-search" className="underline hover:text-foreground">
            Word Search
          </a>{" "}
          hides words in a grid you scan at your own pace.
        </p>
      </section>

      <RelatedTools currentSlug="crossword" />
    </ToolPageShell>
  );
}

/* ------------------------------------------------------------ subcomponents */

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
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
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
      <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ClueList({
  heading,
  entries,
  activeIndex,
  solved,
  onSelect,
}: {
  heading: string;
  entries: { index: number; word: { number: number; clue: string; answer: string } }[];
  activeIndex: number | null;
  solved: Set<number>;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">{heading}</h2>
      <ul className="max-h-[320px] space-y-0.5 overflow-y-auto pr-1 lg:max-h-[420px]">
        {entries.map(({ index, word }) => {
          const isActive = index === activeIndex;
          const isDone = solved.has(index);
          return (
            <li key={`${heading}-${word.number}`}>
              <button
                onClick={() => onSelect(index)}
                className={`flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                  isActive
                    ? "bg-primary/20 font-medium"
                    : "hover:bg-muted"
                } ${isDone ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}`}
              >
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums">
                  {word.number}
                </span>
                <span className="min-w-0">
                  {word.clue}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({word.answer.length})
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
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
  history: Record<string, CrosswordResult>;
  onPick: (day: number) => void;
}) {
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const startWeekday = first.getUTCDay();
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

  const monthLabel = new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">{monthLabel}</div>
        <button
          onClick={nextMonth}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-xs text-muted-foreground">
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
          const dot =
            state === "solved"
              ? "#22c55e"
              : state === "revealed"
                ? "#f59e0b"
                : "transparent";
          return (
            <button
              key={i}
              onClick={() => !disabled && onPick(dayIdx)}
              disabled={disabled}
              className={`flex aspect-square flex-col items-center justify-center rounded-md border text-sm ${
                disabled
                  ? "cursor-not-allowed border-transparent text-muted-foreground/40"
                  : "border-border text-foreground hover:border-foreground/40"
              } ${dayIdx === today ? "ring-2 ring-foreground/40" : ""}`}
            >
              <span>{d}</span>
              <span
                className="mt-0.5 h-1.5 w-1.5 rounded-full"
                style={{ background: dot }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Green dot = solved clean, amber dot = finished with reveals. Every past
        puzzle is free to play.
      </p>
    </div>
  );
}

// Referenced so the full puzzle bank stays in the module graph.
void CROSSWORD_PUZZLES;
