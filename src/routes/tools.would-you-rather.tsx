import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Scale, RefreshCw, Plus, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

import {
  QUESTIONS,
  CATEGORY_META,
  type WYRQuestion,
  type WYRCategory,
} from "@/lib/would-you-rather/questions";

const SLUG = "would-you-rather";

export const Route = createFileRoute("/tools/would-you-rather")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const title = "Would You Rather Generator — 150+ Free Questions, No Signup | Skycally";
    const description =
      "Free Would You Rather generator with 170+ hand-written questions across funny, deep, gross, couples, kids and fantasy categories. Unlimited plays, add your own, no signup.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Would You Rather Generator",
            applicationCategory: "GameApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: [
              "170+ hand-written Would You Rather questions",
              "8 categories: Funny, Deep, Gross, Hard Choices, Kids-Friendly, Couples, Work, Fantasy",
              "One-tap next question for fast group play",
              "Add your own custom question pairs to the session",
              "Session-local vote tally per question",
              "No signup, no app download, unlimited plays",
              "Mobile-friendly with large tap targets",
            ],
          }),
        },
      ],
    };
  },
  component: WouldYouRatherPage,
});

type Filter = "all" | WYRCategory;

const CATEGORY_ORDER: Filter[] = [
  "all",
  "funny",
  "deep",
  "hard",
  "couples",
  "kids",
  "work",
  "fantasy",
  "gross",
];

interface SessionQuestion extends WYRQuestion {
  id: number;
  custom?: boolean;
}

const BASE_POOL: SessionQuestion[] = QUESTIONS.map((q, i) => ({ ...q, id: i }));

