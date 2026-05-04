import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { checkSize } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => ({
    meta: [
      { title: "Word to PDF — Convert documents · Skycally" },
      { name: "description", content: "Turn Word documents into polished PDFs in your browser." },
      { property: "og:title", content: "Word to PDF · Skycally" },
      { property: "og:description", content: "Convert Word to PDF instantly." },
    ],
  }),
  component: WordToPdf,
});

function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const onFile = async (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setPreviewHtml(null);
    try {
      const { renderAsync } = await import("docx-preview");
      const container = document.createElement("div");
      await renderAsync(await f.arrayBuffer(), container, undefined, { className: "docx-preview", inWrapper: false });
      setPreviewHtml(container.innerHTML);
    } catch {
      toast.error("Could not preview this document");
    }
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { renderAsync } = await import("docx-preview");
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:white;padding:40px;color:#000";
      document.body.appendChild(container);
      try {
        await renderAsync(await file.arrayBuffer(), container, undefined, { className: "docx-preview", inWrapper: false });
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const pdf = new jsPDF({ format: "a4", unit: "mm" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;
        let heightLeft = imgH;
        let position = 0;
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
        pdf.save(file.name.replace(/\.docx?$/i, ".pdf"));
        toast.success("Conversion complete!");
      } finally {
        document.body.removeChild(container);
      }
    } catch {
      toast.error("Conversion failed");
    } finally { setBusy(false); }
  };

  return (
    <ToolPageShell title="Word to PDF" description="Upload a Word document and get a polished PDF.">
      {!file ? (
        <DropZone accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onFiles={onFile} hint="DOC or DOCX, up to 10MB" />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setPreviewHtml(null); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>
          {previewHtml && (
            <div className="rounded-2xl border border-border bg-white p-6 max-h-96 overflow-auto text-black text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
          <button onClick={convert} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : "Convert & Download"}
          </button>
        </div>
      )}

      <HowToUse steps={[
        "Drop a .doc or .docx file.",
        "Preview the document to make sure it looks right.",
        "Click Convert & Download to save it as a PDF.",
      ]} />
    </ToolPageShell>
  );
}
