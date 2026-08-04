import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Table as TableIcon,
  AlignLeft,
  FileCode,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Copy,
  RefreshCw,
  Info,
  X,
  Download,
} from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tools/file-viewer")({
  head: () => buildToolMeta(toolBySlug("file-viewer", tools)),
  component: FileViewerPage,
});

// ─── Constants & types ────────────────────────────────────────────────────────
type FileKind = "docx" | "xlsx" | "pdf" | "txt" | "md" | "csv" | "unsupported";

const MAX_SIZE = 50 * 1024 * 1024;
const RTL_RE = /[\u0600-\u06FF\u0590-\u05FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const CJK_RE = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;

const KIND_META: Record<Exclude<FileKind, "unsupported">, { label: string; color: string; Icon: typeof FileText }> = {
  docx: { label: "Word Document", color: "#3b82f6", Icon: FileText },
  xlsx: { label: "Excel Spreadsheet", color: "#22c55e", Icon: TableIcon },
  pdf: { label: "PDF Document", color: "#ef4444", Icon: FileText },
  txt: { label: "Text File", color: "#94a3b8", Icon: AlignLeft },
  md: { label: "Markdown", color: "#a855f7", Icon: FileCode },
  csv: { label: "CSV", color: "#f97316", Icon: Grid3x3 },
};

interface LoadedFile {
  name: string;
  size: number;
  kind: Exclude<FileKind, "unsupported">;
}
interface DocxData {
  html: string;
  text: string;
  warnings: string[];
}
interface XlsxData {
  sheets: { name: string; html: string; text: string }[];
}
interface PdfData {
  doc: any;
  numPages: number;
}
interface TextData {
  text: string;
}
interface MdData {
  html: string;
  raw: string;
}
interface CsvData {
  rows: string[][];
  total: number;
  truncated: boolean;
  delimiter: string;
}

type ViewerState =
  | { status: "empty" }
  | { status: "loading"; name: string }
  | { status: "error"; message: string }
  | { status: "loaded"; file: LoadedFile; data: DocxData | XlsxData | PdfData | TextData | MdData | CsvData };

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function detectRTL(text: string): boolean {
  const m = text.match(new RegExp(RTL_RE.source, "g")) || [];
  return text.length > 0 && m.length > text.length * 0.2;
}
function detectCJK(text: string): boolean {
  return CJK_RE.test(text);
}

function getKind(name: string): FileKind {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "docx") return "docx";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "csv") return "csv";
  return "unsupported";
}