function pickRandom(pool: SessionQuestion[], avoidIds: number[]): SessionQuestion {
  const filtered = pool.filter((q) => !avoidIds.includes(q.id));
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function WouldYouRatherPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [customs, setCustoms] = useState<SessionQuestion[]>([]);
  const [recent, setRecent] = useState<number[]>([]);
  const [votes, setVotes] = useState<Record<number, { a: number; b: number }>>({});
  const [showCustom, setShowCustom] = useState(false);
  const [newA, setNewA] = useState("");
  const [newB, setNewB] = useState("");
  const [newCat, setNewCat] = useState<WYRCategory>("funny");

  const activePool = useMemo(() => {
    const all = [...BASE_POOL, ...customs];
    if (filter === "all") return all;
    return all.filter((q) => q.category === filter);
  }, [filter, customs]);

  const [current, setCurrent] = useState<SessionQuestion>(() =>
    pickRandom(BASE_POOL, []),
  );

  const next = () => {
    if (activePool.length === 0) return;
    const chosen = pickRandom(activePool, recent);
    setCurrent(chosen);
    setRecent((prev) => [chosen.id, ...prev].slice(0, 20));
  };

  const vote = (side: "a" | "b") => {
    setVotes((prev) => {
      const cur = prev[current.id] ?? { a: 0, b: 0 };
      return { ...prev, [current.id]: { ...cur, [side]: cur[side] + 1 } };
    });
  };

  const currentVote = votes[current.id] ?? { a: 0, b: 0 };
  const totalVotes = currentVote.a + currentVote.b;
  const pctA = totalVotes ? Math.round((currentVote.a / totalVotes) * 100) : 0;
  const pctB = totalVotes ? 100 - pctA : 0;

  const addCustom = () => {
    const a = newA.trim();
    const b = newB.trim();
    if (!a || !b) return;
    const id = 10_000 + customs.length + Math.floor(Math.random() * 1000);
    const q: SessionQuestion = { a, b, category: newCat, id, custom: true };
    setCustoms((prev) => [...prev, q]);
    setNewA("");
    setNewB("");
    setCurrent(q);
    setRecent((prev) => [q.id, ...prev].slice(0, 20));
  };

  const resetVotes = () => setVotes({});

  const meta = CATEGORY_META[current.category];

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Would You Rather Generator"
      description="170+ free Would You Rather questions across 8 categories. Add your own, tap for the next one — perfect for parties, road trips and icebreakers."
    >
      <div className="max-w-3xl mx-auto">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORY_ORDER.map((c) => {
            const m = CATEGORY_META[c];
            const active = filter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-transparent text-white shadow-md"
                    : "border-border bg-card/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
                style={active ? { background: m.tint } : undefined}
              >
                <span>{m.emoji}</span> {m.label}
              </button>
            );
          })}
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            {/* Category badge */}
            <div className="flex justify-center mb-4">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wider text-white"
                style={{ background: meta.tint }}
              >
                <span>{meta.emoji}</span> {meta.label.toUpperCase()}
                {current.custom && <span className="opacity-80">· CUSTOM</span>}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-stretch">
              <OptionCard
                letter="A"
                text={current.a}
                accent="linear-gradient(135deg,#f97316,#ef4444)"
                onVote={() => vote("a")}
                pct={totalVotes ? pctA : null}
                count={currentVote.a}
              />
              <div className="flex items-center justify-center py-2 sm:py-0">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,var(--violet-brand),var(--cyan-brand))" }}
                >
                  OR
                </div>
              </div>
              <OptionCard
                letter="B"
                text={current.b}
                accent="linear-gradient(135deg,#3b82f6,#a855f7)"
                onVote={() => vote("b")}
                pct={totalVotes ? pctB : null}
                count={currentVote.b}
              />
            </div>

            {totalVotes > 0 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Your session votes · {totalVotes} total ({currentVote.a} vs {currentVote.b})
                </span>
                <button
                  type="button"
                  onClick={resetVotes}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Reset votes
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        <div className="flex justify-center mb-8">
          <Button size="lg" onClick={next} className="px-10 h-12 text-base">
            <RefreshCw className="w-5 h-5" />
            Next question
          </Button>
        </div>

        {/* Custom question adder */}
        <Collapsible open={showCustom} onOpenChange={setShowCustom}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-medium hover:bg-card transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add your own question
                {customs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({customs.length} in session)
                  </span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            <Input
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              placeholder="Option A — Would you rather…"
              maxLength={200}
            />
            <Input
              value={newB}
              onChange={(e) => setNewB(e.target.value)}
              placeholder="Option B — …or…"
              maxLength={200}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-muted-foreground">Category:</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as WYRCategory)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {(Object.keys(CATEGORY_META) as (Filter)[])
                  .filter((c) => c !== "all")
                  .map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                    </option>
                  ))}
              </select>
              <Button onClick={addCustom} disabled={!newA.trim() || !newB.trim()}>
                <Plus className="w-4 h-4" /> Add to session
              </Button>
            </div>
            {customs.length > 0 && (
              <ul className="space-y-1.5 pt-2">
                {customs.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs"
                  >
                    <span className="truncate">
                      {q.a} <span className="text-muted-foreground">or</span> {q.b}
                    </span>
                    <button
                      onClick={() =>
                        setCustoms((prev) => prev.filter((x) => x.id !== q.id))
                      }
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove custom question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Custom questions live only in this browser session — nothing is saved
              or sent anywhere.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Contextual internal links — near the game, above ads/how-to */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">
              Want a different party game? Try{" "}
              <Link to="/tools/truth-or-dare" className="text-foreground underline hover:no-underline">
                Truth or Dare
              </Link>{" "}
              next.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">
              Playing with a group? Assign secret Mafia roles with the{" "}
              <Link to="/tools/role-spinner" className="text-foreground underline hover:no-underline">
                Role Spinner
              </Link>
              .
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">
              Splitting into teams first? Use the{" "}
              <Link to="/tools/random-team-maker" className="text-foreground underline hover:no-underline">
                Random Team Maker
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <AdZone id="would-you-rather-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick a category chip — Funny, Deep, Couples, Kids-Friendly and more — or leave it on All.",
          "Read the two options and tap 'I'd pick this' on one side to vote (your tally stays local to this session).",
          "Hit Next question for another random pair, or open 'Add your own' to mix custom questions into the rotation.",
        ]}
      />

      <ToolSeoContent
        title="Free Would You Rather Generator — 170+ Questions, No Signup"
        description="Play Would You Rather online with 170+ hand-written questions across 8 categories — funny, deep, gross, hard choices, kids-friendly, couples, work and fantasy. Unlimited plays, add your own, no signup, no app download."
        body={[
          "Would You Rather is the classic party game where every question forces you to choose between two hypothetical options — no skipping, no third option, no 'both'. Skycally's generator gives you a hand-written bank of 170+ pairs split into eight distinct categories so you can pick the tone that fits the room, then tap through them one at a time for fast-paced group play. Every question is free and immediately available with no signup, no email, no app to download.",
          "Category chips at the top let you switch tone instantly. Funny is your default icebreaker for road trips and dinner parties. Deep is for late-night conversations where the point is what the answer reveals about the person. Hard Choices is for genuine dilemmas where nobody in the group feels totally comfortable committing. Gross is for the middle-school-humor kind of group. Kids-Friendly is safe for young players — no dating, no drinking, no anything questionable. Couples is designed for two people to play together on a date night. Work is for team-building and office icebreakers. Fantasy is superpower questions and Middle-earth-versus-Hogwarts territory.",
          "The custom question feature is where this tool goes beyond most competitors. Open 'Add your own', type in your Option A and Option B, pick a category, and it's mixed straight into the current session's rotation — no account needed. Great for inside jokes with a specific friend group, wedding-shower icebreakers about the couple, or personalised office questions. Custom questions stay in your session only; nothing is sent anywhere or saved beyond this browser tab.",
          "Unlike most Would You Rather sites, Skycally doesn't hide questions behind a signup wall, doesn't ask you to download an app for 'unlimited' play, and doesn't interrupt every third question with a pop-up. The vote tally under each question is genuinely local to your session — it's your group's running score, not a fabricated 'X% of people worldwide chose this' statistic. Everything runs in your browser, so it works on phones, tablets and laptops equally well.",
        ]}
        faqs={[
          {
            question: "What is Would You Rather?",
            answer:
              "Would You Rather is a party conversation game where each round presents two hypothetical options and everyone has to pick one — no third option, no skipping. It's used as an icebreaker, a road-trip game, a date-night activity, and a team-building exercise, and works with any group size from two people up to a full room.",
          },
          {
            question: "How many questions are included?",
            answer:
              "170+ original, hand-written question pairs split across eight categories: Funny, Deep, Gross, Hard Choices, Kids-Friendly, Couples, Work and Fantasy. Roughly 20+ questions per category. You can also add unlimited custom questions to your current session.",
          },
          {
            question: "Can I add my own questions?",
            answer:
              "Yes. Open the 'Add your own' section, type in Option A and Option B, pick a category, and it's added to the session's rotation immediately. Custom questions stay only in the current browser tab — nothing is saved, uploaded or shared.",
          },
          {
            question: "Is this suitable for kids?",
            answer:
              "The Kids-Friendly category is built specifically for younger players — no dating, alcohol, mature themes or anything inappropriate. Filter to just Kids-Friendly and every question the generator serves will come from that bank only. Other categories may include mildly gross, romantic or philosophical prompts more suited to teens and adults.",
          },
          {
            question: "What are good Would You Rather questions for couples?",
            answer:
              "The Couples category focuses on questions about your relationship, shared memories, and hypotheticals about your future together — things like 'have your first date on repeat forever' vs 'always be planning the next big adventure'. They're designed to spark conversation and get you sharing something real, not just laugh-and-move-on prompts.",
          },
          {
            question: "Is this free with no signup?",
            answer:
              "Yes. Every question, every category and the custom-question feature are all free forever with no signup, no email address and no app download. There is no paywall for 'unlimited' play — the full question bank is always immediately available.",
          },
          {
            question: "Can I play with a large group?",
            answer:
              "Absolutely. Open the tool on one phone or laptop, put it in the middle of the group, and take turns hitting Next question. Everyone answers each round out loud. For remote groups, share your screen on a video call and play the same way.",
          },
          {
            question: "Are there deep or thought-provoking questions, not just funny ones?",
            answer:
              "Yes. The Deep and Hard Choices categories are built exactly for that — questions that force a real trade-off and often reveal what someone actually values. Pick either category from the chips at the top and every question you see will come from those pools only.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

interface OptionCardProps {
  letter: "A" | "B";
  text: string;
  accent: string;
  onVote: () => void;
  pct: number | null;
  count: number;
}

function OptionCard({ letter, text, accent, onVote, pct, count }: OptionCardProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col shadow-md overflow-hidden">
      <div
        className="absolute top-0 left-0 h-1 w-full"
        style={{ background: accent }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white"
          style={{ background: accent }}
        >
          {letter}
        </span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Would you rather</span>
      </div>
      <p className="text-base sm:text-lg text-foreground leading-snug flex-1 mb-4">
        {text}
      </p>
      {pct !== null && (
        <div className="mb-3">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pct}% · {count} vote{count === 1 ? "" : "s"} this session
          </p>
        </div>
      )}
      <Button
        onClick={onVote}
        variant="outline"
        className="w-full"
      >
        <Scale className="w-4 h-4" />
        I'd pick this
      </Button>
    </div>
  );
}
