import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { Flame, Skull, Plus, Trash2, RefreshCw, Settings2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/truth-or-dare")({
  head: () => buildToolMeta(toolBySlug("truth-or-dare", tools)),
  component: TruthOrDare,
});

const TRUTHS = [
  "What's the most embarrassing thing you've ever done?",
  "What's your biggest fear?",
  "Have you ever lied to get out of trouble? What was it?",
  "What's the most childish thing you still do?",
  "What's a secret you've never told anyone?",
  "Who was your first crush?",
  "What's the weirdest dream you've ever had?",
  "What's something you're really bad at but pretend you're good at?",
  "Have you ever cheated on a test or game?",
  "What's the most expensive thing you've broken and hidden?",
  "What's your most embarrassing nickname?",
  "Have you ever blamed someone else for something you did?",
  "What's your guilty pleasure?",
  "What's the most ridiculous thing you've ever cried about?",
  "If you could erase one thing you've said, what would it be?",
  "What's the worst gift you've ever received?",
  "Have you ever pretended to like something you hated?",
  "What's your most irrational fear?",
  "What's the most awkward situation you've ever been in?",
  "What's something you wish you could un-see?",
];

const DARES = [
  "Do your best celebrity impression for 30 seconds.",
  "Let someone in the group post anything on your social media.",
  "Speak in an accent for the next 3 rounds.",
  "Do 20 jumping jacks right now.",
  "Let the group choose a new hairstyle for you using whatever is available.",
  "Eat a spoonful of the weirdest condiment combination someone suggests.",
  "Call a random contact and sing Happy Birthday to them.",
  "Talk without using the letter 'S' for 2 minutes.",
  "Do your best runway walk across the room.",
  "Let someone draw on your face with a marker.",
  "Speak only in questions for the next 3 minutes.",
  "Do a plank for 30 seconds.",
  "Say something nice about every person in the group.",
  "Imitate another player until someone guesses who you are.",
  "Eat something with your eyes closed — the group decides what.",
  "Do your best robot dance for 1 minute.",
  "Let the group go through your phone for 30 seconds.",
  "Whisper everything you say for the next 2 rounds.",
  "Describe your day using only emojis.",
  "Do 10 push-ups or let the group assign you a harder dare.",
];

type Mode = "both" | "truth" | "dare";

