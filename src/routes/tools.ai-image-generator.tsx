import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Dice5,
  Wand2,
  Download,
  Copy,
  RefreshCw,
  Settings2,
  AlertCircle,
  Loader2,
  Check,
  ImagePlus,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/ai-image-generator")({
  head: () => buildToolMeta(toolBySlug("ai-image-generator", tools)),
  component: AiImageGeneratorPage,
});

// ─── Constants ────────────────────────────────────────────────────────────
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "draft" | "standard" | "high";

interface StylePreset {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: "none", label: "No style", emoji: "✨", prompt: "" },
  {
    id: "photorealistic",
    label: "Photorealistic",
    emoji: "📷",
    prompt: "photorealistic, 8k, DSLR, sharp focus, natural lighting",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    emoji: "🎬",
    prompt: "cinematic, movie still, dramatic lighting, anamorphic lens, film grain",
  },
  { id: "anime", label: "Anime", emoji: "⛩️", prompt: "anime style, manga, Studio Ghibli inspired, cel shading" },
  {
    id: "oil-painting",
    label: "Oil Painting",
    emoji: "🖼️",
    prompt: "oil painting, classical art, museum quality, rich textures, Renaissance style",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    emoji: "🎨",
    prompt: "watercolor painting, soft edges, flowing colors, artistic",
  },
  { id: "pixel-art", label: "Pixel Art", emoji: "👾", prompt: "pixel art, 16-bit, retro game style, crisp pixels" },
  {
    id: "3d-render",
    label: "3D Render",
    emoji: "💎",
    prompt: "3D render, octane render, volumetric lighting, subsurface scattering",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    emoji: "🌆",
    prompt: "cyberpunk, neon lights, futuristic city, blade runner aesthetic, rain",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    emoji: "🐉",
    prompt: "fantasy art, magical, epic, detailed, digital painting, artstation",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    emoji: "⬜",
    prompt: "minimalist, clean, simple, geometric, flat design, white background",
  },
  {
    id: "vintage",
    label: "Vintage",
    emoji: "📻",
    prompt: "vintage, retro, 1970s aesthetic, film photography, faded colors, grain",
  },
  {
    id: "sketch",
    label: "Pencil Sketch",
    emoji: "✏️",
    prompt: "pencil sketch, hand drawn, graphite, detailed linework, black and white",
  },
  {
    id: "neon",
    label: "Neon Art",
    emoji: "💜",
    prompt: "neon art, glowing, dark background, electric colors, synthwave",
  },
  {
    id: "logo",
    label: "Logo / Icon",
    emoji: "🔷",
    prompt: "logo design, vector style, clean, professional, minimal, isolated on white",
  },
];

