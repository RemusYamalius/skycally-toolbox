import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { toast } from "sonner";
import * as mammoth from "mammoth";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => buildToolMeta(toolBySlug("word-to-pdf", tools)),
  component: WordToPdf,
});

function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 2cm; direction: auto; }
  h1,h2,h3,h4,h5,h6 { margin-top: 1em; }
  p { margin: 0.5em 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 6px; }
  img { max-width: 100%; }
  @media print { body { margin: 1cm; } }
</style>
</head>
<body>
${html}
</body>
</html>`;

      const iframe = iframeRef.current!;
      iframe.srcdoc = printHtml;
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setBusy(false);
          toast.success("PDF dialog opened — save as PDF from your browser.");
        }, 300);
      };
    } catch {
      toast.error("Conversion failed. Make sure the file is a valid .docx file.");
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Word to PDF"
      description="Convert Word documents to PDF directly in your browser — private and fast."
    >
      <div className="space-y-5">
        <DropZone
          accept=".docx"
          onFiles={(f) => setFile(f[0] ?? null)}
          label="Drop your Word file here"
          hint=".docx files only"
        />

        {file && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={convert}
              disabled={busy}
              className="py-3 px-5 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50"
            >
              {busy ? "Converting..." : "Convert to PDF"}
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          When the print dialog opens, choose "Save as PDF" as the destination.
        </p>

        <iframe ref={iframeRef} title="print-frame" style={{ display: "none" }} />
      </div>

      <HowToUse
        steps={[
          "Upload your Word (.docx) file using the drop zone.",
          "Click Convert to PDF to process your document.",
          "In the print dialog, select Save as PDF to download.",
        ]}
      />

      <ToolSeoContent
        title="Word to PDF Converter Free Online — Convert .docx to PDF Instantly"
        description="Convert Word documents (.docx) to PDF for free in your browser. No file uploads, no server, 100% private. Supports Arabic RTL, tables, images, and all formatting."
        body={[
          "Skycally's Word to PDF converter transforms your .docx files into PDF documents entirely in your browser using the mammoth.js library. There are no file uploads, no server processing, and no account required — your document never leaves your device at any point during conversion. Simply drop your Word file, click Convert, and save the result as PDF from your browser's print dialog.",
          "The conversion preserves your document's structure including headings, paragraphs, bold and italic formatting, numbered and bulleted lists, tables, and embedded images. Arabic and other right-to-left text is fully supported — the tool correctly renders RTL content without any special configuration.",
          "Word to PDF conversion is one of the most common document tasks in offices, schools, and businesses. PDFs are preferred for sharing because they look identical on every device regardless of the operating system or installed fonts. Converting from Word ensures your document layout is locked in exactly as you intended.",
          "For the reverse operation — converting an existing PDF back into an editable Word document — use Skycally's PDF to Word tool. For creating new documents from scratch that can be exported as PDF or .docx, try the free Word Processor tool which requires no account and works entirely in your browser.",
        ]}
        faqs={[
          {
            question: "Is Word to PDF conversion free?",
            answer:
              "Yes, completely free with no file size limits, no registration, and no watermarks on the output PDF.",
          },
          {
            question: "Is my Word file uploaded to a server?",
            answer:
              "No. Conversion happens entirely in your browser using the mammoth.js library. Your .docx file never leaves your device.",
          },
          {
            question: "What file types are supported?",
            answer:
              "Currently .docx files (Word 2007 format and later). The older .doc format (Word 97–2003) is not supported. If you have a .doc file, open it in Microsoft Word or LibreOffice and save it as .docx first.",
          },
          {
            question: "Does it support Arabic and RTL text?",
            answer:
              "Yes. Right-to-left text including Arabic and Hebrew is preserved correctly during conversion. Tables, headings, and other structural elements with RTL content are also handled.",
          },
          {
            question: "Will the PDF look exactly like my Word document?",
            answer:
              "The conversion preserves most formatting including headings, bold, italic, lists, and tables. Some complex Word features like custom macros, tracked changes, or highly customized styles may not render identically. For pixel-perfect results, use Microsoft Word's built-in Save As PDF feature.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no enforced file size limit. Large files with many images may take a few seconds to process. Very large documents (50+ pages with high-resolution images) may be slow depending on your device's memory.",
          },
          {
            question: "Can I convert multiple Word files at once?",
            answer: "Currently the tool converts one file at a time. Upload and convert each file separately.",
          },
          {
            question: "How do I save the PDF after conversion?",
            answer:
              "After clicking Convert to PDF, your browser's print dialog opens automatically. Select 'Save as PDF' (or 'Microsoft Print to PDF' on Windows) as the destination, then click Save. Choose your filename and save location.",
          },
        ]}
      />

      <RelatedTools currentSlug="word-to-pdf" />
    </ToolPageShell>
  );
}
