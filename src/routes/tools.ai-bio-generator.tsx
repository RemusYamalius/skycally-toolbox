import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  AlertCircle,
  UserRound,
  Instagram,
  Music2,
  Twitter,
  Linkedin,
  Heart,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { generateBios, PLATFORM_LIMITS } from "@/lib/ai-bio-generator.functions";
import { platformLength } from "@/lib/fancy-text/styles";

export const Route = createFileRoute("/tools/ai-bio-generator")({
  head: () => buildToolMeta(toolBySlug("ai-bio-generator", tools)),
  component: AiBioGenerator,
});

type Platform = "instagram" | "tiktok" | "twitter" | "linkedin" | "dating";
type Tone = "funny" | "professional" | "minimalist" | "aesthetic" | "bold";
type EmojiDensity = "none" | "light" | "heavy";

interface FormState {
  platform: Platform;
  name: string;
  role: string;
  interests: string;
  tone: Tone;
  emojiDensity: EmojiDensity;
  variations: 3 | 4 | 5;
}

const DEFAULTS: FormState = {
  platform: "instagram",
  name: "",
  role: "",
  interests: "",
  tone: "professional",
  emojiDensity: "light",
  variations: 4,
};

const STORAGE_KEY = "ai-bio-generator-inputs";
const DEBOUNCE_MS = 500;

const PLATFORMS: Array<{
  id: Platform;
  label: string;
  Icon: typeof Instagram;
  hint: string;
}> = [
  {
    id: "instagram",
    label: "Instagram",
    Icon: Instagram,
    hint: "3–5 short lines, an emoji per line",
  },
  { id: "tiktok", label: "TikTok", Icon: Music2, hint: "2–3 punchy short lines" },
  { id: "twitter", label: "X (Twitter)", Icon: Twitter, hint: "One line, phrases split by · or |" },
  {
    id: "linkedin",
    label: "LinkedIn About",
    Icon: Linkedin,
    hint: "First-person paragraph, professional",
  },
  { id: "dating", label: "Dating", Icon: Heart, hint: "Conversational, ends with a hook" },
];

function errorToMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMITED") return "Too many requests — please wait a moment and try again.";
  if (msg === "CREDITS_EXHAUSTED") return "AI credits exhausted — please try again later.";
  return "Something went wrong — please try again.";
}

const SEO_BODY = [
  "The AI Bio Generator writes short, personal bios for the profiles people actually use every day — Instagram, TikTok, X (Twitter), LinkedIn About, and dating apps. Unlike our AI Cover Letter Generator, AI Resume Builder and AI Email Writer, which are built for job hunting and professional correspondence, this tool is for the personal side of your online presence: the little slice of text at the top of a profile that tells the world who you are. Give it your role, a few real interests, a tone, and it generates several complete variations you can pick from — free, no signup, no daily cap.",
  "Character limits on social platforms are counted in UTF-16 code units, not visible characters, and this is where most bio generators quietly fail. A single emoji can cost 2 units even though it looks like one character, and many decorative Unicode letters (the kind fancy-text tools produce) cost 2 units per letter as well. This tool shows you the exact platform limit for whichever profile you're writing for — Instagram ~150, TikTok ~80, X ~160, LinkedIn ~2600, dating apps around 500 — and counts every generated variation the same way the platform will, so what fits here really fits when you paste it in.",
  "The output quality depends on the specificity of your inputs. A role like \"designer\" produces generic filler; \"product designer at a fintech startup, mostly mobile\" gives the AI something real to work with. The same goes for interests: \"travel, coffee, music\" is weak; \"third-wave espresso, mountain trail running, lo-fi beats\" is specific enough that the bio can actually reference those things instead of listing hobbies. Pair specific inputs with the right tone (funny, professional, minimalist, aesthetic, or bold) and an emoji density that matches the platform's culture.",
  "This tool is completely free with no signup, no email capture, no credit system, and no daily generation cap. Most competitors — Copy.ai, Later, Simplified and similar — either gate output behind an account or throttle free users after a few generations. Skycally's bio generator gives you full-length results every single time. Regenerate as many times as you want until a variation feels right, then copy it with one click. Your inputs are used only to produce the bios and are never stored on our servers.",
];

