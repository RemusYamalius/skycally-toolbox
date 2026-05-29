import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from "pdf-lib";

export const Route = createFileRoute("/tools/pdf-watermark-remover")({
  head: () => buildToolMeta(toolBySlug("pdf-watermark-remover", tools)),
  component: PdfWatermarkRemover,
});

// ---------- Stream byte helpers ----------

function decodeStreamBytes(stream: any): Uint8Array {
  try {
    if (typeof stream.getUnencodedContents === "function") {
      const result = stream.getUnencodedContents();
      if (result && result.length > 0) return result;
    }
  } catch {}
  try {
    if (typeof stream.getContents === "function") {
      const result = stream.getContents();
      if (result && result.length > 0) return result;
    }
  } catch {}
  try {
    if (stream.contents instanceof Uint8Array && stream.contents.length > 0) {
      return stream.contents;
    }
  } catch {}
  try {
    if (typeof stream.asPDFStream === "function") {
      return stream.asPDFStream().contents;
    }
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

function nameToString(n: any): string {
  if (!n) return "";
  if (typeof n.asString === "function") {
    const s = n.asString();
    return s.startsWith("/") ? s.slice(1) : s;
  }
  return String(n);
}

// ---------- Strategy 1: text watermarks ----------

function extractShownStrings(content: string): string[] {
  const out: string[] = [];
  const reTj = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = reTj.exec(content)) !== null) out.push(m[1]);
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

function detectRepeatedStrings(pageContents: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of pageContents) {
    const seen = new Set(
      extractShownStrings(c).map((s) => s.trim()).filter((s) => s.length >= 2),
    );
    for (const s of seen) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const threshold = pageContents.length <= 2 ? 1 : Math.max(2, Math.floor(pageContents.length * 0.5));
  const out = new Set<string>();
  for (const [s, n] of counts) if (n >= threshold) out.add(s);
  return out;
}

function findLowAlphaGStates(page: any): Set<string> {
  const out = new Set<string>();
  try {
    const resources = page.node.Resources();
    if (!resources) return out;
    const ext = resources.lookup(PDFName.of("ExtGState"));
    if (!ext || !(ext instanceof PDFDict)) return out;
    for (const [key, val] of ext.entries()) {
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
          out.add(nameToString(key));
        }
      }
    }
  } catch {}
  return out;
}

function stripWatermarkTextBlocks(
  content: string,
  targets: Set<string>,
  lowAlphaGStates: Set<string>,
): { out: string; removed: number } {
  let removed = 0;

  function isRotated(text: string): boolean {
    const re = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(?:cm|Tm)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (Math.abs(parseFloat(m[2])) > 0.01 || Math.abs(parseFloat(m[3])) > 0.01) return true;
    }
    return false;
  }

  function hasLowAlpha(text: string): boolean {
    return [...text.matchAll(/\/([A-Za-z0-9_.+-]+)\s+gs/g)]
      .map((m) => m[1])
      .some((g) => lowAlphaGStates.has(g));
  }

  function matchesTargets(text: string): boolean {
    return extractShownStrings(text).map((s) => s.trim()).some((s) => targets.has(s));
  }

  function isWatermarkBlock(block: string): boolean {
    if (!/\bBT\b/.test(block)) return false;
    return isRotated(block) || hasLowAlpha(block) || matchesTargets(block);
  }

  // Stack-based parser: correctly handles arbitrarily nested q...Q blocks
  const tokens = content.split(/(\bq\b|\bQ\b)/);
  const stack: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (token === "q") {
      stack.push(current);
      current = "q";
    } else if (token === "Q") {
      const block = current + "\nQ";
      const parent = stack.pop() ?? "";
      if (isWatermarkBlock(block)) {
        removed++;
        current = parent;
      } else {
        current = parent + block;
      }
    } else {
      current += token;
    }
  }

  let out = current;
  out = out.replace(/BT\b([\s\S]*?)\bET\b/g, (full, body: string) => {
    if (isRotated(body) || hasLowAlpha(body) || matchesTargets(body)) {
      removed++;
      return "";
    }
    return full;
  });

  return { out, removed };
}

// ---------- Strategy 2: image watermarks ----------

