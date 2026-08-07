import { createFileRoute, Link } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Copy, RotateCcw, ArrowRight, ArrowLeft, HeartHandshake, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { AdZone } from "@/components/ad-zone";

import { ITEMS, type Item } from "@/lib/attachment/items";
import {
  scoreResponses,
  STYLE_META,
  STYLE_ORDER,
  MIDPOINT,
  buildShareText,
  type Responses,
  type Response,
  type Scores,
} from "@/lib/attachment/scoring";

const SLUG = "attachment-style-test";
const PAGE_URL = `${SITE_URL}/tools/attachment-style-test`;

export const Route = createFileRoute("/tools/attachment-style-test")({
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
            name: "Attachment Style Test",
            description:
              "Free attachment style test measuring attachment anxiety and avoidance on two continuous dimensions. 28 questions, full results immediately, no signup, no email, no paywall.",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            url: PAGE_URL,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "28 short questions across two dimensions: attachment anxiety and attachment avoidance",
              "Results on a two-dimensional map, not a single rigid label",
              "Secure, Anxious, Avoidant and Fearful-Avoidant quadrant interpretation",
              "Plain-language strengths and growth notes for your pattern",
              "Complete results shown immediately — no email, no signup, no paywall",
              "Runs entirely in your browser — answers never leave your device",
            ],
          }),
        },
      ],
    };
  },
  component: AttachmentPage,
});

type Screen = "intro" | "quiz" | "results";

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

