import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Settings2, ChevronDown, RotateCcw, Copy, Check, Sparkles } from "lucide-react";
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
import { CATEGORY_META, ICKS, ICK_TOTAL, type IckCategory } from "@/lib/ick-test/icks";

const STORAGE_KEY = "skycally-ick-custom";
const SESSION_SIZE = 30;

type PoolCategory = IckCategory | "custom";
interface Card {
  text: string;
  category: PoolCategory;
}

const TIERS = [
  {
    max: 20,
    name: "Ick-Proof 🏆",
    blurb: "Basically nothing bothers you. Suspiciously chill.",
    gradient: "linear-gradient(135deg,#f59e0b,#facc15)",
    glow: "rgba(250,204,21,0.35)",
  },
  {
    max: 40,
    name: "Pretty Chill 😎",
    blurb: "You have standards, but you're not unreasonable about it.",
    gradient: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
    glow: "rgba(6,182,212,0.35)",
  },
  {
    max: 60,
    name: "Selective 🤔",
    blurb: "You know what you want. Respect.",
    gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)",
    glow: "rgba(139,92,246,0.35)",
  },
  {
    max: 80,
    name: "High Standards ✨",
    blurb: "Most people are one bad habit away from getting the ick from you.",
    gradient: "linear-gradient(135deg,#ec4899,#ef4444)",
    glow: "rgba(236,72,153,0.35)",
  },
  {
    max: 100,
    name: "One Ick Away 🚪",
    blurb: "You've felt the ick from a stranger's handshake. We understand.",
    gradient: "linear-gradient(135deg,#b91c1c,#7f1d1d)",
    glow: "rgba(185,28,28,0.4)",
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

export const Route = createFileRoute("/tools/ick-test")({
  head: () => {
    const tool = toolBySlug("ick-test", tools);
    const title = "Ick Test — Find Your Ick Sensitivity Score | Skycally";
    const description =
      "Free ick test quiz: swipe through 200+ icks, discover what gives you the ick and get your ick sensitivity score. A modern ick list for dating, texting and habits.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Ick Test",
            alternateName: ["Ick Test Quiz", "Ick Sensitivity Score", "What Gives You The Ick"],
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
  component: IckTest,
});

function IckTest() {
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [active, setActive] = useState<IckCategory[]>(CATEGORY_META.map((c) => c.id));
  const [custom, setCustom] = useState<string[]>([]);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newIck, setNewIck] = useState("");

  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ ick: boolean; category: PoolCategory }[]>([]);
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
    // Balanced draw: take an even slice from each active category, then top up.
    const perCat = Math.ceil((SESSION_SIZE - Math.min(customCards.length, 5)) / cats.length);
    const picked: Card[] = [];
    for (const cat of cats) {
      const items = shuffle(ICKS.filter((i) => i.category === cat)).slice(0, perCat);
      picked.push(...items.map((i) => ({ text: i.text, category: i.category as PoolCategory })));
    }
    const merged = shuffle([...shuffle(customCards).slice(0, 5), ...shuffle(picked)]);
    if (merged.length < SESSION_SIZE) {
      const extra = shuffle(ICKS.filter((i) => !merged.some((m) => m.text === i.text))).slice(
        0,
        SESSION_SIZE - merged.length,
      );
      merged.push(...extra.map((i) => ({ text: i.text, category: i.category as PoolCategory })));
    }
    return shuffle(merged).slice(0, SESSION_SIZE);
  };

  const start = () => {
    playSound("click");
    setDeck(buildDeck());
    setIndex(0);
    setAnswers([]);
    setCopied(false);
    setPhase("playing");
  };

  const answer = (isIck: boolean) => {
    const card = deck[index];
    if (!card) return;
    setDir(isIck ? 1 : -1);
    const nextAnswers = [...answers, { ick: isIck, category: card.category }];
    setAnswers(nextAnswers);
    if (index + 1 >= deck.length) {
      playSound("finish");
      setPhase("result");
    } else {
      playSound(isIck ? "fail" : "success");
      setIndex(index + 1);
    }
  };

  const toggleCategory = (id: IckCategory) => {
    setActive((prev: IckCategory[]) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const addIck = () => {
    const t = newIck.trim();
    if (!t) return;
    persist([...custom, t]);
    setNewIck("");
  };

  const total = deck.length || SESSION_SIZE;
  const progress = Math.min(100, Math.round((index / total) * 100));
  const current = deck[index];
  const currentMeta = current ? CATEGORY_META.find((c) => c.id === current.category) : undefined;

  const result = useMemo(() => {
    if (!answers.length) return null;
    const ickCount = answers.filter((a) => a.ick).length;
    const score = Math.round((ickCount / answers.length) * 100);
    const tally: Partial<Record<PoolCategory, number>> = {};
    for (const a of answers) if (a.ick) tally[a.category] = (tally[a.category] ?? 0) + 1;
    let topCat: PoolCategory | null = null;
    let topN = 0;
    for (const [k, v] of Object.entries(tally)) {
      if ((v as number) > topN) {
        topN = v as number;
        topCat = k as PoolCategory;
      }
    }
    const meta = topCat && topCat !== "custom" ? CATEGORY_META.find((c) => c.id === topCat) : null;
    const grid = answers.map((a) => (a.ick ? "🤢" : "😌")).join("");
    return { ickCount, score, tier: tierFor(score), grid, meta, topCat };
  }, [answers]);

  const shareText = result
    ? `🤢 Ick Test Result\n${result.grid}\nIck Score: ${result.score}% — ${result.tier.name}\nBiggest ick: ${
        result.meta ? `${result.meta.emoji} ${result.meta.label}` : "✍️ Your own icks"
      }\nskycally.com/tools/ick-test`
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
      title="Ick Test"
      description="Swipe through 200+ icks, find out your Ick Sensitivity Score, and share the result with friends."
    >
      <div className="max-w-2xl mx-auto">
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
              <div
                className="rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#7c3aed,#db2777 55%,#ef4444)" }}
              >
                <span className="absolute -right-6 -top-8 text-[10rem] opacity-15 select-none" aria-hidden="true">
                  🤢
                </span>
                <h2 className="font-display text-4xl sm:text-6xl font-black tracking-tight drop-shadow">
                  What gives you<br />the ick?
                </h2>
                <p className="mt-4 text-base sm:text-lg opacity-90 max-w-md mx-auto">
                  The ick is that sudden, unexplainable turn-off from one tiny thing someone does. Rate 30 of them and
                  we'll score exactly how sensitive you are.
                </p>
                <motion.button
                  type="button"
                  onClick={start}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/95 px-10 py-4 text-lg font-black text-[#7c3aed] shadow-xl hover:bg-white transition-colors"
                >
                  <Sparkles className="w-5 h-5" /> Start the Test
                </motion.button>
                <p className="mt-4 text-xs opacity-75">{ICK_TOTAL} icks · 30 per round · no signup</p>
              </div>

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
            </motion.div>
          )}

          {/* ---------------- PLAYING ---------------- */}
          {phase === "playing" && current && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    {index + 1} of {total}
                  </span>
                  <span>{answers.filter((a) => a.ick).length} icks so far</span>
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
                    key={`${index}-${current.text}`}
                    initial={{ opacity: 0, x: dir * -260, rotate: dir * -6 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    exit={{ opacity: 0, x: dir * 320, rotate: dir * 10, pointerEvents: "none" }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.35}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 110) answer(true);
                      else if (info.offset.x < -110) answer(false);
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
                        {currentMeta ? `${currentMeta.emoji} ${currentMeta.label}` : "✍️ Your ick"}
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
                  onClick={() => answer(true)}
                  className="min-h-[64px] rounded-2xl px-3 text-base sm:text-lg font-black text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#ef4444,#ec4899)" }}
                >
                  🤢 That's an Ick
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => answer(false)}
                  className="min-h-[64px] rounded-2xl px-3 text-base sm:text-lg font-black text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#22c55e,#14b8a6)" }}
                >
                  😌 Not for me
                </motion.button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Tip: you can also swipe the card left or right.
              </p>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setPhase("intro")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restart
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------------- RESULT ---------------- */}
          {phase === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <div
                className="rounded-3xl p-7 sm:p-10 text-center text-white shadow-2xl"
                style={{
                  background: result.tier.gradient,
                  boxShadow: `0 24px 60px -20px ${result.tier.glow}`,
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-80">Your Ick Score</p>
                <p className="font-display text-7xl sm:text-8xl font-black leading-none mt-2 drop-shadow">
                  {result.score}%
                </p>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black">{result.tier.name}</h2>
                <p className="mt-2 text-sm sm:text-base opacity-90 max-w-sm mx-auto">{result.tier.blurb}</p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                  Biggest ick category:&nbsp;
                  {result.meta ? `${result.meta.emoji} ${result.meta.label}` : "✍️ Your own icks"}
                </div>

                <div className="mt-6 rounded-2xl bg-black/25 p-4 backdrop-blur-sm">
                  <p className="text-[1.35rem] leading-[1.6] tracking-[0.12em] break-all">{result.grid}</p>
                  <p className="mt-2 text-xs opacity-80">
                    {result.ickCount} icks · {answers.length - result.ickCount} totally fine
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={copyResult} className="h-12 px-8 text-base">
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? "Copied!" : "Copy Result"}
                </Button>
                <Button size="lg" variant="outline" onClick={start} className="h-12 px-8 text-base">
                  <RotateCcw className="w-5 h-5" /> Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom icks */}
        <Collapsible open={showCustomize} onOpenChange={setShowCustomize} className="mt-8">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-medium hover:bg-card transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Add your own icks
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCustomize ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="flex gap-2 mb-2">
              <Input
                value={newIck}
                onChange={(e) => setNewIck(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIck()}
                placeholder="Sends a voice note to say one word..."
              />
              <Button size="icon" onClick={addIck} aria-label="Add ick">
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
                    aria-label="Remove ick"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Your icks are mixed into the next round and saved in your browser only.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Contextual internal links */}
        <div className="mt-8 rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          <p>
            Looking for more social games? Try{" "}
            <Link to="/tools/would-you-rather" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Would You Rather
            </Link>
            ,{" "}
            <Link to="/tools/truth-or-dare" className="text-foreground underline underline-offset-4 hover:opacity-80">
              Truth or Dare
            </Link>
            , or{" "}
            <Link
              to="/tools/never-have-i-ever"
              className="text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Never Have I Ever
            </Link>
            . Want to understand your relationship patterns instead? Take the{" "}
            <Link
              to="/tools/attachment-style-test"
              className="text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Attachment Style Test
            </Link>
            .
          </p>
        </div>
      </div>

      <AdZone id="ick-test-mid" size="728x90" />

      <HowToUse
        steps={[
          "Choose the ick categories you care about — appearance, habits, texting, social, dating, food or general.",
          "Tap 'That's an Ick' or 'Not for me' (or swipe the card) for all 30 icks in the round.",
          "Get your Ick Sensitivity Score, see your biggest ick category and copy the result to share.",
        ]}
      />

      <ToolSeoContent
        title="Ick Test — What Gives You the Ick?"
        description="A free ick test quiz that turns the TikTok 'ick' into a real score. Rate 30 icks from a 200-strong ick list and get your ick sensitivity score instantly."
        body={[
          "The 'ick' is that sudden, irrational wave of turn-off you feel when someone does one small thing — the way they run for a bus, the way they type, the way they blow on every bite of food. It went viral because everyone has one, and almost nobody can explain it. This ick test quiz makes that feeling measurable: you rate 30 randomly drawn icks and get a percentage that shows how easily you catch one.",
          "The ick list behind the test contains 200 original icks split across seven categories — appearance, habits, texting, social, dating, food and general behaviour. Each round pulls a balanced sample from the categories you switch on, so no two rounds feel the same, and the same ick rarely appears twice in a row. You can also add your own icks; they get mixed into the pool and are saved in your browser, never uploaded anywhere.",
          "Your ick sensitivity score is simply the share of cards you marked as an ick, rounded to a whole number. Under 20% puts you in Ick-Proof territory; over 80% and you're One Ick Away from writing someone off over a handshake. Alongside the score you get your biggest ick category, which is usually the more interesting result — plenty of people are relaxed about looks but completely unforgiving about texting habits.",
          "When you finish, the result card builds a Wordle-style emoji grid of your answers (🤢 for icks, 😌 for the ones that didn't bother you) so you can copy and paste it straight into a group chat and compare scores. It's built to be played out loud with friends: the disagreements are the whole point. Nothing is stored on a server, there's no signup, and you can replay with a fresh set of 30 icks as often as you like.",
        ]}
        faqs={[
          {
            question: "What does 'the ick' actually mean?",
            answer:
              "The ick is a sudden feeling of turn-off or cringe toward someone you were previously attracted to, usually triggered by a tiny, harmless action rather than anything serious. It became a mainstream term through TikTok and dating culture.",
          },
          {
            question: "What is an ick test quiz?",
            answer:
              "An ick test quiz shows you a series of common icks and asks whether each one would put you off. Your answers are turned into an ick sensitivity score that estimates how easily you catch the ick compared with everyone else.",
          },
          {
            question: "How is my ick sensitivity score calculated?",
            answer:
              "It's the number of cards you marked as an ick divided by the 30 cards in the round, converted to a percentage and rounded to the nearest whole number. There's no hidden weighting — every ick counts the same.",
          },
          {
            question: "How many icks are in the list?",
            answer:
              "There are 200 hand-written icks across seven categories, plus any custom icks you add yourself. Each round draws 30 of them at random from the categories you have enabled.",
          },
          {
            question: "Is the Ick Test free?",
            answer:
              "Yes. It's completely free, requires no account and works in any modern browser on phone, tablet or desktop. There are no limits on how many rounds you can play.",
          },
          {
            question: "Can I add my own icks to the test?",
            answer:
              "Yes. Open the 'Add your own icks' section, type an ick and press add. Your icks are stored in your browser's local storage and get mixed into future rounds alongside the built-in ick list.",
          },
          {
            question: "Can I play the Ick Test with friends?",
            answer:
              "Absolutely — it works best that way. Pass the phone around, or everyone takes a round and compares result cards. The copy button gives you an emoji grid you can paste into any group chat.",
          },
          {
            question: "Is a high ick score a bad thing?",
            answer:
              "Not at all. A high score just means small behaviours register strongly for you. It's a bit of fun rather than a psychological assessment, so treat the tiers as jokes, not dating advice.",
          },
        ]}
      />

      <RelatedTools currentSlug="ick-test" />
    </ToolPageShell>
  );
}
