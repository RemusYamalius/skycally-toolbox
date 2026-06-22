import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Download, ImageOff, RefreshCw, CheckCircle2 } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { removeBackground } from "@/services/removeBg";
import { downloadBlob, checkSize } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/remove-bg")({
  head: () => buildToolMeta(toolBySlug("remove-bg", tools)),
  component: RemoveBgPage,
});

// ─── Checkerboard background (indicates transparency) ─────────────────────────
const CHECKER = {
  backgroundImage: `
    linear-gradient(45deg, #374151 25%, transparent 25%),
    linear-gradient(-45deg, #374151 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #374151 75%),
    linear-gradient(-45deg, transparent 75%, #374151 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
  backgroundColor: "#1f2937",
};

function RemoveBgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const prevOrigUrl = useRef<string | null>(null);

  const onFile = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const err = checkSize(f);
    if (err) {
      toast.error(err);
      return;
    }

    // Revoke old object URL to avoid memory leak
    if (prevOrigUrl.current) URL.revokeObjectURL(prevOrigUrl.current);
    const url = URL.createObjectURL(f);
    prevOrigUrl.current = url;

    setFile(f);
    setOrigUrl(url);
    setResultUrl(null);
    setResultBlob(null);
    setProgress(0);
    setProgressLabel("");
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setResultUrl(null);
    setProgress(0);
    setProgressLabel("Loading AI model…");

    try {
      const blob = await removeBackground(file, (pct) => {
        setProgress(pct);
        if (pct < 30) setProgressLabel("Loading AI model…");
        else if (pct < 70) setProgressLabel("Analysing image…");
        else setProgressLabel("Removing background…");
      });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      toast.success("Background removed!");
    } catch (e: any) {
      toast.error(e?.message || "Background removal failed — try a different image.");
    } finally {
      setBusy(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const reset = () => {
    if (prevOrigUrl.current) URL.revokeObjectURL(prevOrigUrl.current);
    setFile(null);
    setOrigUrl(null);
    setResultUrl(null);
    setResultBlob(null);
    setProgress(0);
    setProgressLabel("");
  };

  const download = () => {
    if (!resultBlob || !file) return;
    const name = file.name.replace(/\.[^.]+$/, "") + "-no-bg.png";
    downloadBlob(resultBlob, name);
  };

  return (
    <ToolPageShell
      title="Remove Background"
      description="Erase image backgrounds instantly using AI — free, no signup, runs entirely in your browser."
    >
      {/* Privacy badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        Your image never leaves your device — AI runs 100% in the browser.
      </div>

      {!file ? (
        <DropZone
          accept="image/*"
          onFiles={onFile}
          label="Drop an image here"
          hint="JPG, PNG, WebP — max 10 MB · click to browse"
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
          {/* Before / After grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Original */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Original</p>
              <div className="rounded-xl border border-border overflow-hidden bg-secondary/30">
                {origUrl && (
                  <img
                    src={origUrl}
                    alt="Original"
                    className="w-full object-contain max-h-72"
                    style={{ display: "block" }}
                  />
                )}
              </div>
            </div>

            {/* Result */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Result</p>
              <div
                className="rounded-xl border border-border overflow-hidden flex items-center justify-center min-h-[180px]"
                style={CHECKER}
              >
                {busy ? (
                  <div className="flex flex-col items-center gap-3 p-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-white/70">{progressLabel}</p>
                    {progress > 0 && (
                      <div className="w-48">
                        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-white/50 text-center mt-1">{progress}%</p>
                      </div>
                    )}
                    <p className="text-[11px] text-white/40 text-center max-w-xs">
                      First run may take ~10–20s to download the AI model. Subsequent runs are faster.
                    </p>
                  </div>
                ) : resultUrl ? (
                  <img
                    src={resultUrl}
                    alt="Background removed"
                    className="w-full object-contain max-h-72"
                    style={{ display: "block" }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-white/40">
                    <ImageOff className="w-8 h-8" />
                    <p className="text-sm">Result will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!resultUrl ? (
              <button
                onClick={run}
                disabled={busy}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : (
                  "✨ Remove Background"
                )}
              </button>
            ) : (
              <button
                onClick={download}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>
            )}
            <button
              onClick={reset}
              className="sm:w-auto px-5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> New Image
            </button>
          </div>

          {resultUrl && (
            <p className="text-xs text-muted-foreground text-center">
              Tip: Right-click the result image to copy it directly to your clipboard.
            </p>
          )}
        </div>
      )}

      {/* Limitations notice */}
      <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Best results with:</p>
        <p>✅ Clear subject/background contrast · Portrait photos · Product shots on plain backgrounds</p>
        <p>
          ⚠️ Complex hair and fur edges may not be perfectly smooth — re-upload a higher-resolution image for better
          detail
        </p>
        <p>⚠️ Very large images (&gt;4000px) are resized automatically to ensure performance in the browser</p>
      </div>

      <HowToUse
        steps={[
          "Drop or select your image — JPG, PNG or WebP up to 10 MB.",
          "Click 'Remove Background'. The first run downloads the AI model (~40 MB) — this takes 10–20 seconds. Subsequent runs on the same session are much faster.",
          "Preview the transparent result on the checkerboard background. Download the transparent PNG ready to paste into any design.",
          "For best results use images with clear contrast between the subject and background — portrait photos and product shots work best.",
        ]}
      />

      <ToolSeoContent
        title="Remove Background Free — AI Image Background Remover Online"
        description="Remove the background from any photo instantly using AI. No signup, no upload — the AI model runs entirely in your browser. Download a transparent PNG in seconds. Free, unlimited, private."
        body={[
          "Skycally's background remover uses a state-of-the-art AI segmentation model running entirely in your browser via WebAssembly and ONNX Runtime. Unlike most online background removers — which upload your photo to a remote server — the AI model is downloaded once to your device and then processes every image locally. Your photos never leave your browser. This makes the tool safe for sensitive images: ID documents, family photos, confidential product shots, and anything you wouldn't want transmitted over the internet.",
          "The underlying technology uses a deep learning segmentation model trained on millions of images to distinguish foreground subjects (people, animals, products, objects) from backgrounds of any complexity — solid colours, gradients, busy street scenes, natural landscapes. It handles difficult cases that simple colour-based tools cannot: transparent or semi-transparent glass, fine hair strands, complex clothing textures, and subjects that share colours with the background. The result is always a transparent PNG with clean, anti-aliased edges.",
          "Background removal is useful across dozens of workflows. E-commerce sellers remove backgrounds from product photos to meet marketplace requirements (Amazon, eBay, Etsy all require white or transparent backgrounds). Designers create cutout images for composite scenes. Content creators make professional-quality profile pictures and thumbnails. Social media users create sticker-style images for sharing. With no file size restriction beyond browser memory and no daily limit, Skycally's remover handles everything from quick personal edits to bulk professional work.",
        ]}
        faqs={[
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. The AI model runs entirely in your browser using WebAssembly and ONNX Runtime. Your image is processed locally on your device and never transmitted to any server. You can even disconnect from the internet after the page loads and it will still work.",
          },
          {
            question: "Why does the first run take longer?",
            answer:
              "The first time you use the tool, the AI model file (~40 MB) is downloaded from a CDN and cached in your browser. Subsequent uses in the same session — or after the cache warms up — are significantly faster because the model is already loaded in memory.",
          },
          {
            question: "What image formats are supported?",
            answer:
              "JPG, PNG and WebP images up to 10 MB. For best quality, use the highest resolution version of your photo available — the AI model preserves fine details like hair and fur better with more pixels to work with.",
          },
          {
            question: "What types of images work best?",
            answer:
              "The AI works best with images where the subject is clearly distinct from the background: portrait photos, product shots on plain or gradient backgrounds, animals against a clear sky or ground, and objects against a neutral background. It handles complex backgrounds but quality degrades with very busy or patterned backgrounds.",
          },
          {
            question: "What format is the output?",
            answer:
              "The output is always a transparent PNG file. PNG is the only common image format that supports full alpha transparency. The transparent areas appear as a checkerboard pattern in the preview.",
          },
          {
            question: "Can I use the result commercially?",
            answer:
              "The tool itself is free to use for any purpose, commercial or personal. Rights to the output image depend on rights to your original input image — if you own the original photo, you own the processed result.",
          },
          {
            question: "How is this different from Photoshop's Remove Background?",
            answer:
              "Functionally similar — both use AI segmentation. Skycally's tool is free, requires no installation or account, and runs in the browser. Photoshop offers additional manual refinement tools (Select and Mask) for fine-tuning difficult edges, which this browser-based tool does not currently offer.",
          },
          {
            question: "Why are hair and fur edges sometimes imperfect?",
            answer:
              "Fine hair strands and fur are the hardest challenge for AI background removal. The model handles them well but not perfectly, especially at lower image resolutions. For the best hair results, use the highest-resolution photo available and ensure good lighting contrast between the hair and background.",
          },
        ]}
      />

      <RelatedTools currentSlug="remove-bg" />
    </ToolPageShell>
  );
}
