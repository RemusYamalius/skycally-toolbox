import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  Footprints,
  Moon,
  Printer,
  RefreshCw,
  Share2,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { buildPageMeta_with_schema, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound } from "@/lib/sound";

import { canMove, colOf, generateMaze, rowOf, solveMaze, type Dir, type Maze } from "@/lib/maze/generator";
import { createThemeCycler, THEME_PAIRS, type ThemePair } from "@/lib/maze/themes";
import {
  DEFAULT_PREFS,
  DEFAULT_STATS,
  formatClock,
  loadPrefs,
  loadStats,
  recordCompletion,
  savePrefs,
  type MazePrefs,
  type MazeStats,
} from "@/lib/maze/storage";
import { exportMazePdf } from "@/lib/maze/pdf";

const PATH = "/tools/maze-puzzle";
const TITLE = "Maze Puzzle Online Free — Play & Print, No Signup | Skycally";
const DESCRIPTION =
  "Play a maze game online free, then print it. Endless maze generator with an answer key, four sizes, emoji themes and sound. No signup, no premium tier, no personal-use-only limit.";

const DIFFICULTIES = [
  { id: "small", label: "Small", rows: 11, cols: 11 },
  { id: "medium", label: "Medium", rows: 17, cols: 17 },
  { id: "large", label: "Large", rows: 25, cols: 25 },
  { id: "huge", label: "Huge", rows: 35, cols: 35 },
] as const;

type DifficultyId = (typeof DIFFICULTIES)[number]["id"];

export const Route = createFileRoute("/tools/maze-puzzle")({
  head: () =>
    buildPageMeta_with_schema({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      schema: {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "Maze Puzzle",
        description:
          "A free online maze game with an endless supply of freshly generated mazes, four real grid sizes, emoji start-and-goal themes, and a printable two-page PDF worksheet with an answer key.",
        url: `${SITE_URL}${PATH}`,
        genre: ["Puzzle", "Casual"],
        playMode: "SinglePlayer",
        applicationCategory: "Game",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Endless freshly generated mazes, never the same twice",
          "Four real grid sizes from 11×11 to 35×35",
          "Play with arrow keys, WASD, swipe, or on-screen D-pad",
          "Breadcrumb trail toggle to see where you have been",
          "Optional fog of war mode",
          "Reveal the single correct path at any time",
          "Printable A4 PDF with a separate answer-key page",
          "Live timer, move counter and local best times",
          "Sound effects with a mute toggle",
          "Runs entirely in your browser, no signup",
        ],
      },
    }),
  component: MazePuzzlePage,
});

