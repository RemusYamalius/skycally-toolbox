import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/image-cropper")({
  head: () => buildToolMeta(toolBySlug("image-cropper", tools)), ? undefined : ratio}
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
          <ToolSeoContent
        title={"Free Image Cropper — Crop Photos Online with Aspect Ratio"}
        description={"Crop images online with precision. Choose from preset aspect ratios or crop freely. Rotate and flip options included. Download in JPG, PNG or WEBP."}
        body={[
        "Use the intuitive crop interface to select exactly the area you want to keep. Drag the handles to resize the crop area and drag inside to reposition it. Switch between preset aspect ratios for social media sizes or use Free mode for custom crops.",
        "Additional editing options include 90-degree rotation in both directions and horizontal/vertical flipping — useful for correcting mirror-image selfies or adjusting landscape photos.",
      ]}
        faqs={[
        { question: "What aspect ratios are available?", answer: "We offer Free crop, 1:1 Square, 4:3 Standard, 16:9 Widescreen, 3:4 Portrait and 9:16 Story/Reel presets." },
        { question: "Can I crop to exact pixel dimensions?", answer: "The cropper shows real-time pixel dimensions of your selection. Set the desired aspect ratio and resize to match your target dimensions." },
        { question: "Will cropping reduce image quality?", answer: "No. Cropping only removes areas outside the selection — the remaining image retains its original quality at 92% compression." },
        { question: "Can I undo a crop?", answer: "Yes, you can adjust the crop area at any time before clicking Crop & Download. The original image is preserved until you download." },
      ]}
      />
      </ToolPageShell>
  );
}