function stripScripts(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Detect CSV delimiter: try ; | \t then default to ,
 * Counts occurrences in the first line and picks the most frequent candidate.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

function parseCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(cur);
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else cur += ch;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function fallbackMarkdown(md: string): string {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  h = h
    .split(/\n\n+/)
    .map((p) => (/^<(h\d|ul|ol|pre|blockquote)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return h;
}

// ─── Main page ────────────────────────────────────────────────────────────────
function FileViewerPage() {
  const [state, setState] = useState<ViewerState>({ status: "empty" });
  const [sheetIdx, setSheetIdx] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [mdRaw, setMdRaw] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reset = () => {
    setState({ status: "empty" });
    setSheetIdx(0);
    setPdfPage(1);
    setPdfZoom(100);
    setMdRaw(false);
    setDrawerOpen(false);
  };

  const showError = (msg: string) => setState({ status: "error", message: msg });

  const loadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      showError("File is too large. Max 50 MB.");
      return;
    }
    if (file.size === 0) {
      showError("This file appears to be empty.");
      return;
    }

    const kind = getKind(file.name);
    if (kind === "unsupported") {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "pptx" || ext === "ppt") showError("PowerPoint support coming soon — try converting to PDF first!");
      else showError(`".${ext}" files are not supported yet. Try Word, Excel, PDF, TXT, Markdown or CSV.`);
      return;
    }

    setState({ status: "loading", name: file.name });
    const loaded: LoadedFile = { name: file.name, size: file.size, kind };

    try {
      // ── Word ──
      if (kind === "docx") {
        const buf = await file.arrayBuffer();
        const mammoth: any = await import("mammoth");
        const result = await mammoth.convertToHtml(
          { arrayBuffer: buf },
          {
            convertImage: mammoth.images.imgElement((img: any) =>
              img.read("base64").then((data: string) => ({ src: `data:${img.contentType};base64,${data}` })),
            ),
          },
        );
        const text = (await mammoth.extractRawText({ arrayBuffer: buf })).value || "";
        setState({
          status: "loaded",
          file: loaded,
          data: {
            html: stripScripts(result.value),
            text,
            warnings: (result.messages || []).map((m: any) => m.message),
          },
        });
      }

      // ── Excel ──
      else if (kind === "xlsx") {
        const buf = await file.arrayBuffer();
        const XLSX: any = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const sheets = wb.SheetNames.map((n: string) => {
          const ws = wb.Sheets[n];
          // Build HTML with proper <thead> for sticky header
          const ref = ws["!ref"] as string;
          let html = "";
          if (ref) {
            const range = XLSX.utils.decode_range(ref);
            html += "<table><thead><tr>";
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })] as any;
              html += `<th>${cell ? String(cell.v ?? "") : ""}</th>`;
            }
            html += "</tr></thead><tbody>";
            for (let r = range.s.r + 1; r <= range.e.r; r++) {
              html += "<tr>";
              for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r, c })] as any;
                const val = cell ? String(cell.v ?? "") : "";
                const isNum = cell && (cell.t === "n" || /^-?\d+(\.\d+)?$/.test(val));
                html += `<td class="${isNum ? "num" : ""}">${val}</td>`;
              }
              html += "</tr>";
            }
            html += "</tbody></table>";
          } else {
            html = stripScripts(XLSX.utils.sheet_to_html(ws, { editable: false }));
          }
          return { name: n, html: stripScripts(html), text: XLSX.utils.sheet_to_csv(ws) };
        });
        setSheetIdx(0);
        setState({ status: "loaded", file: loaded, data: { sheets } });
      }

      // ── PDF ──
      else if (kind === "pdf") {
        const buf = await file.arrayBuffer();
        const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        try {
          const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
          setPdfPage(1);
          setPdfZoom(100);
          setState({ status: "loaded", file: loaded, data: { doc, numPages: doc.numPages } });
        } catch (e: any) {
          if (e?.name === "PasswordException") showError("This PDF is password-protected. Unlock it first.");
          else showError("Could not open this PDF. " + (e?.message || ""));
        }
      }

      // ── Plain text ──
      else if (kind === "txt") {
        const text = await file.text();
        setState({ status: "loaded", file: loaded, data: { text } });
      }

      // ── Markdown ──
      else if (kind === "md") {
        const raw = await file.text();
        let html = "";
        try {
          const m: any = await import("marked");
          html = await m.parse(raw);
        } catch {
          html = fallbackMarkdown(raw);
        }
        setState({ status: "loaded", file: loaded, data: { html: stripScripts(html), raw } });
      }

      // ── CSV ──
      else if (kind === "csv") {
        const text = await file.text();
        const delimiter = detectDelimiter(text);
        const rows = parseCSV(text, delimiter);
        const truncated = rows.length > 5000;
        setState({
          status: "loaded",
          file: loaded,
          data: {
            rows: truncated ? rows.slice(0, 5000) : rows,
            total: rows.length,
            truncated,
            delimiter,
          },
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      if (kind === "docx") showError("This Word file appears to be corrupted or encrypted.");
      else if (kind === "xlsx") showError("This Excel file could not be read. Try saving it again in Excel.");
      else showError("Could not open this file. " + msg);
    }
  }, []);

  const onFiles = useCallback(
    (files: File[]) => {
      if (files[0]) loadFile(files[0]);
    },
    [loadFile],
  );

  // Sample files
  const loadSample = (kind: "docx" | "xlsx" | "csv") => {
    if (kind === "docx") {
      const html =
        "<h1>Sample Word Document</h1><p>This is a <strong>demo</strong> rendered by <em>Skycally File Viewer</em>. Everything runs locally in your browser — your files never leave your device.</p><h2>Features</h2><ul><li>Heading and list support</li><li>Bold and italic formatting</li><li>Tables and embedded images</li><li>RTL support for Arabic, Hebrew & Persian</li></ul><table><tr><th>Column A</th><th>Column B</th><th>Column C</th></tr><tr><td>Value 1</td><td>Value 2</td><td>Value 3</td></tr></table>";
      setState({
        status: "loaded",
        file: { name: "sample.docx", size: html.length, kind: "docx" },
        data: { html, text: "Sample Word Document\nDemo content.", warnings: [] },
      });
    } else if (kind === "xlsx") {
      const rows = [
        ["Product", "Q1", "Q2", "Q3", "Q4"],
        ["Apples", "120", "150", "180", "210"],
        ["Oranges", "80", "95", "110", "140"],
        ["Bananas", "200", "220", "260", "300"],
        ["Grapes", "60", "75", "90", "120"],
      ];
      const html =
        "<table><thead><tr>" +
        rows[0].map((c) => `<th>${c}</th>`).join("") +
        "</tr></thead><tbody>" +
        rows
          .slice(1)
          .map((r) => "<tr>" + r.map((c, i) => `<td class="${i > 0 ? "num" : ""}">${c}</td>`).join("") + "</tr>")
          .join("") +
        "</tbody></table>";
      setState({
        status: "loaded",
        file: { name: "sample.xlsx", size: 1024, kind: "xlsx" },
        data: { sheets: [{ name: "Sales", html, text: rows.map((r) => r.join(",")).join("\n") }] },
      });
      setSheetIdx(0);
    } else {
      const csv = "Name,Age,City,Score\nAlice,28,Paris,92\nBob,34,London,87\nCarlos,25,Madrid,95\nDina,31,Cairo,88";
      const rows = parseCSV(csv, ",");
      setState({
        status: "loaded",
        file: { name: "sample.csv", size: csv.length, kind: "csv" },
        data: { rows, total: rows.length, truncated: false, delimiter: "," },
      });
    }
  };

  return (
    <ToolPageShell
      title="File Viewer"
      description="Open Word, Excel, PDF, TXT, Markdown and CSV files instantly — 100% in your browser, zero uploads."
    >
      <ViewerStyles />

      {state.status === "empty" && <EmptyState onFiles={onFiles} onSample={loadSample} />}
      {state.status === "loading" && <LoadingState name={state.name} />}
      {state.status === "error" && <ErrorBanner message={state.message} onReset={reset} />}
      {state.status === "loaded" && (
        <LoadedView
          file={state.file}
          data={state.data}
          sheetIdx={sheetIdx}
          setSheetIdx={setSheetIdx}
          pdfPage={pdfPage}
          setPdfPage={setPdfPage}
          pdfZoom={pdfZoom}
          setPdfZoom={setPdfZoom}
          mdRaw={mdRaw}
          setMdRaw={setMdRaw}
          onReset={reset}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
        />
      )}

      <AdZone id="file-viewer-mid" size="728x90" />

      <HowToUse
        steps={[
          "Drop your file onto the upload area or click to browse — Word (.docx), Excel (.xlsx/.xls), PDF, TXT, Markdown and CSV are all supported.",
          "Your file opens instantly in the browser. Nothing is ever uploaded — your document never leaves your device.",
          "Navigate PDF pages, switch Excel sheets, toggle Markdown rendered/raw. Use the sidebar to zoom or copy all text.",
          "Done? Click 'Open Another File' to load a different document, or just close the tab.",
        ]}
      />

      <ToolSeoContent
        title="File Viewer — Open Word, Excel, PDF & More Free Online"
        description="View Word (.docx), Excel (.xlsx), PDF, TXT, Markdown and CSV files instantly in your browser. No upload, no account, no Microsoft Office or Adobe Reader needed. Files never leave your device."
        body={[
          "Skycally's File Viewer opens virtually any document format directly in your browser tab — no software to install, no account to create, and no file uploaded to any server. Word documents, Excel spreadsheets, PDF files, plain text, Markdown and CSV tables all open in seconds, rendered cleanly with their original formatting preserved as closely as possible. The viewer handles files up to 50 MB and works completely offline once the page has loaded.",
          "The viewer supports right-to-left languages including Arabic, Hebrew and Persian — documents written in these scripts are automatically detected and displayed correctly, with text flowing right-to-left just as intended. Chinese, Japanese and Korean documents also render correctly thanks to automatic CJK font fallbacks. CSV files with European semicolon separators, tab-delimited files, and pipe-delimited files are all detected automatically without any manual configuration.",
          "Privacy is built into the architecture: all file processing uses browser-native APIs (FileReader, ArrayBuffer, Canvas) together with the open-source libraries mammoth.js, SheetJS and pdf.js. Your file bytes never travel over the network. This makes the viewer safe for confidential contracts, medical records, financial statements, and any sensitive document you need to read quickly without risking a data leak.",
          "It's especially useful when you receive a file in a format you can't open — a .docx on a device without Word installed, an .xlsx you just need to glance at, or a PDF you want to preview before downloading a heavier desktop app. Drop the file in, read what you need, and close the tab — nothing is saved or remembered between visits.",
        ]}
        faqs={[
          {
            question: "Can I open a Word document without Microsoft Word?",
            answer:
              "Yes. Upload your .docx file and it opens instantly using the open-source mammoth.js library. Headings, bold, italic, tables, bullet lists and embedded images are all preserved.",
          },
          {
            question: "Can I view an Excel file without Excel?",
            answer:
              "Yes. .xlsx and .xls files open using SheetJS. All sheets appear as tabs you can switch between. Numbers, text and basic formatting are preserved, and numbers are right-aligned automatically. Note that Excel formulas show their calculated values, not the formula itself.",
          },
          {
            question: "Is my file uploaded to a server?",
            answer:
              "No. Everything runs entirely in your browser. The file is read directly from your device's memory using the FileReader API and never sent over the internet. You can even use the viewer offline after the page has loaded.",
          },
          {
            question: "What is the maximum file size?",
            answer:
              "The viewer accepts files up to 50 MB. Very large files may be slower to render on older devices. For PDF files larger than 50 MB, consider splitting the file first using our Split PDF tool.",
          },
          {
            question: "Does it support Arabic, Hebrew or other RTL languages?",
            answer:
              "Yes. The viewer automatically detects right-to-left scripts. When detected, the document is displayed right-to-left with correct text alignment and list direction, just as it would appear in Word or Excel.",
          },
          {
            question: "What CSV formats are supported?",
            answer:
              "The viewer automatically detects the delimiter — comma, semicolon, tab or pipe. This means European CSV files (which use semicolons) open correctly without any manual setting. Up to 5,000 rows are displayed for performance; the total row count is always shown.",
          },
          {
            question: "Can I view password-protected files?",
            answer:
              "No. Password-protected or encrypted files cannot be opened because the viewer has no way to decrypt them. Remove the password protection using the original application first.",
          },
          {
            question: "Can I copy text from the viewed file?",
            answer:
              "Yes. Use the 'Copy Text' button in the sidebar to copy the entire plain-text content to your clipboard. For PDF files, text copying is not available in the current version.",
          },
        ]}
      />

      <RelatedTools currentSlug="file-viewer" />
    </ToolPageShell>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({
  onFiles,
  onSample,
}: {
  onFiles: (f: File[]) => void;
  onSample: (k: "docx" | "xlsx" | "csv") => void;
}) {
  const badges = [
    { label: "Word", color: "#3b82f6", emoji: "📄" },
    { label: "Excel", color: "#22c55e", emoji: "📊" },
    { label: "PDF", color: "#ef4444", emoji: "📕" },
    { label: "TXT", color: "#94a3b8", emoji: "📝" },
    { label: "Markdown", color: "#a855f7", emoji: "⬇️" },
    { label: "CSV", color: "#f97316", emoji: "📋" },
  ];
  return (
    <div className="space-y-6">
      <DropZone
        accept=".docx,.xlsx,.xls,.pdf,.txt,.md,.markdown,.csv"
        onFiles={onFiles}
        label="Drop your file here"
        hint="Word, Excel, PDF, TXT, Markdown or CSV — click to browse · Max 50 MB"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {badges.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: `color-mix(in oklab, ${b.color} 40%, transparent)`,
              background: `color-mix(in oklab, ${b.color} 12%, transparent)`,
              color: b.color,
            }}
          >
            <span>{b.emoji}</span> {b.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 border border-border px-3 py-1.5">
          🔒 Your files never leave your device
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 border border-border px-3 py-1.5">
          🌐 RTL & CJK support
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 border border-border px-3 py-1.5">
          📋 Auto-detect CSV delimiter
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Try a sample →</span>
        <Button size="sm" variant="outline" onClick={() => onSample("docx")}>
          Sample Word
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSample("xlsx")}>
          Sample Excel
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSample("csv")}>
          Sample CSV
        </Button>
      </div>
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────
function LoadingState({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">
          Opening <span className="text-foreground font-medium">{name}</span>…
        </p>
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded bg-muted animate-pulse" />
        <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
        <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
      </div>
    </div>
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        borderColor: "color-mix(in oklab, #ef4444 40%, transparent)",
        background: "color-mix(in oklab, #ef4444 8%, transparent)",
      }}
    >
      <p className="font-medium" style={{ color: "#ef4444" }}>
        ⚠️ {message}
      </p>
      <Button className="mt-4" size="sm" onClick={onReset}>
        Try Another File
      </Button>
    </div>
  );
}

