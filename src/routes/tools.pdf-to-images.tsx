import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-to-images")({
  head: () => buildToolMeta(toolBySlug("pdf-to-images", tools)),
  component: PdfToImages,
});

interface Page {
  num: number;
  url: string;
  blob: Blob;
}

function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState(2);

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
        const viewport = page.getViewport({ scale });
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
      toast.success(`Converted ${out.length} page${out.length === 1 ? "" : "s"} to PNG`);
    } catch {
      toast.error("Could not read this PDF. Please try another file.");
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

  const reset = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setFile(null);
    setPages([]);
    setProgress(0);
  };

  return (
    <ToolPageShell
      title="PDF to Images"
      description="Convert every PDF page into a high-quality PNG image — fully in your browser, no upload required."
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
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Change file
            </button>
          </div>
        )}

        {/* Quality selector */}
        {file && !busy && pages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Output quality</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Standard", desc: "~750px wide", val: 1 },
                { label: "High", desc: "~1500px wide", val: 2 },
                { label: "Ultra", desc: "~3000px wide", val: 4 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => setScale(s.val)}
                  className={`p-3 rounded-xl border text-left transition-all ${scale === s.val ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-foreground/30"}`}
                >
                  <p className={`text-sm font-medium ${scale === s.val ? "text-cyan-300" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => onFiles([file])}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02]"
            >
              Convert to PNG
            </button>
          </div>
        )}

        {busy && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Converting pages…</p>
              <span className="text-sm font-mono" style={{ color: "var(--cyan-brand)" }}>
                {progress}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #00D4FF, #3B82F6)" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Rendering at {scale}× resolution — please wait…</p>
          </div>
        )}

        {pages.length > 0 && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{pages.length}</span> page
                  {pages.length === 1 ? "" : "s"} converted
                </p>
              </div>
              <button
                onClick={downloadAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" /> Download all as ZIP
              </button>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((p) => (
                <div
                  key={p.num}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors"
                >
                  <div className="aspect-[3/4] bg-secondary/30 overflow-hidden">
                    <img src={p.url} alt={`Page ${p.num}`} className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Page {p.num}</span>
                    <button
                      onClick={() => downloadOne(p)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-border hover:bg-secondary transition-colors"
                    >
                      <Download className="w-3 h-3" /> PNG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AdZone id="pdf-to-images-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Drop your PDF or click to browse — your file is never uploaded to any server.",
          "Choose an output quality: Standard for web use, High for printing, Ultra for large-format output.",
          "Click Convert to PNG. Download individual pages or all pages as a single ZIP file.",
        ]}
      />

      <ToolSeoContent
        title="Free PDF to Images — Convert PDF Pages to PNG Online, No Upload"
        description="Convert every page of any PDF into a high-quality PNG image. Choose Standard, High, or Ultra resolution. Download individually or as a ZIP. Free, no signup, runs in your browser."
        body={[
          "Skycally's PDF to Images converter turns every page of any PDF into a crisp PNG image, directly in your browser. Upload a PDF, choose your output resolution — Standard (1×), High (2×), or Ultra (4×) — and each page renders as a separate downloadable PNG file. No server upload, no account, no watermarks.",
          "Three quality tiers cover every use case. Standard resolution (approximately 750px wide) is ideal for web preview images, email attachments, and thumbnails. High resolution (approximately 1,500px wide) suits presentations, social media posts, and print-at-home documents. Ultra resolution (approximately 3,000px wide) is designed for large-format printing, detailed archiving, and professional graphic design workflows.",
          "All rendering uses PDF.js — the same open-source engine Mozilla Firefox uses to display PDFs — running entirely in your browser tab. This means your PDF content is never transmitted over the internet, making the tool completely private and suitable for confidential documents such as contracts, medical records, and financial statements.",
          "After conversion, each page thumbnail is shown in a gallery view. Download individual pages with a single click, or use the Download All as ZIP button to package every page into one file. ZIP download uses JSZip running in the browser — again, no server involved.",
        ]}
        faqs={[
          {
            question: "What resolution are the exported images?",
            answer:
              "Standard produces ~750px wide images (1× scale). High produces ~1,500px wide (2× scale, recommended for most uses). Ultra produces ~3,000px wide (4× scale, for large-format printing).",
          },
          {
            question: "Can I download all pages at once?",
            answer: "Yes. Click 'Download all as ZIP' to package every page into a single ZIP file for convenience.",
          },
          {
            question: "What image format are the pages saved as?",
            answer: "All pages are exported as lossless PNG files, preserving text sharpness and fine details.",
          },
          {
            question: "Is there a page limit?",
            answer:
              "No hard limit. Very large PDFs (100+ pages) may take longer to process depending on your device's CPU and memory.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. Everything runs locally in your browser using PDF.js. Your PDF never leaves your device.",
          },
          {
            question: "Will text in the images be sharp?",
            answer:
              "Yes. PDF.js renders vector text and graphics at the chosen scale — text remains crisp at all resolution levels.",
          },
          {
            question: "Can I convert scanned PDF documents?",
            answer:
              "Yes. Scanned PDFs render as image captures of the scan. For extracting text from scans, use the Image to Text (OCR) tool instead.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The tool is fully responsive, though Ultra resolution may be slow on older smartphones due to the large canvas size required.",
          },
        ]}
      />

      <RelatedTools currentSlug="pdf-to-images" />
    </ToolPageShell>
  );
}
