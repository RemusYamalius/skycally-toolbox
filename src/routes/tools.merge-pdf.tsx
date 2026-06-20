import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/merge-pdf")({
  head: () => buildToolMeta(toolBySlug("merge-pdf", tools)),
  component: MergePdf,
});

interface Item {
  id: string;
  file: File;
  pages?: number;
}

function Row({ item, onRemove }: { item: Item; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(item.file.size)}
          {item.pages != null && ` · ${item.pages} pages`}
        </p>
      </div>
      <button onClick={onRemove} className="p-2 rounded-lg hover:bg-secondary">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function MergePdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const totalPages = items.reduce((s, i) => s + (i.pages ?? 0), 0);

  useEffect(() => {
    items
      .filter((i) => i.pages == null)
      .forEach(async (i) => {
        try {
          const { PDFDocument } = await import("pdf-lib");
          const buf = await i.file.arrayBuffer();
          const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
          setItems((prev) => prev.map((it) => (it.id === i.id ? { ...it, pages: pdf.getPageCount() } : it)));
        } catch {
          /* ignore */
        }
      });
  }, [items]);

  const add = (files: File[]) => setItems((p) => [...p, ...files.map((f) => ({ id: crypto.randomUUID(), file: f }))]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const o = prev.findIndex((i) => i.id === active.id);
      const n = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, o, n);
    });
  };

  const merge = async () => {
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const it of items) {
        const buf = await it.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      downloadBlob(new Blob([ab], { type: "application/pdf" }), "merged.pdf");
      toast.success("Merged PDF ready!");
    } catch (e: any) {
      toast.error("Could not merge these PDFs");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Merge PDF"
      description="Combine multiple PDF files into one. Drag to reorder, then download instantly — no upload required."
    >
      <DropZone multiple accept="application/pdf" onFiles={add} />

      {items.length > 0 && (
        <div className="mt-8 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((it) => (
                <Row key={it.id} item={it} onRemove={() => setItems((p) => p.filter((x) => x.id !== it.id))} />
              ))}
            </SortableContext>
          </DndContext>
          <div className="text-xs text-muted-foreground text-center">
            Total: {totalPages} page{totalPages === 1 ? "" : "s"}
          </div>
          <button
            onClick={merge}
            disabled={busy || items.length < 2}
            className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50"
          >
            {busy ? "Merging..." : `Merge ${items.length} PDFs`}
          </button>
        </div>
      )}

      <HowToUse
        steps={[
          "Drop two or more PDF files into the upload area.",
          "Drag the rows to set the order you want the pages to appear.",
          "Click Merge — your combined PDF downloads instantly to your device.",
        ]}
      />

      <ToolSeoContent
        title="Merge PDF Files Online Free — Combine PDFs Instantly"
        description="Combine multiple PDF files into one document for free. Drag and drop to reorder pages before merging. 100% browser-based — your files never leave your device. No signup."
        body={[
          "Skycally's PDF merger combines any number of PDF files into a single document entirely in your browser using pdf-lib, a JavaScript library with no server dependency. Upload your files, drag the rows to set the page order, and click Merge — the combined PDF downloads to your device instantly. Your documents never leave your computer.",
          "The page count for each file is detected automatically and displayed next to the filename, so you always know the total number of pages in your merged document before downloading. Files can be reordered at any time by dragging and dropping, and individual files can be removed by clicking the X button.",
          "Common use cases include combining multiple scanned documents into one file, merging chapters of a report, joining invoices or receipts for expense claims, assembling a portfolio, or combining form pages that were scanned separately. The merge is lossless — all text, images, hyperlinks, fonts, and formatting are preserved exactly as in the original files.",
        ]}
        faqs={[
          {
            question: "How many PDF files can I merge at once?",
            answer:
              "There is no enforced limit on the number of files. You can merge as many PDFs as needed. For very large batches (50+ files or files totalling several hundred megabytes), processing may be slow depending on your device's memory, since everything runs locally in your browser.",
          },
          {
            question: "Will the merged PDF lose quality?",
            answer:
              "No. PDF merging is completely lossless. All text, images, vector graphics, hyperlinks, bookmarks, fonts, and formatting are preserved exactly as they appear in the original files. No re-encoding or compression is applied.",
          },
          {
            question: "Can I reorder the pages before merging?",
            answer:
              "Yes. Drag the file rows up or down to set the order in which the PDFs will appear in the merged document. The page order in each individual PDF is preserved — reordering changes which file comes first, not the internal page order within each file.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no enforced size limit. Processing happens in your browser's memory, so the practical limit depends on your device's RAM. Files up to 50 MB each work well on most computers. Very large files (100 MB+) may cause slow processing or browser warnings.",
          },
          {
            question: "Can I merge password-protected PDFs?",
            answer:
              "No. Password-protected PDFs cannot be merged directly. You need to remove the password protection first using a PDF reader (File → Save As without password, or Print → Save as PDF in most apps), then upload the unprotected version.",
          },
          {
            question: "Are my PDF files uploaded to a server?",
            answer:
              "No. All merging happens locally in your browser using pdf-lib. Your files are never uploaded, stored, or transmitted to any server. This makes it completely safe for sensitive or confidential documents.",
          },
          {
            question: "What happens to bookmarks and hyperlinks?",
            answer:
              "Internal hyperlinks within each PDF are preserved. Bookmarks (table of contents entries) from individual files may not be combined into a unified table of contents in the merged file — this depends on how the original PDFs were created.",
          },
          {
            question: "Can I merge PDFs with different page sizes?",
            answer:
              "Yes. PDFs with mixed page sizes (A4, Letter, landscape, portrait) can be merged without issue. Each page retains its original size and orientation in the merged document.",
          },
        ]}
      />

      <RelatedTools currentSlug="merge-pdf" />
    </ToolPageShell>
  );
}