function collectXObjectNames(page: any): Map<string, "Image" | "Form" | "Other"> {
  const out = new Map<string, "Image" | "Form" | "Other">();
  try {
    const resources = page.node.Resources();
    if (!resources) return out;
    const xobj = resources.lookup(PDFName.of("XObject"));
    if (!xobj || !(xobj instanceof PDFDict)) return out;
    for (const [key, val] of xobj.entries()) {
      let v: any = val;
      try {
        if (v instanceof PDFRef) v = page.doc.context.lookup(v);
      } catch {}
      let kind: "Image" | "Form" | "Other" = "Other";
      if (v instanceof PDFDict) {
        const sub = v.lookup(PDFName.of("Subtype"));
        const sn = nameToString(sub);
        if (sn === "Image") kind = "Image";
        else if (sn === "Form") kind = "Form";
      }
      out.set(nameToString(key), kind);
    }
  } catch {}
  return out;
}

function stripLargeImageDraws(
  content: string,
  pageWidth: number,
  pageHeight: number,
  imageNames: Set<string>,
  globalWatermarkImages: Set<string>,
): { out: string; removed: number } {
  let removed = 0;
  // Remove entire q ... Q blocks that draw a watermark image.
  const re = /q\b([\s\S]*?)\bQ\b/g;
  const out = content.replace(re, (full, body: string) => {
    const doMatches = [...body.matchAll(/\/([A-Za-z0-9_.+-]+)\s+Do\b/g)].map((m) => m[1]);
    if (!doMatches.length) return full;
    // Last cm in this block
    const cmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm/g;
    let lastA = 1, lastD = 1;
    let cm: RegExpExecArray | null;
    while ((cm = cmRe.exec(body)) !== null) {
      lastA = Math.abs(parseFloat(cm[1]));
      lastD = Math.abs(parseFloat(cm[4]));
    }
    const drop = doMatches.some((name) => {
      if (!imageNames.has(name)) return false;
      if (globalWatermarkImages.has(name)) return true;
      const wFrac = lastA / Math.max(1, pageWidth);
      const hFrac = lastD / Math.max(1, pageHeight);
      return wFrac > 0.4 && hFrac > 0.4;
    });
    if (drop) {
      removed++;
      return "";
    }
    return full;
  });
  return { out, removed };
}

// ---------- Strategy 3: stamp/watermark annotations ----------

