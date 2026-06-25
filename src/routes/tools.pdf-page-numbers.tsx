import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { FilePen, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-page-numbers")({
  head: () => buildToolMeta(toolBySlug("pdf-page-numbers", tools)),
  component: PdfPageNumbersPage,
});

type Pos = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-left" | "top-right";
type FontSize = 8 | 10 | 12 | 14 | 16 | 20;
type FontColor = "black" | "gray" | "white";

const POSITIONS: { value: Pos; label: string }[] = [
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const FONT_SIZES: FontSize[] = [8, 10, 12, 14, 16, 20];

const COLORS: { value: FontColor; label: string; hex: [number, number, number] }[] = [
  { value: "black", label: "Black", hex: [0, 0, 0] },
  { value: "gray", label: "Gray", hex: [0.4, 0.4, 0.4] },
  { value: "white", label: "White", hex: [1, 1, 1] },
];

function getXY(
  pos: Pos,
  pageW: number,
  pageH: number,
  textW: number,
  fontSize: number,
  margin: number,
): [number, number] {
  const isTop = pos.startsWith("top");
  const isRight = pos.endsWith("right");
  const isCenter = pos.endsWith("center");
  const x = isRight ? pageW - margin - textW : isCenter ? (pageW - textW) / 2 : margin;
  const y = isTop ? pageH - margin - fontSize : margin;
  return [x, y];
}

function PdfPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotal] = useState<number | null>(null);
  const [position, setPosition] = useState<Pos>("bottom-center");
  const [fontSize, setFontSize] = useState<FontSize>(12);
  const [color, setColor] = useState<FontColor>("black");
  const [start, setStart] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    setDone(false);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setTotal(doc.getPageCount());
    } catch {
      setTotal(null);
    }
  };

  const apply = async () => {
    if (!file) return;
    setBusy(true);
    setDone(false);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const margin = 24;
      const colorDef = COLORS.find((c) => c.value === color)!;
      const rgbColor = rgb(...(colorDef.hex as [number, number, number]));

      pdfDoc.getPages().forEach((page, i) => {
        const label = `${prefix}${start + i}`;
        const { width, height } = page.getSize();
        const textW = font.widthOfTextAtSize(label, fontSize);
        const [x, y] = getXY(position, width, height, textW, fontSize, margin);
        page.drawText(label, { x, y, size: fontSize, font, color: rgbColor });
      });

      const bytes = await pdfDoc.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      downloadBlob(blob, file.name.replace(/\.pdf$/i, "") + "-numbered.pdf");
      setDone(true);
      toast.success("Numbered PDF downloaded!");
    } catch {
      toast.error("Could not add page numbers. Please try another file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell
      title="Add Page Numbers to PDF"
      description="Stamp clean page numbers onto any PDF — customize position, size, color, prefix, and starting number."
    >
      <div className="space-y-5">
        {!file ? (
          <DropZone
            accept="application/pdf"
            onFiles={onFiles}
            label="Drop a PDF here"
            hint="or click to browse — your file never leaves your device"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <FilePen className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {totalPages && (
                    <span className="ml-2 font-semibold" style={{ color: "var(--cyan-brand)" }}>
                      · {totalPages} pages
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setTotal(null);
                setDone(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change file
            </button>
          </div>
        )}

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Position */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Pos)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Font size</label>
                <div className="grid grid-cols-6 gap-1">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={`py-2 rounded-lg border text-xs font-mono transition-all ${fontSize === s ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`py-2 rounded-lg border text-xs transition-all ${color === c.value ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting number */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Starting number
                </label>
                <input
                  type="number"
                  min={0}
                  value={start}
                  onChange={(e) => setStart(Math.max(0, parseInt(e.target.value || "1", 10)))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono"
                />
              </div>

              {/* Prefix */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Prefix (optional)
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder='e.g. "Page " or "- "'
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Preview</label>
                <div
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono"
                  style={{ color: "var(--cyan-brand)" }}
                >
                  {prefix || ""}
                  {start} … {prefix || ""}
                  {start + (totalPages ? totalPages - 1 : 2)}
                </div>
              </div>
            </div>

            {done && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">PDF with page numbers downloaded successfully!</p>
              </div>
            )}

            <button
              onClick={apply}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <FilePen className="w-4 h-4" />
              )}
              {busy ? "Adding page numbers…" : "Apply & Download"}
            </button>
          </div>
        )}
      </div>

      <AdZone id="pdf-page-numbers-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload your PDF — the total page count is shown automatically.",
          "Choose position (6 options), font size, color, starting number, and optional prefix (e.g. 'Page ').",
          "Click Apply & Download to get your numbered PDF instantly.",
        ]}
      />

      <ToolSeoContent
        title="Add Page Numbers to PDF Free — Online PDF Page Numbering Tool"
        description="Add customizable page numbers to any PDF. Choose position, font size, color, starting number, and prefix. Free, no upload, runs in your browser."
        body={[
          "Skycally's Add Page Numbers tool stamps clean, customizable page numbers onto every page of any PDF, directly in your browser. Upload your PDF, configure the numbering style, and download the result in seconds — no server upload, no account required.",
          "Six position options let you place numbers exactly where you need them: Bottom Center (most common for reports and documents), Bottom Right (classic for academic papers), Bottom Left, Top Center, Top Right, and Top Left. Font size ranges from 8pt to 20pt, with three color options: black, gray, and white for dark-background documents.",
          "A prefix field lets you add text before the number — type 'Page ' to get 'Page 1, Page 2...' or '- ' to get '- 1 -, - 2 -'. A live preview shows exactly how your numbering will look before you apply it. The starting number can be set to any value — useful for documents that continue from a previous section or for skipping a cover page.",
          "All processing runs locally using pdf-lib, a JavaScript PDF manipulation library. Your document is never uploaded to any server, making this tool safe for confidential documents such as contracts, theses, medical reports, and legal documents.",
        ]}
        faqs={[
          {
            question: "Can I start numbering from a number other than 1?",
            answer:
              "Yes. Set any starting number — useful for continuing from a previous document section or skipping a cover page that shouldn't be numbered.",
          },
          {
            question: "Can I add a prefix like 'Page' before each number?",
            answer:
              "Yes. The prefix field lets you add any text before the number. Type 'Page ' (with a space) to get 'Page 1', 'Page 2', etc.",
          },
          {
            question: "What positions are available?",
            answer: "Six positions: Bottom Center, Bottom Right, Bottom Left, Top Center, Top Right, and Top Left.",
          },
          {
            question: "Can I choose the font color?",
            answer: "Yes — black, gray, or white. White is useful for PDFs with dark-colored page backgrounds.",
          },
          {
            question: "Does this work with encrypted PDFs?",
            answer:
              "The tool uses pdf-lib's ignoreEncryption flag, which works for most restricted PDFs. Heavily encrypted PDFs may fail to load.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. Everything runs locally in your browser using pdf-lib. Your file never leaves your device.",
          },
          {
            question: "Will the existing content be affected?",
            answer:
              "No. Page numbers are drawn on top of existing content. All original text, images, and formatting are preserved.",
          },
          {
            question: "Is there a page limit?",
            answer: "No enforced limit. Very large PDFs may take a few extra seconds depending on your device's CPU.",
          },
        ]}
      />

      <RelatedTools currentSlug="pdf-page-numbers" />
    </ToolPageShell>
  );
}
