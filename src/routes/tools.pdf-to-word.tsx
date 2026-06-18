import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { FileOutput, FileText, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/pdf-to-word")({
  head: () => buildToolMeta(toolBySlug("pdf-to-word", tools)),
  component: PdfToWordPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

interface LineGroup {
  y: number;
  items: TextItem[];
}

// ─── Text extraction helpers ──────────────────────────────────────────────────

/**
 * Groups raw PDF text items into visual lines using a dynamic Y-threshold.
 * The threshold adapts to the font size of each item (item.height),
 * which prevents tiny superscripts / footnotes from splitting lines
 * and large headlines from accidentally merging with body text.
 */
function groupIntoLines(items: TextItem[]): LineGroup[] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords: Y=0 is bottom), then X ascending
  const sorted = [...items].sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    return Math.abs(dy) > 0.5 ? dy : a.transform[4] - b.transform[4];
  });

  const groups: LineGroup[] = [];
  let current: LineGroup = { y: sorted[0].transform[5], items: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const y = item.transform[5];
    // Dynamic threshold: half the typical font height (min 4px, max 16px)
    const lastItem = current.items[current.items.length - 1];
    const threshold = Math.min(16, Math.max(4, (lastItem.height || 10) * 0.6));

    if (Math.abs(y - current.y) <= threshold) {
      current.items.push(item);
    } else {
      groups.push(current);
      current = { y, items: [item] };
    }
  }
  groups.push(current);
  return groups;
}

/**
 * Renders a line group to a string, inserting spaces proportional to
 * the X gap between consecutive items so columns don't get merged.
 */
function lineToString(group: LineGroup): string {
  // Sort items left to right
  const items = [...group.items].sort((a, b) => a.transform[4] - b.transform[4]);
  let out = "";
  let lastEnd = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = item.transform[4];

    if (i > 0 && x > lastEnd + 4) {
      // Large gap between items → likely a column separator
      out += "  ";
    }
    out += item.str;
    if (item.hasEOL) out += " ";
    lastEnd = x + (item.width || 0);
  }
  return out.trim();
}

/**
 * Detects whether a line looks like a heading:
 * - short (< 80 chars), AND
 * - the items are significantly larger or bolder than a reference size
 */
function isHeading(group: LineGroup, bodySize: number): boolean {
  if (!group.items.length) return false;
  const text = lineToString(group);
  if (text.length > 100 || text.length < 2) return false;
  const avgHeight = group.items.reduce((s, it) => s + (it.height || 0), 0) / group.items.length;
  return avgHeight > bodySize * 1.4;
}

/**
 * Determines the most common font height on the page — used as the body baseline.
 */
function getBodyFontSize(items: TextItem[]): number {
  const freq: Record<number, number> = {};
  for (const it of items) {
    const h = Math.round(it.height || 0);
    if (h > 0) freq[h] = (freq[h] ?? 0) + 1;
  }
  let best = 10;
  let bestCount = 0;
  for (const [h, count] of Object.entries(freq)) {
    if (count > bestCount) {
      bestCount = count;
      best = Number(h);
    }
  }
  return best;
}

/**
 * Naïve table detection:
 * A group of consecutive lines where each line contains 2+ "cells"
 * separated by ≥ 3 spaces is treated as a table row.
 */
function detectTableRows(lines: string[]): boolean[] {
  return lines.map((l) => /\s{3,}/.test(l) && l.split(/\s{3,}/).length >= 2);
}

// ─── Main component ───────────────────────────────────────────────────────────
type ConvertStatus = "idle" | "reading" | "converting" | "done" | "error";

