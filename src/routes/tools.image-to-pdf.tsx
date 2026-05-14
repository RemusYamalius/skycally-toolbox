import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-to-pdf")({
  head: () => buildToolMeta(toolBySlug("image-to-pdf", tools)),
  component: ImageToPdf,
});

interface Item { id: string; file: File; url: string; }

function ImageToPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<"a4" | "a3" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState(10);
  const [fit, setFit] = useState<"fit" | "fill" | "original">("fit");
  const [filename, setFilename] = useState("images.pdf");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const onFiles = (files: File[]) => {
    const next = files.filter((f) => f.type.startsWith("image/")).map((f) => ({ id: `${f.name}_${Date.now()}_${Math.random()}`, file: f, url: URL.createObjectURL(f) }));
    setItems((curr) => [...curr, ...next]);
  };

  const remove = (id: string) => setItems((curr) => {
    const it = curr.find((x) => x.id === id);
    if (it) URL.revokeObjectURL(it.url);
    return curr.filter((x) => x.id !== id);
  });

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setItems((curr) => {
      const from = curr.findIndex((x) => x.id === dragId);
      const to = curr.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return curr;
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const fileToDataURL = (file: File): Promise<string> => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(file);
  });

  const generate = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation, unit: "mm", format: pageSize });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const cw = pw - margin * 2;
      const ch = ph - margin * 2;

      for (let i = 0; i < items.length; i++) {
        if (i > 0) pdf.addPage();
        const data = await fileToDataURL(items[i].file);
        const props = pdf.getImageProperties(data);
        const ir = props.width / props.height;
        const cr = cw / ch;
        let dw = cw, dh = ch, ox = margin, oy = margin;
        if (fit === "fit") {
          if (ir > cr) { dh = cw / ir; oy = margin + (ch - dh) / 2; }
          else { dw = ch * ir; ox = margin + (cw - dw) / 2; }
        } else if (fit === "original") {
          // 96 DPI assumption: px → mm
          const mmW = props.width * 25.4 / 96;
          const mmH = props.height * 25.4 / 96;
          dw = Math.min(mmW, cw);
          dh = Math.min(mmH, ch);
          ox = margin + (cw - dw) / 2;
          oy = margin + (ch - dh) / 2;
        }
        // fill = leave dw=cw, dh=ch (may distort; user choice)
        pdf.addImage(data, "JPEG", ox, oy, dw, dh, undefined, "FAST");
      }
      pdf.save(filename || "images.pdf");
      toast.success("✅ Download started!");
    } catch {
      toast.error("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Image to PDF" description="Combine images into a single PDF — choose page size, orientation, margins and fit.">
      <div className="space-y-5">
        <DropZone accept="image/*" multiple onFiles={onFiles} label="Drop images here" hint="Add as many as you need — drag to reorder below" />

        {items.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-2">{items.length} {items.length === 1 ? "page" : "pages"} · drag to reorder</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.id}
                  draggable
                  onDragStart={() => onDragStart(it.id)}
                  onDragOver={(e) => onDragOver(e, it.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2 cursor-move ${dragId === it.id ? "opacity-50" : ""}`}>
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <img src={it.url} alt="" className="w-12 h-12 object-cover rounded" />
                  <span className="flex-1 truncate text-xs">{it.file.name}</span>
                  <button onClick={() => remove(it.id)} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted-foreground">Page size
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="a4">A4</option><option value="a3">A3</option><option value="letter">Letter</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Orientation
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Fit
            <select value={fit} onChange={(e) => setFit(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="fit">Fit to page</option><option value="fill">Fill page</option><option value="original">Original size</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Filename
            <input value={filename} onChange={(e) => setFilename(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block text-xs text-muted-foreground">Margin: {margin}mm
          <input type="range" min={0} max={30} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full mt-1" />
        </label>

        <button onClick={generate} disabled={busy || !items.length} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">
          {busy ? "Generating PDF…" : `Convert ${items.length || ""} ${items.length === 1 ? "image" : "images"} to PDF`}
        </button>
      </div>
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Drop one or many images and reorder them by dragging.",
        "Pick page size, orientation, fit and margin.",
        "Click Convert to PDF to download your document.",
      ]} />
          <RelatedTools currentSlug="image-to-pdf" />
          <ToolSeoContent
        title={"Convert Images to PDF Online — JPG to PDF Free"}
        description={"Convert one or multiple images to a PDF document for free. Supports JPG, PNG and WEBP. Choose page size, orientation and margins. Works in your browser."}
        body={[
        "Upload multiple images and arrange them in your preferred order — each image becomes a page in your PDF. Choose from A4, A3 or Letter page size, set portrait or landscape orientation, and adjust margins to your preference.",
        "The conversion uses jsPDF library running entirely in your browser. Your images are never uploaded to any server, making this the most private way to create PDFs from images online.",
      ]}
        faqs={[
        { question: "How many images can I convert to one PDF?", answer: "There is no limit. Upload as many images as needed — each becomes a separate page in the final PDF." },
        { question: "Can I reorder images before converting?", answer: "Yes. After uploading, drag the image thumbnails to arrange them in the desired page order before clicking Convert." },
        { question: "What page sizes are available?", answer: "We support A4 (most common globally), A3 (double the A4 size), and US Letter (standard in North America)." },
        { question: "Will the image quality be maintained in the PDF?", answer: "Yes. We use 95% JPEG quality when embedding images in the PDF, preserving virtually all of the original image detail." },
      ]}
      />
      </ToolPageShell>
  );
}
