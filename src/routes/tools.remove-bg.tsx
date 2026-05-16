import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { removeBackground } from "@/services/removeBg";
import { downloadBlob, checkSize } from "@/lib/file-utils";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/remove-bg")({
  head: () => buildToolMeta(toolBySlug("remove-bg", tools)),
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
      const blob = await removeBackground(file);
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
            <button onClick={run} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">{busy ? "Processing (may take ~15s)..." : "Remove background"}</button>
          ) : (
            <button onClick={() => downloadBlob(resultBlob!, file.name.replace(/\.[^.]+$/, "") + "-nobg.png")} className="w-full rounded-xl bg-foreground text-background font-semibold py-3">Download PNG</button>
          )}
          <button onClick={reset} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">Use a different image</button>
        </div>
      )}

      <HowToUse steps={[
        "Drop a photo of a person, product or object.",
        "Click Remove background and wait a few seconds.",
        "Download the transparent PNG, ready to use anywhere.",
      ]} />
          <RelatedTools currentSlug="remove-bg" />
          <ToolSeoContent
        title="Free Background Remover — AI-Powered Image Cutout"
        description="Skycally's Background Remover uses AI to automatically detect and remove the background from any image in seconds. It's ideal for product photos, profile pictures, and creative projects. The result is a transparent PNG ready to use anywhere."
        body={[]}
        faqs={[{"question":"What types of images work best?","answer":"The tool works best with images where the subject is clearly distinct from the background, such as portraits and product photos."},{"question":"Does it work on complex backgrounds?","answer":"Yes, the AI handles most backgrounds including gradients, textures, and busy scenes."},{"question":"What format is the output?","answer":"The result is always a transparent PNG file."},{"question":"Is my image uploaded to a server?","answer":"Yes, processing is handled securely on our server and your file is deleted immediately after processing."},{"question":"Can I remove backgrounds from multiple images?","answer":"Currently the tool processes one image at a time."}]}
      />
    </ToolPageShell>
  );
}
