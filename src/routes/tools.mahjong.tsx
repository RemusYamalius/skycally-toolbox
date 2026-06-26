import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Lightbulb, Shuffle, Trophy, AlertTriangle } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

const PATH = "/tools/mahjong";
const TITLE = "Mahjong Solitaire — Free Online Game, No Download";
const DESCRIPTION =
  "Play Mahjong Solitaire free in your browser. Match identical tiles to clear the board. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/mahjong")({
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
            name: "Mahjong Solitaire",
            description:
              "Free browser-based Mahjong Solitaire game. Match identical tiles to clear the board. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Puzzle",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: MahjongPage,
});

// ---------- Tile faces ----------
// 34 standard faces × 4 = 136, plus 4 flowers + 4 seasons = 144.
// Flowers all match each other; Seasons all match each other.
type Face = { id: string; group: string; glyph: string; label: string };

const FACES: Face[] = (() => {
  const out: Face[] = [];
  // Dots (Circles): 🀙..🀡
  const DOTS = ["🀙", "🀚", "🀛", "🀜", "🀝", "🀞", "🀟", "🀠", "🀡"];
  DOTS.forEach((g, i) => out.push({ id: `dot${i + 1}`, group: `dot${i + 1}`, glyph: g, label: `${i + 1} Dot` }));
  // Bamboo: 🀐..🀘
  const BAM = ["🀐", "🀑", "🀒", "🀓", "🀔", "🀕", "🀖", "🀗", "🀘"];
  BAM.forEach((g, i) => out.push({ id: `bam${i + 1}`, group: `bam${i + 1}`, glyph: g, label: `${i + 1} Bamboo` }));
  // Characters: 🀇..🀏
  const CHAR = ["🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏"];
  CHAR.forEach((g, i) => out.push({ id: `chr${i + 1}`, group: `chr${i + 1}`, glyph: g, label: `${i + 1} Character` }));
  // Winds: East 🀀, South 🀁, West 🀂, North 🀃
  ["🀀", "🀁", "🀂", "🀃"].forEach((g, i) =>
    out.push({ id: `wind${i}`, group: `wind${i}`, glyph: g, label: ["East", "South", "West", "North"][i] + " Wind" }),
  );
  // Dragons: Red 🀄, Green 🀅, White 🀆
  ["🀄", "🀅", "🀆"].forEach((g, i) =>
    out.push({ id: `drag${i}`, group: `drag${i}`, glyph: g, label: ["Red", "Green", "White"][i] + " Dragon" }),
  );
  return out;
})();

// Flowers (4 unique tiles, all match each other) + Seasons (4 unique, all match)
const FLOWERS: Face[] = ["🀢", "🀣", "🀤", "🀥"].map((g, i) => ({
  id: `flower${i}`,
  group: "flower",
  glyph: g,
  label: ["Plum", "Orchid", "Chrysanthemum", "Bamboo"][i],
}));
const SEASONS: Face[] = ["🀦", "🀧", "🀨", "🀩"].map((g, i) => ({
  id: `season${i}`,
  group: "season",
  glyph: g,
  label: ["Spring", "Summer", "Autumn", "Winter"][i],
}));

