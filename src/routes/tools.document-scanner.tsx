import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, X, FileDown, Image as ImageIcon, FileText, Copy, Plus, Loader2, Info, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { loadOpenCV } from "@/utils/opencvLoader";
import { detectDocumentCorners, fallbackCorners, type Point } from "@/utils/edgeDetection";

export const Route = createFileRoute("/tools/document-scanner")({
  head: () => buildToolMeta(toolBySlug("document-scanner", tools)),
  component: DocumentScanner,
});

type Mode = "camera" | "upload";
type FilterMode = "original" | "magic" | "grayscale" | "bw" | "photo";
type DetectionStatus = "idle" | "loading" | "detected" | "fallback";

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

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Perspective-warp using OpenCV if available; falls back to bounding-box crop.
async function warpToCanvas(img: HTMLImageElement, corners: Point[]): Promise<HTMLCanvasElement> {
  const [tl, tr, br, bl] = corners;
  const widthOut = Math.max(dist(tl, tr), dist(bl, br));
  const heightOut = Math.max(dist(tl, bl), dist(tr, br));
  const w = Math.max(1, Math.round(widthOut));
  const h = Math.max(1, Math.round(heightOut));

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;

  const cv = (typeof window !== "undefined" ? (window as any).cv : null);
  if (cv && cv.Mat) {
    let src: any, dst: any, M: any, srcTri: any, dstTri: any;
    try {
      src = cv.imread(img);
      dst = new cv.Mat();
      srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
      M = cv.getPerspectiveTransform(srcTri, dstTri);
      cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
      cv.imshow(out, dst);
      return out;
    } catch (e) {
      console.warn("Perspective warp failed, using bounding box:", e);
    } finally {
      [src, dst, M, srcTri, dstTri].forEach((m) => {
        try {
          m?.delete?.();
        } catch {
          // ignore
        }
      });
    }
  }

  // Fallback: bounding-box crop
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxX = Math.min(img.width, Math.max(...xs));
  const maxY = Math.min(img.height, Math.max(...ys));
  const bw = Math.max(1, Math.round(maxX - minX));
  const bh = Math.max(1, Math.round(maxY - minY));
  out.width = bw;
  out.height = bh;
  out.getContext("2d")!.drawImage(img, minX, minY, bw, bh, 0, 0, bw, bh);
  return out;
}

function ScanTips({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-secondary/40 mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/60"
      >
        <span>📸 Tips for best results</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <ul className="px-5 pb-4 text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Place document on a contrasting background (dark table for white paper).</li>
          <li>Ensure good lighting — avoid shadows on the document.</li>
          <li>Keep the camera parallel to the document, not at an angle.</li>
          <li>Make sure all 4 corners are visible in the frame.</li>
        </ul>
      )}
    </div>
  );
}

function DocumentScanner() {
  const [mode, setMode] = useState<Mode>("upload");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Editing state
  const [editing, setEditing] = useState<string | null>(null);
  const [editingSize, setEditingSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [corners, setCorners] = useState<Point[]>([]);
  const [filter, setFilter] = useState<FilterMode>("magic");
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");

  // Multi-page
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");

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
    } catch {
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

  // Run detection on a freshly-loaded image dataURL
  const beginEditing = async (dataUrl: string) => {
    const img = await loadImage(dataUrl);
    setEditing(dataUrl);
    setEditingSize({ w: img.width, h: img.height });
    setCorners([
      { x: img.width * 0.05, y: img.height * 0.05 },
      { x: img.width * 0.95, y: img.height * 0.05 },
      { x: img.width * 0.95, y: img.height * 0.95 },
      { x: img.width * 0.05, y: img.height * 0.95 },
    ]);
    setDetectionStatus("loading");
    try {
      await loadOpenCV();
      const result = await detectDocumentCorners(img, img.width, img.height);
      setCorners([result.topLeft, result.topRight, result.bottomRight, result.bottomLeft]);
      setDetectionStatus(result.detected ? "detected" : "fallback");
    } catch (err) {
      console.warn("OpenCV load failed:", err);
      const fb = fallbackCorners(img.width, img.height);
      setCorners([fb.topLeft, fb.topRight, fb.bottomRight, fb.bottomLeft]);
      setDetectionStatus("fallback");
    }
  };

  const captureFromCamera = async () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    await beginEditing(c.toDataURL("image/jpeg", 0.95));
  };

  const onUpload = async (files: File[]) => {
    if (!files.length) return;
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
    await beginEditing(reads[0]);
    if (reads.length > 1) setPages((p) => [...p, ...reads.slice(1)]);
  };

  const processPage = async () => {
    if (!editing || corners.length !== 4) return;
    const img = await loadImage(editing);
    const c = await warpToCanvas(img, corners);
    applyFilter(c, filter);
    const out = c.toDataURL("image/jpeg", 0.92);
    setPages((p) => [...p, out]);
    setEditing(null);
    setDetectionStatus("idle");
    toast.success("Page added");
  };

  const removePage = (i: number) => setPages((p) => p.filter((_, idx) => idx !== i));

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
        const ratio = Math.min(PAGE_W / (img.width / 4), PAGE_H / (img.height / 4));
        const w = (img.width / 4) * ratio;
        const h = (img.height / 4) * ratio;
        const x = (PAGE_W - w) / 2;
        const y = (PAGE_H - h) / 2;
        pdf.addImage(pages[i], "JPEG", x, y, w, h);
      }
      pdf.save("scanned-document.pdf");
      toast.success("PDF saved");
    } catch {
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

  return (
    <ToolPageShell
      title="Document Scanner"
      description="Scan documents with your camera or upload photos. Crop, enhance and export to PDF — entirely in your browser."
    >
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex gap-2 items-start mb-5">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>For best results, use on mobile with your camera. Desktop users can upload existing document photos.</p>
      </div>

      {!editing && <ScanTips />}

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

      {editing && (
        <EditPanel
          src={editing}
          imageSize={editingSize}
          corners={corners}
          setCorners={setCorners}
          filter={filter}
          setFilter={setFilter}
          status={detectionStatus}
          onCancel={() => {
            setEditing(null);
            setDetectionStatus("idle");
          }}
          onApply={processPage}
        />
      )}

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
          "Adjust the auto-detected corners and choose an enhancement filter.",
          "Add more pages, then export as PDF, JPG or extract text with OCR.",
        ]}
      />

      <RelatedTools currentSlug="document-scanner" />

      <ToolSeoContent
        title="Free Document Scanner — Scan to PDF Online"
        description="Scan documents with your camera and convert to PDF instantly. Auto edge detection, perspective correction, OCR text extraction. Works on mobile and desktop, entirely in your browser."
        body={[
          "Skycally's Document Scanner replicates the core of CamScanner-style apps — capture, automatic edge detection, perspective correction, multi-page assembly and PDF export — without installing anything. The whole flow runs in your browser, so your scanned documents never leave your device.",
          "Use your phone's back camera to capture receipts, invoices, ID cards or notes. The scanner finds the document's four corners automatically using OpenCV and lets you fine-tune them by dragging. Apply the Magic, B&W, Grayscale or Photo filter to make text crisp and readable, then build multi-page PDFs and run OCR directly on the result.",
        ]}
        faqs={[
          { question: "Do I need to install an app?", answer: "No. The scanner runs entirely in your browser using your device's camera, OpenCV.js and the Canvas API." },
          { question: "Are my scans uploaded anywhere?", answer: "No. Capturing, edge detection, cropping, filtering and PDF export all happen locally on your device." },
          { question: "What if auto-detection fails?", answer: "The scanner falls back to a default rectangle that you can drag to match your document. A status badge tells you which mode is active." },
          { question: "Can I scan multiple pages into one PDF?", answer: "Yes. Add as many pages as you need, then export them all as a single PDF." },
          { question: "Does it extract text from scans?", answer: "Yes. The Extract Text button runs OCR locally with Tesseract and downloads a .txt file with the recognized content." },
        ]}
      />
    </ToolPageShell>
  );
}

