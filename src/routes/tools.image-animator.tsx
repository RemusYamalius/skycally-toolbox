import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Download, Upload, RefreshCw, Wand2, Loader2, AlertCircle, Info, X } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

import { EFFECTS, findEffect, type EffectId } from "@/lib/image-animator/effects";
import {
  renderVideo,
  renderGif,
  type AnimSettings,
  type Resolution,
  type Easing,
  type OutputFormat,
} from "@/lib/image-animator/render";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/image-animator")({
  head: () => buildToolMeta(toolBySlug("image-animator", tools)),
  validateSearch: (search: Record<string, unknown>): { from?: string } => {
    const from = typeof search.from === "string" ? search.from : undefined;
    return from ? { from } : {};
  },
  component: ImageAnimatorPage,
});

const MAX_BYTES = 20 * 1024 * 1024;
const SOFT_WARN_BYTES = 10 * 1024 * 1024;

const DEFAULT_SETTINGS: AnimSettings = {
  effectId: "ken-burns",
  duration: 5,
  fps: 30,
  outputFormat: "mp4",
  resolution: "720",
  loop: true,
  easing: "ease-in-out",
};

function ImageAnimatorPage() {
  const search = Route.useSearch();
  const fromGenerator = search.from === "generator";

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [sizeWarning, setSizeWarning] = useState(false);

  const [settings, setSettings] = useState<AnimSettings>(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ url: string; blob: Blob; extension: string } | null>(null);

  // Live CSS preview state — toggles between two transforms to animate.
  const [cssTick, setCssTick] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef(false);

  const selectedEffect = useMemo(() => findEffect(settings.effectId as EffectId), [settings.effectId]);

  // Continuously toggle CSS preview transform every 2s when idle.
  useEffect(() => {
    if (busy || result) return;
    const id = window.setInterval(() => setCssTick((v) => !v), 2000);
    return () => window.clearInterval(id);
  }, [busy, result]);

  // Cleanup object URLs on unmount / replacement.
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  function loadImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large. Max size is 20MB.");
      return;
    }
    setError(null);
    setSizeWarning(file.size > SOFT_WARN_BYTES);

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }

    const url = URL.createObjectURL(file);
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      setImageFile(file);
      setImageUrl(url);
      setImageEl(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Could not decode this image.");
    };
    el.src = url;
  }

  function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    loadImageFile(files[0]);
  }

  function onChangeImage() {
    fileInputRef.current?.click();
  }

  function onClearImage() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (result) URL.revokeObjectURL(result.url);
    setImageFile(null);
    setImageUrl(null);
    setImageEl(null);
    setResult(null);
    setError(null);
    setSizeWarning(false);
  }

  function updatePreviewFromCanvas(canvas: HTMLCanvasElement) {
    const target = previewCanvasRef.current;
    if (!target) return;
    if (target.width !== canvas.width || target.height !== canvas.height) {
      target.width = canvas.width;
      target.height = canvas.height;
    }
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
  }

  function onGenerate() {
    if (!imageEl || busy) return;

    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }

    setBusy(true);
    setError(null);
    setProgress(0);

    const runner =
      settings.outputFormat === "gif"
        ? renderGif(imageEl, settings, selectedEffect, setProgress, updatePreviewFromCanvas)
        : renderVideo(imageEl, settings, selectedEffect, setProgress, updatePreviewFromCanvas);

    runner
      .then((output) => {
        const url = URL.createObjectURL(output.blob);
        setResult({ url, blob: output.blob, extension: output.extension });
        setProgress(100);
      })
      .catch((err: unknown) => {
        console.error("[image-animator] Render failed:", err);
        setError(err instanceof Error ? err.message : "Something went wrong while rendering.");
      })
      .finally(() => {
        setBusy(false);
      });
  }

  function onDownload() {
    if (!result) return;
    const base = imageFile?.name.replace(/\.[^.]+$/, "") ?? "skycally-animated";
    downloadBlob(result.blob, `${base}.${result.extension}`);
  }

  function onReanimate() {
    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
    onGenerate();
  }

  const canGenerate = !!imageEl && !busy;

  const cssPreviewStyle: React.CSSProperties = {
    transition: "transform 2s ease-in-out",
    transform: cssTick ? selectedEffect.cssPreview : "scale(1) translate(0,0)",
    transformOrigin: "center",
    willChange: "transform",
  };

  return (
    <ToolPageShell
      title="AI Image Animator"
      description="Free AI image animator — bring any photo to life with cinematic motion effects. Export as MP4 or GIF, no signup, no limits, runs in your browser."
      showFileDisclaimer
    >
      {fromGenerator && (
        <div
          role="note"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 text-sm"
        >
          <Info className="w-4 h-4 mt-0.5" style={{ color: "var(--cyan-brand)" }} aria-hidden />
          <p className="text-muted-foreground">
            Tip: your image from the AI Image Generator is ready to animate. Upload it below (right-click → Save
            Image if you haven't yet), pick an effect, and hit Animate.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Left column — controls */}
        <section className="space-y-6">
          {/* Upload */}
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" aria-hidden /> Your image
            </h2>

            {!imageEl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  dragRef.current = true;
                }}
                onDragLeave={() => {
                  dragRef.current = false;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragRef.current = false;
                  onFilesPicked(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-background/40 p-8 text-center transition hover:border-foreground/40"
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" aria-hidden />
                <p className="font-medium">Drop your image here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse — PNG, JPG, WebP, up to 20MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img
                  src={imageUrl ?? undefined}
                  alt="Uploaded"
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{imageFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {imageEl.naturalWidth}×{imageEl.naturalHeight}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onChangeImage}
                  className="text-xs rounded-full border border-border bg-secondary/60 hover:bg-secondary px-3 py-1.5 transition-colors"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={onClearImage}
                  aria-label="Remove image"
                  className="rounded-full border border-border bg-secondary/60 hover:bg-secondary p-1.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onFilesPicked(e.target.files)}
            />

            {sizeWarning && (
              <p className="mt-3 flex items-start gap-2 text-xs text-amber-500">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                Large image — rendering may take a bit longer.
              </p>
            )}
          </div>

          {/* Effect picker */}
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-display text-base font-semibold mb-3">Motion effect</h2>
            <div className="grid grid-cols-2 gap-2">
              {EFFECTS.map((effect) => {
                const active = effect.id === settings.effectId;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, effectId: effect.id }))}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-transparent bg-secondary/70"
                        : "border-border bg-background/40 hover:border-foreground/30",
                    )}
                    style={
                      active
                        ? {
                            boxShadow:
                              "0 0 0 2px var(--cyan-brand), 0 8px 24px -12px color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
                          }
                        : undefined
                    }
                  >
                    <div className="text-lg leading-none mb-1" aria-hidden>
                      {effect.emoji}
                    </div>
                    <div className="text-sm font-medium">{effect.label}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {effect.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output settings */}
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between font-display text-base font-semibold"
              aria-expanded={showAdvanced}
            >
              Output settings
              <span className="text-xs text-muted-foreground">{showAdvanced ? "Hide" : "Show"}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 text-sm">
                <SegmentedRow
                  label="Duration"
                  value={String(settings.duration)}
                  options={[
                    { label: "3s", value: "3" },
                    { label: "5s", value: "5" },
                    { label: "8s", value: "8" },
                    { label: "10s", value: "10" },
                  ]}
                  onChange={(v) => setSettings((s) => ({ ...s, duration: Number(v) as AnimSettings["duration"] }))}
                />
                <SegmentedRow
                  label="FPS"
                  value={String(settings.fps)}
                  options={[
                    { label: "24", value: "24" },
                    { label: "30", value: "30" },
                  ]}
                  onChange={(v) => setSettings((s) => ({ ...s, fps: Number(v) as AnimSettings["fps"] }))}
                />
                <SegmentedRow
                  label="Format"
                  value={settings.outputFormat}
                  options={[
                    { label: "MP4", value: "mp4" },
                    { label: "GIF", value: "gif" },
                  ]}
                  onChange={(v) => setSettings((s) => ({ ...s, outputFormat: v as OutputFormat }))}
                />
                <SegmentedRow
                  label="Resolution"
                  value={settings.resolution}
                  options={[
                    { label: "480p", value: "480" },
                    { label: "720p", value: "720" },
                    { label: "1080p", value: "1080" },
                  ]}
                  onChange={(v) => setSettings((s) => ({ ...s, resolution: v as Resolution }))}
                />
                <SegmentedRow
                  label="Easing"
                  value={settings.easing}
                  options={[
                    { label: "Linear", value: "linear" },
                    { label: "Ease In-Out", value: "ease-in-out" },
                  ]}
                  onChange={(v) => setSettings((s) => ({ ...s, easing: v as Easing }))}
                />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Loop</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.loop}
                    onClick={() => setSettings((s) => ({ ...s, loop: !s.loop }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.loop ? "bg-[var(--cyan-brand)]" : "bg-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-background transition-transform",
                        settings.loop ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="group relative w-full overflow-hidden rounded-2xl px-6 py-4 text-base font-semibold text-background disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            style={{ background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))" }}
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Rendering… {progress}%
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" aria-hidden /> Animate image
                </>
              )}
            </span>
            {!busy && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-700"
              />
            )}
          </button>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Right column — preview */}
        <section className="rounded-2xl border border-border bg-card/70 p-5 min-h-[24rem]">
          <div
            className="relative w-full overflow-hidden rounded-xl bg-background/60 border border-border flex items-center justify-center"
            style={{ aspectRatio: "16 / 9" }}
            aria-label={`Preview — ${selectedEffect.label} effect`}
          >
            {!imageEl && !busy && !result && (
              <div className="text-center text-sm text-muted-foreground p-6">
                <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-70" aria-hidden />
                Upload an image to see a live preview of the selected effect.
              </div>
            )}

            {imageEl && !busy && !result && imageUrl && (
              <img
                src={imageUrl}
                alt="Live effect preview"
                className="max-w-full max-h-full object-contain"
                style={cssPreviewStyle}
              />
            )}

            {busy && (
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full"
                aria-label={`Rendering ${selectedEffect.label}`}
              />
            )}

            {result && result.extension === "gif" && (
              <img
                src={result.url}
                alt="Animated result"
                className="max-w-full max-h-full object-contain"
              />
            )}

            {result && result.extension !== "gif" && (
              <video
                key={result.url}
                src={result.url}
                autoPlay
                loop={settings.loop}
                muted
                playsInline
                controls
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {busy && (
            <div className="mt-4" aria-live="polite">
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, var(--cyan-brand), var(--violet-brand))",
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Rendering — {progress}%</p>
            </div>
          )}

          {result && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-background"
                style={{ background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))" }}
              >
                <Download className="w-4 h-4" aria-hidden /> Download .{result.extension}
              </button>
              <button
                type="button"
                onClick={onReanimate}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden /> Re-animate
              </button>
              <a
                href="/tools/image-filters"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                ✏️ Image Filters
              </a>
              <a
                href="/tools/video-to-gif"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                🎞️ Video to GIF
              </a>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          Create an image first with our{" "}
          <a href="/tools/ai-image-generator" className="text-primary underline underline-offset-2 hover:text-primary/80">
            AI Image Generator
          </a>
          , then animate it here for a complete AI-powered creative workflow.
        </p>
        <p>
          Enhance your photo before animating with{" "}
          <a href="/tools/image-filters" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Image Filters
          </a>
          , or convert your exported GIF back to video with{" "}
          <a href="/tools/video-to-gif" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Video to GIF
          </a>
          . Need a specific size? Use the{" "}
          <a href="/tools/image-resizer" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Image Resizer
          </a>{" "}
          before uploading.
        </p>
      </section>

      <AdZone id="image-animator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Upload any photo — PNG, JPG, or WebP up to 20MB. A live preview shows your image immediately.",
          "Choose a motion effect (Ken Burns, zoom, pan, or parallax) and set your preferred duration, resolution, and format.",
          "Click Animate and watch it render in real time — then download as MP4 or GIF with no watermark.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Image Animator — Bring Photos to Life"
        description="Animate any image for free with cinematic motion effects — Ken Burns, zoom, pan, parallax. Export as MP4 or GIF."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <RelatedTools currentSlug="image-animator" />
    </ToolPageShell>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────

interface SegmentedRowProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}

function SegmentedRow({ label, value, options, onChange }: SegmentedRowProps) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                active
                  ? "border-transparent text-background"
                  : "border-border bg-secondary/50 hover:bg-secondary text-foreground",
              )}
              style={
                active ? { background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))" } : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SEO content ──────────────────────────────────────────────────────────

