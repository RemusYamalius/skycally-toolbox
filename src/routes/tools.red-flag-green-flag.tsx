import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Settings2, ChevronDown, RotateCcw, Copy, Check, Heart, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound } from "@/lib/sound";
import {
  BEHAVIORS,
  BEHAVIOR_TOTAL,
  CATEGORY_META,
  type FlagCategory,
} from "@/lib/red-flag-green-flag/behaviors";

const STORAGE_KEY = "skycally:rfgf:custom";
const SESSION_SIZE = 25;

type PoolCategory = FlagCategory | "custom";
type Mode = "solo" | "couple";
type Verdict = "red" | "green";

interface Card {
  text: string;
  category: PoolCategory;
}

const TIERS = [
  {
    max: 20,
    name: "Extremely Forgiving 🕊️",
    blurb: "Almost nothing reads as a red flag to you. Make sure that's generosity, not a lack of boundaries.",
    gradient: "linear-gradient(135deg,#22c55e,#14b8a6)",
  },
  {
    max: 40,
    name: "Easy-Going 🌿",
    blurb: "You give people room to be imperfect and only flag the things that really matter.",
    gradient: "linear-gradient(135deg,#84cc16,#22c55e)",
  },
  {
    max: 60,
    name: "Balanced 🧭",
    blurb: "You spot the real problems without treating every quirk like a crime. Healthy middle ground.",
    gradient: "linear-gradient(135deg,#0ea5e9,#6366f1)",
  },
  {
    max: 80,
    name: "High Standards 🚩",
    blurb: "Your bar is high and your boundaries are loud. Great filter — just leave room for growth.",
    gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
  },
  {
    max: 100,
    name: "Zero Tolerance 🔴",
    blurb: "Almost everything is a deal-breaker. Nothing wrong with that, as long as it's choice, not fear.",
    gradient: "linear-gradient(135deg,#b91c1c,#7f1d1d)",
  },
];

const tierFor = (score: number) => TIERS.find((t) => score <= t.max) ?? TIERS[TIERS.length - 1];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const Route = createFileRoute("/tools/red-flag-green-flag")({
  head: () => {
    const tool = toolBySlug("red-flag-green-flag", tools);
    const title =
      "Red Flag / Green Flag — Test Your Relationship Tolerance & Couple Compatibility | Skycally";
    const description =
      "Free red flag green flag quiz: rate 200 relationship behaviors as red or green flags, get your tolerance score, and use couple mode as a compatibility test to see exactly where you and your partner disagree.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Red Flag / Green Flag",
            alternateName: [
              "Red Flag Green Flag Quiz",
              "Red Flag Test Relationship",
              "Couple Compatibility Test",
              "Green Flag Dating Quiz",
            ],
            applicationCategory: "GameApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: tool.featureList ?? [],
          }),
        },
      ],
    };
  },
  component: RedFlagGreenFlag,
});

