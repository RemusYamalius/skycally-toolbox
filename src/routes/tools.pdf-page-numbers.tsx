import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { FilePen } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-page-numbers")({
  head: () => buildToolMeta(toolBySlug("pdf-page-numbers", tools)),
  component: PdfPageNumbersPage,
});

type Pos = "bottom-center" | "bottom-right" | "bottom-left" | "top-center";
type Size = "small" | "medium" | "large";
const SIZES: Record<Size, number> = { small: 10, medium: 14, large: 20 };

function PdfPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<Pos>("bottom-center");
  const [size, setSize] = useState<Size>("medium");
  const [start, setStart] = useState(1);
  const [busy, setBusy] = useState(false);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
  };

  const apply = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = SIZES[size];
      const margin = 24;

      pdfDoc.getPages().forEach((page, i) => {
        const num = String(start + i);
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(num, fontSize);
        let x = margin;
        let y = margin;
        if (position === "bottom-center") { x = (width - textWidth) / 2; y = margin; }
        else if (position === "bottom-right") { x = width - margin - textWidth; y = margin; }
        else if (position === "bottom-left") { x = margin; y = margin; }
        else if (position === "top-center") { x = (width - textWidth) / 2; y = height - margin - fontSize; }
        page.drawText(num, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      });

      const bytes = await pdfDoc.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-numbered.pdf";
      downloadBlob(blob, name);
      toast.success("Numbered PDF ready!");
    } catch {
      toast.error("Could not add page numbers");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Add Page Numbers to PDF" description="Add clean, customizable page numbers to any PDF — choose position, size and starting number.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => setFile(null)} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary shrink-0">Remove</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Position</label>
                <select value={position} onChange={(e) => setPosition(e.target.value as Pos)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Font size</label>
                <select value={size} onChange={(e) => setSize(e.target.value as Size)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Starting number</label>
                <input type="number" min={0} value={start} onChange={(e) => setStart(Math.max(0, parseInt(e.target.value || "0", 10)))} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>

            <button onClick={apply} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50">
              <FilePen className="w-4 h-4" /> {busy ? "Applying…" : "Apply & download"}
            </button>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Upload your PDF file to the tool.",
        "Choose the position, size and starting number for page numbers.",
        "Click Apply and download your numbered PDF.",
      ]} />
      <RelatedTools currentSlug="pdf-page-numbers" />
      <ToolSeoContent
        title="Add Page Numbers to PDF — Free Online Tool"
        description="Quickly add page numbers to any PDF with custom position and font size. Browser-based, free, and private."
        body={[
          "Skycally's page-numbering tool helps you turn raw PDF exports into properly paginated documents in seconds. Pick where the number should appear — bottom center, bottom right, bottom left, or top center — choose a font size, and set the starting number. The tool then stamps a clean Helvetica numeral on every page using pdf-lib.",
          "All processing runs in your browser, so the original PDF never leaves your device. That makes it ideal for adding numbering to contracts, theses, manuscripts, or internal reports without exposing them to third-party servers.",
        ]}
        faqs={[
          { question: "Can I start numbering from a number other than 1?", answer: "Yes. Set any non-negative starting number and the tool will increment from there for each subsequent page." },
          { question: "Can I customize the font?", answer: "The current version uses Helvetica in three preset sizes. Custom fonts and colors will arrive in a future update." },
          { question: "Does this work with encrypted PDFs?", answer: "Standard encrypted PDFs are loaded with the ignoreEncryption flag, so most files work, but heavily protected PDFs may fail." },
          { question: "Is my file uploaded anywhere?", answer: "No. The PDF is processed entirely in your browser using pdf-lib." },
        ]}
      />
    </ToolPageShell>
  );
}
