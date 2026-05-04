import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { removeBg } from "@/server/removebg.functions";
import { fileToBase64, base64ToBlob, downloadBlob, checkSize } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/remove-bg")({
  head: () => ({
    meta: [
      { title: "Remove Background — One-click background eraser · Skycally" },
      { name: "description", content: "Erase image backgrounds in one click. Free, fast, no signup." },
      { property: "og:title", content: "Remove Background · Skycally" },
      { property: "og:description", content: "One-click background removal." },
    ],
  }),
  component: RemoveBgPage,
});

function RemoveBgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const onFile = (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f); setResultUrl(null); setResultBlob(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true); setResultUrl(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const { pngBase64 } = await removeBg({ data: { imageBase64, mime: file.type || "image/png" } });
      const blob = base64ToBlob(pngBase64, "image/png");
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      toast.success("Background removed!");
    } catch (e: any) {
      toast.error(e?.message || "Background removal failed");
    } finally { setBusy(false); }
  };

  const reset = () => { setFile(null); setResultUrl(null); setResultBlob(null); };

  return (
    <ToolPageShell title="Remove Background" description="Upload an image and we'll erase the background — perfectly.">
      {!file ? (
        <DropZone accept="image/*" onFiles={onFile} />
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
                {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Removing background...</span>
                  : resultUrl ? <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                  : "Awaiting result..."}
              </div>
            </div>
          </div>
          {!resultUrl ? (
            <button onClick={run} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">{busy ? "Removing..." : "Remove background"}</button>
          ) : (
            <button onClick={() => downloadBlob(resultBlob!, file.name.replace(/\.[^.]+$/, "") + "-nobg.png")} className="w-full rounded-xl bg-foreground text-background font-semibold py-3">Download PNG</button>
          )}
          <button onClick={reset} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">Use a different image</button>
          <p className="text-xs text-center text-muted-foreground">Powered by remove.bg — free plan: 50 images/month.</p>
        </div>
      )}

      <HowToUse steps={[
        "Drop a photo of a person, product or object.",
        "Click Remove background and wait a few seconds.",
        "Download the transparent PNG, ready to use anywhere.",
      ]} />
    </ToolPageShell>
  );
}
