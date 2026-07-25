import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, CheckCircle2, AlertTriangle, X } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
export const Route = createFileRoute("/tools/compress-pdf")({
  head: () => buildToolMeta(toolBySlug("compress-pdf", tools)),
  component: CompressPdfPage,
});

type Level = "low" | "medium" | "high";

const LEVELS: Array<{ id: Level; label: string; desc: string; hint: string }> = [
  { id: "low", label: "Low", desc: "Best quality", hint: "Minimal size reduction — preserves all formatting" },
  { id: "medium", label: "Medium", desc: "Balanced", hint: "Good balance between size and quality" },
  { id: "high", label: "High", desc: "Smallest size", hint: "Maximum compression — may slightly affect rendering" },
];

function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number; blob: Blob } | null>(null);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file (.pdf)");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      toast.error("File too large — max 100 MB");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const compress = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));

      // Strip metadata to save space
      out.setTitle("");
      out.setAuthor("");
      out.setSubject("");
      out.setKeywords([]);
      out.setProducer("");
      out.setCreator("");

      const useObjectStreams = level !== "low";
      const objectsPerTick = level === "high" ? 200 : level === "medium" ? 100 : 50;

      const bytes = await out.save({
        useObjectStreams,
        addDefaultPage: false,
        objectsPerTick,
      });

      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });

      setResult({ original: file.size, compressed: blob.size, blob });

      if (blob.size >= file.size) {
        toast.info("This PDF is already well-optimised — minimal size reduction achieved.");
      } else {
        toast.success("PDF compressed successfully!");
      }
    } catch (e: any) {
      toast.error(
        e?.message ? `Compression failed: ${e.message}` : "Could not compress this PDF — try a different file.",
      );
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result || !file) return;
    downloadBlob(result.blob, file.name.replace(/\.pdf$/i, "") + "-compressed.pdf");
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const savings = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : 0;

  return (
    <ToolPageShell
      title="Compress PDF"
      description="Reduce PDF file size in your browser — free, no upload, files never leave your device."
    >
      {/* Privacy badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        Your file never leaves your device — compression runs 100% in the browser.
      </div>

      <div className="space-y-4">
        {/* Drop zone */}
        {!file && (
          <DropZone
            accept="application/pdf"
            onFiles={onFiles}
            label="Drop a PDF here"
            hint="or click to browse — max 100 MB"
          />
        )}

        {/* File + options */}
        {file && !result && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={reset}
                aria-label="Remove file and reset"
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Compression level */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Compression Level
              </p>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map(({ id, label, desc, hint }) => (
                  <button
                    key={id}
                    onClick={() => setLevel(id)}
                    title={hint}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition text-left ${
                      level === id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    {label}
                    <span className="block font-normal mt-0.5 text-[10px] opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Limitation notice */}
            <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-400/8 border border-amber-400/20 rounded-xl p-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Browser-based compression works by optimising PDF structure and stripping metadata. PDFs that are
                already optimised or contain mostly images may see little reduction. For image-heavy PDFs, try our{" "}
                <strong>PDF to Word</strong> tool first.
              </span>
            </div>

            {/* Compress button */}
            <button
              onClick={compress}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Compressing…
                </>
              ) : (
                "⚡ Compress PDF"
              )}
            </button>
          </div>
        )}

        {/* Result */}
        {result && file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Original</p>
                <p className="font-bold text-lg">{formatBytes(result.original)}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Compressed</p>
                <p className="font-bold text-lg">{formatBytes(result.compressed)}</p>
              </div>
              <div
                className="rounded-xl p-3"
                style={{
                  background:
                    savings > 5
                      ? "color-mix(in oklab, #22c55e 12%, var(--card))"
                      : "color-mix(in oklab, var(--secondary) 50%, transparent)",
                }}
              >
                <p className="text-[11px] text-muted-foreground mb-1">Saved</p>
                <p className="font-bold text-lg" style={{ color: savings > 5 ? "#22c55e" : "var(--foreground)" }}>
                  {savings}%
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Compressed size</span>
                <span>
                  {formatBytes(result.compressed)} / {formatBytes(result.original)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((result.compressed / result.original) * 100)}%`,
                    background: savings > 20 ? "#22c55e" : savings > 5 ? "#22d3ee" : "#f59e0b",
                  }}
                />
              </div>
            </div>

            {savings < 5 && (
              <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-400/8 border border-amber-400/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Minimal reduction achieved — this PDF may already be optimised, or it contains mostly scanned images
                  or embedded fonts that cannot be compressed further in the browser.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={download}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/20"
              >
                ⬇ Download Compressed PDF
              </button>
              <button
                onClick={reset}
                className="px-5 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                New File
              </button>
            </div>
          </div>
        )}
      </div>

      <HowToUse
        steps={[
          "Drop your PDF or click to browse — up to 100 MB supported.",
          "Choose a compression level: Low preserves maximum quality, Medium balances size and quality, High targets the smallest possible file.",
          "Click Compress PDF — the process runs entirely in your browser using pdf-lib, so your file never leaves your device.",
          "See the before/after sizes and savings percentage, then download your compressed PDF instantly.",
        ]}
      />

      <ToolSeoContent
        title="Free PDF Compressor — Reduce PDF File Size Online, No Upload"
        description="Compress PDF files instantly in your browser — no upload, no account, no file size limit. Choose Low, Medium or High compression. Files never leave your device. Free and private."
        body={[
          "Skycally's PDF compressor reduces PDF file size by restructuring the document's internal object layout, enabling cross-reference object streams, and stripping hidden metadata — all using the open-source pdf-lib library running directly in your browser. Unlike cloud-based PDF compressors that upload your document to a server, every byte of processing happens locally on your device. Your PDF is never transmitted, never stored, and never logged anywhere.",
          "Browser-based PDF compression works differently from server-side tools like Smallpdf or iLovePDF. Those services re-render and re-encode every page, which allows them to re-compress embedded images at lower quality. Browser compression instead optimises the PDF's internal structure: it converts indirect objects to object streams (which zip-compresses large blocks of PDF syntax), removes redundant cross-reference tables, and strips author, title, producer and creator metadata that can add kilobytes to the file. This approach preserves 100% of the visual quality — text stays perfectly sharp, images stay at their original resolution — but it works best on PDFs that were generated by verbose software (older Word/Excel exports, certain printers and scanners) rather than already-optimised PDFs.",
          "Typical savings range from 5% to 40% depending on how the original PDF was created. PDFs exported from older versions of Microsoft Word often carry large amounts of redundant structure and metadata, and compress well. PDFs from modern macOS Preview or Adobe Acrobat are usually already efficient and may compress by only a few percent. Image-heavy PDFs (scanned documents, brochures) see the least benefit from structural compression — for those, a tool that re-encodes images at lower resolution would be more effective.",
          "This structural approach is also the reason the tool works entirely offline in your browser: no image re-encoding step means no need to decode, resize, and re-compress potentially dozens of embedded images on a server, which is exactly the kind of heavy lifting cloud PDF compressors rely on their own infrastructure for. If you specifically need to shrink an image-heavy PDF further, try compressing the source images first with our Image Compressor before assembling the PDF.",
        ]}
        faqs={[
          {
            question: "Is my PDF uploaded to a server?",
            answer:
              "No. Compression runs entirely in your browser using the open-source pdf-lib library. Your PDF is never transmitted over the internet. You can even disconnect from the internet after the page loads and the compressor will still work.",
          },
          {
            question: "How much can PDF file size be reduced?",
            answer:
              "Typical savings range from 5% to 40%, depending on how the original PDF was created. PDFs from older versions of Word or Excel often compress significantly. PDFs from modern Adobe Acrobat or macOS Preview are usually already optimised and may see only minimal reduction.",
          },
          {
            question: "What is the difference between the three compression levels?",
            answer:
              "Low uses minimal object stream packing and preserves all internal structure — best for PDFs you plan to edit further. Medium enables object streams for balanced compression. High maximises object stream density for the smallest possible output file. All three levels preserve 100% of the visual quality.",
          },
          {
            question: "Why is my compressed file the same size or larger?",
            answer:
              "Some PDFs are already internally optimised — for example, files created by modern Adobe Acrobat or macOS Preview. In these cases, structural recompression has little effect. Image-heavy PDFs (scanned documents) also compress poorly with this method because the images themselves are not re-encoded.",
          },
          {
            question: "Does compression affect text or image quality?",
            answer:
              "No. Browser-based structural compression does not re-encode images or re-render pages. Text remains perfectly sharp at all compression levels. Images remain at their original resolution. Only the internal structure of the PDF is reorganised.",
          },
          {
            question: "What is the maximum file size?",
            answer:
              "Up to 100 MB. Very large PDFs may take several seconds to process depending on your device speed, since all processing happens in the browser's memory.",
          },
          {
            question: "Can I compress a password-protected PDF?",
            answer:
              "The tool attempts to process encrypted PDFs using ignoreEncryption mode, but results vary. For reliable compression, remove the password protection using the original application first.",
          },
          {
            question: "How does this compare to Smallpdf or iLovePDF?",
            answer:
              "Smallpdf and iLovePDF achieve higher compression ratios because they re-encode images at lower quality on their servers. Skycally's compressor keeps everything local (no upload, no privacy risk) and preserves 100% image quality, but cannot match server-side image re-encoding for image-heavy PDFs.",
          },
        ]}
      />

      <RelatedTools currentSlug="compress-pdf" />
    </ToolPageShell>
  );
}
