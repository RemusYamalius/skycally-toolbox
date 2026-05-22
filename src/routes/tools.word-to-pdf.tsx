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
    <ToolPageShell title="Word to PDF" description="Convert Word documents to PDF directly in your browser — private and fast.">
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

      <HowToUse steps={[
        "Upload your Word (.docx) file using the drop zone.",
        "Click Convert to PDF to process your document.",
        "In the print dialog, select Save as PDF to download.",
      ]} />
      <RelatedTools currentSlug="word-to-pdf" />
      <ToolSeoContent
        title="Word to PDF Converter — Free Online Tool"
        description="Convert Word documents to PDF instantly in your browser. No uploads, no server — 100% private."
        body={[
          "Skycally's Word to PDF converter processes your document entirely in your browser using the mammoth library.",
          "Your file never leaves your device, ensuring complete privacy. Supports .docx files up to 20MB.",
        ]}
        faqs={[
          { question: "Is it free?", answer: "Yes, completely free with no registration required." },
          { question: "Is my file uploaded to a server?", answer: "No — conversion happens entirely in your browser. Your file never leaves your device." },
          { question: "What file types are supported?", answer: "Currently .docx files (Word 2007 and later). DOC files are not supported." },
          { question: "Does it support Arabic and RTL text?", answer: "Yes — RTL and Arabic content is preserved during conversion." },
        ]}
      />
    </ToolPageShell>
  );
}
