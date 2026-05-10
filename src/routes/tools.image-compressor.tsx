import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/image-compressor")({
  head: () => ({
    meta: [
      { title: "Free Image Compressor — Reduce Image Size Online | Skycally" },
      { name: "description", content: "Compress images without losing quality. Reduce PNG, JPG and WEBP file size online for free. Batch compression with ZIP download." },
      { property: "og:title", content: "Free Image Compressor | Skycally" },
      { property: "og:description", content: "Drop images, set quality, save bytes." },
      { property: "og:url", content: "https://skycally.com/tools/image-compressor" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/image-compressor" }],
  }),
  component: Compressor,
});

interface Item { file: File; out?: { blob: Blob; size: number; name: string } }

function Compressor() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(80);
  const [busy, setBusy] = useState(false);

  const add = (files: File[]) => setItems((p) => [...p, ...files.map((f) => ({ file: f }))]);

  const run = async () => {
    setBusy(true);
    try {
      const updated = await Promise.all(items.map(async (it) => {
        try {
          const compressed = await imageCompression(it.file, {
            maxSizeMB: Math.max(0.05, (it.file.size / 1024 / 1024) * (quality / 100)),
            maxWidthOrHeight: 4096,
            useWebWorker: true,
            initialQuality: quality / 100,
            fileType: it.file.type,
          });
          return { ...it, out: { blob: compressed, size: compressed.size, name: it.file.name } };
        } catch {
          return it;
        }
      }));
      setItems(updated);
      toast.success("Compressed all images");
    } catch {
      toast.error("Compression failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    items.forEach((it) => { if (it.out) zip.file(it.out.name, it.out.blob); });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "compressed.zip");
  };

  const ready = items.some((i) => i.out);

  return (
    <ToolPageShell title="Image Compressor" description="Drop your images, choose a quality and watch them shrink.">
      <DropZone multiple accept="image/*" onFiles={add} label="Drop images" hint="Add as many as you like" />

      {items.length > 0 && (
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center gap-5">
            <label className="text-sm font-semibold">Quality: {quality}%</label>
            <input type="range" min={10} max={95} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 min-w-40 accent-[var(--cyan-brand)]" />
            <div className="flex gap-2">
              {ready && <button onClick={downloadZip} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Download all (ZIP)</button>}
              <button onClick={run} disabled={busy} className="rounded-lg bg-foreground text-background font-medium px-5 py-2 disabled:opacity-50">{busy ? "Compressing..." : "Compress all"}</button>
            </div>
          </div>

          <div className="grid gap-3">
            {items.map((it, i) => {
              const saved = it.out ? Math.max(0, Math.round((1 - it.out.size / it.file.size) * 100)) : null;
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
                  <p className="font-medium text-sm flex-1 min-w-40 truncate">{it.file.name}</p>
                  <div className="text-xs text-muted-foreground">{formatBytes(it.file.size)} {it.out && <>→ <span className="text-foreground font-semibold">{formatBytes(it.out.size)}</span></>}</div>
                  {saved !== null && <span className="rounded-full bg-[color-mix(in_oklab,var(--green-brand)_18%,transparent)] text-[color:var(--green-brand)] text-xs font-bold px-2.5 py-1">-{saved}%</span>}
                  {it.out && <button onClick={() => downloadBlob(it.out!.blob, it.out!.name)} className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2">Download</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HowToUse steps={[
        "Drop one or more images into the box.",
        "Drag the quality slider — lower means smaller files.",
        "Hit Compress all, then download each file or grab the ZIP.",
      ]} />
    </ToolPageShell>
  );
}
