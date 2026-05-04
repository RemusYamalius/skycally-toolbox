import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/image-converter")({
  head: () => ({
    meta: [
      { title: "Image Converter — PNG, JPG, WebP, AVIF · Skycally" },
      { name: "description", content: "Convert images between PNG, JPG, WebP and AVIF — right in your browser." },
      { property: "og:title", content: "Image Converter · Skycally" },
      { property: "og:description", content: "Convert images between popular formats instantly." },
    ],
  }),
  component: ImageConverter,
});

const formats = ["image/png", "image/jpeg", "image/webp"] as const;

function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<typeof formats[number]>("image/webp");
  const [out, setOut] = useState<{ url: string; size: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), target, 0.92));
      const ext = target.split("/")[1].replace("jpeg", "jpg");
      const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
      setOut({ url: URL.createObjectURL(blob), size: blob.size, name });
      toast.success("Converted!");
    } catch (e: any) {
      toast.error("Conversion failed");
    } finally { setBusy(false); }
  };

  return (
    <ToolPageShell title="Image Converter" description="Convert PNG, JPG, WebP and AVIF — entirely in your browser.">
      {!file ? (
        <DropZone accept="image/*" onFiles={(f) => { setFile(f[0]); setOut(null); }} label="Drop an image" hint="PNG, JPG, WebP supported" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setOut(null); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Convert to:</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as any)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {formats.map((f) => <option key={f} value={f}>{f.split("/")[1].toUpperCase()}</option>)}
            </select>
            <button onClick={convert} disabled={busy} className="ml-auto rounded-lg bg-foreground text-background font-medium px-5 py-2 disabled:opacity-50">{busy ? "Converting..." : "Convert"}</button>
          </div>
          {out && (
            <div className="rounded-xl border border-border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{out.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(out.size)}</p>
              </div>
              <a href={out.url} download={out.name} className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2">Download</a>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
