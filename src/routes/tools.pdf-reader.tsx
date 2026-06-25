import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Link as LinkIcon, Maximize2, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-reader")({
  head: () => buildToolMeta(toolBySlug("pdf-reader", tools)),
  component: PdfReaderPage,
});

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function PdfReaderPage() {
  const [pdf, setPdf] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [scale, setScale] = useState(1);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTask = useRef<any>(null);

  const loadFromBuffer = async (buf: ArrayBuffer, name: string) => {
    setLoading(true);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setPdf(doc);
      setFileName(name);
      setNumPages(doc.numPages);
      setCurrent(1);
      setPageInput("1");
    } catch {
      toast.error("Could not read this PDF. The file may be corrupted or heavily encrypted.");
    } finally {
      setLoading(false);
    }
  };

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    const buf = await f.arrayBuffer();
    await loadFromBuffer(buf, f.name);
  };

  const loadUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error();
      const buf = await res.arrayBuffer();
      const name = url.split("/").pop() || "document.pdf";
      await loadFromBuffer(buf, name);
    } catch {
      toast.error("Could not load PDF from URL. Check the link or the server's CORS settings.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    if (renderTask.current) {
      renderTask.current.cancel();
    }
    let cancelled = false;
    setRendering(true);
    (async () => {
      try {
        const page = await pdf.getPage(current);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTask.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, current, scale]);

  const goTo = (n: number) => {
    const p = Math.max(1, Math.min(numPages, n));
    setCurrent(p);
    setPageInput(String(p));
  };

  const zoomIn = () => {
    const idx = ZOOM_STEPS.findIndex((s) => s > scale);
    if (idx !== -1) setScale(ZOOM_STEPS[idx]);
  };
  const zoomOut = () => {
    const idx = [...ZOOM_STEPS].reverse().findIndex((s) => s < scale);
    if (idx !== -1) setScale(ZOOM_STEPS[ZOOM_STEPS.length - 1 - idx]);
  };
  const zoomFit = () => setScale(1);

  const reset = () => {
    setPdf(null);
    setFileName("");
    setNumPages(0);
    setCurrent(1);
    setScale(1);
    setUrl("");
    setPageInput("1");
  };

  return (
    <ToolPageShell
      title="PDF Reader"
      description="Open and read any PDF directly in your browser — upload a file or paste a public URL."
      showFileDisclaimer={false}
    >
      <div className="space-y-5">
        {!pdf && (
          <>
            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
                <svg className="w-8 h-8 animate-spin mx-auto text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-sm text-muted-foreground">Loading PDF…</p>
              </div>
            ) : (
              <>
                <DropZone
                  accept="application/pdf"
                  onFiles={onFiles}
                  label="Drop a PDF here"
                  hint="or click to browse — your file never leaves your device"
                />
                <div className="rounded-2xl border border-border bg-card p-5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Or load from a URL
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadUrl()}
                        placeholder="https://example.com/document.pdf"
                        className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                        aria-label="PDF URL"
                      />
                    </div>
                    <button
                      onClick={loadUrl}
                      disabled={!url.trim()}
                      className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      Load
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The PDF host must allow cross-origin requests (CORS).
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {pdf && (
          <>
            {/* Toolbar */}
            <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3 flex flex-wrap items-center gap-2">
              {/* File info */}
              <span className="text-xs text-muted-foreground truncate max-w-[160px] hidden sm:block">{fileName}</span>
              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Navigation */}
              <button
                onClick={() => goTo(current - 1)}
                disabled={current <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 text-sm">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => goTo(parseInt(pageInput, 10) || 1)}
                  onKeyDown={(e) => e.key === "Enter" && goTo(parseInt(pageInput, 10) || 1)}
                  className="w-12 text-center rounded-lg border border-border bg-background py-1 text-sm font-mono"
                  aria-label="Current page"
                />
                <span className="text-muted-foreground">/ {numPages}</span>
              </div>
              <button
                onClick={() => goTo(current + 1)}
                disabled={current >= numPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-border" />

              {/* Zoom */}
              <button
                onClick={zoomOut}
                disabled={scale <= ZOOM_STEPS[0]}
                aria-label="Zoom out"
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={zoomFit}
                className="text-xs font-mono px-2 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                aria-label="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                aria-label="Zoom in"
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="ml-auto flex items-center gap-2">
                {rendering && (
                  <svg className="w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                <button
                  onClick={reset}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div
              className="rounded-2xl border border-border bg-secondary/20 p-4 overflow-auto flex justify-center"
              style={{ maxHeight: "80vh" }}
            >
              <canvas
                ref={canvasRef}
                className="bg-white shadow-lg rounded-sm max-w-full"
                aria-label={`PDF page ${current} of ${numPages}`}
                role="img"
              />
            </div>

            {/* Page quick jump */}
            {numPages > 5 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[1, Math.ceil(numPages / 4), Math.ceil(numPages / 2), Math.ceil((numPages * 3) / 4), numPages]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => goTo(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${current === p ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      {p}
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <AdZone id="pdf-reader-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload a PDF file or paste a public URL and click Load.",
          "Navigate pages with the Previous/Next buttons or type a page number directly.",
          "Use the zoom controls (or click the percentage) to adjust reading size from 50% to 300%.",
        ]}
      />

      <ToolSeoContent
        title="Free Online PDF Reader — View PDF Files in Your Browser, No Download"
        description="Open and read any PDF directly in your browser. Upload a file or paste a URL. Navigate pages, zoom in/out, and read comfortably. Free, no signup, no upload to server."
        body={[
          "Skycally's PDF Reader is a fast, lightweight viewer that renders any PDF directly in your browser tab — no download, no plugin, no account required. Upload a PDF from your device or paste a public URL, and the document appears instantly with full page navigation and zoom controls.",
          "Page navigation includes Previous/Next buttons, a direct page number input field for jumping to any page instantly, and quick-jump buttons for long documents that let you skip to the beginning, quarter, middle, three-quarter, or end with a single click. Zoom ranges from 50% to 300% in fine steps — click the percentage display to reset to 100%.",
          "The reader uses PDF.js — the same open-source rendering engine that powers Mozilla Firefox's built-in PDF viewer — for accurate, high-quality page rendering. Text remains crisp at all zoom levels, and complex layouts including multi-column text, images, tables, and vector graphics are rendered faithfully.",
          "Because the PDF is rendered entirely in your browser, your file never leaves your device. This makes the reader suitable for confidential documents such as contracts, medical records, and financial statements that you need to review without uploading to a third-party server.",
        ]}
        faqs={[
          {
            question: "Can I open PDFs hosted online?",
            answer:
              "Yes. Paste any direct PDF URL and click Load. The server hosting the PDF must allow cross-origin requests (CORS headers). Most public document hosting services support this.",
          },
          {
            question: "Is the PDF uploaded to your servers?",
            answer:
              "No. Files are rendered locally in your browser using PDF.js. Nothing is transmitted to any server.",
          },
          {
            question: "Can I download or edit the PDF here?",
            answer:
              "This tool is a viewer only. For editing, use Rotate PDF, Delete PDF Pages, Add Page Numbers, or Split PDF. For text extraction, use Extract Text from PDF.",
          },
          {
            question: "Why is a large PDF slow to render?",
            answer:
              "Each page is rendered to a canvas in memory. Very large PDFs or pages with complex graphics take longer. Zooming in also increases render time since more pixels are drawn.",
          },
          {
            question: "Can I print the PDF from the reader?",
            answer:
              "Use your browser's print function (Ctrl+P / Cmd+P) while the PDF is open. The current page is printed at the displayed zoom level.",
          },
          {
            question: "Does this work with password-protected PDFs?",
            answer:
              "PDFs with a user password cannot be loaded without the password. The tool will show an error if it cannot decrypt the file.",
          },
          {
            question: "Can I read Arabic or right-to-left PDFs?",
            answer:
              "Yes. PDF.js renders text as vector graphics from the PDF layout, so RTL languages including Arabic and Hebrew display correctly as in the original document.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The viewer is fully responsive with touch-friendly controls. Pinch-to-zoom on mobile works via the browser's native zoom on the canvas.",
          },
        ]}
      />

      <RelatedTools currentSlug="pdf-reader" />
    </ToolPageShell>
  );
}
