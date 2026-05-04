import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "PDF to Word — Convert PDF documents · Skycally" },
      { name: "description", content: "Turn PDFs into editable Word documents securely in your browser." },
      { property: "og:title", content: "PDF to Word · Skycally" },
      { property: "og:description", content: "Convert PDF to editable Word files." },
    ],
  }),
  component: PdfToWord,
});

function PdfToWord() {
  return <MockConvert title="PDF to Word" description="Upload a PDF and get an editable Word document." accept="application/pdf" outName={(n) => n.replace(/\.pdf$/i, ".docx")} />;
}

export function MockConvert({ title, description, accept, outName }: { title: string; description: string; accept: string; outName: (n: string) => string }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const run = () => {
    if (!file) return;
    setDone(false); setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(id); setDone(true); toast.success("Conversion complete!"); return 100; }
        return p + 10;
      });
    }, 150);
  };

  return (
    <ToolPageShell title={title} description={description}>
      {!file ? (
        <DropZone accept={accept} onFiles={(f) => { setFile(f[0]); setDone(false); setProgress(0); }} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setProgress(0); setDone(false); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>
          {progress > 0 && (
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--cyan-brand)" }} />
            </div>
          )}
          {!done ? (
            <button onClick={run} disabled={progress > 0 && progress < 100} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">
              {progress === 0 ? "Convert" : "Converting..."}
            </button>
          ) : (
            <a href="#" onClick={(e) => e.preventDefault()} download className="block w-full text-center rounded-xl bg-foreground text-background font-semibold py-3">Download {outName(file.name)}</a>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
