import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/image-cropper")({
  head: () => ({
    meta: [
      { title: "Image Cropper — Crop, rotate and flip images · Skycally" },
      { name: "description", content: "Crop images with aspect-ratio presets, rotate and flip — entirely in your browser. Free and fast." },
      { property: "og:title", content: "Image Cropper · Skycally" },
      { property: "og:description", content: "Crop, rotate and flip images with aspect-ratio presets." },
    ],
  }),
  component: ImageCropper,
});

const RATIOS: { label: string; value: number | undefined }[] = [
  { label: "Free ✂️", value: NaN },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

const cropperStyles = `
  .cropper-container { border-radius: 12px; }
  .cropper-view-box { outline-color: var(--cyan-brand); outline: 1px solid var(--cyan-brand); }
  .cropper-point { background-color: var(--cyan-brand); }
  .cropper-line { background-color: var(--cyan-brand); }
`;

function ImageCropper() {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [src, setSrc] = useState<string>("");
  const [ratio, setRatio] = useState<number>(NaN);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [format, setFormat] = useState<"jpg" | "png" | "webp">("jpg");
  const [busy, setBusy] = useState(false);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(f);
  };

  const cropper = () => cropperRef.current?.cropper;

  const handleCrop = () => {
    const c = cropper();
    if (!c) return;
    setBusy(true);
    const canvas = c.getCroppedCanvas();
    const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    canvas.toBlob((blob) => {
      if (!blob) { setBusy(false); toast.error("❌ Something went wrong. Please try again."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cropped.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Download started!");
      setBusy(false);
    }, mime, 0.92);
  };

  return (
    <ToolPageShell title="Image Cropper" description="Crop images with aspect-ratio presets. Rotate, flip and download.">
      <style>{cropperStyles}</style>
      {!src ? (
        <DropZone accept="image/*" onFiles={onFiles} label="Drop an image to crop" hint="PNG, JPG or WEBP" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-border bg-card p-3">
            <Cropper
              ref={cropperRef}
              src={src}
              style={{ height: 440, width: "100%" }}
              aspectRatio={isNaN(ratio) ? undefined : ratio}
              guides
              viewMode={1}
              dragMode="move"
              background={false}
              responsive
              autoCropArea={0.8}
              checkOrientation={false}
              crop={(e) => setDims({ w: Math.round(e.detail.width), h: Math.round(e.detail.height) })}
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/50 p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Crop</span>
              <span className="font-mono">{dims.w} × {dims.h} px</span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Aspect ratio</p>
              <div className="grid grid-cols-3 gap-1.5">
                {RATIOS.map((r) => (
                  <button key={r.label} onClick={() => setRatio(r.value ?? NaN)} className={`rounded-md px-2 py-1.5 text-xs border ${(isNaN(ratio) && isNaN(r.value as number)) || ratio === r.value ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => cropper()?.rotate(-90)} className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary">↺ -90°</button>
              <button onClick={() => cropper()?.rotate(90)} className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary">↻ +90°</button>
              <button onClick={() => { const c = cropper(); if (c) c.scaleX(-(c.getData().scaleX || 1)); }} className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary">↔ Flip H</button>
              <button onClick={() => { const c = cropper(); if (c) c.scaleY(-(c.getData().scaleY || 1)); }} className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary">↕ Flip V</button>
            </div>

            <label className="block text-xs text-muted-foreground">Format
              <select value={format} onChange={(e) => setFormat(e.target.value as "jpg" | "png" | "webp")} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>

            <button onClick={handleCrop} disabled={busy} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">
              {busy ? "Cropping…" : "Crop & Download"}
            </button>
            <button onClick={() => setSrc("")} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">Choose another image</button>
          </div>
        </div>
      )}
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Drop an image into the cropper.",
        "Pick an aspect ratio, then drag the box to frame your crop.",
        "Click Crop & Download to save the result.",
      ]} />
    </ToolPageShell>
  );
}
