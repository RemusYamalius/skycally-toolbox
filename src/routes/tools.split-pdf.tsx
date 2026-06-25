import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Scissors, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { PDFDocument } from "pdf-lib";

export const Route = createFileRoute("/tools/split-pdf")({
  head: () => buildToolMeta(toolBySlug("split-pdf", tools)),
  component: SplitPdf,
});

function parsePages(spec: string, total: number): number[] {
  const result = new Set<number>();
  for (const part of spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i++) if (i >= 1 && i <= total) result.add(i);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= total) result.add(n);
    } else {
      throw new Error(`Invalid page selector: "${part}". Use numbers or ranges like 1-3.`);
    }
  }
  return [...result].sort((a, b) => a - b);
}

function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageSpec, setPageSpec] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [resultInfo, setResultInfo] = useState<{ pages: number; size: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    setFile(f);
    setError("");
    setDone(false);
    setPageSpec("");
    setResultInfo(null);
    try {
      const buffer = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setTotalPages(pdf.getPageCount());
    } catch {
      setTotalPages(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const split = async () => {
    if (!file || !pageSpec.trim()) return;
    setLoading(true);
    setError("");
    setDone(false);
    setResultInfo(null);
    try {
      const srcBytes = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const total = srcPdf.getPageCount();
      const selected = parsePages(pageSpec.trim(), total);
      if (selected.length === 0) throw new Error("No valid pages in the selection — check your input.");
      const outPdf = await PDFDocument.create();
      const copied = await outPdf.copyPages(
        srcPdf,
        selected.map((p) => p - 1),
      );
      copied.forEach((p) => outPdf.addPage(p));
      const out = await outPdf.save();
      const blob = new Blob([new Uint8Array(out)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.pdf$/i, "");
      a.download = `${baseName}-pages-${pageSpec.replace(/\s/g, "")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResultInfo({ pages: selected.length, size: (blob.size / 1024).toFixed(1) });
      setDone(true);
      toast.success(`Downloaded ${selected.length} page${selected.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      setError(err?.message || "Split failed. Please check your page selection.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageSpec("");
    setError("");
    setDone(false);
    setTotalPages(null);
    setResultInfo(null);
  };

  const previewPages = () => {
    if (!pageSpec.trim() || !totalPages) return [];
    try {
      return parsePages(pageSpec.trim(), totalPages);
    } catch {
      return [];
    }
  };
  const preview = previewPages();

  return (
    <ToolPageShell
      title="Split PDF"
      description="Extract specific pages or page ranges from any PDF — download as a new file instantly."
    >
      <div className="w-full max-w-xl mx-auto space-y-5">
        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
            }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-muted-foreground text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {totalPages && (
                  <span className="ml-2 font-semibold" style={{ color: "var(--cyan-brand)" }}>
                    · {totalPages} pages total
                  </span>
                )}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-border flex items-center justify-center">
                <Scissors className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Drop a PDF or click to browse</p>
              <p className="text-xs text-muted-foreground">Max 100MB · Your file never leaves your device</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Pages to extract
              </label>
              <input
                value={pageSpec}
                onChange={(e) => {
                  setPageSpec(e.target.value);
                  setDone(false);
                }}
                placeholder={totalPages ? `e.g. 1-3, 5, 7-${Math.min(totalPages, 9)}` : "e.g. 1,3,5 or 1-4 or 2-5,8"}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            {/* Quick examples */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {["1", "1-3", "1,3,5", "2-4,7", totalPages ? `1-${totalPages}` : "1-5"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPageSpec(ex)}
                    className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-mono"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            {preview.length > 0 && (
              <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 px-4 py-3">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--cyan-brand)" }}>
                  {preview.length} page{preview.length === 1 ? "" : "s"} selected:
                </p>
                <p className="text-xs font-mono text-muted-foreground">{preview.join(", ")}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Use commas for individual pages and hyphens for ranges. Example:{" "}
              <span className="font-mono">1-3,5,7-9</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {done && resultInfo && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-sm font-medium">Downloaded successfully!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {resultInfo.pages} page{resultInfo.pages === 1 ? "" : "s"} · {resultInfo.size} KB
            </p>
          </div>
        )}

        {file && (
          <button
            onClick={split}
            disabled={loading || !pageSpec.trim() || preview.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Splitting…
              </span>
            ) : preview.length > 0 ? (
              `Extract ${preview.length} page${preview.length === 1 ? "" : "s"}`
            ) : (
              "Split PDF"
            )}
          </button>
        )}
      </div>

      <AdZone id="split-pdf-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload your PDF — the total page count is shown automatically after loading.",
          "Type the pages to extract using commas for individual pages (1,3,5) and hyphens for ranges (2-6). A live preview shows exactly which pages will be extracted.",
          "Click Extract and the new PDF downloads instantly — no waiting, no server.",
        ]}
      />

      <ToolSeoContent
        title="Free Split PDF Online — Extract Pages from PDF, No Upload"
        description="Extract specific pages or page ranges from any PDF and download as a new file. Use commas and hyphens to specify pages. Free, instant, runs entirely in your browser — no signup."
        body={[
          "Skycally's Split PDF tool lets you extract any combination of pages from a PDF and download them as a new document in seconds. Type your page selection using commas for individual pages (1,3,5) or hyphens for ranges (2-6), or combine both (1,3-5,8). A live preview shows exactly which pages will be included before you click Extract.",
          "The tool displays your PDF's total page count immediately after upload, so you always know what's available. Quick example buttons let you load common patterns with a single click — handy for extracting the first few pages, the last section, or alternating pages from a long document.",
          "All splitting is performed locally in your browser using pdf-lib, a JavaScript PDF manipulation library. Your document is never uploaded to any server, making this tool completely private — ideal for extracting pages from contracts, invoices, medical reports, or any other sensitive document you don't want passing through third-party servers.",
          "The resulting PDF is a faithful copy of the selected pages from the original — all text, images, hyperlinks, fonts, and metadata are preserved exactly. The download filename includes your page selection for easy identification when working with multiple splits from the same document.",
        ]}
        faqs={[
          {
            question: "How do I extract non-consecutive pages?",
            answer:
              "Separate page numbers with commas: e.g. 1,5,8,12. For ranges, use a hyphen: e.g. 3-7. Combine both: 1,3-5,8,10-12.",
          },
          {
            question: "How do I know how many pages my PDF has?",
            answer: "The total page count is displayed automatically after you upload the file, next to the filename.",
          },
          {
            question: "Can I split a PDF into multiple separate files?",
            answer:
              "Run the tool multiple times with different page selections. Each run produces a separate downloaded PDF.",
          },
          {
            question: "Will the extracted pages keep their original quality?",
            answer:
              "Yes. Extraction is completely lossless — all content, fonts, images, and formatting are preserved exactly as in the original.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. All splitting runs locally in your browser using pdf-lib. Your file never leaves your device.",
          },
          {
            question: "Can I split a password-protected PDF?",
            answer:
              "The tool attempts to open password-protected PDFs with the ignoreEncryption flag, which works for most restricted (but not fully encrypted) PDFs.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "No enforced limit. Very large PDFs (over 100MB) may be slow to process depending on your device's memory and CPU.",
          },
          {
            question: "What if I enter an invalid page number?",
            answer:
              "The tool validates your input and shows an error for invalid selectors. Page numbers outside the document's range are silently ignored.",
          },
        ]}
      />

      <RelatedTools currentSlug="split-pdf" />
    </ToolPageShell>
  );
}
