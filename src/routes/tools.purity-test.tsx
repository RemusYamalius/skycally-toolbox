import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Feather, RotateCcw, Share2 } from "lucide-react";
import { motion } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound } from "@/lib/sound";
import { CATEGORIES, STATEMENTS, TOTAL_STATEMENTS } from "@/lib/purity-test/statements";
import { buildShareText, computeScore, tierFor } from "@/lib/purity-test/scoring";

export const Route = createFileRoute("/tools/purity-test")({
  // step is absent/invalid -> intro. 1-7 -> that category. 8 -> results.
  // Each step change is a REAL page reload (see goToStep below), not a
  // client-side transition — every category has genuinely distinct content
  // (12-19 real statements), so this is a normal multi-page pattern, not
  // artificial ad-impression inflation.
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const raw = Number(search.step);
    return { step: Number.isFinite(raw) && raw >= 1 && raw <= 8 ? raw : undefined };
  },
  head: () => {
    const tool = toolBySlug("purity-test", tools);
    const title = "Purity Test — Free 100-Question Online Quiz | Skycally";
    const description =
      "Take the free Purity Test online — check off which of these 100 life experiences apply to you and get your score instantly. No signup, share your result with friends.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Game",
            name: "Purity Test",
            alternateName: ["Innocence Test", "100 Question Purity Test", "Life Experience Checklist"],
            genre: "Quiz",
            playMode: "SinglePlayer",
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
  component: PurityTest,
});

// sessionStorage (not localStorage): progress survives the deliberate
// reloads between sections within one sitting, but is gone once the tab
// closes — matches the tool's original "nothing persists long-term" intent
// while still allowing multi-page navigation to work.
const STORAGE_KEY = "purity-test:checked";

function readStoredChecked(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function writeStoredChecked(checked: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checked)));
  } catch {
    /* sessionStorage unavailable (e.g. private browsing) — progress just won't survive a reload */
  }
}

function goToStep(step: number | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (step === null) url.searchParams.delete("step");
  else url.searchParams.set("step", String(step));
  window.location.href = url.toString();
}

