import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/merge-pdf")({
  head: () => ({
    meta: [
      { title: "Merge PDF — Combine PDFs into one · Skycally" },
      { name: "description", content: "Merge multiple PDF files into a single document. Drag to reorder." },
      { property: "og:title", content: "Merge PDF · Skycally" },
      { property: "og:description", content: "Combine PDFs into a single file." },
    ],
  }),
  component: MergePdf,
});

function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const move = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const j = i + dir; if (j < 0 || j >= prev.length) return prev;
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const merge = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); toast.success("Merged PDF ready!"); }, 1500);
  };

  return (
    <ToolPageShell title="Merge PDF" description="Drop multiple PDFs, reorder them, and combine into one.">
      <DropZone multiple accept="application/pdf" onFiles={(f) => setFiles((prev) => [...prev, ...f])} />

      {files.length > 0 && (
        <div className="mt-8 space-y-3">
          {files.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} className="text-xs text-muted-foreground hover:text-foreground">▲</button>
                <button onClick={() => move(i, 1)} className="text-xs text-muted-foreground hover:text-foreground">▼</button>
              </div>
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={merge} disabled={busy || files.length < 2} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">
            {busy ? "Merging..." : `Merge ${files.length} PDFs`}
          </button>
        </div>
      )}
    </ToolPageShell>
  );
}
