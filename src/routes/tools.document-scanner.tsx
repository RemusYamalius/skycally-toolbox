import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  X,
  FileDown,
  Image as ImageIcon,
  FileText,
  Copy,
  Plus,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

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

// ─── Filters ─────────────────────────────────────────────────────────────────

function applyFilter(canvas: HTMLCanvasElement, mode: FilterMode) {
  if (mode === "original") return;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  switch (mode) {
    case "magic": {
      // Adaptive thresholding: makes text crisp black, background white
      // regardless of lighting conditions — same as CamScanner "Magic Color"
      const w = canvas.width,
        h = canvas.height;
      const blockSize = Math.max(11, Math.round(Math.min(w, h) / 20) | 1); // must be odd
      const half = Math.floor(blockSize / 2);

      // 1. Convert to grayscale
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      }

      // 2. Compute local mean with integral image (fast O(1) per pixel)
      const integral = new Float64Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          integral[(y + 1) * (w + 1) + (x + 1)] =
            gray[y * w + x] +
            integral[y * (w + 1) + (x + 1)] +
            integral[(y + 1) * (w + 1) + x] -
            integral[y * (w + 1) + x];
        }
      }

      const C = 8; // constant subtracted from local mean
      for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - half);
        const y1 = Math.min(h - 1, y + half);
        for (let x = 0; x < w; x++) {
          const x0 = Math.max(0, x - half);
          const x1 = Math.min(w - 1, x + half);
          const count = (y1 - y0 + 1) * (x1 - x0 + 1);
          const sum =
            integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
            integral[y0 * (w + 1) + (x1 + 1)] -
            integral[(y1 + 1) * (w + 1) + x0] +
            integral[y0 * (w + 1) + x0];
          const mean = sum / count;
          const pixel = gray[y * w + x] < mean - C ? 0 : 255;
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = pixel;
        }
      }
      break;
    }

    case "grayscale":
      for (let i = 0; i < d.length; i += 4) {
        const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      break;

    case "bw": {
      // Global Otsu threshold for clean black & white
      const hist = new Int32Array(256);
      for (let i = 0; i < d.length; i += 4) {
        hist[Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)]++;
      }
      const total = canvas.width * canvas.height;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      let sumB = 0,
        wB = 0,
        max = 0,
        threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (!wB) continue;
        const wF = total - wB;
        if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) ** 2;
        if (between > max) {
          max = between;
          threshold = t;
        }
      }
      for (let i = 0; i < d.length; i += 4) {
        const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        d[i] = d[i + 1] = d[i + 2] = g >= threshold ? 255 : 0;
      }
      break;
    }

    case "photo":
      // Warm contrast boost
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 1.12);
        d[i + 1] = Math.min(255, d[i + 1] * 1.06);
        d[i + 2] = Math.min(255, d[i + 2] * 0.98);
        // S-curve contrast
        for (let c = 0; c < 3; c++) {
          const v = d[i + c] / 255;
          d[i + c] = Math.min(255, Math.round(255 * (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2)));
        }
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

// ─── Perspective warp ─────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = src;
  });
}