const RANDOM_PROMPTS = [
  "A majestic dragon perched on a mountain peak at sunset, scales gleaming gold",
  "Cyberpunk Tokyo street at night, neon reflections on wet pavement, rain",
  "Cozy coffee shop interior in autumn, warm lighting, books everywhere",
  "An astronaut floating in space holding a bouquet of wildflowers",
  "Ancient library with floating books and magical glowing orbs",
  "A tiny house on a giant mushroom in an enchanted forest",
  "Futuristic city built inside a giant transparent biodome on Mars",
  "A samurai standing in a bamboo forest during cherry blossom season",
  "Deep ocean bioluminescent creatures in an alien underwater world",
  "Art deco poster of a 1920s jazz club in New Orleans",
  "A fox wearing a Victorian suit reading a newspaper in a garden",
  "Northern lights over a frozen lake with a lone cabin",
  "Steampunk airship fleet sailing through golden clouds at dusk",
  "A portal opening in a medieval village revealing a futuristic city",
  "Macro photograph of a dewdrop containing a miniature forest",
  "A lighthouse on a stormy cliff with waves crashing, moody lighting",
  "Fluffy corgi wearing tiny sunglasses on a tropical beach at sunset",
  "Vintage typewriter on a wooden desk with soft window light and coffee",
  "A giant whale swimming through clouds above a peaceful village",
  "Old bookstore with a spiral staircase and warm amber lighting",
  "Bioluminescent mushroom forest at midnight, glowing blue and purple",
  "A knight in ornate armor standing before a huge stained glass window",
  "Rooftop garden in a futuristic Singapore skyline at golden hour",
  "A tiny origami paper crane flying over a rain-soaked city street",
  "Snowy mountain village at Christmas, warm windows glowing, gentle snowfall",
  "A cat wizard casting spells in a candle-lit alchemist's workshop",
  "Abandoned space station reclaimed by lush alien vegetation",
  "Retro diner interior in the 1950s, chrome details, neon signs",
  "A phoenix rising from ashes, embers swirling, dramatic dark background",
  "Watercolor painting of a Parisian café in spring, cherry blossoms",
  "Explorer standing at the edge of a giant crystal cave with a lantern",
  "A robot tending to a small vegetable garden on a rooftop",
  "Foggy Scottish highlands with a lone stag at sunrise",
  "A hot air balloon floating above patchwork countryside at dawn",
  "Underwater cathedral with fish swimming through broken stained glass",
  "A tiny space explorer sitting on a crescent moon fishing for stars",
  "Ancient temple overgrown by jungle, sunbeams cutting through mist",
  "Steampunk clockmaker's workshop filled with brass gears and springs",
  "A wolf howling on a snowy peak under a massive full moon",
  "Sunset over the Sahara desert with a caravan of camels silhouetted",
  "Fairy tale cottage covered in ivy and roses, glowing lanterns at dusk",
  "Neo-Tokyo skyline reflected on a rain-soaked highway at 3 a.m.",
  "A cozy reading nook by a huge window during a thunderstorm",
  "Abstract portrait made entirely of flowing liquid gold and silver",
  "A koi pond in a Zen garden with cherry blossoms falling on the water",
  "Vintage 1960s car parked on a Route 66 diner at dusk, neon glow",
  "A hummingbird frozen mid-flight next to a hibiscus, macro detail",
  "Enormous library carved inside a giant hollow tree, spiral floors",
  "Girl with an umbrella walking across a bridge of glowing lanterns",
  "A dragon and a knight sharing tea in a cozy medieval kitchen",
];

interface AspectOption {
  id: AspectRatio;
  icon: typeof Square;
  ratio: number; // width / height
}

const ASPECTS: AspectOption[] = [
  { id: "1:1", icon: Square, ratio: 1 },
  { id: "16:9", icon: RectangleHorizontal, ratio: 16 / 9 },
  { id: "9:16", icon: RectangleVertical, ratio: 9 / 16 },
  { id: "4:3", icon: RectangleHorizontal, ratio: 4 / 3 },
  { id: "3:4", icon: RectangleVertical, ratio: 3 / 4 },
];

interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  fullPrompt: string;
  aspectRatio: AspectRatio;
}

const EXAMPLES = [
  { prompt: "A majestic dragon perched on a mountain peak at sunset, scales gleaming gold", seed: 1011 },
  { prompt: "Cyberpunk Tokyo street at night, neon reflections on wet pavement, rain", seed: 1027 },
  { prompt: "Cozy coffee shop interior in autumn, warm lighting, books everywhere", seed: 1043 },
  { prompt: "Ancient library with floating books and magical glowing orbs", seed: 1064 },
  { prompt: "Northern lights over a frozen lake with a lone cabin", seed: 1084 },
  { prompt: "Steampunk airship fleet sailing through golden clouds at dusk", seed: 1074 },
];

const ERROR_COPY: Record<string, string> = {
  RATE_LIMITED: "Too many requests right now — please wait a moment and try again.",
  GENERATION_FAILED: "Generation failed — try a different prompt or style.",
};

// ─── Pollinations.ai helpers ────────────────────────────────────────────
// Free, keyless, called directly from the browser — no server, no signup,
// nothing to hide. If this site ever needs higher throughput, get a free
// "publishable" key at https://enter.pollinations.ai and append
// `&key=pk_xxx` to the two URLs below — everything else stays the same.
const POLLINATIONS_IMAGE = "https://image.pollinations.ai/prompt";
const POLLINATIONS_TEXT = "https://gen.pollinations.ai/text";

