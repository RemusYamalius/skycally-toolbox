import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share2, Sparkles, Trash2, Plus, Minus, FlaskConical, RotateCcw } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Button } from "@/components/ui/button";

import {
  ELEMENTS,
  ELEMENT_BY_SYMBOL,
  CATEGORY_COLORS,
  CATEGORY_LABEL,
  matchesFilter,
  type FilterId,
} from "@/data/elements";
import {
  mix,
  COMPOUNDS,
  DISCOVERY_CATEGORIES,
  hillKey,
  type MixResult,
  type DiscoveryCategory,
} from "@/lib/element-mixer/formula";

export const Route = createFileRoute("/tools/element-mixer")({
  head: () => buildToolMeta(toolBySlug("element-mixer", tools)),
  component: ElementMixerPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "skycally.element-mixer.discovered";
const MAX_ELEMENTS = 6;
const MAX_COUNT = 10;

// Most-used elements for mobile quick-select
const QUICK_ELEMENTS = ["H", "C", "N", "O", "Na", "Cl", "Ca", "Fe", "S", "K", "Mg", "P"];

// Real-world examples for tooltip
const REAL_WORLD: Record<string, string> = {
  H: "Water, acids, stars, all living things",
  He: "Party balloons, MRI machines, deep-sea diving",
  Li: "Phone batteries, mood-stabilizing drugs",
  Be: "Aerospace alloys, X-ray windows",
  B: "Borosilicate glass (Pyrex), antiseptics",
  C: "All life, diamonds, graphite, fuels",
  N: "Air (78%), fertilizers, explosives",
  O: "Air (21%), water, rust, fire",
  F: "Toothpaste, Teflon, refrigerants",
  Ne: "Neon signs, lasers",
  Na: "Table salt, baking soda, street lamps",
  Mg: "Fireworks (bright white), chlorophyll, alloys",
  Al: "Cans, foil, aircraft, electricity cables",
  Si: "Computer chips, glass, sand",
  P: "DNA, fertilizers, matches",
  S: "Gunpowder, rubber, eggs (the smell)",
  Cl: "Swimming pools, bleach, table salt",
  Ar: "Welding gas, incandescent light bulbs",
  K: "Banana (yes!), fertilizers, gunpowder",
  Ca: "Bones, teeth, concrete, chalk",
  Fe: "Steel, blood (haemoglobin), Earth's core",
  Cu: "Wires, coins, pipes, bronze",
  Zn: "Galvanising steel, sunscreen, batteries",
  Ag: "Jewellery, mirrors, photography",
  Au: "Jewellery, electronics, dentistry",
  Pb: "Old paint, car batteries, radiation shielding",
  Hg: "Old thermometers, fluorescent lamps",
  I: "Thyroid hormones, antiseptics, photography",
  Mn: "Steel alloys, AA batteries",
  Ti: "Sunscreen, aircraft, medical implants",
  Ba: "X-ray imaging, fireworks (green)",
  Br: "Flame retardants, photography",
  Sn: "Tin cans, solder, bronze",
  Cr: "Stainless steel, chrome plating",
  Ni: "Coins, rechargeable batteries, stainless steel",
  Co: "Vitamin B12, blue glass, alloys",
  Pt: "Catalytic converters, jewellery, cancer drugs",
  U: "Nuclear fuel, weapons",
  Rn: "Radioactive gas that seeps from soil into homes",
};

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "metals", label: "Metals" },
  { id: "nonmetals", label: "Non-Metals" },
  { id: "noble", label: "Noble Gases" },
  { id: "lanthanides", label: "Lanthanides" },
  { id: "actinides", label: "Actinides" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDiscovered(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Formula({ tokens }: { tokens: Array<{ s: string; n: number }> }) {
  return (
    <span>
      {tokens.map((t, i) => {
        const el = ELEMENT_BY_SYMBOL[t.s];
        const color = el ? CATEGORY_COLORS[el.category] : undefined;
        return (
          <span key={i} style={color ? { color } : undefined}>
            {t.s}
            {t.n > 1 ? <sub style={{ fontSize: "0.65em", verticalAlign: "sub" }}>{t.n}</sub> : null}
          </span>
        );
      })}
    </span>
  );
}

function CategoryPill({ cat }: { cat: DiscoveryCategory }) {
  const info = DISCOVERY_CATEGORIES.find((c) => c.id === cat);
  if (!info) return null;
  const colors: Record<DiscoveryCategory, string> = {
    life: "#06b6d4",
    kitchen: "#f59e0b",
    lab: "#8b5cf6",
    energy: "#f97316",
    minerals: "#10b981",
    industrial: "#6366f1",
    unknown: "#94a3b8",
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: `color-mix(in oklab, ${colors[cat]} 20%, transparent)`,
        color: colors[cat],
        border: `1px solid color-mix(in oklab, ${colors[cat]} 40%, transparent)`,
      }}
    >
      {info.emoji} {info.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function ElementMixerPage() {
  const tool = toolBySlug("element-mixer", tools);

  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<MixResult | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [isNewDiscovery, setIsNewDiscovery] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isMixing, setIsMixing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQuickMore, setShowQuickMore] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDiscovered(loadDiscovered());
  }, []);

  const visibleSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of ELEMENTS) if (matchesFilter(e.category, filter)) s.add(e.symbol);
    return s;
  }, [filter]);

  const addElement = useCallback((symbol: string) => {
    setSelected((cur) => {
      if (cur[symbol]) return { ...cur, [symbol]: Math.min(MAX_COUNT, cur[symbol] + 1) };
      if (Object.keys(cur).length >= MAX_ELEMENTS) return cur;
      return { ...cur, [symbol]: 1 };
    });
  }, []);

  const changeCount = (symbol: string, delta: number) => {
    setSelected((cur) => {
      const next = (cur[symbol] ?? 0) + delta;
      if (next <= 0) {
        const { [symbol]: _d, ...rest } = cur;
        return rest;
      }
      return { ...cur, [symbol]: Math.min(MAX_COUNT, next) };
    });
  };

  const clearAll = () => {
    setSelected({});
    setResult(null);
    setIsNewDiscovery(false);
  };

  const doMix = () => {
    if (isMixing || Object.keys(selected).length === 0) return;
    setIsMixing(true);
    setTimeout(() => {
      const r = mix(selected);
      setIsMixing(false);
      if (!r) return;
      setResult(r);
      const tag = r.known ? `known:${r.key}` : `unknown:${r.key}`;
      if (!discovered.has(tag)) {
        const next = new Set(discovered);
        next.add(tag);
        setDiscovered(next);
        saveDiscovered(next);
        setIsNewDiscovery(true);
      } else {
        setIsNewDiscovery(false);
      }
      // Scroll to result on mobile
      setTimeout(() => {
        if (window.innerWidth < 1024) {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }, 650);
  };

  const handleShare = async () => {
    if (!result) return;
    const formulaStr = result.formula.map((t) => (t.n > 1 ? `${t.s}${t.n}` : t.s)).join("");
    let text: string;
    if (result.known) {
      text = `I made ${result.known.name} (${formulaStr}) in Skycally Lab!\n${result.known.funFact}\nTry it: skycally.com/tools/element-mixer`;
    } else {
      text = `I discovered ${formulaStr} in Skycally Lab — a mystery compound that has never been synthesized!\nTry it: skycally.com/tools/element-mixer`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied to clipboard ✓");
    } catch {
      setShareStatus("Copy failed");
    }
    setTimeout(() => setShareStatus(null), 2500);
  };

  const resetProgress = () => {
    const empty = new Set<string>();
    setDiscovered(empty);
    saveDiscovered(empty);
    setShowResetConfirm(false);
  };

  // Stats
  const totalKnown = COMPOUNDS.length;
  const discoveredKnownCount = useMemo(() => {
    let n = 0;
    for (const t of discovered) if (t.startsWith("known:")) n++;
    return n;
  }, [discovered]);

  const perCategory = useMemo(() => {
    const map: Record<DiscoveryCategory, { total: number; found: number }> = {
      life: { total: 0, found: 0 },
      kitchen: { total: 0, found: 0 },
      lab: { total: 0, found: 0 },
      energy: { total: 0, found: 0 },
      minerals: { total: 0, found: 0 },
      industrial: { total: 0, found: 0 },
      unknown: { total: 0, found: 0 },
    };
    for (const c of COMPOUNDS) map[c.cat].total += 1;
    for (const t of discovered) {
      if (t.startsWith("known:")) {
        const key = t.slice(6);
        const cp = COMPOUNDS.find((x) => x.key === key);
        if (cp) map[cp.cat].found += 1;
      } else if (t.startsWith("unknown:")) {
        map.unknown.found += 1;
      }
    }
    return map;
  }, [discovered]);

  const selectedEntries = Object.entries(selected);
  const overallPct = totalKnown > 0 ? Math.round((discoveredKnownCount / totalKnown) * 100) : 0;

  // Quick select visible elements for mobile
  const quickVisible = showQuickMore ? QUICK_ELEMENTS : QUICK_ELEMENTS.slice(0, 8);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <style>{EM_CSS}</style>

      {/* ── Discovery progress ── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Lab progress</div>
            <div className="font-display text-2xl font-bold mt-1">
              🔬 {discoveredKnownCount}{" "}
              <span className="text-muted-foreground font-normal text-lg">/ {totalKnown}+ compounds discovered</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{overallPct}% complete</span>
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Reset all progress?</span>
                <button
                  onClick={resetProgress}
                  className="px-2 py-1 rounded text-xs bg-destructive text-destructive-foreground font-bold"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 rounded text-xs border border-border"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Overall bar */}
        <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
          <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${overallPct}%` }} />
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {DISCOVERY_CATEGORIES.map((c) => {
            const stats = perCategory[c.id];
            const pct = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : stats.found > 0 ? 100 : 0;
            const locked = stats.found === 0;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-background/40 p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                  <span aria-hidden>{locked ? "🔒" : c.emoji}</span>
                  <span className="truncate">{c.label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {c.id === "unknown" ? `${stats.found} found` : `${stats.found} / ${stats.total}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              filter === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* ── Mobile quick-select ── */}
      <div className="mt-3 lg:hidden">
        <div className="text-xs text-muted-foreground mb-2">Quick add — most used elements:</div>
        <div className="flex flex-wrap gap-2">
          {quickVisible.map((sym) => {
            const el = ELEMENT_BY_SYMBOL[sym];
            const color = CATEGORY_COLORS[el.category];
            const isSel = !!selected[sym];
            return (
              <button
                key={sym}
                onClick={() => addElement(sym)}
                className="em-quick-btn"
                style={{
                  ["--cat" as string]: color,
                  background: isSel
                    ? `color-mix(in oklab, ${color} 32%, var(--card))`
                    : `color-mix(in oklab, ${color} 12%, var(--card))`,
                  border: `1px solid color-mix(in oklab, ${color} 55%, transparent)`,
                  boxShadow: isSel ? `0 0 14px color-mix(in oklab, ${color} 50%, transparent)` : "none",
                }}
              >
                <span className="font-black text-sm">{el.symbol}</span>
                <span className="text-[9px] text-muted-foreground">{el.name.slice(0, 6)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowQuickMore((v) => !v)}
            className="em-quick-btn border border-border bg-card text-xs text-muted-foreground"
          >
            {showQuickMore ? "Less ↑" : "More →"}
          </button>
        </div>
      </div>

      {/* ── Periodic table ── */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-3 sm:p-4 em-lab-bg relative">
        <div className="overflow-x-auto em-scroll-container">
          {/* Scroll hint fade — disappears after first scroll */}
          <div className="em-scroll-hint" aria-hidden />
          <div className="em-table">
            {ELEMENTS.map((el) => {
              const color = CATEGORY_COLORS[el.category];
              const visible = visibleSet.has(el.symbol);
              const isSelected = !!selected[el.symbol];
              const count = selected[el.symbol];
              return (
                <button
                  key={el.symbol}
                  type="button"
                  onClick={() => addElement(el.symbol)}
                  aria-label={`${el.name}, atomic number ${el.z}, ${CATEGORY_LABEL[el.category]}${REAL_WORLD[el.symbol] ? ` — ${REAL_WORLD[el.symbol]}` : ""}`}
                  title={`${el.name} (${CATEGORY_LABEL[el.category]})${REAL_WORLD[el.symbol] ? `\n${REAL_WORLD[el.symbol]}` : ""}`}
                  className={`em-cell ${visible ? "" : "em-dim"} ${isSelected ? "em-selected" : ""}`}
                  style={{
                    gridRow: el.period,
                    gridColumn: el.group,
                    ["--cat" as string]: color,
                  }}
                >
                  {count && <span className="em-count-badge">{count}</span>}
                  <span className="em-z">{el.z}</span>
                  <span className="em-sym">{el.symbol}</span>
                  <span className="em-mass">{el.mass}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-muted-foreground"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[k] }} />
              {CATEGORY_LABEL[k]}
            </span>
          ))}
        </div>
      </section>

      {/* ── Mixer + Result ── */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Mixer */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Mixer
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedEntries.length} / {MAX_ELEMENTS} elements
            </span>
          </div>

          {selectedEntries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">⚗️</p>
              <p className="text-sm text-muted-foreground">
                Click any element on the periodic table
                <br />
                to add it to your mix.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {selectedEntries.map(([sym, n]) => {
                const el = ELEMENT_BY_SYMBOL[sym];
                const color = CATEGORY_COLORS[el.category];
                return (
                  <div
                    key={sym}
                    className="rounded-xl border p-3 em-card"
                    style={{
                      borderColor: color,
                      background: `color-mix(in oklab, ${color} 12%, var(--card))`,
                      boxShadow: `0 0 18px color-mix(in oklab, ${color} 35%, transparent)`,
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="font-display text-2xl font-extrabold" style={{ color }}>
                        {el.symbol}
                      </div>
                      <div className="text-[10px] text-muted-foreground">#{el.z}</div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mb-2">{el.name}</div>
                    <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => changeCount(sym, -1)}
                        className="p-1 rounded hover:bg-secondary"
                        aria-label={`Remove one ${el.name} atom`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold tabular-nums">{n}</span>
                      <button
                        type="button"
                        onClick={() => changeCount(sym, +1)}
                        disabled={n >= MAX_COUNT}
                        className="p-1 rounded hover:bg-secondary disabled:opacity-40"
                        aria-label={`Add one ${el.name} atom`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={doMix}
              disabled={selectedEntries.length === 0 || isMixing}
              className="em-mix-btn flex-1 min-w-[140px]"
            >
              {isMixing ? (
                <span className="em-mixing-dots">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {selectedEntries.length > 0
                    ? `Mix ${selectedEntries.length} element${selectedEntries.length > 1 ? "s" : ""} ⚗️`
                    : "MIX ⚗️"}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearAll} disabled={selectedEntries.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </section>

        {/* Result */}
        <section ref={resultRef} className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <h2 className="font-display text-lg font-bold mb-3">Result</h2>

          {isMixing ? (
            <div className="py-10 text-center">
              <div className="em-lab-spinner mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Mixing in the lab...</p>
            </div>
          ) : !result ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Hit <span className="font-semibold">MIX ⚗️</span> to see what you've made.
            </p>
          ) : (
            <div className="relative">
              <div className={`em-anim em-anim-${result.animation}`} aria-hidden />

              <div className="relative flex flex-wrap items-baseline gap-3 mb-1">
                <div className="font-display text-4xl sm:text-5xl font-extrabold">
                  <Formula tokens={result.formula} />
                </div>
                {isNewDiscovery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold em-new-badge">
                    ✨ NEW DISCOVERY!
                  </span>
                )}
              </div>

              {result.known ? (
                <div className="relative mt-3 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base">{result.known.name}</span>
                    <CategoryPill cat={result.known.cat} />
                  </div>
                  <p className="text-muted-foreground">{result.known.description}</p>
                  {result.known.uses && (
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">Used for: </span>
                      {result.known.uses}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">Fun fact: </span>
                    {result.known.funFact}
                  </p>
                </div>
              ) : (
                <div className="relative mt-3 space-y-2 text-sm">
                  <CategoryPill cat="unknown" />
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">🪐 Not found in nature... or is it? </span>
                    This compound has never been synthesized. Theoretically it would be:
                  </p>
                  <p className="text-muted-foreground italic">{result.unknownDescription}</p>
                </div>
              )}

              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
                {shareStatus && <span className="text-xs text-muted-foreground">{shareStatus}</span>}
              </div>
            </div>
          )}
        </section>
      </div>

      <HowToUse
        steps={[
          "Browse the periodic table and click any element to add it to your mix. On mobile, use the Quick Add row for the most common elements.",
          "Use the +/- buttons to set how many atoms of each element you want (up to 10 per element, 6 elements max).",
          "Press MIX to see what compound you've created — real or imaginary!",
          "Discover real compounds to fill your Lab Progress. Each new compound unlocks a category badge. How many can you find?",
        ]}
      />

      <ToolSeoContent
        title="Element Mixer — Interactive Periodic Table & Chemistry Sandbox"
        description="Mix chemical elements, discover real compounds, and explore the periodic table in a fun interactive lab. Free chemistry tool for students, teachers, and curious minds."
        body={[
          "Skycally's Element Mixer turns the periodic table into a playground. Pick any of the 118 known elements, set how many atoms of each you want, hit MIX, and watch what forms — water, salt, sugar, gunpowder, or something so exotic it has never been synthesized. It's built for students who want a hands-on feel for chemistry, teachers who need a quick classroom demo, and anyone whose curiosity outlived their last chemistry class.",
          "The periodic table organises every known element by atomic number and groups elements by how their outer electrons behave. Elements on the left love to give up an electron (alkali metals like sodium); elements on the right love to grab one (halogens like chlorine); noble gases on the far right almost never react at all. The position of an element on the table predicts almost everything about how it behaves — which is why Mendeleev was able to predict the existence of elements not yet discovered in 1869.",
          "Compounds form when atoms share or trade electrons to reach a more stable arrangement — that's called a chemical bond. Two hydrogens and one oxygen make water. One sodium and one chlorine make table salt. The Element Mixer recognises 55+ real compounds by their formula and shows their name, uses, and a fun fact. Mix something that isn't in the database and the lab will generate a plausible description of what it might be like — a glimpse into chemistry that hasn't been invented yet.",
        ]}
        faqs={[
          {
            question: "What is an element vs a compound?",
            answer:
              "An element is a pure substance made of only one type of atom — hydrogen, oxygen, gold. A compound is two or more different elements chemically bonded together in fixed ratios — water (H₂O), salt (NaCl), sugar (C₁₂H₂₂O₁₁).",
          },
          {
            question: "How do I make water in the element mixer?",
            answer:
              "Click H (hydrogen) to add it, then click it again so you have 2 atoms. Then click O (oxygen) once to add 1 atom. Press MIX and you'll discover H₂O — water!",
          },
          {
            question: "What is the most common compound on Earth?",
            answer:
              "Water — H₂O — covers about 71% of the planet's surface and makes up roughly 60% of the human body. It's also one of the few substances that naturally exists as a solid, liquid, and gas on Earth's surface.",
          },
          {
            question: "Can I mix more than 2 elements?",
            answer:
              "Yes! You can mix up to 6 different elements at once, with 1 to 10 atoms of each. That's enough to create sugars, fertilizers, gunpowder, acids, and most organic molecules in the database.",
          },
          {
            question: "Is this tool accurate for chemistry?",
            answer:
              "The recognised compounds and periodic-table data are scientifically accurate. The 'unknown compound' descriptions are imaginative and generated for fun — they're not real chemistry predictions.",
          },
          {
            question: "What happens when I mix unknown elements?",
            answer:
              "If your formula doesn't match any real compound in the database, the lab generates a plausible-sounding description based on the elements you used and unlocks it as an 'Unknown Territory' discovery. It still counts toward your progress!",
          },
          {
            question: "How many compounds are there to discover?",
            answer:
              "The current database has 55+ real compounds across 6 categories: Life Essentials, Kitchen Chemistry, Lab Classics, Energy & Fuels, Minerals & Gems, and Industrial Giants — plus unlimited Unknown Territory discoveries.",
          },
        ]}
      />

      <RelatedTools currentSlug="element-mixer" />
    </ToolPageShell>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const EM_CSS = `
.em-lab-bg {
  background-image:
    radial-gradient(circle at 20% 10%, color-mix(in oklab, var(--primary) 8%, transparent) 0, transparent 40%),
    repeating-linear-gradient(0deg, color-mix(in oklab, var(--border) 50%, transparent) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(90deg, color-mix(in oklab, var(--border) 50%, transparent) 0 1px, transparent 1px 32px);
}

/* Periodic table grid */
.em-table {
  display: grid;
  grid-template-columns: repeat(18, minmax(46px, 1fr));
  grid-auto-rows: 56px;
  gap: 4px;
  min-width: 920px;
}
.em-table > button { all: unset; }
.em-cell {
  position: relative;
  border: 1px solid color-mix(in oklab, var(--cat, var(--border)) 60%, var(--border));
  background: color-mix(in oklab, var(--cat, var(--card)) 14%, var(--card));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-align: center;
  padding: 2px;
  transition: transform 120ms ease, box-shadow 160ms ease, background 160ms ease;
  color: var(--foreground);
}
.em-cell:hover, .em-cell:focus-visible {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 0 18px color-mix(in oklab, var(--cat) 55%, transparent);
  z-index: 2;
  outline: none;
}
.em-cell.em-selected {
  background: color-mix(in oklab, var(--cat) 32%, var(--card));
  box-shadow: 0 0 22px color-mix(in oklab, var(--cat) 70%, transparent);
}
.em-cell.em-dim { opacity: 0.22; filter: saturate(0.3); }
.em-z    { font-size: 9px;  color: color-mix(in oklab, var(--foreground) 65%, transparent); line-height: 1; }
.em-sym  { font-weight: 800; font-size: 16px; line-height: 1.1; }
.em-mass { font-size: 9px;  color: color-mix(in oklab, var(--foreground) 55%, transparent); line-height: 1; }

/* Atom count badge on selected cell */
.em-count-badge {
  position: absolute;
  top: 2px; right: 3px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 8px;
  font-weight: 900;
  border-radius: 999px;
  padding: 0 3px;
  line-height: 1.6;
  min-width: 12px;
  text-align: center;
}

/* Scroll hint fade on right edge */
.em-scroll-container { position: relative; }
.em-scroll-hint {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 48px;
  background: linear-gradient(to right, transparent, var(--card));
  pointer-events: none;
  z-index: 3;
  border-radius: 0 12px 12px 0;
}
@media (min-width: 1024px) { .em-scroll-hint { display: none; } }

/* Mobile quick-add buttons */
.em-quick-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 5px 10px; border-radius: 10px; cursor: pointer;
  transition: transform 120ms ease, box-shadow 160ms ease;
  min-width: 46px;
}
.em-quick-btn:hover { transform: translateY(-1px); }

/* Mix button */
.em-mix-btn {
  background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 60%, #7c3aed));
  box-shadow: 0 0 24px color-mix(in oklab, var(--primary) 55%, transparent);
  animation: em-pulse 2.4s ease-in-out infinite;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--primary-foreground) !important;
}
.em-mix-btn:disabled { animation: none; opacity: 0.6; }
@keyframes em-pulse {
  0%, 100% { box-shadow: 0 0 22px color-mix(in oklab, var(--primary) 45%, transparent); }
  50%       { box-shadow: 0 0 36px color-mix(in oklab, var(--primary) 80%, transparent); }
}

/* Mixing dots animation */
.em-mixing-dots { display: inline-flex; gap: 5px; align-items: center; }
.em-mixing-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--primary-foreground);
  animation: em-dot 1s ease-in-out infinite;
}
.em-mixing-dots span:nth-child(2) { animation-delay: 0.2s; }
.em-mixing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes em-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1.1); opacity: 1; }
}

/* Lab spinner */
.em-lab-spinner {
  width: 44px; height: 44px;
  border: 3px solid color-mix(in oklab, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: em-spin 0.8s linear infinite;
}
@keyframes em-spin { to { transform: rotate(360deg); } }

/* New discovery badge */
.em-new-badge {
  background: linear-gradient(90deg, #facc15, #fb923c);
  color: #1a1300;
  animation: em-pop 600ms ease-out;
}
@keyframes em-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

/* Result animations */
.em-anim {
  position: absolute; inset: 0;
  pointer-events: none; border-radius: 12px; overflow: hidden;
}
.em-anim-calm::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 60%, #38bdf8 0%, transparent 60%);
  opacity: 0.18; animation: em-ripple 2.4s ease-out infinite;
}
@keyframes em-ripple {
  0%   { transform: scale(0.7); opacity: 0.25; }
  100% { transform: scale(1.6); opacity: 0; }
}
.em-anim-bubble::before, .em-anim-bubble::after {
  content: ""; position: absolute; bottom: -10px; width: 14px; height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, #67e8f9, transparent 70%);
  animation: em-bubble 3s linear infinite;
}
.em-anim-bubble::before { left: 18%; }
.em-anim-bubble::after  { left: 70%; animation-delay: 1.2s; }
@keyframes em-bubble {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  20%  { opacity: 0.9; }
  100% { transform: translateY(-220px) scale(1.2); opacity: 0; }
}
.em-anim-explosion::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, #fb923c 0%, #ef4444 30%, transparent 60%);
  opacity: 0.45; animation: em-boom 1.4s ease-out infinite;
}
@keyframes em-boom {
  0%   { transform: scale(0.2); opacity: 0.9; }
  60%  { opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
.em-anim-crystal::before {
  content: ""; position: absolute; inset: 10%;
  background: conic-gradient(from 45deg,
    transparent 0 25%,
    color-mix(in oklab, var(--primary) 30%, transparent) 25% 50%,
    transparent 50% 75%,
    color-mix(in oklab, var(--primary) 30%, transparent) 75% 100%);
  opacity: 0.18; animation: em-rotate 8s linear infinite;
}
@keyframes em-rotate { to { transform: rotate(360deg); } }
.em-anim-glow::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 60%, transparent) 0%, transparent 60%);
  opacity: 0.35; animation: em-glow 2.2s ease-in-out infinite;
}
@keyframes em-glow {
  0%, 100% { opacity: 0.18; }
  50%       { opacity: 0.45; }
}
.em-anim-flame::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(0deg, #f97316 0%, #facc15 40%, transparent 75%);
  opacity: 0.28; animation: em-flicker 320ms ease-in-out infinite alternate;
  transform-origin: bottom;
}
@keyframes em-flicker {
  from { transform: scaleY(1); opacity: 0.25; }
  to   { transform: scaleY(1.08); opacity: 0.35; }
}
.em-anim-sparkle::before, .em-anim-sparkle::after {
  content: "✦"; position: absolute; font-size: 14px; color: #fde68a;
  animation: em-sparkle 1.6s ease-in-out infinite;
}
.em-anim-sparkle::before { top: 18%; left: 22%; }
.em-anim-sparkle::after  { top: 60%; left: 78%; animation-delay: 0.7s; }
@keyframes em-sparkle {
  0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
  50%       { opacity: 1; transform: scale(1.2) rotate(120deg); }
}
.em-anim-danger::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg,
    color-mix(in oklab, #ef4444 35%, transparent) 0 12px, transparent 12px 24px);
  opacity: 0.18; animation: em-danger 1.6s ease-in-out infinite;
}
@keyframes em-danger {
  0%, 100% { opacity: 0.12; }
  50%       { opacity: 0.28; }
}
`;
