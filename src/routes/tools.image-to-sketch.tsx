import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-to-sketch")({
  head: () => buildToolMeta(toolBySlug("image-to-sketch", tools)),
  component: ImageToSketch,
});

type Style = "pencil" | "charcoal" | "edges";

const STYLES: { value: Style; label: string; desc: string }[] = [
  { value: "pencil", label: "Pencil", desc: "Soft pencil drawing" },
  { value: "charcoal", label: "Charcoal", desc: "Bold charcoal strokes" },
  { value: "edges", label: "Edges", desc: "Sharp edge detection" },
];

function applySketch(img: HTMLImageElement, style: Style): string {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const original = ctx.getImageData(0, 0, w, h);

  const gray = ctx.createImageData(w, h);
  for (let i = 0; i < original.data.length; i += 4) {
    const g = 0.299 * original.data[i] + 0.587 * original.data[i + 1] + 0.114 * original.data[i + 2];
    gray.data[i] = gray.data[i + 1] = gray.data[i + 2] = g;
    gray.data[i + 3] = 255;
  }

  if (style === "pencil") {
    const inverted = ctx.createImageData(w, h);
    for (let i = 0; i < gray.data.length; i += 4) {
      inverted.data[i] = inverted.data[i + 1] = inverted.data[i + 2] = 255 - gray.data[i];
      inverted.data[i + 3] = 255;
    }
    const blurred = boxBlur(inverted, w, h, 6);
    const result = ctx.createImageData(w, h);
    for (let i = 0; i < gray.data.length; i += 4) {
      const b = blurred.data[i] === 255 ? 255 : Math.min(255, (gray.data[i] * 255) / (255 - blurred.data[i]));
      result.data[i] = result.data[i + 1] = result.data[i + 2] = b;
      result.data[i + 3] = 255;
    }
    ctx.putImageData(result, 0, 0);
  } else if (style === "charcoal") {
    const inverted = ctx.createImageData(w, h);
    for (let i = 0; i < gray.data.length; i += 4) {
      inverted.data[i] = inverted.data[i + 1] = inverted.data[i + 2] = 255 - gray.data[i];
      inverted.data[i + 3] = 255;
    }
    const blurred = boxBlur(inverted, w, h, 12);
    const result = ctx.createImageData(w, h);
    for (let i = 0; i < gray.data.length; i += 4) {
      const b = blurred.data[i] === 255 ? 255 : Math.min(255, (gray.data[i] * 255) / (255 - blurred.data[i]));
      const charcoal = Math.pow(b / 255, 1.4) * 255;
      result.data[i] = result.data[i + 1] = result.data[i + 2] = charcoal;
      result.data[i + 3] = 255;
    }
    ctx.putImageData(result, 0, 0);
  } else {
    const result = ctx.createImageData(w, h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const tl = gray.data[((y - 1) * w + (x - 1)) * 4];
        const tc = gray.data[((y - 1) * w + x) * 4];
        const tr = gray.data[((y - 1) * w + (x + 1)) * 4];
        const ml = gray.data[(y * w + (x - 1)) * 4];
        const mr = gray.data[(y * w + (x + 1)) * 4];
        const bl = gray.data[((y + 1) * w + (x - 1)) * 4];
        const bc = gray.data[((y + 1) * w + x) * 4];
        const br = gray.data[((y + 1) * w + (x + 1)) * 4];
        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        const edge = 255 - mag;
        result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = edge;
        result.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(result, 0, 0);
  }

  return canvas.toDataURL("image/png");
}

function boxBlur(src: ImageData, w: number, h: number, radius: number): ImageData {
  const dst = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src.data[(ny * w + nx) * 4];
            count++;
          }
        }
      }
      const idx = (y * w + x) * 4;
      const val = sum / count;
      dst.data[idx] = dst.data[idx + 1] = dst.data[idx + 2] = val;
      dst.data[idx + 3] = 255;
    }
  }
  return dst;
}

function ImageToSketch() {
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [style, setStyle] = useState<Style>("pencil");
  const [loading, setLoading] = useState(false);
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

  const convert = () => {
    const img = imgRef.current;
    if (!img) return;
    setLoading(true);
    setTimeout(() => {
      const output = applySketch(img, style);
      setResult(output);
      setLoading(false);
    }, 50);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `sketch-${style}.png`;
    a.click();
  };

  return (
    <ToolPageShell title="Image to Sketch" description="Transform any photo into a pencil or charcoal sketch instantly.">
      <div className="w-full space-y-5">
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
                ref={imgRef} src={preview} alt="Original"
                className="max-h-48 mx-auto rounded-xl object-contain"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop an image or click to browse</p>
            </div>
          )}
        </div>

        {preview && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Sketch Style</p>
            <div className="grid grid-cols-3 gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStyle(s.value); setResult(""); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === s.value
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-[#1e2d4a] hover:border-gray-500"
                  }`}
                >
                  <p className={`text-sm font-medium ${style === s.value ? "text-cyan-300" : "text-gray-400"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {preview && (
          <button
            onClick={convert}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Converting..." : "Convert to Sketch"}
          </button>
        )}

        {result && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Result — {style}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 mb-2 text-center">Original</p>
                <img src={preview} alt="Original" className="w-full rounded-xl object-contain max-h-48" />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2 text-center">Sketch</p>
                <img src={result} alt="Sketch" className="w-full rounded-xl object-contain max-h-48" />
              </div>
            </div>
            <button
              onClick={download}
              className="w-full py-3 rounded-xl border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-sm font-medium transition-all"
            >
              Download Sketch
            </button>
          </div>
        )}
      </div>
      <HowToUse steps={[
        "Upload a photo by drag-and-drop or browse.",
        "Pick a sketch style: pencil, charcoal, or edges.",
        "Click Convert and download your sketch as PNG.",
      ]} />
          <RelatedTools currentSlug="image-to-sketch" />
          <ToolSeoContent
        title="Free Image to Sketch — Turn Photos into Drawings"
        description="Skycally's Image to Sketch tool transforms any photo into a hand-drawn sketch using advanced canvas processing. Choose from three styles: Pencil for soft lines, Charcoal for bold strokes, or Edges for sharp outlines. The conversion runs entirely in your browser — no uploads, no waiting, completely free."
        body={[]}
        faqs={[{"question":"What sketch styles are available?","answer":"Three styles are available: Pencil (soft), Charcoal (bold), and Edges (sharp outlines)."},{"question":"How long does conversion take?","answer":"Conversion is nearly instant for most images, typically under 2 seconds."},{"question":"What format is the sketch saved as?","answer":"The sketch is downloaded as a PNG file."},{"question":"Does it work on all types of photos?","answer":"It works on all photos, but portraits and landscapes with clear subjects give the best results."},{"question":"Is my image uploaded to a server?","answer":"No. All processing happens in your browser using Canvas API."}]}
      />
    </ToolPageShell>
  );
}