function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConvertStatus>("idle");
  const [progress, setProgress] = useState(0); // 0-100
  const [pageCount, setPageCount] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setPageCount(0);
    setWarning(null);
    abortRef.current = false;
  };

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file (.pdf)");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("File too large — max 50 MB");
      return;
    }
    setFile(f);
    setStatus("idle");
    setProgress(0);
    setWarning(null);
  };

  const convert = async () => {
    if (!file) return;
    abortRef.current = false;
    setStatus("reading");
    setProgress(0);
    setWarning(null);

    try {
      // ── Load pdf.js ──
      const pdfjsLib: any = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const total: number = pdf.numPages;
      setPageCount(total);
      setStatus("converting");

      // ── Load docx ──
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        HeadingLevel,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
        AlignmentType,
      } = await import("docx");

      // Warnings
      const warnings: string[] = [];
      let hasImages = false;
      let hasComplexLayout = false;

      const sections: any[] = [];

      for (let i = 1; i <= total; i++) {
        if (abortRef.current) break;
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = content.items as TextItem[];

        // Check for images (operatorList has paintImage ops)
        if (!hasImages) {
          try {
            const ops = await page.getOperatorList();
            if (ops.fnArray.some((fn: number) => fn === pdfjsLib.OPS?.paintImageXObject || fn === 85)) {
              hasImages = true;
            }
          } catch {
            /* skip */
          }
        }

        if (items.length === 0) {
          // Likely a scanned page
          hasComplexLayout = true;
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Page ${i} — no selectable text (possibly scanned)]`,
                  italics: true,
                  color: "888888",
                }),
              ],
            }),
          );
          setProgress(Math.round((i / total) * 100));
          continue;
        }

        const bodySize = getBodyFontSize(items);
        const lineGroups = groupIntoLines(items);
        const lineStrings = lineGroups.map(lineToString).filter((l) => l.length > 0);
        const tableFlags = detectTableRows(lineStrings);

        // Page separator
        if (i > 1) {
          sections.push(
            new Paragraph({
              pageBreakBefore: true,
              children: [new TextRun({ text: `Page ${i}`, bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
            }),
          );
        } else {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: `Page ${i}`, bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
            }),
          );
        }

        // Process lines
        let tableBuffer: string[] = [];

        const flushTable = () => {
          if (tableBuffer.length < 2) {
            tableBuffer.forEach((row) => {
              sections.push(new Paragraph({ children: [new TextRun(row)] }));
            });
            tableBuffer = [];
            return;
          }
          const rows = tableBuffer.map((row) => {
            const cells = row.split(/\s{3,}/);
            return new TableRow({
              children: cells.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun(cell.trim())] })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    },
                  }),
              ),
            });
          });
          sections.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          );
          tableBuffer = [];
        };

        lineGroups.forEach((group, idx) => {
          const text = lineStrings[idx];
          if (!text) return;

          if (tableFlags[idx]) {
            tableBuffer.push(text);
          } else {
            if (tableBuffer.length > 0) flushTable();

            if (isHeading(group, bodySize)) {
              sections.push(
                new Paragraph({
                  heading: HeadingLevel.HEADING_3,
                  children: [new TextRun({ text, bold: true })],
                  spacing: { before: 160, after: 80 },
                }),
              );
            } else {
              sections.push(
                new Paragraph({
                  children: [new TextRun(text)],
                  alignment: AlignmentType.LEFT,
                  spacing: { after: 40 },
                }),
              );
            }
          }
        });
        if (tableBuffer.length > 0) flushTable();

        setProgress(Math.round((i / total) * 100));
      }

      if (abortRef.current) {
        setStatus("idle");
        return;
      }

      // Build warning message
      const warningParts: string[] = [];
      if (hasImages) warningParts.push("images are not exported");
      if (hasComplexLayout) warningParts.push("some pages had no selectable text (possibly scanned)");
      if (warningParts.length > 0) {
        setWarning(`Note: ${warningParts.join("; ")}. For scanned PDFs, try our Image to Text (OCR) tool first.`);
      }

      // Build and download docx
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 11906, height: 16838 }, // A4
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 2.54cm
              },
            },
            children: sections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const name = file.name.replace(/\.pdf$/i, "") + ".docx";
      downloadBlob(blob, name);
      setStatus("done");
      toast.success("Word document downloaded!");
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      toast.error(
        e?.message ? `Conversion failed: ${e.message}` : "Could not convert this PDF — try a different file.",
      );
    }
  };

  // ── UI ──
  const busy = status === "reading" || status === "converting";

  return (
    <ToolPageShell
      title="PDF to Word"
      description="Convert any PDF into an editable Word document — runs entirely in your browser, nothing is uploaded."
    >
      {/* Privacy badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        Your file never leaves your device — conversion runs 100% in the browser.
      </div>

      <div className="space-y-4">
        {/* Drop zone */}
        {!file && (
          <DropZone
            accept="application/pdf"
            onFiles={onFiles}
            label="Drop a PDF here"
            hint="or click to browse — max 50 MB"
          />
        )}

        {/* File card */}
        {file && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {pageCount > 0 ? ` · ${pageCount} pages` : ""}
                </p>

                {/* Progress bar */}
                {busy && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{status === "reading" ? "Reading PDF…" : `Converting page… ${progress}%`}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Warning */}
                {warning && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                )}

                {/* Done */}
                {status === "done" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conversion complete — check your downloads folder.
                  </div>
                )}
              </div>

              {/* Remove button */}
              {!busy && (
                <button
                  onClick={reset}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={convert}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Converting…
                  </>
                ) : (
                  <>
                    <FileOutput className="w-4 h-4" /> Convert to Word
                  </>
                )}
              </button>
              {busy && (
                <button
                  onClick={() => {
                    abortRef.current = true;
                    setStatus("idle");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition"
                >
                  Cancel
                </button>
              )}
              {status === "done" && (
                <button
                  onClick={() => {
                    setStatus("idle");
                    setProgress(0);
                    setWarning(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-secondary transition"
                >
                  Convert another
                </button>
              )}
            </div>
          </div>
        )}

        {/* Limitations notice */}
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> What transfers vs. what doesn't
          </p>
          <p>✅ Text content, line breaks, page structure, detected headings, simple tables</p>
          <p>⚠️ Complex multi-column layouts may merge into one column</p>
          <p>❌ Images, decorative fonts, colours, and complex vector graphics are not exported</p>
          <p>❌ Scanned / image-only PDFs require OCR — use our Image to Text tool first</p>
        </div>
      </div>

      <HowToUse
        steps={[
          "Drop your PDF onto the upload area or click to browse your files.",
          "Click Convert to Word — the conversion runs entirely in your browser, page by page.",
          "Download the .docx file and open it in Microsoft Word, Google Docs, or any word processor.",
          "If your PDF is scanned (no selectable text), run it through our Image to Text (OCR) tool first.",
        ]}
      />

      <RelatedTools currentSlug="pdf-to-word" />

      <ToolSeoContent
        title="PDF to Word Converter — Free, No Upload, No Signup"
        description="Convert PDF files to editable Word documents (.docx) instantly in your browser. No file uploads, no account needed, no watermarks. Supports text extraction, basic table detection, and automatic heading recognition."
        body={[
          "Skycally's PDF to Word converter extracts text from every page of your PDF and builds a clean, structured Word document you can open in Microsoft Word, Google Docs, LibreOffice, or any modern word processor. The converter uses an intelligent line-grouping algorithm that adapts to each page's font sizes — so headlines stay as headings, body text stays as paragraphs, and columns don't accidentally merge into garbled lines.",
          "Simple tables are automatically detected: when the converter finds text separated by large gaps (the typical PDF way of aligning columns), it reconstructs them as proper Word table rows and cells — something most free online converters skip entirely. Detected headings are formatted as Word heading styles, making the resulting document immediately navigable via the document outline.",
          "Everything runs locally using pdfjs-dist and the docx library built into the browser. Your file is never uploaded to a server, never stored, and never logged — making this tool safe for contracts, invoices, medical records, and any sensitive document you need to edit.",
        ]}
        faqs={[
          {
            question: "Will the formatting match the original PDF exactly?",
            answer:
              "Text content, line breaks, page structure, and simple tables are preserved. However, complex multi-column layouts, decorative fonts, colors, and embedded images are not exported. The output is best for editing the text content rather than exactly reproducing the original design.",
          },
          {
            question: "Does the tool support scanned PDFs?",
            answer:
              "No — scanned PDFs are images and contain no selectable text. The converter will note which pages had no text. For scanned documents, use our Image to Text (OCR) tool first to extract the text, then process it further.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer:
              "No. The entire conversion runs in your browser using pdfjs-dist and the docx library. Your file is never sent anywhere — not even to Skycally's servers.",
          },
          {
            question: "Are tables converted correctly?",
            answer:
              "Simple tables are detected automatically. When two or more text columns are separated by a large gap (as PDFs typically encode them), the converter reconstructs them as a proper Word table. Very complex nested tables or tables drawn with vector lines may not be detected.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no hard cap, but very large PDFs (over 50 MB or 200+ pages) may be slow because all processing happens in the browser's memory. For very large files, consider splitting the PDF first.",
          },
          {
            question: "Why does my converted document look different from the PDF?",
            answer:
              "PDFs store content as positioned text fragments — they don't have concepts like paragraphs, headings, or tables. Converting them requires reconstructing that structure from position data, which is imperfect for complex layouts. The result is always editable text, but may need some manual tidying for heavily designed PDFs.",
          },
          {
            question: "What Word format is the output?",
            answer:
              "The output is a .docx file (Office Open XML) — the standard Microsoft Word format since 2007. It opens in Word 2007+, Google Docs, LibreOffice, Pages, and any other modern word processor.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
