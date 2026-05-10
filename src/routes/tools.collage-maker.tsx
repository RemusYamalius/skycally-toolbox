import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/collage-maker")({
  head: () => ({
    meta: [
      { title: "Photo Collage Maker — Combine 2–9 photos · Skycally" },
      { name: "description", content: "Make a beautiful photo collage from 2 to 9 images. Pick a layout, gap, background and download as PNG." },
      { property: "og:title", content: "Photo Collage Maker · Skycally" },
      { property: "og:description", content: "Combine 2–9 photos into a stylish grid collage." },
    ],
  }),
  component: CollageMaker,
});

type Cell = { x: number; y: number; w: number; h: number };
type Layout = { id: string; name: string; count: number; cells: Cell[] };

const LAYOUTS: Layout[] = [
  { id: "2-h", name: "2 ▍▍", count: 2, cells: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: "2-v", name: "2 ═", count: 2, cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] },
  { id: "3-h", name: "3 cols", count: 3, cells: [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }] },
  { id: "3-t", name: "3 T-shape", count: 3, cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
  { id: "4-grid", name: "4 grid", count: 4, cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
  { id: "4-cols", name: "4 cols", count: 4, cells: [0, 1, 2, 3].map((i) => ({ x: i / 4, y: 0, w: 1 / 4, h: 1 })) },
  { id: "6-grid", name: "6 (3×2)", count: 6, cells: Array.from({ length: 6 }, (_, i) => ({ x: (i % 3) / 3, y: Math.floor(i / 3) / 2, w: 1 / 3, h: 1 / 2 })) },
  { id: "9-grid", name: "9 (3×3)", count: 9, cells: Array.from({ length: 9 }, (_, i) => ({ x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3 })) },
];

const SIZES = [
  { id: "sq", name: "Square 1080", w: 1080, h: 1080 },
  { id: "ls", name: "Landscape", w: 1920, h: 1080 },
  { id: "pt", name: "Portrait", w: 1080, h: 1920 },
];

function CollageMaker() {
  const [files, setFiles] = useState<File[]>([]);
  const [layoutId, setLayoutId] = useState("4-grid");
  const [sizeId, setSizeId] = useState("sq");
  const [gap, setGap] = useState(8);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [radius, setRadius] = useState(8);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const layout = useMemo(() => LAYOUTS.find((l) => l.id === layoutId)!, [layoutId]);
  const size = useMemo(() => SIZES.find((s) => s.id === sizeId)!, [sizeId]);

  const onFiles = (next: File[]) => {
    const imgs = next.filter((f) => f.type.startsWith("image/"));
    setFiles((curr) => [...curr, ...imgs].slice(0, 9));
  };

  const removeAt = (i: number) => setFiles((curr) => curr.filter((_, idx) => idx !== i));

  const loadImages = async (fs: File[]): Promise<HTMLImageElement[]> => Promise.all(fs.map((f) => new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  })));

  const draw = async (canvas: HTMLCanvasElement) => {
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const imgs = await loadImages(files.slice(0, layout.count));
    layout.cells.forEach((cell, i) => {
      const img = imgs[i];
      if (!img) return;
      const x = cell.x * size.w + gap / 2;
      const y = cell.y * size.h + gap / 2;
      const w = cell.w * size.w - gap;
      const h = cell.h * size.h - gap;
      ctx.save();
      ctx.beginPath();
      const r = Math.min(radius, w / 2, h / 2);
      // roundRect fallback
      if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, w, h, r);
      else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); }
      ctx.closePath();
      ctx.clip();
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      ctx.restore();
    });
  };

  // Live preview render (downscaled into preview canvas)
  useEffect(() => {
    const c = previewRef.current;
    if (!c || !files.length) return;
    let canceled = false;
    (async () => {
      const off = document.createElement("canvas");
      await draw(off);
      if (canceled) return;
      const maxW = 600;
      const scale = Math.min(1, maxW / size.w);
      c.width = size.w * scale;
      c.height = size.h * scale;
      c.getContext("2d")!.drawImage(off, 0, 0, c.width, c.height);
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, layoutId, sizeId, gap, bgColor, radius]);

  const download = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const c = document.createElement("canvas");
      await draw(c);
      c.toBlob((blob) => {
        if (!blob) { toast.error("❌ Something went wrong. Please try again."); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "collage.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("✅ Download started!");
      }, "image/png");
    } catch {
      toast.error("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const compatibleLayouts = LAYOUTS.filter((l) => l.count <= Math.max(files.length, 9));

  return (
    <ToolPageShell title="Photo Collage Maker" description="Combine 2–9 photos into a stylish grid collage.">
      <div className="space-y-5">
        <DropZone accept="image/*" multiple onFiles={onFiles} label="Drop 2 to 9 images" hint="They fill the layout in order — re-upload to change" />

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeAt(i)} className="absolute top-0 right-0 bg-black/60 p-0.5"><X className="w-3 h-3 text-white" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center min-h-[300px]">
            {files.length > 0 ? <canvas ref={previewRef} className="max-w-full h-auto rounded-lg shadow" /> : <p className="text-muted-foreground text-sm">Add images to see the preview.</p>}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Layout</p>
              <div className="grid grid-cols-2 gap-1.5">
                {compatibleLayouts.map((l) => (
                  <button key={l.id} onClick={() => setLayoutId(l.id)} className={`rounded-md px-2 py-1.5 text-[11px] border ${layoutId === l.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Canvas size</p>
              <div className="grid grid-cols-3 gap-1.5">
                {SIZES.map((s) => (
                  <button key={s.id} onClick={() => setSizeId(s.id)} className={`rounded-md px-2 py-1.5 text-[11px] border ${sizeId === s.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>{s.name}</button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-muted-foreground">Gap: {gap}px
              <input type="range" min={0} max={30} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="block text-xs text-muted-foreground">Corner radius: {radius}px
              <input type="range" min={0} max={60} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="block text-xs text-muted-foreground">Background
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="mt-1 w-full h-9 rounded border border-border" />
            </label>

            <button onClick={download} disabled={busy || !files.length} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">
              {busy ? "Generating…" : "Generate & Download"}
            </button>
          </div>
        </div>
      </div>
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Drop 2 to 9 images.",
        "Pick a layout, canvas size, gap and background.",
        "Click Generate & Download to save your collage as PNG.",
      ]} />
          <ToolSeoContent
        title={"Free Photo Collage Maker — Create Collages Online"}
        description={"Create beautiful photo collages online with multiple layout options. Choose from grid layouts for 2-9 photos. Customize spacing, colors and download as PNG."}
        body={[
        "Select from a variety of grid layouts designed for 2, 3, 4, 6 or 9 photos. Choose your canvas size — square for Instagram, landscape for desktop wallpapers, or portrait for phone screens.",
        "Customize the gap between photos, background color visible in the gaps, and corner rounding for each photo cell. The collage is generated in high resolution (up to 1920px wide) for print-quality results.",
      ]}
        faqs={[
        { question: "What layouts are available?", answer: "We offer layouts for 2 photos (side by side or stacked), 3 photos (three columns or T-shape), 4 photos (2×2 grid), 6 photos (2×3 grid) and 9 photos (3×3 grid)." },
        { question: "What size collage should I create for Instagram?", answer: "Use the Square 1080px preset for Instagram feed posts, or Portrait for Stories. Both work perfectly with Instagram's recommended dimensions." },
        { question: "Can I use photos of different sizes?", answer: "Yes. Each photo is automatically cropped and scaled to fill its cell while maintaining its center. You can rearrange which photo goes in each cell." },
        { question: "What format is the downloaded collage?", answer: "Collages are downloaded as high-resolution PNG files suitable for both digital sharing and printing." },
      ]}
      />
      </ToolPageShell>
  );
}
