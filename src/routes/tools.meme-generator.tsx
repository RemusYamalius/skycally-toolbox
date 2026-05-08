import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";

export const Route = createFileRoute("/tools/meme-generator")({
  head: () => ({
    meta: [
      { title: "Meme Generator — Create memes from popular templates · Skycally" },
      { name: "description", content: "Make classic memes from popular templates or your own image. Fast, free and entirely in your browser." },
      { property: "og:title", content: "Meme Generator · Skycally" },
      { property: "og:description", content: "Create memes from popular templates or upload your own image." },
    ],
  }),
  component: MemeGenerator,
});

const MEME_TEMPLATES = [
  { id: "drake", name: "Drake", url: "https://i.imgflip.com/30b1gx.jpg" },
  { id: "distracted", name: "Distracted BF", url: "https://i.imgflip.com/1ur9b0.jpg" },
  { id: "buttons", name: "Two Buttons", url: "https://i.imgflip.com/1g8my4.jpg" },
  { id: "change", name: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg" },
  { id: "onedoes", name: "One Does Not Simply", url: "https://i.imgflip.com/1bij.jpg" },
  { id: "fine", name: "This is Fine", url: "https://i.imgflip.com/wxica.jpg" },
  { id: "pikachu", name: "Surprised Pikachu", url: "https://i.imgflip.com/2kbn1e.jpg" },
  { id: "woman-cat", name: "Woman Yelling at Cat", url: "https://i.imgflip.com/345v97.jpg" },
  { id: "bernie", name: "Bernie Sanders", url: "https://i.imgflip.com/4eku0j.jpg" },
  { id: "brain", name: "Expanding Brain", url: "https://i.imgflip.com/1jwhww.jpg" },
  { id: "exit", name: "Left Exit 12", url: "https://i.imgflip.com/22bdq6.jpg" },
  { id: "gru", name: "Gru's Plan", url: "https://i.imgflip.com/26am.jpg" },
];

function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [topText, setTopText] = useState("Top text");
  const [bottomText, setBottomText] = useState("Bottom text");
  const [fontSize, setFontSize] = useState(40);
  const [textColor, setTextColor] = useState("#ffffff");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [outlineWidth, setOutlineWidth] = useState(3);
  const [allCaps, setAllCaps] = useState(true);
  const [font, setFont] = useState("Impact");

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImgSrc(r.result as string);
    r.readAsDataURL(f);
  };

  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; render(); };
    img.onerror = () => toast.error("❌ Failed to load template. Try uploading your own image.");
    img.src = imgSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc]);

  const render = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${fontSize}px ${font}`;
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    const tx = (s: string) => allCaps ? s.toUpperCase() : s;
    if (topText) {
      ctx.strokeText(tx(topText), canvas.width / 2, fontSize + 10);
      ctx.fillText(tx(topText), canvas.width / 2, fontSize + 10);
    }
    if (bottomText) {
      ctx.strokeText(tx(bottomText), canvas.width / 2, canvas.height - 15);
      ctx.fillText(tx(bottomText), canvas.width / 2, canvas.height - 15);
    }
  };

  useEffect(() => { render(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [topText, bottomText, fontSize, textColor, outlineColor, outlineWidth, allCaps, font]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "meme.png";
      a.click();
      toast.success("✅ Download started!");
    } catch {
      toast.error("❌ This template blocked export. Try uploading your own image.");
    }
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], "meme.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My meme" });
        } else {
          await navigator.share({ title: "My meme", url: location.href });
        }
      } catch {/* user cancel */}
    }, "image/png");
  };

  return (
    <ToolPageShell title="Meme Generator" description="Create classic memes from popular templates or your own image.">
      {!imgSrc ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Pick a template:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {MEME_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => setImgSrc(t.url)} className="group rounded-lg overflow-hidden border border-border bg-card hover:ring-2 hover:ring-[var(--cyan-brand)] transition">
                <img src={t.url} alt={t.name} crossOrigin="anonymous" className="w-full aspect-square object-cover" />
                <p className="text-[11px] py-1 px-1 text-center truncate">{t.name}</p>
              </button>
            ))}
          </div>
          <label className="block">
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-foreground/30">
              <p className="font-semibold">Or upload your own image</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WEBP</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
          </div>
          <div className="space-y-3">
            <input value={topText} onChange={(e) => setTopText(e.target.value)} placeholder="Top text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input value={bottomText} onChange={(e) => setBottomText(e.target.value)} placeholder="Bottom text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>Impact</option><option>Arial</option><option>Oswald</option>
            </select>
            <label className="block text-xs text-muted-foreground">Font size: {fontSize}px
              <input type="range" min={24} max={80} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Text color<input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
              <label className="text-xs text-muted-foreground">Outline<input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
            </div>
            <label className="block text-xs text-muted-foreground">Outline width: {outlineWidth}px
              <input type="range" min={1} max={8} value={outlineWidth} onChange={(e) => setOutlineWidth(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allCaps} onChange={(e) => setAllCaps(e.target.checked)} />ALL CAPS</label>

            <button onClick={download} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold">Download Meme</button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button onClick={share} className="w-full py-2 rounded-xl border border-border text-sm hover:bg-secondary">Share</button>
            )}
            <button onClick={() => { setImgSrc(""); imgRef.current = null; }} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">Choose another template</button>
          </div>
        </div>
      )}
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Pick a template or upload your own image.",
        "Type your top and bottom text and tweak font, size and outline.",
        "Click Download Meme to save your masterpiece as PNG.",
      ]} />
    </ToolPageShell>
  );
}
