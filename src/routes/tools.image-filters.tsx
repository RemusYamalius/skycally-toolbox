import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

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
    const url = URL.createObjectURL(file);
    setPreview(url);
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
    link.download = `filtered-${FILTERS[selected].name.toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setDownloading(false);
  };

  return (
    <ToolPageShell title="Image Filters" description="Apply beautiful filters to your images instantly in the browser.">
      <div className="w-full space-y-5">
        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !preview && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
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
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="text-xs text-gray-600 hover:text-cyan-400 transition-colors"
              >
                Change image
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop an image or click to browse</p>
            </div>
          )}
        </div>

        {/* Filters Row */}
        {preview && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Choose Filter</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FILTERS.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setSelected(i)}
                  className={`shrink-0 flex flex-col items-center gap-2 transition-all`}
                >
                  <div
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selected === i ? "border-cyan-400 scale-105" : "border-transparent"
                    }`}
                  >
                    <img
                      src={preview}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.style === "none" ? undefined : f.style }}
                    />
                  </div>
                  <span className={`text-xs ${selected === i ? "text-cyan-400" : "text-gray-600"}`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Button */}
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
      <HowToUse steps={[
        "Drop an image or click to upload one.",
        "Pick a filter from the row of previews.",
        "Click Download to save the filtered image as PNG.",
      ]} />
    </ToolPageShell>
  );
}