function dist2(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function warpToCanvas(img: HTMLImageElement, corners: Point[]): Promise<HTMLCanvasElement> {
  const [tl, tr, br, bl] = corners;
  const w = Math.max(1, Math.round(Math.max(dist2(tl, tr), dist2(bl, br))));
  const h = Math.max(1, Math.round(Math.max(dist2(tl, bl), dist2(tr, br))));

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;

  // Try OpenCV perspective warp first (best quality)
  const cv = typeof window !== "undefined" ? (window as any).cv : null;
  if (cv && cv.Mat) {
    let src: any, dst: any, M: any, srcPts: any, dstPts: any;
    try {
      src = cv.imread(img);
      dst = new cv.Mat();
      srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
      M = cv.getPerspectiveTransform(srcPts, dstPts);
      cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
      cv.imshow(out, dst);
      return out;
    } catch (e) {
      console.warn("OpenCV warp failed, using CSS transform fallback:", e);
    } finally {
      [src, dst, M, srcPts, dstPts].forEach((m) => {
        try {
          m?.delete?.();
        } catch {}
      });
    }
  }

  // Pure-Canvas fallback: bilinear perspective warp
  // Uses scanline rendering with barycentric interpolation
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext("2d")!;
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, img.width, img.height).data;

  const outCtx = out.getContext("2d")!;
  const outData = outCtx.createImageData(w, h);
  const od = outData.data;

  // Compute inverse perspective matrix
  // Map each output pixel back to source
  const pts = [
    [tl.x, tl.y],
    [tr.x, tr.y],
    [br.x, br.y],
    [bl.x, bl.y],
  ];
  const dst2src = (dx: number, dy: number): [number, number] => {
    // Bilinear interpolation of source coordinates
    const tx = dx / w,
      ty = dy / h;
    const sx =
      (1 - tx) * (1 - ty) * pts[0][0] + tx * (1 - ty) * pts[1][0] + tx * ty * pts[2][0] + (1 - tx) * ty * pts[3][0];
    const sy =
      (1 - tx) * (1 - ty) * pts[0][1] + tx * (1 - ty) * pts[1][1] + tx * ty * pts[2][1] + (1 - tx) * ty * pts[3][1];
    return [sx, sy];
  };

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const [sx, sy] = dst2src(dx, dy);
      const x = Math.max(0, Math.min(img.width - 1, Math.round(sx)));
      const y = Math.max(0, Math.min(img.height - 1, Math.round(sy)));
      const si = (y * img.width + x) * 4;
      const di = (dy * w + dx) * 4;
      od[di] = srcData[si];
      od[di + 1] = srcData[si + 1];
      od[di + 2] = srcData[si + 2];
      od[di + 3] = srcData[si + 3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

// ─── Tips panel ──────────────────────────────────────────────────────────────

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
          <li>Ensure good, even lighting — avoid shadows falling across the document.</li>
          <li>Hold the camera parallel to the document, directly above it.</li>
          <li>Make sure all 4 corners are clearly visible in the frame.</li>
          <li>Keep the image in focus — tap the document on your phone screen to focus.</li>
        </ul>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function DocumentScanner() {
  const [mode, setMode] = useState<Mode>("upload");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [editingSize, setEditingSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [corners, setCorners] = useState<Point[]>([]);
  const [filter, setFilter] = useState<FilterMode>("magic");
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");

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

  const beginEditing = async (dataUrl: string) => {
    const img = await loadImage(dataUrl);
    setEditing(dataUrl);
    setEditingSize({ w: img.width, h: img.height });
    // Set a sensible initial rectangle while detection runs
    const fb = fallbackCorners(img.width, img.height);
    setCorners([fb.topLeft, fb.topRight, fb.bottomRight, fb.bottomLeft]);
    setDetectionStatus("loading");

    // Try to load OpenCV in background (don't block UI)
    try {
      await Promise.race([loadOpenCV(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);
    } catch {
      // OpenCV unavailable — pure-Canvas will handle it
    }

    try {
      const result = await detectDocumentCorners(img, img.width, img.height);
      setCorners([result.topLeft, result.topRight, result.bottomRight, result.bottomLeft]);
      setDetectionStatus(result.detected ? "detected" : "fallback");
    } catch {
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
    setPages((p) => [...p, c.toDataURL("image/jpeg", 0.95)]);
    setEditing(null);
    setDetectionStatus("idle");
    toast.success("Page added");
  };

  const removePage = (i: number) => setPages((p) => p.filter((_, idx) => idx !== i));

  const exportPDF = async () => {
    if (!pages.length) return;
    setBusy(true);
    setBusyMsg("Building PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const PAGE_W = 210,
        PAGE_H = 297; // A4 mm
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const img = await loadImage(pages[i]);
        // Fit image to A4 preserving aspect ratio, full-bleed
        const imgRatio = img.width / img.height;
        const pageRatio = PAGE_W / PAGE_H;
        let w, h, x, y;
        if (imgRatio > pageRatio) {
          w = PAGE_W;
          h = PAGE_W / imgRatio;
          x = 0;
          y = (PAGE_H - h) / 2;
        } else {
          h = PAGE_H;
          w = PAGE_H * imgRatio;
          x = (PAGE_W - w) / 2;
          y = 0;
        }
        pdf.addImage(pages[i], "JPEG", x, y, w, h, undefined, "FAST");
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
    if (!pages.length) return;
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
    if (!pages.length) return;
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
      description="Scan documents with your camera or upload photos. Auto edge detection, perspective correction, and export to PDF — entirely in your browser."
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
                  onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
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
            <DropZone
              multiple
              accept="image/*"
              onFiles={onUpload}
              label="Drop document photos"
              hint="JPG, PNG, WEBP — multiple files supported"
            />
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
            <h3 className="text-sm font-semibold">
              {pages.length} page{pages.length !== 1 ? "s" : ""}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another page
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pages.map((p, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img
                  src={p}
                  alt={`Page ${i + 1}`}
                  className="h-32 w-auto rounded-lg border border-border object-cover bg-secondary"
                />
                <button
                  onClick={() => removePage(i)}
                  className="absolute -top-2 -right-2 bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-xs hover:opacity-90"
                  aria-label="Remove page"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 left-1 bg-background/80 text-[10px] px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={exportPDF}
              disabled={busy}
              className="rounded-lg bg-foreground text-background font-medium px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" /> Save PDF
            </button>
            <button
              onClick={exportJPG}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" /> Save JPG
            </button>
            <button
              onClick={exportText}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Extract Text
            </button>
            <button
              onClick={copyFirst}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50"
            >
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
          "Take a photo with your camera or upload a document image.",
          "Drag the blue corner handles to precisely outline your document, then choose a filter.",
          "Add more pages if needed, then export as PDF, JPG, or extract text with OCR.",
        ]}
      />

      <ToolSeoContent
        title="Free Document Scanner — Scan to PDF Online, No App Needed"
        description="Scan documents with your camera and convert to PDF instantly. Auto edge detection, perspective correction, Magic filter, OCR text extraction. Works on mobile and desktop — no upload, no signup."
        body={[
          "Skycally's Document Scanner brings CamScanner-quality scanning to your browser. Capture a photo with your phone camera or upload an existing image, and the scanner automatically detects the document's four corners and applies perspective correction — transforming a skewed photo into a flat, straight-edged scan. No app to install, no account required.",
          "The Magic filter uses adaptive thresholding to make text crisp black and the background pure white, compensating for uneven lighting and shadows automatically — the same technique used by CamScanner and the WhatsApp document scanner. The B&W filter uses Otsu's global threshold for high-contrast documents, while Grayscale and Photo modes preserve more of the original image.",
          "Build multi-page PDF documents by adding scans one at a time. Each page is perspective-corrected and filtered independently before being assembled into a single PDF that fills the A4 page. The Extract Text button runs OCR locally using Tesseract.js — your documents never leave your device.",
        ]}
        faqs={[
          {
            question: "Do I need to install an app?",
            answer:
              "No. The scanner runs entirely in your browser using your device's camera and the Canvas API. It works on any modern mobile or desktop browser without installation.",
          },
          {
            question: "Are my scans uploaded to a server?",
            answer:
              "No. Capturing, edge detection, perspective correction, filtering, and PDF export all run locally on your device. Your documents are never transmitted anywhere.",
          },
          {
            question: "How does the automatic edge detection work?",
            answer:
              "The scanner uses a combination of Sobel edge detection and Hough line analysis to find the four corners of your document. If OpenCV is available in your browser, it uses that for higher accuracy. If not, a pure JavaScript fallback handles detection. You can always drag the corner handles to fine-tune the detected area.",
          },
          {
            question: "What is the Magic filter?",
            answer:
              "Magic uses adaptive thresholding — it calculates a local brightness threshold for each area of the image separately, then converts pixels above the threshold to white and below to black. This makes text sharp and readable regardless of shadows, uneven lighting, or off-white paper — similar to CamScanner's Magic Color mode.",
          },
          {
            question: "What if auto-detection gets the corners wrong?",
            answer:
              "Drag any of the four blue corner handles to adjust the selection precisely. The handles are large and touch-friendly on mobile. For best automatic detection, photograph the document on a contrasting background with even lighting.",
          },
          {
            question: "Can I scan multiple pages into one PDF?",
            answer:
              "Yes. After processing each page, click 'Add another page' to capture or upload the next one. All pages are assembled into a single PDF when you click Save PDF.",
          },
          {
            question: "Does it extract text from scans?",
            answer:
              "Yes. Click Extract Text to run OCR (Optical Character Recognition) locally using Tesseract.js. The recognized text is downloaded as a .txt file. English is supported by default; accuracy depends on image quality.",
          },
          {
            question: "What is the best way to get a good scan?",
            answer:
              "Place the document on a dark contrasting surface (dark table for white paper), ensure even lighting without shadows, hold the camera directly above the document (parallel, not at an angle), and make sure all four corners are visible. Tap the document on your phone screen to focus before capturing.",
          },
        ]}
      />

      <RelatedTools currentSlug="document-scanner" />
    </ToolPageShell>
  );
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────

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
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

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
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, [src]);

  // Draw overlay: dimmed mask with clear document window + corner handles
  useEffect(() => {
    const c = overlayRef.current;
    if (!c || corners.length !== 4 || !imageSize.w || !imageSize.h) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    const sx = c.width / imageSize.w;
    const sy = c.height / imageSize.h;
    const pts = corners.map((p) => ({ x: p.x * sx, y: p.y * sy }));

    // Dim outside the selection
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Border
    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Edge midpoint lines for easier dragging feedback
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4];
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,212,255,0.5)";
      ctx.fill();
    }

    // Corner handles
    pts.forEach((p, idx) => {
      const dragging = dragIdx === idx;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dragging ? 22 : 18, 0, Math.PI * 2);
      ctx.fillStyle = dragging ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.25)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, dragging ? 13 : 10, 0, Math.PI * 2);
      ctx.fillStyle = "#00D4FF";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
  }, [corners, displaySize, imageSize, dragIdx]);

  const clientToImage = (clientX: number, clientY: number) => {
    const c = overlayRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * imageSize.w,
      y: ((clientY - r.top) / r.height) * imageSize.h,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (corners.length !== 4 || !overlayRef.current) return;
    const p = clientToImage(e.clientX, e.clientY);
    let nearest = -1,
      nearestDist = Infinity;
    corners.forEach((c, i) => {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    const tol = (60 / overlayRef.current.width) * imageSize.w;
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
      <div className="relative w-full bg-black rounded-lg overflow-hidden select-none">
        <img
          ref={imgRef}
          src={src}
          alt="Document to scan"
          className="w-full max-h-[65vh] object-contain block"
          draggable={false}
          onLoad={syncSize}
        />
        <canvas
          ref={overlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute touch-none cursor-crosshair"
          style={{
            width: displaySize.w,
            height: displaySize.h,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
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
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-400 px-3 py-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Document detected — drag corners to adjust if needed
          </span>
        )}
        {status === "fallback" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 text-amber-400 px-3 py-1 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Could not auto-detect — drag the blue corners to outline your
            document
          </span>
        )}
      </div>

      {/* Filter picker */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === f.id
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button onClick={onApply} className="rounded-lg bg-foreground text-background font-medium px-5 py-2">
          Add page →
        </button>
      </div>
    </div>
  );
}
