import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/add-watermark")({
  head: () => buildToolMeta(toolBySlug("add-watermark", tools)),
  component: AddWatermark,
});

type Position =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

const POSITIONS: { label: string; value: Position }[] = [
  { label: "↖", value: "top-left" },
  { label: "↑", value: "top-center" },
  { label: "↗", value: "top-right" },
  { label: "←", value: "middle-left" },
  { label: "✦", value: "middle-center" },
  { label: "→", value: "middle-right" },
  { label: "↙", value: "bottom-left" },
  { label: "↓", value: "bottom-center" },
  { label: "↘", value: "bottom-right" },
];

function getXY(
  pos: Position,
  cw: number,
  ch: number,
  fontSize: number,
  textWidth: number,
  padding: number
): [number, number] {
  const col = pos.includes("left") ? "left" : pos.includes("right") ? "right" : "center";
  const row = pos.startsWith("top") ? "top" : pos.startsWith("bottom") ? "bottom" : "middle";
  const x =
    col === "left" ? padding :
    col === "right" ? cw - textWidth - padding :
    (cw - textWidth) / 2;
  const y =
    row === "top" ? padding + fontSize :
    row === "bottom" ? ch - padding :
    ch / 2 + fontSize / 3;
  return [x, y];
}

function AddWatermark() {
  const [preview, setPreview] = useState<string>("");
  const [text, setText] = useState("© Skycally");
  const [fontSize, setFontSize] = useState(32);
  const [opacity, setOpacity] = useState(70);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [result, setResult] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setResult("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img || !preview) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = opacity / 100;
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "alphabetic";
    const textWidth = ctx.measureText(text).width;
    const padding = 24;
    const [x, y] = getXY(position, canvas.width, canvas.height, fontSize, textWidth, padding);
    ctx.fillText(text, x, y);
    setResult(canvas.toDataURL("image/png"));
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "watermarked.png";
    a.click();
  };

  return (
    <ToolPageShell title="Add Watermark" description="Add custom text watermarks to your images in seconds.">
      <div className="w-full space-y-5">
        {/* Upload */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !preview && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {preview ? (
            <div className="space-y-2">
              <img
                ref={imgRef} src={preview} alt="Preview"
                className="max-h-52 mx-auto rounded-xl object-contain"
              />
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="text-xs text-gray-600 hover:text-cyan-400 transition-colors"
              >
                Change image
              </button>
            </div>
          ) : (
            <div className="py-8 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop an image or click to browse</p>
            </div>
          )}
        </div>

        {preview && (
          <>
            {/* Watermark Text */}
            <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Watermark Text</label>
                <input
                  value={text}
                  onChange={(e) => { setText(e.target.value); setResult(""); }}
                  className="w-full bg-[#0a0f1e] border border-[#1e2d4a] rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="Your watermark..."
                />
              </div>

              {/* Font Size */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Font Size</label>
                  <span className="text-cyan-400 font-mono text-xs">{fontSize}px</span>
                </div>
                <input
                  type="range" min={12} max={120} value={fontSize}
                  onChange={(e) => { setFontSize(Number(e.target.value)); setResult(""); }}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Opacity</label>
                  <span className="text-cyan-400 font-mono text-xs">{opacity}%</span>
                </div>
                <input
                  type="range" min={10} max={100} value={opacity}
                  onChange={(e) => { setOpacity(Number(e.target.value)); setResult(""); }}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Color */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Color</label>
                <input
                  type="color" value={color}
                  onChange={(e) => { setColor(e.target.value); setResult(""); }}
                  className="w-10 h-10 rounded-xl border border-[#1e2d4a] bg-transparent cursor-pointer"
                />
                <span className="font-mono text-sm text-gray-400">{color}</span>
              </div>
            </div>

            {/* Position Grid */}
            <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4">
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Position</label>
              <div className="grid grid-cols-3 gap-2 max-w-[160px]">
                {POSITIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setPosition(p.value); setResult(""); }}
                    className={`h-10 rounded-xl text-lg transition-all ${
                      position === p.value
                        ? "bg-cyan-500/20 border border-cyan-500 text-cyan-400"
                        : "border border-[#1e2d4a] text-gray-600 hover:border-gray-500 hover:text-gray-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={apply}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Apply Watermark
            </button>

            {/* Result */}
            {result && (
              <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Result</p>
                <img src={result} alt="Watermarked" className="max-h-64 mx-auto rounded-xl object-contain" />
                <button
                  onClick={download}
                  className="w-full py-3 rounded-xl border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-sm font-medium transition-all"
                >
                  Download Image
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <HowToUse steps={[
        "Upload an image by drag-and-drop or browse.",
        "Customize text, font size, opacity, color and position.",
        "Click Apply Watermark, then download the result.",
      ]} />
    </ToolPageShell>
  );
}
