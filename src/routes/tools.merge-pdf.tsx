import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/merge-pdf")({
  head: () => buildToolMeta(toolBySlug("merge-pdf", tools)), => i.pages == null).forEach(async (i) => {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const buf = await i.file.arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        setItems((prev) => prev.map((it) => it.id === i.id ? { ...it, pages: pdf.getPageCount() } : it));
      } catch { /* ignore */ }
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
    } finally { setBusy(false); }
  };

  return (
    <ToolPageShell title="Merge PDF" description="Drop multiple PDFs, reorder them, and combine into one.">
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
          <div className="text-xs text-muted-foreground text-center">Total: {totalPages} page{totalPages === 1 ? "" : "s"}</div>
          <button onClick={merge} disabled={busy || items.length < 2} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">
            {busy ? "Merging..." : `Merge ${items.length} PDFs`}
          </button>
        </div>
      )}

      <HowToUse steps={[
        "Drop two or more PDF files.",
        "Drag the rows to set the order you want.",
        "Click Merge — your single combined PDF downloads instantly.",
      ]} />
          <ToolSeoContent
        title={"Merge PDF Files Online Free — Combine PDFs Instantly"}
        description={"Combine multiple PDF files into one document for free. Drag and drop to reorder pages. 100% browser-based — your files never leave your device."}
        body={[
        "Upload two or more PDF files, arrange them in your preferred order by dragging the thumbnails, and merge them into a single PDF with one click. The merged file downloads automatically to your device.",
        "PDF merging uses pdf-lib — a JavaScript library that runs entirely in your browser. Your sensitive documents are never uploaded to any server, making this the most private PDF merger available online.",
      ]}
        faqs={[
        { question: "How many PDFs can I merge at once?", answer: "There is no limit. Upload as many PDF files as needed and arrange them in any order." },
        { question: "Will the merged PDF lose quality?", answer: "No. PDF merging is completely lossless — all text, images, links, fonts and formatting are preserved exactly as in the original files." },
        { question: "Is there a file size limit?", answer: "Since merging happens in your browser, the limit depends on your device's memory. Files up to 50MB each work well on most computers." },
        { question: "Can I merge password-protected PDFs?", answer: "No. You need to remove the password protection first before merging. Most PDF readers allow you to save a copy without password." },
      ]}
      />
      </ToolPageShell>
  );
}
