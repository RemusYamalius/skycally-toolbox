import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { FileOutput } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-to-word")({
  head: () => buildToolMeta(toolBySlug("pdf-to-word", tools)),
  component: PdfToWordPage,
});

function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const children: any[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines: string[] = [];
        let current = "";
        let lastY: number | null = null;
        for (const item of content.items as any[]) {
          const y = item.transform?.[5];
          if (lastY !== null && Math.abs(y - lastY) > 2) {
            if (current.trim()) lines.push(current.trim());
            current = "";
          }
          current += item.str + (item.hasEOL ? "\n" : " ");
          lastY = y;
        }
        if (current.trim()) lines.push(current.trim());

        if (i > 1) {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: true, children: [new TextRun(`Page ${i}`)] }));
        } else {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Page ${i}`)] }));
        }
        for (const line of lines) {
          children.push(new Paragraph({ children: [new TextRun(line)] }));
        }
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      const name = file.name.replace(/\.pdf$/i, "") + ".docx";
      downloadBlob(blob, name);
      toast.success("Word document ready!");
    } catch (e) {
      console.error(e);
      toast.error("Could not convert this PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="PDF to Word" description="Convert any PDF into an editable Word document — runs entirely in your browser.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setFile(null)} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Remove</button>
              <button onClick={convert} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                <FileOutput className="w-4 h-4" /> {busy ? "Converting…" : "Convert to Word"}
              </button>
            </div>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Upload your PDF file using the drop zone.",
        "Click Convert to start the PDF to Word conversion.",
        "Download your editable Word document instantly.",
      ]} />
      <RelatedTools currentSlug="pdf-to-word" />
      <ToolSeoContent
        title="PDF to Word Converter — Free Online Tool"
        description="Turn any PDF into a fully editable .docx Word document right in your browser. No uploads, no signup, no watermarks."
        body={[
          "Skycally's PDF to Word converter extracts the text from your PDF page by page and packages it into a clean Word document you can open in Microsoft Word, Google Docs, LibreOffice, or any modern word processor. Each page becomes its own section, complete with a heading and a page break, so the structure of the original document stays familiar and easy to navigate.",
          "Because everything runs locally with pdfjs-dist and the docx library, your file never leaves your device. There are no server uploads, no temporary copies, and no logs — perfect for sensitive contracts, invoices, reports, and personal documents you want to edit safely.",
        ]}
        faqs={[
          { question: "Will the formatting match the original PDF exactly?", answer: "The text content is preserved with line and page breaks, but complex layouts, fonts, and images may not transfer perfectly. The output is best for editing the text rather than reproducing the design." },
          { question: "Does the tool support scanned PDFs?", answer: "No. Scanned PDFs are images and contain no selectable text. For scans, run the file through our Image to Text (OCR) tool first." },
          { question: "Is my PDF uploaded to a server?", answer: "No. Conversion happens entirely in your browser using pdfjs-dist and the docx library." },
          { question: "Is there a file size limit?", answer: "There is no hard cap, but very large PDFs can be slow because all pages are processed in memory inside the browser." },
        ]}
      />
    </ToolPageShell>
  );
}
