import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFRef } from "pdf-lib";

export const Route = createFileRoute("/tools/pdf-watermark-remover")({
  head: () => buildToolMeta(toolBySlug("pdf-watermark-remover", tools)),
  component: PdfWatermarkRemover,
});

// ---------- Helpers ----------

function decodeStreamBytes(stream: any): Uint8Array {
  try {
    if (typeof stream.getUnencodedContents === "function") {
      return stream.getUnencodedContents();
    }
  } catch {}
  try {
    if (typeof stream.getContents === "function") return stream.getContents();
  } catch {}
  return new Uint8Array();
}

function bytesToLatin1(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

// Extract all text strings shown via Tj / TJ from a decoded content stream.
function extractShownStrings(content: string): string[] {
  const out: string[] = [];
  // (...)Tj  and  (...)'  and  (...)"
  const reTj = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = reTj.exec(content)) !== null) out.push(m[1]);
  // TJ arrays
  const reTJ = /\[([^\]]*)\]\s*TJ/g;
  while ((m = reTJ.exec(content)) !== null) {
    const inner = m[1];
    const sre = /\(((?:\\.|[^()\\])*)\)/g;
    let s: RegExpExecArray | null;
    let joined = "";
    while ((s = sre.exec(inner)) !== null) joined += s[1];
    if (joined) out.push(joined);
  }
  return out;
}

// Build set of "watermark" strings that repeat across > 50% of pages.
function detectRepeatedStrings(pageContents: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of pageContents) {
    const seen = new Set(extractShownStrings(c).map((s) => s.trim()).filter((s) => s.length >= 3));
    for (const s of seen) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const threshold = Math.max(2, Math.floor(pageContents.length * 0.5) + 1);
  const out = new Set<string>();
  for (const [s, n] of counts) if (n >= threshold) out.add(s);
  return out;
}

// Strip BT...ET text blocks where any shown string is in `targets` OR the block
// is rotated (detected via a `cm` with rotation just before / inside the block)
// OR uses low-alpha graphics state.
function stripWatermarkTextBlocks(
  content: string,
  targets: Set<string>,
  lowAlphaGStates: Set<string>,
): { out: string; removed: number } {
  let removed = 0;
  // Find all BT ... ET blocks (non-greedy)
  const re = /BT\b([\s\S]*?)\bET\b/g;
  const out = content.replace(re, (full, body: string) => {
    const shown = extractShownStrings(body).map((s) => s.trim());
    const matchesTarget = shown.some((s) => targets.has(s));
    // low alpha via /Name gs inside or just before block
    const gsRefs = [...body.matchAll(/\/([A-Za-z0-9_.+-]+)\s+gs/g)].map((m) => m[1]);
    const lowAlpha = gsRefs.some((g) => lowAlphaGStates.has(g));
    // rotation: cm with non-axis-aligned matrix (a,b,c,d,e,f cm)
    const cmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm/g;
    let rotated = false;
    let cm: RegExpExecArray | null;
    while ((cm = cmRe.exec(body)) !== null) {
      const b = parseFloat(cm[2]);
      const c = parseFloat(cm[3]);
      if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) {
        rotated = true;
        break;
      }
    }
    // Also detect Tm rotation matrices
    const tmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/g;
    let tm: RegExpExecArray | null;
    while ((tm = tmRe.exec(body)) !== null) {
      const b = parseFloat(tm[2]);
      const c = parseFloat(tm[3]);
      if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) {
        rotated = true;
        break;
      }
    }
    if (matchesTarget || lowAlpha || rotated) {
      removed++;
      return ""; // drop the whole text block
    }
    return full;
  });
  return { out, removed };
}