function RedFlagGreenFlag() {
  const [phase, setPhase] = useState<"intro" | "playing" | "handoff" | "result">("intro");
  const [mode, setMode] = useState<Mode>("solo");
  const [player, setPlayer] = useState<1 | 2>(1);
  const [active, setActive] = useState<FlagCategory[]>(CATEGORY_META.map((c) => c.id));
  const [custom, setCustom] = useState<string[]>([]);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newBehavior, setNewBehavior] = useState("");

  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [p1, setP1] = useState<Verdict[]>([]);
  const [p2, setP2] = useState<Verdict[]>([]);
  const [dir, setDir] = useState<1 | -1>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustom(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      /* ignore unreadable storage */
    }
  }, []);

  const persist = (next: string[]) => {
    setCustom(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore write failures (private mode) */
    }
  };

  const buildDeck = (): Card[] => {
    const customCards: Card[] = custom.map((text) => ({ text, category: "custom" as const }));
    const cats = active.length ? active : CATEGORY_META.map((c) => c.id);
    const perCat = Math.ceil((SESSION_SIZE - Math.min(customCards.length, 5)) / cats.length);
    const picked: Card[] = [];
    for (const cat of cats) {
      const items = shuffle(BEHAVIORS.filter((b) => b.category === cat)).slice(0, perCat);
      picked.push(...items.map((b) => ({ text: b.text, category: b.category as PoolCategory })));
    }
    const merged = shuffle([...shuffle(customCards).slice(0, 5), ...shuffle(picked)]);
    if (merged.length < SESSION_SIZE) {
      const extra = shuffle(BEHAVIORS.filter((b) => !merged.some((m) => m.text === b.text))).slice(
        0,
        SESSION_SIZE - merged.length,
      );
      merged.push(...extra.map((b) => ({ text: b.text, category: b.category as PoolCategory })));
    }
    return shuffle(merged).slice(0, SESSION_SIZE);
  };

  const start = (m: Mode) => {
    playSound("click");
    setMode(m);
    setPlayer(1);
    setDeck(buildDeck());
    setIndex(0);
    setP1([]);
    setP2([]);
    setCopied(false);
    setPhase("playing");
  };

  const restart = () => {
    setPhase("intro");
    setIndex(0);
    setP1([]);
    setP2([]);
    setPlayer(1);
  };

  const answer = (verdict: Verdict) => {
    const card = deck[index];
    if (!card) return;
    setDir(verdict === "red" ? 1 : -1);
    const isP1 = player === 1;
    const next = [...(isP1 ? p1 : p2), verdict];
    if (isP1) setP1(next);
    else setP2(next);

    if (index + 1 >= deck.length) {
      if (mode === "couple" && isP1) {
        playSound("finish");
        setPhase("handoff");
      } else {
        playSound("finish");
        setPhase("result");
      }
    } else {
      playSound(verdict === "red" ? "fail" : "success");
      setIndex(index + 1);
    }
  };

  const startPlayerTwo = () => {
    playSound("click");
    // Player 2 sees the exact same deck, in the exact same order.
    setPlayer(2);
    setIndex(0);
    setPhase("playing");
  };

  const toggleCategory = (id: FlagCategory) => {
    setActive((prev: FlagCategory[]) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const addBehavior = () => {
    const t = newBehavior.trim();
    if (!t) return;
    persist([...custom, t]);
    setNewBehavior("");
  };

  const total = deck.length || SESSION_SIZE;
  const answersSoFar = player === 1 ? p1 : p2;
  const progress = Math.min(100, Math.round((index / total) * 100));
  const current = deck[index];
  const currentMeta = current ? CATEGORY_META.find((c) => c.id === current.category) : undefined;

  const soloResult = useMemo(() => {
    if (!p1.length) return null;
    const redCount = p1.filter((v) => v === "red").length;
    const score = Math.round((redCount / p1.length) * 100);
    const tally: Partial<Record<PoolCategory, number>> = {};
    p1.forEach((v, i) => {
      if (v === "red" && deck[i]) {
        const c = deck[i].category;
        tally[c] = (tally[c] ?? 0) + 1;
      }
    });
    let topCat: PoolCategory | null = null;
    let topN = 0;
    for (const [k, v] of Object.entries(tally)) {
      if ((v as number) > topN) {
        topN = v as number;
        topCat = k as PoolCategory;
      }
    }
    const meta = topCat && topCat !== "custom" ? CATEGORY_META.find((c) => c.id === topCat) : null;
    const grid = p1.map((v) => (v === "red" ? "🚩" : "💚")).join("");
    return { redCount, greenCount: p1.length - redCount, score, tier: tierFor(score), grid, meta };
  }, [p1, deck]);

  const coupleResult = useMemo(() => {
    if (mode !== "couple" || p2.length !== p1.length || !p1.length) return null;
    const disagreements = deck
      .map((card, i) => ({ card, a: p1[i], b: p2[i] }))
      .filter((row) => row.a !== row.b);
    const agree = p1.length - disagreements.length;
    const match = Math.round((agree / p1.length) * 100);
    const p1Red = p1.filter((v) => v === "red").length;
    const p2Red = p2.filter((v) => v === "red").length;
    const verdictText =
      match >= 85
        ? "Almost the same rulebook 💚"
        : match >= 70
          ? "Strongly aligned, a few things to talk about 🌿"
          : match >= 50
            ? "Half aligned — the gaps are worth a real conversation 🧭"
            : "Very different bars. Not doom, but talk about it 🚩";
    return { disagreements, agree, match, p1Red, p2Red, verdictText };
  }, [mode, p1, p2, deck]);

  const shareText = coupleResult
    ? `🚩💚 Red Flag / Green Flag — Couple Mode\nMatch: ${coupleResult.match}% (${coupleResult.agree}/${p1.length} agreed)\nDisagreements: ${coupleResult.disagreements.length}\nskycally.com/tools/red-flag-green-flag`
    : soloResult
      ? `🚩💚 Red Flag / Green Flag\n${soloResult.grid}\nRed Flag Score: ${soloResult.score}% — ${soloResult.tier.name}\nStrictest area: ${
          soloResult.meta ? `${soloResult.meta.emoji} ${soloResult.meta.label}` : "✍️ Your own behaviors"
        }\nskycally.com/tools/red-flag-green-flag`
      : "";

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      playSound("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Red Flag / Green Flag"
      description="Rate 200 relationship behaviors as red or green flags, get your tolerance score, and compare answers with your partner in couple mode."
    >
      <div className="max-w-2xl mx-auto min-w-0">
        <AnimatePresence mode="wait">
          {/* ---------------- INTRO ---------------- */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.button
                  type="button"
                  onClick={() => start("solo")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden rounded-3xl p-8 min-h-[240px] text-left text-white shadow-2xl"
                  style={{ background: "linear-gradient(135deg,#ef4444,#ec4899 60%,#8b5cf6)" }}
                >
                  <span className="absolute -right-4 -top-6 text-[8rem] opacity-15 select-none" aria-hidden="true">
                    🚩
                  </span>
                  <Heart className="w-8 h-8 mb-3" aria-hidden="true" />
                  <h2 className="font-display text-3xl font-black tracking-tight">Solo Mode</h2>
                  <p className="mt-2 text-sm opacity-90">
                    Rate {SESSION_SIZE} behaviors on your own and get your Red Flag Tolerance Score.
                  </p>
                  <span className="mt-5 inline-block rounded-full bg-white/95 px-6 py-2.5 text-sm font-black text-[#ef4444]">
                    Start solo
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => start("couple")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden rounded-3xl p-8 min-h-[240px] text-left text-white shadow-2xl"
                  style={{ background: "linear-gradient(135deg,#059669,#14b8a6 55%,#0ea5e9)" }}
                >
                  <span className="absolute -right-4 -top-6 text-[8rem] opacity-15 select-none" aria-hidden="true">
                    💚
                  </span>
                  <Users className="w-8 h-8 mb-3" aria-hidden="true" />
                  <h2 className="font-display text-3xl font-black tracking-tight">Couple Mode</h2>
                  <p className="mt-2 text-sm opacity-90">
                    Both of you answer the same {SESSION_SIZE} cards, then see exactly where you disagree.
                  </p>
                  <span className="mt-5 inline-block rounded-full bg-white/95 px-6 py-2.5 text-sm font-black text-[#059669]">
                    Start couple test
                  </span>
                </motion.button>
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {BEHAVIOR_TOTAL} behaviors · {SESSION_SIZE} per round · nothing leaves your device
              </p>

              {/* Category chips */}
              <div className="mt-8">
                <p className="text-sm font-semibold mb-3">Pick your categories</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_META.map((c) => {
                    const on = active.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all ${
                          on
                            ? "border-transparent text-white shadow-md"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                        }`}
                        style={on ? { background: c.gradient } : undefined}
                      >
                        <span className="mr-1.5">{c.emoji}</span>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom behaviors */}
              <Collapsible open={showCustomize} onOpenChange={setShowCustomize} className="mt-6">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Settings2 className="w-4 h-4" /> Add your own behaviors ({custom.length})
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showCustomize ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 rounded-2xl border border-border bg-card/50 p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newBehavior}
                      onChange={(e) => setNewBehavior(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBehavior();
                        }
                      }}
                      placeholder="e.g. Never says thank you to a waiter"
                      aria-label="New behavior"
                    />
                    <Button type="button" onClick={addBehavior} className="shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {custom.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {custom.map((t, i) => (
                        <li
                          key={`${t}-${i}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 break-words">{t}</span>
                          <button
                            type="button"
                            aria-label={`Delete behavior: ${t}`}
                            onClick={() => persist(custom.filter((_, j) => j !== i))}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your custom behaviors are saved in this browser only, and up to 5 are mixed into each round.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )}

          {/* ---------------- PLAYING ---------------- */}
          {phase === "playing" && current && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {mode === "couple" && (
                <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold">
                  <span
                    className={`rounded-full px-3 py-1 ${
                      player === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    Player 1 {player === 2 ? "✓" : ""}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      player === 2
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    Player 2
                  </span>
                </div>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    {index + 1} of {total}
                  </span>
                  <span>{answersSoFar.filter((v) => v === "red").length} red flags so far</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#22c55e,#facc15,#ef4444)" }}
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Card */}
              <div className="relative min-h-[320px] sm:min-h-[360px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${player}-${index}-${current.text}`}
                    initial={{ opacity: 0, x: dir * -260, rotate: dir * -6 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    exit={{ opacity: 0, x: dir * 320, rotate: dir * 10, pointerEvents: "none" }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.35}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 110) answer("red");
                      else if (info.offset.x < -110) answer("green");
                    }}
                    className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
                    style={{
                      background: currentMeta ? currentMeta.gradient : "linear-gradient(135deg,#475569,#1e293b)",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[13rem] opacity-15 select-none"
                      aria-hidden="true"
                    >
                      {currentMeta ? currentMeta.emoji : "✍️"}
                    </span>
                    <div className="relative h-full flex flex-col items-center justify-center p-7 text-center text-white">
                      <span className="mb-5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-widest uppercase backdrop-blur-sm">
                        {currentMeta ? `${currentMeta.emoji} ${currentMeta.label}` : "✍️ Your behavior"}
                      </span>
                      <p className="text-2xl sm:text-3xl font-black leading-snug drop-shadow-md">{current.text}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => answer("red")}
                  className="min-h-[64px] rounded-2xl px-3 text-base sm:text-lg font-black text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
                >
                  🚩 Red Flag
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => answer("green")}
                  className="min-h-[64px] rounded-2xl px-3 text-base sm:text-lg font-black text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#22c55e,#059669)" }}
                >
                  💚 Green Flag
                </motion.button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Tip: swipe the card right for a red flag, left for a green flag.
              </p>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restart
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------------- HANDOFF ---------------- */}
          {phase === "handoff" && (
            <motion.div
              key="handoff"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
            >
              <p className="text-5xl mb-4" aria-hidden="true">
                🤝
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-black">Player 1 done ✓</h2>
              <p className="mt-3 opacity-90">
                Hand the device to Player 2. They'll see exactly the same {total} cards, in exactly the same order —
                and Player 1's answers stay hidden.
              </p>
              <motion.button
                type="button"
                onClick={startPlayerTwo}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="mt-8 rounded-full bg-white/95 px-10 py-4 text-lg font-black text-[#4f46e5] shadow-xl"
              >
                I'm Player 2 — start
              </motion.button>
            </motion.div>
          )}

          {/* ---------------- RESULT ---------------- */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              {mode === "couple" && coupleResult ? (
                <>
                  <div
                    className="rounded-3xl p-8 text-center text-white shadow-2xl"
                    style={{ background: "linear-gradient(135deg,#059669,#0ea5e9 60%,#6366f1)" }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">Couple compatibility</p>
                    <p className="mt-2 font-display text-6xl sm:text-7xl font-black">{coupleResult.match}%</p>
                    <p className="mt-2 text-lg font-bold">{coupleResult.verdictText}</p>
                    <p className="mt-3 text-sm opacity-90">
                      You agreed on {coupleResult.agree} of {p1.length} behaviors.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card p-4 text-center min-w-0">
                      <p className="text-xs text-muted-foreground">Player 1 red flags</p>
                      <p className="text-2xl font-black">{coupleResult.p1Red}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 text-center min-w-0">
                      <p className="text-xs text-muted-foreground">Player 2 red flags</p>
                      <p className="text-2xl font-black">{coupleResult.p2Red}</p>
                    </div>
                  </div>

                  <h3 className="mt-8 font-display text-xl font-bold">
                    Where you disagreed ({coupleResult.disagreements.length})
                  </h3>
                  {coupleResult.disagreements.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Not a single disagreement. Either you're perfectly matched or one of you was copying.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {coupleResult.disagreements.map((row, i) => (
                        <li
                          key={`${row.card.text}-${i}`}
                          className="overflow-hidden rounded-2xl border border-border bg-card min-w-0"
                        >
                          <p className="p-4 text-sm font-semibold break-words">{row.card.text}</p>
                          <div className="grid grid-cols-2 text-xs font-bold text-white">
                            <div
                              className="p-3 text-center"
                              style={{
                                background: row.a === "red" ? "#dc2626" : "#16a34a",
                              }}
                            >
                              Player 1 · {row.a === "red" ? "🚩 Red" : "💚 Green"}
                            </div>
                            <div
                              className="p-3 text-center"
                              style={{
                                background: row.b === "red" ? "#dc2626" : "#16a34a",
                              }}
                            >
                              Player 2 · {row.b === "red" ? "🚩 Red" : "💚 Green"}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                soloResult && (
                  <>
                    <div
                      className="rounded-3xl p-8 text-center text-white shadow-2xl"
                      style={{ background: soloResult.tier.gradient }}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                        Red flag tolerance score
                      </p>
                      <p className="mt-2 font-display text-6xl sm:text-7xl font-black">{soloResult.score}%</p>
                      <p className="mt-2 text-2xl font-black">{soloResult.tier.name}</p>
                      <p className="mt-3 text-sm opacity-90 max-w-md mx-auto">{soloResult.tier.blurb}</p>
                      <p className="mt-5 break-all text-2xl leading-relaxed">{soloResult.grid}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-card p-4 text-center min-w-0">
                        <p className="text-xs text-muted-foreground">🚩 Red flags</p>
                        <p className="text-2xl font-black">{soloResult.redCount}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card p-4 text-center min-w-0">
                        <p className="text-xs text-muted-foreground">💚 Green flags</p>
                        <p className="text-2xl font-black">{soloResult.greenCount}</p>
                      </div>
                    </div>

                    {soloResult.meta && (
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        Strictest area: <span className="font-semibold text-foreground">
                          {soloResult.meta.emoji} {soloResult.meta.label}
                        </span>
                      </p>
                    )}
                  </>
                )
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={copyResult} className="min-h-[48px]">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied" : "Copy result"}
                </Button>
                <Button variant="outline" onClick={restart} className="min-h-[48px]">
                  <RotateCcw className="w-4 h-4 mr-2" /> Play again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Into relationship games? Try the{" "}
        <Link to="/tools/ick-test" className="text-primary underline underline-offset-4">
          Ick Test
        </Link>{" "}
        to find your Ick Sensitivity Score, play{" "}
        <Link to="/tools/most-likely-to" className="text-primary underline underline-offset-4">
          Most Likely To
        </Link>{" "}
        with your group, or take the{" "}
        <Link to="/tools/attachment-style-test" className="text-primary underline underline-offset-4">
          Attachment Style Test
        </Link>{" "}
        to understand your relationship patterns.
      </p>

      <AdZone id="red-flag-green-flag-mid" size="728x90" />

      <HowToUse
        steps={[
          "Choose Solo Mode to score your own tolerance, or Couple Mode to compare answers with your partner on one device.",
          `Pick the categories you care about, optionally add your own behaviors, then rate ${SESSION_SIZE} cards as 🚩 Red Flag or 💚 Green Flag by tapping or swiping.`,
          "In Solo Mode you get a tolerance score and your strictest area; in Couple Mode you get a match percentage and a split card for every behavior you disagreed on.",
        ]}
      />

      <ToolSeoContent
        title="Red Flag / Green Flag — Relationship Behavior Test & Couple Compatibility"
        description="A free red flag green flag quiz that turns 200 real relationship behaviors into a personal tolerance score — and a couple compatibility test that shows exactly which behaviors you and your partner rate differently."
        body={[
          "Red flag and green flag language went from group chats to everyday conversation because it gives people a fast, shared way to describe behavior. A red flag is a pattern that tends to predict trouble — silence as punishment, jokes at your expense, promises that never arrive. A green flag is the opposite: the small, unglamorous signals that someone is safe to be close to, like apologising properly or respecting a boundary the first time it's set. This red flag test puts 200 of those behaviors in front of you one at a time and asks you to make a call on each one.",
          "In Solo Mode you rate a random round of 25 behaviors and get a Red Flag Tolerance Score from 0 to 100. A low score means you're forgiving and give people a lot of room; a high score means very little slips past you. Neither end is automatically right. The score is most useful as a mirror: it shows you the areas — communication, respect, emotional safety, effort, social life or conflict — where you are strictest, which is usually where your past experiences left the deepest marks.",
          "Couple Mode turns the same deck into a compatibility test. Player 1 rates every card, hands the phone over, and Player 2 sees the exact same behaviors in the exact same order without seeing any of Player 1's answers. At the end you get a match percentage and, more importantly, a list of only the behaviors you disagreed on, shown as split red/green cards with each player's verdict. Agreements are hidden on purpose — the disagreements are the conversation.",
          "Nothing here is a diagnosis, and no result should end a relationship on its own. What a green flag dating quiz can do is give two people a low-pressure script for a topic that's usually hard to open: what counts as normal, what counts as a warning sign, and where those definitions quietly differ. Everything runs in your browser — the cards you add are stored only on your device, and no answers are ever uploaded.",
        ]}
        faqs={[
          {
            question: "What is a red flag green flag quiz?",
            answer:
              "It's a quiz that shows you one relationship behavior at a time and asks whether it's a warning sign (red flag) or a healthy sign (green flag). Your pattern of answers becomes a tolerance score that describes how strict or forgiving your standards are.",
          },
          {
            question: "How many behaviors are in this red flag test?",
            answer:
              "There are exactly 200 hand-written behaviors across six categories: Communication, Respect, Emotional, Effort, Social Life and Conflict. Each round draws 25 of them at random, balanced across the categories you've selected.",
          },
          {
            question: "How does couple mode work?",
            answer:
              "Player 1 rates all 25 cards on the device, then passes it to Player 2, who sees exactly the same cards in exactly the same order. Player 1's answers stay hidden until both are finished, so nobody is influenced.",
          },
          {
            question: "Why does the couple result only show disagreements?",
            answer:
              "Because the behaviors you both rated the same way don't need discussing. The result focuses on the split cards where one of you said red and the other said green — those gaps are where expectations quietly differ.",
          },
          {
            question: "Is a high red flag score bad?",
            answer:
              "No. A high score means most behaviors read as warning signs to you, which can reflect strong boundaries or past experiences worth being gentle with yourself about. A very low score isn't automatically healthier either — it can mean you're overlooking things.",
          },
          {
            question: "Can I add my own behaviors?",
            answer:
              "Yes. Open the custom section on the start screen and add anything you want tested. Up to five of your own behaviors are mixed into each round, and they're saved in your browser's local storage so they're there next time.",
          },
          {
            question: "Is this a real couple compatibility test?",
            answer:
              "It's a conversation tool, not a psychological assessment. The match percentage measures how similarly you two label behaviors — useful and often revealing, but it isn't a prediction about your relationship.",
          },
          {
            question: "Is the quiz free and private?",
            answer:
              "Completely free with no signup. Everything runs in your browser, answers are never sent anywhere, and your custom behaviors stay on your own device.",
          },
        ]}
      />

      <RelatedTools currentSlug="red-flag-green-flag" />
    </ToolPageShell>
  );
}