// Pollinations takes width/height rather than a named aspect ratio, so we
// derive pixel dimensions from the ratio + a quality-driven target size.
const QUALITY_BASE_PX: Record<Quality, number> = {
  draft: 512,
  standard: 768,
  high: 1024,
};

function dimensionsFor(aspect: AspectOption, quality: Quality): { width: number; height: number } {
  const base = QUALITY_BASE_PX[quality];
  const round8 = (n: number) => Math.round(n / 8) * 8;
  if (aspect.ratio >= 1) {
    return { width: round8(base * aspect.ratio), height: round8(base) };
  }
  return { width: round8(base), height: round8(base / aspect.ratio) };
}

function buildImageUrl(params: {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
}): string {
  const search = new URLSearchParams({
    width: String(params.width),
    height: String(params.height),
    seed: String(params.seed),
    nologo: "true",
    model: "flux",
  });
  if (params.negativePrompt) search.set("negative_prompt", params.negativePrompt);
  return `${POLLINATIONS_IMAGE}/${encodeURIComponent(params.prompt)}?${search.toString()}`;
}

async function enhancePromptWithPollinations(original: string): Promise<string> {
  const instruction =
    `Rewrite this into one detailed, vivid AI image generation prompt. ` +
    `Add lighting, mood, composition and quality descriptors. ` +
    `Reply with ONLY the rewritten prompt, no quotes, no explanation: ${original}`;
  const res = await fetch(`${POLLINATIONS_TEXT}/${encodeURIComponent(instruction)}`);
  if (!res.ok) throw new Error("GENERATION_FAILED");
  const text = (await res.text()).trim();
  return text.length > 0 ? text : original;
}

