import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/delete-pdf-pages")({
  head: () => buildToolMeta(toolBySlug("delete-pdf-pages", tools)),
  component: DeletePdfPagesPage,
});

interface Thumb { num: number; url: string }

function DeletePdfPagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    thumbs.forEach((t) => URL.revokeObjectURL(t.url));
    setThumbs([]);
    setSelected(new Set());
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
    } catch {
      toast.error("Could not read this PDF");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const save = async () => {
    if (!file || selected.size === 0) return;
    if (selected.size >= thumbs.length) {
      toast.error("You can't delete every page");
      return;
    }
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const keepIndices: number[] = [];
      for (let i = 0; i < src.getPageCount(); i++) {
        if (!selected.has(i + 1)) keepIndices.push(i);
      }
      const copied = await out.copyPages(src, keepIndices);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-trimmed.pdf";
      downloadBlob(blob, name);
      toast.success("Updated PDF ready!");
    } catch {
      toast.error("Could not update this PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Delete PDF Pages" description="Pick the pages you want to remove from any PDF, then download the trimmed result.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {loading && <p className="text-sm text-muted-foreground text-center">Rendering thumbnails…</p>}

        {thumbs.length > 0 && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">{selected.size} of {thumbs.length} selected</span>
              <button onClick={() => setSelected(new Set(thumbs.map((t) => t.num)))} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary">Select all</button>
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary">Clear</button>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {thumbs.map((t) => {
                const isSel = selected.has(t.num);
                return (
                  <button
                    key={t.num}
                    onClick={() => toggle(t.num)}
                    className={`group rounded-xl border bg-card overflow-hidden transition relative ${isSel ? "border-red-500 ring-2 ring-red-500/40" : "border-border hover:border-foreground/40"}`}
                  >
                    <div className="aspect-[3/4] flex items-center justify-center bg-secondary/30 overflow-hidden">
                      <img src={t.url} alt={`Page ${t.num}`} className={`max-w-full max-h-full object-contain transition ${isSel ? "opacity-40" : ""}`} />
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-md border border-border bg-background/90 flex items-center justify-center">
                      {isSel && <Check className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="p-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Page {t.num}</span>
                      {isSel && <span className="font-semibold text-red-500">Delete</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={save} disabled={busy || selected.size === 0} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> {busy ? "Saving…" : `Delete selected & download (${selected.size})`}
            </button>
          </>
        )}
      </div>

      <HowToUse steps={[
        "Upload your PDF and wait for page previews to load.",
        "Check the pages you want to remove.",
        "Click Delete Selected and download your updated PDF.",
      ]} />
      <RelatedTools currentSlug="delete-pdf-pages" />
      <ToolSeoContent
        title="Delete PDF Pages — Free Online Tool"
        description="Remove unwanted pages from any PDF in seconds. Visual thumbnails, no uploads, completely private."
        body={[
          "Skycally's Delete PDF Pages tool gives you a clean, visual way to clean up your PDF files. Page previews are rendered with pdfjs-dist directly inside your browser, so you can see exactly which pages you're keeping and which ones you're cutting before you commit.",
          "When you click Delete Selected, the remaining pages are copied into a brand-new PDF using pdf-lib, preserving the original quality and formatting. Nothing is uploaded to a server — your file never leaves your device, which makes it safe for confidential documents.",
        ]}
        faqs={[
          { question: "Will the remaining pages keep their original quality?", answer: "Yes. We copy the kept pages from the original document, so quality, fonts, and embedded images are preserved." },
          { question: "Can I delete every page in the PDF?", answer: "No. At least one page must remain in the document." },
          { question: "Is my file uploaded anywhere?", answer: "No. All processing happens locally in your browser using pdf-lib and pdfjs-dist." },
          { question: "Can I undo a deletion?", answer: "Just upload your original PDF again — the original file on your device is never modified." },
        ]}
      />
    </ToolPageShell>
  );
}
