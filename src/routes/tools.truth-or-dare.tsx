import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useState } from "react";
import { Flame, Skull, Plus, Trash2, RefreshCw, Settings2, ChevronDown } from "lucide-react";
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

// SEO NOTE: Search Console shows this page already ranks reasonably (avg
// position 15.72, 127 clicks / 2,791 impressions over 3 months) — but the
// query breakdown reveals a clear pattern: "spin"/"spinner" phrasings
// already rank well ("truth or dare online spin" pos 6.9, "web truth or
// dare spin" pos 7.77, "online truth and dare spinner" pos 7.53), while
// "generator"/"randomizer" phrasings rank poorly ("truth or dare generator"
// pos 26.4, "truth or dare randomizer" pos 29.45, "random truth or dare
// generator" pos 16.52) despite meaningful combined impressions (~300+).
// The previous title/body barely used "spin" at all despite it being the
// tool's actual core mechanic (per tools.ts: "Spin the bottle..."). Title,
// description, body and FAQs below now lean into "spin" explicitly while
// also naturally covering "generator"/"randomizer" wording, since both
// clusters clearly describe the same tool. Not chasing "with strangers"
// phrasing (pos 34-47) — that's a different intent (live matchmaking with
// unknown people) this pass-the-device tool doesn't actually offer, so
// targeting it would be misleading.

