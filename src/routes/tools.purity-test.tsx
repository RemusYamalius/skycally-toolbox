import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Check, Copy, Feather, RotateCcw, Share2 } from "lucide-react";
import { motion } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { playSound } from "@/lib/sound";
import { scrollToTop } from "@/hooks/use-scroll-top";
import { CATEGORIES, STATEMENTS, TOTAL_STATEMENTS } from "@/lib/purity-test/statements";
import { buildShareText, computeScore, tierFor } from "@/lib/purity-test/scoring";

export const Route = createFileRoute("/tools/purity-test")({
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

type Stage = "intro" | "quiz" | "result";

function PurityTest() {
  const [stage, setStage] = useState<Stage>("intro");
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [copied, setCopied] = useState(false);

  const checkedCount = checked.size;
  const score = useMemo(() => computeScore(checkedCount), [checkedCount]);
  const tier = tierFor(score);
  const shareText = buildShareText(score);

  const grouped = useMemo(
    () => CATEGORIES.map((category) => ({ category, items: STATEMENTS.filter((s) => s.category === category) })),
    [],
  );

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = () => {
    playSound("click");
    setStage("quiz");
    scrollToTop();
  };

  const finish = () => {
    playSound("click");
    setStage("result");
    scrollToTop();
  };

  const restart = () => {
    playSound("click");
    setChecked(new Set());
    setCopied(false);
    setStage("intro");
    scrollToTop();
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
      {stage === "intro" && (
        <div className="max-w-2xl mx-auto text-center py-6">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-xl"
            style={{ background: "linear-gradient(135deg, var(--violet-brand), var(--cyan-brand))" }}
          >
            <Feather className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-bold mb-3">How innocent are you, really?</h2>
          <p className="text-muted-foreground mb-8">
            Go through 100 everyday life experiences and tick the ones you've done. Your score is the percentage you
            left unchecked — the higher the score, the more innocent the result.
          </p>
          <Button size="lg" onClick={start} className="px-10 h-12 text-base">
            Start the Test
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            100 statements · takes about 3 minutes · nothing is saved or sent anywhere
          </p>
        </div>
      )}

      {stage === "quiz" && (
        <div className="max-w-2xl mx-auto">
          <div className="sticky top-16 z-20 -mx-2 mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/90 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-sm font-semibold">
                {checkedCount} / {TOTAL_STATEMENTS} checked
              </p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(checkedCount / TOTAL_STATEMENTS) * 100}%`,
                    background: "linear-gradient(90deg, var(--violet-brand), var(--cyan-brand))",
                  }}
                />
              </div>
            </div>
            <Button onClick={finish}>See My Score</Button>
          </div>

          <div className="space-y-8">
            {grouped.map(({ category, items }) => (
              <section key={category}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{category}</h3>
                <ul className="space-y-2">
                  {items.map((s) => {
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
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={finish} className="px-10 h-12 text-base">
              See My Score
            </Button>
          </div>
        </div>
      )}

      {stage === "result" && (
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
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
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

      <AdZone id="purity-test-mid" size="728x90" />

      <HowToUse
        steps={[
          "Tap Start the Test to open the 100-statement checklist.",
          "Check off every experience that applies to you, category by category.",
          "Hit See My Score to get your percentage, tier and blurb.",
          "Copy the result card or share it on WhatsApp to compare with friends.",
        ]}
      />

      <ToolSeoContent
        title="Purity Test — Free 100-Question Online Quiz | Skycally"
        description="Take the free Purity Test online — check off which of these 100 life experiences apply to you and get your score instantly. No signup, share your result with friends."
        body={[
          "The Purity Test is a simple 100-question checklist of ordinary life experiences — nights out, travel mishaps, relationships, small rule-breaking, growing-up milestones and embarrassing moments. You tick every statement that applies to you, and your score is the percentage of statements you left unchecked. A score of 100 means you haven't done any of them; a score of 0 means you've done them all. It's a lighthearted snapshot of how much living you've packed in so far, not a judgement of character.",
          "All 100 statements are original and written specifically for this quiz, grouped into seven categories: Social & Nightlife, Travel & Adventure, Relationships, Small Vices & Habits, Mischief & Rule-Breaking, Growing Up, and Quirky & Embarrassing. The category headings let you skim quickly, and a sticky counter shows how many boxes you've ticked so far, so you always know where you are. When you're done, one tap turns your answers into a score with one of seven result tiers, from Practically a Saint down to Living Legend.",
          "The fun part is comparing. Every result comes as a compact text card with your score, tier emoji, label and blurb, ready to copy or send straight to WhatsApp. Run it in a group chat, at a sleepover, on a road trip, or during a dorm-room evening and see whose number is highest — and who suddenly has a lot of explaining to do. Because everyone answers the same 100 statements, the scores are directly comparable.",
          "Privacy is deliberate here: nothing is saved and nothing is sent anywhere. There's no account, no database, and not even browser storage — your ticks live only in the page while it's open, and refreshing wipes them completely. The whole quiz runs client-side in your browser, so your answers never leave your device unless you choose to share the result text yourself.",
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
              "No. Nothing is stored on a server, and the quiz doesn't even use browser storage. Refresh the page and everything resets.",
          },
          {
            question: "Do I need an account to take the test?",
            answer: "No signup, no email, no login. Open the page, start the test and get your score.",
          },
          {
            question: "How long does the test take?",
            answer: "About three minutes. There are 100 short statements and you just tap the ones that apply.",
          },
          {
            question: "Can I share my result with friends?",
            answer:
              "Yes. The result screen gives you a copyable text card with your score, tier and blurb, plus a one-tap WhatsApp share button. Your individual answers are never included — only the final score.",
          },
          {
            question: "Does it work on mobile?",
            answer:
              "Yes. The checklist, sticky score bar and result card are all designed mobile-first, so it works well on phones, tablets and desktop.",
          },
        ]}
      />

      <RelatedTools currentSlug="purity-test" />
    </ToolPageShell>
  );
}
