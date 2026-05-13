import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";

import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/pdf-to-images")({
  head: () => buildToolMeta(toolBySlug("pdf-to-images", tools)),
  component: PdfToImages,
});

interface Page { num: number; url: string; blob: Blob }

function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setBusy(true);
    setProgress(0);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const out: Page[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
        out.push({ num: i, url: URL.createObjectURL(blob), blob });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
      setPages(out);
      toast.success(`Converted ${out.length} page${out.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error("Could not read this PDF");
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = (p: Page) => {
    const a = document.createElement("a");
    a.href = p.url;
    a.download = `${(file?.name || "pdf").replace(/\.pdf$/i, "")}-page-${p.num}.png`;
    a.click();
  };

  const downloadAll = async () => {
    if (!pages.length) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    pages.forEach((p) => zip.file(`page-${String(p.num).padStart(3, "0")}.png`, p.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(file?.name || "pdf").replace(/\.pdf$/i, "")}-images.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <ToolPageShell title="PDF to Images" description="Convert every PDF page into a high-quality PNG image — fully in your browser.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {busy && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-2">Rendering pages… {progress}%</p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {pages.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{pages.length} page{pages.length === 1 ? "" : "s"} ready</p>
              <button onClick={downloadAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold">
                <Download className="w-4 h-4" /> Download all as ZIP
              </button>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((p) => (
                <div key={p.num} className="rounded-xl border border-border bg-card overflow-hidden group">
                  <div className="aspect-[3/4] bg-secondary/50 overflow-hidden">
                    <img src={p.url} alt={`Page ${p.num}`} className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <div className="p-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Page {p.num}</span>
                    <button onClick={() => downloadOne(p)} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Download">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <HowToUse steps={[
        "Drop your PDF or click to browse.",
        "Wait while pages are rendered as PNG images in your browser.",
        "Download individual pages or all of them as a ZIP.",
      ]} />
          <ToolSeoContent
        title="Free PDF to Images — Convert PDF Pages to PNG"
        description="Skycally's PDF to Images tool converts every page of your PDF into a high-quality PNG image. It uses PDF.js to render each page at 2x resolution directly in your browser. You can download individual pages or all pages as a ZIP file. No uploads, no signup, completely free."
        body={[]}
        faqs={[{"question":"What resolution are the exported images?","answer":"Pages are rendered at 2x scale for high-quality output, typically 1500-2000px wide."},{"question":"Can I download all pages at once?","answer":"Yes, use the 'Download All as ZIP' button to get all pages in one file."},{"question":"What format are the images saved as?","answer":"All pages are exported as PNG files."},{"question":"Is there a page limit?","answer":"The tool supports PDFs of any length, but very large files may take longer to process."},{"question":"Is my PDF uploaded to a server?","answer":"No. Everything runs in your browser using PDF.js."}]}
      />
    </ToolPageShell>
  );
}
