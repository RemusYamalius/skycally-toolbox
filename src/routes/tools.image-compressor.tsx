import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";

export const Route = createFileRoute("/tools/image-compressor")({
  head: () => ({
    meta: [
      { title: "Image Compressor — Shrink images instantly · Skycally" },
      { name: "description", content: "Compress JPG, PNG and WebP images. See before/after sizes and download in one click." },
      { property: "og:title", content: "Image Compressor · Skycally" },
      { property: "og:description", content: "Drop images, set quality, save bytes." },
    ],
  }),
  component: Compressor,
});

interface Item { file: File; out?: { url: string; size: number; name: string } }

function Compressor() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [busy, setBusy] = useState(false);

  const add = (files: File[]) => setItems((prev) => [...prev, ...files.map((f) => ({ file: f }))]);

  const compress = async () => {
    setBusy(true);
    const updated = await Promise.all(items.map(async (it) => {
      const img = await createImageBitmap(it.file);
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
      const name = it.file.name.replace(/\.[^.]+$/, "") + "-min.jpg";
      return { ...it, out: { url: URL.createObjectURL(blob), size: blob.size, name } };
    }));
    setItems(updated);
    setBusy(false);
    toast.success("Compressed all images");
  };

  return (
    <ToolPageShell title="Image Compressor" description="Drop your images, choose a quality and watch them shrink.">
      <DropZone multiple accept="image/*" onFiles={add} label="Drop images" hint="Add as many as you like" />

      {items.length > 0 && (
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center gap-5">
            <label className="text-sm font-semibold">Quality: {Math.round(quality * 100)}%</label>
            <input type="range" min={10} max={100} value={quality * 100} onChange={(e) => setQuality(Number(e.target.value) / 100)} className="flex-1 min-w-40 accent-[var(--cyan-brand)]" />
            <button onClick={compress} disabled={busy} className="rounded-lg bg-foreground text-background font-medium px-5 py-2 disabled:opacity-50">{busy ? "Compressing..." : "Compress all"}</button>
          </div>

          <div className="grid gap-3">
            {items.map((it, i) => {
              const saved = it.out ? Math.max(0, Math.round((1 - it.out.size / it.file.size) * 100)) : null;
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
                  <p className="font-medium text-sm flex-1 min-w-40 truncate">{it.file.name}</p>
                  <div className="text-xs text-muted-foreground">{formatBytes(it.file.size)} {it.out && <>→ <span className="text-foreground font-semibold">{formatBytes(it.out.size)}</span></>}</div>
                  {saved !== null && <span className="rounded-full bg-[color-mix(in_oklab,var(--green-brand)_18%,transparent)] text-[color:var(--green-brand)] text-xs font-bold px-2.5 py-1">-{saved}%</span>}
                  {it.out && <a href={it.out.url} download={it.out.name} className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2">Download</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
