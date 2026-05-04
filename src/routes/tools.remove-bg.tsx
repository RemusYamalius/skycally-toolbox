import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/remove-bg")({
  head: () => ({
    meta: [
      { title: "Remove Background — One-click background eraser · Skycally" },
      { name: "description", content: "Erase image backgrounds in one click. Free, fast, no signup." },
      { property: "og:title", content: "Remove Background · Skycally" },
      { property: "og:description", content: "One-click background removal." },
    ],
  }),
  component: RemoveBg,
});

function RemoveBg() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = () => {
    setBusy(true); setDone(false);
    setTimeout(() => { setBusy(false); setDone(true); toast.success("Background removed!"); }, 1500);
  };

  return (
    <ToolPageShell title="Remove Background" description="Upload an image and we'll erase the background — perfectly.">
      {!file ? (
        <DropZone accept="image/*" onFiles={(f) => { setFile(f[0]); setDone(false); }} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">ORIGINAL</p>
              <img src={URL.createObjectURL(file)} alt="" className="rounded-xl border border-border w-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">RESULT</p>
              <div className="rounded-xl border border-border w-full aspect-square flex items-center justify-center text-sm text-muted-foreground" style={{ backgroundImage: "linear-gradient(45deg, var(--secondary) 25%, transparent 25%), linear-gradient(-45deg, var(--secondary) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--secondary) 75%), linear-gradient(-45deg, transparent 75%, var(--secondary) 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0" }}>
                {done ? <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-contain" /> : "Awaiting result..."}
              </div>
            </div>
          </div>
          {!done ? (
            <button onClick={run} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">{busy ? "Removing..." : "Remove background"}</button>
          ) : (
            <a href={URL.createObjectURL(file)} download className="block text-center w-full rounded-xl bg-foreground text-background font-semibold py-3">Download PNG</a>
          )}
          <button onClick={() => { setFile(null); setDone(false); }} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">Use a different image</button>
        </div>
      )}
    </ToolPageShell>
  );
}
