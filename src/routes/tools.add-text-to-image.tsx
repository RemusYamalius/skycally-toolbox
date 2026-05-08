import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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

const FONTS = ["Impact", "Arial", "Georgia", "Courier New", "Verdana", "Comic Sans MS", "Times New Roman"];

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
}

function AddTextToImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // New-layer controls
  const [text, setText] = useState("Your text here");
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("Impact");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [shadow, setShadow] = useState(true);
  const [outline, setOutline] = useState(true);
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [outlineWidth, setOutlineWidth] = useState(3);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    layers.forEach((layer) => {
      ctx.font = `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      if (layer.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      if (layer.outline) {
        ctx.strokeStyle = layer.outlineColor;
        ctx.lineWidth = layer.outlineWidth;
        ctx.lineJoin = "round";
        ctx.strokeText(layer.text, layer.x, layer.y);
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, layer.x, layer.y);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (selected === layer.id) {
        const metrics = ctx.measureText(layer.text);
        ctx.strokeStyle = "#00D4FF";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(layer.x - 4, layer.y - 4, metrics.width + 8, layer.fontSize + 8);
        ctx.setLineDash([]);
      }
    });
  }, [image, layers, selected]);

  useEffect(() => { draw(); }, [draw]);

  const handleFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setLayers([]);
      setSelected(null);
    };
    img.onerror = () => toast.error("❌ Something went wrong. Please try again.");
    img.src = url;
  };

  const addLayer = () => {
    if (!image) return;
    const canvas = canvasRef.current!;
    const newLayer: TextLayer = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      x: Math.max(20, canvas.width / 2 - 100),
      y: Math.max(20, canvas.height / 2 - fontSize / 2),
      fontSize,
      color,
      fontFamily,
      bold,
      italic,
      shadow,
      outline,
      outlineColor,
      outlineWidth,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelected(newLayer.id);
  };

  const updateSelected = (patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === selected ? { ...l, ...patch } : l)));
  };

  const deleteSelected = () => {
    setLayers((prev) => prev.filter((l) => l.id !== selected));
    setSelected(null);
  };

  const getLayerAt = (x: number, y: number): string | null => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "bold " : ""}${l.fontSize}px ${l.fontFamily}`;
      const w = ctx.measureText(l.text).width;
      if (x >= l.x && x <= l.x + w && y >= l.y && y <= l.y + l.fontSize) return l.id;
    }
    return null;
  };

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const hit = getLayerAt(x, y);
    setSelected(hit);
    if (hit) {
      const layer = layers.find((l) => l.id === hit)!;
      setDragging(hit);
      setDragOffset({ x: x - layer.x, y: y - layer.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const { x, y } = getCanvasCoords(e);
    setLayers((prev) => prev.map((l) => (l.id === dragging ? { ...l, x: x - dragOffset.x, y: y - dragOffset.y } : l)));
  };

  const onMouseUp = () => setDragging(null);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "image-with-text.png";
      a.click();
      toast.success("✅ Download started!");
    } catch {
      toast.error("❌ Something went wrong. Please try again.");
    }
  };

  const selectedLayer = layers.find((l) => l.id === selected);

  return (
    <ToolPageShell title="Add Text to Image" description="Add custom, draggable text layers to any image — fonts, colors, shadow and outline.">
      {!image ? (
        <DropZone accept="image/*" onFiles={handleFiles} label="Drop an image to start" hint="PNG, JPG or WEBP" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Canvas */}
          <div>
            <div className="rounded-2xl border border-border bg-card p-3 overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8, cursor: dragging ? "grabbing" : "default" }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setImage(null); setLayers([]); setSelected(null); }}
                className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
              >
                Change image
              </button>
              <button
                onClick={download}
                className="flex-1 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm"
              >
                Download Image
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">New text layer</p>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Enter text..."
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Font</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Size: {fontSize}px</label>
                  <input type="range" min={12} max={200} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="w-full mt-2" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block">Color</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="block w-10 h-8 rounded border border-border cursor-pointer mt-1" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBold(!bold)}
                    className={`w-8 h-8 rounded-lg border text-sm font-bold ${bold ? "bg-[var(--cyan-brand)] text-background border-transparent" : "border-border text-muted-foreground"}`}
                  >B</button>
                  <button
                    onClick={() => setItalic(!italic)}
                    className={`w-8 h-8 rounded-lg border text-sm italic ${italic ? "bg-[var(--cyan-brand)] text-background border-transparent" : "border-border text-muted-foreground"}`}
                  >I</button>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />
                  <span className="text-muted-foreground">Shadow</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />
                  <span className="text-muted-foreground">Outline</span>
                </label>
              </div>
              {outline && (
                <div className="flex items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block">Outline color</label>
                    <input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="block w-10 h-8 rounded border border-border cursor-pointer mt-1" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Width: {outlineWidth}px</label>
                    <input type="range" min={1} max={10} value={outlineWidth} onChange={(e) => setOutlineWidth(+e.target.value)} className="w-full mt-2" />
                  </div>
                </div>
              )}
              <button
                onClick={addLayer}
                className="w-full py-2.5 rounded-xl bg-[var(--cyan-brand)] text-background font-semibold text-sm"
              >
                + Add Text Layer
              </button>
            </div>

            {selectedLayer && (
              <div className="rounded-2xl border border-[var(--cyan-brand)]/40 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--cyan-brand)" }}>Edit selected</p>
                  <button onClick={deleteSelected} className="inline-flex items-center gap-1 text-xs text-destructive hover:opacity-80">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
                <input
                  value={selectedLayer.text}
                  onChange={(e) => updateSelected({ text: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Size: {selectedLayer.fontSize}px</label>
                    <input type="range" min={12} max={200} value={selectedLayer.fontSize} onChange={(e) => updateSelected({ fontSize: +e.target.value })} className="w-full mt-2" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block">Color</label>
                    <input type="color" value={selectedLayer.color} onChange={(e) => updateSelected({ color: e.target.value })} className="block w-10 h-8 rounded border border-border cursor-pointer mt-1" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Drag the text on the canvas to reposition.</p>
              </div>
            )}

            {layers.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Text layers ({layers.length})</p>
                <div className="space-y-1">
                  {layers.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelected(l.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition ${selected === l.id ? "bg-[color-mix(in_oklab,var(--cyan-brand)_18%,transparent)] text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                    >
                      {l.text || "(empty)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADSENSE_ZONE: image-tool-below-result 300x250 */}
      <AdZone id="image-tool-below-result" size="300x250" />

      <HowToUse steps={[
        "Drop an image to load it onto the canvas.",
        "Customize your text and click Add Text Layer — drag it anywhere on the image.",
        "Click Download Image to save the merged result as a PNG.",
      ]} />
    </ToolPageShell>
  );
}