const SEO_BODY: string[] = [
  "Skycally's Image Animator transforms any still photo into a smooth, cinematic video clip using professional motion effects — completely free, with no account required and no daily limits. Choose from eight effects including the classic Ken Burns slow zoom, directional pans, zoom in and out, and a hypnotic parallax depth effect. Export your animated image as an MP4 video or animated GIF, at resolutions up to 1080p. Everything processes in your browser — your image never leaves your device.",
  "The Ken Burns effect — named after the documentary filmmaker who popularised it — is one of the most powerful tools in visual storytelling. A slow, almost imperceptible zoom combined with a gentle pan transforms a flat photograph into something that feels alive and cinematic. This is the same technique used in professional documentaries, memorial slideshows, social media reels, and YouTube videos to add emotional depth to still images. With this tool, you can apply it in seconds and download the result as a ready-to-share video file.",
  "Eight motion presets cover every creative need. Zoom In draws the viewer's eye to the center of the image with growing intensity. Zoom Out reveals the full scene dramatically. Pan Left, Right, Up, and Down simulate a camera travelling across the frame — ideal for landscapes, architecture, and group photos. The Parallax effect uses a sine-wave oscillation to create a subtle looping depth illusion that works particularly well on portraits and cityscapes. A live CSS preview shows the effect on your image before you commit to the full render.",
  "Output settings give you full control over the result. Choose between MP4 (smaller file, better for video platforms and messaging apps) and animated GIF (universally compatible with email, web pages, and chat apps). Duration options from 3 to 10 seconds let you match the animation to your platform — short for Instagram Stories, longer for presentations and slideshows. Pair this tool with the AI Image Generator to create an image from scratch and immediately bring it to life, or use the Image Filters tool to enhance your photo before animating.",
];

