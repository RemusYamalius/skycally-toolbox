import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Plus, Trash2, RefreshCw, Settings2, ChevronDown, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { NHIE_CATEGORIES, NHIE_STATEMENTS, NHIE_TOTAL, type NhieCategory } from "@/lib/never-have-i-ever/statements";

const STORAGE_KEY = "skycally:nhie:custom";

export const Route = createFileRoute("/tools/never-have-i-ever")({
  head: () => {
    const tool = toolBySlug("never-have-i-ever", tools);
    const title = "Never Have I Ever Online — Free Generator with Custom Questions | Skycally";
    const description =
      "Play Never Have I Ever online free. 160 original questions across 7 categories, no-repeat shuffle and custom never have i ever questions saved in your browser.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Never Have I Ever Generator",
            alternateName: [
              "Never Have I Ever Online",
              "Never Have I Ever Generator Online",
              "Custom Never Have I Ever Questions",
            ],
            applicationCategory: "UtilitiesApplication",
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
  component: NeverHaveIEver,
});

function NeverHaveIEver() {
  const [active, setActive] = useState<NhieCategory[]>(NHIE_CATEGORIES.map((c) => c.id));
  const [custom, setCustom] = useState<string[]>([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newStatement, setNewStatement] = useState("");
  const [current, setCurrent] = useState<{ text: string; category: NhieCategory | "custom" } | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const [shown, setShown] = useState(0);

  // Load custom statements after mount (avoids SSR/hydration mismatch)
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

  const pool = useMemo(() => {
    const customItems = custom.map((text) => ({ text, category: "custom" as const }));
    if (useCustomOnly && customItems.length) return customItems;
    const builtIn = NHIE_STATEMENTS.filter((s) => active.includes(s.category));
    return [...builtIn, ...customItems];
  }, [active, custom, useCustomOnly]);

  // Reset the no-repeat tracking whenever the active pool definition changes
  useEffect(() => {
    setSeen([]);
  }, [active, useCustomOnly]);

  const next = () => {
    if (!pool.length) return;
    let remaining = pool.map((_, i) => i).filter((i) => !seen.includes(i));
    let nextSeen = seen;
    if (!remaining.length) {
      remaining = pool.map((_, i) => i);
      nextSeen = [];
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setSeen([...nextSeen, pick]);
    setCurrent(pool[pick]);
    setShown((n) => n + 1);
  };

  const toggleCategory = (id: NhieCategory) => {
    setActive((prev) => {
      if (prev.includes(id)) {
        // Never let the user turn every category off
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const addStatement = () => {
    const t = newStatement.trim();
    if (!t) return;
    persist([...custom, t]);
    setNewStatement("");
  };

  const activeCount = useCustomOnly && custom.length ? custom.length : pool.length;
  const currentCat = current && current.category !== "custom" ? NHIE_CATEGORIES.find((c) => c.id === current.category) : null;

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Never Have I Ever"
      description="Play Never Have I Ever online with 160 original questions across 7 categories. Filter by category, add your own, never get the same one twice."
    >
      <div className="max-w-2xl mx-auto">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {NHIE_CATEGORIES.map((c) => {
            const on = active.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                disabled={useCustomOnly && custom.length > 0}
                className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${
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

        {/* Generator card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center shadow-lg mb-4 min-h-[220px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={`${current.text}-${shown}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full"
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4 text-white"
                  style={{
                    background: currentCat ? currentCat.gradient : "linear-gradient(135deg,#64748b,#334155)",
                  }}
                >
                  {currentCat ? `${currentCat.emoji} ${currentCat.label.toUpperCase()}` : "✍️ YOUR QUESTION"}
                </div>
                <p className="text-xl sm:text-2xl text-foreground leading-relaxed">{current.text}</p>
              </motion.div>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground"
              >
                Pick your categories and tap the button to reveal your first question.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-3 mb-6">
          <Button size="lg" onClick={next} disabled={!pool.length} className="px-10 h-12 text-base">
            {current ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {current ? "Next Question" : "Start Playing"}
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-3">
            <span>
              {shown} shown this session · {activeCount} in the current pool
            </span>
            {shown > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShown(0);
                  setSeen([]);
                  setCurrent(null);
                }}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </p>
        </div>

        {/* Contextual internal links */}
        <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground mb-8">
          <p>
            Keep the party going with a round of{" "}
            <Link to="/tools/truth-or-dare" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Truth or Dare
            </Link>
            , or switch it up with{" "}
            <Link to="/tools/would-you-rather" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Would You Rather questions
            </Link>
            .
          </p>
        </div>
      </div>

      <AdZone id="never-have-i-ever-bottom" size="728x90" />

      <div className="max-w-2xl mx-auto mt-8">
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
              <ChevronDown className={`w-4 h-4 transition-transform ${showCustomize ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-3">
              <div>
                <p className="text-sm font-medium">Use custom only</p>
                <p className="text-xs text-muted-foreground">Ignore the {NHIE_TOTAL} built-in questions.</p>
              </div>
              <Switch checked={useCustomOnly} onCheckedChange={setUseCustomOnly} disabled={!custom.length} />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} /> Your questions
              </h3>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStatement()}
                  placeholder="Never have I ever..."
                />
                <Button size="icon" onClick={addStatement}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {custom.map((t, i) => (
                  <li
                    key={`${t}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-card/40 border border-border px-3 py-1.5 text-sm"
                  >
                    <span className="text-foreground truncate">{t}</span>
                    <button
                      onClick={() => persist(custom.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              {!custom.length && (
                <p className="text-xs text-muted-foreground mt-2">
                  Custom questions are saved in your browser and stay on your device.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <HowToUse
        steps={[
          "Pick the categories you want — Funny, Embarrassing, Travel, Food, Dating, School & Work or Bold.",
          "Tap Next Question to reveal a statement; anyone who has done it puts a finger down.",
          "Add your own questions in the Customize section — they're saved in your browser for next time.",
        ]}
      />

      <ToolSeoContent
        title="Never Have I Ever Online — Free Question Generator with Custom Questions"
        description="Play Never Have I Ever online free with 160 original questions across 7 categories, a no-repeat shuffle and custom questions saved in your browser. No signup."
        body={[
          "Never Have I Ever is one of the simplest party games there is. Someone reads a statement out loud starting with 'Never have I ever...', and everyone who has actually done it puts a finger down, takes a token, or loses a point — whichever version your group prefers. The last person with fingers still up wins, though most groups stop keeping score after a few rounds because the stories the questions unlock are the real point of the game.",
          "This generator gives you 160 original questions across seven categories — Funny, Embarrassing, Travel, Food, Dating, School & Work and Bold — and lets you turn each category on or off with a tap. A no-repeat shuffle tracks which questions you have already seen in the current session, so you will never get the same one twice until the whole pool has been used. That is the main difference between an interactive generator and a static blog listicle: no scrolling past the same 200 questions, no losing your place, no seeing a question you already read three minutes ago.",
          "Different groups want different games. For a party, leave every category on and let the Bold questions do the work. On a road trip, Travel and Food keep things going without anyone needing to overshare in a car. For a family gathering or a younger group, switch to just Funny, Travel and Food — every one of those questions is tame enough for any age, and nothing anywhere in the bank is explicit, including the Bold set. For couples or a dinner with close friends, Dating and Embarrassing tend to produce the best stories.",
          "Custom mode lets you add your own questions, remove any of them individually, and switch to 'use custom only' to play entirely with your group's inside jokes. Your custom questions are stored in your browser's localStorage and never leave your device — there is no account, no signup, and nothing is sent to a server. Clear your browser data and they are gone; otherwise they will be waiting the next time you open the page.",
        ]}
        faqs={[
          {
            question: "How do you play Never Have I Ever?",
            answer:
              "Everyone starts with ten fingers up. Take turns reading a statement from the generator out loud. Anyone who has actually done the thing described puts one finger down. The last person with a finger still up wins. Some groups use points or tokens instead — the rules are flexible, the questions are what matter.",
          },
          {
            question: "Can I make a custom Never Have I Ever list?",
            answer:
              "Yes. Open the Customize questions section and add as many of your own as you like. You can delete any of them individually, and the 'use custom only' switch makes the game play from your list alone, ignoring all 160 built-in questions.",
          },
          {
            question: "How many questions are included?",
            answer:
              "160 original questions, written for this tool, split across seven categories: Funny, Embarrassing, Travel, Food, Dating, School & Work and Bold. You can add unlimited custom questions on top of that.",
          },
          {
            question: "Can I filter to only funny questions?",
            answer:
              "Yes. The category chips at the top are multi-select and all start switched on. Tap any of them to turn a category off — leave only Funny on and the generator will draw exclusively from the funny set. At least one category always stays on.",
          },
          {
            question: "Does it repeat questions?",
            answer:
              "Not until it has to. The generator remembers every question shown in the current session and only reshuffles once the whole active pool has been used. Changing which categories are selected resets that tracking, since the pool itself has changed.",
          },
          {
            question: "Is my custom list saved?",
            answer:
              "Yes. Custom questions are saved in your browser's localStorage, so they are still there the next time you visit — as long as you have not cleared your browser data. They stay on your device and are never uploaded anywhere.",
          },
          {
            question: "Are these questions appropriate for all ages?",
            answer:
              "Nothing in the bank is sexually explicit, including the Bold category — Bold means daring and confessional, not adult. For younger players, stick to Funny, Travel and Food, which are safe for any group.",
          },
          {
            question: "Is there a good version of Never Have I Ever for adults?",
            answer:
              "Turn on the Bold, Dating and Embarrassing categories. Those get personal and produce the honest confessions adult groups are usually after, while still staying tasteful enough to read out loud anywhere.",
          },
          {
            question: "How many players can play?",
            answer:
              "Any number. One person reads from the screen and everyone else responds, so the group size is only limited by how many people can hear the question.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The whole page is touch-friendly and runs entirely in your browser, so it works on phones and tablets with no app to install and no signup.",
          },
        ]}
      />

      <RelatedTools currentSlug="never-have-i-ever" />
    </ToolPageShell>
  );
}
