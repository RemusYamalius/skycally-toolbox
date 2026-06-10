import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import {
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Printer, Save, FileUp, FilePlus, FileDown,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  Image as ImageIcon, Table as TableIcon, Minus, Search,
  Eraser, Volume2, Moon, Sun, Calendar, Sigma,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/tools/word-processor")({
  head: () => buildToolMeta(toolBySlug("word-processor", tools)),
  component: WordProcessor,
});

// ---------------- Fonts ----------------
const LATIN_FONTS = [
  "Carlito", "Arimo", "Tinos", "Georgia", "Verdana",
  "Courier Prime", "Trebuchet MS", "Playfair Display", "Lato", "Open Sans",
];
const ARABIC_FONTS = ["Amiri", "Cairo", "Tajawal", "Noto Sans Arabic", "Scheherazade New"];
const ASIAN_FONTS = ["Noto Sans JP", "Noto Sans SC", "Noto Sans KR"];
const ALL_FONTS = [...LATIN_FONTS, ...ARABIC_FONTS, ...ASIAN_FONTS];

const GFONT_HREF = `https://fonts.googleapis.com/css2?${ALL_FONTS
  .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`)
  .join("&")}&display=swap`;

// ---------------- Page sizes (mm) ----------------
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
};

const MARGIN_PRESETS: Record<string, { t: number; r: number; b: number; l: number }> = {
  Normal: { t: 25.4, r: 25.4, b: 25.4, l: 25.4 },
  Narrow: { t: 12.7, r: 12.7, b: 12.7, l: 12.7 },
  Wide: { t: 25.4, r: 50.8, b: 25.4, l: 50.8 },
};

const BULLET_STYLES: { label: string; value: string }[] = [
  { label: "• Filled circle", value: "disc" },
  { label: "○ Empty circle", value: "circle" },
  { label: "▪ Filled square", value: "square" },
  { label: "□ Empty square", value: '"\\25A1  "' },
  { label: "► Arrow", value: '"\\25BA  "' },
  { label: "✓ Checkmark", value: '"\\2713  "' },
  { label: "★ Star", value: '"\\2605  "' },
  { label: "– Dash", value: '"\\2013  "' },
];

const NUMBER_STYLES: { label: string; value: string }[] = [
  { label: "1. 2. 3.", value: "decimal" },
  { label: "I. II. III.", value: "upper-roman" },
  { label: "i. ii. iii.", value: "lower-roman" },
  { label: "A. B. C.", value: "upper-alpha" },
  { label: "a. b. c.", value: "lower-alpha" },
  { label: "١. ٢. ٣.", value: "arabic-indic" },
  { label: "第1 第2 第3", value: "cjk-decimal" },
];

const SPECIAL_CHARS = "© ® ™ ° ± × ÷ → ← ↑ ↓ ★ ☆ ♦ ♥ ♣ ♠ § ¶ • — – … « » “ ” ‘ ’ € £ ¥ ¢ № ™".split(" ");

const COLORS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#c9daf8","#cfe2f3","#d9d2e9","#ead1dc",
];

// ---------------- Helpers ----------------
function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function countStats(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const words = trimmed === "" ? 0 : trimmed.split(" ").length;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  return { words, chars, charsNoSpace };
}

// ---------------- UI primitives ----------------
function TBtn({ onClick, title, active, children }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-8 min-w-8 px-2 inline-flex items-center justify-center gap-1 rounded-md text-sm hover:bg-accent transition-colors ${active ? "bg-accent" : ""}`}
    >
      {children}
    </button>
  );
}

function Sep() { return <div className="w-px h-6 bg-border mx-1" />; }

