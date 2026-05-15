import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Link as LinkIcon } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-reader")({
  head: () => buildToolMeta(toolBySlug("pdf-reader", tools)),
  component: PdfReaderPage,
});

function PdfReaderPage() {
  const [, setData] = useState<ArrayBuffer | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [scale, setScale] = useState(1);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadFromBuffer = async (buf: ArrayBuffer) => {
    setLoading(true);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setData(buf);
      setPdf(doc);
      setNumPages(doc.numPages);
      setCurrent(1);
    } catch {
      toast.error("Could not read this PDF");
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
    await loadFromBuffer(buf);
  };

  const loadUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error();
      const buf = await res.arrayBuffer();
      await loadFromBuffer(buf);
    } catch {
      toast.error("Could not load PDF from URL (check link or CORS)");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(current);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      if (cancelled) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdf, current, scale]);

  const goTo = (n: number) => {
    setCurrent(Math.max(1, Math.min(numPages, n)));
  };

  const reset = () => {
    setData(null);
    setPdf(null);
    setNumPages(0);
    setCurrent(1);
    setScale(1);
    setUrl("");
  };

  return (
    <ToolPageShell title="PDF Reader" description="Open and read any PDF directly in your browser — upload a file or paste a link.">
      <div className="space-y-5">
        {!pdf && (
          <>
            <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />
            <div className="rounded-2xl border border-border bg-card p-5">
              <label className="text-xs font-semibold mb-2 block text-muted-foreground">Or load from a URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/file.pdf" className="w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 text-sm" />
                </div>
                <button onClick={loadUrl} disabled={loading || !url.trim()} className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-50">
                  {loading ? "Loading…" : "Load"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">The PDF host must allow cross-origin requests (CORS).</p>
            </div>
          </>
        )}

        {pdf && (
          <>
            <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card/90 backdrop-blur p-3 flex flex-wrap items-center gap-2">
              <button onClick={() => goTo(current - 1)} disabled={current <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm font-mono px-2">Page {current} of {numPages}</span>
              <button onClick={() => goTo(current + 1)} disabled={current >= numPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary disabled:opacity-40">
                Next <ChevronRight className="w-4 h-4" />
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))} disabled={scale <= 0.5} className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40" aria-label="Zoom out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)))} disabled={scale >= 2.5} className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40" aria-label="Zoom in">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={reset} className="ml-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary">Close</button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4 max-h-[80vh] overflow-auto flex justify-center">
              <canvas ref={canvasRef} className="bg-white shadow-lg rounded-md max-w-full h-auto" />
            </div>
          </>
        )}
      </div>

      <HowToUse steps={[
        "Upload a PDF file or paste a URL to a PDF document.",
        "Browse pages using the Previous and Next buttons.",
        "Use the zoom controls to adjust the reading size.",
      ]} />
      <RelatedTools currentSlug="pdf-reader" />
      <ToolSeoContent
        title="Free Online PDF Reader — View PDFs in Your Browser"
        description="Open, preview, and read PDF files instantly in the browser. No installs, no signups, no uploads."
        body={[
          "Skycally's PDF Reader is a fast, lightweight viewer that lets you open PDFs from your computer or directly from a public URL. Pages are rendered with pdfjs-dist on stacked canvases, and you can move between them using Previous and Next buttons or simply scroll through the document.",
          "Zoom from 50% to 250% in 25% steps to fit the way you read — large for accessibility, small for skimming. Because the file is parsed in your browser, nothing is sent to our servers, making it ideal for confidential documents and offline-first workflows.",
        ]}
        faqs={[
          { question: "Can I open PDFs hosted online?", answer: "Yes, paste any direct PDF URL. The host must allow cross-origin requests (CORS) for this to work." },
          { question: "Is the file uploaded to your servers?", answer: "No. The PDF is rendered locally in your browser with pdfjs-dist." },
          { question: "Can I download or edit the PDF here?", answer: "This tool is a viewer only. For editing, try our other tools like Rotate PDF, Delete PDF Pages, or Merge PDF." },
          { question: "Why is a large PDF slow to render?", answer: "Every page is rendered to a canvas in memory. For very large files, expect a short delay while pages are drawn." },
        ]}
      />
    </ToolPageShell>
  );
}
