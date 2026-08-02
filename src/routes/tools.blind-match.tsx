import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Copy, Check, MessageCircle, RotateCcw, Lock, Sparkles } from "lucide-react";

import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sound";
import { BLIND_MATCH_QUESTIONS, DIMENSION_META, QUESTION_COUNT } from "@/lib/blind-match/questions";
import { computeMatch, decodeAnswers, encodeAnswers, tierFor, type MatchResult } from "@/lib/blind-match/scoring";

export const Route = createFileRoute("/tools/blind-match")({
  validateSearch: (search: Record<string, unknown>): { p1?: string } => ({
    p1: typeof search.p1 === "string" && search.p1.length > 0 ? search.p1 : undefined,
  }),
  head: () => {
    const tool = toolBySlug("blind-match", tools);
    const title = "Blind Match — Anonymous Compatibility Test | Share & Find Out | Skycally";
    const description =
      "Free compatibility test for couples: answer 20 honest questions, share one link, and get a relationship compatibility score. An anonymous couple quiz inspired by married at first sight.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GameApplication",
            name: "Blind Match",
            alternateName: [
              "Compatibility Test for Couples",
              "Relationship Compatibility Quiz",
              "Anonymous Couple Quiz",
              "Married at First Sight Quiz",
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
  component: BlindMatchPage,
});

type Phase = "landing" | "quiz" | "share" | "invite" | "counting" | "reveal";

function BlindMatchPage() {
  const { p1 } = Route.useSearch();

  const partnerAnswers = useMemo(() => (p1 ? decodeAnswers(p1) : null), [p1]);
  const isPlayerTwo = partnerAnswers !== null;

  const [phase, setPhase] = useState<Phase>(isPlayerTwo ? "invite" : "landing");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState<"link" | "result" | null>(null);

  // Invalid / corrupted link → behave like a fresh visit.
  useEffect(() => {
    if (p1 && !partnerAnswers) setPhase("landing");
  }, [p1, partnerAnswers]);

  // Reveal countdown — the score is only rendered once this hits 0.
  useEffect(() => {
    if (phase !== "counting") return;
    if (countdown <= 0) {
      setPhase("reveal");
      playSound("finish");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const start = () => {
    setAnswers([]);
    setStep(0);
    setPhase("quiz");
  };

  const answer = (optionIndex: number) => {
    playSound("click");
    const next = [...answers, optionIndex];
    setAnswers(next);
    if (next.length < QUESTION_COUNT) {
      setStep((s) => s + 1);
      return;
    }
    if (isPlayerTwo && partnerAnswers) {
      setResult(computeMatch(partnerAnswers, next));
      setCountdown(3);
      setPhase("counting");
    } else {
      const base =
        typeof window !== "undefined" ? `${window.location.origin}/tools/blind-match` : `${SITE_URL}/tools/blind-match`;
      setShareLink(`${base}?p1=${encodeURIComponent(encodeAnswers(next))}`);
      setPhase("share");
    }
  };

  const copy = async (text: string, kind: "link" | "result") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const restart = () => {
    setAnswers([]);
    setStep(0);
    setResult(null);
    setShareLink("");
    setPhase("landing");
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", "/tools/blind-match");
    }
  };

  const inviteText = `I just answered 20 honest questions about myself 👀 Now it's your turn — find out how compatible we really are: ${shareLink}`;

  const resultCard = result
    ? [
        "💍 BLIND MATCH RESULTS",
        `⭐ Overall: ${result.overall}% Compatible`,
        `🧠 Values: ${result.values}%`,
        `💬 Communication: ${result.communication}%`,
        `🌙 Lifestyle: ${result.lifestyle}%`,
        `💘 Relationship: ${result.relationship}%`,
        `📍 We both: "${result.biggestMatch.question}"`,
        `⚡ We'd fight about: "${result.biggestDiff.question}"`,
        "skycally.com/tools/blind-match",
      ].join("\n")
    : "";

  const q = BLIND_MATCH_QUESTIONS[step];

  return (
    <ToolPageShell
      title="Blind Match"
      description="Answer 20 honest questions, share one link, and discover how compatible you really are — no accounts, no backend."
      showFileDisclaimer={false}
    >
      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          {/* ── Landing ─────────────────────────────────────── */}
          {phase === "landing" && (
            <motion.section
              key="landing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="relative overflow-hidden rounded-3xl border border-border p-8 sm:p-14 text-center"
              style={{ background: "linear-gradient(160deg, #0b1030 0%, #1b1148 55%, #2d1259 100%)" }}
            >
              <Stars />
              <div className="relative">
                <h2 className="font-display text-4xl sm:text-6xl font-bold text-white tracking-tight">
                  Blind Match 💍
                </h2>
                <p className="mt-5 mx-auto max-w-xl text-base sm:text-lg text-white/75 leading-relaxed">
                  Answer 20 honest questions. Share the link. Discover how compatible you really are — no filters,
                  no hints, just truth.
                </p>
                <button
                  onClick={start}
                  className="mt-9 w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-white text-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6 55%,#22d3ee)", minHeight: 64 }}
                >
                  Start the Match
                </button>
                <p className="mt-5 text-xs uppercase tracking-widest text-white/45">
                  No account. No signup. Works on any device.
                </p>
              </div>
            </motion.section>
          )}

          {/* ── Player 2 invite ─────────────────────────────── */}
          {phase === "invite" && (
            <motion.section
              key="invite"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="relative overflow-hidden rounded-3xl border border-border p-8 sm:p-14 text-center"
              style={{ background: "linear-gradient(160deg, #12082e 0%, #3b1055 60%, #571544 100%)" }}
            >
              <Stars />
              <div className="relative">
                <h2 className="font-display text-3xl sm:text-5xl font-bold text-white">
                  Someone wants to know how compatible you are 💌
                </h2>
                <p className="mt-5 mx-auto max-w-lg text-white/75">
                  They've already answered. You go next — no peeking at their answers!
                </p>
                <button
                  onClick={start}
                  className="mt-9 w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-white text-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6 55%,#22d3ee)", minHeight: 64 }}
                >
                  Answer 20 Questions
                </button>
              </div>
            </motion.section>
          )}

          {/* ── Quiz ────────────────────────────────────────── */}
          {phase === "quiz" && q && (
            <motion.section key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  <span>
                    {DIMENSION_META[q.dimension].emoji} {DIMENSION_META[q.dimension].label}
                  </span>
                  <span>
                    {step + 1} of {QUESTION_COUNT}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6,#22d3ee)" }}
                    animate={{ width: `${((step + 1) / QUESTION_COUNT) * 100}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 leading-snug">{q.question}</h2>
                  <div className="grid gap-3">
                    {q.options.map((opt, i) => (
                      <button
                        key={opt}
                        onClick={() => answer(i)}
                        className="w-full text-left rounded-2xl border border-border bg-card px-5 py-4 text-base font-medium transition-all hover:-translate-y-0.5 hover:border-[var(--cyan-brand)] hover:bg-secondary/60"
                        style={{ minHeight: 64 }}
                      >
                        <span className="mr-3 text-xs font-bold text-muted-foreground">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-muted-foreground">
                    Answers are final — go with your first instinct.
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}

          {/* ── Share your match ────────────────────────────── */}
          {phase === "share" && (
            <motion.section
              key="share"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-3xl border border-border bg-card p-6 sm:p-10 text-center"
            >
              <Lock className="w-8 h-8 mx-auto text-[var(--cyan-brand)]" aria-hidden />
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-4">Your answers are locked in 🔐</h2>
              <p className="mt-3 text-muted-foreground">
                Send this link to your match. They answer the same 20 questions — then the reveal happens on their
                screen.
              </p>

              <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-left">
                <p className="font-mono text-xs break-all text-muted-foreground">{shareLink}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button onClick={() => copy(shareLink, "link")} className="h-14 text-base">
                  {copied === "link" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied === "link" ? "Copied!" : "Copy Link"}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-14 rounded-xl bg-[#25D366] text-black font-semibold text-base transition-transform hover:scale-[1.02]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Share via WhatsApp
                </a>
              </div>

              <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Heads up: since this runs with no backend, you'll see their reveal only if they send it back to you —
                share your result card with them once your match finishes.
              </p>

              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Sparkles className="w-4 h-4" aria-hidden /> Waiting for your match...
              </motion.div>

              <div className="mt-8">
                <button onClick={restart} className="text-sm text-muted-foreground hover:text-foreground underline">
                  Start over
                </button>
              </div>
            </motion.section>
          )}

          {/* ── Countdown ───────────────────────────────────── */}
          {phase === "counting" && (
            <motion.section
              key="counting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-border p-14 text-center"
              style={{ background: "linear-gradient(160deg,#0b1030,#2d1259)" }}
            >
              <p className="text-white/80 text-lg">Calculating your match... 💫</p>
              <motion.div
                key={countdown}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 font-display text-7xl font-bold text-white"
              >
                {countdown > 0 ? countdown : ""}
              </motion.div>
            </motion.section>
          )}

          {/* ── Reveal ──────────────────────────────────────── */}
          {phase === "reveal" && result && (
            <Reveal
              key="reveal"
              result={result}
              resultCard={resultCard}
              copied={copied === "result"}
              onCopy={() => copy(resultCard, "result")}
              onRestart={restart}
            />
          )}
        </AnimatePresence>
      </div>

      <p className="mt-12 text-sm text-muted-foreground leading-relaxed">
        Curious about your relationship patterns? Take the{" "}
        <Link to="/tools/attachment-style-test" className="text-[var(--cyan-brand)] hover:underline">
          Attachment Style Test
        </Link>
        . Want more couples games? Try{" "}
        <Link to="/tools/red-flag-green-flag" className="text-[var(--cyan-brand)] hover:underline">
          Red Flag / Green Flag
        </Link>{" "}
        or the{" "}
        <Link to="/tools/ick-test" className="text-[var(--cyan-brand)] hover:underline">
          Ick Test
        </Link>{" "}
        to compare your tolerance scores.
      </p>

      <AdZone id="blind-match-mid" size="728x90" />

      <HowToUse
        steps={[
          "Answer 20 honest questions about your values, communication, lifestyle and relationship style.",
          "Copy your private link and send it to your match on WhatsApp or anywhere else.",
          "They answer the same questions and the compatibility reveal appears on their screen — ask them to send the result card back.",
        ]}
      />

      <ToolSeoContent
        title="Blind Match — Compatibility Test You Share With Anyone | Skycally"
        description="A free, anonymous compatibility test for couples inspired by Married at First Sight. Answer 20 questions, share one link, and get a relationship compatibility score across values, communication, lifestyle and relationship style — no accounts, no backend, nothing stored."
        body={[
          "Blind Match is a relationship compatibility quiz built around a simple idea: two people answer the exact same 20 questions independently, and only afterwards do they see how their answers line up. Nobody gets to peek and adjust. The first player answers, gets a link, and sends it over. The second player answers the identical set of questions with no idea what was chosen before them, and the reveal happens once they finish.",
          "The 20 questions are split evenly across four dimensions: Values (how you spend time and money, punctuality, how you handle conflict), Communication (texting style, love language, what you need when you're upset), Lifestyle (sleep schedule, home style, fitness, food) and Relationship (jealousy, alone time, pace, deal-breakers). Each answer sits on a four-point scale, so compatibility is measured by distance rather than a plain match or miss — identical answers score 100%, neighbouring answers score 67%, and opposite ends score 0%.",
          "Everything runs in your browser. Your answers are encoded directly into the share link, so there is no database, no account and no server storing anything about you. That also means the reveal appears on the second person's device — if you were the one who sent the link, just ask them to copy the result card back to you. It takes one tap with the Copy Result or WhatsApp buttons.",
          "Treat the score the way the show does: entertainment with a grain of truth. A 90% match doesn't guarantee anything, and a low score doesn't say anything is wrong with either person — it usually just means this specific set of 20 questions caught two different styles. The most useful part is often the last two lines: where you matched most and where you'd clash, both of which make excellent conversation starters.",
        ]}
        faqs={[
          {
            question: "How does the compatibility score work?",
            answer:
              "Each question has four options arranged on a scale. For every question we measure the distance between your two answers: identical is 100%, one step apart is 67%, two steps is 33% and opposite ends is 0%. Each of the four dimensions averages its five questions, and the overall score is the average of the four dimensions.",
          },
          {
            question: "Can my match see my answers before they answer?",
            answer:
              "No. Player 2 only sees the questions while answering. The comparison — including which answers each person picked — is shown only after they have submitted all 20 answers.",
          },
          {
            question: "Do I need an account or app?",
            answer:
              "No. There is no signup, no email and no app. The quiz runs entirely in your browser and the answers travel inside the share link itself.",
          },
          {
            question: "Where are my answers stored?",
            answer:
              "Nowhere. There is no backend. Your answers are encoded into the URL you share and are never sent to a server or saved on our side.",
          },
          {
            question: "Why don't I see the result if I sent the link?",
            answer:
              "Because there is no server relaying anything back to you, the reveal appears on your match's screen when they finish. They can tap Copy Result or the WhatsApp button to send the result card straight back to you.",
          },
          {
            question: "Is this a real compatibility test?",
            answer:
              "It is a light, entertainment-first quiz inspired by shows like Married at First Sight. The dimensions are drawn from things couples genuinely negotiate — values, communication, lifestyle and relationship expectations — but it is not a clinical or scientific assessment.",
          },
          {
            question: "Can I use it with a friend instead of a partner?",
            answer:
              "Absolutely. Friends, roommates, siblings and coworkers all get interesting results, especially on the Lifestyle and Communication dimensions.",
          },
          {
            question: "Can we retake it?",
            answer:
              "Yes, as many times as you like. Tap 'Try with someone else' to start a fresh round and generate a new link. Nothing carries over between rounds.",
          },
        ]}
      />

      <RelatedTools currentSlug="blind-match" />
    </ToolPageShell>
  );
}

/* ── Reveal screen ─────────────────────────────────────────── */

function Reveal({
  result,
  resultCard,
  copied,
  onCopy,
  onRestart,
}: {
  result: MatchResult;
  resultCard: string;
  copied: boolean;
  onCopy: () => void;
  onRestart: () => void;
}) {
  const tier = tierFor(result.overall);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setShown(Math.round(result.overall * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.overall]);

  const scoreColor = result.overall >= 80 ? "#34d399" : result.overall >= 60 ? "#facc15" : "#fb7185";
  const dims = [
    { key: "values", value: result.values },
    { key: "communication", value: result.communication },
    { key: "lifestyle", value: result.lifestyle },
    { key: "relationship", value: result.relationship },
  ] as const;

  const shareText = `${resultCard}`;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-border p-6 sm:p-10"
      style={{ background: "linear-gradient(160deg,#0b1030 0%,#2a1152 55%,#4a1447 100%)" }}
    >
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Your compatibility</p>
        <div className="font-display font-bold leading-none mt-3 text-[64px] sm:text-[104px]" style={{ color: scoreColor }}>
          {shown}%
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">{tier.label}</h2>
        <p className="mt-2 text-white/70">{tier.blurb}</p>
      </div>

      <div className="mt-9 space-y-4">
        {dims.map(({ key, value }) => {
          const meta = DIMENSION_META[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-sm text-white/85 mb-1.5">
                <span>
                  {meta.emoji} {meta.label}
                </span>
                <span className="font-semibold tabular-nums">{value}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: meta.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.9, delay: 0.2 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
            Where You're Most Compatible
          </p>
          <p className="mt-2 text-white font-medium">{result.biggestMatch.question}</p>
          <p className="mt-2 text-sm text-white/65">
            You: {result.biggestMatch.answerA}
            <br />
            Them: {result.biggestMatch.answerB}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Where You'd Clash</p>
          <p className="mt-2 text-white font-medium">{result.biggestDiff.question}</p>
          <p className="mt-2 text-sm text-white/65">
            You: {result.biggestDiff.answerA}
            <br />
            Them: {result.biggestDiff.answerB}
          </p>
          <p className="mt-3 text-xs text-white/50">
            Fun one to talk through over coffee — different answers here, nothing more.
          </p>
        </div>
      </div>

      {/* Screenshot-friendly card */}
      <div
        className="mt-9 rounded-2xl p-5 sm:p-6 font-mono text-[13px] sm:text-sm leading-relaxed text-amber-50 whitespace-pre-wrap break-words"
        style={{ background: "#0a0a12", border: "2px solid #d4af37" }}
      >
        {resultCard}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button onClick={onCopy} className="h-14 text-base">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? "Copied!" : "Copy Result"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-14 rounded-xl bg-[#25D366] text-black font-semibold text-base transition-transform hover:scale-[1.02]"
        >
          <MessageCircle className="w-4 h-4 mr-2" /> Share on WhatsApp
        </a>
        <button
          onClick={onRestart}
          className="inline-flex items-center justify-center h-14 rounded-xl border border-white/20 text-white font-semibold text-base hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Try with someone else
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-white/45">
        <Gem className="w-3 h-3 inline mr-1" aria-hidden /> Just for fun — a 20-question snapshot, not a verdict on
        anyone.
      </p>
    </motion.section>
  );
}

/* Subtle star field for the dark hero screens. */
function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        top: (i * 61) % 100,
        size: (i % 3) + 1,
        delay: (i % 7) * 0.4,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.15, 0.8, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  );
}
