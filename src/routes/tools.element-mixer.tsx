import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Share2, Sparkles, Trash2, Plus, Minus } from "lucide-react";

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
  type MixResult,
  type DiscoveryCategory,
} from "@/lib/element-mixer/formula";

export const Route = createFileRoute("/tools/element-mixer")({
  head: () => buildToolMeta(toolBySlug("element-mixer", tools)),
  component: ElementMixerPage,
});

const STORAGE_KEY = "skycally.element-mixer.discovered";
const MAX_ELEMENTS = 6;
const MAX_COUNT = 10;

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "metals", label: "Metals" },
  { id: "nonmetals", label: "Non-Metals" },
  { id: "noble", label: "Noble Gases" },
  { id: "lanthanides", label: "Lanthanides" },
  { id: "actinides", label: "Actinides" },
];

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
  } catch { /* ignore */ }
}

function Formula({ tokens }: { tokens: Array<{ s: string; n: number }> }) {
  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i}>
          {t.s}
          {t.n > 1 ? <sub>{t.n}</sub> : null}
        </span>
      ))}
    </span>
  );
}

function ElementMixerPage() {
  const tool = toolBySlug("element-mixer", tools);

  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<MixResult | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [isNewDiscovery, setIsNewDiscovery] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => { setDiscovered(loadDiscovered()); }, []);

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
        const { [symbol]: _drop, ...rest } = cur;
        return rest;
      }
      return { ...cur, [symbol]: Math.min(MAX_COUNT, next) };
    });
  };

  const clearAll = () => { setSelected({}); setResult(null); setIsNewDiscovery(false); };

  const doMix = () => {
    const r = mix(selected);
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
  };

  const handleShare = async () => {
    if (!result) return;
    const formulaStr = result.formula.map((t) => (t.n > 1 ? `${t.s}${t.n}` : t.s)).join("");
    const desc = result.known
      ? `${result.known.name} — ${result.known.description}`
      : result.unknownDescription ?? "";
    const text = `${formulaStr} — ${desc}\n\nDiscovered with Skycally Element Mixer`;
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied to clipboard");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Copy failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

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

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <style>{EM_CSS}</style>

      {/* Discovery progress */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Lab progress</div>
            <div className="font-display text-2xl font-bold mt-1">
              You've discovered {discoveredKnownCount} / {totalKnown}+ compounds 🔬
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Mix elements to unlock new entries.
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {DISCOVERY_CATEGORIES.map((c) => {
            const stats = perCategory[c.id];
            const pct = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : (stats.found > 0 ? 100 : 0);
            const locked = stats.found === 0;
            return (
              <div key={c.id} className="rounded-lg border border-border bg-background/40 p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span aria-hidden>{locked ? "🔒" : c.emoji}</span>
                  <span className="truncate">{c.label}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {c.id === "unknown" ? `${stats.found} found` : `${stats.found} / ${stats.total}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filters */}
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

      {/* Periodic table */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-3 sm:p-4 em-lab-bg">
        <div className="overflow-x-auto">
          <div className="em-table">
            {ELEMENTS.map((el) => {
              const color = CATEGORY_COLORS[el.category];
              const visible = visibleSet.has(el.symbol);
              const isSelected = !!selected[el.symbol];
              return (
                <button
                  key={el.symbol}
                  type="button"
                  onClick={() => addElement(el.symbol)}
                  aria-label={`${el.name}, atomic number ${el.z}, ${CATEGORY_LABEL[el.category]}`}
                  title={`${el.name} (${CATEGORY_LABEL[el.category]})${el.examples ? ` — ${el.examples}` : ""}`}
                  className={`em-cell ${visible ? "" : "em-dim"} ${isSelected ? "em-selected" : ""}`}
                  style={{
                    gridRow: el.period,
                    gridColumn: el.group,
                    ["--cat" as string]: color,
                  }}
                >
                  <span className="em-z">{el.z}</span>
                  <span className="em-sym">{el.symbol}</span>
                  <span className="em-mass">{el.mass}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map((k) => (
            <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[k] }} />
              {CATEGORY_LABEL[k]}
            </span>
          ))}
        </div>
      </section>

      {/* Mixer + Result */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Mixer */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Mixer ⚗️</h2>
            <span className="text-xs text-muted-foreground">
              {selectedEntries.length} / {MAX_ELEMENTS} elements
            </span>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Click an element on the periodic table to add it here.
            </p>
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
                      <div className="font-display text-2xl font-extrabold">{el.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">#{el.z}</div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{el.name}</div>
                    <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-background/40 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => changeCount(sym, -1)}
                        className="p-1 rounded hover:bg-secondary"
                        aria-label={`Remove one ${el.name} atom`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold tabular-nums">{n}</span>
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
              disabled={selectedEntries.length === 0}
              className="em-mix-btn flex-1 min-w-[140px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              MIX ⚗️
            </Button>
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={selectedEntries.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </section>

        {/* Result */}
        <section className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <h2 className="font-display text-lg font-bold mb-3">Result</h2>

          {!result ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Hit <span className="font-semibold">MIX ⚗️</span> to see what you've made.
            </p>
          ) : (
            <div className="relative">
              <div className={`em-anim em-anim-${result.animation}`} aria-hidden />

              <div className="relative flex flex-wrap items-baseline gap-3">
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
                  <div className="font-semibold text-base">{result.known.name}</div>
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
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground">
                    🪐 Unknown Territory
                  </span>
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
                {shareStatus && (
                  <span className="text-xs text-muted-foreground">{shareStatus}</span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <HowToUse
        steps={[
          "Browse the periodic table and click any element to add it to your mix",
          "Use the +/- buttons to set how many atoms of each element you want",
          "Press MIX to see what compound you've created",
          "Discover real compounds or explore imaginary ones — and unlock achievements!",
        ]}
      />

      <ToolSeoContent
        title="Element Mixer — Interactive Periodic Table & Chemistry Sandbox"
        description="Mix chemical elements, discover real compounds, and explore the periodic table in a fun interactive lab. Free chemistry tool for students, teachers, and curious minds."
        body={[
          "Skycally's Element Mixer turns the periodic table into a playground. Pick any of the 118 elements, set how many atoms of each you want, hit MIX, and watch what forms — water, salt, sugar, gunpowder, or something so exotic it has never been synthesized. It's built for students who want a hands-on feel for chemistry, teachers who need a quick classroom demo, and anyone whose curiosity outlived their last chemistry class.",
          "The periodic table organises every known element by atomic number and groups them by how their outer electrons behave. Elements on the left love to give up an electron (alkali metals like sodium); elements on the right love to grab one (halogens like chlorine); noble gases on the far right almost never react at all. Position on the table predicts almost everything about how an element behaves.",
          "Compounds form when atoms share or trade electrons to reach a more stable arrangement — that's called a chemical bond. Two hydrogens and one oxygen make water. One sodium and one chlorine make table salt. The Element Mixer recognises dozens of real compounds by their formula and shows you their name, uses, and a fun fact. Mix something that isn't in the database and the lab will guess what it might be like — a peek at chemistry that hasn't been invented yet.",
        ]}
        faqs={[
          { question: "What is an element vs a compound?", answer: "An element is a pure substance made of only one type of atom — hydrogen, oxygen, gold. A compound is two or more different elements chemically bonded together — water (H₂O), salt (NaCl), sugar (C₁₂H₂₂O₁₁)." },
          { question: "How do I make water in the element mixer?", answer: "Click H (hydrogen) twice to get 2 atoms of hydrogen, then click O (oxygen) once for 1 atom of oxygen, and press MIX. You'll discover H₂O — water." },
          { question: "What is the most common compound on Earth?", answer: "Water — H₂O — covers about 71% of the planet's surface and makes up roughly 60% of the human body." },
          { question: "Can I mix more than 2 elements?", answer: "Yes. You can mix up to 6 different elements at once, with 1 to 10 atoms of each. That's plenty to build sugars, fertilizers, gunpowder, and most of the compounds in the database." },
          { question: "Is this tool accurate for chemistry?", answer: "The recognised compounds and the periodic-table data are scientifically accurate. The 'unknown compound' descriptions are imaginative guesses based on the elements you used — they're for fun, not for the lab." },
          { question: "What happens when I mix unknown elements?", answer: "If the formula doesn't match any real compound in our database, the lab generates a plausible-sounding description and unlocks it in the 'Unknown Territory' category. It still counts as a discovery." },
        ]}
      />

      <RelatedTools currentSlug="element-mixer" />
    </ToolPageShell>
  );
}

const EM_CSS = `
.em-lab-bg {
  background-image:
    radial-gradient(circle at 20% 10%, color-mix(in oklab, var(--primary) 8%, transparent) 0, transparent 40%),
    repeating-linear-gradient(0deg, color-mix(in oklab, var(--border) 50%, transparent) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(90deg, color-mix(in oklab, var(--border) 50%, transparent) 0 1px, transparent 1px 32px);
}
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
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 0 18px color-mix(in oklab, var(--cat) 55%, transparent);
  z-index: 2;
  outline: none;
}
.em-cell.em-selected {
  background: color-mix(in oklab, var(--cat) 32%, var(--card));
  box-shadow: 0 0 22px color-mix(in oklab, var(--cat) 70%, transparent);
}
.em-cell.em-dim { opacity: 0.22; filter: saturate(0.3); }
.em-z { font-size: 9px; color: color-mix(in oklab, var(--foreground) 65%, transparent); line-height: 1; }
.em-sym { font-weight: 800; font-size: 16px; line-height: 1.1; }
.em-mass { font-size: 9px; color: color-mix(in oklab, var(--foreground) 55%, transparent); line-height: 1; }

.em-mix-btn {
  background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 60%, #7c3aed));
  box-shadow: 0 0 24px color-mix(in oklab, var(--primary) 55%, transparent);
  animation: em-pulse 2.4s ease-in-out infinite;
  font-weight: 800;
  letter-spacing: 0.04em;
}
@keyframes em-pulse {
  0%, 100% { box-shadow: 0 0 22px color-mix(in oklab, var(--primary) 45%, transparent); }
  50% { box-shadow: 0 0 32px color-mix(in oklab, var(--primary) 75%, transparent); }
}

.em-new-badge {
  background: linear-gradient(90deg, #facc15, #fb923c);
  color: #1a1300;
  animation: em-pop 600ms ease-out;
}
@keyframes em-pop {
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

/* Result animations — overlay behind text */
.em-anim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 12px;
  overflow: hidden;
}
.em-anim-calm::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 60%, #38bdf8 0%, transparent 60%);
  opacity: 0.18;
  animation: em-ripple 2.4s ease-out infinite;
}
@keyframes em-ripple {
  0% { transform: scale(0.7); opacity: 0.25; }
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
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  20% { opacity: 0.9; }
  100% { transform: translateY(-220px) scale(1.2); opacity: 0; }
}
.em-anim-explosion::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, #fb923c 0%, #ef4444 30%, transparent 60%);
  opacity: 0.45;
  animation: em-boom 1.4s ease-out infinite;
}
@keyframes em-boom {
  0% { transform: scale(0.2); opacity: 0.9; }
  60% { opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
.em-anim-crystal::before {
  content: ""; position: absolute; inset: 10%;
  background:
    conic-gradient(from 45deg, transparent 0 25%, color-mix(in oklab, var(--primary) 30%, transparent) 25% 50%, transparent 50% 75%, color-mix(in oklab, var(--primary) 30%, transparent) 75% 100%);
  opacity: 0.18;
  animation: em-rotate 8s linear infinite;
}
@keyframes em-rotate { to { transform: rotate(360deg); } }
.em-anim-glow::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 60%, transparent) 0%, transparent 60%);
  opacity: 0.35;
  animation: em-glow 2.2s ease-in-out infinite;
}
@keyframes em-glow {
  0%, 100% { opacity: 0.18; }
  50% { opacity: 0.45; }
}
.em-anim-flame::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(0deg, #f97316 0%, #facc15 40%, transparent 75%);
  opacity: 0.28;
  animation: em-flicker 320ms ease-in-out infinite alternate;
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
  50% { opacity: 1; transform: scale(1.2) rotate(120deg); }
}
.em-anim-danger::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, color-mix(in oklab, #ef4444 35%, transparent) 0 12px, transparent 12px 24px);
  opacity: 0.18;
  animation: em-danger 1.6s ease-in-out infinite;
}
@keyframes em-danger {
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.28; }
}
`;
