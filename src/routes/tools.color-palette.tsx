import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/color-palette")({
  head: () => buildToolMeta(toolBySlug("color-palette", tools)),
  component: ColorPaletteExtractor,
});

interface Color {
  hex: string;
  rgb: string;
  count: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function quantize(data: Uint8ClampedArray, count: number): Color[] {
  const colorMap: Record<string, number> = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const a = data[i + 3];
    if (a < 128) continue;
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }
  return Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, cnt]) => {
      const [r, g, b] = key.split(",").map(Number);
      return { hex: rgbToHex(r, g, b), rgb: `rgb(${r}, ${g}, ${b})`, count: cnt };
    });
}

function ColorPaletteExtractor() {
  const [colors, setColors] = useState<Color[]>([]);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [colorCount, setColorCount] = useState(6);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractColors = useCallback(
    (file: File) => {
      setLoading(true);
      const url = URL.createObjectURL(file);
      setPreview(url);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);
        const { data } = ctx.getImageData(0, 0, 200, 200);
        const palette = quantize(data, colorCount);
        setColors(palette);
        setLoading(false);
      };
      img.src = url;
    },
    [colorCount],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) extractColors(file);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  };

  const allHex = colors.map((c) => c.hex).join(", ");

  return (
    <ToolPageShell
      title="Color Palette Extractor"
      description="Extract the dominant colors from any image instantly. Get HEX and RGB values with one click."
    >
      <canvas ref={canvasRef} className="hidden" />
      <div className="space-y-5">
        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all group"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) extractColors(e.target.files[0]);
            }}
          />
          {preview ? (
            <div className="space-y-2">
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
              <p className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                Click to change image
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center group-hover:border-cyan-500/50 transition-all">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Drop an image or click to browse</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF</p>
            </div>
          )}
        </div>

        {/* Color count slider */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <span className="text-sm text-muted-foreground shrink-0">Colors to extract</span>
          <input
            type="range"
            min={3}
            max={12}
            value={colorCount}
            onChange={(e) => setColorCount(Number(e.target.value))}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-cyan-400 font-mono font-bold w-6 text-center">{colorCount}</span>
        </div>

        {loading && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">Extracting colors...</p>
          </div>
        )}

        {colors.length > 0 && !loading && (
          <div className="space-y-4">
            {/* Color strip */}
            <div className="flex rounded-2xl overflow-hidden h-14 shadow-sm">
              {colors.map((c) => (
                <div
                  key={c.hex}
                  className="flex-1 cursor-pointer hover:scale-y-110 transition-transform origin-bottom"
                  style={{ backgroundColor: c.hex }}
                  onClick={() => copy(c.hex)}
                  title={`Click to copy ${c.hex}`}
                />
              ))}
            </div>

            {/* Color cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colors.map((c) => (
                <div key={c.hex} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="h-16 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => copy(c.hex)}
                    title={`Click to copy ${c.hex}`}
                  />
                  <div className="p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm text-cyan-400">{c.hex}</span>
                      <button
                        onClick={() => copy(c.hex)}
                        className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
                      >
                        {copied === c.hex ? "✓" : "Copy"}
                      </button>
                    </div>
                    <button
                      onClick={() => copy(c.rgb)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono block text-left"
                    >
                      {c.rgb}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Copy all */}
            <button
              onClick={() => copy(allHex)}
              className="w-full py-3 rounded-2xl border border-border text-muted-foreground hover:border-cyan-500/50 hover:text-cyan-400 text-sm font-medium transition-all"
            >
              {copied === allHex ? "✓ Copied all!" : "Copy all HEX values"}
            </button>
          </div>
        )}
      </div>

      <AdZone id="color-palette-bottom" size="300x250" />

      <HowToUse
        steps={[
          "Drop an image or click to upload — PNG, JPG, WEBP, or GIF.",
          "Drag the slider to choose how many colors to extract (3–12).",
          "Click any color swatch or HEX/RGB value to copy it. Use 'Copy all' to grab the full palette.",
        ]}
      />

      <ToolSeoContent
        title="Free Color Palette Extractor — Get HEX & RGB Colors from Any Image"
        description="Extract the dominant colors from any image instantly. Get HEX and RGB values for up to 12 colors. Free, no signup, runs entirely in your browser — perfect for designers and developers."
        body={[
          "Skycally's Color Palette Extractor analyzes any image and identifies its most dominant colors in seconds. Upload a photo, illustration, screenshot, or any image file, and the tool returns up to 12 colors with their HEX and RGB values — all running locally in your browser with no upload required.",
          "Extracting a color palette is a fundamental workflow in design and development. Whether you want to match the colors of a logo, recreate the mood of a photograph, build a consistent UI color scheme from a brand image, or identify the exact shades used in an artwork, this tool gives you the precise values you need with a single click.",
          "The color extraction uses a quantization algorithm that groups visually similar pixels and identifies the most statistically dominant color clusters. A slider lets you control how many colors to extract — from 3 for a minimal palette to 12 for a full, detailed breakdown. Click any color swatch or value to copy it to your clipboard instantly, or use 'Copy all' to grab the entire palette as a comma-separated HEX list.",
          "The visual color strip at the top gives you an instant proportional overview of the palette, showing how much of the image each color occupies. This is especially useful for understanding whether an image is dominated by a single hue or balanced across multiple tones.",
        ]}
        faqs={[
          {
            question: "How many colors can I extract?",
            answer:
              "You can extract between 3 and 12 dominant colors using the slider. Adjust it before or after uploading — the palette updates automatically.",
          },
          {
            question: "How accurate is the color extraction?",
            answer:
              "The tool uses color quantization to group similar pixels and identify the most dominant color clusters. Results closely represent the visual distribution of colors in the image.",
          },
          {
            question: "Can I copy the color values?",
            answer:
              "Yes. Click any color swatch or HEX/RGB value to copy it to your clipboard. Use the 'Copy all HEX values' button to copy the entire palette at once.",
          },
          {
            question: "What image formats are supported?",
            answer: "PNG, JPG, WEBP, and GIF are all supported as input.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. All color extraction runs locally in your browser using the Canvas API. Your image never leaves your device.",
          },
          {
            question: "What are HEX and RGB color formats?",
            answer:
              "HEX is a 6-digit code (e.g. #FF5733) used in CSS and design tools. RGB (e.g. rgb(255, 87, 51)) expresses the same color as red, green, and blue channel values from 0–255.",
          },
          {
            question: "Can I use this to match colors from a brand logo?",
            answer:
              "Yes. Upload the logo image and extract its dominant colors to get the exact HEX values used in the design, ready to paste into CSS, Figma, or any design tool.",
          },
          {
            question: "Is this tool free?",
            answer: "Yes, completely free with no signup required.",
          },
        ]}
      />

      <RelatedTools currentSlug="color-palette" />
    </ToolPageShell>
  );
}
