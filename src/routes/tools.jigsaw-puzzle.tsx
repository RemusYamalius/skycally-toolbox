import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Eye, EyeOff, Shuffle, Clock } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { checkSize } from "@/lib/file-utils";
import { DIFFICULTIES, buildPiecePath, generatePieceGrid, type Difficulty } from "@/lib/jigsaw-puzzle/pieces";
import { PRESET_IMAGES, type PresetImage } from "@/lib/jigsaw-puzzle/presets";

const PATH = "/tools/jigsaw-puzzle";
const TITLE = "Photo Jigsaw Puzzle Maker — Turn Any Picture Into a Puzzle | Skycally";
const DESCRIPTION =
  "Free online jigsaw puzzle maker. Upload any photo, or pick a famous painting or wonder of the world, and solve it as a real jigsaw with interlocking pieces. Four difficulty levels, nothing leaves your device.";

export const Route = createFileRoute("/tools/jigsaw-puzzle")({
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
            name: "Photo Jigsaw Puzzle Maker",
            description: DESCRIPTION,
            url: `${SITE_URL}${PATH}`,
            genre: "Puzzle",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: JigsawPuzzlePage,
});

const WORKING_MAX = 640;
const WORKING_MIN = 280;
const TRAY_GAP = 28;

interface PieceState {
  id: string;
  boxW: number;
  boxH: number;
  img: string;
  correctX: number;
  correctY: number;
  x: number;
  y: number;
  locked: boolean;
  z: number;
}

type Stage = "setup" | "loading" | "playing" | "done";

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image."));
    img.src = src;
  });
}