function Dropdown({ label, children, width = 180 }: { label: React.ReactNode; children: (close: () => void) => React.ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        className="h-8 px-2 inline-flex items-center gap-1 rounded-md text-sm hover:bg-accent"
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute z-40 mt-1 left-0 rounded-md border border-border bg-popover shadow-lg p-1 max-h-72 overflow-auto"
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// ---------------- Main component ----------------
function WordProcessor() {
  const editorRef = useRef<HTMLDivElement>(null);

  // Doc settings
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margins, setMargins] = useState(MARGIN_PRESETS.Normal);
  const [columns, setColumns] = useState(1);
  const [pageBg, setPageBg] = useState("#ffffff");

  // Editor settings
  const [zoom, setZoom] = useState(100);
  const [fontFamily, setFontFamily] = useState("Carlito");
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.15);
  const [spaceBefore, setSpaceBefore] = useState(0);
  const [spaceAfter, setSpaceAfter] = useState(8);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");
  const [spellcheck, setSpellcheck] = useState(true);
  const [darkUi, setDarkUi] = useState(false);

  // Stats
  const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpace: 0 });
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [caretPos, setCaretPos] = useState({ line: 1, col: 1 });

  // Modals
  const [findOpen, setFindOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  // Load Google Fonts
  useEffect(() => {
    const id = "wp-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = GFONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Init editor with saved or default
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const saved = localStorage.getItem("wp:doc");
    el.innerHTML = saved || "<p><br/></p>";
    updateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave
  useEffect(() => {
    const t = setInterval(() => {
      const el = editorRef.current;
      if (el) localStorage.setItem("wp:doc", el.innerHTML);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const updateStats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setStats(countStats(el.innerText || ""));
    // Estimate page count from content height vs page height (mm to px ~ 3.78)
    const pageH = (orientation === "portrait" ? PAGE_SIZES[pageSize].h : PAGE_SIZES[pageSize].w) * 3.78;
    const contentH = el.scrollHeight;
    setPageCount(Math.max(1, Math.ceil(contentH / pageH)));
  }, [pageSize, orientation]);

  // Caret tracking
  const updateCaret = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    const text = pre.toString();
    const lines = text.split("\n");
    setCaretPos({ line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 });
    const pageH = (orientation === "portrait" ? PAGE_SIZES[pageSize].h : PAGE_SIZES[pageSize].w) * 3.78;
    // current page from caret offset
    try {
      const rect = range.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offsetY = rect.top - elRect.top + el.scrollTop;
      setCurrentPage(Math.max(1, Math.min(pageCount, Math.ceil(offsetY / pageH) || 1)));
    } catch { /* noop */ }
  }, [orientation, pageSize, pageCount]);

  // Page dimensions
  const pageDims = useMemo(() => {
    const s = PAGE_SIZES[pageSize];
    return orientation === "portrait" ? { w: s.w, h: s.h } : { w: s.h, h: s.w };
  }, [pageSize, orientation]);

  // Commands
  const onNew = () => {
    if (!confirm("Clear the document? Unsaved changes will be lost.")) return;
    if (editorRef.current) editorRef.current.innerHTML = "<p><br/></p>";
    localStorage.removeItem("wp:doc");
    updateStats();
  };

  const onOpen = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".txt")) {
      const text = await file.text();
      if (editorRef.current) {
        editorRef.current.innerHTML = text
          .split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
      }
    } else if (name.endsWith(".html") || name.endsWith(".htm")) {
      const text = await file.text();
      const m = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (editorRef.current) editorRef.current.innerHTML = m ? m[1] : text;
    } else if (name.endsWith(".docx")) {
      const mammoth: any = await import(/* @vite-ignore */ "mammoth/mammoth.browser");
      const buf = await file.arrayBuffer();
      const res = await (mammoth as any).convertToHtml({ arrayBuffer: buf });
      if (editorRef.current) editorRef.current.innerHTML = res.value || "<p><br/></p>";
    } else {
      alert("Unsupported file type. Use .txt, .html, or .docx");
    }
    updateStats();
  };

  const onSaveTxt = () => {
    const text = editorRef.current?.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.txt";
    a.click();
  };

  const onExportDocx = async () => {
    const docx = await import("docx");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const el = editorRef.current;
    if (!el) return;
    const paragraphs: any[] = [];
    el.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li").forEach((node) => {
      const tag = node.tagName.toLowerCase();
      const text = (node as HTMLElement).innerText;
      if (!text) { paragraphs.push(new Paragraph("")); return; }
      const heading = tag === "h1" ? HeadingLevel.HEADING_1 :
        tag === "h2" ? HeadingLevel.HEADING_2 :
        tag === "h3" ? HeadingLevel.HEADING_3 :
        tag === "h4" ? HeadingLevel.HEADING_4 : undefined;
      paragraphs.push(new Paragraph({
        heading,
        bullet: tag === "li" ? { level: 0 } : undefined,
        children: [new TextRun({ text })],
      }));
    });
    if (paragraphs.length === 0) paragraphs.push(new Paragraph(el.innerText));
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.docx";
    a.click();
  };

  const onPrint = () => window.print();

  // Find & Replace
  const doReplace = (all: boolean) => {
    const el = editorRef.current;
    if (!el || !findText) return;
    const html = el.innerHTML;
    const safe = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safe, all ? "gi" : "i");
    el.innerHTML = html.replace(re, replaceText);
    updateStats();
  };

  // Insert helpers
  const insertHTML = (html: string) => {
    editorRef.current?.focus();
    exec("insertHTML", html);
    updateStats();
  };

  const insertTable = (rows: number, cols: number) => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0;">';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #999;padding:6px;min-width:40px;">&nbsp;</td>';
      }
      html += "</tr>";
    }
    html += "</table><p><br/></p>";
    insertHTML(html);
  };

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      insertHTML(`<img src="${reader.result}" style="max-width:100%;height:auto;" />`);
    };
    reader.readAsDataURL(file);
  };

  const setHeading = (tag: string) => {
    if (tag === "p") exec("formatBlock", "<p>");
    else if (tag === "blockquote") exec("formatBlock", "<blockquote>");
    else exec("formatBlock", `<${tag}>`);
  };

  // List with style
  const insertList = (ordered: boolean, style: string) => {
    exec(ordered ? "insertOrderedList" : "insertUnorderedList");
    // Apply list-style-type to the current list
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node.nodeName !== "UL" && node.nodeName !== "OL") node = node.parentNode;
    if (node && node instanceof HTMLElement) node.style.listStyleType = style;
  };

  const setParagraphStyle = (prop: string, value: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current && node.nodeType === 3) node = node.parentNode;
    while (node && node !== editorRef.current) {
      const t = (node as HTMLElement).nodeName;
      if (["P","DIV","H1","H2","H3","H4","H5","H6","LI","BLOCKQUOTE"].includes(t)) break;
      node = node.parentNode;
    }
    if (node && node instanceof HTMLElement) (node.style as any)[prop] = value;
  };

  // Keyboard shortcuts
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      b: () => exec("bold"),
      i: () => exec("italic"),
      u: () => exec("underline"),
      z: () => exec("undo"),
      y: () => exec("redo"),
      f: () => { setFindOpen(true); },
      h: () => { setFindOpen(true); },
      p: () => onPrint(),
      s: () => onSaveTxt(),
      l: () => exec("justifyLeft"),
      e: () => exec("justifyCenter"),
      r: () => exec("justifyRight"),
      j: () => exec("justifyFull"),
    };
    if (map[k]) { e.preventDefault(); map[k](); }
  };

  // Render
  return (
    <ToolPageShell title="Online Word Processor" description="Write and format documents in your browser — free, no signup.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .wp-print-area, .wp-print-area * { visibility: visible; }
          .wp-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .wp-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
        }
        .wp-editor h1 { font-size: 2em; font-weight: 700; margin: 0.4em 0; }
        .wp-editor h2 { font-size: 1.5em; font-weight: 700; margin: 0.4em 0; }
        .wp-editor h3 { font-size: 1.25em; font-weight: 700; margin: 0.4em 0; }
        .wp-editor h4 { font-size: 1.1em; font-weight: 700; margin: 0.4em 0; }
        .wp-editor blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #555; margin: 0.5em 0; }
        .wp-editor p { margin: 0 0 8pt 0; }
        .wp-editor ul, .wp-editor ol { padding-left: 2em; margin: 0.4em 0; }
        .wp-editor table td { border: 1px solid #999; padding: 6px; }
        .wp-editor:focus { outline: none; }
        .wp-page-break { border: 0; border-top: 2px dashed #bbb; margin: 12px 0; }
      `}</style>

      {/* Toolbar */}
      <div className={`rounded-t-xl border border-border ${darkUi ? "bg-zinc-900 text-zinc-100" : "bg-card"}`}>
        {/* Row 1 — File */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          <TBtn onClick={onNew} title="New"><FilePlus className="w-4 h-4" /></TBtn>
          <label className="h-8 px-2 inline-flex items-center gap-1 rounded-md text-sm hover:bg-accent cursor-pointer" title="Open .txt / .html / .docx">
            <FileUp className="w-4 h-4" />
            <input type="file" accept=".txt,.html,.htm,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpen(f); e.currentTarget.value = ""; }} />
          </label>
          <TBtn onClick={onSaveTxt} title="Save as .txt"><Save className="w-4 h-4" /></TBtn>
          <TBtn onClick={onPrint} title="Export as PDF (Print)"><FileDown className="w-4 h-4" /></TBtn>
          <TBtn onClick={onExportDocx} title="Export as .docx"><FileDown className="w-4 h-4" />docx</TBtn>
          <TBtn onClick={onPrint} title="Print"><Printer className="w-4 h-4" /></TBtn>
        </div>

        {/* Row 2 — Font */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          <Dropdown label={<span style={{ fontFamily }}>{fontFamily}</span>} width={220}>
            {(close) => (
              <>
                <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Latin</div>
                {LATIN_FONTS.map((f) => (
                  <button key={f} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent" style={{ fontFamily: f }}
                    onMouseDown={(e) => { e.preventDefault(); setFontFamily(f); exec("fontName", f); close(); }}>{f}</button>
                ))}
                <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Arabic</div>
                {ARABIC_FONTS.map((f) => (
                  <button key={f} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent" style={{ fontFamily: f }}
                    onMouseDown={(e) => { e.preventDefault(); setFontFamily(f); exec("fontName", f); close(); }}>{f}</button>
                ))}
                <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Asian</div>
                {ASIAN_FONTS.map((f) => (
                  <button key={f} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent" style={{ fontFamily: f }}
                    onMouseDown={(e) => { e.preventDefault(); setFontFamily(f); exec("fontName", f); close(); }}>{f}</button>
                ))}
              </>
            )}
          </Dropdown>
          <input type="number" min={6} max={96} value={fontSize}
            onChange={(e) => {
              const v = Math.max(6, Math.min(96, Number(e.target.value) || 12));
              setFontSize(v);
              // Use HTML font size mapping then override with pt via wrapping
              exec("fontSize", "7");
              const els = editorRef.current?.querySelectorAll('font[size="7"]');
              els?.forEach((el) => { (el as HTMLElement).removeAttribute("size"); (el as HTMLElement).style.fontSize = v + "pt"; });
            }}
            className="h-8 w-16 px-2 rounded-md border border-border bg-background text-sm" title="Font size (pt)" />
          <Sep />
          <TBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)"><Underline className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("strikeThrough")} title="Strikethrough"><Strikethrough className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("subscript")} title="Subscript"><Subscript className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("superscript")} title="Superscript"><Superscript className="w-4 h-4" /></TBtn>
          <Dropdown label={<span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#000" }} />A</span>} width={220}>
            {(close) => (
              <div className="grid grid-cols-10 gap-1 p-1">
                {COLORS.map((c) => (
                  <button key={c} className="w-5 h-5 rounded border border-border" style={{ background: c }}
                    onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); close(); }} />
                ))}
              </div>
            )}
          </Dropdown>
          <Dropdown label={<span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#ffff00" }} />H</span>} width={220}>
            {(close) => (
              <div className="grid grid-cols-10 gap-1 p-1">
                {COLORS.map((c) => (
                  <button key={c} className="w-5 h-5 rounded border border-border" style={{ background: c }}
                    onMouseDown={(e) => { e.preventDefault(); exec("hiliteColor", c); close(); }} />
                ))}
              </div>
            )}
          </Dropdown>
          <TBtn onClick={() => exec("removeFormat")} title="Clear formatting"><Eraser className="w-4 h-4" /></TBtn>
        </div>

        {/* Row 3 — Paragraph */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          <TBtn onClick={() => exec("justifyLeft")} title="Align Left"><AlignLeft className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("justifyCenter")} title="Align Center"><AlignCenter className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("justifyRight")} title="Align Right"><AlignRight className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("justifyFull")} title="Justify"><AlignJustify className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => { setDir("rtl"); setParagraphStyle("direction", "rtl"); }} active={dir === "rtl"} title="RTL">RTL</TBtn>
          <TBtn onClick={() => { setDir("ltr"); setParagraphStyle("direction", "ltr"); }} active={dir === "ltr"} title="LTR">LTR</TBtn>
          <Sep />
          <Dropdown label={<span className="inline-flex items-center gap-1"><List className="w-4 h-4" />Bullets</span>}>
            {(close) => BULLET_STYLES.map((s) => (
              <button key={s.label} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); insertList(false, s.value); close(); }}>{s.label}</button>
            ))}
          </Dropdown>
          <Dropdown label={<span className="inline-flex items-center gap-1"><ListOrdered className="w-4 h-4" />Numbered</span>}>
            {(close) => NUMBER_STYLES.map((s) => (
              <button key={s.label} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); insertList(true, s.value); close(); }}>{s.label}</button>
            ))}
          </Dropdown>
          <TBtn onClick={() => exec("indent")} title="Increase indent"><IndentIncrease className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("outdent")} title="Decrease indent"><IndentDecrease className="w-4 h-4" /></TBtn>
          <Sep />
          <Dropdown label={<>Line: {lineHeight}</>} width={140}>
            {(close) => [1, 1.15, 1.5, 2, 2.5, 3].map((v) => (
              <button key={v} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); setLineHeight(v); setParagraphStyle("lineHeight", String(v)); close(); }}>{v}</button>
            ))}
          </Dropdown>
          <label className="text-xs text-muted-foreground ml-1">Before
            <input type="number" min={0} max={72} value={spaceBefore}
              onChange={(e) => { const v = Number(e.target.value) || 0; setSpaceBefore(v); setParagraphStyle("marginTop", v + "pt"); }}
              className="ml-1 h-7 w-14 px-1 rounded border border-border bg-background text-sm" /></label>
          <label className="text-xs text-muted-foreground ml-1">After
            <input type="number" min={0} max={72} value={spaceAfter}
              onChange={(e) => { const v = Number(e.target.value) || 0; setSpaceAfter(v); setParagraphStyle("marginBottom", v + "pt"); }}
              className="ml-1 h-7 w-14 px-1 rounded border border-border bg-background text-sm" /></label>
          <Dropdown label="Border">
            {(close) => ([
              ["None", "none"],
              ["Bottom", "0 0 1px 0 solid #888"],
              ["Box", "1px solid #888"],
              ["Left", "0 0 0 3px solid #888"],
              ["Shadow", "1px solid #888; box-shadow: 3px 3px 0 #ccc"],
            ] as [string, string][]).map(([label, val]) => (
              <button key={label} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (val === "none") setParagraphStyle("border", "none");
                  else if (val.includes("box-shadow")) {
                    setParagraphStyle("border", "1px solid #888");
                    setParagraphStyle("boxShadow", "3px 3px 0 #ccc");
                    setParagraphStyle("padding", "6px");
                  } else if (val.startsWith("0 0 1px 0")) {
                    setParagraphStyle("border", "none");
                    setParagraphStyle("borderBottom", "1px solid #888");
                    setParagraphStyle("paddingBottom", "4px");
                  } else if (val.startsWith("0 0 0 3px")) {
                    setParagraphStyle("border", "none");
                    setParagraphStyle("borderLeft", "3px solid #888");
                    setParagraphStyle("paddingLeft", "8px");
                  } else {
                    setParagraphStyle("border", val);
                    setParagraphStyle("padding", "6px");
                  }
                  close();
                }}>{label}</button>
            ))}
          </Dropdown>
        </div>

        {/* Row 4 — Insert */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          <Dropdown label="Styles" width={160}>
            {(close) => ([
              ["Normal", "p"], ["Heading 1", "h1"], ["Heading 2", "h2"], ["Heading 3", "h3"], ["Heading 4", "h4"],
              ["Title", "h1"], ["Subtitle", "h3"], ["Quote", "blockquote"],
            ] as [string, string][]).map(([label, tag]) => (
              <button key={label} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); setHeading(tag); close(); }}>{label}</button>
            ))}
          </Dropdown>
          <Dropdown label={<><TableIcon className="w-4 h-4" /></>} width={260}>
            {(close) => (
              <TableGrid onPick={(r, c) => { insertTable(r, c); close(); }} />
            )}
          </Dropdown>
          <label className="h-8 px-2 inline-flex items-center gap-1 rounded-md text-sm hover:bg-accent cursor-pointer" title="Insert image">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.currentTarget.value = ""; }} />
          </label>
          <TBtn onClick={() => exec("insertHorizontalRule")} title="Horizontal rule"><Minus className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => insertHTML('<hr class="wp-page-break" />')} title="Page break">PB</TBtn>
          <Dropdown label={<Sigma className="w-4 h-4" />} width={280}>
            {(close) => (
              <div className="grid grid-cols-8 gap-1 p-1">
                {SPECIAL_CHARS.map((ch) => (
                  <button key={ch} className="w-7 h-7 rounded hover:bg-accent text-base"
                    onMouseDown={(e) => { e.preventDefault(); insertHTML(ch); close(); }}>{ch}</button>
                ))}
              </div>
            )}
          </Dropdown>
          <TBtn onClick={() => insertHTML(new Date().toLocaleString())} title="Insert date/time"><Calendar className="w-4 h-4" /></TBtn>
        </div>

        {/* Row 5 — Layout */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          <Dropdown label={<>Size: {pageSize}</>} width={140}>
            {(close) => Object.keys(PAGE_SIZES).map((k) => (
              <button key={k} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); setPageSize(k as keyof typeof PAGE_SIZES); close(); }}>{k}</button>
            ))}
          </Dropdown>
          <Dropdown label={<>{orientation === "portrait" ? "Portrait" : "Landscape"}</>} width={140}>
            {(close) => (["portrait","landscape"] as const).map((o) => (
              <button key={o} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent capitalize"
                onMouseDown={(e) => { e.preventDefault(); setOrientation(o); close(); }}>{o}</button>
            ))}
          </Dropdown>
          <Dropdown label="Margins" width={140}>
            {(close) => Object.keys(MARGIN_PRESETS).map((k) => (
              <button key={k} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); setMargins(MARGIN_PRESETS[k]); close(); }}>{k}</button>
            ))}
          </Dropdown>
          <Dropdown label={<>Columns: {columns}</>} width={120}>
            {(close) => [1,2,3].map((n) => (
              <button key={n} className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); setColumns(n); close(); }}>{n}</button>
            ))}
          </Dropdown>
          <Dropdown label={<span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded border border-border" style={{ background: pageBg }} />Page bg</span>} width={220}>
            {(close) => (
              <div className="grid grid-cols-10 gap-1 p-1">
                {COLORS.map((c) => (
                  <button key={c} className="w-5 h-5 rounded border border-border" style={{ background: c }}
                    onMouseDown={(e) => { e.preventDefault(); setPageBg(c); close(); }} />
                ))}
              </div>
            )}
          </Dropdown>
        </div>

        {/* Row 6 — Review */}
        <div className="flex flex-wrap items-center gap-1 p-2 rounded-b-md">
          <TBtn onClick={() => exec("undo")} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => exec("redo")} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => setFindOpen(true)} title="Find & Replace (Ctrl+H)"><Search className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => setStatsOpen(true)} title="Word count">{stats.words} words</TBtn>
          <TBtn onClick={() => setSpellcheck((s) => !s)} active={spellcheck} title="Spell check">Spell</TBtn>
          <TBtn onClick={() => {
            const text = editorRef.current?.innerText || "";
            if (!text) return;
            const u = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          }} title="Read aloud"><Volume2 className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => setDarkUi((d) => !d)} title="Toggle dark UI">{darkUi ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</TBtn>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <label>Zoom
              <input type="range" min={50} max={200} step={10} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} className="mx-2 align-middle" />
              {zoom}%
            </label>
          </div>
        </div>
      </div>

      {/* Editor canvas */}
      <div className={`border-x border-b border-border rounded-b-xl overflow-auto ${darkUi ? "bg-zinc-800" : "bg-zinc-200"}`} style={{ minHeight: "70vh" }}>
        <div className="wp-print-area py-6 flex justify-center">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
            <div
              className="wp-page wp-editor shadow-2xl"
              style={{
                width: `${pageDims.w}mm`,
                minHeight: `${pageDims.h}mm`,
                background: pageBg,
                padding: `${margins.t}mm ${margins.r}mm ${margins.b}mm ${margins.l}mm`,
                columnCount: columns,
                columnGap: "1cm",
              }}
            >
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                dir={dir}
                spellCheck={spellcheck}
                onInput={updateStats}
                onKeyUp={updateCaret}
                onMouseUp={updateCaret}
                onKeyDown={onKeyDown}
                style={{ fontFamily, fontSize: `${fontSize}pt`, lineHeight, minHeight: `calc(${pageDims.h}mm - ${margins.t + margins.b}mm)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground px-2">
        <span>Page {currentPage} of {pageCount}</span>
        <span>{stats.words} words</span>
        <span>{stats.chars} chars ({stats.charsNoSpace} no spaces)</span>
        <span>Line {caretPos.line}, Col {caretPos.col}</span>
        <span>{dir.toUpperCase()}</span>
        <span>Zoom {zoom}%</span>
      </div>

      {/* Find & Replace modal */}
      {findOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setFindOpen(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Find & Replace</h3>
            <input className="w-full h-9 px-2 rounded border border-border bg-background text-sm mb-2" placeholder="Find" value={findText} onChange={(e) => setFindText(e.target.value)} />
            <input className="w-full h-9 px-2 rounded border border-border bg-background text-sm mb-3" placeholder="Replace with" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="h-8 px-3 text-sm rounded-md border border-border hover:bg-accent" onClick={() => doReplace(false)}>Replace</button>
              <button className="h-8 px-3 text-sm rounded-md border border-border hover:bg-accent" onClick={() => doReplace(true)}>Replace All</button>
              <button className="h-8 px-3 text-sm rounded-md bg-primary text-primary-foreground" onClick={() => setFindOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats modal */}
      {statsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setStatsOpen(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Document statistics</h3>
            <ul className="text-sm space-y-1">
              <li>Words: <b>{stats.words}</b></li>
              <li>Characters: <b>{stats.chars}</b></li>
              <li>Characters (no spaces): <b>{stats.charsNoSpace}</b></li>
              <li>Pages: <b>{pageCount}</b></li>
            </ul>
            <div className="flex justify-end mt-4">
              <button className="h-8 px-3 text-sm rounded-md bg-primary text-primary-foreground" onClick={() => setStatsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <HowToUse steps={[
        "Start typing in the page area — your document auto-saves locally every 30 seconds.",
        "Use the ribbon toolbar to format text, change fonts, add tables, images, lists, and more.",
        "Export your finished document as PDF, .docx, or .txt — nothing leaves your browser.",
      ]} />

      <ToolSeoContent
        title="Free Online Word Processor — Write Anywhere, No Signup"
        description="A full-featured browser-based word processor that works like Microsoft Word. No account, no installs, completely free."
        body={[
          "Skycally's online Word Processor gives you a complete writing environment right in your browser. Open a blank page or load an existing .docx, .txt, or .html file, and start writing immediately — no signup, no installs, no waiting. The familiar ribbon toolbar puts every formatting option at your fingertips, with real-time word and character counts in the status bar at the bottom of the page.",
          "Format text the way you want: choose from dozens of Google Fonts including Latin, Arabic, and Asian families, change sizes from 6 to 96pt, apply bold, italic, underline, strikethrough, subscript, superscript, text colors and highlights. Add bulleted or numbered lists with multiple styles, insert tables, images, special characters, headings, page breaks, and switch between portrait and landscape layouts. Full RTL support makes it ideal for Arabic, Hebrew, and Persian documents.",
          "Privacy is built in. Your document never leaves your device — everything is processed and auto-saved in your browser's local storage. Export your finished work as PDF, .docx, or .txt with a single click. The editor even works offline once the page has loaded, so you can keep writing from anywhere.",
        ]}
        faqs={[
          { question: "Can I open existing Word documents?", answer: "Yes. You can open .docx, .txt, and .html files directly in the editor." },
          { question: "Does it support Arabic and RTL languages?", answer: "Yes. Toggle RTL mode for full right-to-left support including Arabic, Hebrew, and Persian." },
          { question: "Can I export to PDF?", answer: "Yes. Use the Export to PDF button for a clean, print-ready PDF of your document." },
          { question: "Is my document saved automatically?", answer: "Your document is auto-saved in your browser's local storage every 30 seconds. Nothing is sent to any server." },
        ]}
      />

      <RelatedTools currentSlug="word-processor" />
    </ToolPageShell>
  );
}

// ---------------- Sub: table grid picker ----------------
function TableGrid({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div className="p-2">
      <div className="text-xs text-muted-foreground mb-1">{hover.r || 0} × {hover.c || 0}</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(10, 1fr)", gap: 2 }}>
        {Array.from({ length: 100 }).map((_, i) => {
          const r = Math.floor(i / 10) + 1;
          const c = (i % 10) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              onMouseEnter={() => setHover({ r, c })}
              onMouseDown={(e) => { e.preventDefault(); onPick(r, c); }}
              className={`w-5 h-5 border rounded-sm ${active ? "bg-primary border-primary" : "border-border bg-background"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