const SEO_FAQS = [
  {
    question: "What is an AI bio generator?",
    answer:
      "An AI bio generator writes short profile bios for social and dating apps based on the details you provide — your role, interests, preferred tone and platform. Instead of staring at a blank profile field, you describe yourself in a few inputs and get several polished bios to choose from.",
  },
  {
    question: "Which platforms does this support?",
    answer:
      "Instagram (~150 characters), TikTok (~80), X / Twitter (~160), LinkedIn About (~2600), and dating apps like Hinge, Bumble and Tinder (~500). Each platform uses its own typical structure — Instagram bios use short lines with emoji, X bios are single-line with separators, LinkedIn is a first-person paragraph, dating bios are conversational.",
  },
  {
    question: "Is this really free with no signup?",
    answer:
      "Yes. Completely free, no account required, no email capture, no credit system, no daily generation cap. Generate as many bios as you want. Every tool on Skycally works this way.",
  },
  {
    question: "Does it account for character limits accurately?",
    answer:
      "Yes. Character counts use UTF-16 code units, the same way Instagram, TikTok and X count against their limits — so emoji and certain decorative Unicode characters count as 2, not 1. A variation that displays as short can still be over the limit; the counter next to each result flags this so nothing gets silently truncated when you paste it in.",
  },
  {
    question: "Can I regenerate if I don't like the results?",
    answer:
      "Yes. Hit Regenerate as many times as you want — each run produces a fresh batch from the same inputs. There is no daily limit and no throttling.",
  },
  {
    question: "What tone options are available?",
    answer:
      "Funny, Professional, Minimalist, Aesthetic (poetic), and Bold / Confident. Pick the one that matches how you want the profile to feel — the AI adjusts word choice, rhythm, and structure to match, not just word swaps.",
  },
  {
    question: "Should I include emoji in my bio?",
    answer:
      "Instagram and TikTok bios almost always use emoji — they add visual rhythm and communicate a lot in little space. LinkedIn About sections rarely use emoji. Dating bios use a few, usually sprinkled naturally. Use the Emoji Density selector (None / Light / Heavy) to match platform norms.",
  },
  {
    question: "Is my information stored?",
    answer:
      "No. Your inputs are sent to the AI to generate the bios and are not persisted on our servers or used for training. Nothing you type here is stored beyond the request that produces your bios.",
  },
];

