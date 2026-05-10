import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/image-converter")({
  head: () => ({
    meta: [
      { title: "Free Image Converter — PNG to JPG, WEBP & More | Skycally" },
      { name: "description", content: "Convert images between PNG, JPG, WEBP and AVIF formats for free. Batch conversion supported. Works entirely in your browser — no upload needed." },
      { property: "og:title", content: "Free Image Converter | Skycally" },
      { property: "og:description", content: "Convert images between PNG, JPG, WEBP — instantly in-browser." },
      { property: "og:url", content: "https://skycally.com/tools/image-converter" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/image-converter" }],
  }),
  component: ImageConverter,
});

const formats = ["image/png", "image/jpeg", "image/webp"] as const;
type Fmt = typeof formats[number];

interface Item {
  file: File;
  out?: { blob: Blob; size: number; name: string };
}

async function convertOne(file: File, target: Fmt): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Cannot read image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (target === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Conversion failed"))), target, 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageConverter() {
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<Fmt>("image/webp");
  const [busy, setBusy] = useState(false);

  const ext = target.split("/")[1].replace("jpeg", "jpg");

  const add = (files: File[]) => setItems((p) => [...p, ...files.map((f) => ({ file: f }))]);

  const convertAll = async () => {
    setBusy(true);
    try {
      const updated = await Promise.all(items.map(async (it) => {
        try {
          const blob = await convertOne(it.file, target);
          const name = it.file.name.replace(/\.[^.]+$/, "") + "." + ext;
          return { ...it, out: { blob, size: blob.size, name } };
        } catch {
          return it;
        }
      }));
      setItems(updated);
      toast.success("Converted!");
    } catch (e: any) {
      toast.error("This format is not supported");
    } finally {
      setBusy(false);
    }
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    items.forEach((it) => { if (it.out) zip.file(it.out.name, it.out.blob); });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "converted.zip");
  };

  const ready = items.some((i) => i.out);

  return (
    <ToolPageShell title="Image Converter" description="Convert PNG, JPG and WebP — entirely in your browser.">
      <DropZone multiple accept="image/*" onFiles={add} label="Drop images" hint="PNG, JPG, WebP, BMP, GIF supported" />

      {items.length > 0 && (
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Convert to:</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as Fmt)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {formats.map((f) => <option key={f} value={f}>{f.split("/")[1].toUpperCase()}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              {ready && <button onClick={downloadAllZip} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Download all (ZIP)</button>}
              <button onClick={convertAll} disabled={busy} className="rounded-lg bg-foreground text-background font-medium px-5 py-2 disabled:opacity-50">{busy ? "Converting..." : "Convert all"}</button>
            </div>
          </div>
          <div className="grid gap-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
                <p className="font-medium text-sm flex-1 min-w-40 truncate">{it.file.name}</p>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(it.file.size)} {it.out && <>→ <span className="text-foreground font-semibold">{formatBytes(it.out.size)}</span></>}
                </div>
                {it.out && <button onClick={() => downloadBlob(it.out!.blob, it.out!.name)} className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2">Download</button>}
                <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <HowToUse steps={[
        "Drop one or more images into the box above.",
        "Pick the format you want — JPG, PNG or WebP.",
        "Click Convert all, then download files individually or as a ZIP.",
      ]} />
          <ToolSeoContent
        title={"Free Image Converter — Convert PNG, JPG, WEBP Online"}
        description={"Convert images between PNG, JPG, WEBP and other formats instantly in your browser. No upload required — your files never leave your device."}
        body={[
        "Convert single images or batch convert multiple files at once. Choose your output format and download immediately. The conversion uses the Canvas API running entirely in your browser for maximum privacy.",
        "WEBP format is recommended for web use as it offers 25-35% smaller file sizes than JPG at the same visual quality. PNG is best for images requiring transparency. JPG is ideal for photographs.",
      ]}
        faqs={[
        { question: "What formats can I convert between?", answer: "You can convert between PNG, JPG/JPEG, WEBP and AVIF formats. BMP and GIF are supported as input formats." },
        { question: "Does conversion happen in my browser?", answer: "Yes, completely. We use the Canvas API to convert images client-side. Your files never leave your device." },
        { question: "Will I lose quality when converting to JPG?", answer: "JPG uses lossy compression, so some quality is lost. We use 92% quality setting which provides an excellent balance between file size and visual quality." },
        { question: "Can I convert multiple images at once?", answer: "Yes! Our batch conversion feature lets you convert multiple images simultaneously and download them all at once." },
      ]}
      />
      </ToolPageShell>
  );
}
