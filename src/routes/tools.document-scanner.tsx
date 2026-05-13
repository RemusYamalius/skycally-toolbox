import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, X, FileDown, Image as ImageIcon, FileText, Copy, Plus, Loader2, Info } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/document-scanner")({
  head: () => buildToolMeta(toolBySlug("document-scanner", tools)),
  component: DocumentScanner,
});

type Mode = "camera" | "upload";
type FilterMode = "original" | "magic" | "grayscale" | "bw" | "photo";

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FILTERS: { id: FilterMode; label: string }[] = [
  { id: "magic", label: "✨ Magic" },
  { id: "bw", label: "B&W" },
  { id: "grayscale", label: "Grayscale" },
  { id: "photo", label: "Photo" },
  { id: "original", label: "Original" },
];

function applyFilter(canvas: HTMLCanvasElement, mode: FilterMode) {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  switch (mode) {
    case "magic":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.2 + 20);
        data[i + 1] = Math.min(255, data[i + 1] * 1.2 + 20);
        data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 20);
      }
      break;
    case "grayscale":
      for (let i = 0; i < data.length; i += 4) {
        const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = g;
      }
      break;
    case "bw":
      for (let i = 0; i < data.length; i += 4) {
        const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const bw = g > 140 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = bw;
      }
      break;
    case "photo":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.1);
        data[i + 1] = Math.min(255, data[i + 1] * 1.05);
      }
      break;
  }
  ctx.putImageData(imageData, 0, 0);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = src;
  });
}

