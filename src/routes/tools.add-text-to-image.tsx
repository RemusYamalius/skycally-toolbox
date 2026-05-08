import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/add-text-to-image")({
  head: () => ({
    meta: [
      { title: "Add Text to Image — Free online text editor · Skycally" },
      { name: "description", content: "Add custom, draggable text layers to your image with fonts, colors, shadow and outline. Free, in-browser." },
      { property: "og:title", content: "Add Text to Image · Skycally" },
      { property: "og:description", content: "Add custom, draggable text layers to any image." },
    ],
  }),
  component: AddTextToImage,
});

const FONTS = ["Arial", "Georgia", "Impact", "Courier New", "Verdana", "Comic Sans MS", "Roboto", "Montserrat"];

function AddTextToImage() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [layers, setLayers] = useState<{ id: string; text: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // controls
  const [text, setText] = useState("Your text here");
  const [font, setFont] = useState("Impact");
  const [size, setSize] = useState(60);
  const [color, setColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");
  const [bgOpacity, setBgOpacity] = useState(0);
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [shadow, setShadow] = useState(true);
  const [outline, setOutline] = useState(true);
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [outlineWidth, setOutlineWidth] = useState(2);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const fabric = await import("fabric");
      if (canceled) return;
      const canvas = new fabric.Canvas(canvasElRef.current!, { width: 800, height: 500, backgroundColor: "#0d1526" });
      fabricRef.current = { fabric, canvas };
      const sync = () => {
        const objs = canvas.getObjects().filter((o: any) => o.type === "i-text" || o.type === "text" || o.type === "textbox");
        setLayers(objs.map((o: any) => ({ id: o.__id, text: (o as any).text || "" })));
        const a = canvas.getActiveObject() as any;
        setActiveId(a?.__id ?? null);
      };
      canvas.on("object:added", sync);
      canvas.on("object:removed", sync);
      canvas.on("object:modified", sync);
      canvas.on("selection:created", sync);
      canvas.on("selection:updated", sync);
      canvas.on("selection:cleared", () => setActiveId(null));
      setReady(true);
    })();
    return () => { canceled = true; try { fabricRef.current?.canvas?.dispose(); } catch {/* ignore */} };
  }, []);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/") || !fabricRef.current) return;
    const url = URL.createObjectURL(f);
    const img = new window.Image();
    img.onload = () => {
      const { fabric, canvas } = fabricRef.current;
      const maxW = 900;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      canvas.setWidth(w);
      canvas.setHeight(h);
      const fImg = new fabric.FabricImage(img, { selectable: false, evented: false, scaleX: scale, scaleY: scale });
      canvas.backgroundImage = fImg;
      canvas.renderAll();
      setHasImage(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const addText = () => {
    if (!fabricRef.current || !hasImage) return;
    const { fabric, canvas } = fabricRef.current;
    const t = new fabric.IText(text, {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      fontFamily: font,
      fontSize: size,
      fill: color,
      fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      underline,
      textAlign: align,
      textBackgroundColor: bgOpacity > 0 ? hexWithAlpha(bgColor, bgOpacity / 100) : "",
      shadow: shadow ? new fabric.Shadow({ color: "rgba(0,0,0,0.6)", blur: 10, offsetX: 3, offsetY: 3 }) : undefined,
      stroke: outline ? outlineColor : undefined,
      strokeWidth: outline ? outlineWidth : 0,
      paintFirst: "stroke",
      originX: "center",
      originY: "center",
    });
    (t as any).__id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
  };

  const deleteActive = () => {
    const { canvas } = fabricRef.current ?? {};
    const a = canvas?.getActiveObject();
    if (a) { canvas.remove(a); canvas.discardActiveObject(); canvas.renderAll(); }
  };

  const download = () => {
    const { canvas } = fabricRef.current ?? {};
    if (!canvas || !hasImage) return;
    try {
      const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 });
      const a = document.createElement("a");
      a.href = url;
      a.download = "image-with-text.png";
      a.click();
      toast.success("✅ Download started!");
    } catch {
      toast.error("❌ Something went wrong. Please try again.");
    }
  };

  return (
    <ToolPageShell title="Add Text to Image" description="Add custom, draggable text layers to any image — fonts, colors, shadow and outline.">
      {!hasImage && (
        <div className="mb-6">
          <DropZone accept="image/*" onFiles={onFiles} label="Drop an image to start" hint="PNG, JPG or WEBP" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]" style={{ display: hasImage ? undefined : "none" }} aria-hidden={!hasImage}>
        {!ready && hasImage && <p className="text-sm text-muted-foreground">Loading editor…</p>}
        <div className="rounded-2xl border border-border bg-card p-3 overflow-auto">
          <canvas ref={canvasElRef} />
        </div>
        <div className="space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Text to add" />
          <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">Size: {size}px
            <input type="range" min={12} max={200} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Text<input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
            <label className="text-xs text-muted-foreground">BG<input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
          </div>
          <label className="block text-xs text-muted-foreground">BG opacity: {bgOpacity}%
            <input type="range" min={0} max={100} value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} className="w-full mt-1" />
          </label>
          <div className="flex gap-1">
            <button onClick={() => setBold(!bold)} className={`flex-1 py-1.5 rounded border text-xs font-bold ${bold ? "bg-foreground text-background border-foreground" : "border-border"}`}>B</button>
            <button onClick={() => setItalic(!italic)} className={`flex-1 py-1.5 rounded border text-xs italic ${italic ? "bg-foreground text-background border-foreground" : "border-border"}`}>I</button>
            <button onClick={() => setUnderline(!underline)} className={`flex-1 py-1.5 rounded border text-xs underline ${underline ? "bg-foreground text-background border-foreground" : "border-border"}`}>U</button>
          </div>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} onClick={() => setAlign(a)} className={`flex-1 py-1.5 rounded border text-xs ${align === a ? "bg-foreground text-background border-foreground" : "border-border"}`}>{a}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />Shadow</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />Outline</label>
          {outline && (
            <div className="grid grid-cols-2 gap-2">
              <input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="w-full h-8 rounded border border-border" />
              <input type="number" min={1} max={20} value={outlineWidth} onChange={(e) => setOutlineWidth(Number(e.target.value))} className="rounded border border-border bg-background px-2 text-sm" />
            </div>
          )}

          <button onClick={addText} disabled={!hasImage} className="w-full py-2.5 rounded-xl bg-[var(--cyan-brand)] text-background font-semibold disabled:opacity-50">+ Add Text</button>

          {layers.length > 0 && (
            <div className="rounded-lg border border-border bg-card/50 p-2 space-y-1">
              <p className="text-[10px] uppercase text-muted-foreground px-1">Text Layers</p>
              {layers.map((l) => (
                <div key={l.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${activeId === l.id ? "bg-secondary" : ""}`}>
                  <span className="truncate flex-1">{l.text || "(empty)"}</span>
                </div>
              ))}
              <button onClick={deleteActive} disabled={!activeId} className="w-full py-1 rounded text-xs border border-border hover:bg-secondary disabled:opacity-50">Delete selected</button>
            </div>
          )}

          <button onClick={download} disabled={!hasImage} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">Download Image</button>
          {hasImage && <button onClick={() => { fabricRef.current?.canvas?.clear(); setHasImage(false); setLayers([]); }} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">Choose another image</button>}
        </div>
      </div>
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Drop an image to load it onto the canvas.",
        "Customize your text and click Add Text — drag it anywhere.",
        "Click Download Image to save the merged result as PNG.",
      ]} />
    </ToolPageShell>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
