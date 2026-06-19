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
} from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone, formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tools/file-viewer")({
  head: () => buildToolMeta(toolBySlug("file-viewer", tools)),
  component: FileViewerPage,
});

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

function detectRTL(text: string): boolean {
  const matches = text.match(new RegExp(RTL_RE.source, "g")) || [];
  return text.length > 0 && matches.length > text.length * 0.2;
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

function parseCSV(text: string): string[][] {
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
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
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
  let h = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  h = h.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  h = h.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  h = h.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  h = h.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  h = h.replace(/`(.+?)`/g, "<code>$1</code>");
  h = h.replace(/^- (.*)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  h = h
    .split(/\n\n+/)
    .map((p) => (/^<(h\d|ul|ol|pre|blockquote)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return h;
}

interface LoadedFile {
  name: string;
  size: number;
  kind: Exclude<FileKind, "unsupported">;
}

interface DocxData { html: string; text: string; warnings: string[]; }
interface XlsxData { sheets: { name: string; html: string; text: string }[]; }
interface PdfData { doc: any; numPages: number; }
interface TextData { text: string; }
interface MdData { html: string; raw: string; }
interface CsvData { rows: string[][]; total: number; truncated: boolean; }

type ViewerState =
  | { status: "empty" }
  | { status: "loading"; name: string; progress?: string }
  | { status: "error"; message: string }
  | { status: "loaded"; file: LoadedFile; data: DocxData | XlsxData | PdfData | TextData | MdData | CsvData };

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
      showError("This file is too large. Try splitting it first.");
      return;
    }
    if (file.size === 0) {
      showError("This file appears to be empty.");
      return;
    }
    const kind = getKind(file.name);
    if (kind === "unsupported") {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "pptx" || ext === "ppt") {
        showError("PowerPoint support coming soon — try converting to PDF first!");
      } else {
        showError("This file type is not supported yet.");
      }
      return;
    }

    setState({ status: "loading", name: file.name });
    const loaded: LoadedFile = { name: file.name, size: file.size, kind };

    try {
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
          data: { html: stripScripts(result.value), text, warnings: (result.messages || []).map((m: any) => m.message) },
        });
      } else if (kind === "xlsx") {
        const buf = await file.arrayBuffer();
        const XLSX: any = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const sheets = wb.SheetNames.map((n: string) => {
          const ws = wb.Sheets[n];
          return {
            name: n,
            html: stripScripts(XLSX.utils.sheet_to_html(ws, { editable: false })),
            text: XLSX.utils.sheet_to_csv(ws),
          };
        });
        setSheetIdx(0);
        setState({ status: "loaded", file: loaded, data: { sheets } });
      } else if (kind === "pdf") {
        const buf = await file.arrayBuffer();
        const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        try {
          const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
          setPdfPage(1);
          setPdfZoom(100);
          setState({ status: "loaded", file: loaded, data: { doc, numPages: doc.numPages } });
        } catch (e: any) {
          if (e?.name === "PasswordException") {
            showError("This PDF is password-protected. Unlock it first.");
          } else {
            showError("Could not open this PDF. " + (e?.message || ""));
          }
        }
      } else if (kind === "txt") {
        const text = await file.text();
        setState({ status: "loaded", file: loaded, data: { text } });
      } else if (kind === "md") {
        const raw = await file.text();
        let html = "";
        try {
          const m: any = await import("marked");
          html = await m.parse(raw);
        } catch {
          html = fallbackMarkdown(raw);
        }
        setState({ status: "loaded", file: loaded, data: { html: stripScripts(html), raw } });
      } else if (kind === "csv") {
        const text = await file.text();
        const rows = parseCSV(text);
        const truncated = rows.length > 5000;
        setState({
          status: "loaded",
          file: loaded,
          data: { rows: truncated ? rows.slice(0, 5000) : rows, total: rows.length, truncated },
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      if (kind === "docx") showError("This Word file appears to be corrupted or encrypted.");
      else if (kind === "xlsx") showError("This Excel file could not be read. Try saving it again in Excel.");
      else showError("Could not open this file. " + msg);
    }
  }, []);

  const onFiles = useCallback((files: File[]) => {
    if (files[0]) loadFile(files[0]);
  }, [loadFile]);

  const loadSample = async (kind: "docx" | "xlsx" | "pdf") => {
    if (kind === "docx") {
      const html =
        "<h1>Sample Word Document</h1><p>This is a <strong>demo</strong> rendered by <em>Skycally File Viewer</em>. Everything runs locally in your browser — your files never leave your device.</p><h2>Features</h2><ul><li>Heading and list support</li><li>Bold and italic formatting</li><li>Embedded tables and images</li></ul>";
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
      ];
      const html =
        "<table>" +
        rows
          .map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>")
          .join("") +
        "</table>";
      setState({
        status: "loaded",
        file: { name: "sample.xlsx", size: 1024, kind: "xlsx" },
        data: { sheets: [{ name: "Sales", html, text: rows.map((r) => r.join(",")).join("\n") }] },
      });
      setSheetIdx(0);
    } else {
      const text =
        "Sample Text File\n\nThis is a plain-text demo rendered by Skycally File Viewer. Your files always stay on your device.";
      setState({
        status: "loaded",
        file: { name: "sample.txt", size: text.length, kind: "txt" },
        data: { text },
      });
    }
  };

  return (
    <>
      <ToolPageShell
        title="File Viewer"
        description="Open Word, Excel, PDF, TXT, Markdown and CSV files instantly — 100% in your browser, with zero uploads."
      >
        <ViewerStyles />

        {state.status === "empty" && (
          <EmptyState onFiles={onFiles} onSample={loadSample} />
        )}

        {state.status === "loading" && (
          <LoadingState name={state.name} progress={state.progress} />
        )}

        {state.status === "error" && (
          <ErrorBanner message={state.message} onReset={reset} />
        )}

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

        <HowToUse
          steps={[
            "Drop your file onto the upload area or click to browse — Word, Excel, PDF, TXT, Markdown and CSV are all supported.",
            "Your file opens instantly in the browser. Nothing is uploaded — your document never leaves your device.",
            "Navigate pages (PDF), switch sheets (Excel), or scroll through your document. Use the sidebar controls to zoom or copy text.",
            "Done? Click 'Open Another File' to view a different document, or simply close the tab.",
          ]}
        />

        <ToolSeoContent
          title="File Viewer — Open Word, Excel, PDF & More Free Online"
          description="View Word (.docx), Excel (.xlsx), PDF, TXT, Markdown and CSV files instantly in your browser. No upload, no account, no Microsoft Office or Adobe Reader needed. Files never leave your device."
          body={[
            "Skycally's File Viewer lets you open virtually any document format directly in your browser tab — no software to install, no account to create, and no file uploaded to any server. Word documents, Excel spreadsheets, PDF files, plain text, Markdown and CSV tables all open in seconds, rendered cleanly with their original formatting preserved as closely as possible.",
            "The viewer supports right-to-left languages including Arabic, Hebrew and Persian — documents written in these scripts are automatically detected and displayed correctly, with text flowing right-to-left just as intended. Chinese, Japanese and Korean documents also render correctly thanks to automatic CJK font fallbacks. This makes Skycally's File Viewer one of the most internationally capable document viewers available for free online.",
            "Privacy is built into the architecture: all file processing uses browser-native APIs (FileReader, ArrayBuffer, Canvas) and the open-source libraries mammoth.js, SheetJS and pdf.js. Your file bytes never travel over the network. This makes the viewer safe for confidential contracts, medical records, financial statements, and any sensitive document you need to read quickly without risking a data leak.",
          ]}
          faqs={[
            { question: "Can I open a Word document without Microsoft Word?", answer: "Yes. Upload your .docx file and it opens instantly in your browser using the open-source mammoth.js library. Formatting including headings, bold, italic, tables and lists is preserved. Images embedded in the document are also displayed." },
            { question: "Can I view an Excel file without Excel?", answer: "Yes. .xlsx and .xls files open using SheetJS. All sheets are available as tabs. Numbers, text and basic formatting are preserved. Note that Excel formulas show their calculated values, not the formula itself." },
            { question: "Is my file uploaded to a server?", answer: "No. Everything runs entirely in your browser. The file is read directly from your device's memory using the FileReader API and never sent over the internet. You can even use the viewer while offline after the page has loaded." },
            { question: "What is the maximum file size?", answer: "The viewer accepts files up to 50 MB. Very large files may be slower to process depending on your device. For PDF files larger than 50 MB, consider splitting the file first using our Split PDF tool." },
            { question: "Does it support Arabic, Hebrew or other RTL languages?", answer: "Yes. The viewer automatically detects right-to-left scripts including Arabic, Hebrew and Persian. When detected, the document is displayed right-to-left with correct text alignment, just as it would appear in Word or Excel." },
            { question: "Can I view password-protected files?", answer: "No. Password-protected or encrypted files cannot be opened because the viewer has no way to decrypt them without the password. You will need to remove the password protection first using the original application." },
            { question: "What Word formatting is preserved?", answer: "Headings (H1–H4), bold, italic, underline, bullet and numbered lists, tables, hyperlinks, and embedded images are all preserved. Complex elements like SmartArt, charts embedded as objects, and track changes are not supported." },
            { question: "Can I copy text from the viewed file?", answer: "Yes. Use the 'Copy Text' button in the sidebar to copy the entire plain-text content of the document to your clipboard. You can then paste it anywhere you need." },
          ]}
        />

        <RelatedTools currentSlug="file-viewer" />
      </ToolPageShell>
    </>
  );
}

