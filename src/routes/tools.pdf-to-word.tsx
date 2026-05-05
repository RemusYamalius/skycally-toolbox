import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { convertPdfToWord } from "@/services/pdfToWord";
import { checkSize } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "PDF to Word — Convert PDF documents · Skycally" },
      { name: "description", content: "Turn PDFs into editable Word documents in seconds." },
      { property: "og:title", content: "PDF to Word · Skycally" },
      { property: "og:description", content: "Convert PDF to editable Word files." },
    ],
  }),
  component: PdfToWordPage,
});

function PdfToWordPage() {
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
      await convertPdfToWord(file);
      toast.success("Conversion complete!");
    } catch (e: any) {
      toast.error(e?.message || "Conversion failed");
    } finally { setBusy(false); }
  };

  return (
    <ToolPageShell title="PDF to Word" description="Upload a PDF and get an editable Word document.">
      {!file ? (
        <DropZone accept="application/pdf" onFiles={onFile} hint="PDF, up to 10MB" />
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
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : "Convert to Word"}
          </button>
        </div>
      )}

      <HowToUse steps={[
        "Drop a PDF file (up to 10MB).",
        "Click Convert to Word — we process it server-side.",
        "Your editable .docx is downloaded automatically.",
      ]} />
    </ToolPageShell>
  );
}
