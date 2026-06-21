import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-resizer")({
  head: () => buildToolMeta(toolBySlug("image-resizer", tools)),
  component: ImageResizer,
});

const PRESETS: { name: string; w: number; h: number }[] = [
  { name: "HD", w: 1280, h: 720 },
  { name: "Full HD", w: 1920, h: 1080 },
  { name: "4K", w: 3840, h: 2160 },
  { name: "IG Square", w: 1080, h: 1080 },
  { name: "IG Story", w: 1080, h: 1920 },
  { name: "Twitter Header", w: 1500, h: 500 },
  { name: "Facebook Cover", w: 820, h: 312 },
];

function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  format: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          b ? resolve(b) : reject(new Error("encode failed"));
        },
        mime,
        quality / 100,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load failed"));
    };
    img.src = url;
  });
}

function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [orig, setOrig] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode] = useState<"pixels" | "percent">("pixels");
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [pct, setPct] = useState(100);
  const [lock, setLock] = useState(true);
  const [format, setFormat] = useState<"jpg" | "png" | "webp">("jpg");
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [estSize, setEstSize] = useState<number | null>(null);
  const previewUrl = useRef<string>("");

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = url;
    img.onload = () => {
      setFile(f);
      setOrig({ w: img.naturalWidth, h: img.naturalHeight });
      setW(img.naturalWidth);
      setH(img.naturalHeight);
      setPct(100);
    };
    img.src = url;
  };

  const targetW = mode === "pixels" ? w : Math.round(((orig?.w ?? 0) * pct) / 100);
  const targetH = mode === "pixels" ? h : Math.round(((orig?.h ?? 0) * pct) / 100);

  const setWidth = (v: number) => {
    setW(v);
    if (lock && orig) setH(Math.round((v * orig.h) / orig.w));
  };
  const setHeight = (v: number) => {
    setH(v);
    if (lock && orig) setW(Math.round((v * orig.w) / orig.h));
  };

  // Estimate size on changes
  useEffect(() => {
    if (!file || !targetW || !targetH) {
      setEstSize(null);
      return;
    }
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const blob = await resizeImage(file, targetW, targetH, format, quality);
        if (!cancel) setEstSize(blob.size);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [file, targetW, targetH, format, quality]);

  const download = async () => {
    if (!file || !targetW || !targetH) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file, targetW, targetH, format, quality);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resized-${targetW}x${targetH}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Download started!");
    } catch {
      toast.error("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Image Resizer"
      description="Resize images by exact pixels or percentage, with quality control."
    >
      {!file ? (
        <DropZone accept="image/*" onFiles={onFiles} label="Drop an image here" hint="PNG, JPG, WEBP or GIF" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center min-h-[320px]">
            <img src={previewUrl.current} alt="preview" className="max-h-[420px] w-auto rounded-xl" />
          </div>
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original</span>
                <span className="font-mono">
                  {orig?.w} × {orig?.h} px
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Target</span>
                <span className="font-mono">
                  {targetW} × {targetH} px
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">File size</span>
                <span className="font-mono">
                  {formatBytes(file.size)} → {estSize ? formatBytes(estSize) : "…"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {(["pixels", "percent"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold border ${mode === m ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                >
                  {m === "pixels" ? "By Pixels" : "By Percentage"}
                </button>
              ))}
            </div>

            {mode === "pixels" ? (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <label className="flex-1 text-xs text-muted-foreground">
                    Width
                    <input
                      type="number"
                      value={w}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    onClick={() => setLock((l) => !l)}
                    title="Lock aspect ratio"
                    className={`mb-1 px-2 py-2 rounded-lg border ${lock ? "border-[var(--cyan-brand)] text-[var(--cyan-brand)]" : "border-border text-muted-foreground"}`}
                  >
                    🔗
                  </button>
                  <label className="flex-1 text-xs text-muted-foreground">
                    Height
                    <input
                      type="number"
                      value={h}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="block text-xs text-muted-foreground">
                Scale: {pct}%
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </label>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setMode("pixels");
                      setW(p.w);
                      setH(p.h);
                    }}
                    className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[11px] hover:bg-secondary"
                  >
                    {p.name} {p.w}×{p.h}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-muted-foreground">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "jpg" | "png" | "webp")}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>

            {format !== "png" && (
              <label className="block text-xs text-muted-foreground">
                Quality: {quality}%
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </label>
            )}

            <button
              onClick={download}
              disabled={busy || !targetW || !targetH}
              className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50"
            >
              {busy ? "Resizing…" : "Resize & Download"}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setOrig(null);
                setEstSize(null);
              }}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Choose another image
            </button>
          </div>
        </div>
      )}
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse
        steps={[
          "Drop an image to upload it.",
          "Choose pixels or percentage, then set your target size and format.",
          "Click Resize & Download to save the new image.",
        ]}
      />
      <ToolSeoContent
        title="Free Image Resizer — Resize Images Online to Exact Dimensions"
        description="Resize images to any pixel size or percentage scale instantly in your browser. Includes presets for Instagram, Twitter, Facebook, YouTube and more. Export as JPG, PNG or WebP. No upload, no signup, free."
        body={[
          "Skycally's Image Resizer lets you change the dimensions of any image instantly in your browser. Enter exact pixel dimensions, resize by percentage, or choose from built-in platform presets for Instagram, Twitter, Facebook, YouTube, and LinkedIn — all the common sizes in one click. The Lock Aspect Ratio toggle prevents distortion by automatically adjusting the second dimension when you change the first.",
          "The tool supports three output formats: JPG (smallest file size, best for photos), PNG (lossless, best for graphics and screenshots), and WebP (modern format, excellent compression for web use). You can also control the quality level for JPG and WebP exports — a setting of 85–90% is generally indistinguishable from 100% while producing significantly smaller files.",
          "All processing happens locally in your browser using the HTML5 Canvas API. Your image is never uploaded to any server, making this tool safe for personal photos, confidential screenshots, and proprietary design assets. The original file is not modified — you always download a new resized copy.",
          "Common use cases include resizing photos for email attachments, preparing images for social media posts, reducing file size before uploading to a website, scaling product images for e-commerce listings, and converting images to standard print dimensions.",
        ]}
        faqs={[
          {
            question: "Can I resize without distorting the image?",
            answer:
              "Yes. Enable the Lock Aspect Ratio toggle before changing dimensions. When locked, adjusting width automatically updates height (and vice versa) to maintain the original proportions. Disable it only if you intentionally want to stretch or squish the image.",
          },
          {
            question: "What are the social media presets?",
            answer:
              "The tool includes presets for: Instagram Square (1080×1080), Instagram Portrait (1080×1350), Instagram Story (1080×1920), Twitter/X Post (1200×675), Twitter Header (1500×500), Facebook Cover (820×312), Facebook Post (1200×630), YouTube Thumbnail (1280×720), and LinkedIn Cover (1584×396).",
          },
          {
            question: "What is the maximum resolution I can resize to?",
            answer:
              "There is no enforced maximum. You can upscale images to any resolution. However, upscaling beyond 2× the original size will produce visible quality loss (pixelation) since the tool cannot invent detail that was not in the original. For high-quality upscaling, use our Image Upscaler tool which uses AI-based Lanczos resampling.",
          },
          {
            question: "What output format should I choose?",
            answer:
              "JPG for photos and images where file size matters (social media, email). PNG for graphics, logos, screenshots, and images with text or transparency. WebP for web use where you want the best compression-to-quality ratio. Most modern browsers and platforms support WebP.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. The entire resize operation runs in your browser using the HTML5 Canvas API. Your image never leaves your device. This makes it safe for sensitive photos, confidential screenshots, and private content.",
          },
          {
            question: "Can I resize multiple images at once?",
            answer:
              "Currently the tool resizes one image at a time. For batch processing multiple images simultaneously, use our Image Compressor tool which handles multiple files at once and also allows resizing via the Max Dimension setting.",
          },
          {
            question: "Why does my resized image look blurry?",
            answer:
              "Blurriness when resizing occurs for two reasons: (1) upscaling beyond 2× the original — the Canvas API must interpolate (guess) missing pixels; (2) saving at low quality. Try setting quality to 90%+ for JPG/WebP, or switch to PNG for lossless output. For significant upscaling, use our dedicated Image Upscaler.",
          },
          {
            question: "Can I resize to print dimensions (inches/cm)?",
            answer:
              "The tool resizes in pixels, which is what digital files use. For print, multiply your target size in inches by the DPI (dots per inch) to get pixels. For standard print quality (300 DPI), a 4×6 inch photo = 1200×1800 pixels. For standard screen (72 DPI), a 4×6 inch image = 288×432 pixels.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-resizer" />
    </ToolPageShell>
  );
}