function AttachmentPage() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [seed] = useState(() => Math.floor(Math.random() * 100000) + 1);
  const [responses, setResponses] = useState<Responses>({});
  const [index, setIndex] = useState(0);

  const items = useMemo(() => shuffledItems(seed), [seed]);
  const total = items.length;
  const answered = Object.keys(responses).length;
  const complete = answered === total;

  const scores = useMemo(() => (screen === "results" ? scoreResponses(responses) : null), [screen, responses]);

  const handleAnswer = (id: number, value: Response) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  const handleSubmit = () => {
    if (!complete) return;
    setScreen("results");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    setResponses({});
    setIndex(0);
    setScreen("intro");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShare = async () => {
    if (!scores) return;
    try {
      await navigator.clipboard.writeText(buildShareText(scores, PAGE_URL));
      toast.success("Result copied — paste it anywhere.");
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  return (
    <ToolPageShell
      title="Attachment Style Test"
      description="A short, two-dimensional attachment quiz measuring attachment anxiety and avoidance. 28 questions, full results immediately, no signup, no email, no paywall."
      showFileDisclaimer={false}
    >
      {screen === "intro" && <IntroCard total={total} onStart={() => setScreen("quiz")} />}

      {screen === "quiz" && (
        <QuizPanel
          items={items}
          index={index}
          setIndex={setIndex}
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
          "Read each of the 28 short statements and choose how much it describes you, from Strongly Disagree to Strongly Agree.",
          "Answer for how you generally are in close relationships — partners, close friends, family — not how you'd like to be. There are no right or wrong answers.",
          "See your position on the two attachment dimensions (anxiety and avoidance), the quadrant it falls in, and plain-language notes on strengths and growth. Copy your result to share it, or retake anytime.",
        ]}
      />

      <ToolSeoContent
        title="Free Attachment Style Test — Anxious, Avoidant, Secure or Fearful"
        description="A free 28-question attachment style test scored on two continuous dimensions — attachment anxiety and attachment avoidance — rather than one rigid label. Full results shown immediately, no email, no signup, no paywall."
        body={[
          "Attachment theory started with John Bowlby and Mary Ainsworth's work on how infants respond to separation from a caregiver, and was extended to adult relationships in the late 1980s. The modern research consensus is that adult attachment is best described not by four boxes but by two continuous dimensions: attachment anxiety, which is how much you fear abandonment and monitor a relationship for signs of withdrawal, and attachment avoidance, which is how uncomfortable you are with closeness, dependence, and emotional openness. Almost everyone sits somewhere in the middle of both scales rather than at an extreme.",
          "This test gives you a score from 0 to 100 on each dimension and then shows where that lands on a two-dimensional map. Low anxiety with low avoidance is usually described as secure; high anxiety with low avoidance as anxious or preoccupied; low anxiety with high avoidance as avoidant or dismissing; and high on both as fearful-avoidant, sometimes called disorganised. The label is a shorthand for your position on the map, not a category you belong to — someone at 52 and someone at 95 on the same dimension are described by the same word but are not living the same experience, which is exactly why the two numbers matter more than the name.",
          "The 28 statements here are original wording written for this tool, balanced with 14 items per dimension and an even split of positively and negatively keyed statements so that a general tendency to agree with things cancels out of your score. This is not the ECR, ECR-R, or any other copyrighted research instrument, and it should not be read as equivalent to one. Attachment patterns also vary by relationship and by context: many people are more secure with a long-term friend than with a new romantic partner, and results can shift over months and years, particularly after a significant relationship or a period of therapy.",
          "Treat your result as a starting point for reflection rather than a diagnosis. Attachment styles are not fixed traits, they are learned patterns of expectation, and they respond to consistent, safe relationships over time. Everything on this page runs in your browser — no answers are sent to a server, no account is created, and no email is ever requested. This is not a clinical or diagnostic assessment, and if your relationship patterns are causing you real distress, a licensed therapist is far better equipped to help than any online quiz.",
        ]}
        faqs={[
          {
            question: "What are the four attachment styles?",
            answer:
              "Secure (comfortable with both closeness and independence), Anxious or preoccupied (wants closeness, fears losing it), Avoidant or dismissing (self-reliant, uncomfortable depending on others), and Fearful-avoidant or disorganised (wants closeness and finds it unsafe at the same time). In this test they're the four quadrants formed by your anxiety and avoidance scores.",
          },
          {
            question: "Why does this test give me two scores instead of one type?",
            answer:
              "Because that's how the research actually models adult attachment. Anxiety and avoidance are continuous dimensions, and your exact position on each says far more than the quadrant name. Two people can share a label while sitting in very different places on the map.",
          },
          {
            question: "Is this the ECR or a validated clinical instrument?",
            answer:
              "No. The items here are original statements written for this tool, structured around the same two dimensions used in attachment research. It is designed for personal insight and is not a validated clinical or diagnostic instrument.",
          },
          {
            question: "Can my attachment style change?",
            answer:
              "Yes. Attachment patterns are learned expectations, not fixed personality traits. They commonly shift over time with consistent, safe relationships, significant life events, or therapy. Many people move toward the secure quadrant across their adult life.",
          },
          {
            question: "How long does it take?",
            answer:
              "About 3 to 5 minutes. There are 28 short statements, each answered on a 5-point scale, and nothing is timed.",
          },
          {
            question: "Is my data saved or shared?",
            answer:
              "No. Every answer and score stays in your browser. Nothing is sent to a server, no account is created, and no email is requested.",
          },
          {
            question: "What does it mean if my scores are near the boundary between two styles?",
            answer:
              "It means you're genuinely in between, not that the test is uncertain. Anxiety and avoidance are continuous, so a score close to the midpoint on either dimension puts you near the edge of two neighbouring quadrants at once — the result screen flags this directly rather than forcing you into one label.",
          },
          {
            question: "Can I take this about a specific relationship instead of in general?",
            answer:
              "Yes. The statements are written broadly on purpose, but you can answer with one specific relationship in mind if you'd rather see your pattern there — just be consistent across all 28 statements so the two scores stay comparable. Retake it with a different relationship in mind any time.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

// ── Intro screen ────────────────────────────────────────────────────────────

function IntroCard({ total, onStart }: { total: number; onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)" }}
        >
          <HeartHandshake className="w-6 h-6" style={{ color: "var(--cyan-brand)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold">Ready to start?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {total} short statements, about 3–5 minutes. Answer for how you generally are in close relationships. Your
            complete results appear the moment you finish — no email, no signup, no paywall.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            {[
              "Scored on two continuous dimensions — attachment anxiety and attachment avoidance.",
              "You get both numbers and a map position, not just a one-word label.",
              "Everything runs in your browser — your answers never leave your device.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onStart}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Start the test <ArrowRight className="w-4 h-4" />
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
  index,
  setIndex,
  responses,
  answered,
  total,
  complete,
  onAnswer,
  onSubmit,
}: {
  items: Item[];
  index: number;
  setIndex: (updater: (i: number) => number) => void;
  responses: Responses;
  answered: number;
  total: number;
  complete: boolean;
  onAnswer: (id: number, v: Response) => void;
  onSubmit: () => void;
}) {
  const item = items[index];
  const pct = Math.round((answered / total) * 100);
  const current = responses[item.id];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Question {index + 1} of {total}
          </span>
          <span className="text-muted-foreground">{pct}% answered</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--cyan-brand)" }} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
        <p className="text-lg sm:text-xl font-medium leading-snug">{item.text}</p>
        <div role="radiogroup" aria-label={item.text} className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2">
          {LIKERT.map((opt) => {
            const active = current === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => onAnswer(item.id, opt.value)}
                className={`rounded-lg border px-1 py-3 text-xs sm:text-sm transition ${
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

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {index < total - 1 ? (
            <button
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!complete}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {complete ? "See my results" : `${total - answered} left unanswered`}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!complete && index === total - 1 && (
        <p className="text-center text-xs text-muted-foreground">
          Use Back to fill in any statements you skipped — all {total} are needed for an accurate score.
        </p>
      )}
    </div>
  );
}

// ── Results screen ──────────────────────────────────────────────────────────

function QuadrantMap({ scores }: { scores: Scores }) {
  // x = avoidance, y = anxiety (inverted so high anxiety is at the top)
  const x = scores.avoidance.score0to100;
  const y = scores.anxiety.score0to100;
  const meta = STYLE_META[scores.style];

  const quads: { key: string; x: number; y: number; label: string }[] = [
    { key: "anxious", x: 25, y: 25, label: "Anxious" },
    { key: "fearful", x: 75, y: 25, label: "Fearful-Avoidant" },
    { key: "secure", x: 25, y: 75, label: "Secure" },
    { key: "avoidant", x: 75, y: 75, label: "Avoidant" },
  ];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-auto max-w-md mx-auto" role="img" aria-label="Attachment map">
      <rect x="0" y="0" width="100" height="100" rx="3" fill="color-mix(in oklab, var(--foreground) 4%, transparent)" />
      {quads.map((q) => (
        <text
          key={q.key}
          x={q.x}
          y={q.y}
          textAnchor="middle"
          fontSize="4.5"
          fill="var(--muted-foreground)"
          opacity="0.75"
        >
          {q.label}
        </text>
      ))}
      <line x1="50" y1="0" x2="50" y2="100" stroke="var(--border)" strokeWidth="0.6" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeWidth="0.6" />
      <circle cx={x} cy={100 - y} r="4.5" fill={meta.color} opacity="0.35" />
      <circle cx={x} cy={100 - y} r="2.2" fill={meta.color} />
      <text x="50" y="98" textAnchor="middle" fontSize="3.4" fill="var(--muted-foreground)">
        Avoidance →
      </text>
      <text x="3" y="50" fontSize="3.4" fill="var(--muted-foreground)" transform="rotate(-90 3 50)" textAnchor="middle">
        Anxiety →
      </text>
    </svg>
  );
}

function DimensionBar({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{label}</h3>
        <div className="text-2xl font-mono font-bold">{value}</div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Low</span>
        <span>Midpoint {MIDPOINT}</span>
        <span>High</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

function ResultsPanel({ scores, onRetake, onShare }: { scores: Scores; onRetake: () => void; onShare: () => void }) {
  const meta = STYLE_META[scores.style];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">
              Your result: <span style={{ color: meta.color }}>{meta.name}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.short}</p>
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

        <div className="mt-6">
          <QuadrantMap scores={scores} />
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{meta.description}</p>

        {scores.nearBoundary && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--cyan-brand)" }} />
            <span>
              At least one of your scores landed close to the midpoint, so you're genuinely in between two quadrants
              here — not a borderline case of the test being unsure, but a real "in between" position on the map.
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DimensionBar
          label="Attachment Anxiety"
          value={scores.anxiety.score0to100}
          color="var(--orange-brand)"
          hint={`${scores.anxiety.band} — how much you fear losing closeness and watch for signs a relationship is slipping.`}
        />
        <DimensionBar
          label="Attachment Avoidance"
          value={scores.avoidance.score0to100}
          color="var(--cyan-brand)"
          hint={`${scores.avoidance.band} — how uncomfortable closeness, dependence, and emotional openness feel to you.`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-lg font-bold">What tends to work for you</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {meta.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-lg font-bold">Worth working on</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {meta.growth.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.color }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <h3 className="font-display text-lg font-bold">The other three quadrants</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {STYLE_ORDER.filter((k) => k !== scores.style).map((k) => (
            <li key={k}>
              <span className="font-semibold" style={{ color: STYLE_META[k].color }}>
                {STYLE_META[k].name}
              </span>
              {" — "}
              {STYLE_META[k].tagline}
            </li>
          ))}
        </ul>
      </div>

      <div
        role="note"
        className="rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground leading-relaxed"
      >
        <strong className="text-foreground">A note on these scores.</strong> The two numbers above matter more than the
        quadrant name — the label is just shorthand for where you landed on the map, and someone just over the midpoint
        is not living the same experience as someone near the extreme. Attachment patterns also vary by relationship and
        shift over time. This is a self-report tool for personal insight built on original items, not the ECR or any
        validated clinical instrument, and it is not a diagnostic or medical assessment.
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-bold mb-3">Pair it with</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <Link to="/tools/big-five-personality-test" className="text-foreground hover:underline">
              Big Five Personality Test
            </Link>
            {" — "}
            see how your attachment pattern sits alongside your broader personality profile.
          </li>
          <li>
            <Link to="/tools/would-you-rather" className="text-foreground hover:underline">
              Would You Rather
            </Link>
            {" — "}
            conversation starters for the couples and deep categories.
          </li>
          <li>
            <Link to="/tools/fancy-text-generator" className="text-foreground hover:underline">
              Fancy Text Generator
            </Link>
            {" — "}
            style your shared result before posting it.
          </li>
          <li>
            <Link to="/blog/attachment-styles-explained" className="text-foreground hover:underline">
              Attachment Styles Explained
            </Link>
            {" — "}
            where these four patterns actually come from, and what the research says they mean.
          </li>
        </ul>
      </section>

      <AdZone id="attachment-style-bottom" size="728x90" />
    </div>
  );
}