const SEO_FAQS = [
  {
    question: "What is the Ken Burns effect?",
    answer:
      "The Ken Burns effect is a slow, smooth zoom combined with a gentle pan across a still image, creating the illusion of camera movement. It is named after documentary filmmaker Ken Burns who popularised it in historical documentaries. It is widely used in slideshows, memorial videos, social media content, and YouTube b-roll to add cinematic life to photographs.",
  },
  {
    question: "Is this image animator really free?",
    answer:
      "Yes, completely free with no daily limits and no account required. The animation runs entirely in your browser using the Canvas API and MediaRecorder API — no server processing, no cloud credits, no hidden costs. There is no watermark on exported files.",
  },
  {
    question: "What image formats can I upload?",
    answer:
      "PNG, JPG, JPEG, and WebP images are supported, up to 20MB per file. For best results, use high-resolution images — the animator will scale the output to your chosen resolution (480p, 720p, or 1080p) while maintaining the original aspect ratio.",
  },
  {
    question: "What is the difference between MP4 and GIF export?",
    answer:
      "MP4 produces a smaller, higher-quality video file suitable for sharing on social media, messaging apps, and video platforms. GIF produces a universally compatible animated image that works in emails, web pages, and chat apps without needing a video player. GIF files are larger than MP4 for the same content and are limited to 256 colours.",
  },
  {
    question: "How long does it take to animate an image?",
    answer:
      "Rendering time depends on the duration, resolution, and frame rate selected. A 5-second MP4 at 720p typically renders in 10-20 seconds. A 1080p export takes longer. GIF export adds additional encoding time. A progress bar shows the rendering status in real time.",
  },
  {
    question: "Can I use animated images on Instagram, TikTok, or YouTube?",
    answer:
      "Yes. Export as MP4 for Instagram Reels, TikTok, YouTube Shorts, and LinkedIn video posts. Export as GIF for Twitter/X, Giphy, Tenor, or direct embedding on websites. For Instagram Stories specifically, a 9:16 portrait image with the Ken Burns or Zoom In effect works particularly well.",
  },
  {
    question: "What is the Parallax effect?",
    answer:
      "The Parallax effect applies a subtle looping oscillation to the image — a gentle sine-wave motion that shifts the image slightly left-right and up-down in a continuous loop. It creates the impression of 3D depth and works especially well on portraits, landscapes, and architectural photography. It produces a seamlessly looping clip with no visible cut point.",
  },
  {
    question: "Can I animate AI-generated images?",
    answer:
      "Yes. Use the AI Image Generator to create an image from text, then open it in the Image Animator to bring it to life. The Ken Burns effect works particularly well on AI-generated landscapes and portraits. Download the animated result as an MP4 and share it directly to social media.",
  },
];