function EmptyState({ onFiles, onSample }: { onFiles: (f: File[]) => void; onSample: (k: "docx" | "xlsx" | "pdf") => void }) {
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
        hint="Word, Excel, PDF, TXT, Markdown or CSV — click to browse"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {badges.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: `color-mix(in oklab, ${b.color} 40%, transparent)`, background: `color-mix(in oklab, ${b.color} 12%, transparent)`, color: b.color }}
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
          Max 50 MB
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span className="text-xs text-muted-foreground">Or try a sample file →</span>
        <Button size="sm" variant="outline" onClick={() => onSample("docx")}>Sample Word</Button>
        <Button size="sm" variant="outline" onClick={() => onSample("xlsx")}>Sample Excel</Button>
        <Button size="sm" variant="outline" onClick={() => onSample("pdf")}>Sample Text</Button>
      </div>
    </div>
  );
}

function LoadingState({ name, progress }: { name: string; progress?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <p className="text-sm text-muted-foreground mb-4">Opening <span className="text-foreground font-medium">{name}</span>…</p>
      {progress && <p className="text-xs text-muted-foreground mb-4">{progress}</p>}
      <div className="space-y-3">
        <div className="h-4 rounded bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse w-5/6" />
        <div className="h-4 rounded bg-muted animate-pulse w-3/4" />
      </div>
    </div>
  );
}

