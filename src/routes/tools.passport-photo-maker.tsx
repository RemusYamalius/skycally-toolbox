import { createFileRoute, Link } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { AlertTriangle, Download, FileText, Loader2, RefreshCw } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { removeBackground } from "@/services/removeBg";
import { checkSize, downloadBlob } from "@/lib/file-utils";
import { DPI, TEMPLATES, aspectRatioOf, pixelSizeOf, type PhotoTemplate } from "@/lib/passport-photo/templates";
import { exportPrintSheetPdf } from "@/lib/passport-photo/pdf";

export const Route = createFileRoute("/tools/passport-photo-maker")({
  head: () => buildToolMeta(toolBySlug("passport-photo-maker", tools)),
  component: PassportPhotoMaker,
});

const cropperStyles = `
  .cropper-container { border-radius: 12px; }
  .cropper-view-box { outline-color: var(--cyan-brand); outline: 1px solid var(--cyan-brand); }
  .cropper-point { background-color: var(--cyan-brand); }
  .cropper-line { background-color: var(--cyan-brand); }
`;

/** Draw a transparent PNG over a solid white background at the exact print size. */
function flattenOnWhite(src: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return canvas;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), mime, quality);
  });
}

function PassportPhotoMaker() {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [src, setSrc] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<"jpg" | "png">("jpg");

  const template = useMemo<PhotoTemplate>(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );
  const ratio = aspectRatioOf(template);
  const px = pixelSizeOf(template);

  const reset = () => {
    setSrc("");
    setResultUrl(null);
    setResultCanvas(null);
    setProgress(0);
    setStage("");
  };

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG or WEBP).");
      return;
    }
    const err = checkSize(f);
    if (err) {
      toast.error(err);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setResultUrl(null);
      setResultCanvas(null);
      setSrc(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setBusy(true);
    setProgress(0);
    setStage("Cropping to official size…");
    try {
      // 1. Crop at the exact 300 DPI pixel size for the selected template.
      const cropped = cropper.getCroppedCanvas({
        width: px.w,
        height: px.h,
        imageSmoothingQuality: "high",
        fillColor: "#ffffff",
      });
      const croppedBlob = await canvasToBlob(cropped, "image/png", 1);

      // 2. Remove the background (same in-browser AI service as Remove Background).
      setStage("Removing background…");
      const file = new File([croppedBlob], "crop.png", { type: "image/png" });
      const cutout = await removeBackground(file, (p) => setProgress(p));

      // 3. Composite the transparent cutout onto a solid white background —
      //    official photos require a plain white/light background, not transparency.
      setStage("Adding the white background…");
      const cutoutUrl = URL.createObjectURL(cutout);
      const img = await loadImage(cutoutUrl);
      const finalCanvas = flattenOnWhite(img, px.w, px.h);
      URL.revokeObjectURL(cutoutUrl);

      setResultCanvas(finalCanvas);
      setResultUrl(finalCanvas.toDataURL("image/jpeg", 0.95));
      setStage("");
      toast.success("Your photo is ready.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const downloadPhoto = async () => {
    if (!resultCanvas) return;
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(resultCanvas, mime, 0.95);
    downloadBlob(blob, `passport-photo-${template.id}-${px.w}x${px.h}.${format}`);
    toast.success("Download started!");
  };

  const downloadSheet = async () => {
    if (!resultCanvas) return;
    setBusy(true);
    try {
      const dataUrl = resultCanvas.toDataURL("image/jpeg", 0.95);
      const count = await exportPrintSheetPdf(dataUrl, template, `passport-photo-sheet-${template.id}.pdf`);
      toast.success(`Print sheet ready — ${count} copies on one 4 × 6 in page.`);
    } catch (e) {
      console.error(e);
      toast.error("Could not build the print sheet. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Passport & ID Photo Maker"
      description="Crop, remove the background, and print passport or ID photos in the exact size your country requires."
    >
      <style>{cropperStyles}</style>

      {/* ── Step 1: upload ───────────────────────────────────────────── */}
      {!src && (
        <DropZone
          accept="image/*"
          onFiles={onFiles}
          label="Drop your photo here"
          hint="JPG, PNG or WEBP — up to 10MB. Everything runs in your browser."
        />
      )}

      {src && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* ── Step 2 + 3: template + fixed-ratio crop ──────────────── */}
          <div className="rounded-2xl border border-border bg-card p-4">
            {!resultUrl ? (
              <Cropper
                key={template.id}
                ref={cropperRef}
                src={src}
                style={{ height: 420, width: "100%" }}
                aspectRatio={ratio}
                viewMode={1}
                dragMode="move"
                autoCropArea={0.9}
                background={false}
                responsive
                checkOrientation={false}
                guides
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-xl bg-secondary/40 p-4">
                <img
                  src={resultUrl}
                  alt={`Finished ${template.label} photo at ${template.sizeLabel}`}
                  className="max-h-full rounded-lg border border-border shadow-sm"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold" htmlFor="doc-template">
                  Document type
                </label>
                <Select
                  value={templateId}
                  onValueChange={(v) => {
                    setTemplateId(v);
                    setResultUrl(null);
                    setResultCanvas(null);
                  }}
                >
                  <SelectTrigger id="doc-template" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} — {t.sizeLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">{template.note}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Print size</dt>
                  <dd className="font-mono">{template.sizeLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pixels @ {DPI} DPI</dt>
                  <dd className="font-mono">
                    {px.w.toLocaleString("en-US")} × {px.h.toLocaleString("en-US")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Locked ratio</dt>
                  <dd className="font-mono">{ratio.toFixed(4)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Background</dt>
                  <dd className="font-mono">Solid white</dd>
                </div>
              </dl>

              {!resultUrl ? (
                <button
                  onClick={generate}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
                  style={{ background: "var(--cyan-brand)" }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {busy ? stage || "Working…" : "Crop & remove background"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["jpg", "png"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          format === f
                            ? "border-transparent text-background"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                        style={format === f ? { background: "var(--cyan-brand)" } : undefined}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={downloadPhoto}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-background"
                    style={{ background: "var(--cyan-brand)" }}
                  >
                    <Download className="w-4 h-4" /> Download single photo
                  </button>
                  <button
                    onClick={downloadSheet}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary/60 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Download 4 × 6 in print sheet (PDF)
                  </button>
                </div>
              )}

              {busy && progress > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: "var(--cyan-brand)" }}
                  />
                </div>
              )}

              <button
                onClick={reset}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start over
              </button>
            </div>

            {/* ── Disclaimer ─────────────────────────────────────────── */}
            <div role="note" className="flex gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--amber-brand, #f59e0b)" }}
                aria-hidden="true"
              />
              <p className="text-muted-foreground">
                This tool helps you meet common size and background requirements, but always double-check your
                destination country's exact current rules before submitting — requirements can change.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Contextual internal links ──────────────────────────────── */}
      <p className="mt-10 text-sm text-muted-foreground leading-relaxed">
        Need something less strict? Use the{" "}
        <Link to="/tools/image-cropper" className="underline underline-offset-4 hover:text-foreground">
          Image Cropper
        </Link>{" "}
        for general-purpose cropping without a document ratio, the{" "}
        <Link to="/tools/remove-bg" className="underline underline-offset-4 hover:text-foreground">
          Remove Background
        </Link>{" "}
        tool when you only want a transparent cutout, or{" "}
        <Link to="/tools/image-to-pdf" className="underline underline-offset-4 hover:text-foreground">
          Image to PDF
        </Link>{" "}
        to turn any other pictures into a printable document.
      </p>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="mt-10 rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="font-display text-lg font-bold">How it works</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Passport offices reject photos on two things far more often than anything else: the wrong printed size and a
          busy or shadowed background. Both are measurable, so both are fixable before you print.
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          The crop box is locked to the official ratio for the document you pick, so the framing can never drift out of
          spec. The export is then rendered at 300 DPI, the print resolution almost every authority expects:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-secondary/60 p-4 font-mono text-xs">
          {`pixels = millimetres ÷ 25.4 × 300

US / India   50.8 × 50.8 mm  →  600 × 600 px   (ratio 1.0000)
UK           35 × 45 mm      →  413 × 531 px   (ratio 0.7778)
Schengen/EU  35 × 45 mm      →  413 × 531 px   (ratio 0.7778)
Canada       50 × 70 mm      →  591 × 827 px   (ratio 0.7143)`}
        </pre>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          After the background is removed, the transparent cutout is composited onto a solid white layer rather than
          left transparent — a transparent PNG prints as whatever paper or template sits behind it, which is exactly the
          inconsistency the rules are trying to prevent. The print sheet then tiles that finished photo at its true
          millimetre size on a 4 × 6 in page, so a standard photo lab print comes out to scale and you just cut along
          the guides.
        </p>
      </section>

      <AdZone id="passport-photo-maker-mid" size="728x90" />

      <HowToUse
        steps={[
          "Upload a clear, front-facing photo taken against a plain wall in even lighting.",
          "Pick your document type — the crop box locks to that country's official ratio.",
          "Position your head inside the crop box, then run crop & background removal.",
          "Download the single photo at 300 DPI, or the 4 × 6 in PDF sheet to print several copies at once.",
        ]}
      />

      <ToolSeoContent
        title="Free Passport Photo Maker — Exact ID Photo Sizes for Printing at Home"
        description="Turn any phone photo into a passport or ID photo at the exact official size, with a clean white background and a printable 4 × 6 sheet — free, in your browser."
        body={[
          "A passport photo maker free of charge only helps if the numbers underneath it are right. Every country publishes an exact printed size for identity photos, and those sizes are not interchangeable: a US passport photo is 2 × 2 inches (51 × 51 mm), while the UK and the whole Schengen area use 35 × 45 mm, and Canada uses a taller 50 × 70 mm. Print a US-sized square where a 35 × 45 mm rectangle was expected and the application comes back regardless of how good the photograph is. This tool locks the crop box to the ratio of whichever document you select, so the framing physically cannot drift out of spec while you drag your head into position.",
          "The second half of the job is the background. Guidance almost everywhere asks for a plain, uniformly lit white or light-coloured background with no shadows, patterns or objects. That is hard to shoot at home and easy to fix afterwards, so the same in-browser AI cutout used by our background remover isolates you from whatever wall you were standing in front of, then composites the result onto solid white. Flattening matters: a transparent PNG has no background at all, and it will print as whatever happens to sit behind it. Working as a passport photo size calculator as well as an editor, the tool shows the pixel dimensions it will export — millimetres ÷ 25.4 × 300 — so you can confirm the file is at true 300 DPI print resolution before you send it anywhere.",
          "To print passport photo at home or at a drugstore kiosk, use the print sheet export. It tiles copies of your finished photo at their real millimetre size onto a standard 4 × 6 inch page with faint cut guides, which is the format every one-hour photo counter accepts and the cheapest way to get the two identical prints most paper applications ask for. Everything — the crop, the background removal, the sheet layout — happens locally in your browser, so your photo is never uploaded to a server.",
          "A good source photo makes the rest of this easier. Take it in daylight facing a window, at arm's length or slightly further, against the plainest wall in the house — the background removal step handles imperfections, but even lighting on your face is something no algorithm can fully fix afterwards. Keep a neutral expression with both eyes open, remove sunglasses and tinted lenses, and angle away from any light source that causes glare across regular glasses. None of this needs a photographer or a studio; a phone held steady at eye level is enough for every template this tool supports.",
        ]}
        faqs={[
          {
            question: "Is this passport photo maker really free?",
            answer:
              "Yes. There is no signup, no watermark and no export limit. The cropping, background removal and PDF sheet all run locally in your browser, so there is no server cost to pass on to you.",
          },
          {
            question: "What size should a passport photo be?",
            answer:
              "It depends on the country. The United States and India use 2 × 2 in (51 × 51 mm); the United Kingdom and Schengen/EU countries use 35 × 45 mm; Canada uses 50 × 70 mm. Selecting your document in the dropdown sets the crop ratio and the exported pixel size (at 300 DPI) automatically.",
          },
          {
            question: "Can I print passport photos at home?",
            answer:
              "Yes, if you print at 100% scale on photo paper. Use the 4 × 6 in print sheet PDF, turn off any 'fit to page' or 'shrink oversized pages' option in your printer dialog, then cut along the guides. Any drugstore that prints 4 × 6 photos will also accept the file.",
          },
          {
            question: "Will my photo definitely be accepted?",
            answer:
              "This tool handles size, ratio and background, which are the most common rejection reasons — but it cannot judge your expression, head height, glasses, headwear or lighting, and rules change. Always check the current official requirements for your specific country and document before submitting.",
          },
          {
            question: "Can I wear glasses in my passport photo?",
            answer:
              "Most countries now discourage or disallow glasses in passport photos because of glare and reflections obscuring the eyes. If you must wear them for medical reasons, tilt your head away from direct light and make sure both eyes are clearly visible with no reflection. When in doubt, retake the photo without glasses.",
          },
          {
            question: "Should I download JPG or PNG?",
            answer:
              "JPG is the right choice for almost everyone — it is the format passport offices, visa portals and photo-printing kiosks expect, and it keeps the file size small. PNG is only useful if you specifically need a lossless file for further editing before printing.",
          },
          {
            question: "Does this work for a baby's or child's passport photo?",
            answer:
              "Yes, the same size and background rules apply regardless of age. The hardest part is practical, not technical: lay a plain white sheet behind the baby, keep their eyes open and face forward, and make sure no hand, arm or prop supporting them is visible in the frame before you crop.",
          },
          {
            question: "Do I need to remove a hat, headscarf or turban for my photo?",
            answer:
              "Religious headwear is generally permitted as long as your full face is visible from chin to forehead and no shadow falls across your features. Non-religious hats, caps and headphones are not allowed. Check your specific country's guidance if you are unsure which category applies.",
          },
        ]}
      />

      <RelatedTools currentSlug="passport-photo-maker" />
    </ToolPageShell>
  );
}