// ---- Editing panel: overlay canvas with draggable corner handles ----
function EditPanel({
  src,
  imageSize,
  corners,
  setCorners,
  filter,
  setFilter,
  status,
  onCancel,
  onApply,
}: {
  src: string;
  imageSize: { w: number; h: number };
  corners: Point[];
  setCorners: (c: Point[]) => void;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  status: DetectionStatus;
  onCancel: () => void;
  onApply: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Sync overlay canvas to displayed image size
  const syncSize = () => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    setDisplaySize({ w: r.width, h: r.height });
    const c = overlayRef.current;
    if (c) {
      c.width = r.width;
      c.height = r.height;
    }
  };

  useEffect(() => {
    syncSize();
    const onResize = () => syncSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src]);

  // Draw overlay
  useEffect(() => {
    const c = overlayRef.current;
    if (!c || corners.length !== 4 || !imageSize.w || !imageSize.h) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    const sx = c.width / imageSize.w;
    const sy = c.height / imageSize.h;
    const pts = corners.map((p) => ({ x: p.x * sx, y: p.y * sy }));

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,212,255,0.3)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#00D4FF";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
  }, [corners, displaySize, imageSize]);

  const clientToImage = (clientX: number, clientY: number) => {
    const c = overlayRef.current!;
    const r = c.getBoundingClientRect();
    const dx = clientX - r.left;
    const dy = clientY - r.top;
    return { x: (dx / r.width) * imageSize.w, y: (dy / r.height) * imageSize.h };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (corners.length !== 4 || !overlayRef.current) return;
    const p = clientToImage(e.clientX, e.clientY);
    let nearest = -1;
    let nearestDist = Infinity;
    corners.forEach((c, i) => {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    // 50px tolerance in image space, scaled to display
    const tol = (50 / overlayRef.current.width) * imageSize.w;
    if (nearestDist <= tol) {
      setDragIdx(nearest);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    const p = clientToImage(e.clientX, e.clientY);
    const next = corners.slice();
    next[dragIdx] = {
      x: Math.max(0, Math.min(imageSize.w, p.x)),
      y: Math.max(0, Math.min(imageSize.h, p.y)),
    };
    setCorners(next);
  };

  const onPointerUp = () => setDragIdx(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div ref={wrapRef} className="relative w-full bg-black rounded-lg overflow-hidden select-none">
        <img
          ref={imgRef}
          src={src}
          alt="To scan"
          className="w-full max-h-[60vh] object-contain block"
          draggable={false}
          onLoad={syncSize}
        />
        <canvas
          ref={overlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          style={{ width: displaySize.w, height: displaySize.h, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* Status badge */}
      <div className="mt-3 min-h-[28px]">
        {status === "loading" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting document edges...
          </span>
        )}
        {status === "detected" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Document detected — adjust corners if needed
          </span>
        )}
        {status === "fallback" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Could not auto-detect — drag the corners manually
          </span>
        )}
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