// ─── Component ────────────────────────────────────────────────────────────
function AiImageGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [styleId, setStyleId] = useState("none");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("standard");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [current, setCurrent] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const originalPromptRef = useRef<string | null>(null);

  const selectedStyle = useMemo(() => STYLE_PRESETS.find((s) => s.id === styleId) ?? STYLE_PRESETS[0], [styleId]);
  const selectedAspect = useMemo(() => ASPECTS.find((a) => a.id === aspectRatio) ?? ASPECTS[0], [aspectRatio]);

  const onRandom = () => {
    const next = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(next);
    originalPromptRef.current = null;
  };

  function onEnhance() {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setError(null);
    const original = prompt;
    enhancePromptWithPollinations(original)
      .then((enhanced) => {
        originalPromptRef.current = original;
        setPrompt(enhanced);
      })
      .catch(() => {
        // silent fallback — keep original
      })
      .finally(() => {
        setEnhancing(false);
      });
  }

  const onUndoEnhance = () => {
    if (originalPromptRef.current != null) {
      setPrompt(originalPromptRef.current);
      originalPromptRef.current = null;
    }
  };

  function onGenerate() {
    const clean = prompt.trim();
    if (clean.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    const fullPrompt = selectedStyle.prompt ? `${clean}, ${selectedStyle.prompt}` : clean;
    const { width, height } = dimensionsFor(selectedAspect, quality);
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = buildImageUrl({
      prompt: fullPrompt,
      negativePrompt: negativePrompt.trim(),
      width,
      height,
      seed,
    });

    fetch(url)
      .then((res) => {
        if (res.status === 429) throw new Error("RATE_LIMITED");
        if (!res.ok) throw new Error("GENERATION_FAILED");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const item: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          imageUrl: objectUrl,
          prompt: clean,
          fullPrompt,
          aspectRatio,
        };
        setCurrent(item);
        setHistory((prev) => [item, ...prev].slice(0, 8));
      })
      .catch((err) => {
        console.error("[ai-image-generator] Pollinations generation failed:", err);
        const code = err instanceof Error ? err.message : "GENERATION_FAILED";
        setError(ERROR_COPY[code] ?? ERROR_COPY.GENERATION_FAILED);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  function onDownload() {
    if (!current) return;
    fetch(current.imageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `skycally-ai-${Date.now()}.webp`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(() => {
        setError(ERROR_COPY.GENERATION_FAILED);
      });
  }

  function onCopyPrompt() {
    if (!current) return;
    navigator.clipboard
      .writeText(current.fullPrompt)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* noop */
      });
  }

  const onVariations = () => {
    if (!current || busy) return;
    onGenerate();
  };

  const onExampleClick = (p: string) => {
    setPrompt(p);
    originalPromptRef.current = null;
  };

  const onHistoryClick = (item: HistoryItem) => {
    setCurrent(item);
    setPrompt(item.prompt);
  };

  const canGenerate = prompt.trim().length >= 3 && !busy;

  const aspectPaddingPct = `${(1 / selectedAspect.ratio) * 100}%`;

  return (
    <ToolPageShell
      title="AI Image Generator"
      description="Free AI image generator — create stunning images from text in seconds. No signup, no limits, no watermark. Powered by Flux."
      showFileDisclaimer={false}
    >
      {/* Background gradient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--cyan-brand), transparent 60%)" }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--violet-brand), transparent 60%)" }}
        />
      </div>

      {/* Prompt panel */}
      <section
        className="rounded-3xl border border-border/70 p-5 sm:p-6 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--card) 88%, transparent), color-mix(in oklab, var(--card) 65%, transparent))",
          boxShadow:
            "0 20px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in oklab, var(--cyan-brand) 6%, transparent)",
        }}
      >
        <label htmlFor="ai-prompt" className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "var(--cyan-brand)" }} aria-hidden />
          Describe your image
        </label>
        <div className="relative group">
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
            placeholder="A dreamy sunset over a mountain lake, cinematic lighting, ultra detailed…"
            rows={3}
            disabled={busy}
            className="w-full resize-y rounded-2xl border border-border bg-background/60 px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none transition-all"
            style={{
              boxShadow: "0 0 0 1px color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 0 2px var(--cyan-brand), 0 0 24px -6px color-mix(in oklab, var(--cyan-brand) 60%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "0 0 0 1px color-mix(in oklab, var(--cyan-brand) 12%, transparent)";
            }}
            aria-label="Image description prompt"
          />
          <div className="absolute bottom-2 right-3 text-[10px] tabular-nums text-muted-foreground/70 pointer-events-none">
            {prompt.length}/1000
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={onRandom}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Dice5 className="w-4 h-4" aria-hidden /> Random prompt
          </button>
          <button
            type="button"
            onClick={onEnhance}
            disabled={busy || enhancing || prompt.trim().length < 2}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {enhancing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="w-4 h-4" aria-hidden />
            )}
            {enhancing ? "Enhancing…" : "Enhance prompt"}
          </button>
          {originalPromptRef.current != null && !enhancing && (
            <button
              type="button"
              onClick={onUndoEnhance}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Undo enhance
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background transition-all overflow-hidden",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              !busy && "hover:scale-[1.02] active:scale-[0.98]",
            )}
            style={{
              background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))",
              boxShadow: "0 8px 30px -8px color-mix(in oklab, var(--violet-brand) 60%, transparent)",
            }}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden />
                Generate
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Style presets */}
      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Style preset</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Art style preset">
          {STYLE_PRESETS.map((s) => {
            const active = s.id === styleId;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={active}
                onClick={() => setStyleId(s.id)}
                type="button"
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-transparent text-foreground"
                    : "border-border bg-secondary/40 hover:bg-secondary text-foreground/80",
                )}
                style={
                  active
                    ? {
                        background: "color-mix(in oklab, var(--cyan-brand) 12%, var(--card))",
                        boxShadow:
                          "0 0 0 2px var(--cyan-brand), 0 0 20px -6px color-mix(in oklab, var(--cyan-brand) 50%, transparent)",
                      }
                    : undefined
                }
              >
                <span aria-hidden>{s.emoji}</span>
                <span>{s.label}</span>
                {active && <Check className="w-3.5 h-3.5" aria-hidden style={{ color: "var(--cyan-brand)" }} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Advanced options */}
      <section className="mt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={advancedOpen}
          aria-controls="advanced-panel"
        >
          <Settings2 className="w-4 h-4" aria-hidden />
          Advanced options
          <span aria-hidden className={cn("transition-transform text-xs", advancedOpen && "rotate-180")}>
            ▾
          </span>
        </button>

        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              id="advanced-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl border border-border bg-card/60 p-5 space-y-5">
                {/* Aspect ratio */}
                <div>
                  <div className="text-sm font-medium mb-2">Aspect ratio</div>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Aspect ratio">
                    {ASPECTS.map((a) => {
                      const Icon = a.icon;
                      const active = a.id === aspectRatio;
                      return (
                        <button
                          key={a.id}
                          role="radio"
                          aria-checked={active}
                          type="button"
                          onClick={() => setAspectRatio(a.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                            active
                              ? "border-transparent text-foreground"
                              : "border-border bg-secondary/40 hover:bg-secondary",
                          )}
                          style={active ? { boxShadow: "0 0 0 2px var(--cyan-brand)" } : undefined}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                          {a.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <div className="text-sm font-medium mb-2">Quality</div>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quality">
                    {(["draft", "standard", "high"] as Quality[]).map((q) => {
                      const active = q === quality;
                      const labelMap: Record<Quality, string> = {
                        draft: "Draft (fast)",
                        standard: "Standard",
                        high: "High (slower)",
                      };
                      return (
                        <button
                          key={q}
                          role="radio"
                          aria-checked={active}
                          type="button"
                          onClick={() => setQuality(q)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm transition-colors",
                            active
                              ? "border-transparent text-foreground"
                              : "border-border bg-secondary/40 hover:bg-secondary",
                          )}
                          style={active ? { boxShadow: "0 0 0 2px var(--violet-brand)" } : undefined}
                        >
                          {labelMap[q]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Negative prompt */}
                <div>
                  <label htmlFor="negative-prompt" className="block text-sm font-medium mb-2">
                    Negative prompt <span className="text-muted-foreground font-normal">(what to avoid)</span>
                  </label>
                  <textarea
                    id="negative-prompt"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value.slice(0, 500))}
                    placeholder="blurry, watermark, low quality, distorted…"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generation area */}
      <section className="mt-8" aria-live="polite" aria-busy={busy}>
        {!current && !busy && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4" aria-hidden />
              Need inspiration? Try one of these
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={ex.seed}
                  type="button"
                  onClick={() => onExampleClick(ex.prompt)}
                  className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border bg-secondary/30 p-4 text-left transition-all hover:border-transparent hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    boxShadow: "0 0 0 1px transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 0 0 2px var(--cyan-brand), 0 12px 30px -12px color-mix(in oklab, var(--cyan-brand) 40%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0 1px transparent";
                  }}
                  aria-label={`Use prompt: ${ex.prompt}`}
                >
                  <span
                    aria-hidden
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-base"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in oklab, var(--cyan-brand) 25%, transparent), color-mix(in oklab, var(--violet-brand) 25%, transparent))",
                    }}
                  >
                    {STYLE_PRESETS[(i % (STYLE_PRESETS.length - 1)) + 1].emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm leading-snug line-clamp-2">{ex.prompt}</span>
                    <span
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--cyan-brand)" }}
                    >
                      Use this prompt <span aria-hidden>→</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {busy && (
          <div
            className="relative w-full rounded-3xl overflow-hidden border border-border"
            style={{ paddingBottom: aspectPaddingPct }}
          >
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  "linear-gradient(120deg, color-mix(in oklab, var(--cyan-brand) 30%, var(--card)), color-mix(in oklab, var(--violet-brand) 30%, var(--card)), color-mix(in oklab, var(--card) 90%, transparent))",
                backgroundSize: "300% 300%",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="w-5 h-5 animate-pulse" style={{ color: "var(--cyan-brand)" }} aria-hidden />
                Creating your image…
              </div>
              <div className="w-56 h-1.5 rounded-full bg-background/40 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "40%",
                    background: "linear-gradient(90deg, var(--cyan-brand), var(--violet-brand))",
                    animation: "shimmer 1.4s ease-in-out infinite",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Good things take a moment.</p>
            </div>
            <style>{`@keyframes shimmer { 0% { transform: translateX(-120%);} 100% { transform: translateX(280%);} }`}</style>
          </div>
        )}

        {current && !busy && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="relative w-full rounded-3xl overflow-hidden border border-border"
              style={{ paddingBottom: aspectPaddingPct, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)" }}
            >
              <img
                src={current.imageUrl}
                alt={current.prompt}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-background"
                style={{ background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))" }}
              >
                <Download className="w-4 h-4" aria-hidden /> Download
              </button>
              <button
                type="button"
                onClick={onCopyPrompt}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" aria-hidden /> {copied ? "Copied ✓" : "Copy prompt"}
              </button>
              <button
                type="button"
                onClick={onVariations}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" aria-hidden /> Variations
              </button>
              <a
                href="/tools/image-filters"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                ✏️ Image Filters
              </a>
              <a
                href="/tools/collage-maker"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                🖼️ Collage
              </a>
              <a
                href="/tools/add-watermark"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                💧 Watermark
              </a>
              <a
                href="/tools/image-resizer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                📐 Resize
              </a>
            </div>
          </motion.div>
        )}
      </section>

      {/* Session history */}
      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">This session</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {history.map((h) => {
              const active = current?.id === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onHistoryClick(h)}
                  className={cn(
                    "relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border transition-all focus:outline-none",
                    active ? "border-transparent" : "border-border hover:border-foreground/40",
                  )}
                  style={active ? { boxShadow: "0 0 0 2px var(--cyan-brand)" } : undefined}
                  aria-label={`Load previous: ${h.prompt.slice(0, 50)}`}
                >
                  <img src={h.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Cross-tool links */}
      <section className="mt-8 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          Take your generated images further with Skycally's full image toolkit:{" "}
          <a
            href="/tools/image-filters"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Image Filters
          </a>
          ,{" "}
          <a
            href="/tools/image-resizer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Image Resizer
          </a>
          ,{" "}
          <a
            href="/tools/remove-bg"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Remove Background
          </a>
          , and{" "}
          <a
            href="/tools/add-watermark"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Add Watermark
          </a>
          .
        </p>
        <p>
          Combine multiple AI-generated images into a single composition with the{" "}
          <a
            href="/tools/collage-maker"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Photo Collage Maker
          </a>
          , or convert them to PDF with{" "}
          <a
            href="/tools/image-to-pdf"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Image to PDF
          </a>
          . Need a logo? Try the{" "}
          <a
            href="/tools/business-card-generator"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Business Card Generator
          </a>{" "}
          with your AI-generated artwork.
        </p>
        <p>
          Add custom text overlays with{" "}
          <a
            href="/tools/add-text-to-image"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Add Text to Image
          </a>
          , create viral content with the{" "}
          <a
            href="/tools/meme-generator"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Meme Generator
          </a>
          , or upscale low-resolution results with{" "}
          <a
            href="/tools/image-upscaler"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Image Upscaler
          </a>
          .
        </p>
      </section>

      <AdZone id="ai-image-generator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Describe your image in the prompt field — or click Random for inspiration, or Enhance to expand a simple idea into a detailed prompt.",
          "Choose an art style preset, aspect ratio, and quality level — then click Generate.",
          "Download your image instantly — no watermark, no signup. Open it in any Skycally image tool to edit, resize, or remix.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Image Generator — Text to Image Online"
        description="Turn any text prompt into a stunning image in seconds. 15 art styles, 5 aspect ratios, prompt enhancement — all free, no watermark, no signup."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <RelatedTools currentSlug="ai-image-generator" />
    </ToolPageShell>
  );
}