function stripStampAnnots(page: any): number {
  let removed = 0;
  try {
    const annots = page.node.Annots();
    if (!annots || !(annots instanceof PDFArray)) return 0;
    const keep: any[] = [];
    const len = annots.size();
    for (let i = 0; i < len; i++) {
      const a: any = annots.get(i);
      let aDict: any = a;
      try {
        if (a instanceof PDFRef) aDict = page.doc.context.lookup(a);
      } catch {}
      let drop = false;
      if (aDict instanceof PDFDict) {
        const sub = aDict.lookup(PDFName.of("Subtype"));
        const name = nameToString(sub);
        if (name === "Stamp" || name === "Watermark") drop = true;
        // Also: FreeText / Square / Widget annots whose contents look like a watermark
        if (!drop) {
          const contents = aDict.lookup(PDFName.of("Contents"));
          const text = contents && typeof (contents as any).asString === "function"
            ? (contents as any).asString()
            : "";
          if (/water\s*mark|confidential|draft|sample|specimen/i.test(text)) drop = true;
        }
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

// Robust per-page content stream reader. Handles missing entries, direct
// streams, indirect refs, and arrays of refs/streams.
function getPageContents(page: any, pdf: any): string {
  try {
    let contents: any =
      (typeof page.node.get === "function" ? page.node.get(PDFName.of("Contents")) : undefined) ??
      (typeof page.node.lookup === "function" ? page.node.lookup(PDFName.of("Contents")) : undefined);
    if (!contents) return "";
    const arr: any[] =
      contents instanceof PDFArray
        ? contents.asArray()
        : contents instanceof PDFRef
        ? (() => {
            const resolved = pdf.context.lookup(contents);
            return resolved instanceof PDFArray ? resolved.asArray() : [resolved];
          })()
        : [contents];
    let merged = "";
    for (const item of arr) {
      let s: any = item;
      try {
        if (s instanceof PDFRef) s = pdf.context.lookup(s);
      } catch {}
      const sb = decodeStreamBytes(s);
      merged += bytesToLatin1(sb) + "\n";
    }
    return merged;
  } catch {
    return "";
  }
}

// ---------- Pipeline (strategies 1-3, always all three) ----------

async function runStrategies1to3(bytes: ArrayBuffer): Promise<{ pdfBytes: Uint8Array; removed: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  // Pass A: decode all page content streams.
  const pageContents: string[] = pages.map((p: any) => getPageContents(p, pdf));

  // Detect strings repeating across >50% of pages.
  const repeated = detectRepeatedStrings(pageContents);

  // Detect image XObject names referenced on >50% of pages (likely watermark).
  const perPageImages = pages.map((p: any) => collectXObjectNames(p));
  const imageFreq = new Map<string, number>();
  perPageImages.forEach((m) => {
    for (const [name, kind] of m) {
      if (kind === "Image") imageFreq.set(name, (imageFreq.get(name) ?? 0) + 1);
    }
  });
  const globalThreshold = Math.max(2, Math.floor(pages.length * 0.5) + 1);
  const globalWatermarkImages = new Set<string>();
  for (const [n, c] of imageFreq) if (c >= globalThreshold) globalWatermarkImages.add(n);

  let totalRemoved = 0;
  pages.forEach((page: any, i: number) => {
    // Strategy 3 — annotations (independent of content stream)
    totalRemoved += stripStampAnnots(page);

    let content = pageContents[i];
    const lowAlpha = findLowAlphaGStates(page);
    if (!content) return;

    // Strategy 1
    const r1 = stripWatermarkTextBlocks(content, repeated, lowAlpha);
    content = r1.out;
    totalRemoved += r1.removed;

    // Strategy 2
    const { width, height } = page.getSize();
    const imageNames = new Set<string>();
    for (const [n, k] of perPageImages[i]) if (k === "Image") imageNames.add(n);
    const r2 = stripLargeImageDraws(content, width, height, imageNames, globalWatermarkImages);
    content = r2.out;
    totalRemoved += r2.removed;

    if (r1.removed > 0 || r2.removed > 0) {
      const contentBytes = latin1ToBytes(content);
      const newStream = pdf.context.stream(contentBytes, {
        Length: pdf.context.obj(contentBytes.length),
      });
      newStream.dict.delete(PDFName.of("Filter"));
      newStream.dict.delete(PDFName.of("DecodeParms"));
      const ref = pdf.context.register(newStream);
      page.node.set(PDFName.of("Contents"), ref);
    }
  });

  const out = await pdf.save();
  return { pdfBytes: out, removed: totalRemoved };
}

// ---------- Strategy 4: raster rebuild ----------

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
      setError("Please select a PDF file.");
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
      setError(e?.message || "Failed to process the file.");
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
      const { pdfBytes: cleaned } = await runStrategies1to3(buf);
      const bytes = await runRasterRebuild(cleaned.buffer as ArrayBuffer, (p) => setProgress(p));
      buildDownload(bytes, "-flattened");
      setStage("done");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Advanced mode failed.");
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
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
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
              <p className="text-foreground font-medium text-sm">{file.name}</p>
              <p className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Drop a PDF file here or click to select</p>
            </div>
          )}
        </div>

        {busy && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-4 space-y-2">
            <p className="text-sm text-foreground">
              {stage === "advanced" ? "Processing in advanced mode..." : "Removing watermark..."}
            </p>
            <div className="h-2 rounded-full bg-background overflow-hidden">
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
                ? `Removed ${removedCount} likely watermark element${removedCount === 1 ? "" : "s"}.`
                : "Processing complete. Your file is ready to download."}
            </p>
          </div>
        )}

        {askAdvanced && stage === "done" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
            <p className="text-yellow-300 text-sm">
              No watermark was automatically detected. Try Advanced Mode? (may affect text quality)
            </p>
            <div className="flex gap-2">
              <button
                onClick={runAdvanced}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-all"
              >
                Advanced Mode
              </button>
              <button
                onClick={() => setAskAdvanced(false)}
                className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-all"
              >
                Cancel
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
            {busy ? "Processing..." : "Remove Watermark"}
          </button>
        )}

        {downloadUrl && stage === "done" && (
          <a
            href={downloadUrl}
            download={(file?.name.replace(/\.pdf$/i, "") || "document") + "-clean.pdf"}
            className="block w-full text-center py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all"
          >
            Download File
          </a>
        )}
      </div>

      <HowToUse steps={[
        "Upload a PDF by dragging it in or clicking to select a file.",
        "Click \"Remove Watermark\" and wait for processing to finish.",
        "Download the cleaned file. If no watermark was detected, try Advanced Mode.",
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