function JigsawPuzzlePage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [customSrc, setCustomSrc] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetImage | null>(null);

  const [pieces, setPieces] = useState<PieceState[]>([]);
  const [boardW, setBoardW] = useState(0);
  const [boardH, setBoardH] = useState(0);
  const [trayH, setTrayH] = useState(0);
  const [ghostSrc, setGhostSrc] = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const zCounter = useRef(1);

  const placedCount = pieces.filter((p) => p.locked).length;
  const totalCount = pieces.length;

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "playing") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (stage === "playing" && totalCount > 0 && placedCount === totalCount) {
      setStage("done");
    }
  }, [placedCount, totalCount, stage]);

  const onUpload = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG or WEBP).");
      return;
    }
    const err = checkSize(f);
    if (err) {
      toast.error(err);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreset(null);
      setCustomSrc(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const startPuzzle = async () => {
    const source = preset ? preset.imageUrl : customSrc;
    if (!source) {
      toast.error("Choose a photo first — upload one or pick an example below.");
      return;
    }
    setStage("loading");
    try {
      const img = await loadImage(source, Boolean(preset));
      // Resize to the largest square that actually fits the visible content
      // width on this device — this is what was overflowing the screen on
      // mobile before (a fixed 640px board on a ~360px-wide phone).
      const available = shellRef.current?.clientWidth || WORKING_MAX;
      const workingMax = Math.max(WORKING_MIN, Math.min(WORKING_MAX, Math.floor(available)));
      const scale = workingMax / Math.max(img.width, img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = w;
      sourceCanvas.height = h;
      const sctx = sourceCanvas.getContext("2d")!;
      sctx.drawImage(img, 0, 0, w, h);
      setGhostSrc(sourceCanvas.toDataURL("image/jpeg", 0.85));

      const { rows, cols } = DIFFICULTIES[difficulty];
      const pieceW = w / cols;
      const pieceH = h / rows;
      const grid = generatePieceGrid(rows, cols);

      const tray = Math.max(220, Math.round(h * 0.65));
      const trayW = w;

      const next: PieceState[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const { d, pad } = buildPiecePath(grid[r][c], pieceW, pieceH);
          const boxW = Math.ceil(pieceW + pad * 2);
          const boxH = Math.ceil(pieceH + pad * 2);

          const pieceCanvas = document.createElement("canvas");
          pieceCanvas.width = boxW;
          pieceCanvas.height = boxH;
          const pctx = pieceCanvas.getContext("2d")!;
          const path = new Path2D(d);
          pctx.save();
          pctx.clip(path);
          pctx.drawImage(sourceCanvas, pad - c * pieceW, pad - r * pieceH);
          pctx.restore();
          pctx.strokeStyle = "rgba(0,0,0,0.25)";
          pctx.lineWidth = 1.25;
          pctx.stroke(path);

          const correctX = c * pieceW - pad;
          const correctY = r * pieceH - pad;

          next.push({
            id: `${r}-${c}`,
            boxW,
            boxH,
            img: pieceCanvas.toDataURL("image/png"),
            correctX,
            correctY,
            x: Math.random() * Math.max(1, trayW - boxW),
            y: h + TRAY_GAP + Math.random() * Math.max(1, tray - boxH),
            locked: false,
            z: 1,
          });
        }
      }

      setBoardW(w);
      setBoardH(h);
      setTrayH(tray);
      setPieces(next);
      setSeconds(0);
      setShowGhost(false);
      setStage("playing");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong loading that image.");
      setStage("setup");
    }
  };

  const restart = () => {
    setStage("setup");
    setPieces([]);
    setGhostSrc(null);
  };

  const shuffleTray = () => {
    setPieces((ps) =>
      ps.map((p) =>
        p.locked
          ? p
          : {
              ...p,
              x: Math.random() * Math.max(1, boardW - p.boxW),
              y: boardH + TRAY_GAP + Math.random() * Math.max(1, trayH - p.boxH),
            },
      ),
    );
  };

  // ── Drag handling ──────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, piece: PieceState) => {
    if (piece.locked) return;
    const container = containerRef.current;
    if (!container) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left - piece.x,
      y: e.clientY - rect.top - piece.y,
    };
    dragId.current = piece.id;
    zCounter.current += 1;
    const z = zCounter.current;
    setPieces((ps) => ps.map((p) => (p.id === piece.id ? { ...p, z } : p)));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragId.current === null) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nx = e.clientX - rect.left - dragOffset.current.x;
    const ny = e.clientY - rect.top - dragOffset.current.y;
    const id = dragId.current;
    setPieces((ps) => ps.map((p) => (p.id === id ? { ...p, x: nx, y: ny } : p)));
  };

  const endDrag = () => {
    if (dragId.current === null) return;
    const id = dragId.current;
    dragId.current = null;
    setPieces((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const snap = Math.max(14, Math.min(p.boxW, p.boxH) * 0.18);
        const dx = Math.abs(p.x - p.correctX);
        const dy = Math.abs(p.y - p.correctY);
        if (dx < snap && dy < snap) {
          return { ...p, x: p.correctX, y: p.correctY, locked: true };
        }
        return p;
      }),
    );
  };

  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <ToolPageShell
      title="Photo Jigsaw Puzzle Maker"
      description="Turn any photo into a real jigsaw puzzle with interlocking pieces — or start with a famous painting or wonder of the world."
    >
      <div ref={shellRef}>
        {/* ── Setup ────────────────────────────────────────────────────── */}
        {stage === "setup" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display font-bold text-lg mb-3">1. Choose a difficulty</h2>
              <div className="grid gap-3 sm:grid-cols-4">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-xl border-2 p-4 text-center transition ${
                      difficulty === d
                        ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_10%,transparent)]"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <p className="font-semibold">{DIFFICULTIES[d].label.split(" · ")[0]}</p>
                    <p className="text-xs text-muted-foreground mt-1">{DIFFICULTIES[d].label.split(" · ")[1]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display font-bold text-lg mb-3">2. Choose a photo</h2>
              <DropZone
                accept="image/*"
                onFiles={onUpload}
                label="Drop your photo here"
                hint="JPG, PNG or WEBP — up to 10MB. Nothing leaves your device."
              />

              <p className="text-sm text-muted-foreground mt-6 mb-3">Or start with one of these instead:</p>
              <div className="grid gap-4 sm:grid-cols-4">
                {PRESET_IMAGES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCustomSrc(null);
                      setPreset(p);
                    }}
                    className={`rounded-xl overflow-hidden border-2 text-left transition ${
                      preset?.id === p.id ? "border-[var(--cyan-brand)]" : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <img src={p.thumbUrl} alt={p.title} className="w-full h-28 object-cover" loading="lazy" />
                    <div className="p-2.5">
                      <p className="text-sm font-semibold leading-tight">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.year}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {(customSrc || preset) && (
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <img
                  src={preset ? preset.thumbUrl : (customSrc as string)}
                  alt="Selected"
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{preset ? preset.title : "Your photo"}</p>
                  <p className="text-xs text-muted-foreground">{DIFFICULTIES[difficulty].label}</p>
                </div>
                <Button onClick={startPuzzle} className="h-11 px-6">
                  Start Puzzle
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cutting your puzzle pieces…</p>
          </div>
        )}

        {/* ── Playing / Done ───────────────────────────────────────────── */}
        {(stage === "playing" || stage === "done") && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold tabular-nums">
                  {placedCount} / {totalCount} pieces
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                  <Clock className="w-4 h-4" /> {format(seconds)}
                </span>
              </div>
              <div className="flex gap-2">
                {stage === "playing" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowGhost((v) => !v)} className="gap-1.5">
                      {showGhost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showGhost ? "Hide guide" : "Show guide"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={shuffleTray} className="gap-1.5">
                      <Shuffle className="w-4 h-4" /> Shuffle tray
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={restart} className="gap-1.5">
                  <RefreshCw className="w-4 h-4" /> New puzzle
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div
                ref={containerRef}
                className="relative mx-auto rounded-xl bg-secondary/30 touch-none select-none"
                style={{ width: boardW, height: boardH + TRAY_GAP + trayH }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <div
                  className="absolute rounded-lg border-2 border-dashed border-border/70 overflow-hidden"
                  style={{ left: 0, top: 0, width: boardW, height: boardH }}
                >
                  {showGhost && ghostSrc && (
                    <img src={ghostSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                  )}
                </div>

                {pieces.map((p) => (
                  <div
                    key={p.id}
                    onPointerDown={(e) => onPointerDown(e, p)}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: p.boxW,
                      height: p.boxH,
                      transform: `translate(${p.x}px, ${p.y}px)`,
                      zIndex: p.locked ? 1 : p.z,
                      cursor: p.locked ? "default" : "grab",
                      touchAction: "none",
                      filter: p.locked ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
                    }}
                  >
                    <img src={p.img} alt="" draggable={false} className="w-full h-full pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

            {stage === "done" && (
              <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
                <p className="font-display text-xl font-bold">Puzzle complete! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCount} pieces in {format(seconds)}.
                </p>

                {preset && (
                  <div className="mt-6 rounded-xl bg-secondary/40 p-5 text-left max-w-lg mx-auto">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {preset.category === "art" ? "About this painting" : "About this wonder"}
                    </p>
                    <p className="font-display text-lg font-bold mt-1">{preset.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {preset.creator} · {preset.year} · {preset.place}
                    </p>
                    <p className="text-sm mt-3 leading-relaxed">{preset.blurb}</p>
                    <p className="text-xs text-muted-foreground mt-3">{preset.credit}</p>
                  </div>
                )}

                <Button onClick={restart} className="mt-6 h-11 px-6">
                  Try another puzzle
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Internal links ───────────────────────────────────────────── */}
      <p className="text-sm text-muted-foreground mt-16">
        Prefer a numbered grid instead of interlocking pieces? Try the classic{" "}
        <Link to="/tools/sliding-puzzle" className="text-[var(--cyan-brand)] hover:underline">
          Sliding Puzzle
        </Link>
        . Looking for something to solve on paper instead? Check out our{" "}
        <Link to="/tools/maze-puzzle" className="text-[var(--cyan-brand)] hover:underline">
          Maze Puzzle
        </Link>{" "}
        generator.
      </p>

      <AdZone id="jigsaw-puzzle-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick a difficulty — from 9 pieces (easy) up to 100 (expert).",
          "Upload your own photo, or choose a famous painting or wonder of the world.",
          "Drag pieces from the tray onto the board. They snap into place when they're close to correct — no rotating needed.",
        ]}
      />

      <ToolSeoContent
        title={TITLE}
        description={DESCRIPTION}
        body={[
          "This jigsaw puzzle maker turns any photo into a proper puzzle with curved, interlocking tabs and blanks — not just a plain grid of squares. Upload a picture from your own device, or start with one of the built-in examples, then drag the scattered pieces onto the board until the picture comes together.",
          "Every piece is cut in your browser using the HTML canvas, and if you upload your own photo, that photo never leaves your device — nothing is sent to any server. The four difficulty levels range from a quick 9-piece warm-up to a genuinely challenging 100-piece puzzle, so it works whether you want a two-minute break or a longer sit-down session.",
          "For a bit of variety without needing your own photos, the tool includes a small rotating set of famous paintings and modern wonders of the world. Finish one of these and you'll get a short, fact-checked summary of what you just reassembled — who made it, when, and where — turning the puzzle into a small piece of trivia along the way.",
          "No installs, no accounts, and no time limit. Shuffle the tray at any point if the scattered pieces get too crowded, toggle a faint outline of the finished picture if you want a hint, and start a fresh puzzle whenever you like.",
        ]}
        faqs={[
          {
            question: "Is my uploaded photo stored anywhere?",
            answer:
              "No. The image is cut into pieces entirely in your browser using the HTML canvas. Nothing is uploaded to a server, and closing or refreshing the tab clears it completely.",
          },
          {
            question: "Do the pieces need to be rotated?",
            answer:
              "No. Every piece stays right-side up — you only need to drag it to the correct position, not rotate it. This keeps the puzzle approachable at every difficulty level.",
          },
          {
            question: "What's the difference between the difficulty levels?",
            answer:
              "Only the number of pieces changes: 9 for easy, 25 for medium, 64 for hard, and 100 for expert. More pieces means smaller pieces and a longer, more detailed puzzle.",
          },
          {
            question: "Can I use any photo?",
            answer:
              "Yes — JPG, PNG or WEBP files up to 10MB. Photos with clear detail and distinct areas (faces, landmarks, landscapes) tend to make for a more interesting puzzle than very plain or abstract images.",
          },
          {
            question: "Where do the built-in example images come from?",
            answer:
              "A small rotating set of public-domain paintings and freely licensed photos of famous landmarks, sourced from Wikimedia Commons. Each one comes with a short, fact-checked summary once you finish the puzzle.",
          },
          {
            question: "Is there a way to see the full picture while solving?",
            answer:
              'Yes. Tap "Show guide" to see a faint outline of the finished image on the board, then hide it again once you don\'t need it anymore.',
          },
          {
            question: "Can I play on my phone?",
            answer:
              "Yes, the board and tray work with touch dragging on phones and tablets, though a larger screen makes it easier to arrange higher piece counts like Hard or Expert.",
          },
          {
            question: "Is it really free?",
            answer: "Yes, completely free with no signup, no download, and no limit on how many puzzles you solve.",
          },
        ]}
      />

      <RelatedTools currentSlug="jigsaw-puzzle" />
    </ToolPageShell>
  );
}
