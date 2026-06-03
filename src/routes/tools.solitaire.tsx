import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Undo2, Trophy, Lightbulb } from "lucide-react";

import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


const PATH = "/tools/solitaire";
const TITLE = "Solitaire — Free Online Card Game, No Download";
const DESCRIPTION =
  "Play Klondike Solitaire free in your browser. Classic card game with drag and drop. No download, no signup required. Works on mobile.";

export const Route = createFileRoute("/tools/solitaire")({
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
            name: "Solitaire",
            description:
              "Free browser-based Klondike Solitaire card game. Move all cards to the foundation piles to win. No download or signup required.",
            url: `${SITE_URL}${PATH}`,
            genre: "Card Game",
            playMode: "SinglePlayer",
            applicationCategory: "Game",
          }),
        },
      ],
    };
  },
  component: SolitairePage,
});

// ---------- Cards / Game model ----------
type Suit = "S" | "H" | "D" | "C";
const SUITS: Suit[] = ["S", "H", "D", "C"];
const SUIT_GLYPH: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const isRed = (s: Suit) => s === "H" || s === "D";
const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

type Card = { id: string; suit: Suit; rank: number; faceUp: boolean };

type Pile = "T0" | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "W" | "F0" | "F1" | "F2" | "F3";

type GameState = {
  tableau: Card[][]; // 7
  foundations: Card[][]; // 4
  stock: Card[];
  waste: Card[];
  moves: number;
};

type Mode = "draw1" | "draw3";

