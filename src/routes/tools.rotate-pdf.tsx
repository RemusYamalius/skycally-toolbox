import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCw } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/rotate-pdf")({
  head: () => buildToolMeta(toolBySlug("rotate-pdf", tools)),
  component: RotatePdf,
});

interface Thumb { num: number; url: string }
type Rot = 0 | 90 | 180 | 270;

function RotatePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [rotations, setRotations] = useState<Rot[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    thumbs.forEach((t) => URL.revokeObjectURL(t.url));
    setThumbs([]);
    setRotations([]);
    setLoading(true);
    try {
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const out: Thumb[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
        out.push({ num: i, url: URL.createObjectURL(blob) });
      }
      setThumbs(out);
      setRotations(out.map(() => 0 as Rot));
    } catch {
      toast.error("Could not read this PDF");
    } finally {
      setLoading(false);
    }
  };

  const rotateOne = (i: number) => {
    setRotations((prev) => prev.map((r, idx) => (idx === i ? (((r + 90) % 360) as Rot) : r)));
  };

  const applyAll = (r: Rot) => setRotations((prev) => prev.map(() => r));
  const rotateAll = () => setRotations((prev) => prev.map((r) => (((r + 90) % 360) as Rot)));

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      pages.forEach((p, i) => {
        const existing = p.getRotation().angle || 0;
        const total = (existing + (rotations[i] ?? 0)) % 360;
        p.setRotation(degrees(total));
      });
      const bytes = await pdfDoc.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-rotated.pdf";
      downloadBlob(blob, name);
      toast.success("Rotated PDF ready!");
    } catch {
      toast.error("Could not rotate this PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Rotate PDF" description="Rotate individual pages or every page in your PDF — 90°, 180° or 270°.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {loading && <p className="text-sm text-muted-foreground text-center">Rendering thumbnails…</p>}

        {thumbs.length > 0 && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">Apply to all:</span>
              {([0, 90, 180, 270] as Rot[]).map((r) => (
                <button key={r} onClick={() => applyAll(r)} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary">
                  {r}°
                </button>
              ))}
              <button onClick={rotateAll} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary">
                <RotateCw className="w-3.5 h-3.5" /> Rotate all 90°
              </button>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {thumbs.map((t, i) => (
                <button
                  key={t.num}
                  onClick={() => rotateOne(i)}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/40 transition"
                >
                  <div className="aspect-[3/4] flex items-center justify-center bg-secondary/30 overflow-hidden">
                    <img
                      src={t.url}
                      alt={`Page ${t.num}`}
                      className="max-w-full max-h-full object-contain transition-transform"
                      style={{ transform: `rotate(${rotations[i] ?? 0}deg)` }}
                    />
                  </div>
                  <div className="p-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Page {t.num}</span>
                    <span className="font-mono">{rotations[i] ?? 0}°</span>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50">
              {busy ? "Saving…" : "Apply rotations & download"}
            </button>
          </>
        )}
      </div>
      <HowToUse steps={[
        "Drop your PDF and wait for thumbnails to render.",
        "Click any page to rotate 90°, or use the apply-to-all controls.",
        "Hit Apply rotations to download your fixed PDF.",
      ]} />
    </ToolPageShell>
  );
}