// ─── SEO content ──────────────────────────────────────────────────────────
const SEO_BODY: string[] = [
  "Skycally's AI Image Generator turns any text description into a stunning image in seconds — completely free, with no watermark, no account required, and no daily generation limits. Powered by Flux Schnell, one of the fastest and highest-quality open image generation models available, the tool supports 15 distinct art styles from photorealistic and cinematic to anime, watercolor, pixel art, and cyberpunk. Simply describe what you want to see, choose a style, and generate — it is that simple. Tools like Midjourney start at $10 per month and DALL-E charges per generation; Skycally gives you unlimited generations at zero cost.",
  "The Prompt Enhance feature sets this tool apart from every other free generator. If you have a rough idea but struggle to describe it in AI-friendly terms, click Enhance and the AI expands your short description into a detailed, professional prompt — including lighting conditions, mood, style references, and technical quality terms that dramatically improve the output. A simple 'sunset over mountains' becomes 'a breathtaking mountain panorama bathed in golden hour light, dramatic volumetric clouds, photorealistic, 8K, shot on Sony A7R IV'. Edit or regenerate until the result is exactly what you envisioned.",
  "Five aspect ratios cover every use case: 1:1 square for social media profiles and product shots, 16:9 widescreen for YouTube thumbnails and desktop wallpapers, 9:16 portrait for Instagram Stories and TikTok covers, and 4:3 or 3:4 for traditional photography formats. Quality settings let you choose between Draft mode for rapid iteration and High quality for final outputs. A negative prompt field gives you precise control over what to exclude from the generation — remove watermarks, blurriness, specific colours, or unwanted elements.",
  "Every generated image downloads as a high-quality WebP file with no Skycally watermark. The session history strip keeps your last eight generations visible for easy comparison — click any thumbnail to bring it back into focus with its original prompt. Generated images connect seamlessly with Skycally's full image toolkit: open any result directly in Image Filters to apply effects, send it to the Collage Maker, add a watermark, or resize it for any platform — all without leaving the site.",
];

