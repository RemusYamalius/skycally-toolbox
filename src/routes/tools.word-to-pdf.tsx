import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { checkSize } from "@/lib/file-utils";
import { convertWordToPdf } from "@/services/wordToPdf";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => ({
    meta: [
      { title: "Word to PDF Converter Free Online | Skycally" },
      { name: "description", content: "Convert Word documents to PDF for free. Supports DOC and DOCX files. Fast, accurate conversion with Arabic text support." },
      { property: "og:title", content: "Word to PDF | Skycally" },
      { property: "og:description", content: "Convert Word documents to PDF instantly." },
      { property: "og:url", content: "https://skycally.com/tools/word-to-pdf" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/word-to-pdf" }],
  }),
  component: WordToPdf,
});

function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await convertWordToPdf(file);
      toast.success("Conversion complete!");
    } catch (e: any) {
      toast.error(e?.message || "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Word to PDF" description="Upload a Word document and get a polished PDF.">
      {!file ? (
        <DropZone accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onFiles={onFile} hint="DOC or DOCX, up to 10MB" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => setFile(null)} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>
          <button onClick={convert} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</> : "Convert to PDF"}
          </button>
          <p className="text-xs text-center text-muted-foreground">Arabic and RTL text are fully supported.</p>
        </div>
      )}

      <HowToUse steps={[
        "Drop a .doc or .docx file.",
        "Click Convert to PDF — we process it server-side.",
        "Your PDF is downloaded automatically.",
      ]} />
    </ToolPageShell>
  );
}