function DocumentScanner() {
  const [mode, setMode] = useState<Mode>("upload");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Editing state
  const [editing, setEditing] = useState<string | null>(null); // raw dataURL being edited
  const [crop, setCrop] = useState<CropBox>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [filter, setFilter] = useState<FilterMode>("magic");

  // Multi-page
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");

  // Camera lifecycle
  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const startCamera = async () => {
    try {
      stream?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      toast.error("Camera access denied or unavailable");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  useEffect(() => {
    if (mode === "camera") startCamera();
    else stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facing]);

  const captureFromCamera = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setEditing(c.toDataURL("image/jpeg", 0.95));
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  };

  const onUpload = async (files: File[]) => {
    if (!files.length) return;
    // Add all uploaded images: edit first, queue rest
    const reads = await Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = () => rej();
            r.readAsDataURL(f);
          }),
      ),
    );
    setEditing(reads[0]);
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    if (reads.length > 1) {
      // Queue extras as raw pages — user can re-edit later
      setPages((p) => [...p, ...reads.slice(1)]);
    }
  };

  const processPage = async () => {
    if (!editing) return;
    const img = await loadImage(editing);
    const sx = crop.x * img.width;
    const sy = crop.y * img.height;
    const sw = crop.w * img.width;
    const sh = crop.h * img.height;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw));
    c.height = Math.max(1, Math.round(sh));
    c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    applyFilter(c, filter);
    const out = c.toDataURL("image/jpeg", 0.92);
    setPages((p) => [...p, out]);
    setEditing(null);
    toast.success("Page added");
  };

  const removePage = (i: number) => setPages((p) => p.filter((_, idx) => idx !== i));

  // EXPORTS
  const exportPDF = async () => {
    if (pages.length === 0) return;
    setBusy(true);
    setBusyMsg("Building PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PAGE_W = 210;
      const PAGE_H = 297;
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const img = await loadImage(pages[i]);
        // Fit within A4 preserving aspect
        const ratio = Math.min(PAGE_W / (img.width / 4), PAGE_H / (img.height / 4));
        const w = (img.width / 4) * ratio;
        const h = (img.height / 4) * ratio;
        const x = (PAGE_W - w) / 2;
        const y = (PAGE_H - h) / 2;
        pdf.addImage(pages[i], "JPEG", x, y, w, h);
      }
      pdf.save("scanned-document.pdf");
      toast.success("PDF saved");
    } catch (e) {
      toast.error("PDF export failed");
    } finally {
      setBusy(false);
    }
  };

  const exportJPG = () => {
    pages.forEach((p, i) => {
      const a = document.createElement("a");
      a.href = p;
      a.download = `scan-page-${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const exportText = async () => {
    if (pages.length === 0) return;
    setBusy(true);
    setBusyMsg("Running OCR...");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      let allText = "";
      for (let i = 0; i < pages.length; i++) {
        setBusyMsg(`OCR page ${i + 1}/${pages.length}...`);
        const { data } = await worker.recognize(pages[i]);
        allText += `--- Page ${i + 1} ---\n${data.text}\n\n`;
      }
      await worker.terminate();
      const blob = new Blob([allText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scanned-text.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Text extracted");
    } catch {
      toast.error("OCR failed");
    } finally {
      setBusy(false);
    }
  };

  const copyFirst = async () => {
    if (pages.length === 0) return;
    try {
      const img = await loadImage(pages[0]);
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      c.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Image copied to clipboard");
      }, "image/png");
    } catch {
      toast.error("Copy not supported in this browser");
    }
  };

  // ----- UI -----
  return (
    <ToolPageShell
      title="Document Scanner"
      description="Scan documents with your camera or upload photos. Crop, enhance and export to PDF — entirely in your browser."
    >
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex gap-2 items-start mb-6">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>For best results, use on mobile with your camera. Desktop users can upload existing document photos.</p>
      </div>

      {/* Tabs */}
      {!editing && (
        <>
          <div className="flex gap-2 mb-5 p-1 rounded-xl bg-secondary/50 border border-border w-fit">
            <button
              onClick={() => setMode("camera")}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${mode === "camera" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Camera className="w-4 h-4" /> Use Camera
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${mode === "upload" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Upload className="w-4 h-4" /> Upload Image
            </button>
          </div>

          {mode === "camera" ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative bg-black">
                <video ref={videoRef} playsInline muted className="w-full max-h-[60vh] object-contain bg-black" />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    Requesting camera...
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
                <button
                  onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Switch camera
                </button>
                <button
                  onClick={captureFromCamera}
                  disabled={!stream}
                  className="rounded-full bg-foreground text-background w-16 h-16 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                  aria-label="Capture"
                >
                  <Camera className="w-7 h-7" />
                </button>
                <div className="w-[120px]" />
              </div>
            </div>
          ) : (
            <DropZone multiple accept="image/*" onFiles={onUpload} label="Drop document photos" hint="JPG, PNG, WEBP — multiple files supported" />
          )}
        </>
      )}

      {/* Editing view */}
      {editing && (
        <EditPanel
          src={editing}
          crop={crop}
          setCrop={setCrop}
          filter={filter}
          setFilter={setFilter}
          onCancel={() => setEditing(null)}
          onApply={processPage}
        />
      )}

      {/* Pages strip */}
      {pages.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{pages.length} page{pages.length !== 1 ? "s" : ""}</h3>
            <button
              onClick={() => setMode((m) => m)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another page
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pages.map((p, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={p} alt={`Page ${i + 1}`} className="h-32 w-auto rounded-lg border border-border object-cover bg-secondary" />
                <button
                  onClick={() => removePage(i)}
                  className="absolute -top-2 -right-2 bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-xs hover:opacity-90"
                  aria-label="Remove page"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 left-1 bg-background/80 text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={exportPDF} disabled={busy} className="rounded-lg bg-foreground text-background font-medium px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              <FileDown className="w-4 h-4" /> Save PDF
            </button>
            <button onClick={exportJPG} disabled={busy} className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50">
              <ImageIcon className="w-4 h-4" /> Save JPG
            </button>
            <button onClick={exportText} disabled={busy} className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50">
              <FileText className="w-4 h-4" /> Extract Text
            </button>
            <button onClick={copyFirst} disabled={busy} className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50">
              <Copy className="w-4 h-4" /> Copy
            </button>
          </div>

          {busy && (
            <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {busyMsg}
            </p>
          )}
        </div>
      )}

      <HowToUse
        steps={[
          "Take a photo or upload an image of your document.",
          "Adjust the crop area and choose an enhancement filter.",
          "Add more pages, then export as PDF, JPG or extract text with OCR.",
        ]}
      />

      <ToolSeoContent
        title="Free Document Scanner — Scan to PDF Online"
        description="Scan documents with your camera and convert to PDF instantly. Crop, enhance and OCR text extraction. Works on mobile and desktop, entirely in your browser."
        body={[
          "Skycally's Document Scanner replicates the core of CamScanner-style apps — capture, enhance, multi-page assembly and PDF export — without installing anything. The whole flow runs in your browser, so your scanned documents never leave your device.",
          "Use your phone's back camera to capture receipts, invoices, ID cards or notes, then apply the Magic, B&W, Grayscale or Photo filter to make text crisp and readable. Build multi-page PDFs and run OCR directly on the result to copy the text out.",
        ]}
        faqs={[
          { question: "Do I need to install an app?", answer: "No. The scanner runs entirely in your browser using your device's camera and the Canvas API." },
          { question: "Are my scans uploaded anywhere?", answer: "No. Capturing, cropping, filtering and PDF export all happen locally on your device." },
          { question: "Can I scan multiple pages into one PDF?", answer: "Yes. Add as many pages as you need, reorder by removing and re-adding, then export them all as a single PDF." },
          { question: "Does it extract text from scans?", answer: "Yes. The Extract Text button runs OCR locally with Tesseract and downloads a .txt file with the recognized content." },
          { question: "Which devices work best?", answer: "Mobile devices give the best results because of the back camera. Desktop users can upload existing photos of documents instead." },
        ]}
      />
    </ToolPageShell>
  );
}

// ---- Editing panel with draggable crop box ----
function EditPanel({
  src,
  crop,
  setCrop,
  filter,
  setFilter,
  onCancel,
  onApply,
}: {
  src: string;
  crop: CropBox;
  setCrop: (c: CropBox) => void;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | { type: "move" | "tl" | "tr" | "bl" | "br"; startX: number; startY: number; orig: CropBox }>(null);

  const onPointerDown = (type: "move" | "tl" | "tr" | "bl" | "br") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ type, startX: e.clientX, startY: e.clientY, orig: crop });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    let { x, y, w, h } = drag.orig;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    if (drag.type === "move") {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else if (drag.type === "tl") {
      const nx = clamp(x + dx, 0, x + w - 0.05);
      const ny = clamp(y + dy, 0, y + h - 0.05);
      w = w + (x - nx);
      h = h + (y - ny);
      x = nx;
      y = ny;
    } else if (drag.type === "tr") {
      const ny = clamp(y + dy, 0, y + h - 0.05);
      h = h + (y - ny);
      y = ny;
      w = clamp(w + dx, 0.05, 1 - x);
    } else if (drag.type === "bl") {
      const nx = clamp(x + dx, 0, x + w - 0.05);
      w = w + (x - nx);
      x = nx;
      h = clamp(h + dy, 0.05, 1 - y);
    } else if (drag.type === "br") {
      w = clamp(w + dx, 0.05, 1 - x);
      h = clamp(h + dy, 0.05, 1 - y);
    }
    setCrop({ x, y, w, h });
  };

  const onPointerUp = () => setDrag(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative w-full select-none touch-none bg-black rounded-lg overflow-hidden"
      >
        <img src={src} alt="To scan" className="w-full max-h-[60vh] object-contain" draggable={false} />
        {/* dim overlay outside crop */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 0 9999px rgba(0,0,0,0.5)`, clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${crop.y * 100}%, ${crop.x * 100}% ${crop.y * 100}%, ${crop.x * 100}% ${(crop.y + crop.h) * 100}%, ${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%, ${(crop.x + crop.w) * 100}% ${crop.y * 100}%, 0 ${crop.y * 100}%)` }} />
        {/* crop box */}
        <div
          onPointerDown={onPointerDown("move")}
          className="absolute border-2 cursor-move"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.w * 100}%`,
            height: `${crop.h * 100}%`,
            borderColor: "var(--cyan-brand)",
          }}
        >
          {(["tl", "tr", "bl", "br"] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={onPointerDown(corner)}
              className="absolute w-5 h-5 rounded-full border-2 border-white"
              style={{
                background: "var(--cyan-brand)",
                top: corner.startsWith("t") ? -10 : "auto",
                bottom: corner.startsWith("b") ? -10 : "auto",
                left: corner.endsWith("l") ? -10 : "auto",
                right: corner.endsWith("r") ? -10 : "auto",
                cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filter === f.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
          Cancel
        </button>
        <button onClick={onApply} className="rounded-lg bg-foreground text-background font-medium px-5 py-2">
          Add page
        </button>
      </div>
    </div>
  );
}
