import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Dices, Plus, Minus, RefreshCw, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/dice-roller")({
  head: () => buildToolMeta(toolBySlug("dice-roller", tools)),
  component: DiceRoller,
});

type DieType = "D4" | "D6" | "D8" | "D10" | "D12" | "D20" | "D100";
const DIE_TYPES: DieType[] = ["D4", "D6", "D8", "D10", "D12", "D20", "D100"];
const DIE_SIDES: Record<DieType, number> = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20, D100: 100 };
const DICE_COLORS: Record<DieType, string> = {
  D4: "#f97316",
  D6: "#3b82f6",
  D8: "#22c55e",
  D10: "#a855f7",
  D12: "#ec4899",
  D20: "#eab308",
  D100: "#06b6d4",
};

// Dice shape SVG paths (simplified)
function DiceShape({ die, value, color }: { die: DieType; value: number; color: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 16 }}
      className="flex flex-col items-center justify-center rounded-2xl border-2 shadow-lg"
      style={{ background: color, borderColor: color, width: 80, height: 90, minWidth: 80 }}
    >
      <span className="text-[10px] font-bold text-white/70 tracking-widest">{die}</span>
      <span className="text-3xl font-extrabold text-white tabular-nums leading-tight">{value}</span>
    </motion.div>
  );
}

function playRollSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.06, 0.12].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 200 + Math.random() * 200;
      g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {
    /* noop */
  }
}

interface HistoryEntry {
  label: string;
  total: number;
  rolls: string;
}

