import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/delete-pdf-pages")({
  head: () => buildToolMeta(toolBySlug("delete-pdf-pages", tools)),
  component: DeletePdfPagesPage,
});

interface Thumb {
  num: number;
  url: string;
}

function DeletePdfPagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    thumbs.forEach((t) => URL.revokeObjectURL(t.url));
    setThumbs([]);
    setSelected(new Set());
    setDone(false);
    setLoading(true);
    setLoadProgress(0);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const out: Thumb[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
        out.push({ num: i, url: URL.createObjectURL(blob) });
        setLoadProgress(Math.round((i / pdf.numPages) * 100));
      }
      setThumbs(out);
    } catch {
      toast.error("Could not read this PDF. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
    setDone(false);
  };

  const selectAll = () => {
    setSelected(new Set(thumbs.map((t) => t.num)));
    setDone(false);
  };
  const clearAll = () => {
    setSelected(new Set());
    setDone(false);
  };

  const save = async () => {
    if (!file || selected.size === 0) return;
    if (selected.size >= thumbs.length) {
      toast.error("You must keep at least one page");
      return;
    }
    setBusy(true);
    setDone(false);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const keepIndices: number[] = [];
      for (let i = 0; i < src.getPageCount(); i++) {
        if (!selected.has(i + 1)) keepIndices.push(i);
      }
      const copied = await out.copyPages(src, keepIndices);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-trimmed.pdf";
      downloadBlob(blob, name);
      setDone(true);
      toast.success(`PDF updated — ${keepIndices.length} page${keepIndices.length === 1 ? "" : "s"} kept`);
    } catch {
      toast.error("Could not update this PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    thumbs.forEach((t) => URL.revokeObjectURL(t.url));
    setFile(null);
    setThumbs([]);
    setSelected(new Set());
    setDone(false);
  };

  const keptCount = thumbs.length - selected.size;

  return (
    <ToolPageShell
      title="Delete PDF Pages"
      description="Visually select and remove unwanted pages from any PDF — preview thumbnails, then download the cleaned result."
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
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {thumbs.length > 0 && (
                    <span className="ml-1 font-semibold" style={{ color: "var(--cyan-brand)" }}>
                      · {thumbs.length} pages
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Change file
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Loading page previews… {loadProgress}%</p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${loadProgress}%`, background: "linear-gradient(90deg, #00D4FF, #3B82F6)" }}
              />
            </div>
          </div>
        )}

        {thumbs.length > 0 && (
          <>
            {/* Controls bar */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {selected.size > 0 ? (
                    <span className="text-red-400">
                      {selected.size} page{selected.size === 1 ? "" : "s"} marked for deletion
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Click pages to mark them for deletion</span>
                  )}
                </p>
                {selected.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {keptCount} page{keptCount === 1 ? "" : "s"} will be kept
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary transition-colors"
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Thumbnails grid */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {thumbs.map((t) => {
                const isSel = selected.has(t.num);
                return (
                  <button
                    key={t.num}
                    type="button"
                    onClick={() => toggle(t.num)}
                    className={`group rounded-xl border bg-card overflow-hidden transition-all relative ${
                      isSel
                        ? "border-red-500 ring-2 ring-red-500/30 scale-[0.97]"
                        : "border-border hover:border-foreground/40 hover:scale-[1.02]"
                    }`}
                  >
                    <div className="aspect-[3/4] flex items-center justify-center bg-secondary/20 overflow-hidden">
                      <img
                        src={t.url}
                        alt={`Page ${t.num}`}
                        className={`max-w-full max-h-full object-contain transition-opacity ${isSel ? "opacity-30" : ""}`}
                      />
                    </div>
                    {/* Selection indicator */}
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSel ? "bg-red-500 border-red-500" : "bg-background/80 border-border"
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    {/* Delete overlay */}
                    {isSel && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-red-500/20 rounded-lg px-2 py-1">
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                      </div>
                    )}
                    <div className="p-2 flex items-center justify-between text-xs border-t border-border">
                      <span className="text-muted-foreground">Page {t.num}</span>
                      {isSel && (
                        <span className="font-semibold text-red-400 text-[10px] uppercase tracking-wider">Delete</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Done feedback */}
            {done && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
                <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">
                  PDF downloaded with {keptCount} page{keptCount === 1 ? "" : "s"} kept.
                </p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={save}
              disabled={busy || selected.size === 0 || selected.size >= thumbs.length}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                ? "Generating PDF…"
                : selected.size === 0
                  ? "Select pages to delete"
                  : `Delete ${selected.size} page${selected.size === 1 ? "" : "s"} & Download`}
            </button>
          </>
        )}
      </div>

      <AdZone id="delete-pdf-pages-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload your PDF — page thumbnails load automatically so you can see exactly what you're working with.",
          "Click any page thumbnail to mark it for deletion (turns red). Click again to deselect. Use Select All / Clear for bulk actions.",
          "Click Delete & Download to generate the cleaned PDF and download it instantly.",
        ]}
      />

      <ToolSeoContent
        title="Delete PDF Pages Online Free — Remove Pages from PDF, No Upload"
        description="Visually select and remove unwanted pages from any PDF. See thumbnail previews before deleting. Download the cleaned PDF instantly. Free, no signup, runs in your browser."
        body={[
          "Skycally's Delete PDF Pages tool gives you a visual, thumbnail-based interface for removing unwanted pages from any PDF. Upload your document and page previews load automatically — no guessing which page is which. Click any thumbnail to mark it for deletion (it turns red with a trash icon), then click Delete & Download to generate and download the cleaned PDF in seconds.",
          "The thumbnail grid makes it easy to work with multi-page documents. Select individual pages by clicking, mark everything with Select All, or clear your selection and start over. A counter at the top always tells you how many pages are marked for deletion and how many will be kept, so you never accidentally remove too much.",
          "All PDF processing runs locally in your browser using pdfjs-dist for rendering thumbnails and pdf-lib for generating the output document. Your file never leaves your device — making this tool completely safe for sensitive documents such as contracts, medical records, confidential reports, or personal documents you'd rather not upload to a third-party server.",
          "The output PDF is a clean copy of the kept pages, preserving all original content including text, fonts, embedded images, hyperlinks, and metadata. Nothing is re-compressed or altered — the kept pages are identical to the originals. The output filename includes '-trimmed' so you can easily distinguish it from the original.",
        ]}
        faqs={[
          {
            question: "How do I select pages to delete?",
            answer:
              "Click any page thumbnail to mark it for deletion — it turns red with a trash icon. Click again to deselect. Use Select All to mark every page, or Clear to deselect all.",
          },
          {
            question: "Can I delete every page in the PDF?",
            answer:
              "No. At least one page must remain in the document. The Delete button is disabled if all pages are selected.",
          },
          {
            question: "Will the kept pages maintain their original quality?",
            answer:
              "Yes. Kept pages are copied directly from the original document — quality, fonts, embedded images, and formatting are all preserved without any re-compression.",
          },
          {
            question: "Can I undo a deletion after downloading?",
            answer:
              "The original file on your device is never modified. If you need to start over, simply upload the original PDF again.",
          },
          {
            question: "Is my file uploaded to a server?",
            answer:
              "No. All processing happens locally in your browser using pdf-lib and pdfjs-dist. Your document never leaves your device.",
          },
          {
            question: "Can I delete pages from a password-protected PDF?",
            answer:
              "The tool attempts to open restricted PDFs using the ignoreEncryption flag, which works for most restricted (but not fully encrypted) documents.",
          },
          {
            question: "Is there a page limit?",
            answer:
              "No hard limit. PDFs with many pages (100+) take longer to render thumbnails depending on your device's CPU.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The thumbnail grid is responsive and works on smartphones, though larger PDFs may be slow to render on older devices.",
          },
        ]}
      />

      <RelatedTools currentSlug="delete-pdf-pages" />
    </ToolPageShell>
  );
}