function TruthOrDare() {
  const [truthOn, setTruthOn] = useState(true);
  const [dareOn, setDareOn] = useState(true);
  const [current, setCurrent] = useState<{ type: "truth" | "dare"; text: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [customTruths, setCustomTruths] = useState<string[]>([]);
  const [customDares, setCustomDares] = useState<string[]>([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newTruth, setNewTruth] = useState("");
  const [newDare, setNewDare] = useState("");

  const mode: Mode = truthOn && dareOn ? "both" : truthOn ? "truth" : dareOn ? "dare" : "both";

  const spin = () => {
    if (spinning) return;
    if (!truthOn && !dareOn) return;
    setSpinning(true);
    setCurrent(null);
    setRotation((r) => r + 720 + Math.floor(Math.random() * 360));
    setTimeout(() => {
      const truths = useCustomOnly && customTruths.length ? customTruths : [...TRUTHS, ...customTruths];
      const dares = useCustomOnly && customDares.length ? customDares : [...DARES, ...customDares];
      const type: "truth" | "dare" =
        mode === "both" ? (Math.random() > 0.5 ? "truth" : "dare") : mode;
      const pool = type === "truth" ? truths : dares;
      if (!pool.length) {
        setSpinning(false);
        return;
      }
      const text = pool[Math.floor(Math.random() * pool.length)];
      setCurrent({ type, text });
      setSpinning(false);
    }, 1500);
  };

  const addTruth = () => {
    const t = newTruth.trim();
    if (!t) return;
    setCustomTruths((p) => [...p, t]);
    setNewTruth("");
  };
  const addDare = () => {
    const t = newDare.trim();
    if (!t) return;
    setCustomDares((p) => [...p, t]);
    setNewDare("");
  };

  return (
    <ToolPageShell
      title="Truth or Dare"
      description="Spin the bottle and get a random Truth or Dare challenge. Perfect for parties and friend groups."
    >
      <div className="max-w-2xl mx-auto">
        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            type="button"
            onClick={() => setTruthOn((v) => !v || !dareOn)}
            className={`rounded-2xl border-2 p-5 text-lg font-semibold transition-all ${
              truthOn
                ? "border-transparent text-white shadow-lg"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30"
            }`}
            style={truthOn ? { background: "linear-gradient(135deg,#f97316,#ef4444)" } : undefined}
          >
            🔥 Truth
          </button>
          <button
            type="button"
            onClick={() => setDareOn((v) => !v || !truthOn)}
            className={`rounded-2xl border-2 p-5 text-lg font-semibold transition-all ${
              dareOn
                ? "border-transparent text-white shadow-lg"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30"
            }`}
            style={dareOn ? { background: "linear-gradient(135deg,#a855f7,#6366f1)" } : undefined}
          >
            💀 Dare
          </button>
        </div>

        {/* Bottle */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-2xl transition-transform"
              style={{
                background: "linear-gradient(135deg, var(--violet-brand), var(--cyan-brand))",
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? "1.5s" : "0s",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              🍾
            </div>
          </div>
          <Button size="lg" onClick={spin} disabled={spinning} className="px-10 h-12 text-base">
            <Flame className="w-5 h-5" />
            {spinning ? "Spinning..." : "Spin!"}
          </Button>
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.text}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg mb-8"
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4 text-white"
                style={{
                  background:
                    current.type === "truth"
                      ? "linear-gradient(135deg,#f97316,#ef4444)"
                      : "linear-gradient(135deg,#a855f7,#6366f1)",
                }}
              >
                {current.type === "truth" ? <Flame className="w-3.5 h-3.5" /> : <Skull className="w-3.5 h-3.5" />}
                {current.type.toUpperCase()}
              </div>
              <p className="text-xl text-foreground leading-relaxed mb-6">"{current.text}"</p>
              <Button variant="outline" onClick={spin} disabled={spinning}>
                <RefreshCw className="w-4 h-4" />
                Spin Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customize */}
        <Collapsible open={showCustomize} onOpenChange={setShowCustomize}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-medium hover:bg-card transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Customize questions
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showCustomize ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-3">
              <div>
                <p className="text-sm font-medium">Use custom only</p>
                <p className="text-xs text-muted-foreground">Ignore the 40 built-in questions.</p>
              </div>
              <Switch checked={useCustomOnly} onCheckedChange={setUseCustomOnly} />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: "#f97316" }} /> Custom Truths
              </h3>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTruth}
                  onChange={(e) => setNewTruth(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTruth()}
                  placeholder="Add a truth question..."
                />
                <Button size="icon" onClick={addTruth}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {customTruths.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-card/40 border border-border px-3 py-1.5 text-sm"
                  >
                    <span className="text-foreground truncate">{t}</span>
                    <button
                      onClick={() => setCustomTruths((p) => p.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Skull className="w-4 h-4" style={{ color: "#a855f7" }} /> Custom Dares
              </h3>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newDare}
                  onChange={(e) => setNewDare(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDare()}
                  placeholder="Add a dare challenge..."
                />
                <Button size="icon" onClick={addDare}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {customDares.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-card/40 border border-border px-3 py-1.5 text-sm"
                  >
                    <span className="text-foreground truncate">{t}</span>
                    <button
                      onClick={() => setCustomDares((p) => p.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <HowToUse
        steps={[
          "Choose Truth, Dare or let it be random.",
          "Hit Spin to get a random challenge.",
          "Complete the challenge or add your own custom questions!",
        ]}
      />

      <ToolSeoContent
        title="Truth or Dare Generator — Random Challenges for Parties"
        description="Spin for random Truth or Dare challenges. 40+ built-in questions, fully customizable. Free, no signup, works on any device."
        body={[
          "Truth or Dare is the timeless party game that breaks the ice, sparks laughter, and reveals the secrets your friends would never share otherwise. Our online Truth or Dare generator removes the awkward 'what should I ask?' moment with 20 hand-picked truth questions and 20 creative dare challenges ready to go in a single tap.",
          "Whether you're hosting a sleepover, warming up a road trip, or looking for a quick laugh at a dinner party, just pick a mode — Truth only, Dare only, or both — spin the bottle and let chance decide. Want to keep it personal? Add your own custom questions and switch to custom-only mode to play with prompts written just for your friend group. Everything stays in your browser; nothing is uploaded or stored.",
        ]}
        faqs={[
          {
            question: "How does the Truth or Dare spinner work?",
            answer:
              "Pick whether you want Truth, Dare, or both, then hit Spin. The bottle animates and the generator picks a random question from the matching pool. Repeat as many times as you like — every round is independent.",
          },
          {
            question: "Can I add my own truth questions and dares?",
            answer:
              "Yes. Open the 'Customize questions' panel and type any truth or dare you want. They're added to the rotation immediately. Toggle 'Use custom only' to play with just your own prompts and skip the defaults.",
          },
          {
            question: "Is it suitable for kids and family game nights?",
            answer:
              "The built-in dares are silly and safe — celebrity impressions, jumping jacks, accents — but you know your group best. For younger players, use the customize panel to build a kid-friendly pool and enable 'Use custom only'.",
          },
          {
            question: "Is my data private?",
            answer:
              "Yes. Everything runs in your browser. Your custom questions are never uploaded to a server and disappear when you close the tab.",
          },
        ]}
      />

      <RelatedTools currentSlug="truth-or-dare" />
    </ToolPageShell>
  );
}
