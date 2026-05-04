import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { Progress } from "@/components/ui/progress";
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
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const onFile = (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setStage("Reading document…");

    const container = document.createElement("div");
    container.style.cssText = [
      "position:fixed", "top:0", "left:-9999px",
      "width:794px", "min-height:1123px",
      "background:#ffffff", "color:#000000",
      "font-size:12pt", "line-height:1.5",
      "padding:60px 72px", "box-sizing:border-box", "z-index:-1",
    ].join(";");
    document.body.appendChild(container);

    try {
      const { renderAsync } = await import("docx-preview");
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const arrayBuffer = await file.arrayBuffer();
      setProgress(25);
      setStage("Rendering…");

      await renderAsync(arrayBuffer, container, undefined, {
        className: "docx",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
      });

      // wait for fonts/images
      await new Promise((r) => setTimeout(r, 600));
      setProgress(55);
      setStage("Building PDF…");

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // pixels of source canvas per PDF page
      const sliceHeightPx = Math.floor((pageHeight * canvas.width) / pageWidth);

      let y = 0;
      let isFirst = true;
      const totalSlices = Math.max(1, Math.ceil(canvas.height / sliceHeightPx));
      let sliceIdx = 0;

      while (y < canvas.height) {
        const sh = Math.min(sliceHeightPx, canvas.height - y);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sh;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sh, 0, 0, canvas.width, sh);

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
        const drawHeight = (sh * pageWidth) / canvas.width;

        if (!isFirst) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, drawHeight);
        isFirst = false;

        y += sh;
        sliceIdx++;
        setProgress(55 + Math.round((sliceIdx / totalSlices) * 40));
      }

      pdf.save(file.name.replace(/\.docx?$/i, ".pdf"));
      setProgress(100);
      setStage("Done!");
      toast.success("Conversion complete!");
    } catch (e) {
      console.error(e);
      toast.error("Conversion failed. Try saving the file as .docx (not .doc) and retry.");
    } finally {
      if (container.parentNode) document.body.removeChild(container);
      setBusy(false);
      setTimeout(() => { setProgress(0); setStage(""); }, 1200);
    }
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
            <button onClick={() => setFile(null)} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          {busy && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{stage}</p>
            </div>
          )}

          <button onClick={convert} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</> : "Convert & Download"}
          </button>
          <p className="text-xs text-center text-muted-foreground">Arabic and RTL text are fully supported.</p>
        </div>
      )}

      <HowToUse steps={[
        "Drop a .doc or .docx file.",
        "Click Convert & Download — we render and paginate it for you.",
        "Your PDF is saved to your device automatically.",
      ]} />
    </ToolPageShell>
  );
}
