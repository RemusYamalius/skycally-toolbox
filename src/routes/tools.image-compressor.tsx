import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { Download, Trash2, X, CheckCircle2, ImageIcon } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-compressor")({
  head: () => buildToolMeta(toolBySlug("image-compressor", tools)),
  component: ImageCompressorPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Item {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "compressing" | "done" | "error";
  out?: { blob: Blob; size: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const QUALITY_LABELS: Record<number, string> = {
  95: "Minimal — barely noticeable change",
  85: "High — excellent quality",
  75: "Medium — good balance",
  60: "Low — smaller files",
  40: "Aggressive — smallest files",
};

function getQualityLabel(q: number): string {
  const closest = Object.keys(QUALITY_LABELS)
    .map(Number)
    .reduce((a, b) => (Math.abs(b - q) < Math.abs(a - q) ? b : a));
  return QUALITY_LABELS[closest];
}

// ─── Main component ───────────────────────────────────────────────────────────
function ImageCompressorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(80);
  const [maxW, setMaxW] = useState(0); // 0 = no resize
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const newItems: Item[] = files.map((f) => ({
      id: uid(),
      file: f,
      preview: URL.createObjectURL(f),
      status: "idle",
    }));
    setItems((p) => [...p, ...newItems]);
  }, []);

  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const compressAll = async () => {
    if (busy || items.length === 0) return;
    setBusy(true);

    const updated = [...items];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === "done") continue;
      updated[i] = { ...updated[i], status: "compressing" };
      setItems([...updated]);
      try {
        const compressed = await imageCompression(updated[i].file, {
          maxSizeMB: Math.max(0.05, (updated[i].file.size / 1024 / 1024) * (quality / 100)),
          maxWidthOrHeight: maxW > 0 ? maxW : 4096,
          useWebWorker: true,
          initialQuality: quality / 100,
          fileType: updated[i].file.type,
        });
        updated[i] = { ...updated[i], status: "done", out: { blob: compressed, size: compressed.size } };
      } catch {
        updated[i] = { ...updated[i], status: "error" };
      }
      setItems([...updated]);
    }
    setBusy(false);
    const done = updated.filter((i) => i.status === "done").length;
    if (done > 0) toast.success(`${done} image${done > 1 ? "s" : ""} compressed!`);
  };

  const downloadOne = (it: Item) => {
    if (!it.out) return;
    downloadBlob(it.out.blob, it.file.name);
  };

  const downloadAll = async () => {
    const done = items.filter((i) => i.status === "done" && i.out);
    if (done.length === 0) return;
    if (done.length === 1) {
      downloadOne(done[0]);
      return;
    }
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    done.forEach((it) => zip.file(it.file.name, it.out!.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "compressed-images.zip");
  };

  const anyDone = items.some((i) => i.status === "done");
  const totalSaved = items.reduce((acc, i) => {
    if (i.status === "done" && i.out) acc += i.file.size - i.out.size;
    return acc;
  }, 0);

  return (
    <ToolPageShell
      title="Image Compressor"
      description="Compress JPG, PNG and WebP images by up to 80% — free, no upload, runs entirely in your browser."
    >
      {/* Privacy badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        Images never leave your device — compression runs 100% in the browser.
      </div>

      {/* Drop zone — full when empty, compact when items exist */}
      {items.length === 0 ? (
        <DropZone
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onFiles={addFiles}
          label="Drop images here"
          hint="JPG, PNG, WebP — multiple files supported · click to browse"
        />
      ) : (
        <label className="flex items-center gap-2 w-fit cursor-pointer rounded-xl border border-dashed border-border bg-secondary/30 hover:bg-secondary/60 transition px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
          <ImageIcon className="w-4 h-4 shrink-0" />
          <span>+ Add more images</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
            }}
          />
        </label>
      )}

      {items.length > 0 && (
        <div className="mt-5 space-y-4">
          {/* Settings bar */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            {/* Quality slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Quality</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono px-2 py-0.5 rounded bg-secondary min-w-[3.5rem] text-center">
                    {quality}%
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">{getQualityLabel(quality)}</span>
                </div>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-cyan-400"
                aria-label="Compression quality"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10% — Maximum compression</span>
                <span>80% — Recommended</span>
                <span>95% — Minimum compression</span>
              </div>
            </div>

            {/* Max dimension (optional resize) */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold shrink-0">Max dimension</span>
              <div className="flex gap-2 flex-wrap">
                {([0, 1920, 1280, 800] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setMaxW(w)}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                      maxW === w
                        ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {w === 0 ? "No resize" : `${w}px`}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Resizes width/height if larger</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={compressAll}
                disabled={busy || items.length === 0}
                className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{" "}
                    Compressing…
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" /> Compress All
                  </>
                )}
              </button>
              {anyDone && (
                <button
                  onClick={downloadAll}
                  className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {items.filter((i) => i.status === "done").length > 1 ? "Download ZIP" : "Download"}
                </button>
              )}
              <button
                onClick={clear}
                className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>

          {/* Total savings badge */}
          {totalSaved > 0 && (
            <div className="text-center text-sm text-green-400 font-semibold">
              🎉 Total saved: {formatBytes(totalSaved)}
            </div>
          )}

          {/* Image list */}
          <div className="space-y-3">
            {items.map((it) => {
              const saved = it.out ? Math.max(0, Math.round((1 - it.out.size / it.file.size) * 100)) : null;
              const isGood = saved !== null && saved >= 20;

              return (
                <div
                  key={it.id}
                  className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-4"
                >
                  {/* Preview thumbnail */}
                  <img
                    src={it.preview}
                    alt={it.file.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border bg-secondary/30"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{it.file.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatBytes(it.file.size)}</span>
                      {it.out && (
                        <>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-semibold text-foreground">{formatBytes(it.out.size)}</span>
                        </>
                      )}
                      {saved !== null && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isGood ? "bg-green-500/15 text-green-400" : "bg-amber-400/15 text-amber-400"
                          }`}
                        >
                          -{saved}%
                        </span>
                      )}
                      {it.status === "compressing" && (
                        <span className="text-xs text-cyan-400 flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                          Compressing…
                        </span>
                      )}
                      {it.status === "error" && <span className="text-xs text-red-400">Failed</span>}
                    </div>

                    {/* Progress bar */}
                    {it.status === "done" && saved !== null && (
                      <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden w-full max-w-xs">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${100 - saved}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {it.status === "done" && it.out && (
                      <button
                        onClick={() => downloadOne(it)}
                        className="p-2 rounded-xl border border-border bg-card hover:bg-secondary transition"
                        title="Download compressed image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(it.id)}
                      className="p-2 rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Drop one or more JPG, PNG or WebP images into the upload area.",
          "Adjust the Quality slider — 80% is the sweet spot for most images (great quality, significant size reduction).",
          "Optionally set a maximum dimension to also resize large images (1920px for web, 1280px for email).",
          "Click Compress All. Download images one by one or grab them all in a ZIP file.",
        ]}
      />

      <ToolSeoContent
        title="Free Image Compressor — Reduce JPG, PNG & WebP Size Online"
        description="Compress JPG, PNG and WebP images by up to 80% without visible quality loss. Batch compress multiple images, resize dimensions, and download individually or as ZIP. Free, no upload, no account."
        body={[
          "Skycally's Image Compressor reduces the file size of JPG, PNG and WebP images using the browser-image-compression library running entirely in your browser via WebAssembly. No file is ever uploaded to a server — all processing happens locally on your device. You can compress a single image or batch-process an entire folder at once, with each image showing a before/after size comparison and the exact percentage saved.",
          "The Quality slider gives you full control over the compression level. At 80% quality (the default and recommended setting), most photographs are reduced by 50–70% with virtually no visible difference to the human eye. Lowering the slider to 60% or below targets maximum file size reduction, useful for thumbnails, email attachments, and social media uploads where bandwidth matters more than pixel-perfect quality. The optional Max Dimension setting resizes oversized images — ideal for web uploads where a 6000×4000px camera photo needs to become a 1920px web image.",
          "Compressing images before uploading them to your website is one of the highest-impact SEO improvements you can make. Google PageSpeed Insights scores heavily penalise large uncompressed images, and research consistently shows that faster page load times improve both search rankings and conversion rates. E-commerce sellers, bloggers, web developers and social media managers all benefit from keeping image files as small as possible without sacrificing visual quality.",
          "For the best results, compress the final, correctly-sized image rather than compressing first and resizing later — resizing after compression can introduce additional artifacts. If you need to change the image's dimensions as well as its file size, use the Max Dimension option here in the same step, or resize first with our Image Resizer and then compress the result.",
        ]}
        faqs={[
          {
            question: "How much can image file size be reduced?",
            answer:
              "At 80% quality, most JPG photographs can be reduced by 50–70% with virtually no visible quality difference. PNG files (which are lossless) compress less — typically 10–30%. WebP images are already efficient but can be further optimised by 10–40%.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. Compression runs entirely in your browser using the browser-image-compression library and WebAssembly. Your images never leave your device and are never transmitted anywhere.",
          },
          {
            question: "What is the best quality setting?",
            answer:
              "80% is the recommended starting point for most images. It provides a significant size reduction (typically 50–60%) with no perceptible quality loss for standard viewing. For thumbnails and social media previews, 60–70% works well. For archival or print purposes, use 90%+.",
          },
          {
            question: "Can I compress PNG files?",
            answer:
              "Yes. PNG uses lossless compression by nature, so size reduction for PNGs is smaller than for JPGs — typically 10–30%. For maximum PNG compression, consider converting to WebP using our Image Converter tool.",
          },
          {
            question: "What does the Max Dimension setting do?",
            answer:
              "It resizes the image so that neither the width nor the height exceeds the specified pixel count. For example, setting 1920px will resize a 4000×3000px photo to 1920×1440px while preserving the aspect ratio. Images smaller than the limit are not resized.",
          },
          {
            question: "How many images can I compress at once?",
            answer:
              "There is no hard limit. For best performance, we recommend batches of 20–30 images at a time on most devices. Very large batches (50+ images) may slow down older devices since all processing happens in the browser's memory.",
          },
          {
            question: "Why should I compress images for my website?",
            answer:
              "Smaller images load faster, improving Google PageSpeed scores, reducing bounce rates, and lowering bandwidth costs. Google uses page speed as a ranking factor, and uncompressed images are the most common cause of poor PageSpeed scores.",
          },
          {
            question: "What formats are supported?",
            answer:
              "JPG/JPEG, PNG and WebP are fully supported. GIF files can be uploaded but only the first frame is compressed (animation is not preserved). AVIF and TIFF are not currently supported.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-compressor" />
    </ToolPageShell>
  );
}