// Find ExtGState resources with ca<0.5 or CA<0.5 on a page.
function findLowAlphaGStates(page: any): Set<string> {
  const out = new Set<string>();
  try {
    const resources = page.node.Resources();
    if (!resources) return out;
    const ext = resources.lookup(PDFName.of("ExtGState"));
    if (!ext || !(ext instanceof PDFDict)) return out;
    const entries = ext.entries();
    for (const [key, val] of entries) {
      let gs: any = val;
      try {
        if (gs instanceof PDFRef) gs = page.doc.context.lookup(gs);
      } catch {}
      if (gs instanceof PDFDict) {
        const ca = gs.lookup(PDFName.of("ca"));
        const CA = gs.lookup(PDFName.of("CA"));
        const caV = ca && typeof (ca as any).asNumber === "function" ? (ca as any).asNumber() : undefined;
        const CAV = CA && typeof (CA as any).asNumber === "function" ? (CA as any).asNumber() : undefined;
        if ((caV !== undefined && caV < 0.5) || (CAV !== undefined && CAV < 0.5)) {
          out.add(key.asString().replace(/^\//, ""));
        }
      }
    }
  } catch {}
  return out;
}

// Strategy 2: remove large image draws (>40% of page in both dims, by `cm` scale).
function stripLargeImageDraws(content: string, pageWidth: number, pageHeight: number): { out: string; removed: number } {
  let removed = 0;
  // Walk lines, track last cm matrix, drop `/Name Do` if scale too large.
  const tokens = content.split(/(\r?\n)/);
  const cmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm/;
  const doRe = /\/([A-Za-z0-9_.+-]+)\s+Do/;
  let lastA = 1, lastD = 1;
  const out: string[] = [];
  for (const tok of tokens) {
    const cm = cmRe.exec(tok);
    if (cm) {
      lastA = Math.abs(parseFloat(cm[1]));
      lastD = Math.abs(parseFloat(cm[4]));
    }
    const d = doRe.exec(tok);
    if (d) {
      const widthFrac = lastA / Math.max(1, pageWidth);
      const heightFrac = lastD / Math.max(1, pageHeight);
      if (widthFrac > 0.4 && heightFrac > 0.4) {
        removed++;
        // drop the Do; also try to drop the q/Q-less local block by skipping this token
        out.push(tok.replace(doRe, ""));
        continue;
      }
    }
    out.push(tok);
  }
  return { out: out.join(""), removed };
}

// Strategy 3: remove /Stamp and /Watermark annotations.
function stripStampAnnots(page: any): number {
  let removed = 0;
  try {
    const annots = page.node.Annots();
    if (!annots || !(annots instanceof PDFArray)) return 0;
    const keep: any[] = [];
    const len = annots.size();
    for (let i = 0; i < len; i++) {
      let a: any = annots.get(i);
      let aDict: any = a;
      try {
        if (a instanceof PDFRef) aDict = page.doc.context.lookup(a);
      } catch {}
      let drop = false;
      if (aDict instanceof PDFDict) {
        const sub = aDict.lookup(PDFName.of("Subtype"));
        const name = sub && typeof (sub as any).asString === "function" ? (sub as any).asString() : "";
        if (name === "/Stamp" || name === "/Watermark") drop = true;
      }
      if (drop) removed++;
      else keep.push(a);
    }
    if (removed > 0) {
      const newArr = page.doc.context.obj(keep);
      page.node.set(PDFName.of("Annots"), newArr);
    }
  } catch {}
  return removed;
}

async function runStrategies1to3(bytes: ArrayBuffer): Promise<{ pdfBytes: Uint8Array; removed: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  // First pass: decode all content streams (one merged string per page).
  const pageContents: string[] = pages.map((p: any) => {
    const contents = p.node.normalizedEntries().Contents;
    if (!contents) return "";
    const arr: any[] = contents instanceof PDFArray ? contents.asArray() : [contents];
    let merged = "";
    for (const item of arr) {
      let s: any = item;
      try {
        if (s instanceof PDFRef) s = pdf.context.lookup(s);
      } catch {}
      const bytes = decodeStreamBytes(s);
      merged += bytesToLatin1(bytes) + "\n";
    }
    return merged;
  });

  const repeated = detectRepeatedStrings(pageContents);

  let totalRemoved = 0;
  pages.forEach((page: any, i: number) => {
    const lowAlpha = findLowAlphaGStates(page);
    let content = pageContents[i];
    if (!content) return;

    // Strategy 1
    const r1 = stripWatermarkTextBlocks(content, repeated, lowAlpha);
    content = r1.out;
    totalRemoved += r1.removed;

    // Strategy 2
    const { width, height } = page.getSize();
    const r2 = stripLargeImageDraws(content, width, height);
    content = r2.out;
    totalRemoved += r2.removed;

    // Strategy 3 (annotations)
    totalRemoved += stripStampAnnots(page);

    // Write back content stream as a single new stream replacing Contents.
    if (r1.removed > 0 || r2.removed > 0) {
      const newStream = pdf.context.stream(latin1ToBytes(content));
      const ref = pdf.context.register(newStream);
      page.node.set(PDFName.of("Contents"), ref);
    }
  });

  const out = await pdf.save();
  return { pdfBytes: out, removed: totalRemoved };
}

// Strategy 4: rasterize via pdfjs and rebuild PDF.
async function runRasterRebuild(bytes: ArrayBuffer, onProgress: (pct: number) => void): Promise<Uint8Array> {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
  const pdf = await loadingTask.promise;
  const newPdf = await PDFDocument.create();
  const scale = 2;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
    const img = await newPdf.embedJpg(jpgBytes);
    const w = viewport.width / scale;
    const h = viewport.height / scale;
    const p = newPdf.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
    onProgress(Math.round((i / pdf.numPages) * 100));
  }

  return await newPdf.save();
}

// ---------- Component ----------

function PdfWatermarkRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "processing" | "advanced" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [removedCount, setRemovedCount] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [askAdvanced, setAskAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setStage("idle");
    setProgress(0);
    setError("");
    setRemovedCount(0);
    setDownloadUrl("");
    setAskAdvanced(false);
  };

  const onFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("الرجاء اختيار ملف PDF فقط");
      return;
    }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(f);
    setError("");
    setStage("idle");
    setProgress(0);
    setRemovedCount(0);
    setDownloadUrl("");
    setAskAdvanced(false);
  };

  const buildDownload = (bytes: Uint8Array, suffix: string) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    // auto-download once
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name.replace(/\.pdf$/i, "") || "document") + suffix + ".pdf";
    a.click();
  };

  const run = async () => {
    if (!file) return;
    setStage("processing");
    setProgress(10);
    setError("");
    setAskAdvanced(false);
    try {
      const buf = await file.arrayBuffer();
      setProgress(30);
      const { pdfBytes, removed } = await runStrategies1to3(buf);
      setProgress(90);
      setRemovedCount(removed);
      buildDownload(pdfBytes, "-clean");
      setStage("done");
      setProgress(100);
      if (removed === 0) setAskAdvanced(true);
    } catch (e: any) {
      setError(e?.message || "تعذرت معالجة الملف");
      setStage("idle");
    }
  };

  const runAdvanced = async () => {
    if (!file) return;
    setStage("advanced");
    setProgress(0);
    setError("");
    setAskAdvanced(false);
    try {
      const buf = await file.arrayBuffer();
      const bytes = await runRasterRebuild(buf, (p) => setProgress(p));
      buildDownload(bytes, "-flattened");
      setStage("done");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "تعذر تنفيذ الوضع المتقدم");
      setStage("idle");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const busy = stage === "processing" || stage === "advanced";

  return (
    <ToolPageShell title="PDF Watermark Remover" description="Remove watermarks from PDF files — fully in your browser, no uploads.">
      <div dir="rtl" className="w-full max-w-xl mx-auto space-y-5 text-right">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-200 font-medium text-sm" dir="ltr">{file.name}</p>
              <p className="text-gray-500 text-xs" dir="ltr">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                إزالة
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">أفلت ملف PDF هنا أو اضغط للاختيار</p>
            </div>
          )}
        </div>

        {busy && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-2">
            <p className="text-sm text-gray-300">
              {stage === "advanced" ? "جاري المعالجة بالوضع المتقدم..." : "جاري إزالة العلامة المائية..."}
            </p>
            <div className="h-2 rounded-full bg-[#0a0f1e] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {stage === "done" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-1">
            <p className="text-green-400 text-sm">
              {removedCount > 0
                ? `تمت إزالة ${removedCount} عنصر يحتمل أن يكون علامة مائية.`
                : "اكتملت المعالجة. تم تجهيز الملف للتحميل."}
            </p>
          </div>
        )}

        {askAdvanced && stage === "done" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
            <p className="text-yellow-300 text-sm">
              لم يتم اكتشاف علامة مائية قابلة للإزالة تلقائياً. هل تريد المحاولة بالوضع المتقدم؟ (قد يؤثر على جودة النص)
            </p>
            <div className="flex gap-2">
              <button
                onClick={runAdvanced}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-all"
              >
                محاولة متقدمة
              </button>
              <button
                onClick={() => setAskAdvanced(false)}
                className="px-4 py-2 rounded-xl border border-[#1e2d4a] text-gray-400 hover:text-gray-200 text-sm transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {file && stage !== "done" && (
          <button
            onClick={run}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {busy ? "جاري المعالجة..." : "إزالة العلامة المائية"}
          </button>
        )}

        {downloadUrl && stage === "done" && (
          <a
            href={downloadUrl}
            download={(file?.name.replace(/\.pdf$/i, "") || "document") + "-clean.pdf"}
            className="block w-full text-center py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all"
          >
            تحميل الملف
          </a>
        )}
      </div>

      <HowToUse steps={[
        "ارفع ملف PDF عن طريق السحب أو الضغط لاختيار الملف.",
        "اضغط على زر «إزالة العلامة المائية» وانتظر اكتمال المعالجة.",
        "حمّل الملف الناتج. إذا لم يتم اكتشاف علامة مائية يمكنك تجربة الوضع المتقدم.",
      ]} />
      <RelatedTools currentSlug="pdf-watermark-remover" />
      <ToolSeoContent
        title={"PDF Watermark Remover Online Free — Remove Watermarks from PDF"}
        description={"Remove text, image and stamp watermarks from PDF files for free, directly in your browser. No uploads, no signup, 100% private."}
        body={[
          "This PDF Watermark Remover scans every page of your document and automatically detects three common watermark patterns: transparent or rotated text overlays, large repeated images, and stamp/watermark annotations. The cleaned file is rebuilt with the same pages and remains fully selectable and searchable.",
          "When a watermark is baked into the page content and cannot be removed structurally, you can opt in to advanced mode. Advanced mode rasterizes each page at 2× resolution and rebuilds the PDF from images — the watermark disappears visually, but text in the new PDF is no longer selectable.",
          "Everything runs locally using pdf-lib and pdfjs-dist. Your file never leaves your device, making this tool safe for confidential contracts, invoices and reports.",
        ]}
        faqs={[
          { question: "Does this tool work on all PDFs?", answer: "It works best on watermarks added as text overlays, transparent layers, large background images or stamp annotations. Watermarks burned directly into scanned images require advanced mode." },
          { question: "Is my file uploaded to a server?", answer: "No. All processing happens in your browser using pdf-lib and pdfjs-dist. Nothing is uploaded anywhere." },
          { question: "What is advanced mode?", answer: "Advanced mode rasterizes each page to a high-resolution image and rebuilds the PDF. It removes nearly any visual watermark but the resulting text is no longer selectable." },
          { question: "Will the result be selectable text?", answer: "Yes for the default mode — pages keep their original text and vectors. In advanced mode, pages become images and text selection is lost." },
        ]}
      />
    </ToolPageShell>
  );
}
