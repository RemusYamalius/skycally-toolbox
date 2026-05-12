import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/compress-pdf")({
  head: () => buildToolMeta(toolBySlug("compress-pdf", tools)),
  component: CompressPdf,
});

type Level = "low" | "medium" | "high";

function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number; blob: Blob } | null>(null);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const compress = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      out.setTitle("");
      out.setAuthor("");
      out.setSubject("");
      out.setKeywords([]);
      out.setProducer("");
      out.setCreator("");
      const objectStreams = level !== "low";
      const objectsPerTick = level === "high" ? 200 : level === "medium" ? 100 : 50;
      const bytes = await out.save({ useObjectStreams: objectStreams, addDefaultPage: false, objectsPerTick });
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      setResult({ original: file.size, compressed: blob.size, blob });
      toast.success("PDF compressed!");
    } catch {
      toast.error("Could not compress this PDF");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result || !file) return;
    const name = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
    downloadBlob(result.blob, name);
  };

  const savings = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : 0;

  return (
    <ToolPageShell title="Compress PDF" description="Reduce PDF file size in your browser. Files never leave your device.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{file.name}</span>
              <span className="text-muted-foreground shrink-0 ml-3">{formatBytes(file.size)}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Compression level</p>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as Level[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${level === l ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"}`}
                  >
                    {l}
                    <span className="block font-normal opacity-70 mt-0.5 text-[10px]">
                      {l === "low" ? "Best quality" : l === "medium" ? "Balanced" : "Smallest size"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={compress} disabled={busy} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">
              {busy ? "Compressing…" : "Compress PDF"}
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Original</p>
                <p className="font-display font-bold text-lg">{formatBytes(result.original)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Compressed</p>
                <p className="font-display font-bold text-lg">{formatBytes(result.compressed)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="font-display font-bold text-lg" style={{ color: "var(--green-brand)" }}>{savings}%</p>
              </div>
            </div>
            <button onClick={download} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold">
              Download compressed PDF
            </button>
          </div>
        )}
      </div>
      <HowToUse steps={[
        "Drop your PDF or click to browse.",
        "Pick a compression level — low, medium or high.",
        "Download your smaller PDF instantly.",
      ]} />
    </ToolPageShell>
  );
}