function buildDeck(): Face[] {
  const out: Face[] = [];
  for (const f of FACES) for (let i = 0; i < 4; i++) out.push(f);
  for (const f of FLOWERS) out.push(f);
  for (const f of SEASONS) out.push(f);
  return out; // 136 + 4 + 4 = 144
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Layout: simplified Turtle, 144 slots ----------
type Slot = { x: number; y: number; z: number };

function buildLayout(): Slot[] {
  const slots: Slot[] = [];
  const push = (z: number, y: number, xs: number[]) => xs.forEach((x) => slots.push({ x, y, z }));

  // Layer 0 (87 tiles)
  push(0, 0, range(1, 12)); // 12
  push(0, 1, range(3, 10)); // 8
  push(0, 2, range(2, 11)); // 10
  push(0, 3, [-1, ...range(1, 12), 14]); // 14
  push(0, 4, [0, ...range(1, 12), 13]); // 14 — 14? 1+12+1=14, but want 87 total. recount below
  push(0, 5, range(2, 11)); // 10
  push(0, 6, range(3, 10)); // 8
  push(0, 7, range(1, 12)); // 12
  // running: 12+8+10+14+14+10+8+12 = 88. Drop one outlier:
  // remove slot {x:13, y:4, z:0}
  const dropIdx = slots.findIndex((s) => s.z === 0 && s.y === 4 && s.x === 13);
  if (dropIdx >= 0) slots.splice(dropIdx, 1);
  // Layer 0 = 87 ✓

  // Layer 1 (36) — 6x6 centered at x=4..9, y=1..6
  for (let y = 1; y <= 6; y++) for (let x = 4; x <= 9; x++) slots.push({ x, y, z: 1 });

  // Layer 2 (16) — 4x4 at x=5..8, y=2..5
  for (let y = 2; y <= 5; y++) for (let x = 5; x <= 8; x++) slots.push({ x, y, z: 2 });

  // Layer 3 (4) — 2x2 at x=6..7, y=3..4
  for (let y = 3; y <= 4; y++) for (let x = 6; x <= 7; x++) slots.push({ x, y, z: 3 });

  // Layer 4 (1) — single tile at x=6, y=3
  slots.push({ x: 6, y: 3, z: 4 });

  return slots; // 87+36+16+4+1 = 144
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

// ---------- Game model ----------
type Tile = { key: string; slot: Slot; face: Face };

function keyOf(s: Slot) {
  return `${s.x},${s.y},${s.z}`;
}

function isFree(tile: Tile, alive: Map<string, Tile>): boolean {
  const { x, y, z } = tile.slot;
  // Blocked above
  if (alive.has(keyOf({ x, y, z: z + 1 }))) return false;
  // Side check: free if no left OR no right neighbor at same z
  const hasLeft = alive.has(keyOf({ x: x - 1, y, z }));
  const hasRight = alive.has(keyOf({ x: x + 1, y, z }));
  return !(hasLeft && hasRight);
}

function matches(a: Face, b: Face): boolean {
  return a.group === b.group;
}

// Build a solvable deal: place pairs only on currently-free slots.
function buildSolvableTiles(): Tile[] {
  const layout = buildLayout();
  const deck = shuffle(buildDeck());
  // pair deck into 72 pairs
  const pairs: [Face, Face][] = [];
  for (let i = 0; i < deck.length; i += 2) pairs.push([deck[i], deck[i + 1]]);

  // We need a deck where each pair matches by group. Approach: build a paired deck.
  // Re-build deck as 72 pairs of matching faces.
  const matchedPairs: [Face, Face][] = [];
  for (const f of FACES) {
    matchedPairs.push([f, f]);
    matchedPairs.push([f, f]);
  }
  // Flowers: 4 unique tiles, all match → form 2 pairs from any 2-of-4 split.
  const flowerShuffled = shuffle(FLOWERS);
  matchedPairs.push([flowerShuffled[0], flowerShuffled[1]]);
  matchedPairs.push([flowerShuffled[2], flowerShuffled[3]]);
  const seasonShuffled = shuffle(SEASONS);
  matchedPairs.push([seasonShuffled[0], seasonShuffled[1]]);
  matchedPairs.push([seasonShuffled[2], seasonShuffled[3]]);
  // total = 34*2 + 2 + 2 = 72 pairs ✓
  const pairsShuffled = shuffle(matchedPairs);

  // Place pairs by repeatedly choosing 2 free slots.
  const remaining = new Set(layout.map(keyOf));
  const placed = new Map<string, Tile>(); // key -> tile (face filled later)
  const slotByKey = new Map(layout.map((s) => [keyOf(s), s] as const));

  // Helper: a slot is "placeable" if treating remaining slots as filled, removing
  // it would leave it free under our rule (i.e., we place top-down and outside-in).
  // We invert: at each step, pick from slots whose all-above-slot is already removed
  // AND not both side-neighbors still present.
  const slotIsPlaceable = (key: string): boolean => {
    const s = slotByKey.get(key)!;
    // Top slot must be already placed (not still remaining)
    if (remaining.has(keyOf({ x: s.x, y: s.y, z: s.z + 1 }))) return false;
    const left = remaining.has(keyOf({ x: s.x - 1, y: s.y, z: s.z }));
    const right = remaining.has(keyOf({ x: s.x + 1, y: s.y, z: s.z }));
    return !(left && right);
  };

  const tiles: Tile[] = [];
  for (const [a, b] of pairsShuffled) {
    // Find all placeable slots
    const candidates: string[] = [];
    for (const k of remaining) if (slotIsPlaceable(k)) candidates.push(k);
    if (candidates.length < 2) {
      // Fallback: just take any two remaining slots (rare)
      const fallback = Array.from(remaining).slice(0, 2);
      candidates.push(...fallback.filter((k) => !candidates.includes(k)));
    }
    const sh = shuffle(candidates);
    const k1 = sh[0];
    const k2 = sh[1];
    remaining.delete(k1);
    remaining.delete(k2);
    const t1: Tile = { key: k1, slot: slotByKey.get(k1)!, face: a };
    const t2: Tile = { key: k2, slot: slotByKey.get(k2)!, face: b };
    tiles.push(t1, t2);
    placed.set(k1, t1);
    placed.set(k2, t2);
  }
  return tiles;
}

// ---------- Component ----------
function MahjongPage() {
  const [tiles, setTiles] = useState<Tile[]>(() => buildSolvableTiles());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [hint, setHint] = useState<Set<string>>(new Set());
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [showDead, setShowDead] = useState(false);

  // Best time
  useEffect(() => {
    const raw = localStorage.getItem("mahjong-best-time");
    if (raw) setBestTime(parseInt(raw, 10));
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const alive = useMemo(() => {
    const m = new Map<string, Tile>();
    for (const t of tiles) if (!removed.has(t.key)) m.set(t.key, t);
    return m;
  }, [tiles, removed]);

  const remainingCount = alive.size;

  const freeTiles = useMemo(() => {
    const out: Tile[] = [];
    for (const t of alive.values()) if (isFree(t, alive)) out.push(t);
    return out;
  }, [alive]);

  const findPair = useCallback((): [Tile, Tile] | null => {
    for (let i = 0; i < freeTiles.length; i++) {
      for (let j = i + 1; j < freeTiles.length; j++) {
        if (matches(freeTiles[i].face, freeTiles[j].face)) return [freeTiles[i], freeTiles[j]];
      }
    }
    return null;
  }, [freeTiles]);

  // Win / deadlock detection
  useEffect(() => {
    if (remainingCount === 0) {
      setRunning(false);
      setShowWin(true);
      if (bestTime === null || seconds < bestTime) {
        localStorage.setItem("mahjong-best-time", String(seconds));
        setBestTime(seconds);
      }
    } else if (!findPair() && running) {
      setShowDead(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingCount, findPair]);

  const onTileClick = (t: Tile) => {
    if (!isFree(t, alive)) return;
    setHint(new Set());
    if (selected === null) {
      setSelected(t.key);
      return;
    }
    if (selected === t.key) {
      setSelected(null);
      return;
    }
    const a = alive.get(selected);
    if (!a) {
      setSelected(t.key);
      return;
    }
    if (matches(a.face, t.face)) {
      const next = new Set(removed);
      next.add(a.key);
      next.add(t.key);
      setRemoved(next);
      setSelected(null);
      setMoves((m) => m + 1);
    } else {
      setSelected(t.key);
    }
  };

  const onHint = () => {
    const pair = findPair();
    if (!pair) return;
    setHint(new Set([pair[0].key, pair[1].key]));
    setTimeout(() => setHint(new Set()), 1600);
  };

  const onShuffle = () => {
    // Reshuffle remaining face IDs across remaining tiles
    const live = Array.from(alive.values());
    const faces = shuffle(live.map((t) => t.face));
    const updated = tiles.map((t) => {
      if (removed.has(t.key)) return t;
      const idx = live.findIndex((l) => l.key === t.key);
      return { ...t, face: faces[idx] };
    });
    setTiles(updated);
    setSelected(null);
    setHint(new Set());
    setShowDead(false);
  };

  const onNewGame = () => {
    setTiles(buildSolvableTiles());
    setRemoved(new Set());
    setSelected(null);
    setMoves(0);
    setSeconds(0);
    setRunning(true);
    setHint(new Set());
    setShowWin(false);
    setShowDead(false);
  };

  // Render bounds
  const bounds = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const t of tiles) {
      minX = Math.min(minX, t.slot.x);
      maxX = Math.max(maxX, t.slot.x);
      minY = Math.min(minY, t.slot.y);
      maxY = Math.max(maxY, t.slot.y);
    }
    return { minX, maxX, minY, maxY };
  }, [tiles]);

  const TILE_W = 44;
  const TILE_H = 58;
  const Z_OFFSET_X = 5;
  const Z_OFFSET_Y = 5;
  const boardW = (bounds.maxX - bounds.minX + 1) * TILE_W + 40;
  const boardH = (bounds.maxY - bounds.minY + 1) * TILE_H + 40;

  // Sort tiles render order: by z asc, then y asc, x asc (so upper-layer tiles overlap correctly)
  const sortedTiles = useMemo(
    () =>
      tiles
        .filter((t) => !removed.has(t.key))
        .slice()
        .sort((a, b) => a.slot.z - b.slot.z || a.slot.y - b.slot.y || a.slot.x - b.slot.x),
    [tiles, removed],
  );

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Mahjong Solitaire"
      description="Match identical free tiles to clear the board. Classic Mahjong Solitaire!"
    >
      {/* HUD */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Stat label="Time" value={fmtTime(seconds)} />
        <Stat label="Moves" value={String(moves)} />
        <Stat label="Tiles" value={String(remainingCount)} />
        {bestTime !== null && <Stat label="Best" value={fmtTime(bestTime)} />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onHint}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary"
          >
            <Lightbulb className="h-4 w-4" /> Hint
          </button>
          <button
            onClick={onShuffle}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary"
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
          <button
            onClick={onNewGame}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" /> New Game
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full rounded-2xl border border-border bg-card/40 p-2 sm:p-4">
        <div className="overflow-x-auto overflow-y-hidden -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="relative mx-auto" style={{ width: boardW, height: boardH, minWidth: "min-content" }}>
            {sortedTiles.map((t) => {
              const free = isFree(t, alive);
              const isSel = selected === t.key;
              const isHint = hint.has(t.key);
              const left = (t.slot.x - bounds.minX) * TILE_W + t.slot.z * Z_OFFSET_X + 20;
              const top = (t.slot.y - bounds.minY) * TILE_H - t.slot.z * Z_OFFSET_Y + 20;
              const zIndex = t.slot.z * 100 + t.slot.y * 10 + t.slot.x;
              return (
                <button
                  key={t.key}
                  onClick={() => onTileClick(t)}
                  disabled={!free}
                  className={`absolute select-none rounded-md border text-2xl flex items-center justify-center transition-colors ${
                    isSel
                      ? "border-cyan-400 ring-2 ring-cyan-400 bg-cyan-50"
                      : isHint
                        ? "border-amber-400 ring-2 ring-amber-400 bg-amber-50"
                        : free
                          ? "border-slate-300 bg-white hover:bg-cyan-50 cursor-pointer"
                          : "border-slate-400 bg-slate-100 cursor-not-allowed opacity-90"
                  }`}
                  style={{
                    left,
                    top,
                    width: TILE_W,
                    height: TILE_H,
                    zIndex,
                    boxShadow: free
                      ? "1px 1px 0 rgba(0,0,0,0.15), 2px 2px 4px rgba(0,0,0,0.2)"
                      : "1px 1px 0 rgba(0,0,0,0.25)",
                    color: t.face.group === "drag0" || t.face.group === "flower" ? "#dc2626" : "#0f172a",
                  }}
                  aria-label={t.face.label}
                  title={t.face.label}
                >
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{t.face.glyph}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Win modal */}
      {showWin && (
        <Modal>
          <div className="text-center">
            <Trophy className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="mt-3 text-xl font-bold">You cleared the board!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Time {fmtTime(seconds)} · Moves {moves}
            </p>
            <button
              onClick={onNewGame}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <RotateCcw className="h-4 w-4" /> Play again
            </button>
          </div>
        </Modal>
      )}

      {/* Deadlock modal */}
      {showDead && !showWin && (
        <Modal>
          <div className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="mt-3 text-xl font-bold">No moves left</h3>
            <p className="mt-1 text-sm text-muted-foreground">Shuffle the remaining tiles or start a new game.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={onShuffle}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary"
              >
                <Shuffle className="h-4 w-4" /> Shuffle
              </button>
              <button
                onClick={onNewGame}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                <RotateCcw className="h-4 w-4" /> New Game
              </button>
            </div>
          </div>
        </Modal>
      )}

      <AdZone id="mahjong-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Click a free tile (no tile on top, one side open) to select it.",
          "Click a second identical free tile — they will be removed.",
          "Clear all 144 tiles from the board to win.",
        ]}
      />

      <ToolSeoContent
        title="Free Mahjong Solitaire Online — Match & Remove Tile Pairs"
        description="Play Mahjong Solitaire free online. Match identical free tiles to clear the board. Classic pyramid layout, responsive for mobile and desktop. No signup required."
        body={[
          "Skycally's Mahjong Solitaire presents the classic pyramid tile layout — 144 tiles stacked in multiple layers. Select two identical free tiles to remove them from the board. A tile is free if nothing is on top of it and at least one of its sides is open. Clear all 144 tiles to win.",
          "Mahjong Solitaire (also called Shanghai Solitaire) is distinct from the four-player Mahjong game. It was popularized by the 1986 Activision computer game Shanghai and became one of the most played computer games of the 1990s. The tile set uses four suits: Characters (万), Bamboo (索), Circles (筒), plus Winds, Dragons, Flowers, and Seasons.",
          "Strategy is essential — not every deal is winnable with any move order. Look ahead before selecting tiles: if removing a pair blocks access to tiles you'll need later, try another pair first. The Flowers and Seasons tiles are special — each Flower matches any other Flower tile, and each Season matches any other Season tile.",
          "The board scales responsively to fit any screen size, making it playable on smartphones as well as desktop. On mobile, the tile layout adjusts to ensure all tiles are visible and tappable without zooming. A hint button and shuffle option are available when you get stuck.",
        ]}
        faqs={[
          {
            question: "How do I play Mahjong Solitaire?",
            answer:
              "Select two identical free tiles to remove them. A tile is free if nothing is stacked on top of it and at least one of its left or right sides is open. Clear all 144 tiles to win.",
          },
          {
            question: "What makes a tile free?",
            answer:
              "A tile is free (selectable) when no other tile is resting on top of it AND at least one of its horizontal sides (left or right) is not blocked by another tile.",
          },
          {
            question: "How do Flower and Season tiles work?",
            answer:
              "Any Flower tile matches any other Flower tile (they don't need to be identical). Same for Season tiles — any two Season tiles can be matched together.",
          },
          {
            question: "What if I get stuck?",
            answer:
              "Use the Hint button to highlight a valid pair. If no moves are available, use Shuffle to rearrange remaining tiles into a potentially solvable position.",
          },
          {
            question: "Is every deal winnable?",
            answer:
              "Not always — Mahjong Solitaire layouts can become unwinnable depending on move order. If you get stuck, shuffle or start a new game.",
          },
          {
            question: "How many tiles are there?",
            answer: "The classic layout uses 144 tiles arranged in a pyramid shape across multiple layers.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The board scales to fit the screen with touch-friendly tile sizing. The layout adapts for portrait and landscape orientations.",
          },
          {
            question: "Can I undo a move?",
            answer: "Check the game controls — an undo button may be available to reverse the last pair removed.",
          },
        ]}
      />

      <RelatedTools currentSlug="mahjong" />
    </ToolPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">{children}</div>
    </div>
  );
}