export const Route = createFileRoute("/tools/truth-or-dare")({
  head: () => {
    const tool = toolBySlug("truth-or-dare", tools);
    const title = "Truth or Dare Online Spin Generator | Skycally";
    const description =
      "Spin for a random Truth or Dare online, free. 40+ built-in questions and dares, plus a custom randomizer to add your own. No signup, works anywhere.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Truth or Dare",
            alternateName: ["Truth or Dare Online", "Truth or Dare Generator", "Custom Truth or Dare"],
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

const STORAGE_KEY_TRUTHS = "skycally:tod:custom-truths";
const STORAGE_KEY_DARES = "skycally:tod:custom-dares";

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// The 🍾 emoji glyph rests at a natural ~22.5° left-leaning tilt by default.
// We compensate for that at rest so the bottle looks perfectly vertical when
// idle, then let the spin land exactly on that natural tilt for Truth, and
// on the mirrored tilt for Dare — so the two outcomes are always visually
// distinct and consistent, instead of a random angle unrelated to the result.
const RESTING_TILT = 22.5;

function TruthOrDare() {
  const [truthOn, setTruthOn] = useState(true);
  const [dareOn, setDareOn] = useState(true);
  const [current, setCurrent] = useState<{ type: "truth" | "dare"; text: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(RESTING_TILT);
  const [customTruths, setCustomTruths] = useState<string[]>([]);
  const [customDares, setCustomDares] = useState<string[]>([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newTruth, setNewTruth] = useState("");
  const [newDare, setNewDare] = useState("");

  // Load persisted custom truths/dares after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    setCustomTruths(loadList(STORAGE_KEY_TRUTHS));
    setCustomDares(loadList(STORAGE_KEY_DARES));
  }, []);

  const persistTruths = (next: string[]) => {
    setCustomTruths(next);
    try {
      localStorage.setItem(STORAGE_KEY_TRUTHS, JSON.stringify(next));
    } catch {
      /* ignore write failures (private mode) */
    }
  };

  const persistDares = (next: string[]) => {
    setCustomDares(next);
    try {
      localStorage.setItem(STORAGE_KEY_DARES, JSON.stringify(next));
    } catch {
      /* ignore write failures (private mode) */
    }
  };

  const mode: Mode = truthOn && dareOn ? "both" : truthOn ? "truth" : dareOn ? "dare" : "both";

  const spin = () => {
    if (spinning) return;
    if (!truthOn && !dareOn) return;
    setSpinning(true);
    setCurrent(null);

    // Decide the outcome FIRST, then aim the bottle's rotation at it, so the
    // visual landing position and the actual Truth/Dare result always match.
    const type: "truth" | "dare" = mode === "both" ? (Math.random() > 0.5 ? "truth" : "dare") : mode;

    setRotation((r) => {
      const spins = 4 + Math.floor(Math.random() * 3); // 4–6 full turns for the animation
      // Truth lands on the bottle's natural resting tilt (+22.5°, leaning left).
      // Dare lands on the mirrored tilt (2 × 22.5° further, leaning right).
      const target = type === "truth" ? RESTING_TILT : RESTING_TILT + 2 * RESTING_TILT;
      const current360 = ((r % 360) + 360) % 360;
      let delta = target - current360;
      if (delta <= 0) delta += 360;
      return r + spins * 360 + delta;
    });

    setTimeout(() => {
      const truths = useCustomOnly && customTruths.length ? customTruths : [...TRUTHS, ...customTruths];
      const dares = useCustomOnly && customDares.length ? customDares : [...DARES, ...customDares];
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
    persistTruths([...customTruths, t]);
    setNewTruth("");
  };
  const addDare = () => {
    const t = newDare.trim();
    if (!t) return;
    persistDares([...customDares, t]);
    setNewDare("");
  };

  return (
    <ToolPageShell
      showFileDisclaimer={false}
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
              <ChevronDown className={`w-4 h-4 transition-transform ${showCustomize ? "rotate-180" : ""}`} />
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
                      onClick={() => persistTruths(customTruths.filter((_, j) => j !== i))}
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
                      onClick={() => persistDares(customDares.filter((_, j) => j !== i))}
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

      <p className="text-sm text-muted-foreground mt-10">
        Want a different kind of spin for your group? Try the{" "}
        <Link to="/tools/role-spinner" className="text-[var(--cyan-brand)] hover:underline">
          Role Spinner
        </Link>{" "}
        or the general-purpose{" "}
        <Link to="/tools/spinning-wheel" className="text-[var(--cyan-brand)] hover:underline">
          Spinning Wheel
        </Link>
        . Looking for more conversation-starters instead of dares? Check out{" "}
        <Link to="/tools/most-likely-to" className="text-[var(--cyan-brand)] hover:underline">
          Most Likely To
        </Link>{" "}
        or{" "}
        <Link to="/tools/never-have-i-ever" className="text-[var(--cyan-brand)] hover:underline">
          Never Have I Ever
        </Link>
        .
      </p>

      <AdZone id="truth-or-dare-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose Truth, Dare or let it be random.",
          "Hit Spin to get a random challenge.",
          "Complete the challenge or add your own custom questions!",
        ]}
      />

      <ToolSeoContent
        title="Truth or Dare Online Spin Generator — Play with Custom Questions"
        description="Spin for a random Truth or Dare online. This free truth or dare generator and randomizer includes 40+ built-in questions and dares, plus custom mode to add your own. Browser-based, no signup required."
        body={[
          "Skycally's Truth or Dare online spin generator brings the classic party game to any screen. Choose between Truth, Dare, or Mixed mode and hit Spin to land on a random challenge — no bottle needed. With 20 hand-picked truth questions and 20 creative dare challenges built into the randomizer — plus a fully custom mode where you can add your own — every spin stays fresh and personal.",
          "The built-in questions are designed to be fun and appropriate for most groups, ranging from light-hearted ice-breakers to more revealing personal questions. Dare challenges are creative and engaging without being extreme. For groups who want something more personal or tailored, custom mode lets you replace the built-in deck entirely with your own prompts before you spin.",
          "Custom mode is where the game really comes alive. Add questions specific to your friend group, inside jokes, or memories you share, then use the same spin generator to draw from your own list. Switch to custom-only mode to play exclusively with your prompts, or mix them with the built-in deck. All custom questions are saved in your browser's localStorage so they're there next time you play.",
          "Works for sleepovers, road trips, dinner parties, team ice-breakers, first dates, and any social gathering where you want to spark conversation and laughter. No physical cards needed — just open the tool, hit spin, and pass the phone around. Everything runs in your browser with no account required.",
        ]}
        faqs={[
          {
            question: "Is this a truth or dare generator, randomizer, or spinner?",
            answer:
              "All three describe the same tool. Hit Spin and it randomly generates a Truth or Dare challenge from the built-in deck (or your custom list) — whether you search for a 'truth or dare generator,' 'randomizer,' or 'spinner,' this is the tool you're looking for.",
          },
          {
            question: "Can we play together online without meeting in person?",
            answer:
              "Yes. Share your screen on a video call, or open the same custom question set on separate devices, and take turns spinning. It works just as well remotely as it does in person, which is why so many people search for a version they can play 'online' rather than with a physical card deck.",
          },
          {
            question: "How many questions and dares are included?",
            answer:
              "20 built-in truth questions and 20 dare challenges, giving 40 prompts out of the box. You can add unlimited custom questions in custom mode.",
          },
          {
            question: "Can I add my own questions?",
            answer:
              "Yes. Switch to custom mode and add as many of your own truth questions and dare challenges as you like. Custom questions are saved in your browser.",
          },
          {
            question: "Can I play with only truths or only dares?",
            answer: "Yes. Select Truth Only, Dare Only, or Mixed mode using the mode selector before spinning.",
          },
          {
            question: "Are the built-in questions appropriate for all ages?",
            answer:
              "The built-in questions are designed for teens and adults at social gatherings. They're fun and revealing without being explicit. For younger groups, use custom mode with age-appropriate prompts.",
          },
          {
            question: "Are my custom questions saved?",
            answer:
              "Yes. Custom questions are saved in your browser's localStorage and will be there the next time you visit, as long as you haven't cleared your browser data.",
          },
          {
            question: "Can I remove a question I don't like?",
            answer: "Yes. In custom mode, you can remove any question from your deck at any time.",
          },
          {
            question: "How many players can play?",
            answer:
              "Any number. Pass the device around — each player taps to reveal their challenge. There's no player limit.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The interface is touch-friendly and works on smartphones and tablets, making it easy to pass around at a party.",
          },
        ]}
      />

      <RelatedTools currentSlug="truth-or-dare" />
    </ToolPageShell>
  );
}
