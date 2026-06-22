import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Download, RefreshCw, CheckCircle2 } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { upscaleImage, MAX_UPSCALE_BYTES } from "@/services/imageUpscaler";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-upscaler")({
  head: () => buildToolMeta(toolBySlug("image-upscaler", tools)),
  component: ImageUpscalerPage,
});

function ImageUpscalerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);

  const inputUrl = file ? URL.createObjectURL(file) : null;

  const onPick = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_UPSCALE_BYTES) {
      toast.error("Max file size is 10 MB");
      return;
    }
    setFile(f);
    setOutput(null);
    setSlider(50);
  };

  const STEPS = ["Loading image…", "Reading pixels…", "Upscaling with Lanczos3…", "Sharpening…", "Finalizing…"];

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const url = await upscaleImage(file, scale, (msg) => {
        setProgressMsg(msg);
        const idx = STEPS.indexOf(msg);
        setProgress(idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 50);
      });
      setOutput(url);
      toast.success("Image upscaled!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upscale — try a smaller image.");
    } finally {
      setBusy(false);
      setProgressMsg("");
      setProgress(0);
    }
  };

  const reset = () => {
    setFile(null);
    setOutput(null);
    setSlider(50);
  };

  return (
    <ToolPageShell
      title="Image Upscaler"
      description="Enlarge images 2× or 4× using Lanczos3 resampling with unsharp masking — sharper results than standard browser scaling, free and private."
    >
      {/* Privacy badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        Your image never leaves your device — all processing runs in the browser.
      </div>

      {!file ? (
        <DropZone
          accept="image/png,image/jpeg,image/webp"
          onFiles={onPick}
          label="Drop your image here"
          hint="PNG, JPG or WebP · max 10 MB · click to browse"
        />
      ) : (
        <div className="space-y-5">
          {/* File info */}
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Change
            </button>
          </div>

          {/* Settings */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Scale Factor</p>
              <div className="grid grid-cols-2 gap-2">
                {([2, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold border transition ${
                      scale === s
                        ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="text-lg font-black">{s}×</span>
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                      {s === 2 ? "Double resolution" : "Quadruple resolution"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm info */}
            <div className="rounded-xl bg-secondary/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Algorithm: Lanczos3 + Unsharp Mask</p>
              <p>
                Lanczos resampling preserves edge sharpness and fine detail better than browser bicubic scaling. Unsharp
                masking then enhances perceived clarity — the same technique used in Photoshop's "Smart Sharpen".
              </p>
            </div>

            {/* Progress */}
            {busy && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progressMsg}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Large images may take 10–30 seconds — all processing happens locally.
                </p>
              </div>
            )}

            <button
              onClick={run}
              disabled={busy || !!output}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{" "}
                  Processing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Upscale {scale}×
                </>
              )}
            </button>
          </div>

          {/* Before / After slider */}
          {output && inputUrl && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Before / After</p>
                <p className="text-xs text-muted-foreground">← Drag to compare →</p>
              </div>

              <div
                className="relative w-full overflow-hidden rounded-xl border border-border select-none"
                style={{ aspectRatio: "16/10" }}
              >
                {/* Upscaled (background) */}
                <img
                  src={output}
                  alt="Upscaled"
                  className="absolute inset-0 w-full h-full object-contain bg-black/10"
                />

                {/* Original (clipped overlay) */}
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
                  <img
                    src={inputUrl}
                    alt="Original"
                    className="absolute inset-0 h-full object-contain bg-black/10"
                    style={{ width: `${(100 / slider) * 100}%`, maxWidth: "none" }}
                  />
                </div>

                {/* Divider */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                  style={{ left: `${slider}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <span className="text-black text-xs font-bold">⇔</span>
                  </div>
                </div>

                {/* Labels */}
                <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-semibold pointer-events-none">
                  Original
                </span>
                <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-cyan-500/80 text-white text-[10px] font-semibold pointer-events-none">
                  Upscaled {scale}× ✨
                </span>

                {/* Drag input */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  onChange={(e) => setSlider(+e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
              </div>

              {/* Download */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={output}
                  download={`upscaled-${scale}x-${file.name.replace(/\.[^.]+$/, "")}.png`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/20"
                >
                  <Download className="w-4 h-4" /> Download PNG ({scale}×)
                </a>
                <button
                  onClick={() => {
                    setOutput(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition text-sm"
                >
                  Try different scale
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <HowToUse
        steps={[
          "Drop a PNG, JPG or WebP image (up to 10 MB) into the upload area.",
          "Choose 2× to double the resolution or 4× to quadruple it. For portraits and product photos, 2× is usually the best starting point.",
          "Click Upscale — Lanczos3 resampling runs entirely in your browser. Larger images take 10–30 seconds.",
          "Drag the comparison slider to see the before/after difference, then download the upscaled PNG.",
        ]}
      />

      <ToolSeoContent
        title="Free Image Upscaler — Enlarge Photos 2× or 4× Online Without Losing Quality"
        description="Upscale JPG, PNG and WebP images 2× or 4× using Lanczos3 resampling and unsharp masking. Sharper results than browser scaling. Free, no upload, no account — runs entirely in your browser."
        body={[
          "Skycally's Image Upscaler enlarges images using Lanczos3 resampling — the same algorithm used by professional tools like Photoshop, Lightroom, and FFmpeg for high-quality image resizing. Unlike simple browser scaling (which applies a basic bicubic filter and produces soft, blurry results), Lanczos3 uses a sinc-based convolution kernel that preserves edge sharpness and fine detail across the entire image. After resampling, an unsharp mask pass further enhances perceived clarity — the same technique behind Photoshop's 'Smart Sharpen'.",
          "Upscaling is useful in many practical workflows: enlarging small product photos for e-commerce listings, preparing low-resolution logos and icons for print, improving old scanned photographs, upscaling game screenshots for social media, and increasing the pixel count of images before cropping. The 2× factor doubles both width and height (producing 4× as many pixels), while 4× quadruples each dimension (producing 16× as many pixels).",
          "All processing runs locally in your browser using the OffscreenCanvas API and the Web Workers thread — your image is never uploaded, never stored, and never transmitted anywhere. Processing a typical 1000×1000px image at 2× takes about 3–5 seconds; larger images or 4× upscaling may take 15–30 seconds depending on your device. The output is always a lossless PNG to preserve the full quality of the upscaled result.",
        ]}
        faqs={[
          {
            question: "What upscaling algorithm does this tool use?",
            answer:
              "Lanczos3 resampling — a sinc-based convolution algorithm that produces sharper results than the bicubic interpolation used by most browsers. It is followed by an unsharp mask pass to enhance perceived detail, the same combination used by Photoshop's high-quality resize.",
          },
          {
            question: "How much sharper is Lanczos3 vs browser scaling?",
            answer:
              "Noticeably sharper, especially on text, fine lines, and high-contrast edges. Browser bicubic scaling tends to produce soft halos around edges, while Lanczos3 preserves them more faithfully. Use the before/after slider to compare directly.",
          },
          {
            question: "Should I use 2× or 4×?",
            answer:
              "2× is the best choice for most images — it doubles the resolution with good quality preservation. 4× is useful when you need a very large output (e.g. for print) but the upscaling artifacts become more visible at extreme ratios. For AI-quality 4× upscaling, a dedicated tool like Topaz Gigapixel would produce better results.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. The entire process — image loading, Lanczos resampling, sharpening, and output generation — runs locally in your browser. Your image never leaves your device.",
          },
          {
            question: "Why does upscaling take longer than I expected?",
            answer:
              "Lanczos3 is computationally intensive — for each output pixel it reads a 6×6 neighbourhood of source pixels and applies weighted convolution. A 1000×1000px image upscaled 2× requires computing 4 million output pixels, each with 36 neighbour lookups. This is why it takes longer than simple scaling but produces much sharper results.",
          },
          {
            question: "What file formats are supported?",
            answer:
              "Input: PNG, JPG and WebP up to 10 MB. Output: always PNG (lossless), which ensures no additional quality loss from compression artefacts.",
          },
          {
            question: "Can I upscale a very small image, like a 50×50 icon?",
            answer:
              "Yes, but the results will still look pixelated because Lanczos3 can only interpolate between existing pixels — it cannot invent detail that was never there. AI-based upscalers (like Topaz Gigapixel) can hallucinate plausible detail for very low-resolution sources; this tool cannot.",
          },
          {
            question: "Is this the same as AI upscaling?",
            answer:
              "No. Lanczos3 is a mathematical resampling algorithm — it is deterministic and does not use machine learning. AI upscalers (like Real-ESRGAN or Topaz) use neural networks trained on millions of images to synthesise realistic detail. This tool produces sharper results than basic browser scaling but is not as powerful as dedicated AI upscalers for very low-resolution inputs.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-upscaler" />
    </ToolPageShell>
  );
}
