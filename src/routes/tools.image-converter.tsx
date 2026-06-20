import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-converter")({
  head: () => buildToolMeta(toolBySlug("image-converter", tools)),
  component: ImageConverter,
});

const OUTPUT_FORMATS = [
  { mime: "image/webp", label: "WEBP", ext: "webp" },
  { mime: "image/jpeg", label: "JPG", ext: "jpg" },
  { mime: "image/png", label: "PNG", ext: "png" },
] as const;

type Fmt = (typeof OUTPUT_FORMATS)[number]["mime"];

interface Item {
  file: File;
  preview: string;
  out?: { blob: Blob; size: number; name: string; url: string };
  error?: string;
}

async function convertOne(file: File, target: Fmt, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Cannot read image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (target === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Conversion failed"))), target, quality / 100),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageConverter() {
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<Fmt>("image/webp");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);

  const fmt = OUTPUT_FORMATS.find((f) => f.mime === target)!;

  const add = (files: File[]) => {
    const newItems: Item[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setItems((p) => [...p, ...newItems]);
  };

  const remove = (i: number) => {
    setItems((p) => {
      const copy = [...p];
      URL.revokeObjectURL(copy[i].preview);
      if (copy[i].out?.url) URL.revokeObjectURL(copy[i].out!.url);
      copy.splice(i, 1);
      return copy;
    });
  };

  const convertAll = async () => {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      const updated = await Promise.all(
        items.map(async (it) => {
          try {
            const blob = await convertOne(it.file, target, quality);
            const name = it.file.name.replace(/\.[^.]+$/, "") + "." + fmt.ext;
            const url = URL.createObjectURL(blob);
            ok++;
            return { ...it, out: { blob, size: blob.size, name, url }, error: undefined };
          } catch {
            fail++;
            return { ...it, error: "Conversion failed" };
          }
        }),
      );
      setItems(updated);
      if (ok > 0) toast.success(`Converted ${ok} image${ok > 1 ? "s" : ""}!`);
      if (fail > 0) toast.error(`${fail} file${fail > 1 ? "s" : ""} could not be converted.`);
    } finally {
      setBusy(false);
    }
  };

  const downloadAllZip = async () => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    items.forEach((it) => {
      if (it.out) zip.file(it.out.name, it.out.blob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "converted-images.zip");
  };

  const ready = items.some((i) => i.out);
  const showQuality = target === "image/jpeg" || target === "image/webp";

  return (
    <ToolPageShell
      title="Image Converter"
      description="Convert PNG, JPG and WebP images instantly in your browser. No upload, no signup."
    >
      <DropZone
        multiple
        accept="image/*"
        onFiles={add}
        label="Drop images here"
        hint="PNG, JPG, WebP, BMP, GIF supported"
      />

      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Controls */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Convert to:</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as Fmt)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {OUTPUT_FORMATS.map((f) => (
                  <option key={f.mime} value={f.mime}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {showQuality && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Quality:</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-28"
                />
                <span className="text-sm font-mono w-8">{quality}%</span>
              </div>
            )}

            <div className="ml-auto flex gap-2">
              {ready && (
                <button
                  onClick={downloadAllZip}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Download all (ZIP)
                </button>
              )}
              <button
                onClick={convertAll}
                disabled={busy}
                className="rounded-lg bg-foreground text-background font-medium px-5 py-2 disabled:opacity-50"
              >
                {busy ? "Converting..." : "Convert all"}
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="grid gap-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
                {/* Thumbnail */}
                <img
                  src={it.out?.url ?? it.preview}
                  alt={it.file.name}
                  className="w-14 h-14 object-cover rounded-lg border border-border shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{it.file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(it.file.size)}
                    {it.out && (
                      <>
                        {" → "}
                        <span className="text-foreground font-semibold">{formatBytes(it.out.size)}</span>
                        {it.out.size < it.file.size && (
                          <span className="ml-1 text-green-500">
                            ({Math.round((1 - it.out.size / it.file.size) * 100)}% smaller)
                          </span>
                        )}
                      </>
                    )}
                    {it.error && <span className="text-red-500 ml-1">{it.error}</span>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {it.out && (
                    <button
                      onClick={() => downloadBlob(it.out!.blob, it.out!.name)}
                      className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2"
                    >
                      Download
                    </button>
                  )}
                  <button
                    onClick={() => remove(i)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Drop one or more images into the box above (PNG, JPG, WebP, BMP or GIF).",
          "Pick your output format — WebP for web use, JPG for photos, PNG for transparency.",
          "Adjust quality if needed, click Convert all, then download individually or as a ZIP.",
        ]}
      />

      <ToolSeoContent
        title="Free Image Converter — Convert PNG, JPG, WebP Online Instantly"
        description="Convert images between PNG, JPG, WebP and more — instantly in your browser. Batch convert multiple files at once. No upload, no signup, no file size limit."
        body={[
          "Skycally's image converter runs entirely in your browser using the HTML5 Canvas API. Your images are never uploaded to any server — conversion happens locally on your device in seconds, regardless of file size. This makes it the most private image converter available online.",
          "WebP is the recommended format for web use, offering 25–35% smaller file sizes than JPG at the same visual quality, and supporting transparency like PNG. JPG is best for photographs where file size matters and transparency isn't needed. PNG is ideal for logos, screenshots, and images that require a transparent background.",
          "The quality slider (available for JPG and WebP) lets you control the trade-off between file size and visual quality. A setting of 85–92% is generally indistinguishable from 100% quality while producing significantly smaller files. Use the savings percentage shown next to each file to find the right balance.",
          "Batch conversion lets you convert dozens of images simultaneously — just drop them all at once, pick your format, and download the results as a ZIP archive. This is ideal for preparing image assets for websites, apps, or social media campaigns.",
        ]}
        faqs={[
          {
            question: "What image formats can I convert between?",
            answer:
              "You can convert from PNG, JPG/JPEG, WebP, BMP, and GIF to PNG, JPG, or WebP output formats. WebP is recommended for web use as it offers the best compression-to-quality ratio.",
          },
          {
            question: "Are my images uploaded to a server?",
            answer:
              "No. All conversion happens locally in your browser using the HTML5 Canvas API. Your images never leave your device and are never stored on any server.",
          },
          {
            question: "Will I lose quality when converting to JPG?",
            answer:
              "JPG uses lossy compression, so some quality reduction occurs. The default 92% quality setting produces results virtually identical to the original. You can adjust quality using the slider — 80–90% is a good balance for most use cases.",
          },
          {
            question: "Can I convert multiple images at once?",
            answer:
              "Yes. Drop multiple images at once or add them one by one. Click Convert all to process everything simultaneously, then download files individually or as a single ZIP archive.",
          },
          {
            question: "Why is my converted file larger than the original?",
            answer:
              "This can happen when converting from a lossy format (JPG) to a lossless one (PNG), since PNG stores every pixel without compression loss. It can also happen with very small original files. Use WebP for the best balance of quality and file size.",
          },
          {
            question: "Does this converter support transparency?",
            answer:
              "Yes. PNG and WebP both support transparency. When converting a transparent PNG or WebP to JPG, the transparent areas are filled with white, since JPG does not support transparency.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no enforced file size limit. However, very large images (above 30–50 MB) may be slow to process depending on your device's memory and processing power, since everything runs locally in your browser.",
          },
          {
            question: "What is the difference between WebP and PNG?",
            answer:
              "Both WebP and PNG support transparency. WebP uses advanced compression to produce smaller files — typically 26% smaller than PNG. PNG is lossless and universally supported. Use WebP for web assets where file size matters, and PNG when maximum compatibility or lossless quality is required.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-converter" />
    </ToolPageShell>
  );
}
