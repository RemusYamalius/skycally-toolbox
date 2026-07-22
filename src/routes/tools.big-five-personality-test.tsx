import { createFileRoute, Link } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Copy, RotateCcw, ArrowRight, BrainCircuit, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { AdZone } from "@/components/ad-zone";

import { ITEMS, type Item } from "@/lib/big-five/items";
import {
  scoreResponses,
  TRAIT_META,
  TRAIT_ORDER,
  BAND_DESCRIPTIONS,
  type Responses,
  type Response,
} from "@/lib/big-five/scoring";
import { buildShareText } from "@/lib/big-five/share";

const SLUG = "big-five-personality-test";

export const Route = createFileRoute("/tools/big-five-personality-test")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const base = buildToolMeta(tool);
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Big Five Personality Test",
            description:
              "Free Big Five (OCEAN) personality test based on the public-domain IPIP item bank. 50 short questions, complete results shown immediately, no signup, no paywall, no email.",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/big-five-personality-test`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "50 short IPIP-based questions covering all five OCEAN traits",
              "Complete results shown immediately — no email, no signup, no paywall",
              "0–100 relative score and descriptive band for each of the five traits",
              "Bar chart comparing all five traits at a glance",
              "Shareable text summary you can copy and post",
              "Built on the Big Five model used in academic and clinical psychology research (not MBTI)",
              "Runs entirely in your browser — answers never leave your device",
            ],
          }),
        },
      ],
    };
  },
  component: BigFivePage,
});

type Screen = "intro" | "quiz" | "results";

// Seeded shuffle so item order is stable within a session but hides per-trait
// grouping from the user during the quiz.
function shuffledItems(seed: number): Item[] {
  const arr = ITEMS.slice();
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const LIKERT: { value: Response; label: string; short: string }[] = [
  { value: 1, label: "Strongly Disagree", short: "SD" },
  { value: 2, label: "Disagree", short: "D" },
  { value: 3, label: "Neutral", short: "N" },
  { value: 4, label: "Agree", short: "A" },
  { value: 5, label: "Strongly Agree", short: "SA" },
];

function BigFivePage() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [seed] = useState(() => Math.floor(Math.random() * 100000) + 1);
  const [responses, setResponses] = useState<Responses>({});

  const items = useMemo(() => shuffledItems(seed), [seed]);
  const answered = Object.keys(responses).length;
  const total = items.length;
  const complete = answered === total;

  const scores = useMemo(() => (screen === "results" ? scoreResponses(responses) : null), [screen, responses]);

  const handleAnswer = (id: number, value: Response) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!complete) return;
    setScreen("results");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    setResponses({});
    setScreen("intro");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShare = async () => {
    if (!scores) return;
    const text = buildShareText(scores, `${SITE_URL}/tools/big-five-personality-test`);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Result copied — paste it anywhere.");
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  return (
    <ToolPageShell
      title="Big Five Personality Test"
      description="A short, scientifically-grounded personality quiz based on the Big Five (OCEAN) model. 50 questions, full results immediately, no signup, no paywall."
      showFileDisclaimer={false}
    >
      {screen === "intro" && <IntroCard onStart={() => setScreen("quiz")} />}

      {screen === "quiz" && (
        <QuizPanel
          items={items}
          responses={responses}
          answered={answered}
          total={total}
          complete={complete}
          onAnswer={handleAnswer}
          onSubmit={handleSubmit}
        />
      )}

      {screen === "results" && scores && <ResultsPanel scores={scores} onRetake={handleRetake} onShare={handleShare} />}

      <HowToUse
        steps={[
          "Read each of the 50 short statements and choose how much it applies to you on a 5-point scale from Strongly Disagree to Strongly Agree.",
          "Answer based on how you generally are, not how you'd like to be — there are no right or wrong answers, and no one else sees your responses.",
          "Submit to see your full Big Five profile — a 0–100 relative score, a descriptive band, and a chart for each of the five traits. Copy your result to share it, or retake the quiz anytime.",
        ]}
      />

      <ToolSeoContent
        title="Free Big Five (OCEAN) Personality Test — Full Results, No Signup"
        description="A short, scientifically-grounded personality quiz built on the Big Five (OCEAN) model — the framework actually used in academic and clinical psychology research. 50 IPIP-based questions, complete results shown immediately, no email, no paywall."
        body={[
          "The Big Five, also called the OCEAN or Five-Factor Model, is the personality model actually used in mainstream psychological research: Openness to Experience, Conscientiousness, Extraversion, Agreeableness, and Neuroticism. Each is measured as a continuous dimension — a spectrum, not a category — because that's how personality traits actually distribute across the population. This is a meaningful contrast with popular typology quizzes like Myers-Briggs (MBTI), which sort people into 16 binary boxes on traits that are actually continuous, and which mainstream personality researchers consider unreliable: a substantial fraction of people get a different four-letter type when they retake the same quiz weeks later. Almost every modern academic personality study uses the Big Five instead.",
          "This test uses 50 short first-person statements drawn from the International Personality Item Pool (IPIP), a public-domain item bank created by personality psychologist Lewis Goldberg for open scientific and commercial reuse. Ten items measure each of the five traits, with five positively-keyed and five negatively-keyed items per trait — the negatively-keyed items are reverse-scored (a 5 becomes a 1, a 4 becomes a 2, and so on) before being averaged, which cancels out the natural tendency some people have to agree with statements regardless of content. Your five trait averages are then rescaled to a 0–100 number purely for readability. We call this a relative score, not a percentile, because a proper percentile requires comparing your answers to a large, representative population sample — which this tool does not have.",
          "In everyday terms: Openness reflects curiosity, imagination, and interest in ideas and new experiences. Conscientiousness reflects organisation, self-discipline, and follow-through on goals. Extraversion reflects sociability, energy in company, and outward expressiveness — a lower score means introversion, not shyness or a problem. Agreeableness reflects warmth, cooperation, and empathy toward others. Neuroticism reflects sensitivity to stress and how strongly your emotions swing; a high score is not a mental-health diagnosis and a low score is not emotional numbness — the trait simply describes reactivity, and people across the whole range live full, healthy lives.",
          "Unlike most popular personality quizzes online, this tool shows you your complete results the moment you finish, entirely for free — no email capture, no partial teaser, no paid unlock, no account. Everything runs in your browser and nothing you type is sent to a server. Treat this as a self-report tool for personal insight and reflection: it captures how you described yourself on this specific set of questions on this specific day, not a fixed, permanent label. It is not a clinical, diagnostic, or medical assessment, and a real clinical evaluation from a licensed professional is a very different thing.",
        ]}
        faqs={[
          {
            question: "What is the Big Five personality model?",
            answer:
              "The Big Five (also called OCEAN or the Five-Factor Model) is the personality framework most widely used in modern academic and clinical psychology research. It measures five broad, continuous traits — Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism — as dimensions rather than binary types.",
          },
          {
            question: "Is this the same as a Myers-Briggs (MBTI) test?",
            answer:
              "No. MBTI sorts people into 16 binary types (like INTJ or ESFP) on traits that are actually continuous, and its test-retest reliability is poor — many people get a different type on retesting. This quiz uses the Big Five instead, which is the model mainstream personality researchers actually use, and reports each trait as a continuous score.",
          },
          {
            question: "How accurate is this test?",
            answer:
              "It uses well-validated IPIP items and standard reverse-scoring, which gives a solid rough profile in about five minutes. Any short self-report questionnaire is still just a snapshot of how you described yourself today — real personality assessment in a research or clinical setting uses longer inventories, multiple sessions, and often observer reports.",
          },
          {
            question: "Is my data saved or shared?",
            answer:
              "No. Every question, response, and score stays in your browser. Nothing is sent to a server, no account is created, and no email is ever requested.",
          },
          {
            question: "How long does the quiz take?",
            answer:
              "About 5 to 8 minutes. There are 50 short statements, each answered on a 5-point Strongly Disagree to Strongly Agree scale. You can go at your own pace — nothing is timed.",
          },
          {
            question: "Can I retake the test?",
            answer:
              "Yes, as many times as you like. Retake it after a few weeks or months to see how stable your profile is — Big Five scores are generally stable in adults but can shift with major life changes.",
          },
          {
            question: "What does a high or low score on a trait mean?",
            answer:
              "Each trait is a spectrum, and no end of any spectrum is inherently good or bad. A high Extraversion score, for example, doesn't mean better than a low one — it just describes different ways of getting energy and interacting. Every trait band on the results page comes with a plain-language description of what that level tends to look like in everyday life.",
          },
          {
            question: "Is this a clinical or diagnostic test?",
            answer:
              "No. This is a self-report screening tool designed for personal insight and reflection. It is not a clinical, diagnostic, or medical assessment, and it does not replace an evaluation by a licensed mental-health professional.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

// ── Intro screen ────────────────────────────────────────────────────────────

function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)" }}
        >
          <BrainCircuit className="w-6 h-6" style={{ color: "var(--cyan-brand)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold">Ready to start?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            50 short statements, about 5–8 minutes. Answer based on how you generally are. There are no right or wrong
            answers. Your complete results appear the moment you finish — no email, no signup, no paywall.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} />
              <span>Based on the public-domain IPIP item bank (used in real personality research).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} />
              <span>Measures the Big Five (OCEAN) traits — not MBTI-style "types".</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} />
              <span>Everything runs in your browser — your answers never leave your device.</span>
            </li>
          </ul>
          <button
            onClick={onStart}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Start the quiz <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: this is a self-report tool for personal insight, not a clinical, diagnostic, or medical assessment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Quiz screen ─────────────────────────────────────────────────────────────

function QuizPanel({
  items,
  responses,
  answered,
  total,
  complete,
  onAnswer,
  onSubmit,
}: {
  items: Item[];
  responses: Responses;
  answered: number;
  total: number;
  complete: boolean;
  onAnswer: (id: number, v: Response) => void;
  onSubmit: () => void;
}) {
  const pct = Math.round((answered / total) * 100);
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 border-b border-border bg-background/85 px-4 sm:px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {answered} of {total} answered
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--cyan-brand)" }} />
        </div>
      </div>

      <ol className="space-y-3">
        {items.map((item, idx) => (
          <li key={item.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {idx + 1}
              </span>
              <p className="text-base font-medium leading-snug">{item.text}</p>
            </div>
            <div role="radiogroup" aria-label={item.text} className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
              {LIKERT.map((opt) => {
                const active = responses[item.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => onAnswer(item.id, opt.value)}
                    className={`rounded-lg border px-1 py-2 text-xs sm:text-sm transition ${
                      active
                        ? "border-cyan-400 bg-cyan-400/15 text-foreground font-semibold"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                    title={opt.label}
                  >
                    <span className="sm:hidden">{opt.short}</span>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!complete}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {complete ? "See my results" : `Answer all ${total} questions to continue`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Results screen ──────────────────────────────────────────────────────────

function ResultsPanel({
  scores,
  onRetake,
  onShare,
}: {
  scores: ReturnType<typeof scoreResponses>;
  onRetake: () => void;
  onShare: () => void;
}) {
  const chartData = TRAIT_ORDER.map((t) => ({
    trait: TRAIT_META[t].short,
    score: scores[t].score0to100,
    color: TRAIT_META[t].color,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Your Big Five profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Relative scores from 0 to 100 across the five OCEAN traits.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <Copy className="w-4 h-4" /> Share result
            </button>
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
          </div>
        </div>

        {/* Chart: YAxis width increased 110 -> 152 and tick font-size trimmed
            13 -> 12 so the longest label ("Conscientiousness") always has
            enough room and never gets clipped at its left edge. */}
        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis type="category" dataKey="trait" tick={{ fill: "var(--foreground)", fontSize: 12 }} width={152} />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--foreground) 8%, transparent)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} / 100`, "Score"]}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.trait} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRAIT_ORDER.map((t) => {
          const r = scores[t];
          const meta = TRAIT_META[t];
          return (
            <div key={t} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                    <h3 className="font-display text-lg font-bold">{meta.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.blurb}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-mono font-bold">{r.score0to100}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
                </div>
              </div>
              <div className="mt-3">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    background: `color-mix(in oklab, ${meta.color} 18%, transparent)`,
                    color: meta.color,
                  }}
                >
                  {r.band}
                </span>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{BAND_DESCRIPTIONS[t][r.band]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Honest caveat block */}
      <div
        role="note"
        className="rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground leading-relaxed"
      >
        <strong className="text-foreground">A note on these scores.</strong> The 0–100 numbers above are relative scores
        from this specific set of answers, not true population percentiles — this tool doesn't have a representative
        reference sample. Your Big Five profile reflects how you described yourself today; scores can shift over time
        and with major life changes. This is a self-report tool for personal insight, not a clinical, diagnostic, or
        medical assessment.
      </div>

      {/* Contextual internal links — placed HERE, near results, above HowToUse/SEO block. */}
      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-bold mb-3">Pair it with</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <Link to="/tools/fancy-text-generator" className="text-foreground hover:underline">
              Fancy Text Generator
            </Link>
            {" — "}
            style your shareable result with decorative Unicode before you post it to Instagram, TikTok, or your bio.
          </li>
          <li>
            <Link to="/tools/word-groups" className="text-foreground hover:underline">
              Word Groups
            </Link>
            {" — "}
            if you enjoyed this, try today's daily word puzzle next.
          </li>
          <li>
            <Link to="/tools/meme-generator" className="text-foreground hover:underline">
              Meme Generator
            </Link>
            {" — "}
            turn your result into a shareable meme.
          </li>
        </ul>
      </section>

      <AdZone id="big-five-bottom" size="728x90" />
    </div>
  );
}