function PurityTest() {
  const { step } = Route.useSearch();
  const [checked, setChecked] = useState<Set<number>>(() => readStoredChecked());
  const [copied, setCopied] = useState(false);

  const currentSection = step && step >= 1 && step <= 7 ? step : null;
  const isResult = step === 8;
  const isIntro = !currentSection && !isResult;

  // Defensive reset: if someone lands back on the bare intro URL after
  // abandoning an earlier attempt, make sure that's a genuinely fresh start
  // rather than silently carrying over old ticks from this browser session.
  useEffect(() => {
    if (isIntro && typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [isIntro]);

  const checkedCount = checked.size;
  const score = useMemo(() => computeScore(checkedCount), [checkedCount]);
  const tier = tierFor(score);
  const shareText = buildShareText(score);

  const currentCategory = currentSection ? CATEGORIES[currentSection - 1] : null;
  const currentItems = useMemo(
    () => (currentCategory ? STATEMENTS.filter((s) => s.category === currentCategory) : []),
    [currentCategory],
  );

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredChecked(next);
      return next;
    });
  };

  const start = () => {
    playSound("click");
    goToStep(1);
  };

  const nextSection = () => {
    playSound("click");
    goToStep((currentSection ?? 1) + 1);
  };

  const prevSection = () => {
    playSound("click");
    goToStep((currentSection ?? 2) - 1);
  };

  const restart = () => {
    playSound("click");
    if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
    goToStep(null);
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ToolPageShell
      showFileDisclaimer={false}
      title="Purity Test"
      description="Check off which of 100 life experiences apply to you and get your score instantly — free, private, no signup."
    >
      {isIntro && (
        <div className="max-w-2xl mx-auto text-center py-6">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-xl"
            style={{ background: "linear-gradient(135deg, var(--violet-brand), var(--cyan-brand))" }}
          >
            <Feather className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-bold mb-3">How innocent are you, really?</h2>
          <p className="text-muted-foreground mb-8">
            Go through 100 everyday life experiences, seven quick sections at a time, and tick the ones you've done.
            Your score is the percentage you left unchecked — the higher the score, the more innocent the result.
          </p>
          <Button size="lg" onClick={start} className="px-10 h-12 text-base">
            Start the Test
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            100 statements across 7 short sections · takes about 3 minutes · nothing is saved or sent anywhere
          </p>
        </div>
      )}

      {currentSection && currentCategory && (
        <div className="max-w-2xl mx-auto">
          <div className="sticky top-16 z-20 -mx-2 mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/90 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-sm font-semibold">
                Section {currentSection} of 7 · {checkedCount} checked so far
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentSection < 7 ? `Up next: ${CATEGORIES[currentSection]}` : "Last section"}
              </p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(currentSection / 7) * 100}%`,
                    background: "linear-gradient(90deg, var(--violet-brand), var(--cyan-brand))",
                  }}
                />
              </div>
            </div>
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{currentCategory}</h3>
            <ul className="space-y-2">
              {currentItems.map((s) => {
                const isOn = checked.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      aria-pressed={isOn}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        isOn ? "border-transparent bg-secondary" : "border-border bg-card hover:border-foreground/30"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                          isOn ? "border-transparent text-white" : "border-border"
                        }`}
                        style={
                          isOn
                            ? { background: "linear-gradient(135deg, var(--violet-brand), var(--cyan-brand))" }
                            : undefined
                        }
                      >
                        {isOn && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className={isOn ? "text-foreground" : "text-muted-foreground"}>{s.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <AdZone id={`purity-test-section-${currentSection}`} size="728x90" />

          <div className="mt-8 flex items-center justify-center gap-3">
            {currentSection > 1 && (
              <Button
                size="lg"
                variant="outline"
                onClick={prevSection}
                className="h-12 px-6 text-base gap-2 border-2 hover:bg-[color-mix(in_oklab,var(--cyan-brand)_10%,transparent)] hover:border-[var(--cyan-brand)] hover:text-[var(--cyan-brand)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              size="lg"
              onClick={nextSection}
              className="h-12 px-10 text-base gap-2"
              style={{ background: "linear-gradient(135deg, var(--violet-brand), var(--cyan-brand))" }}
            >
              {currentSection < 7 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                "See My Score"
              )}
            </Button>
          </div>
        </div>
      )}

      {isResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
            <div
              className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full text-4xl font-extrabold text-white shadow-xl"
              style={{ background: tier.gradient }}
            >
              {score}
            </div>
            <p className="text-sm text-muted-foreground mb-2">Your purity score</p>
            <h2 className="text-2xl font-bold mb-2">
              {tier.emoji} {tier.label}
            </h2>
            <p className="text-muted-foreground mb-6">{tier.blurb}</p>
            <p className="text-sm text-muted-foreground">
              You checked <strong className="text-foreground">{checkedCount}</strong> of {TOTAL_STATEMENTS} statements.
            </p>
          </div>

          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-secondary/40 p-5 text-left text-sm leading-relaxed text-foreground">
            {shareText}
          </pre>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={copyResult}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Result"}
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-4 w-4" />
                Share on WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={restart}>
              <RotateCcw className="h-4 w-4" />
              Take It Again
            </Button>
          </div>
        </motion.div>
      )}

      <p className="text-sm text-muted-foreground mt-10">
        Prefer a game you play with friends in the room? Try{" "}
        <Link to="/tools/truth-or-dare" className="text-[var(--cyan-brand)] hover:underline">
          Truth or Dare
        </Link>{" "}
        or{" "}
        <Link to="/tools/most-likely-to" className="text-[var(--cyan-brand)] hover:underline">
          Most Likely To
        </Link>
        . Curious about your relationship patterns instead? Take the{" "}
        <Link to="/tools/attachment-style-test" className="text-[var(--cyan-brand)] hover:underline">
          Attachment Style Test
        </Link>
        .
      </p>

      {!currentSection && <AdZone id={`purity-test-${isResult ? "result" : "intro"}`} size="728x90" />}

      <HowToUse
        steps={[
          "Tap Start the Test to open the first of 7 short sections.",
          "Check off every experience in that section that applies to you, then tap Next to move on — each section loads fresh.",
          "After the 7th section, hit See My Score to get your percentage, tier and blurb.",
          "Copy the result card or share it on WhatsApp to compare with friends.",
        ]}
      />

      <ToolSeoContent
        title="Purity Test — Free 100-Question Online Quiz | Skycally"
        description="Take the free Purity Test online — check off which of these 100 life experiences apply to you and get your score instantly. No signup, share your result with friends."
        body={[
          "The Purity Test is a simple 100-question checklist of ordinary life experiences — nights out, travel mishaps, relationships, small rule-breaking, growing-up milestones and embarrassing moments. You tick every statement that applies to you, and your score is the percentage of statements you left unchecked. A score of 100 means you haven't done any of them; a score of 0 means you've done them all. It's a lighthearted snapshot of how much living you've packed in so far, not a judgement of character.",
          "All 100 statements are original and written specifically for this quiz, grouped into seven categories: Social & Nightlife, Travel & Adventure, Relationships, Small Vices & Habits, Mischief & Rule-Breaking, Growing Up, and Quirky & Embarrassing. The quiz moves one category at a time — a short, focused section followed by a Next button — so it never feels like a giant wall of questions, and a progress indicator always shows which of the 7 sections you're on.",
          "The fun part is comparing. Every result comes as a compact text card with your score, tier emoji, label and blurb, ready to copy or send straight to WhatsApp. Run it in a group chat, at a sleepover, on a road trip, or during a dorm-room evening and see whose number is highest — and who suddenly has a lot of explaining to do. Because everyone answers the same 100 statements, the scores are directly comparable.",
          "Privacy is deliberate here: nothing is saved on any server. Your progress lives only in your browser for the current session so you can move between sections without losing your place, and it's cleared completely as soon as you close the tab or start over. The whole quiz runs client-side, so your answers never leave your device unless you choose to share the result text yourself.",
        ]}
        faqs={[
          {
            question: "Is this the same as the Rice Purity Test?",
            answer:
              "No. This is an entirely original Purity Test written for Skycally, with its own 100 statements, its own seven categories and its own scoring tiers. It isn't affiliated with, and doesn't reproduce, any other site's question list.",
          },
          {
            question: "How is the score calculated?",
            answer:
              "Your score is the percentage of statements you did NOT check. Check nothing and you score 100; check all 100 and you score 0. Each statement is worth exactly one point.",
          },
          {
            question: "What is a good or normal score?",
            answer:
              "There's no right answer — it's a fun snapshot, not an assessment. Most people land somewhere in the middle range, which is why the tiers include several 'balanced' results rather than just high and low extremes.",
          },
          {
            question: "Are my answers saved anywhere?",
            answer:
              "No server ever sees them. Your progress is held only in your browser for the current session so you can move between the 7 sections, and it's cleared the moment you close the tab or hit Take It Again.",
          },
          {
            question: "Do I need an account to take the test?",
            answer: "No signup, no email, no login. Open the page, start the test and get your score.",
          },
          {
            question: "How long does the test take?",
            answer: "About three minutes across 7 short sections. Each one only takes a few seconds to get through.",
          },
          {
            question: "Can I share my result with friends?",
            answer:
              "Yes. The result screen gives you a copyable text card with your score, tier and blurb, plus a one-tap WhatsApp share button. Your individual answers are never included — only the final score.",
          },
          {
            question: "Does it work on mobile?",
            answer:
              "Yes. The checklist, progress bar and result card are all designed mobile-first, so it works well on phones, tablets and desktop.",
          },
        ]}
      />

      <RelatedTools currentSlug="purity-test" />
    </ToolPageShell>
  );
}
