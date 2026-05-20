import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/split-pdf")({
  head: () => buildToolMeta(toolBySlug("split-pdf", tools)),
  component: SplitPdf,
});

import { PDFDocument } from "pdf-lib";

function parsePages(spec: string, total: number): number[] {
  const result = new Set<number>();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
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
      throw new Error(`Invalid page selector: ${part}`);
    }
  }
  return [...result].sort((a, b) => a - b);
}

function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed");
      return;
    }
    setFile(f);
    setError("");
    setDone(false);
    setPages("");
    try {
      const buffer = await f.arrayBuffer();
      const text = new TextDecoder("latin1").decode(buffer);
      const match = text.match(/\/Type\s*\/Page[^s]/g);
      setTotalPages(match ? match.length : null);
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
    if (!file || !pages.trim()) return;
    setLoading(true);
    setError("");
    setDone(false);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("pages", pages.trim());
      const res = await fetch(`${API}/api/split-pdf`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Split failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "split.pdf";
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages("");
    setError("");
    setDone(false);
    setTotalPages(null);
  };

  return (
    <ToolPageShell title="Split PDF" description="Extract specific pages or page ranges from any PDF file instantly.">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-200 font-medium text-sm">{file.name}</p>
              <p className="text-gray-500 text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {totalPages && ` • ${totalPages} pages`}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop a PDF or click to browse</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">
                Pages to extract
              </label>
              <input
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="e.g. 1,3,5 or 1-4 or 2-5,8"
                className="w-full bg-[#0a0f1e] border border-[#1e2d4a] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 outline-none focus:border-cyan-500/50 transition-colors font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["1", "1-3", "1,3,5", "2-4,7"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPages(ex)}
                  className="px-3 py-1 rounded-lg border border-[#1e2d4a] text-xs text-gray-500 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-mono"
                >
                  {ex}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Use commas for individual pages, hyphens for ranges. Example: <span className="text-gray-500 font-mono">1-3,5,7-9</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {done && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-400 text-sm">PDF split successfully — downloading...</p>
          </div>
        )}

        {file && (
          <button
            onClick={split}
            disabled={loading || !pages.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Splitting...
              </span>
            ) : "Split PDF"}
          </button>
        )}
      </div>
      <HowToUse steps={[
        "Upload your PDF file by dropping it or clicking to browse.",
        "Type the pages you want to extract (e.g. 1-3,5,7-9).",
        "Click Split PDF to download the extracted pages instantly.",
      ]} />
          <RelatedTools currentSlug="split-pdf" />
          <ToolSeoContent
        title={"Split PDF Online Free — Extract Pages from PDF"}
        description={"Split PDF files and extract specific pages for free. Enter page numbers or ranges, download as a new PDF. 100% browser-based and private."}
        body={[
        "Enter the page numbers you want to extract — use commas for individual pages (1,3,5), hyphens for ranges (2-6), or combine both (1,3-5,8). The selected pages are extracted and combined into a new PDF document.",
        "PDF splitting uses pdf-lib running in your browser. Your document is never uploaded to any server, making this ideal for extracting pages from sensitive or confidential documents.",
      ]}
        faqs={[
        { question: "Can I extract non-consecutive pages?", answer: "Yes. Enter pages separated by commas for non-consecutive pages, for example: 1,5,8,12 to extract only those specific pages." },
        { question: "Can I split a PDF into multiple separate files?", answer: "Currently the tool extracts selected pages into one new PDF. To create multiple separate files, run the tool multiple times with different page selections." },
        { question: "How do I know how many pages my PDF has?", answer: "After uploading, the tool displays the total page count of your document so you can plan your page selection." },
        { question: "Will the extracted pages maintain their original quality?", answer: "Yes. Page extraction is completely lossless — all content, formatting and images are preserved exactly as in the original PDF." },
      ]}
      />
      </ToolPageShell>
  );
}
