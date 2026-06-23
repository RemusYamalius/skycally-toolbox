import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-cropper")({
  head: () => buildToolMeta(toolBySlug("image-cropper", tools)),
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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          toast.error("Something went wrong. Please try again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cropped.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Download started!");
        setBusy(false);
      },
      mime,
      0.92,
    );
  };

  return (
    <ToolPageShell
      title="Image Cropper"
      description="Crop, rotate and flip images with aspect-ratio presets. Download in JPG, PNG or WEBP."
    >
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
              <span className="text-muted-foreground">Crop size</span>
              <span className="font-mono">
                {dims.w} × {dims.h} px
              </span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Aspect ratio</p>
              <div className="grid grid-cols-3 gap-1.5">
                {RATIOS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setRatio(r.value ?? NaN)}
                    className={`rounded-md px-2 py-1.5 text-xs border transition-colors ${
                      (isNaN(ratio) && isNaN(r.value as number)) || ratio === r.value
                        ? "bg-foreground text-background border-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Transform</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => cropper()?.rotate(-90)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  ↺ -90°
                </button>
                <button
                  onClick={() => cropper()?.rotate(90)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  ↻ +90°
                </button>
                <button
                  onClick={() => {
                    const c = cropper();
                    if (c) c.scaleX(-(c.getData().scaleX || 1));
                  }}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  ↔ Flip H
                </button>
                <button
                  onClick={() => {
                    const c = cropper();
                    if (c) c.scaleY(-(c.getData().scaleY || 1));
                  }}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  ↕ Flip V
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Output format</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["jpg", "png", "webp"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-md px-2 py-1.5 text-xs border uppercase font-mono transition-colors ${
                      format === f
                        ? "bg-foreground text-background border-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCrop}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {busy ? "Cropping…" : "Crop & Download"}
            </button>
            <button
              onClick={() => setSrc("")}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Choose another image
            </button>
          </div>
        </div>
      )}

      <AdZone id="image-tool-below-result" size="300x250" />

      <HowToUse
        steps={[
          "Drop an image or click to upload — PNG, JPG, or WEBP.",
          "Select an aspect ratio preset or crop freely. Drag the handles to frame your selection. Rotate or flip if needed.",
          "Choose the output format (JPG, PNG, WEBP) and click Crop & Download.",
        ]}
      />

      <ToolSeoContent
        title="Free Image Cropper — Crop Photos Online with Aspect Ratio Presets"
        description="Crop any image online with precision using Skycally's free image cropper. Choose from preset aspect ratios, rotate, flip, and download in JPG, PNG, or WEBP. No signup, no upload."
        body={[
          "Skycally's Image Cropper gives you a precise, browser-based tool for cropping any photo or image exactly the way you want. Upload an image, drag the crop handles to select your area, and download the result in JPG, PNG, or WEBP — entirely in your browser with no server upload required.",
          "Six aspect ratio presets cover the most common cropping needs: Free for custom shapes, 1:1 Square for Instagram posts and avatars, 4:3 for standard photos and presentations, 16:9 for YouTube thumbnails and widescreen, 3:4 for portrait photos, and 9:16 for Instagram Stories and TikTok. Switch between presets instantly at any time.",
          "Additional transform tools let you rotate the image 90 degrees left or right, and flip horizontally or vertically — useful for correcting mirror-image selfies, fixing scanned documents, or adjusting landscape orientation. The real-time pixel counter shows the exact dimensions of your crop selection as you drag.",
          "All cropping runs locally in your browser using the CropperJS library. Your image never leaves your device, making this tool completely private. Output quality is set to 92% for JPEG, which preserves virtually all visible detail while keeping file sizes manageable.",
        ]}
        faqs={[
          {
            question: "What aspect ratios are available?",
            answer:
              "Free crop (any shape), 1:1 Square, 4:3 Standard, 16:9 Widescreen, 3:4 Portrait, and 9:16 Story/Reel. You can switch presets at any time before downloading.",
          },
          {
            question: "Can I crop to exact pixel dimensions?",
            answer:
              "The cropper shows real-time pixel dimensions of your selection. Set the desired aspect ratio and resize the crop box to match your target dimensions.",
          },
          {
            question: "Will cropping reduce image quality?",
            answer:
              "No. Cropping only removes the area outside your selection. The remaining image retains its full original quality (92% JPEG compression for JPG output, lossless for PNG).",
          },
          {
            question: "What output formats are supported?",
            answer:
              "You can download the cropped image as JPG (smallest file size), PNG (lossless, supports transparency), or WEBP (modern format, best compression).",
          },
          {
            question: "Can I rotate or flip the image?",
            answer:
              "Yes. The tool includes 90° left/right rotation and horizontal/vertical flip controls, accessible from the sidebar panel.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer:
              "No. All cropping runs locally in your browser using CropperJS. Your image never leaves your device.",
          },
          {
            question: "Can I undo a crop?",
            answer:
              "You can adjust the crop area at any time before clicking Crop & Download. The original image is preserved in memory until you choose to download.",
          },
          {
            question: "What image formats can I upload?",
            answer: "PNG, JPG, WEBP, and most other common image formats are supported as input.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-cropper" />
    </ToolPageShell>
  );
}