function DiceRoller() {
  const [selected, setSelected] = useState<Record<DieType, number>>({
    D4: 0,
    D6: 1,
    D8: 0,
    D10: 0,
    D12: 0,
    D20: 0,
    D100: 0,
  });
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState<{ die: DieType; value: number }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const [advantage, setAdvantage] = useState<"none" | "advantage" | "disadvantage">("none");

  const totalDice = useMemo(() => DIE_TYPES.reduce((s, d) => s + selected[d], 0), [selected]);

  const adjust = (die: DieType, delta: number) => {
    setSelected((p) => ({ ...p, [die]: Math.max(0, Math.min(10, p[die] + delta)) }));
  };

  const toggle = (die: DieType) => {
    setSelected((p) => ({ ...p, [die]: p[die] > 0 ? 0 : 1 }));
  };

  const roll = () => {
    if (rolling || totalDice === 0) return;
    setRolling(true);
    setResults([]);
    playRollSound();

    setTimeout(() => {
      const newResults: { die: DieType; value: number }[] = [];
      (Object.entries(selected) as [DieType, number][]).forEach(([die, count]) => {
        for (let i = 0; i < count; i++) {
          let value = Math.floor(Math.random() * DIE_SIDES[die]) + 1;
          // Advantage/Disadvantage for D20
          if (die === "D20" && advantage !== "none") {
            const roll2 = Math.floor(Math.random() * 20) + 1;
            value = advantage === "advantage" ? Math.max(value, roll2) : Math.min(value, roll2);
          }
          newResults.push({ die, value });
        }
      });

      setResults(newResults);
      const rollsTotal = newResults.reduce((s, r) => s + r.value, 0);
      const total = rollsTotal + modifier;

      // Build label
      const parts: string[] = [];
      DIE_TYPES.forEach((die) => {
        const count = selected[die];
        if (count > 0) parts.push(`${count}${die}`);
      });
      const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : "";
      const advStr = advantage === "advantage" ? " (Adv)" : advantage === "disadvantage" ? " (DisAdv)" : "";
      const label = parts.join("+") + modStr + advStr;
      const rollsStr = newResults.map((r) => `${r.die}:${r.value}`).join(" ");

      setHistory((prev) => [{ label, total, rolls: rollsStr }, ...prev].slice(0, 8));
      setRolling(false);
    }, 550);
  };

  const total = results.reduce((s, r) => s + r.value, 0) + modifier;
  const isNat20 = results.some((r) => r.die === "D20" && r.value === 20);
  const isNat1 = results.some((r) => r.die === "D20" && r.value === 1);

  return (
    <ToolPageShell
      title="Dice Roller"
      description="Roll any combination of polyhedral dice — D4, D6, D8, D10, D12, D20, D100 — with modifiers, advantage, and roll history."
      showFileDisclaimer={false}
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Dice selector */}
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold mb-4">Select dice</h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DIE_TYPES.map((die) => {
              const count = selected[die];
              const active = count > 0;
              return (
                <div key={die} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(die)}
                    className={`w-full h-14 rounded-xl border-2 font-bold text-sm transition-all ${
                      active
                        ? "text-white border-transparent shadow-md scale-105"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:scale-105"
                    }`}
                    style={active ? { background: DICE_COLORS[die] } : undefined}
                  >
                    {die}
                  </button>
                  {active && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjust(die, -1)}
                        className="w-6 h-6 rounded border border-border bg-card text-foreground hover:bg-secondary flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">{count}</span>
                      <button
                        onClick={() => adjust(die, 1)}
                        className="w-6 h-6 rounded border border-border bg-card text-foreground hover:bg-secondary flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modifier + Advantage + Roll */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Modifier */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Modifier</span>
            <button
              onClick={() => setModifier((m) => m - 1)}
              className="w-6 h-6 rounded border border-border bg-card hover:bg-secondary flex items-center justify-center"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-10 text-center font-bold tabular-nums text-sm">
              {modifier > 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier((m) => m + 1)}
              className="w-6 h-6 rounded border border-border bg-card hover:bg-secondary flex items-center justify-center"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Advantage toggle — only shows when D20 selected */}
          {selected["D20"] > 0 && (
            <div className="flex rounded-xl border border-border overflow-hidden text-xs font-semibold">
              {(["none", "advantage", "disadvantage"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAdvantage(a)}
                  className={`px-3 py-2 transition-colors ${
                    advantage === a
                      ? a === "advantage"
                        ? "bg-green-500 text-white"
                        : a === "disadvantage"
                          ? "bg-red-500 text-white"
                          : "bg-card text-foreground"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {a === "none" ? "Normal" : a === "advantage" ? "Adv" : "DisAdv"}
                </button>
              ))}
            </div>
          )}

          <Button size="lg" onClick={roll} disabled={rolling || totalDice === 0} className="px-8 h-11">
            <Dices className="w-5 h-5 mr-2" />
            {rolling ? "Rolling…" : "Roll!"}
          </Button>

          {results.length > 0 && (
            <Button variant="outline" size="lg" onClick={roll} disabled={rolling} className="h-11">
              <RefreshCw className="w-4 h-4 mr-1" /> Again
            </Button>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-6"
              style={{
                borderColor: isNat20 ? "#eab308" : isNat1 ? "#ef4444" : "var(--border)",
                boxShadow: isNat20 ? "0 0 30px rgba(234,179,8,0.3)" : isNat1 ? "0 0 30px rgba(239,68,68,0.3)" : "none",
              }}
            >
              {isNat20 && (
                <p className="text-center text-yellow-400 font-bold text-sm mb-3 animate-pulse">
                  ⚡ Natural 20! Critical Hit!
                </p>
              )}
              {isNat1 && (
                <p className="text-center text-red-400 font-bold text-sm mb-3 animate-pulse">
                  💀 Natural 1! Critical Fail!
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-3 mb-5">
                {results.map((r, i) => (
                  <DiceShape key={i} die={r.die} value={r.value} color={DICE_COLORS[r.die]} />
                ))}
              </div>
              <div className="text-center">
                <span className="text-muted-foreground text-sm">Total: </span>
                <span className="text-3xl font-extrabold tabular-nums" style={{ color: "var(--cyan-brand)" }}>
                  {total}
                </span>
                {modifier !== 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (dice {total - modifier} {modifier > 0 ? "+" : ""}
                    {modifier})
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll History</h3>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm rounded-lg px-3 py-1.5 bg-background/40 border border-border"
                >
                  <span className="text-muted-foreground font-mono text-xs">{h.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--cyan-brand)" }}>
                    {h.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdZone id="dice-roller-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Click the dice types to select them — D4 through D100. Click + / - to roll multiple of the same die.",
          "Set a modifier for RPG bonuses or penalties. If rolling D20, choose Normal, Advantage, or Disadvantage.",
          "Click Roll! — see animated results, total, and Natural 20 / Natural 1 alerts. Your roll history appears below.",
        ]}
      />

      <ToolSeoContent
        title="Free Dice Roller — Roll D4, D6, D8, D10, D12, D20, D100 Online"
        description="Roll any combination of polyhedral dice online. D4 to D100, multiple dice, custom modifiers, advantage/disadvantage. Free dice roller for D&D, board games and RPGs."
        body={[
          "Skycally's Dice Roller covers every standard polyhedral die used in tabletop RPGs and board games: D4, D6, D8, D10, D12, D20, and D100 (percentile). Select any combination, set a modifier, and roll — results appear instantly with a satisfying animation, color-coded by die type, and a grand total prominently displayed.",
          "D&D players will appreciate the Advantage and Disadvantage system for D20 rolls — select Advantage to roll twice and take the higher result, or Disadvantage to take the lower. Natural 20s trigger a Critical Hit celebration with a golden glow, while Natural 1s signal a Critical Fail with a red warning. The modifier field handles proficiency bonuses, ability scores, and any other flat bonus or penalty.",
          "Roll up to 10 dice of each type simultaneously. The history panel records your last 8 rolls in compact notation showing the dice combination and final total — useful for tracking attack rolls, skill checks, and damage rolls without losing your place at the table. Clear the history at any time with a single click.",
          "Everything runs locally in your browser with no server requests. Each die uses a uniform random number generator producing unbiased results suitable for any tabletop or gaming session. Works on desktop, tablet, and mobile without any app or account required.",
        ]}
        faqs={[
          {
            question: "Which dice types are supported?",
            answer:
              "D4, D6, D8, D10, D12, D20, and D100 (percentile dice). You can roll up to 10 of each type simultaneously and mix any combination in a single roll.",
          },
          {
            question: "What is Advantage and Disadvantage?",
            answer:
              "When rolling a D20 with Advantage, two dice are rolled and the higher result is used. With Disadvantage, the lower result is used. This is a core D&D 5e mechanic controlled by the Adv/DisAdv toggle.",
          },
          {
            question: "What is a Natural 20?",
            answer:
              "A Natural 20 is when the D20 lands on 20 before modifiers — a Critical Hit in D&D. The roller highlights this with a golden glow and Critical Hit message.",
          },
          {
            question: "How does the modifier work?",
            answer:
              "The modifier is a flat number added to the sum of all dice rolls. Use positive values for bonuses (proficiency, ability score) and negative for penalties. It's shown separately in the total display.",
          },
          {
            question: "Can I roll percentile dice?",
            answer:
              "Yes. Select D100 to roll a percentile die (1-100). For classic d% rolls (two D10s as tens and units), select two D10s.",
          },
          {
            question: "Are the rolls truly random?",
            answer:
              "Yes. Each die uses JavaScript's Math.random() which produces uniformly distributed results. Nothing is sent to a server — all rolls happen in your browser.",
          },
          {
            question: "Can I see my previous rolls?",
            answer:
              "Yes. The roll history panel shows your last 8 rolls with the dice combination and total. It clears when you close the page or click the trash icon.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The interface is fully responsive and works on smartphones and tablets. Ideal for digital play at the table without carrying physical dice.",
          },
        ]}
      />

      <RelatedTools currentSlug="dice-roller" />
    </ToolPageShell>
  );
}
