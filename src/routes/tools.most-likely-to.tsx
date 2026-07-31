import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Settings2, ChevronDown, RotateCcw, Share2, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound } from "@/lib/sound";
import { CATEGORY_META, MLT_QUESTIONS, MLT_TOTAL, type MltCategory } from "@/lib/most-likely-to/questions";

const STORAGE_KEY = "skycally:mlt:custom";

type PoolCategory = MltCategory | "custom";

export const Route = createFileRoute("/tools/most-likely-to")({
  head: () => {
    const tool = toolBySlug("most-likely-to", tools);
    const title = "Most Likely To — 200+ Questions for Groups, Parties & Friends | Skycally";
    const description =
      "Free Most Likely To game with 200+ most likely to questions for friends. Six categories, no-repeat shuffle and your own custom questions — the party game that starts arguments.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Most Likely To",
            alternateName: [
              "Most Likely To Game",
              "Most Likely To Questions",
              "Most Likely To Party Game",
              "Most Likely To Questions For Friends",
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
  component: MostLikelyTo,
});

function MostLikelyTo() {
  const [active, setActive] = useState<MltCategory[]>(CATEGORY_META.map((c) => c.id));
  const [custom, setCustom] = useState<string[]>([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [current, setCurrent] = useState<{ text: string; category: PoolCategory } | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const [drawn, setDrawn] = useState(0);

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
    const builtIn = MLT_QUESTIONS.filter((q) => active.includes(q.category)).map((q) => ({
      text: q.text,
      category: q.category as PoolCategory,
    }));
    return [...builtIn, ...customItems];
  }, [active, custom, useCustomOnly]);

  useEffect(() => {
    setSeen([]);
  }, [active, useCustomOnly]);

  const next = () => {
    if (!pool.length) return;
    let remaining = pool.map((_, i) => i).filter((i) => !seen.includes(i));
    let nextSeen = seen;
    if (!remaining.length) {
      // Whole pool exhausted — round complete, reshuffle from scratch.
      playSound("success");
      remaining = pool.map((_, i) => i);
      nextSeen = [];
    } else {
      playSound("click");
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setSeen([...nextSeen, pick]);
    setCurrent(pool[pick]);
    setDrawn((n) => n + 1);
  };

  const toggleCategory = (id: MltCategory) => {
    setActive((prev: MltCategory[]) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const addQuestion = () => {
    const t = newQuestion.trim();
    if (!t) return;
    persist([...custom, t]);
    setNewQuestion("");
  };

  const share = async () => {
    const text = `🎉 Most Likely To — skycally.com/tools/most-likely-to\nWe played ${drawn} rounds. Try it with your friends!`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Couldn't copy — try again.");
    }
  };

  const currentCat =
    current && current.category !== "custom" ? CATEGORY_META.find((c) => c.id === current.category) : null;
  const cardGradient = currentCat ? currentCat.gradient : "linear-gradient(135deg,#64748b,#334155)";
  const cardEmoji = currentCat ? currentCat.emoji : "✍️";

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Most Likely To"
      description="Draw a 'most likely to' card, point at the guilty person, and watch friendships get tested. 200+ questions across 6 categories."
    >
      <div className="max-w-2xl mx-auto">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_META.map((c) => {
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

        {/* Play area */}
        <div className="rounded-3xl border border-border bg-card p-3 sm:p-5 shadow-sm">
          <div className="relative overflow-hidden rounded-3xl min-h-[280px] flex items-center justify-center p-6 sm:p-10 text-center shadow-xl">
            <div className="absolute inset-0" style={{ background: current ? cardGradient : undefined }} />
            {!current && <div className="absolute inset-0 bg-secondary/40" />}
            {current && (
              <span
                aria-hidden
                className="absolute -right-6 -bottom-10 text-[11rem] leading-none opacity-15 select-none pointer-events-none"
              >
                {cardEmoji}
              </span>
            )}

            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={`${current.text}-${drawn}`}
                  initial={{ opacity: 0, y: 24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.96 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative w-full"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.14em] mb-5 bg-white/20 text-white backdrop-blur-sm">
                    {currentCat ? `${currentCat.emoji} ${currentCat.label.toUpperCase()}` : "✍️ YOUR QUESTION"}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75 mb-2">
                    Most likely to...
                  </p>
                  <p className="text-xl sm:text-3xl font-bold text-white leading-snug drop-shadow-sm break-words">
                    {current.text.replace(/^Most likely to\s*/i, "")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative"
                >
                  <p className="text-5xl mb-4">🎉</p>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Pick your categories, draw a card and everyone points at the person most likely to do it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={next}
              disabled={!pool.length}
              className="flex-1 min-h-[56px] text-base font-semibold shadow-lg"
            >
              {current ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {current ? "Next Card" : "Draw a card"}
            </Button>
            <Button
              onClick={share}
              variant="secondary"
              className="min-h-[56px] sm:w-auto text-base font-semibold border border-border"
            >
              <Share2 className="w-5 h-5" />
              Share
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-3">
            <span>
              {drawn} cards drawn · {pool.length} in the current pool
            </span>
            {drawn > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDrawn(0);
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

        {/* Customize */}
        <Collapsible open={showCustomize} onOpenChange={setShowCustomize} className="mt-6">
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
                <p className="text-xs text-muted-foreground">Ignore the {MLT_TOTAL} built-in questions.</p>
              </div>
              <Switch checked={useCustomOnly} onCheckedChange={setUseCustomOnly} disabled={!custom.length} />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} /> Your questions
              </h3>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                  placeholder="Most likely to..."
                />
                <Button size="icon" onClick={addQuestion} aria-label="Add question">
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

        {/* Contextual internal links */}
        <div className="mt-8 rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          <p>
            Looking for more group games? Try{" "}
            <Link
              to="/tools/never-have-i-ever"
              className="text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Never Have I Ever
            </Link>{" "}
            for confession-style rounds,{" "}
            <Link to="/tools/truth-or-dare" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Truth or Dare
            </Link>{" "}
            for something bolder, or find out{" "}
            <Link to="/tools/ick-test" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Who Gets the Ick
            </Link>{" "}
            first with the Ick Test.
          </p>
        </div>
      </div>

      <AdZone id="most-likely-to-mid" size="728x90" />

      <HowToUse
        steps={[
          "Choose the categories you want — Funny, Party, School, Relationships, Bold or Wholesome.",
          "Tap Draw a card and read it out loud; on the count of three everyone points at one person.",
          "Whoever gets the most points takes the round — add your own questions in Customize to make it personal.",
        ]}
      />

      <ToolSeoContent
        title="Most Likely To — 200+ Questions for Groups, Parties & Friends"
        description="Play the Most Likely To game online free with 200+ most likely to questions across six categories, a no-repeat shuffle and custom questions saved in your browser."
        body={[
          "Most Likely To is the party game where the group decides who you really are. Someone reads a card out loud — 'Most likely to be the last one standing at 4am' — and on the count of three everyone points at the person they think fits best. The person with the most fingers pointed at them wins the round, has to explain themselves, or takes the forfeit your group agreed on. It works with three people at a dinner table and with thirty people at a party, and it needs nothing but a phone.",
          "This generator gives you 200 original most likely to questions split across six categories: Funny, Party, School, Relationships, Bold and Wholesome. Tap the chips at the top to turn any category on or off, so a classroom icebreaker and a late-night party round can use the same tool with completely different energy. A no-repeat shuffle tracks every card shown in the current session and only reshuffles once the entire active pool has been used, which is the practical difference between an interactive game and scrolling a static list of most likely to questions for friends.",
          "The categories are built for different rooms. Funny and Wholesome are safe for family gatherings, classrooms and work socials — nothing in them will embarrass anyone. School is written for students and reunions, Relationships is best with people who know each other well, and Party and Bold are where the game gets loud. Nothing in the bank is explicit, so you can read any card out loud anywhere; Bold means daring and opinionated, not adult.",
          "Custom mode lets you add your own cards about your specific group — the inside jokes, the running gags, the one friend who is always late. Add as many as you like, delete any of them individually, and flip the 'use custom only' switch to play a round built entirely from your own questions. Everything you add is stored in your browser's localStorage, never uploaded, and waiting for you next time you open the page. No account, no signup, no ads between cards.",
        ]}
        faqs={[
          {
            question: "How do you play Most Likely To?",
            answer:
              "One person reads a card out loud, then the group counts to three and everyone points at the person they think is most likely to do it. Whoever gets the most fingers pointed at them wins the round. Some groups add a forfeit, a point tally or a drink; the pointing is the part that matters.",
          },
          {
            question: "What are good Most Likely To questions?",
            answer:
              "The best ones are specific enough that people immediately picture someone in the group — 'most likely to reply to a text three weeks later' works far better than 'most likely to be lazy'. This generator has 200 written that way, and you can add your own for the jokes only your group understands.",
          },
          {
            question: "Can you play Most Likely To with 2 people?",
            answer:
              "Yes. With two players you each guess which of you fits the card, and it turns into a conversation instead of a vote. It also works well as a text-message game — draw a card, send it, and see if you both pick the same person.",
          },
          {
            question: "How many questions are included?",
            answer:
              "200 original questions across six categories: Funny, Party, School, Relationships, Bold and Wholesome. You can add unlimited custom questions on top of that.",
          },
          {
            question: "Is this Most Likely To game free?",
            answer:
              "Completely free with no signup, no account and no limit on how many rounds you play. Everything runs in your browser.",
          },
          {
            question: "Are these questions appropriate for school or work?",
            answer:
              "Nothing in the bank is explicit, but for classrooms, work socials or family gatherings the safest mix is Funny, School and Wholesome. Turn off Bold, Party and Relationships and every card is comfortable to read out loud in any room.",
          },
          {
            question: "Can I add my own Most Likely To questions?",
            answer:
              "Yes. Open Customize questions, type your card and add it. You can delete any of them individually, and the 'use custom only' switch plays a round from your list alone, ignoring all 200 built-in questions.",
          },
          {
            question: "Does it repeat the same cards?",
            answer:
              "Not until it has to. The game remembers every card drawn in the current session and only reshuffles once the whole active pool has been used. Changing which categories are on resets that tracking, because the pool itself has changed.",
          },
        ]}
      />

      <RelatedTools currentSlug="most-likely-to" />
    </ToolPageShell>
  );
}
