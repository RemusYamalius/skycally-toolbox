import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, FileText, Download, CheckCircle } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/delete-pdf-pages")({
  head: () => buildToolMeta(toolBySlug("delete-pdf-pages", tools)),
  component: DeletePdfPagesPage,
});

function DeletePdfPagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    setSelected(new Set());
    setDone(false);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setTotalPages(doc.getPageCount());
    } catch {
      toast.error("Could not read this PDF. The file may be corrupted.");
    }
  };

  const toggle = (page: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  const selectAll = () => {
    if (!totalPages) return;
    setSelected(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)));
  };

  const clearAll = () => setSelected(new Set());

  const deletePages = async () => {
    if (!file || selected.size === 0) return;
    if (totalPages && selected.size >= totalPages) {
      toast.error("You cannot delete all pages — at least one page must remain.");
      return;
    }
    setBusy(true);
    setDone(false);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

      // Remove pages in reverse order to maintain correct indices
      const toDelete = Array.from(selected).sort((a, b) => b - a);
      for (const page of toDelete) {
        pdfDoc.removePage(page - 1); // pdf-lib is 0-indexed
      }

      const bytes = await pdfDoc.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      downloadBlob(blob, file.name.replace(/\.pdf$/i, "") + "-edited.pdf");
      setDone(true);
      toast.success(`${selected.size} page${selected.size > 1 ? "s" : ""} deleted and PDF downloaded!`);
    } catch {
      toast.error("Could not process this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Delete PDF Pages"
      description="Remove specific pages from any PDF instantly. Select the pages to delete and download the cleaned file — free, private, no upload."
    >
      <div className="space-y-5">
        {!file ? (
          <DropZone
            accept="application/pdf"
            onFiles={onFiles}
            label="Drop a PDF here"
            hint="or click to browse — your file never leaves your device"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {totalPages && (
                    <span className="ml-2 font-semibold" style={{ color: "var(--cyan-brand)" }}>
                      · {totalPages} pages
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setTotalPages(null);
                setSelected(new Set());
                setDone(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change file
            </button>
          </div>
        )}

        {file && totalPages && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold">
                Select pages to delete
                {selected.size > 0 && (
                  <span className="ml-2 text-xs font-normal text-red-400">({selected.size} selected)</span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isSelected = selected.has(page);
                return (
                  <button
                    key={page}
                    onClick={() => toggle(page)}
                    className={`aspect-square rounded-xl border text-sm font-bold transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-500/15 text-red-400 scale-95"
                        : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30 hover:scale-105"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {done && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">PDF downloaded with selected pages removed!</p>
              </div>
            )}

            <button
              onClick={deletePages}
              disabled={busy || selected.size === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {busy ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {busy
                ? "Processing…"
                : selected.size === 0
                  ? "Select pages to delete"
                  : `Delete ${selected.size} page${selected.size > 1 ? "s" : ""} & Download`}
            </button>
          </div>
        )}
      </div>

      <AdZone id="delete-pdf-pages-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload your PDF — the total page count is detected automatically.",
          "Click the page numbers you want to remove. Selected pages turn red. Use Select All or Clear to manage selections quickly.",
          "Click Delete & Download to get the updated PDF with those pages removed instantly.",
        ]}
      />

      <ToolSeoContent
        title="Free Delete PDF Pages Online — Remove Specific Pages from PDF"
        description="Delete specific pages from any PDF file online. Select pages to remove and download the cleaned PDF instantly. Free, no signup, your file never leaves your device."
        body={[
          "Skycally's Delete PDF Pages tool lets you remove any specific page or group of pages from a PDF file directly in your browser. Upload your PDF, click the page numbers you want to delete, and download the result — all in seconds, with no server upload and no account required.",
          "Pages are shown as a grid of numbered buttons. Click any page number to mark it for deletion — it turns red to confirm your selection. Click again to deselect. Use the Select All button to mark every page, or Clear to start over. The tool prevents you from deleting all pages — at least one must remain in the output file.",
          "Deletion is performed using pdf-lib, a JavaScript PDF manipulation library that runs entirely in your browser. The pages are removed in the correct order regardless of the order you selected them, and the resulting PDF preserves all original content, formatting, fonts, images, and bookmarks on the remaining pages.",
          "Common use cases include removing a blank page accidentally added at the end, cutting out a confidential page before sharing, removing outdated sections from a report, or splitting a document by removing the unwanted half. The tool is safe for confidential documents — your PDF is never uploaded to any server.",
        ]}
        faqs={[
          {
            question: "Can I delete multiple pages at once?",
            answer:
              "Yes. Click as many page numbers as you want to select them for deletion. All selected pages are removed in a single operation when you click Delete & Download.",
          },
          {
            question: "Can I delete all pages?",
            answer:
              "No. The tool prevents you from deleting all pages — at least one page must remain in the output PDF. This prevents creating an empty, invalid PDF file.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. Everything runs locally in your browser using pdf-lib. Your file never leaves your device.",
          },
          {
            question: "Will the remaining pages be reordered?",
            answer:
              "Yes. After deletion, the remaining pages are renumbered sequentially. For example, if you delete page 3 from a 5-page document, the original pages 4 and 5 become pages 3 and 4.",
          },
          {
            question: "Does this work with encrypted PDFs?",
            answer:
              "The tool uses pdf-lib's ignoreEncryption flag, which works for most restricted PDFs. Heavily password-protected files may fail to load.",
          },
          {
            question: "Are there page count limits?",
            answer:
              "No enforced limit. The tool shows all pages as a grid, so very large PDFs may require scrolling. Processing time increases slightly with more pages.",
          },
          {
            question: "Will bookmarks and links be preserved?",
            answer:
              "Yes. All bookmarks, hyperlinks, and internal references on the remaining pages are preserved in the output PDF.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The page grid is touch-friendly and works on smartphones and tablets. Tap page numbers to select or deselect them.",
          },
        ]}
      />

      <RelatedTools currentSlug="delete-pdf-pages" />
    </ToolPageShell>
  );
}