const SEO_FAQS = [
  {
    question: "Is this AI image generator really free with no watermark?",
    answer:
      "Yes. Unlike Canva AI which adds watermarks on free plans, and Midjourney which requires a $10/month subscription, Skycally's AI Image Generator is completely free. Generated images download as clean WebP files with no watermark, no logo, and no hidden branding. There are no daily generation limits and no account required.",
  },
  {
    question: "What AI model powers this image generator?",
    answer:
      "The generator uses Flux Schnell by Black Forest Labs — one of the fastest and highest-quality open image generation models available. It produces significantly sharper, more detailed results than earlier models like Stable Diffusion 1.5, with much faster generation times (typically 3–8 seconds per image).",
  },
  {
    question: "What is the Prompt Enhance feature?",
    answer:
      "Prompt Enhance uses a separate AI model to expand your short, simple description into a detailed, professional image generation prompt. It adds lighting details, mood, art style references, and technical quality terms that significantly improve the final image. You can edit the enhanced prompt before generating and undo it to restore your original text.",
  },
  {
    question: "What image styles are available?",
    answer:
      "15 style presets are available: No style (model default), Photorealistic, Cinematic, Anime, Oil Painting, Watercolor, Pixel Art, 3D Render, Cyberpunk, Fantasy Art, Minimalist, Vintage, Pencil Sketch, Neon Art, and Logo/Icon. Each preset adds a curated set of style descriptors to your prompt automatically.",
  },
  {
    question: "What aspect ratios and resolutions are supported?",
    answer:
      "Five aspect ratios are supported: 1:1 square (ideal for social media profiles and product images), 16:9 landscape (YouTube thumbnails, desktop wallpapers), 9:16 portrait (Instagram Stories, TikTok covers), 4:3 (standard photography format), and 3:4 (portrait photography). Output resolution scales with the quality setting.",
  },
  {
    question: "Can I use the generated images commercially?",
    answer:
      "Images generated using Flux Schnell are generally available for personal and commercial use under the Flux model license. However, you are responsible for ensuring your prompts do not reference copyrighted characters, trademarked logos, or real people's likenesses. Always review the current Flux license terms for the most accurate commercial use guidance.",
  },
  {
    question: "What should I write in the negative prompt?",
    answer:
      "The negative prompt tells the AI what to exclude. Common entries include: blurry, low quality, distorted, watermark, text, logo, extra limbs, deformed hands, ugly, oversaturated. For portraits, adding 'bad anatomy, crossed eyes' helps. For landscapes, 'people, buildings' works if you want pure nature scenes.",
  },
  {
    question: "Can I edit generated images after downloading?",
    answer:
      "Yes — Skycally has a full suite of image editing tools that work seamlessly with generated images. Open any result in Image Filters to apply effects, use the Image Resizer to scale for any platform, add custom text with Add Text to Image, create a PDF with Image to PDF, or remove the background with the Remove Background tool.",
  },
];
