import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileCode } from "lucide-react";
import QRCode from "qrcode";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/qr-generator")({
  head: () => ({
    meta: [
      { title: "QR Code Generator — Skycally" },
      { name: "description", content: "Create custom QR codes from any URL or text. Free, instant, browser-based." },
      { property: "og:title", content: "QR Code Generator · Skycally" },
      { property: "og:description", content: "Generate QR codes with custom colors and sizes." },
    ],
  }),
  component: QrGeneratorPage,
});

const SIZES = { Small: 200, Medium: 400, Large: 800 } as const;
type SizeKey = keyof typeof SIZES;

function QrGeneratorPage() {
  const [text, setText] = useState("https://skycally.com");
  const [size, setSize] = useState<SizeKey>("Medium");
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    QRCode.toCanvas(canvasRef.current, text, {
      width: SIZES[size],
      margin: 2,
      color: { dark: color, light: bg },
    }).catch(() => {});
  }, [text, size, color, bg]);

  const downloadPng = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) downloadBlob(blob, "qrcode.png");
    }, "image/png");
  };

  const downloadSvg = async () => {
    try {
      const svg = await QRCode.toString(text, {
        type: "svg",
        width: SIZES[size],
        margin: 2,
        color: { dark: color, light: bg },
      });
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
    } catch {
      toast.error("Failed to generate SVG");
    }
  };

  return (
    <ToolPageShell title="QR Code Generator" description="Create custom QR codes from any URL or text — instantly, in your browser.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">Content</label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL or text..." className="min-h-[100px]" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Size</label>
            <div className="flex gap-2">
              {(Object.keys(SIZES) as SizeKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold border transition ${size === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">QR Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded cursor-pointer border border-border" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-14 rounded cursor-pointer border border-border" />
                <input type="text" value={bg} onChange={(e) => setBg(e.target.value)} className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center gap-5">
          <div className="rounded-xl p-4" style={{ background: bg }}>
            <canvas ref={canvasRef} className="max-w-full h-auto" style={{ maxWidth: 320 }} />
          </div>
          <div className="flex flex-wrap gap-3 w-full">
            <button onClick={downloadPng} disabled={!text} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5 disabled:opacity-50">
              <Download className="w-4 h-4" /> PNG
            </button>
            <button onClick={downloadSvg} disabled={!text} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 disabled:opacity-50 hover:bg-secondary">
              <FileCode className="w-4 h-4" /> SVG
            </button>
          </div>
        </div>
      </div>

      {/* ADSENSE_ZONE: qr-generator-bottom 728x90 */}
      <AdZone id="qr-generator-bottom" size="728x90" />

      <HowToUse steps={[
        "Type or paste a URL or any text.",
        "Pick a size and customize the colors.",
        "Download your QR code as PNG or SVG.",
      ]} />
    </ToolPageShell>
  );
}
