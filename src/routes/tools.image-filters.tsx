import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-filters")({
  head: () => buildToolMeta(toolBySlug("image-filters", tools)),
  component: ImageFilters,
});

const FILTERS = [
  { name: "Original", style: "none" },
  { name: "Grayscale", style: "grayscale(100%)" },
  { name: "Sepia", style: "sepia(100%)" },
  { name: "Invert", style: "invert(100%)" },
  { name: "Vintage", style: "sepia(60%) contrast(85%) brightness(90%)" },
  { name: "Cold", style: "hue-rotate(180deg) saturate(120%)" },
  { name: "Warm", style: "hue-rotate(330deg) saturate(150%) brightness(105%)" },
  { name: "High Contrast", style: "contrast(180%) saturate(120%)" },
  { name: "Blur", style: "blur(2px)" },
  { name: "Bright", style: "brightness(150%) saturate(110%)" },
];

function ImageFilters() {
  const [preview, setPreview] = useState<string>("");
  const [selected, setSelected] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setSelected(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const download = async () => {
    if (!preview || !imgRef.current) return;
    setDownloading(true);
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = FILTERS[selected].style === "none" ? "" : FILTERS[selected].style;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `filtered-${FILTERS[selected].name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setDownloading(false);
  };

  return (
    <ToolPageShell
      title="Image Filters"
      description="Apply 10 photo filters to any image — preview live and download as PNG."
    >
      <div className="w-full space-y-5">
        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !preview && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
            }}
          />
          {preview ? (
            <div className="space-y-3">
              <img
                ref={imgRef}
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-xl object-contain transition-all duration-300"
                style={{ filter: FILTERS[selected].style === "none" ? undefined : FILTERS[selected].style }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
              >
                Change image
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Drop an image or click to browse</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF</p>
            </div>
          )}
        </div>

        {/* Filters */}
        {preview && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Choose Filter</p>
              <span className="text-xs text-cyan-400 font-medium">{FILTERS[selected].name}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FILTERS.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setSelected(i)}
                  className="shrink-0 flex flex-col items-center gap-2 transition-all"
                >
                  <div
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selected === i
                        ? "border-cyan-400 scale-105 shadow-lg shadow-cyan-500/20"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={preview}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.style === "none" ? undefined : f.style }}
                    />
                  </div>
                  <span className={`text-xs ${selected === i ? "text-cyan-400 font-medium" : "text-muted-foreground"}`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download */}
        {preview && (
          <button
            onClick={download}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {downloading ? "Preparing..." : `Download — ${FILTERS[selected].name}`}
          </button>
        )}
      </div>

      <AdZone id="image-filters-bottom" size="300x250" />

      <HowToUse
        steps={[
          "Drop an image or click to upload — PNG, JPG, WEBP, or GIF.",
          "Scroll through the filter row and click any thumbnail to preview it live on your image.",
          "Click Download to save the filtered image as a PNG file.",
        ]}
      />

      <ToolSeoContent
        title="Free Image Filters — Apply Photo Effects Online, No Upload"
        description="Apply 10 photo filters to any image instantly — Grayscale, Sepia, Vintage, Cold, Warm, High Contrast, and more. Preview live, download as PNG. Free, no signup, no server upload."
        body={[
          "Skycally's Image Filters tool lets you apply beautiful photo effects to any image directly in your browser. Upload a photo, scroll through 10 filter thumbnails to see a live preview on your image, select the one you want, and download the result as a high-quality PNG — all without any server upload.",
          "The 10 available filters cover a wide range of moods and styles: Original (no change), Grayscale for classic black-and-white, Sepia for a warm vintage brown tone, Invert for a negative effect, Vintage for a faded retro look, Cold for cool blue tones, Warm for golden sunset hues, High Contrast for dramatic bold colors, Blur for a soft dreamy effect, and Bright for a vivid high-saturation boost.",
          "All filters are applied using CSS filter functions rendered on an HTML Canvas at the full original image resolution. This means the output quality exactly matches your input — no lossy compression or resizing is applied during filtering. The result is a crisp PNG file ready to use in any design project.",
          "Because everything runs in your browser using the Canvas API, your image never leaves your device. There is no file size limit enforced by a server, and no account or signup is required. The tool works on any device with a modern browser — desktop, tablet, or mobile.",
        ]}
        faqs={[
          {
            question: "How many filters are available?",
            answer:
              "10 filters are available: Original, Grayscale, Sepia, Invert, Vintage, Cold, Warm, High Contrast, Blur, and Bright.",
          },
          {
            question: "Can I preview filters before downloading?",
            answer:
              "Yes. All filters are shown as live thumbnails on your actual image. Click any thumbnail to apply the preview in real time.",
          },
          {
            question: "What format is the output?",
            answer: "The filtered image is downloaded as a high-quality PNG file at the full original resolution.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. All filters are applied locally in your browser using the Canvas API. Your image never leaves your device.",
          },
          {
            question: "Can I apply multiple filters at once?",
            answer:
              "Currently one filter can be applied at a time. Download the result and re-upload it to stack filters.",
          },
          {
            question: "Will the filter reduce image quality?",
            answer:
              "No. Filters are applied at full original resolution and exported as lossless PNG. No compression or resizing occurs.",
          },
          {
            question: "What image formats can I upload?",
            answer: "PNG, JPG, WEBP, and GIF are supported as input.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The tool is fully responsive and works on smartphones and tablets running Chrome or other modern mobile browsers.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-filters" />
    </ToolPageShell>
  );
}