function MazePuzzlePage() {
  const [difficulty, setDifficulty] = useState<DifficultyId>("medium");
  const diff = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const cycler = useRef(createThemeCycler());
  const [theme, setTheme] = useState<ThemePair>(THEME_PAIRS[0]);
  const [maze, setMaze] = useState<Maze>(() => generateMaze(17, 17));
  const [player, setPlayer] = useState(0);
  const [trail, setTrail] = useState<Set<number>>(() => new Set([0]));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [path, setPath] = useState<number[] | null>(null);

  const [prefs, setPrefs] = useState<MazePrefs>(DEFAULT_PREFS);
  const [stats, setStats] = useState<MazeStats>(DEFAULT_STATS);
  const [hydrated, setHydrated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; color: string }[]>([]);
  const burstStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const burstedForRef = useRef(false);

  const BURST_MS = 820;

  /* ------------------------------------------------------------- lifecycle */

  const newMaze = useCallback((d: (typeof DIFFICULTIES)[number]) => {
    burstStartRef.current = null;
    particlesRef.current = [];
    burstedForRef.current = false;
    const m = generateMaze(d.rows, d.cols);
    setMaze(m);
    setPlayer(m.start);
    setTrail(new Set([m.start]));
    setTheme(cycler.current.next());
    setMoves(0);
    setSeconds(0);
    setSolved(false);
    setRevealed(false);
    setPath(null);
    setRunning(true);
  }, []);

  useEffect(() => {
    setHydrated(true);
    setPrefs(loadPrefs());
    setStats(loadStats());
    newMaze(DIFFICULTIES[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running || solved) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, solved]);

  const sfx = useCallback(
    (type: Parameters<typeof playSound>[0]) => {
      if (!prefs.muted) playSound(type);
    },
    [prefs.muted],
  );

  const updatePrefs = (patch: Partial<MazePrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  };

  /* ---------------------------------------------------------------- moving */

  const move = useCallback(
    (dir: Dir) => {
      if (solved) return;
      setPlayer((cur) => {
        const next = canMove(maze, cur, dir);
        if (next === null) {
          if (!prefs.muted) playSound("hit");
          return cur;
        }
        if (!prefs.muted) playSound("move");
        setMoves((m) => m + 1);
        setTrail((t) => {
          const s = new Set(t);
          s.add(next);
          return s;
        });
        if (next === maze.end) {
          setSolved(true);
          setRunning(false);
          if (!prefs.muted) playSound("finish");
          setStats(recordCompletion(difficulty, seconds, moves + 1, revealed));
        }
        return next;
      });
    },
    [maze, solved, prefs.muted, difficulty, seconds, moves, revealed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "n",
        ArrowDown: "s",
        ArrowLeft: "w",
        ArrowRight: "e",
        w: "n",
        a: "w",
        s: "s",
        d: "e",
        W: "n",
        A: "w",
        S: "s",
        D: "e",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // Swipe gestures on the board (pointer events, same approach as the crossword grid).
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "e" : "w");
    else move(dy > 0 ? "s" : "n");
  };

  /* ------------------------------------------------------------- board size */

  // Stable board size in CSS px, updated only when the container actually
  // resizes (ResizeObserver), never re-measured inside the draw/animation
  // loop. Both the canvas AND the DOM emoji overlay below derive every
  // position from this single value, so they can never drift apart.
  const [boardPx, setBoardPx] = useState(520);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      // wrapRef has its own horizontal padding (p-3), but the inner board
      // box uses `w-full`, which resolves to 100% of wrapRef's *content*
      // width — i.e. clientWidth minus that padding, not clientWidth
      // itself. Using raw clientWidth here made boardPx a few pixels
      // larger than the board's real rendered width on any viewport where
      // that width isn't already clamped by the 560px cap (which is why
      // desktop looked fine but mobile — where the board is far below
      // 560px — showed a visible, growing offset between the canvas grid
      // and the absolutely-positioned emoji overlay, worst furthest from
      // the top-left corner). Subtracting the actual computed padding
      // keeps boardPx exactly equal to the board's true rendered width.
      const style = getComputedStyle(el);
      const paddingX = parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
      const available = el.clientWidth - paddingX;
      setBoardPx(Math.max(200, Math.min(available, 560)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = 6;
  const cell = (boardPx - pad * 2) / Math.max(maze.rows, maze.cols);
  const cellPointOf = useCallback(
    (i: number) => ({
      left: pad + colOf(maze, i) * cell + cell / 2,
      top: pad + rowOf(maze, i) * cell + cell / 2,
    }),
    [maze, cell],
  );
  const emojiFontPx = Math.max(8, Math.round(cell * 0.82));

  const pr = rowOf(maze, player);
  const pc = colOf(maze, player);
  const fogRadius = 3;
  const endHidden =
    prefs.fog &&
    !solved &&
    Math.max(Math.abs(rowOf(maze, maze.end) - pr), Math.abs(colOf(maze, maze.end) - pc)) > fogRadius;

  /* -------------------------------------------------------------- painting */

  // The canvas ONLY draws graphics now: walls, trail tint, fog, and the
  // solved-path highlight. It never calls fillText for emoji. This is a
  // deliberate architectural change, not a tweak: color emoji rendered via
  // canvas fillText inside a continuous requestAnimationFrame loop proved
  // unreliable (glyphs fading/greening over time, only fixed by a full
  // page reload) across two independently-written implementations that
  // each carefully reset every piece of 2D context state every frame. Since
  // resetting canvas state did not fix it, the emoji are moved out of the
  // canvas entirely and rendered as real DOM elements instead (see the
  // overlay below), which cannot be affected by canvas text-rendering
  // behavior no matter what was actually causing it.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(boardPx * dpr)) {
      // Only the backing-store resolution is set here — never canvas.style
      // width/height. Setting an inline pixel style would out-rank the
      // responsive `h-full w-full` CSS classes on this element (inline
      // style always wins over class rules) and silently reintroduce a
      // fixed-pixel canvas size regardless of the actual container width,
      // which is exactly what caused the mobile horizontal-overflow bug.
      canvas.width = boardPx * dpr;
      canvas.height = boardPx * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, boardPx, boardPx);

    const styles = getComputedStyle(document.documentElement);
    const fg = `hsl(${styles.getPropertyValue("--foreground").trim() || "0 0% 100%"})`;

    // trail + fog + solution
    for (let r = 0; r < maze.rows; r += 1) {
      for (let c = 0; c < maze.cols; c += 1) {
        const i = r * maze.cols + c;
        const x = pad + c * cell;
        const y = pad + r * cell;
        const hidden = prefs.fog && !solved && Math.max(Math.abs(r - pr), Math.abs(c - pc)) > fogRadius;
        if (hidden) {
          ctx.fillStyle = "rgba(0,0,0,0.92)";
          ctx.fillRect(x - 0.5, y - 0.5, cell + 1, cell + 1);
          continue;
        }
        if (path && path.includes(i)) {
          ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
          ctx.fillRect(x, y, cell, cell);
        } else if (prefs.trail && trail.has(i) && i !== player && i !== maze.start) {
          ctx.fillStyle = "rgba(34, 197, 94, 0.20)";
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }

    // walls
    ctx.strokeStyle = fg;
    ctx.lineWidth = Math.max(1, Math.min(3, cell * 0.16));
    ctx.lineCap = "square";
    ctx.beginPath();
    for (let r = 0; r < maze.rows; r += 1) {
      for (let c = 0; c < maze.cols; c += 1) {
        const w = maze.cells[r * maze.cols + c];
        const x = pad + c * cell;
        const y = pad + r * cell;
        const hidden = prefs.fog && !solved && Math.max(Math.abs(r - pr), Math.abs(c - pc)) > fogRadius;
        if (hidden) continue;
        if (w.n) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cell, y);
        }
        if (w.w) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cell);
        }
        if (w.e) {
          ctx.moveTo(x + cell, y);
          ctx.lineTo(x + cell, y + cell);
        }
        if (w.s) {
          ctx.moveTo(x, y + cell);
          ctx.lineTo(x + cell, y + cell);
        }
      }
    }
    ctx.stroke();

    // victory burst particles (drawn on top; circles only, never text)
    const started = burstStartRef.current;
    if (started !== null && particlesRef.current.length) {
      const elapsed = performance.now() - started;
      const life = Math.min(1, elapsed / BURST_MS);
      for (const p of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, 1 - life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }, [maze, player, trail, prefs.trail, prefs.fog, path, solved, boardPx, cell, pad, pr, pc, fogRadius]);

  // repaint on state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // animation loop: only needed for the victory particle burst now (the
  // goal pulse/glow is pure CSS on the DOM overlay, see below). It is
  // started directly from the "spawn burst" effect below, at the exact
  // moment burstStartRef is set — not from here — because refs don't
  // trigger effects to re-run, so a separate effect watching `solved`
  // would fire before burstStartRef existed and only draw one static
  // frame instead of animating. This effect only owns cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // spawn burst exactly once per solve, and drive its own animation loop
  useEffect(() => {
    if (!solved) {
      burstedForRef.current = false;
      burstStartRef.current = null;
      particlesRef.current = [];
      return;
    }
    if (burstedForRef.current) return;
    burstedForRef.current = true;
    const cx = pad + colOf(maze, player) * cell + cell / 2;
    const cy = pad + rowOf(maze, player) * cell + cell / 2;
    const colors = ["#fbbf24", "#fde68a", "#ffffff", "#f59e0b"];
    const count = 16;
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 1.4 + Math.random() * 2.2;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.max(1.5, cell * (0.06 + Math.random() * 0.07)),
        color: colors[i % colors.length],
      };
    });
    burstStartRef.current = performance.now();

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const started = burstStartRef.current;
      if (started === null) {
        rafRef.current = null;
        return;
      }
      const elapsed = performance.now() - started;
      if (elapsed >= BURST_MS) {
        burstStartRef.current = null;
        particlesRef.current = [];
        draw();
        rafRef.current = null;
        return;
      }
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [solved, maze, player, cell, pad, draw]);

  /* ---------------------------------------------------------------- actions */

  const onReveal = () => {
    sfx("click");
    setRevealed(true);
    setPath(solveMaze(maze, player, maze.end));
    toast.success("Solution path revealed");
  };

  const onPrint = async () => {
    sfx("click");
    try {
      await exportMazePdf(
        maze,
        `${diff.label} ${maze.rows}×${maze.cols} — ${theme.label}`,
        `skycally-maze-${diff.id}.pdf`,
      );
      toast.success("PDF downloaded — page 2 is the answer key");
    } catch {
      toast.error("Could not build the PDF. Please try again.");
    }
  };

  const onShare = async () => {
    sfx("click");
    const text = [
      `Maze Puzzle — ${diff.label} (${maze.rows}×${maze.cols})`,
      `⏱ ${formatClock(seconds)}  ·  👣 ${moves} moves`,
      revealed ? "Path revealed 👀" : "Solved without revealing 🏆",
      `${SITE_URL}${PATH}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Result copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const best = stats.bestTimes[difficulty];
  const shortest = useMemo(() => solveMaze(maze).length - 1, [maze]);

  const startPt = cellPointOf(maze.start);
  const endPt = cellPointOf(maze.end);
  const playerPt = cellPointOf(player);
  const showStartMarker = maze.start !== player;

  /* -------------------------------------------------------------- rendering */

  return (
    <ToolPageShell
      title="Maze Puzzle"
      description="Play a fresh maze online free, then print it with an answer key. Four real sizes, emoji themes, fog of war — no signup and no usage limits."
      showFileDisclaimer={false}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          {/* Board */}
          <div
            ref={wrapRef}
            className="flex touch-none justify-center rounded-2xl border border-border bg-card p-3"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <div className="relative aspect-square w-full" style={{ maxWidth: `${boardPx}px` }}>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full rounded-lg"
                role="img"
                aria-label={`${diff.label} maze, ${maze.rows} by ${maze.cols}. ${theme.label}. Move with the arrow keys.`}
              />

              {/* Emoji overlay — real DOM text, not canvas fillText. Colors
                  are whatever the browser's native emoji font renders,
                  fixed for the life of the element; nothing here can fade
                  or shift color over time no matter how long the maze runs. */}
              <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
                {!endHidden && (
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      left: endPt.left,
                      top: endPt.top,
                      width: cell,
                      height: cell,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {!solved && (
                      <span
                        className="maze-goal-glow absolute rounded-full"
                        style={{ width: cell * 0.88, height: cell * 0.88 }}
                      />
                    )}
                    <span className="relative" style={{ fontSize: emojiFontPx, lineHeight: 1 }}>
                      {theme.end}
                    </span>
                  </div>
                )}

                {showStartMarker && (
                  <span
                    className="absolute"
                    style={{
                      left: startPt.left,
                      top: startPt.top,
                      fontSize: emojiFontPx,
                      lineHeight: 1,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {theme.start}
                  </span>
                )}

                <span
                  className="absolute"
                  style={{
                    left: playerPt.left,
                    top: playerPt.top,
                    fontSize: emojiFontPx,
                    lineHeight: 1,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {theme.start}
                </span>
              </div>
            </div>
          </div>

          {solved && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-center">
              <p className="font-display text-lg font-bold">
                {theme.end} Solved in {formatClock(seconds)} · {moves} moves
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {revealed
                  ? "Path was revealed — no best time recorded."
                  : `Shortest possible route was ${shortest} moves.`}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button onClick={onShare} variant="outline" size="sm">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share result
                </Button>
                <Button onClick={() => newMaze(diff)} size="sm">
                  <RefreshCw className="mr-1.5 h-4 w-4" /> New maze
                </Button>
              </div>
            </div>
          )}

          {/* D-pad */}
          <div className="mt-4 flex justify-center">
            <div className="grid grid-cols-3 gap-2">
              <span />
              <PadBtn label="Move up" onClick={() => move("n")}>
                <ArrowUp className="h-5 w-5" />
              </PadBtn>
              <span />
              <PadBtn label="Move left" onClick={() => move("w")}>
                <ArrowLeft className="h-5 w-5" />
              </PadBtn>
              <PadBtn label="Move down" onClick={() => move("s")}>
                <ArrowDown className="h-5 w-5" />
              </PadBtn>
              <PadBtn label="Move right" onClick={() => move("e")}>
                <ArrowRight className="h-5 w-5" />
              </PadBtn>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Time" value={formatClock(seconds)} icon={<Timer className="h-3.5 w-3.5" />} />
            <Stat label="Moves" value={String(moves)} icon={<Footprints className="h-3.5 w-3.5" />} />
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Difficulty</h2>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    sfx("click");
                    setDifficulty(d.id);
                    newMaze(d);
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    d.id === difficulty ? "border-primary bg-primary/15" : "border-border hover:border-foreground/40"
                  }`}
                >
                  {d.label}
                  <span className="block text-[11px] text-muted-foreground">
                    {d.rows}×{d.cols}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                sfx("click");
                newMaze(diff);
              }}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> New maze
            </Button>
            <Button className="w-full" variant="outline" onClick={onReveal}>
              <Eye className="mr-1.5 h-4 w-4" /> Reveal path
            </Button>
            <Button className="w-full" variant="outline" onClick={onPrint}>
              <Printer className="mr-1.5 h-4 w-4" /> Print PDF + answer key
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Options</h2>
            <div className="space-y-2">
              <Toggle
                on={prefs.trail}
                onClick={() => {
                  sfx("click");
                  updatePrefs({ trail: !prefs.trail });
                }}
                icon={<Footprints className="h-4 w-4" />}
                label="Breadcrumb trail"
              />
              <Toggle
                on={prefs.fog}
                onClick={() => {
                  sfx("click");
                  updatePrefs({ fog: !prefs.fog });
                }}
                icon={<Moon className="h-4 w-4" />}
                label="Fog of war"
              />
              <Toggle
                on={!prefs.muted}
                onClick={() => updatePrefs({ muted: !prefs.muted })}
                icon={prefs.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                label={prefs.muted ? "Sound off" : "Sound on"}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Theme: {theme.start} {theme.label} {theme.end}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Your stats</h2>
            <dl className="space-y-1 text-sm">
              <Row label="Mazes completed" value={hydrated ? String(stats.completed) : "—"} />
              <Row label="Total moves" value={hydrated ? String(stats.totalMoves) : "—"} />
              <Row
                label={`Best time (${diff.label})`}
                value={hydrated && best !== undefined ? formatClock(best) : "—"}
              />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Stats stay in your own browser. Nothing is uploaded.</p>
          </div>
        </aside>
      </div>

      {/* Contextual internal links */}
      <section className="mt-10 rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-display text-lg font-bold">More casual browser games</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enjoy solving mazes? Try the{" "}
          <Link to="/tools/sliding-puzzle" className="underline hover:text-foreground">
            Sliding Puzzle
          </Link>
          , clear the board in{" "}
          <Link to="/tools/minesweeper" className="underline hover:text-foreground">
            Minesweeper
          </Link>
          , sharpen your logic with{" "}
          <Link to="/tools/sudoku" className="underline hover:text-foreground">
            Sudoku
          </Link>
          , or test your recall in{" "}
          <Link to="/tools/memory-match" className="underline hover:text-foreground">
            Memory Match
          </Link>
          . Every one of them is free, in-browser and signup-free.
        </p>
      </section>

      <AdZone id="maze-puzzle-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick a size — Small 11×11 for kids, up to Huge 35×35 for a real challenge.",
          "Guide the emoji from the start to the goal with arrow keys, WASD, swipes, or the on-screen D-pad.",
          "Hit New Maze for a fresh layout, or Print PDF to download the maze plus a separate answer-key page.",
        ]}
      />

      <ToolSeoContent
        title="Maze puzzle online free — play it, then print it"
        description="An endless maze generator you can actually play in the browser, with a free printable version and answer key for classrooms, tutoring and home practice."
        body={[
          "Most maze sites only give you a picture. You choose a size, they render one static image, and the only thing left to do is print it. This maze puzzle works the other way round: every maze is playable right here in the browser. You steer the emoji character with the arrow keys or WASD on a computer, with swipes on a phone or tablet, or with the on-screen direction pad on any device. A live timer and move counter run while you play, a breadcrumb trail marks every square you have already stepped on so backtracking is obvious, and an optional fog of war mode hides everything more than a few squares away for a much harder run.",
          "Each maze is built the moment you ask for one, using a randomised depth-first carving method. In plain language: the program starts in one square and keeps tunnelling into a neighbouring square it has not visited yet, backing up whenever it hits a dead end, until every single square has been reached exactly once. Because no square is ever connected twice, the finished maze has exactly one route between any two points — no loops, no shortcuts, and no sealed-off areas. That is why every maze here is guaranteed solvable, and why Reveal Path can always trace the one true route from where you are standing to the goal.",
          "The four sizes are real grid dimensions, not decorative labels. Small is 11×11 and suits young children or a quick coffee-break solve. Medium is 17×17, a comfortable few minutes. Large is 25×25 and starts to demand a plan rather than guesswork. Huge is 35×35, where the fog of war option turns the puzzle into genuine exploration. Switching size regenerates immediately, and each size keeps its own best time in your browser so you can chase a personal record on the one you like most. A rotating set of emoji start-and-goal pairs — monkey and banana, bee and sunflower, rocket and planet, and many more — cycles through without repeating so consecutive mazes always look different.",
          "The Print PDF button turns the exact maze on your screen into a clean black-and-white A4 worksheet: page one is the blank maze marked with S and E, page two is the same maze with the solution drawn through it. That is a ready-made answer key for teachers, tutors and homeschooling parents, and there is no restriction attached to it. No account, no email, no premium tier, and no personal-use-only clause — print one for a child at the kitchen table or thirty for a classroom, and use them commercially if you want to. Nothing you do here is uploaded anywhere; the mazes are generated on your device and your stats stay in your own browser.",
        ]}
        faqs={[
          {
            question: "Is every maze actually solvable?",
            answer:
              "Yes. The generation method connects every square exactly once, which mathematically guarantees a single unbroken route between the start and the goal. There are no dead zones and no unreachable exits.",
          },
          {
            question: "Can I print this maze?",
            answer:
              "Yes. Press Print PDF and you get a two-page A4 file of the exact maze on screen: a blank maze to solve on paper, and the same maze with the solution drawn in.",
          },
          {
            question: "Is there an answer key?",
            answer:
              "Page two of the downloaded PDF is the answer key. On screen you can also press Reveal Path to highlight the correct route from your current position without ending the game.",
          },
          {
            question: "Can I make it harder?",
            answer:
              "Switch to Large (25×25) or Huge (35×35), and turn on Fog of War so only the squares near you are visible. You can also turn the breadcrumb trail off so nothing marks where you have already been.",
          },
          {
            question: "Is this free for classroom or commercial use?",
            answer:
              "Yes, with no restrictions. There is no premium tier and no personal-use-only limit — print as many mazes as you need for a class, a worksheet pack, or a commercial project.",
          },
          {
            question: "Does it work on mobile?",
            answer:
              "Yes. Swipe in any direction on the maze to move, or tap the on-screen direction pad. The board scales to your screen width, and PDF export works on phones and tablets too.",
          },
          {
            question: "Can I turn off the sound?",
            answer:
              "Yes. The Sound on/off toggle in the Options panel mutes every effect, and your choice is remembered in your browser for next time.",
          },
          {
            question: "Does my progress save?",
            answer:
              "Your completed-maze count, total moves and best time per size are stored in your own browser using local storage. Nothing is sent to a server and no account is needed. Clearing browser data clears the stats.",
          },
          {
            question: "Do I need to sign up or install anything?",
            answer: "No. There is no signup, no email, no download and no extension. Open the page and play.",
          },
          {
            question: "Are the mazes ever repeated?",
            answer:
              "Each maze is generated fresh at the moment you request it, so the supply is effectively endless and you will not be handed the same layout twice.",
          },
        ]}
      />

      <RelatedTools currentSlug="maze-puzzle" />
    </ToolPageShell>
  );
}

function PadBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card transition hover:border-foreground/40 active:scale-95"
    >
      {children}
    </button>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        on ? "border-primary bg-primary/15" : "border-border hover:border-foreground/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