// ─── LoadedView ───────────────────────────────────────────────────────────────
function LoadedView(props: {
  file: LoadedFile;
  data: any;
  sheetIdx: number;
  setSheetIdx: (n: number) => void;
  pdfPage: number;
  setPdfPage: (n: number) => void;
  pdfZoom: number;
  setPdfZoom: (n: number) => void;
  mdRaw: boolean;
  setMdRaw: (v: boolean) => void;
  onReset: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}) {
  const {
    file,
    data,
    sheetIdx,
    setSheetIdx,
    pdfPage,
    setPdfPage,
    pdfZoom,
    setPdfZoom,
    mdRaw,
    setMdRaw,
    onReset,
    drawerOpen,
    setDrawerOpen,
  } = props;

  const plainText = useMemo(() => {
    if (file.kind === "docx") return data.text || "";
    if (file.kind === "xlsx") return data.sheets[sheetIdx]?.text || "";
    if (file.kind === "txt") return data.text;
    if (file.kind === "md") return data.raw;
    if (file.kind === "csv") return data.rows.map((r: string[]) => r.join(data.delimiter || ",")).join("\n");
    return "";
  }, [file.kind, data, sheetIdx]);

  const isRTL = useMemo(() => detectRTL(plainText), [plainText]);
  const isCJK = useMemo(() => detectCJK(plainText), [plainText]);
  const wordCount = useMemo(() => plainText.trim().split(/\s+/).filter(Boolean).length, [plainText]);

  const copyText = async () => {
    if (file.kind === "pdf") {
      toast.info("Copy is unavailable for PDF in this view.");
      return;
    }
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Could not copy text.");
    }
  };

  const sidebar = (
    <Sidebar
      file={file}
      data={data}
      sheetIdx={sheetIdx}
      setSheetIdx={setSheetIdx}
      pdfPage={pdfPage}
      setPdfPage={setPdfPage}
      pdfZoom={pdfZoom}
      setPdfZoom={setPdfZoom}
      mdRaw={mdRaw}
      setMdRaw={setMdRaw}
      onReset={onReset}
      onCopy={copyText}
      wordCount={wordCount}
      isRTL={isRTL}
      isCJK={isCJK}
      plainText={plainText}
    />
  );

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr] animate-in fade-in duration-300">
      <aside className="hidden md:block">{sidebar}</aside>

      <main
        className="rounded-2xl border border-border bg-card overflow-hidden"
        style={{ minHeight: "70vh", fontFamily: isCJK ? "'Noto Sans CJK SC','Microsoft YaHei',sans-serif" : undefined }}
      >
        <ViewerBody
          file={file}
          data={data}
          sheetIdx={sheetIdx}
          setSheetIdx={setSheetIdx}
          pdfPage={pdfPage}
          setPdfPage={setPdfPage}
          pdfZoom={pdfZoom}
          setPdfZoom={setPdfZoom}
          mdRaw={mdRaw}
          isRTL={isRTL}
        />
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        aria-label="Show file info"
      >
        <Info className="w-6 h-6" />
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-card border-t border-border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar(props: {
  file: LoadedFile;
  data: any;
  sheetIdx: number;
  setSheetIdx: (n: number) => void;
  pdfPage: number;
  setPdfPage: (n: number) => void;
  pdfZoom: number;
  setPdfZoom: (n: number) => void;
  mdRaw: boolean;
  setMdRaw: (v: boolean) => void;
  onReset: () => void;
  onCopy: () => void;
  wordCount: number;
  isRTL: boolean;
  isCJK: boolean;
  plainText: string;
}) {
  const {
    file,
    data,
    sheetIdx,
    setSheetIdx,
    pdfPage,
    setPdfPage,
    pdfZoom,
    setPdfZoom,
    mdRaw,
    setMdRaw,
    onReset,
    onCopy,
    wordCount,
    isRTL,
    isCJK,
  } = props;
  const meta = KIND_META[file.kind];
  const Icon = meta.Icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 md:sticky md:top-4">
      {/* File info */}
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)`, color: meta.color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          <span
            className="inline-block mt-1 text-[10px] font-medium rounded-full px-2 py-0.5"
            style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)`, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* PDF controls */}
      {file.kind === "pdf" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Pages</p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                type="number"
                value={pdfPage}
                min={1}
                max={data.numPages}
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  if (!isNaN(n)) setPdfPage(Math.max(1, Math.min(data.numPages, n)));
                }}
                className="w-14 text-center text-sm rounded border border-border bg-background px-1 py-1"
              />
              <span className="text-xs text-muted-foreground shrink-0">/ {data.numPages}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPdfPage(Math.min(data.numPages, pdfPage + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Zoom</p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <select
                value={pdfZoom}
                onChange={(e) => setPdfZoom(parseInt(e.target.value))}
                className="flex-1 text-sm rounded border border-border bg-background px-1 py-1"
              >
                {[50, 75, 100, 125, 150, 200].map((z) => (
                  <option key={z} value={z}>
                    {z}%
                  </option>
                ))}
              </select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel sheet list — also visible on mobile via drawer */}
      {file.kind === "xlsx" && data.sheets.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Sheets ({data.sheets.length})</p>
          <div className="space-y-1 max-h-48 overflow-auto">
            {data.sheets.map((s: any, i: number) => (
              <button
                key={i}
                onClick={() => setSheetIdx(i)}
                className={`flex items-center gap-2 w-full text-left text-sm rounded-lg px-2.5 py-1.5 transition ${i === sheetIdx ? "bg-primary/15 text-primary font-medium" : "hover:bg-secondary text-foreground"}`}
              >
                <TableIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CSV info */}
      {file.kind === "csv" && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            {data.total.toLocaleString()} rows · {data.rows[0]?.length || 0} columns
          </p>
          <p>
            Delimiter:{" "}
            <code className="bg-secondary px-1 rounded">{data.delimiter === "\t" ? "tab" : data.delimiter}</code>
          </p>
          {data.truncated && <p className="text-amber-400">Showing first 5,000 rows</p>}
        </div>
      )}

      {/* Markdown toggle */}
      {file.kind === "md" && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setMdRaw(!mdRaw)}>
          {mdRaw ? "Show Rendered" : "Show Raw"}
        </Button>
      )}

      {/* Word count */}
      {(file.kind === "docx" || file.kind === "txt" || file.kind === "md") && (
        <p className="text-xs text-muted-foreground">~{wordCount.toLocaleString()} words</p>
      )}
      {file.kind === "txt" && (
        <p className="text-xs text-muted-foreground">{data.text.split("\n").length.toLocaleString()} lines</p>
      )}

      {/* Language badges */}
      {isRTL && (
        <div
          className="text-xs rounded-lg px-2.5 py-1.5"
          style={{ background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)", color: "var(--cyan-brand)" }}
        >
          🌐 RTL detected — right-to-left display
        </div>
      )}
      {isCJK && (
        <div
          className="text-xs rounded-lg px-2.5 py-1.5"
          style={{
            background: "color-mix(in oklab, var(--violet-brand) 15%, transparent)",
            color: "var(--violet-brand)",
          }}
        >
          🈵 CJK script detected
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Button size="sm" variant="outline" className="w-full" onClick={onCopy} disabled={file.kind === "pdf"}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Text
        </Button>
        <Button size="sm" variant="outline" className="w-full" onClick={onReset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Open Another File
        </Button>
      </div>
    </div>
  );
}

// ─── ViewerBody ───────────────────────────────────────────────────────────────
function ViewerBody(props: {
  file: LoadedFile;
  data: any;
  sheetIdx: number;
  setSheetIdx: (n: number) => void;
  pdfPage: number;
  setPdfPage: (n: number) => void;
  pdfZoom: number;
  setPdfZoom: (n: number) => void;
  mdRaw: boolean;
  isRTL: boolean;
}) {
  const { file, data, sheetIdx, setSheetIdx, pdfPage, setPdfPage, pdfZoom, mdRaw, isRTL } = props;
  const dir = isRTL ? "rtl" : undefined;

  if (file.kind === "docx") {
    return (
      <div className="p-6 overflow-auto" style={{ maxHeight: "80vh" }}>
        {data.warnings.length > 0 && (
          <details
            className="mb-4 rounded border p-2 text-xs"
            style={{
              borderColor: "color-mix(in oklab, #f59e0b 40%, transparent)",
              background: "color-mix(in oklab, #f59e0b 8%, transparent)",
              color: "#f59e0b",
            }}
          >
            <summary className="cursor-pointer">⚠️ Some formatting could not be converted</summary>
            <ul className="mt-2 space-y-1">
              {data.warnings.slice(0, 8).map((w: string, i: number) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="fv-prose" dir={dir} dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  }

  if (file.kind === "xlsx") {
    return (
      <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
        {/* Sheet tabs — visible on desktop inside ViewerBody; also accessible on mobile via drawer Sidebar */}
        {data.sheets.length > 1 && (
          <div className="flex overflow-x-auto border-b border-border bg-secondary/30 shrink-0">
            {data.sheets.map((s: any, i: number) => (
              <button
                key={i}
                onClick={() => setSheetIdx(i)}
                className={`shrink-0 px-4 py-2 text-sm transition border-b-2 ${i === sheetIdx ? "border-[var(--primary)] text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div
          className="fv-xlsx overflow-auto flex-1"
          dir={dir}
          style={{ WebkitOverflowScrolling: "touch" }}
          dangerouslySetInnerHTML={{ __html: data.sheets[sheetIdx]?.html || "" }}
        />
      </div>
    );
  }

  if (file.kind === "pdf") {
    return (
      <PdfViewer doc={data.doc} numPages={data.numPages} page={pdfPage} zoom={pdfZoom} onPageChange={setPdfPage} />
    );
  }

  if (file.kind === "txt") {
    return (
      <pre className="fv-pre" dir={dir} style={{ maxHeight: "80vh", overflow: "auto" }}>
        {data.text}
      </pre>
    );
  }

  if (file.kind === "md") {
    if (mdRaw)
      return (
        <pre className="fv-pre" style={{ maxHeight: "80vh", overflow: "auto" }}>
          {data.raw}
        </pre>
      );
    return (
      <div className="p-6 overflow-auto" style={{ maxHeight: "80vh" }}>
        <div className="fv-prose" dir={dir} dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  }

  if (file.kind === "csv") {
    const [header, ...body] = data.rows as string[][];
    return (
      <div className="overflow-auto" style={{ maxHeight: "80vh", WebkitOverflowScrolling: "touch" }} dir={dir}>
        {data.truncated && (
          <div
            className="m-3 rounded border p-2 text-xs"
            style={{
              borderColor: "color-mix(in oklab, #f59e0b 40%, transparent)",
              background: "color-mix(in oklab, #f59e0b 8%, transparent)",
              color: "#f59e0b",
            }}
          >
            Showing first 5,000 of {data.total.toLocaleString()} rows.
          </div>
        )}
        <table className="fv-csv-table">
          <thead>
            <tr>
              {(header || []).map((c: string, i: number) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r: string[], i: number) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={/^-?\d+(\.\d+)?$/.test(c.trim()) ? "num" : ""}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

// ─── PdfViewer ────────────────────────────────────────────────────────────────
function PdfViewer({
  doc,
  numPages,
  page,
  zoom,
  onPageChange,
}: {
  doc: any;
  numPages: number;
  page: number;
  zoom: number;
  onPageChange: (n: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<Set<string>>(new Set()); // key = `${pageNum}:${zoom}`
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Re-render on zoom change: clear cache, repaint all rendered placeholders
  useEffect(() => {
    renderedRef.current.clear();
    const container = containerRef.current;
    if (!container) return;
    // Clear all canvases
    container.querySelectorAll("[data-page]").forEach((el) => {
      (el as HTMLElement).innerHTML =
        `<span class="text-xs text-muted-foreground p-4">Page ${(el as HTMLElement).dataset.page}</span>`;
    });
    // Re-setup observer to trigger re-render of visible pages
    setupObserver();
    // Also immediately render the current page
    renderPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Scroll to current page
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-page="${page}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const renderPage = async (pageNum: number) => {
    const key = `${pageNum}:${zoom}`;
    if (renderedRef.current.has(key)) return;
    renderedRef.current.add(key);
    const container = containerRef.current;
    const placeholder = container?.querySelector(`[data-page="${pageNum}"]`) as HTMLDivElement | null;
    if (!placeholder) return;
    try {
      const p = await doc.getPage(pageNum);
      const scale = zoom / 100;
      const viewport = p.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(viewport.width, 4096);
      canvas.height = Math.min(viewport.height, 4096);
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d")!;
      await p.render({ canvasContext: ctx, viewport }).promise;
      placeholder.innerHTML = "";
      placeholder.appendChild(canvas);
    } catch {
      renderedRef.current.delete(key);
    }
  };

  const setupObserver = () => {
    observerRef.current?.disconnect();
    const container = containerRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const n = parseInt((entry.target as HTMLElement).dataset.page || "0");
            if (n) {
              renderPage(n);
              renderPage(n + 1);
              renderPage(n - 1);
            }
          }
        });
      },
      { root: container, rootMargin: "300px" },
    );
    container.querySelectorAll("[data-page]").forEach((p) => obs.observe(p));
    observerRef.current = obs;
  };

  useEffect(() => {
    setupObserver();
    // Immediately render first page
    renderPage(1);
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  return (
    <div ref={containerRef} className="overflow-auto bg-secondary/30" style={{ maxHeight: "80vh", padding: 16 }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          data-page={n}
          className="mx-auto mb-4 bg-white border border-border rounded shadow-sm flex items-center justify-center"
          style={{ minHeight: 300, minWidth: 220 }}
          onClick={() => onPageChange(n)}
        >
          <span className="text-xs text-muted-foreground p-4">Page {n}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function ViewerStyles() {
  return (
    <style>{`
      .fv-prose { max-width: 800px; margin: 0 auto; font-size: 16px; line-height: 1.75; color: var(--foreground); }
      .fv-prose[dir="rtl"] { text-align: right; }
      .fv-prose h1,.fv-prose h2,.fv-prose h3,.fv-prose h4 { font-weight: 700; margin: 1.2em 0 0.6em; line-height: 1.3; }
      .fv-prose h1 { font-size: 1.875rem; } .fv-prose h2 { font-size: 1.5rem; }
      .fv-prose h3 { font-size: 1.25rem; } .fv-prose h4 { font-size: 1.1rem; }
      .fv-prose p { margin: 0.75em 0; }
      .fv-prose ul,.fv-prose ol { margin: 0.75em 0; padding-left: 1.5em; }
      .fv-prose[dir="rtl"] ul,.fv-prose[dir="rtl"] ol { padding-left: 0; padding-right: 1.5em; }
      .fv-prose li { margin: 0.25em 0; }
      .fv-prose a { color: var(--primary); text-decoration: underline; }
      .fv-prose strong { font-weight: 700; } .fv-prose em { font-style: italic; }
      .fv-prose code { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; background: var(--secondary); padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; }
      .fv-prose pre { background: var(--secondary); padding: 1em; border-radius: 8px; overflow: auto; }
      .fv-prose blockquote { border-left: 3px solid var(--border); padding-left: 1em; color: var(--muted-foreground); margin: 1em 0; }
      .fv-prose[dir="rtl"] blockquote { border-left: 0; border-right: 3px solid var(--border); padding-left: 0; padding-right: 1em; }
      .fv-prose img { max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; }
      .fv-prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .fv-prose th,.fv-prose td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
      .fv-prose th { background: var(--secondary); font-weight: 600; }

      .fv-pre { white-space: pre-wrap; word-break: break-word; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 14px; line-height: 1.6; padding: 24px; background: var(--card); color: var(--foreground); margin: 0; }

      /* Excel — proper sticky header via clip trick */
      .fv-xlsx { overflow: auto; }
      .fv-xlsx table { border-collapse: collapse; width: max-content; min-width: 100%; font-size: 14px; }
      .fv-xlsx th,.fv-xlsx td { border: 1px solid var(--border); padding: 6px 12px; color: var(--foreground); white-space: nowrap; }
      .fv-xlsx thead th { background: var(--secondary); font-weight: 600; position: sticky; top: 0; z-index: 2; }
      .fv-xlsx tbody tr:nth-child(even) td { background: color-mix(in oklab, var(--secondary) 30%, transparent); }
      .fv-xlsx td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; }

      /* CSV */
      .fv-csv-table { border-collapse: collapse; width: max-content; min-width: 100%; font-size: 14px; }
      .fv-csv-table th,.fv-csv-table td { border: 1px solid var(--border); padding: 6px 12px; color: var(--foreground); white-space: nowrap; }
      .fv-csv-table th { background: var(--secondary); font-weight: 600; position: sticky; top: 0; z-index: 2; text-align: left; }
      .fv-csv-table tbody tr:nth-child(even) td { background: color-mix(in oklab, var(--secondary) 30%, transparent); }
      .fv-csv-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; }
    `}</style>
  );
}