function AiBioGenerator() {
  const tool = toolBySlug("ai-bio-generator", tools);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [bios, setBios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const lastSubmitRef = useRef<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.role.trim().length > 0 && form.interests.trim().length > 0 && !loading;

  const canSubmitRef = useRef(canSubmit);
  canSubmitRef.current = canSubmit;
  const formRef = useRef(form);
  formRef.current = form;

  async function submit() {
    if (!canSubmitRef.current) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
    lastSubmitRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const f = formRef.current;
      const result = await generateBios({
        data: {
          platform: f.platform,
          name: f.name.trim(),
          role: f.role.trim(),
          interests: f.interests.trim(),
          tone: f.tone,
          emojiDensity: f.emojiDensity,
          variations: f.variations,
        },
      });
      setBios(result.bios);
    } catch (err) {
      setError(errorToMessage(err));
      setBios([]);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  function copy(text: string, idx: number) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
      })
      .catch(() => {
        /* ignore */
      });
  }

  const limit = PLATFORM_LIMITS[form.platform];
  const activePlatform = useMemo(
    () => PLATFORMS.find((p) => p.id === form.platform)!,
    [form.platform],
  );

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      {/* Platform selector */}
      <div className="mb-6">
        <Label className="mb-3 block text-sm">Platform</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PLATFORMS.map(({ id, label, Icon }) => {
            const active = form.platform === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => update("platform", id)}
                aria-pressed={active}
                aria-label={label}
                className={
                  "text-left rounded-xl border p-3 transition-colors " +
                  (active
                    ? "border-transparent bg-secondary/70 ring-2 ring-[color:var(--cyan-brand)]"
                    : "border-border bg-card hover:border-foreground/20")
                }
                style={
                  active
                    ? {
                        background:
                          "color-mix(in oklch, var(--cyan-brand) 12%, var(--card))",
                      }
                    : undefined
                }
              >
                <Icon
                  className="h-5 w-5 mb-2"
                  style={{ color: active ? "var(--cyan-brand)" : undefined }}
                  aria-hidden="true"
                />
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">
                  ~{PLATFORM_LIMITS[id]} chars
                </div>
              </motion.button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <strong>{activePlatform.label} convention:</strong> {activePlatform.hint}. Limit:{" "}
          {limit} characters (UTF-16, so emoji count as 2).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
          aria-busy={loading}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{
                background: "color-mix(in oklch, var(--cyan-brand) 18%, transparent)",
              }}
              aria-hidden="true"
            >
              <UserRound className="h-5 w-5" style={{ color: "var(--cyan-brand)" }} />
            </div>
            <h2 className="font-display text-lg font-semibold">Your bio details</h2>
          </div>

          <fieldset disabled={loading} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name or handle (optional)</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Alex or @alexcodes"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">
                Role — what you do <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="role"
                required
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                placeholder="Product designer at a fintech startup, mostly mobile"
                rows={2}
                maxLength={240}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interests">
                Interests / keywords (3–5) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="interests"
                required
                value={form.interests}
                onChange={(e) => update("interests", e.target.value)}
                placeholder="third-wave espresso, mountain trail running, lo-fi beats, cats"
                rows={2}
                maxLength={400}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value as Tone)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="funny">Funny</option>
                  <option value="professional">Professional</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="aesthetic">Aesthetic / Poetic</option>
                  <option value="bold">Bold / Confident</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emoji">Emoji density</Label>
                <select
                  id="emoji"
                  value={form.emojiDensity}
                  onChange={(e) => update("emojiDensity", e.target.value as EmojiDensity)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block">Number of variations</Label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("variations", n as 3 | 4 | 5)}
                    aria-pressed={form.variations === n}
                    className={
                      "rounded-md border px-3 py-2 text-xs transition-colors " +
                      (form.variations === n
                        ? "border-transparent bg-secondary ring-1 ring-[color:var(--cyan-brand)]"
                        : "border-border hover:border-foreground/20")
                    }
                  >
                    {n} bios
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={!canSubmit} className="min-h-11">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generate bios
                </>
              )}
            </Button>
            {bios.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void submit()}
                disabled={loading}
                className="min-h-11"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Regenerate
              </Button>
            )}
          </div>
        </motion.form>

        {/* Results */}
        <section
          aria-live="polite"
          aria-busy={loading}
          aria-label="Generated bios"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 min-h-[320px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Your bios</h2>
            {bios.length > 0 && !loading && (
              <span className="text-xs text-muted-foreground">
                {bios.length} variations · limit {limit}
              </span>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="space-y-3" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md border border-border p-3 animate-pulse">
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-9/12 mb-2" />
                  <div className="h-3 bg-muted rounded w-7/12" />
                </div>
              ))}
            </div>
          )}

          {!loading && bios.length > 0 && (
            <ul className="space-y-3">
              {bios.map((bio, i) => {
                const len = platformLength(bio);
                const over = len > limit;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="rounded-lg border border-border bg-background/40 p-3"
                  >
                    <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {bio}
                    </article>
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={
                          "text-xs px-2 py-0.5 rounded-full border " +
                          (over
                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                            : "border-border bg-secondary/60 text-muted-foreground")
                        }
                        aria-label={
                          over
                            ? `Over limit by ${len - limit} characters`
                            : `${len} of ${limit} characters used`
                        }
                      >
                        {len} / {limit}
                        {over ? ` · over by ${len - limit}` : ""}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copy(bio, i)}
                        aria-label={`Copy bio ${i + 1}`}
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        {copiedIdx === i ? "Copied ✓" : "Copy"}
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}

          {!loading && bios.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              Pick a platform, describe what you do, add a few real interests, and click{" "}
              <strong>Generate bios</strong>. Several variations will appear here — each with a
              live character count against the platform's real limit.
            </p>
          )}

          {bios.length > 0 && !loading && (
            <p className="mt-4 text-xs text-muted-foreground/60 text-right inline-flex items-center gap-1 justify-end">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Generated by AI
            </p>
          )}
        </section>
      </div>

      {/* Contextual internal links — placed directly under results, above AdZone / HowToUse / SEO */}
      {bios.length > 0 && !loading && (
        <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
          <p>
            Happy with a variation? Style your new bio with decorative Unicode text before you post
            it using the{" "}
            <Link
              to="/tools/fancy-text-generator"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Fancy Text Generator
            </Link>
            .
          </p>
          <p>
            Want to polish the wording or grammar-check it first? Run it through the{" "}
            <Link
              to="/tools/ai-writing-assistant"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              AI Writing Assistant
            </Link>
            . Posting somewhere with a different limit? Double-check length in the{" "}
            <Link
              to="/tools/word-counter"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Word Counter
            </Link>
            .
          </p>
        </section>
      )}

      <AdZone id="ai-bio-generator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick the platform you're writing a bio for — Instagram, TikTok, X, LinkedIn or a dating app.",
          "Describe what you do and add 3–5 real interests. The more specific, the better.",
          "Choose a tone and emoji density, generate, then copy the variation you like best.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Bio Generator — Instagram, TikTok, X, LinkedIn & Dating"
        description="Generate short, personal bios for Instagram, TikTok, X (Twitter), LinkedIn and dating apps. Accurate platform character limits, multiple variations, free with no signup and no credit limits."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <RelatedTools currentSlug="ai-bio-generator" />
    </ToolPageShell>
  );
}