function ErrorBanner({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "color-mix(in oklab, #ef4444 40%, transparent)", background: "color-mix(in oklab, #ef4444 8%, transparent)" }}>
      <p className="font-medium" style={{ color: "#ef4444" }}>⚠️ {message}</p>
      <Button className="mt-4" size="sm" onClick={onReset}>Try Another File</Button>
    </div>
  );
}

function LoadedView(props: {
  file: LoadedFile;
  data: any;
  sheetIdx: number; setSheetIdx: (n: number) => void;
  pdfPage: number; setPdfPage: (n: number) => void;
  pdfZoom: number; setPdfZoom: (n: number) => void;
  mdRaw: boolean; setMdRaw: (v: boolean) => void;
  onReset: () => void;
  drawerOpen: boolean; setDrawerOpen: (v: boolean) => void;
}) {
  const { file, data, sheetIdx, setSheetIdx, pdfPage, setPdfPage, pdfZoom, setPdfZoom, mdRaw, setMdRaw, onReset, drawerOpen, setDrawerOpen } = props;

  const plainText = useMemo(() => {
    if (file.kind === "docx") return data.text || "";
    if (file.kind === "xlsx") return data.sheets[sheetIdx]?.text || "";
    if (file.kind === "txt") return data.text;
    if (file.kind === "md") return data.raw;
    if (file.kind === "csv") return data.rows.map((r: string[]) => r.join(",")).join("\n");
    if (file.kind === "pdf") return "";
    return "";
  }, [file.kind, data, sheetIdx]);

  const isRTL = useMemo(() => detectRTL(plainText), [plainText]);
  const isCJK = useMemo(() => detectCJK(plainText), [plainText]);

  const wordCount = useMemo(() => {
    if (!plainText) return 0;
    return plainText.trim().split(/\s+/).filter(Boolean).length;
  }, [plainText]);

  const copyText = async () => {
    if (file.kind === "pdf") {
      toast.info("Copy is unavailable for PDF in this view.");
      return;
    }
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success("Text copied to clipboard");
    } catch {
      toast.error("Could not copy text");
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
        style={{ minHeight: "70vh", fontFamily: isCJK ? "'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif" : undefined }}
      >
        <ViewerBody
          file={file}
          data={data}
          sheetIdx={sheetIdx}
          setSheetIdx={setSheetIdx}
          pdfPage={pdfPage}
          setPdfPage={setPdfPage}
          pdfZoom={pdfZoom}
          mdRaw={mdRaw}
          isRTL={isRTL}
        />
      </main>

      <button
        onClick={() => setDrawerOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        aria-label="Show file info"
      >
        <Info className="w-6 h-6" />
      </button>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-card border-t border-border p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="p-2"><X className="w-5 h-5" /></button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar(props: {
  file: LoadedFile; data: any;
  sheetIdx: number; setSheetIdx: (n: number) => void;
  pdfPage: number; setPdfPage: (n: number) => void;
  pdfZoom: number; setPdfZoom: (n: number) => void;
  mdRaw: boolean; setMdRaw: (v: boolean) => void;
  onReset: () => void; onCopy: () => void;
  wordCount: number; isRTL: boolean; isCJK: boolean;
  plainText: string;
}) {
  const { file, data, sheetIdx, setSheetIdx, pdfPage, setPdfPage, pdfZoom, setPdfZoom, mdRaw, setMdRaw, onReset, onCopy, wordCount, isRTL, isCJK } = props;
  const meta = KIND_META[file.kind];
  const Icon = meta.Icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 md:sticky md:top-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)`, color: meta.color }}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          <span className="inline-block mt-1 text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)`, color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </div>

      {file.kind === "pdf" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Pages</p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setPdfPage(Math.max(1, pdfPage - 1))} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Button>
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
              aria-label="Page number"
            />
            <span className="text-xs text-muted-foreground">/ {data.numPages}</span>
            <Button size="icon" variant="outline" onClick={() => setPdfPage(Math.min(data.numPages, pdfPage + 1))} aria-label="Next page"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs font-semibold text-muted-foreground pt-1">Zoom</p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))} aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></Button>
            <select value={pdfZoom} onChange={(e) => setPdfZoom(parseInt(e.target.value))} className="flex-1 text-sm rounded border border-border bg-background px-1 py-1" aria-label="Zoom level">
              {[50, 75, 100, 125, 150, 200].map((z) => <option key={z} value={z}>{z}%</option>)}
            </select>
            <Button size="icon" variant="outline" onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))} aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {file.kind === "xlsx" && data.sheets.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Sheets</p>
          <div className="space-y-1 max-h-48 overflow-auto">
            {data.sheets.map((s: any, i: number) => (
              <button
                key={i}
                onClick={() => setSheetIdx(i)}
                className={`block w-full text-left text-sm rounded px-2 py-1.5 transition ${i === sheetIdx ? "bg-secondary font-medium" : "hover:bg-secondary/50"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {file.kind === "md" && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setMdRaw(!mdRaw)}>
          {mdRaw ? "Rendered" : "Raw"}
        </Button>
      )}

      {(file.kind === "docx" || file.kind === "txt" || file.kind === "md") && (
        <p className="text-xs text-muted-foreground">~{wordCount.toLocaleString()} words</p>
      )}
      {file.kind === "txt" && (
        <p className="text-xs text-muted-foreground">{(data.text.split("\n").length).toLocaleString()} lines</p>
      )}
      {file.kind === "csv" && (
        <p className="text-xs text-muted-foreground">{data.total.toLocaleString()} rows · {(data.rows[0]?.length || 0)} columns</p>
      )}

      {isRTL && (
        <div className="text-xs rounded-md px-2 py-1.5" style={{ background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)", color: "var(--cyan-brand)" }}>
          🌐 RTL detected — displaying right-to-left
        </div>
      )}
      {isCJK && (
        <div className="text-xs rounded-md px-2 py-1.5" style={{ background: "color-mix(in oklab, var(--violet-brand) 15%, transparent)", color: "var(--violet-brand)" }}>
          🈵 CJK script detected
        </div>
      )}

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

function ViewerBody(props: {
  file: LoadedFile; data: any;
  sheetIdx: number; setSheetIdx: (n: number) => void;
  pdfPage: number; setPdfPage: (n: number) => void;
  pdfZoom: number;
  mdRaw: boolean;
  isRTL: boolean;
}) {
  const { file, data, sheetIdx, setSheetIdx, pdfPage, pdfZoom, mdRaw, isRTL } = props;
  const dir = isRTL ? "rtl" : undefined;

  if (file.kind === "docx") {
    return (
      <div className="p-6 overflow-auto" style={{ maxHeight: "80vh" }}>
        {data.warnings.length > 0 && (
          <details className="mb-4 rounded border p-2 text-xs" style={{ borderColor: "color-mix(in oklab, #f59e0b 40%, transparent)", background: "color-mix(in oklab, #f59e0b 8%, transparent)", color: "#f59e0b" }}>
            <summary className="cursor-pointer">⚠️ Some formatting could not be converted</summary>
            <ul className="mt-2 space-y-1">{data.warnings.slice(0, 8).map((w: string, i: number) => <li key={i}>• {w}</li>)}</ul>
          </details>
        )}
        <div className="fv-prose" dir={dir} dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  }

  if (file.kind === "xlsx") {
    const sheet = data.sheets[sheetIdx];
    return (
      <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
        {data.sheets.length > 1 && (
          <div className="flex overflow-x-auto border-b border-border bg-secondary/30">
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
        <div className="fv-xlsx overflow-auto p-4" dir={dir} style={{ WebkitOverflowScrolling: "touch" }} dangerouslySetInnerHTML={{ __html: sheet.html }} />
      </div>
    );
  }

  if (file.kind === "pdf") {
    return <PdfViewer doc={data.doc} numPages={data.numPages} page={pdfPage} zoom={pdfZoom} />;
  }

  if (file.kind === "txt") {
    return <pre className="fv-pre" dir={dir} style={{ maxHeight: "80vh", overflow: "auto" }}>{data.text}</pre>;
  }

  if (file.kind === "md") {
    if (mdRaw) {
      return <pre className="fv-pre" style={{ maxHeight: "80vh", overflow: "auto" }}>{data.raw}</pre>;
    }
    return (
      <div className="p-6 overflow-auto" style={{ maxHeight: "80vh" }}>
        <div className="fv-prose" dir={dir} dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  }

  if (file.kind === "csv") {
    const header = data.rows[0] || [];
    const body = data.rows.slice(1);
    return (
      <div className="overflow-auto" style={{ maxHeight: "80vh", WebkitOverflowScrolling: "touch" }} dir={dir}>
        {data.truncated && (
          <div className="m-3 rounded border p-2 text-xs" style={{ borderColor: "color-mix(in oklab, #f59e0b 40%, transparent)", background: "color-mix(in oklab, #f59e0b 8%, transparent)", color: "#f59e0b" }}>
            Showing first 5,000 of {data.total.toLocaleString()} rows for performance.
          </div>
        )}
        <table className="fv-csv-table">
          <thead>
            <tr>{header.map((c: string, i: number) => <th key={i}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((r: string[], i: number) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={/^-?\d+(\.\d+)?$/.test(c.trim()) ? "num" : ""}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

function PdfViewer({ doc, numPages, page, zoom }: { doc: any; numPages: number; page: number; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    renderedRef.current.clear();
  }, [doc, zoom]);

  // Scroll to current page when page changes
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-page="${page}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  // Render visible pages via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderPage = async (pageNum: number) => {
      if (renderedRef.current.has(pageNum)) return;
      renderedRef.current.add(pageNum);
      const placeholder = container.querySelector(`[data-page="${pageNum}"]`) as HTMLDivElement | null;
      if (!placeholder) return;
      try {
        const p = await doc.getPage(pageNum);
        const scale = zoom / 100;
        const viewport = p.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const cap = 4096;
        const w = Math.min(viewport.width, cap);
        const h = Math.min(viewport.height, cap);
        canvas.width = w;
        canvas.height = h;
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        const ctx = canvas.getContext("2d")!;
        await p.render({ canvasContext: ctx, viewport }).promise;
        placeholder.innerHTML = "";
        placeholder.appendChild(canvas);
      } catch {
        renderedRef.current.delete(pageNum);
      }
    };

    const observer = new IntersectionObserver((entries) => {
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
    }, { root: container, rootMargin: "200px" });

    const placeholders = container.querySelectorAll("[data-page]");
    placeholders.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, [doc, zoom, numPages]);

  return (
    <div ref={containerRef} className="overflow-auto bg-secondary/30" style={{ maxHeight: "80vh", padding: "16px" }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          data-page={n}
          className="mx-auto mb-4 bg-white border border-border rounded shadow-sm flex items-center justify-center"
          style={{ minHeight: 400, minWidth: 280 }}
        >
          <span className="text-xs text-muted-foreground p-4">Page {n}</span>
        </div>
      ))}
    </div>
  );
}

function ViewerStyles() {
  return (
    <style>{`
      .fv-prose { max-width: 800px; margin: 0 auto; font-size: 16px; line-height: 1.75; color: var(--foreground); }
      .fv-prose[dir="rtl"] { text-align: right; }
      .fv-prose h1, .fv-prose h2, .fv-prose h3, .fv-prose h4, .fv-prose h5, .fv-prose h6 { font-weight: 700; margin: 1.2em 0 0.6em; line-height: 1.3; }
      .fv-prose h1 { font-size: 1.875rem; }
      .fv-prose h2 { font-size: 1.5rem; }
      .fv-prose h3 { font-size: 1.25rem; }
      .fv-prose h4 { font-size: 1.1rem; }
      .fv-prose p { margin: 0.75em 0; }
      .fv-prose ul, .fv-prose ol { margin: 0.75em 0; padding-left: 1.5em; }
      .fv-prose[dir="rtl"] ul, .fv-prose[dir="rtl"] ol { padding-left: 0; padding-right: 1.5em; }
      .fv-prose li { margin: 0.25em 0; }
      .fv-prose a { color: var(--primary); text-decoration: underline; }
      .fv-prose strong { font-weight: 700; }
      .fv-prose em { font-style: italic; }
      .fv-prose code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--secondary); padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; }
      .fv-prose pre { background: var(--secondary); padding: 1em; border-radius: 8px; overflow: auto; }
      .fv-prose blockquote { border-left: 3px solid var(--border); padding-left: 1em; color: var(--muted-foreground); margin: 1em 0; }
      .fv-prose[dir="rtl"] blockquote { border-left: 0; border-right: 3px solid var(--border); padding-left: 0; padding-right: 1em; }
      .fv-prose img { max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; }
      .fv-prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .fv-prose th, .fv-prose td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
      .fv-prose th { background: var(--secondary); font-weight: 600; }

      .fv-pre { white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; line-height: 1.6; padding: 24px; background: var(--card); color: var(--foreground); margin: 0; }

      .fv-xlsx table { border-collapse: collapse; width: 100%; font-size: 14px; }
      .fv-xlsx th, .fv-xlsx td { border: 1px solid var(--border); padding: 6px 10px; color: var(--foreground); }
      .fv-xlsx tr:first-child td, .fv-xlsx th { background: var(--secondary); font-weight: 600; position: sticky; top: 0; }
      .fv-xlsx tr:nth-child(even) td { background: color-mix(in oklab, var(--secondary) 30%, transparent); }

      .fv-csv-table { border-collapse: collapse; width: 100%; font-size: 14px; }
      .fv-csv-table th, .fv-csv-table td { border: 1px solid var(--border); padding: 6px 10px; color: var(--foreground); }
      .fv-csv-table th { background: var(--secondary); font-weight: 600; position: sticky; top: 0; text-align: left; }
      .fv-csv-table tr:nth-child(even) td { background: color-mix(in oklab, var(--secondary) 30%, transparent); }
      .fv-csv-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    `}</style>
  );
}
