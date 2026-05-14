import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Download, Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { upscaleImage, MAX_UPSCALE_BYTES } from "@/services/imageUpscaler";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-upscaler")({
  head: () => buildToolMeta(toolBySlug("image-upscaler", tools)),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);
  const inputUrl = file ? URL.createObjectURL(file) : null;

  const onPick = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_UPSCALE_BYTES) return toast.error("Max file size is 5MB");
    setFile(f);
    setOutput(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgressMsg("Uploading image...");
    try {
      const url = await upscaleImage(file, scale, (msg) => setProgressMsg(msg));
      setOutput(url);
      toast.success("Image upscaled!");
    } catch (e: any) {
      toast.error(e.message || "Failed to upscale");
    } finally {
      setBusy(false);
      setProgressMsg("");
    }
  };

  return (
    <ToolPageShell title="Image Upscaler" description="Enlarge images 2x or 4x in your browser. Uses bicubic interpolation — best for photos and general images.">
      {!file && <DropZone accept="image/png,image/jpeg,image/webp" onFiles={onPick} label="Drop your image" hint="PNG, JPG, or WEBP · max 5MB" />}

      {file && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-semibold">{file.name}</p>
              <p className="text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setOutput(null); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <label className="text-sm font-semibold block">Scale</label>
            <div className="flex gap-2">
              {[2, 4].map((s) => (
                <button key={s} onClick={() => setScale(s as 2 | 4)} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold border transition ${scale === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>{s}x</button>
              ))}
            </div>
            <button onClick={run} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {busy ? progressMsg : "Upscale Image"}
            </button>
          </div>

          {output && inputUrl && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold">Before / After</p>
              <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "16/10" }}>
                <img src={output} alt="Upscaled" className="absolute inset-0 w-full h-full object-contain bg-black/5" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
                  <img src={inputUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-black/5" style={{ width: `${(100 / slider) * 100}%`, maxWidth: "none" }} />
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none" style={{ left: `${slider}%` }} />
                <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-semibold pointer-events-none">Original</span>
                <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-semibold pointer-events-none">Upscaled ✨</span>
                <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(+e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
              </div>
              <a href={output} download="upscaled.png" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5">
                <Download className="w-4 h-4" /> Download Upscaled
              </a>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">Uses bicubic interpolation — best for photos and general images. Runs entirely in your browser.</p>
        </div>
      )}

      {/* ADSENSE_ZONE: image-upscaler-bottom 728x90 */}
      <AdZone id="image-upscaler-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload a PNG, JPG, or WEBP (up to 5MB).",
        "Choose 2x or 4x and click Upscale — runs in your browser.",
        "Compare with the slider, then download the result.",
      ]} />
          <RelatedTools currentSlug="image-upscaler" />
          <ToolSeoContent
        title="Free Image Upscaler — Enlarge Photos 2x or 4x"
        description="Skycally's Image Upscaler enlarges your images 2x or 4x without losing quality. Using advanced upscaling technology, it reconstructs fine details that would normally be lost when resizing. It's perfect for improving low-resolution photos, product images, or social media graphics. The tool runs entirely in your browser with no file uploads required."
        body={[]}
        faqs={[{"question":"How much can I upscale an image?","answer":"You can upscale images 2x or 4x their original size."},{"question":"Will upscaling reduce image quality?","answer":"Our upscaler uses advanced algorithms to preserve and enhance details. Results are significantly better than simple resizing."},{"question":"What image formats are supported?","answer":"PNG, JPG, and WEBP formats are supported for both input and output."},{"question":"Is there a maximum image size?","answer":"For best performance, we recommend images under 10MB. Very large images may take longer to process."},{"question":"Is the tool free to use?","answer":"Yes, completely free with no signup required."}]}
      />
    </ToolPageShell>
  );
}
