import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Dices, Plus, Minus, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/dice-roller")({
  head: () => buildToolMeta(toolBySlug("dice-roller", tools)),
  component: DiceRoller,
});

type DieType = "D4" | "D6" | "D8" | "D10" | "D12" | "D20";
const DIE_TYPES: DieType[] = ["D4", "D6", "D8", "D10", "D12", "D20"];
const DIE_SIDES: Record<DieType, number> = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20 };
const DICE_COLORS: Record<DieType, string> = {
  D4: "#f97316",
  D6: "#3b82f6",
  D8: "#22c55e",
  D10: "#a855f7",
  D12: "#ec4899",
  D20: "#eab308",
};

function DiceRoller() {
  const [selected, setSelected] = useState<Record<DieType, number>>({
    D4: 0,
    D6: 1,
    D8: 0,
    D10: 0,
    D12: 0,
    D20: 0,
  });
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState<{ die: DieType; value: number }[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [rolling, setRolling] = useState(false);

  const totalDice = useMemo(
    () => DIE_TYPES.reduce((s, d) => s + selected[d], 0),
    [selected],
  );

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
    setTimeout(() => {
      const newResults: { die: DieType; value: number }[] = [];
      (Object.entries(selected) as [DieType, number][]).forEach(([die, count]) => {
        for (let i = 0; i < count; i++) {
          newResults.push({ die, value: Math.floor(Math.random() * DIE_SIDES[die]) + 1 });
        }
      });
      setResults(newResults);
      const total = newResults.reduce((s, r) => s + r.value, 0) + modifier;
      const label =
        newResults.map((r) => r.die).join("+") +
        (modifier !== 0 ? `${modifier > 0 ? "+" : ""}${modifier}` : "") +
        ` = ${total}`;
      setHistory((prev) => [label, ...prev].slice(0, 5));
      setRolling(false);
    }, 600);
  };

  const total = results.reduce((s, r) => s + r.value, 0) + modifier;

  return (
    <ToolPageShell
      title="Dice Roller"
      description="Roll any combination of dice — D4, D6, D8, D10, D12, D20 — with modifiers and roll history."
    >
      <div className="max-w-3xl mx-auto">
        {/* Dice selector */}
        <div className="rounded-2xl border border-border bg-card/50 p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4 text-foreground">Select your dice</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {DIE_TYPES.map((die) => {
              const count = selected[die];
              const active = count > 0;
              return (
                <div key={die} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(die)}
                    className={`w-full h-16 rounded-xl border-2 font-bold text-lg transition-all ${
                      active
                        ? "text-white border-transparent shadow-md"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                    }`}
                    style={active ? { background: DICE_COLORS[die] } : undefined}
                  >
                    {die}
                  </button>
                  {active && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjust(die, -1)}
                        className="w-7 h-7 rounded-md border border-border bg-card text-foreground hover:bg-secondary flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums text-foreground">
                        {count}
                      </span>
                      <button
                        onClick={() => adjust(die, 1)}
                        className="w-7 h-7 rounded-md border border-border bg-card text-foreground hover:bg-secondary flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modifier + Roll */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Modifier</span>
            <button
              onClick={() => setModifier((m) => m - 1)}
              className="w-7 h-7 rounded-md border border-border bg-card hover:bg-secondary flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-semibold tabular-nums text-foreground">
              {modifier > 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier((m) => m + 1)}
              className="w-7 h-7 rounded-md border border-border bg-card hover:bg-secondary flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button
            size="lg"
            onClick={roll}
            disabled={rolling || totalDice === 0}
            className="px-10 h-12 text-base"
          >
            <Dices className="w-5 h-5" />
            {rolling ? "Rolling..." : "Roll!"}
          </Button>
          {results.length > 0 && (
            <Button variant="outline" size="lg" onClick={roll} disabled={rolling}>
              <RefreshCw className="w-4 h-4" />
              Roll Again
            </Button>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border bg-card p-6 mb-6"
            >
              <div className="flex flex-wrap justify-center gap-3 mb-5">
                {results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 14,
                      delay: i * 0.05,
                    }}
                    className="w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center text-white shadow-md"
                    style={{
                      background: DICE_COLORS[r.die],
                      borderColor: DICE_COLORS[r.die],
                    }}
                  >
                    <span className="text-[10px] font-bold opacity-80 tracking-wider">
                      {r.die}
                    </span>
                    <span className="text-3xl font-extrabold tabular-nums">{r.value}</span>
                  </motion.div>
                ))}
              </div>
              <div className="text-center">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="text-2xl font-bold text-foreground tabular-nums">{total}</span>
                {modifier !== 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (rolls {total - modifier} {modifier > 0 ? "+" : ""}
                    {modifier} modifier)
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Roll history</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-foreground tabular-nums"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <HowToUse
        steps={[
          "Select which dice to roll and how many of each.",
          "Click Roll and see your results instantly.",
          "Add a modifier for RPG bonuses and check your roll history.",
        ]}
      />

      <ToolSeoContent
        title="Dice Roller — Roll D4, D6, D8, D10, D12, D20 Online Free"
        description="Roll any combination of dice online. D4 to D20, multiple dice, custom modifiers. Free dice roller for D&D, board games and RPGs."
        body={[
          "Whether you're running a Dungeons & Dragons campaign, playing a classic board game, or simply need a fair random number, our online dice roller covers every standard polyhedral die. Roll D4, D6, D8, D10, D12 and D20 in any combination — mix two D6s with a D20 attack roll, throw a handful of D8s for damage, or chain a single D4 for healing. Every roll is instant, animated, and color-coded so you can read results at a glance.",
          "Tabletop players will appreciate the built-in modifier so you can add proficiency, ability bonuses or penalties without doing the math yourself. The roll history shows your last five rolls in compact notation like 'D20+5 = 17', perfect for keeping a quick log without distracting from the game. Everything runs in your browser — no installs, no ads in your face, no accounts.",
        ]}
        faqs={[
          {
            question: "Which dice does this roller support?",
            answer:
              "All six standard polyhedral dice: D4, D6, D8, D10, D12 and D20. You can roll up to 10 of each type at once and mix any combination in a single roll.",
          },
          {
            question: "Can I use this for D&D and other tabletop RPGs?",
            answer:
              "Yes. The dice selection, modifier and roll history are designed for tabletop RPG flows. Roll attack with D20+modifier, throw multiple D6s for damage, or D4 for healing — all in one click.",
          },
          {
            question: "How does the modifier work?",
            answer:
              "The modifier is a flat number added to the sum of all dice. Set it to +5 for a +5 attack bonus, or -2 for a penalty. It's included in the total and shown in the history label.",
          },
          {
            question: "Are the rolls truly random?",
            answer:
              "Each die uses the browser's built-in random number generator, which produces uniformly distributed results suitable for casual and tabletop gaming. Nothing is sent to a server.",
          },
        ]}
      />

      <RelatedTools currentSlug="dice-roller" />
    </ToolPageShell>
  );
}
