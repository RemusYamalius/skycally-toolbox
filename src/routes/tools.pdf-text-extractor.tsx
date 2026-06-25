import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download, Check, FileText } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { Textarea } from "@/components/ui/textarea";
import { AdZone } from "@/components/ad-zone";
import { checkSize, downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-text-extractor")({
  head: () => buildToolMeta(toolBySlug("pdf-text-extractor", tools)),
  component: PdfTextExtractorPage,
});

async function extractText(file: File, onProgress: (p: number) => void): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    parts.push(`--- Page ${i} ---\n${text}`);
    onProgress(Math.round((i / pdf.numPages) * 100));
  }
  return parts.join("\n\n");
}

function PdfTextExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const onFile = async (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setBusy(true);
    setText("");
    setProgress(0);
    setWordCount(0);
    setCharCount(0);
    try {
      const out = await extractText(f, setProgress);
      setText(out);
      const words = out.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(out.length);
      toast.success(`Extracted text from ${f.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to extract text. This may be a scanned PDF — try the Image to Text tool.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const name = (file?.name || "extracted").replace(/\.pdf$/i, "") + ".txt";
    downloadBlob(blob, name);
  };

  const reset = () => {
    setFile(null);
    setText("");
    setProgress(0);
    setWordCount(0);
    setCharCount(0);
  };

  return (
    <ToolPageShell
      title="Extract Text from PDF"
      description="Extract all text from any PDF instantly. Supports Arabic and all languages — 100% in your browser, no upload."
    >
      {!file ? (
        <DropZone
          accept="application/pdf"
          onFiles={onFile}
          hint="PDF · max 10MB · your file never leaves your device"
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          {/* File info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Change
            </button>
          </div>

          {busy ? (
            <div className="space-y-3 py-8">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Extracting text… {progress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, #00D4FF, #3B82F6)" }}
                />
              </div>
            </div>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setWordCount(e.target.value.trim().split(/\s+/).filter(Boolean).length);
                  setCharCount(e.target.value.length);
                }}
                dir="auto"
                className="min-h-[360px] font-mono text-sm resize-y"
                placeholder="Extracted text will appear here…"
              />
              {/* Stats + actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{wordCount.toLocaleString()}</span> words
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{charCount.toLocaleString()}</span> characters
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copy}
                    disabled={!text}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5 text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                  <button
                    onClick={download}
                    disabled={!text}
                    className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 text-sm disabled:opacity-50 hover:bg-secondary transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download .txt
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AdZone id="pdf-text-extractor-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Drop your PDF or click to browse — max 10MB. Your file never leaves your device.",
          "Text is extracted page by page and displayed in an editable text area with word and character counts.",
          "Copy all text to clipboard or download as a .txt file.",
        ]}
      />

      <ToolSeoContent
        title="Extract Text from PDF Free — Online PDF Text Extractor, No Upload"
        description="Extract all readable text from any PDF instantly. Supports all languages including Arabic. Copy or download as TXT. Free, no signup, runs entirely in your browser."
        body={[
          "Skycally's PDF Text Extractor pulls all readable text content from any PDF and displays it in an editable text area — instantly, entirely in your browser. Upload a PDF, and the tool processes it page by page using PDF.js, labeling each section with its page number so you can navigate the content easily. Copy all text to your clipboard or download it as a .txt file.",
          "Live word and character counts update as you edit the extracted text, making this tool useful beyond simple extraction — you can clean up the text, remove unwanted sections, or prepare it for use in other documents before downloading. The text area supports full editing with dir='auto' for correct display of Arabic, Hebrew, and other right-to-left languages.",
          "Text extraction works with digitally created PDFs — documents exported from Word, Excel, PowerPoint, InDesign, or generated by any PDF printer. These contain embedded text that PDF.js can read accurately. Scanned PDFs, on the other hand, are images of text rather than actual text — for those, use the Image to Text (OCR) tool which uses Tesseract.js to recognize text from images.",
          "Because everything runs in your browser using PDF.js — the same engine Firefox uses to display PDFs — your document is never transmitted to any server. This makes the tool completely private and safe for sensitive documents such as contracts, research papers, financial reports, or medical records.",
        ]}
        faqs={[
          {
            question: "What types of PDFs can I extract text from?",
            answer:
              "Digitally created PDFs (exports from Word, Excel, PowerPoint, or any PDF printer) work perfectly. Scanned PDFs (photographs of documents) contain images rather than text — use the Image to Text (OCR) tool for those.",
          },
          {
            question: "Does it support Arabic and other languages?",
            answer:
              "Yes. Text extraction supports all languages embedded in the PDF, including Arabic, Chinese, Japanese, Hebrew, and any other language. The text area automatically adjusts direction for RTL languages.",
          },
          {
            question: "Will the formatting be preserved?",
            answer:
              "Plain text is extracted without formatting. Tables appear as space-separated text, and columns may merge. For formatted extraction, use the PDF to Word converter instead.",
          },
          {
            question: "Can I edit the extracted text before downloading?",
            answer:
              "Yes. The text area is fully editable — clean up the content, remove unwanted sections, or make corrections before copying or downloading.",
          },
          {
            question: "Can I extract text from a password-protected PDF?",
            answer:
              "No. Remove password protection first using the Protect PDF tool or a desktop application, then extract text.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. Everything runs locally in your browser using PDF.js. Your document never leaves your device.",
          },
          {
            question: "What is the file size limit?",
            answer:
              "Up to 10MB. For larger PDFs, consider splitting the file first using the Split PDF tool, then extracting text from each part.",
          },
          {
            question: "Why does extracted text look garbled?",
            answer:
              "Some PDFs use custom font encodings or store text as paths rather than characters. This is a PDF format limitation — no extraction tool can recover text stored as vector graphics.",
          },
        ]}
      />

      <RelatedTools currentSlug="pdf-text-extractor" />
    </ToolPageShell>
  );
}