function makeDeck(): Card[] {
  const out: Card[] = [];
  for (const s of SUITS) {
    for (let r = 1; r <= 13; r++) {
      out.push({ id: `${s}${r}`, suit: s, rank: r, faceUp: false });
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGame(): GameState {
  const deck = shuffle(makeDeck());
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let k = 0;
  for (let col = 0; col < 7; col++) {
    for (let i = 0; i <= col; i++) {
      const c = deck[k++];
      c.faceUp = i === col;
      tableau[col].push(c);
    }
  }
  const stock = deck.slice(k).map((c) => ({ ...c, faceUp: false }));
  return {
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
    moves: 0,
  };
}

function clone(s: GameState): GameState {
  return {
    tableau: s.tableau.map((c) => c.map((x) => ({ ...x }))),
    foundations: s.foundations.map((c) => c.map((x) => ({ ...x }))),
    stock: s.stock.map((x) => ({ ...x })),
    waste: s.waste.map((x) => ({ ...x })),
    moves: s.moves,
  };
}

function canPlaceOnTableau(moving: Card, dest: Card | undefined): boolean {
  if (!dest) return moving.rank === 13; // King onto empty
  if (!dest.faceUp) return false;
  return isRed(moving.suit) !== isRed(dest.suit) && moving.rank === dest.rank - 1;
}

function canPlaceOnFoundation(moving: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return moving.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === moving.suit && moving.rank === top.rank + 1;
}

function isWon(s: GameState): boolean {
  return s.foundations.every((f) => f.length === 13);
}

type Hint = { fromPile: Pile; cardId: string; toPile: Pile };

function findHint(s: GameState): Hint | null {
  // 1. Waste top -> foundation
  if (s.waste.length) {
    const c = s.waste[s.waste.length - 1];
    for (let i = 0; i < 4; i++)
      if (canPlaceOnFoundation(c, s.foundations[i]))
        return { fromPile: "W", cardId: c.id, toPile: `F${i}` as Pile };
  }
  // 2. Tableau top -> foundation
  for (let t = 0; t < 7; t++) {
    const col = s.tableau[t];
    if (!col.length) continue;
    const c = col[col.length - 1];
    if (!c.faceUp) continue;
    for (let i = 0; i < 4; i++)
      if (canPlaceOnFoundation(c, s.foundations[i]))
        return { fromPile: `T${t}` as Pile, cardId: c.id, toPile: `F${i}` as Pile };
  }
  // 3. Waste -> tableau
  if (s.waste.length) {
    const c = s.waste[s.waste.length - 1];
    for (let t = 0; t < 7; t++) {
      const col = s.tableau[t];
      const dest = col[col.length - 1];
      if (canPlaceOnTableau(c, dest))
        return { fromPile: "W", cardId: c.id, toPile: `T${t}` as Pile };
    }
  }
  // 4. Tableau face-up sub-stack -> another tableau (reveals or empties)
  for (let t = 0; t < 7; t++) {
    const col = s.tableau[t];
    const firstUp = col.findIndex((c) => c.faceUp);
    if (firstUp < 0) continue;
    const moving = col[firstUp];
    if (moving.rank === 13 && firstUp === 0) continue; // king already at bottom
    for (let d = 0; d < 7; d++) {
      if (d === t) continue;
      const dCol = s.tableau[d];
      const dest = dCol[dCol.length - 1];
      if (canPlaceOnTableau(moving, dest))
        return { fromPile: `T${t}` as Pile, cardId: moving.id, toPile: `T${d}` as Pile };
    }
  }
  return null;
}


// ---------- Component ----------
function SolitairePage() {
  const [state, setState] = useState<GameState>(() => newGame());
  const [history, setHistory] = useState<GameState[]>([]);
  const [mode, setMode] = useState<Mode>("draw1");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const hintTimerRef = useRef<number | null>(null);


  useEffect(() => {
    const raw = localStorage.getItem("solitaire-best-time");
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) setBestTime(n);
    }
  }, []);

  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  useEffect(() => {
    if (!won && isWon(state)) {
      setWon(true);
      setRunning(false);
      setBestTime((prev) => {
        const next = prev == null || seconds < prev ? seconds : prev;
        localStorage.setItem("solitaire-best-time", String(next));
        return next;
      });
    }
  }, [state, won, seconds]);

  const pushHistory = useCallback((prev: GameState) => {
    setHistory((h) => {
      const next = [...h, clone(prev)];
      return next.slice(-50);
    });
  }, []);

  const clearHint = useCallback(() => {
    if (hintTimerRef.current != null) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setHint(null);
  }, []);

  const showHint = useCallback(() => {
    const h = findHint(state);
    if (!h) {
      setHint(null);
      return;
    }
    setHint(h);
    if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setHint(null), 2200);
  }, [state]);

  useEffect(() => () => {
    if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
  }, []);


  const apply = useCallback(
    (mutator: (draft: GameState) => boolean) => {
      setState((prev) => {
        const draft = clone(prev);
        const ok = mutator(draft);
        if (!ok) return prev;
        draft.moves += 1;
        // Auto-flip top tableau cards
        for (const col of draft.tableau) {
          if (col.length && !col[col.length - 1].faceUp) {
            col[col.length - 1].faceUp = true;
          }
        }
        pushHistory(prev);
        return draft;
      });
    },
    [pushHistory],
  );

  const handleStock = () => {
    setState((prev) => {
      const draft = clone(prev);
      if (draft.stock.length === 0) {
        if (draft.waste.length === 0) return prev;
        draft.stock = draft.waste.reverse().map((c) => ({ ...c, faceUp: false }));
        draft.waste = [];
      } else {
        const n = mode === "draw3" ? Math.min(3, draft.stock.length) : 1;
        for (let i = 0; i < n; i++) {
          const c = draft.stock.pop()!;
          c.faceUp = true;
          draft.waste.push(c);
        }
      }
      draft.moves += 1;
      pushHistory(prev);
      return draft;
    });
  };

  const handleNewGame = () => {
    setState(newGame());
    setHistory([]);
    setSeconds(0);
    setRunning(true);
    setWon(false);
    clearHint();
  };

  const handleUndo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setState(last);
      setWon(false);
      return h.slice(0, -1);
    });
    clearHint();
  };


  // Try auto-move card to a foundation
  const tryAutoFoundation = (from: Pile, cardId: string) => {
    apply((draft) => {
      const src = getPileCards(draft, from);
      if (!src.length) return false;
      const top = src[src.length - 1];
      if (top.id !== cardId || !top.faceUp) return false;
      for (let i = 0; i < 4; i++) {
        if (canPlaceOnFoundation(top, draft.foundations[i])) {
          src.pop();
          draft.foundations[i].push(top);
          return true;
        }
      }
      return false;
    });
  };

  // Move a stack of cards from one pile to another (drop target)
  const tryMove = (from: Pile, cardId: string, to: Pile): boolean => {
    let did = false;
    apply((draft) => {
      const src = getPileCards(draft, from);
      const idx = src.findIndex((c) => c.id === cardId);
      if (idx < 0 || !src[idx].faceUp) return false;
      const moving = src.slice(idx);

      if (to.startsWith("F")) {
        if (moving.length !== 1) return false;
        const f = draft.foundations[parseInt(to[1], 10)];
        if (!canPlaceOnFoundation(moving[0], f)) return false;
        src.splice(idx);
        f.push(moving[0]);
        did = true;
        return true;
      }
      if (to.startsWith("T")) {
        const col = draft.tableau[parseInt(to[1], 10)];
        const dest = col[col.length - 1];
        if (!canPlaceOnTableau(moving[0], dest)) return false;
        src.splice(idx);
        col.push(...moving);
        did = true;
        return true;
      }
      return false;
    });
    return did;
  };

  return (
    <ToolPageShell
      title="Solitaire"
      description="Move all cards to the foundation piles to win. Classic Klondike Solitaire!"
    >
      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
        {/* HUD */}
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <Stat label="Moves" value={String(state.moves)} color="text-foreground" />
          <Stat label="Time" value={formatTime(seconds)} color="text-cyan-400" />
          <Stat
            label="Best"
            value={bestTime != null ? formatTime(bestTime) : "—"}
            color="text-yellow-400"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {(["draw1", "draw3"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                handleNewGame();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                mode === m
                  ? "bg-cyan-500 text-black border-cyan-500"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {m === "draw1" ? "Draw 1 (Easy)" : "Draw 3 (Hard)"}
            </button>
          ))}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-secondary/60 text-foreground border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo ({history.length}/3)
          </button>
          <button
            onClick={handleNewGame}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New Game
          </button>
        </div>

        <Board
          state={state}
          onStock={handleStock}
          onMove={tryMove}
          onAuto={tryAutoFoundation}
        />

        {won && (
          <div className="mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-6 text-center">
            <Trophy className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
            <p className="text-2xl font-black text-foreground mb-1">You Won!</p>
            <p className="text-muted-foreground mb-1">Time: {formatTime(seconds)}</p>
            <p className="text-muted-foreground mb-4">Moves: {state.moves}</p>
            <button
              onClick={handleNewGame}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      <HowToUse
        steps={[
          "Pick Draw 1 for an easier game or Draw 3 for the classic challenge.",
          "Drag cards between columns — build descending stacks in alternating colors. Move Aces up to the foundations and stack them by suit (A → K).",
          "Double-click any card to auto-send it to its foundation. Use Undo if you make a mistake. Clear all 52 cards to win!",
        ]}
      />

      <ToolSeoContent
        title="Solitaire — Free Online Klondike Card Game"
        description="Play Klondike Solitaire free in your browser with drag-and-drop controls, undo, and a timer. No download, no signup, works on mobile."
        body={[
          "Klondike Solitaire is the most popular single-player card game in the world — the one that comes installed on nearly every computer. The goal is simple: move all 52 cards from the seven tableau columns up to four foundation piles, building each foundation by suit from Ace to King. Along the way, you build descending stacks in the tableau using alternating red and black cards, drawing from the stock pile whenever you run out of legal moves.",
          "Our version runs entirely in your browser — no downloads, no ads, no signup. Drag cards with your mouse on desktop or with your finger on mobile. Double-click any card to send it instantly to the right foundation when possible. Choose Draw 1 for a relaxing game with great winning odds, or Draw 3 for a tougher, more strategic experience. A move counter and timer track every game, and your best completion time is saved locally so you can keep beating your own record.",
        ]}
        faqs={[
          {
            question: "How do I win at Solitaire?",
            answer:
              "Move all 52 cards onto the four foundation piles, one for each suit, in ascending order from Ace to King. When every foundation is complete, you win.",
          },
          {
            question: "What's the difference between Draw 1 and Draw 3?",
            answer:
              "Draw 1 turns over one card at a time from the stock pile, giving you access to every card and a much higher winning rate. Draw 3 turns over three cards at once but you can only play the top one — this is the classic, harder mode.",
          },
          {
            question: "Can I undo a move?",
            answer:
              "Yes. The Undo button lets you reverse up to your last 3 moves, including drawing from the stock. Use it to recover from a misplay or to try a different line of play.",
          },
          {
            question: "Does Solitaire work on mobile?",
            answer:
              "Yes. The board is fully responsive and supports touch drag-and-drop. Tap and drag cards with your finger, or double-tap to auto-move a card to its foundation.",
          },
        ]}
      />

      <RelatedTools currentSlug="solitaire" />
    </ToolPageShell>
  );
}

// ---------- Helpers / sub-components ----------
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center px-4 py-2 rounded-xl bg-secondary/60 border border-border min-w-[80px]">
      <p className="text-xs text-muted-foreground font-bold">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function getPileCards(s: GameState, p: Pile): Card[] {
  if (p === "W") return s.waste;
  if (p.startsWith("T")) return s.tableau[parseInt(p[1], 10)];
  if (p.startsWith("F")) return s.foundations[parseInt(p[1], 10)];
  return [];
}

// ---------- Board / drag-and-drop ----------
type DragData = { from: Pile; cardId: string; cards: Card[] };

function Board({
  state,
  onStock,
  onMove,
  onAuto,
}: {
  state: GameState;
  onStock: () => void;
  onMove: (from: Pile, cardId: string, to: Pile) => boolean;
  onAuto: (from: Pile, cardId: string) => void;
}) {
  const [drag, setDrag] = useState<DragData | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverPile, setHoverPile] = useState<Pile | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const tableauRef = useRef<HTMLDivElement | null>(null);
  const pileRefs = useRef<Map<Pile, HTMLDivElement>>(new Map());
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [colWidth, setColWidth] = useState(80);
  const [maxColH, setMaxColH] = useState(560);

  useLayoutEffect(() => {
    const el = tableauRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const gap = 8; // approx for grid gap
      const cw = Math.max(40, (w - 6 * gap) / 7);
      setColWidth(cw);
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      setMaxColH(Math.max(280, Math.min(620, vh * 0.62)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const cardH = (colWidth * 7) / 5;

  const computeOffsets = useCallback(
    (col: Card[]): number[] => {
      if (col.length === 0) return [];
      if (col.length === 1) return [0];
      const maxOffset = Math.min(28, cardH * 0.32);
      const minOffset = 4;
      const avail = Math.max(0, maxColH - cardH);
      const desired = avail / (col.length - 1);
      const baseOffset = Math.max(minOffset, Math.min(maxOffset, desired));
      const offsets: number[] = [0];
      let cum = 0;
      for (let i = 1; i < col.length; i++) {
        const prevDown = !col[i - 1].faceUp;
        cum += prevDown ? baseOffset * 0.5 : baseOffset;
        offsets.push(cum);
      }
      return offsets;
    },
    [cardH, maxColH],
  );

  const setPileRef = useCallback((p: Pile) => {
    return (el: HTMLDivElement | null) => {
      if (el) pileRefs.current.set(p, el);
      else pileRefs.current.delete(p);
    };
  }, []);

  const findDropTarget = (x: number, y: number): Pile | null => {
    for (const [p, el] of pileRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return p;
    }
    return null;
  };

  const beginDrag = (
    e: React.PointerEvent,
    from: Pile,
    cardId: string,
    cards: Card[],
  ) => {
    if (!cards.length) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ from, cardId, cards });
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (pointerStartRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      if (dx * dx + dy * dy > 16) dragMovedRef.current = true;
    }
    setDragPos({ x: e.clientX, y: e.clientY });
    setHoverPile(findDropTarget(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = dragMovedRef.current;
    const from = drag.from;
    const cardId = drag.cardId;
    if (moved) {
      const target = findDropTarget(e.clientX, e.clientY);
      if (target && target !== from) onMove(from, cardId, target);
    } else {
      // Treat as tap — detect double-tap for auto-foundation
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.id === cardId && now - last.t < 350) {
        onAuto(from, cardId);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { id: cardId, t: now };
      }
    }
    setDrag(null);
    setDragPos(null);
    setHoverPile(null);
    pointerStartRef.current = null;
    dragMovedRef.current = false;
  };

  const renderCard = (
    c: Card,
    from: Pile,
    stackBelow: Card[],
    offsetY = 0,
    z = 0,
  ) => {
    const draggable = c.faceUp;
    return (
      <div
        key={c.id}
        onPointerDown={(e) => {
          if (!draggable) return;
          e.preventDefault();
          const idx = stackBelow.findIndex((x) => x.id === c.id);
          const cards = idx >= 0 ? stackBelow.slice(idx) : [c];
          if (from === "W" || from.startsWith("F")) {
            beginDrag(e, from, c.id, [c]);
          } else {
            beginDrag(e, from, c.id, cards);
          }
        }}
        className={`absolute left-0 right-0 mx-auto select-none touch-none ${
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        style={{ top: offsetY, zIndex: z }}
      >
        <CardFace card={c} hidden={drag?.cards.some((x) => x.id === c.id) ?? false} />
      </div>
    );
  };


  return (
    <div
      ref={boardRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative mx-auto max-w-[640px] touch-none select-none"
    >
      {/* Top row: stock, waste, foundations */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
        {/* Stock */}
        <div className="col-span-1">
          <PileSlot onClick={onStock}>
            {state.stock.length > 0 ? (
              <CardBack />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-border rounded-md">
                ↻
              </div>
            )}
          </PileSlot>
        </div>
        {/* Waste */}
        <div className="col-span-1">
          <PileSlot pileRef={setPileRef("W")} highlight={hoverPile === "W"}>
            {state.waste.length === 0 ? (
              <EmptySlot />
            ) : (
              renderCard(
                state.waste[state.waste.length - 1],
                "W",
                [state.waste[state.waste.length - 1]],
                0,
                10,
              )
            )}
          </PileSlot>
        </div>
        {/* Spacer */}
        <div className="col-span-1" />
        {/* Foundations */}
        {[0, 1, 2, 3].map((i) => {
          const p: Pile = `F${i}` as Pile;
          const f = state.foundations[i];
          return (
            <div key={p} className="col-span-1">
              <PileSlot pileRef={setPileRef(p)} highlight={hoverPile === p}>
                {f.length === 0 ? (
                  <EmptySlot label={SUIT_GLYPH[SUITS[i]]} />
                ) : (
                  renderCard(f[f.length - 1], p, [f[f.length - 1]], 0, 10)
                )}
              </PileSlot>
            </div>
          );
        })}
      </div>

      {/* Tableau */}
      <div ref={tableauRef} className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {state.tableau.map((col, i) => {
          const p: Pile = `T${i}` as Pile;
          const offsets = computeOffsets(col);
          const lastOff = offsets.length ? offsets[offsets.length - 1] : 0;
          const minH = Math.max(cardH || 96, lastOff + (cardH || 96));
          return (
            <div key={p} className="col-span-1">
              <div
                ref={setPileRef(p)}
                className={`relative w-full rounded-md border ${
                  hoverPile === p ? "border-cyan-400 bg-cyan-500/10" : "border-border/40 bg-secondary/20"
                }`}
                style={{ minHeight: minH, aspectRatio: col.length <= 1 ? "5 / 7" : undefined }}
              >
                {col.length === 0 ? (
                  <EmptySlot />
                ) : (
                  col.map((c, idx) => renderCard(c, p, col, offsets[idx], idx + 1))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating drag preview */}
      {drag && dragPos && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: dragPos.x - (colWidth / 2), top: dragPos.y - 24, width: colWidth }}
        >
          {drag.cards.map((c, i) => {
            const previewOffset = Math.min(28, cardH * 0.32);
            return (
              <div key={c.id} className="absolute left-0 right-0" style={{ top: i * previewOffset }}>
                <CardFace card={c} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PileSlot({
  children,
  onClick,
  pileRef,
  highlight,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  pileRef?: (el: HTMLDivElement | null) => void;
  highlight?: boolean;
}) {
  return (
    <div
      ref={pileRef}
      onClick={onClick}
      className={`relative w-full rounded-md border ${
        highlight ? "border-cyan-400 bg-cyan-500/10" : "border-border/40 bg-secondary/20"
      } ${onClick ? "cursor-pointer" : ""}`}
      style={{ aspectRatio: "5 / 7" }}
    >
      {children}
    </div>
  );
}

function EmptySlot({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-2xl text-muted-foreground/40 font-bold">
      {label ?? ""}
    </div>
  );
}

function CardFace({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div className="w-full rounded-md border border-dashed border-border/40 bg-transparent" style={{ aspectRatio: "5 / 7" }} />
    );
  }
  if (!card.faceUp) return <CardBack />;
  const red = isRed(card.suit);
  return (
    <div
      className={`w-full rounded-md border border-border bg-white shadow-sm flex flex-col justify-between p-1 sm:p-1.5 ${
        red ? "text-red-600" : "text-slate-900"
      }`}
      style={{ aspectRatio: "5 / 7" }}
    >
      <div className="text-[10px] sm:text-xs font-black leading-none text-left">
        {RANK_LABEL[card.rank]}
        <div className="text-xs sm:text-sm leading-none">{SUIT_GLYPH[card.suit]}</div>
      </div>
      <div className="text-lg sm:text-2xl font-black text-center leading-none">
        {SUIT_GLYPH[card.suit]}
      </div>
      <div className="text-[10px] sm:text-xs font-black leading-none text-right rotate-180">
        {RANK_LABEL[card.rank]}
        <div className="text-xs sm:text-sm leading-none">{SUIT_GLYPH[card.suit]}</div>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div
      className="w-full rounded-md border border-cyan-900 shadow-sm overflow-hidden p-1"
      style={{ aspectRatio: "5 / 7", backgroundColor: "#0b3a4a" }}
    >
      <div
        className="w-full h-full rounded-[3px]"
        style={{
          backgroundColor: "#0e4356",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(34,211,238,0.28) 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, rgba(34,211,238,0.28) 0 1.5px, transparent 1.5px 7px)",
          border: "1.5px solid rgba(34,211,238,0.45)",
        }}
      />
    </div>
  );
}
