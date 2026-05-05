import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { Textarea } from "@/components/ui/textarea";
import { checkSize, downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/pdf-text-extractor")({
  head: () => ({
    meta: [
      { title: "Extract Text from PDF — Skycally" },
      { name: "description", content: "Extract all text from any PDF instantly. 100% browser-based, supports Arabic and all languages." },
      { property: "og:title", content: "Extract Text from PDF · Skycally" },
      { property: "og:description", content: "Extract all text from any PDF instantly." },
    ],
  }),
  component: PdfTextExtractorPage,
});

async function extractText(file: File): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    parts.push(`--- Page ${i} ---\n${text}`);
  }
  return parts.join("\n\n");
}

function PdfTextExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setBusy(true);
    setText("");
    try {
      const out = await extractText(f);
      setText(out);
      toast.success(`Extracted text from ${f.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to extract text");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
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

  const reset = () => { setFile(null); setText(""); };

  return (
    <ToolPageShell title="Extract Text from PDF" description="Extract all text from any PDF instantly. Works with Arabic and all languages — 100% in your browser.">
      {!file ? (
        <DropZone accept="application/pdf" onFiles={onFile} hint="PDF, up to 10MB" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          {busy ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Extracting text...
            </div>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                dir="auto"
                className="min-h-[360px] font-mono text-sm"
                placeholder="Extracted text will appear here..."
              />
              <div className="flex flex-wrap gap-3">
                <button onClick={copy} disabled={!text} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5 disabled:opacity-50">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={download} disabled={!text} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 disabled:opacity-50 hover:bg-secondary">
                  <Download className="w-4 h-4" /> Download .txt
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <HowToUse steps={[
        "Drop your PDF file (up to 10MB).",
        "We extract the text instantly in your browser.",
        "Copy the result or download it as a .txt file.",
      ]} />
    </ToolPageShell>
  );
}
