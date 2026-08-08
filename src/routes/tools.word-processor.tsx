import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";
import { useCallback, useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { useEditor, EditorContent, Editor, Extension } from "@tiptap/react";
import { Node as TiptapNode } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Printer,
  Save,
  FileUp,
  FilePlus,
  FileDown,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Image as ImageIc,
  Table as TableIc,
  Minus,
  Search,
  Eraser,
  Volume2,
  Calendar,
  Ruler,
  FileText as FileTextIc,
  ChevronDown,
  X,
  Check,
  ArrowLeftRight,
  FileSearch,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Paintbrush,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/tools/word-processor")({
  head: () =>
    buildPageMeta({
      title: "Free Online Word Processor — No Signup, No Microsoft Account | Skycally",
      description:
        "Write and format documents free in your browser. No Google account, no Microsoft account needed. Supports Arabic RTL, drag-to-resize margins, and exports to PDF and fully formatted Word. Try Skycally's free word processor now.",
      path: "/tools/word-processor",
    }),
  component: WordProcessor,
});

// ---------- Fonts ----------
const FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Trebuchet MS",
  "Tahoma",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Playfair Display",
  "Merriweather",
  "Cairo",
  "Tajawal",
  "Amiri",
  "Scheherazade New",
  "Noto Sans JP",
  "Noto Sans SC",
  "Noto Sans KR",
];
const WEB_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Playfair Display",
  "Merriweather",
  "Cairo",
  "Tajawal",
  "Amiri",
  "Scheherazade New",
  "Noto Sans JP",
  "Noto Sans SC",
  "Noto Sans KR",
];
const GFONT_HREF = `https://fonts.googleapis.com/css2?${WEB_FONTS.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`).join("&")}&display=swap`;

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

const COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#cccccc",
  "#ffffff",
  "#cc0000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00cc00",
  "#00ffff",
  "#0066ff",
  "#9900ff",
  "#ff00ff",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
];

const SPECIAL_CHARS = [
  "©",
  "®",
  "™",
  "°",
  "±",
  "×",
  "÷",
  "→",
  "←",
  "↑",
  "↓",
  "★",
  "☆",
  "♦",
  "♥",
  "♣",
  "♠",
  "§",
  "¶",
  "•",
  "—",
  "–",
  "…",
  "«",
  "»",
  "“",
  "”",
  "‘",
  "’",
  "€",
  "£",
  "¥",
  "¢",
  "№",
  "✓",
  "✗",
  "✦",
  "➤",
];

// ---------- Page / margin constants ----------
const PAGE_WIDTH_PX = 794; // A4 width @ 96dpi
const DEFAULT_PAGE_HEIGHT_PX = 1123; // A4 height @ 96dpi
const PAGE_UNIT_PX = DEFAULT_PAGE_HEIGHT_PX; // alias: the height of one printable page
const PAGE_GAP_PX = 40; // visual gap drawn between consecutive pages (Word-style)
const PAGE_CYCLE_PX = PAGE_UNIT_PX + PAGE_GAP_PX; // one page + the gap that follows it
const PX_PER_CM = 37.8;
const PX_PER_IN = 96;
const DEFAULT_MARGIN = 96;
const MIN_MARGIN = 24;
const DEFAULT_MARGINS = { top: DEFAULT_MARGIN, right: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN };
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];
const DEFAULT_ZOOM = 100;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function pxToUnitLabel(px: number, unit: "cm" | "in") {
  const v = unit === "cm" ? px / PX_PER_CM : px / PX_PER_IN;
  return `${v.toFixed(2)} ${unit}`;
}

// ---------- Format Painter ----------
type PainterFormat = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  subscript: boolean;
  superscript: boolean;
  color: string | null;
  fontFamily: string | null;
  fontSize: string | null;
  highlight: string | null;
};

function capturePainterFormat(editor: Editor): PainterFormat {
  const ts = editor.getAttributes("textStyle") as any;
  const hl = editor.isActive("highlight") ? (editor.getAttributes("highlight") as any)?.color : null;
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    subscript: editor.isActive("subscript"),
    superscript: editor.isActive("superscript"),
    color: ts?.color || null,
    fontFamily: ts?.fontFamily || null,
    fontSize: ts?.fontSize || null,
    highlight: hl || null,
  };
}

function applyPainterFormat(editor: Editor, fmt: PainterFormat) {
  let chain: any = editor.chain().focus();
  chain = fmt.bold ? chain.setBold() : chain.unsetBold();
  chain = fmt.italic ? chain.setItalic() : chain.unsetItalic();
  chain = fmt.underline ? chain.setUnderline() : chain.unsetUnderline();
  chain = fmt.strike ? chain.setStrike() : chain.unsetStrike();
  chain = fmt.subscript ? chain.setSubscript() : chain.unsetSubscript();
  chain = fmt.superscript ? chain.setSuperscript() : chain.unsetSuperscript();
  chain = fmt.color ? chain.setColor(fmt.color) : chain.unsetColor();
  chain = fmt.fontFamily ? chain.setFontFamily(fmt.fontFamily) : chain.unsetFontFamily();
  chain = fmt.fontSize ? chain.setFontSize(fmt.fontSize) : chain.unsetFontSize();
  chain = fmt.highlight ? chain.setHighlight({ color: fmt.highlight }) : chain.unsetHighlight();
  chain.run();
}

// ---------- Custom extensions ----------
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attrs: any) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["paragraph", "heading"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (attrs: any) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lh: string) =>
        ({ tr, state, dispatch }: any) => {
          const { from, to } = state.selection;
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: lh });
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    } as any;
  },
});

const Direction = Extension.create({
  name: "direction",
  addOptions() {
    return { types: ["paragraph", "heading", "listItem", "blockquote"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute("dir"),
            renderHTML: (attrs: any) => (attrs.dir ? { dir: attrs.dir } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setDirection:
        (dir: "ltr" | "rtl") =>
        ({ tr, state, dispatch }: any) => {
          const { from, to } = state.selection;
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    } as any;
  },
});

// A real, atomic page-break node. Inserted as { type: "pageBreak" } so TipTap
// keeps its identity (a plain <hr class="..."> loses custom attributes on parse).
const PageBreak = TiptapNode.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "true", class: "wp-page-break", contenteditable: "false" }];
  },
});

// The page forces a dark default text color with `!important` (so the page stays
// readable no matter the site's light/dark theme). That same rule was silently
// overriding the Color extension's inline `style="color: ..."`. Re-emitting the
// color with `!important` lets the user's chosen color win again, while the
// stored attribute value (read by the .docx exporter) is unchanged.
const TextColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          color: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.color || null,
            renderHTML: (attrs: any) => (attrs.color ? { style: `color: ${attrs.color} !important` } : {}),
          },
        },
      },
    ];
  },
});

// ---------- Templates ----------
const TEMPLATES: Record<string, string> = {
  blank: `<p></p>`,
  cv: `<h1 style="text-align:center">Your Name</h1>
<p style="text-align:center"><em>your.email@example.com · +1 555 000 0000 · City, Country</em></p>
<h2>Experience</h2>
<p><strong>Senior Role</strong> — Company · 2022–Present</p>
<ul><li>Led a team of 5 engineers shipping product features.</li><li>Improved performance by 40%.</li></ul>
<h2>Education</h2>
<p><strong>B.Sc. Computer Science</strong> — University Name · 2018–2022</p>
<h2>Skills</h2>
<p>JavaScript, TypeScript, React, Node.js, SQL, Design Systems.</p>`,
  cover: `<p style="text-align:right">${new Date().toLocaleDateString()}</p>
<p>Hiring Manager<br>Company Name<br>Company Address</p>
<p>Dear Hiring Manager,</p>
<p>I am writing to express my strong interest in the [Position] role at [Company]. With [X years] of experience in [field], I am excited about the opportunity to contribute.</p>
<p>In my current role I have [achievement]. I am particularly drawn to [Company] because [reason].</p>
<p>Thank you for your time and consideration. I look forward to discussing how my skills can support your team.</p>
<p>Sincerely,<br>Your Name</p>`,
  invoice: `<h1>INVOICE</h1>
<p><strong>From:</strong> Your Company<br><strong>To:</strong> Client Name</p>
<p><strong>Invoice #:</strong> 0001 &nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<table><tbody>
<tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr>
<tr><td>Service item 1</td><td>1</td><td>$100</td><td>$100</td></tr>
<tr><td>Service item 2</td><td>2</td><td>$50</td><td>$100</td></tr>
<tr><td colspan="3"><strong>Total</strong></td><td><strong>$200</strong></td></tr>
</tbody></table>
<p><strong>Payment details:</strong> Bank — IBAN — Reference</p>`,
  essay: `<h1 style="text-align:center">Essay Title</h1>
<h2>Introduction</h2><p>Open with a hook and state your thesis clearly.</p>
<h2>Body — Argument One</h2><p>Support your first claim with evidence.</p>
<h2>Body — Argument Two</h2><p>Develop your second claim with examples.</p>
<h2>Body — Argument Three</h2><p>Address counterarguments and reinforce your view.</p>
<h2>Conclusion</h2><p>Restate your thesis and summarize key points.</p>`,
};

// ---------- Main component ----------
function WordProcessor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <ToolPageShell
      title="Free Online Word Processor — Write Anywhere, No Account Needed"
      description="Write and format documents free in your browser. No Google account, no Microsoft account needed. Supports Arabic RTL, drag-to-resize margins, and exports to PDF and fully formatted Word."
    >
      {mounted ? <Editor4U /> : <div className="h-[600px] rounded-2xl bg-secondary/50 animate-pulse" />}

      <p className="text-sm text-muted-foreground mt-10">
        Curious about the small structural bug that meant this page (and 38 others) had no ad slot at all until
        recently? Read{" "}
        <Link to="/blog/silent-bug-costing-ad-revenue-39-pages" className="text-[var(--cyan-brand)] hover:underline">
          how we found and fixed it
        </Link>
        .
      </p>

      <AdZone id="word-processor-mid" size="728x90" />

      <HowToUse
        steps={[
          "Type or paste your content into the page below.",
          "Use the toolbar to format text, insert tables, images, and lists.",
          "Drag the markers on the top and side rulers to set custom page margins.",
          "Export your document as PDF, a fully formatted Word (.docx) file, or plain text.",
        ]}
      />

      <ToolSeoContent
        title="Free Online Word Processor — Write, Format & Export Documents in Your Browser"
        description="A free browser-based word processor with A4 page layout, rich formatting, RTL/Arabic support, and export to .docx and PDF. No account, no download, no signup required."
        body={[
          "Skycally's Word Processor is a full-featured document editor that runs entirely in your browser. It uses the same TipTap editor engine trusted by thousands of developers, delivering a clean A4 page layout with draggable rulers, real margin control, and the formatting tools you expect — headings, bold, italic, underline, text color, highlight, tables, images, bulleted and numbered lists, and text alignment. Your document auto-saves to your browser every 30 seconds, so your work is never lost if you accidentally close the tab.",
          "Exporting is straightforward. Click the File menu to download your document as a fully formatted .docx file compatible with Microsoft Word, LibreOffice, and Google Docs — all formatting including fonts, colors, bold, lists, tables, and embedded images is preserved. You can also export as PDF using your browser's built-in print dialog, or copy the plain text if you just need the words. For longer documents, Reading Mode eliminates all toolbars and gives you a distraction-free full-screen view.",
          "One feature that sets this editor apart is full right-to-left (RTL) writing support. Switch text direction with one click and choose from Arabic-optimized fonts including Cairo, Tajawal, Amiri, and Scheherazade New. This makes it one of the few free browser-based editors that handles Arabic, Hebrew, and other RTL languages correctly without any plugin or extension. The editor also supports Voice Typing on compatible browsers, so you can dictate your document hands-free.",
          "Because everything runs locally in your browser, your documents are completely private. No text is ever uploaded to a server. This makes the editor suitable for sensitive documents — contracts, personal letters, academic work — where privacy matters. There are no file size limits, no page count limits, and no watermarks on exported documents.",
        ]}
        faqs={[
          {
            question: "Do I need a Microsoft or Google account to use this?",
            answer:
              "No. There is no signup, no login, and no account of any kind. Open the page and start writing immediately. Your document is saved automatically in your browser's local storage.",
          },
          {
            question: "Can I export to Microsoft Word (.docx)?",
            answer:
              "Yes. Click the File menu and choose Export as .docx. The downloaded file preserves all your formatting — fonts, colors, bold, italic, headings, lists, tables, and embedded images — and opens correctly in Microsoft Word, LibreOffice, and Google Docs.",
          },
          {
            question: "Is Arabic and RTL writing supported?",
            answer:
              "Yes. Click the RTL button in the toolbar to switch text direction to right-to-left. You can also select Arabic-optimized fonts including Cairo, Tajawal, Amiri, and Scheherazade New from the font picker. Both Arabic and Hebrew text render correctly.",
          },
          {
            question: "Are my documents saved automatically?",
            answer:
              "Yes. The editor auto-saves your document to your browser's localStorage every 30 seconds. Your work is restored automatically the next time you open the page. Note that clearing your browser's site data will erase saved documents — export important work as .docx or PDF for permanent storage.",
          },
          {
            question: "Can I adjust page margins?",
            answer:
              "Yes. Enable the rulers from the toolbar, then drag the shaded margin handles on the top and left rulers to set custom margins — useful for academic assignments, cover letters, or documents with specific formatting requirements.",
          },
          {
            question: "Does it work offline?",
            answer:
              "Once the page has loaded, the editor works fully offline for typing, formatting, and auto-saving. Google Fonts and the .docx export library require an internet connection on first load but are cached by the browser for subsequent use.",
          },
          {
            question: "Is there a page or word count limit?",
            answer:
              "No. There are no page limits, word limits, or file size restrictions. The editor handles documents of any length, though very large documents (50,000+ words) may become slower depending on your device's performance.",
          },
          {
            question: "Are my documents private?",
            answer:
              "Completely. All text processing happens locally in your browser. Nothing you type is ever transmitted to any server. This makes it safe for sensitive documents including contracts, personal letters, and confidential work.",
          },
        ]}
      />

      <RelatedTools currentSlug="word-processor" />
    </ToolPageShell>
  );
}

// ---------- The editor ----------
function Editor4U() {
  // Inject Google Fonts once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("wp-gfonts")) return;
    const l = document.createElement("link");
    l.id = "wp-gfonts";
    l.rel = "stylesheet";
    l.href = GFONT_HREF;
    document.head.appendChild(l);
  }, []);

  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("wp:hero_dismissed") === "1") setHeroVisible(false);
  }, []);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showRulers, setShowRulers] = useState(true);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [findOpen, setFindOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState<number>(() => {
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("wp:zoom") : null;
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && ZOOM_PRESETS.includes(n)) return n;
      }
    } catch {}
    return DEFAULT_ZOOM;
  });
  const updateZoom = useCallback((next: number) => {
    setZoomPercent(next);
    try {
      localStorage.setItem("wp:zoom", String(next));
    } catch {}
  }, []);
  const scale = fitScale * (zoomPercent / 100);
  const [painterFormat, setPainterFormat] = useState<PainterFormat | null>(null);

  // Fullscreen workspace mode — covers the whole viewport, exits on Escape
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // ── Reading Mode: hides toolbar, shows clean page only ──
  const [isReadingMode, setIsReadingMode] = useState(false);
  useEffect(() => {
    if (!isReadingMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsReadingMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isReadingMode]);

  // ── Read Aloud ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSpeakPopup, setShowSpeakPopup] = useState(false);
  const [speakLang, setSpeakLang] = useState("en-US");

  // ── Voice Typing ──
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en-US");
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Live Word Count ──
  const [liveWordCount, setLiveWordCount] = useState({ words: 0, chars: 0 });

  const painterApplyingRef = useRef(false);
  const [pageMinHeight, setPageMinHeight] = useState(PAGE_UNIT_PX);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Page margins (px) — persisted so a writer's preferred layout sticks around
  const [margins, setMargins] = useState<{ top: number; right: number; bottom: number; left: number }>(() => {
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("wp:margins") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.top === "number" &&
          typeof parsed?.right === "number" &&
          typeof parsed?.bottom === "number" &&
          typeof parsed?.left === "number"
        ) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_MARGINS;
  });

  const updateMargins = useCallback((patch: Partial<typeof margins>) => {
    setMargins((m) => {
      const next = { ...m, ...patch };
      try {
        localStorage.setItem("wp:margins", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetMargins = useCallback(() => updateMargins(DEFAULT_MARGINS), [updateMargins]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      TextColor,
      Highlight.configure({ multicolor: true }),
      FontFamily.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ allowBase64: true, inline: false }),
      Placeholder.configure({ placeholder: "Start writing your document…" }),
      FontSize,
      LineHeight,
      Direction,
      PageBreak,
    ],
    content:
      typeof localStorage !== "undefined"
        ? localStorage.getItem("skycally_word_doc") ||
          localStorage.getItem("wp:doc") ||
          `<h1>Welcome to Skycally Word Processor</h1><p>Start typing here. Use the toolbar above to format your document.</p>`
        : "",
    editorProps: {
      attributes: {
        class: "wp-editor-content focus:outline-none",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveState("saving");
      scheduleSave(editor.getHTML());
    },
  });

  // Debounced + interval autosave (every 30s), with quota-aware error feedback
  const saveTimer = useRef<any>(null);
  const scheduleSave = useCallback((html: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem("skycally_word_doc", html);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1200);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (editor) {
        try {
          localStorage.setItem("skycally_word_doc", editor.getHTML());
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }
    }, 30000);
    return () => clearInterval(id);
  }, [editor]);

  // Mobile scale
  useEffect(() => {
    const updateScale = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const target = Math.min(1, (w - 32) / PAGE_WIDTH_PX);
      setFitScale(target);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Snap the page height to whole "page + gap" units based on the editor's
  // real content height, so the page background and the ruler can render
  // discrete, Word-like pages instead of one endless sheet.
  useEffect(() => {
    if (!editor) return;
    const contentEl = editor.view.dom as HTMLElement;
    const update = () => {
      const contentHeight = contentEl.scrollHeight;
      const total = margins.top + contentHeight + margins.bottom;
      const segments = Math.max(1, Math.ceil((total + PAGE_GAP_PX) / PAGE_CYCLE_PX));
      setPageMinHeight(segments * PAGE_UNIT_PX + (segments - 1) * PAGE_GAP_PX);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [editor, margins.top, margins.bottom]);

  // Keyboard shortcuts: Ctrl+S, Ctrl+P, Ctrl+F, Ctrl+H, Escape (stop Format Painter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && painterFormat) {
        setPainterFormat(null);
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        exportTxt(editor);
      } else if (k === "p") {
        e.preventDefault();
        window.print();
      } else if (k === "f" || k === "h") {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, painterFormat]);

  // Format Painter: while a format is "picked up", apply it to the next selection
  useEffect(() => {
    if (!editor || !painterFormat) return;
    const handler = () => {
      if (painterApplyingRef.current) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      painterApplyingRef.current = true;
      applyPainterFormat(editor, painterFormat);
      painterApplyingRef.current = false;
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor, painterFormat]);

  // ── Voice Typing: startListening needs editor ──
  const startListening = useCallback(
    (lang: string) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice typing is not supported in this browser. Try Chrome or Edge.");
        return;
      }
      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e: any) => {
        const text = e.results[e.results.length - 1][0].transcript;
        if (editor)
          editor
            .chain()
            .focus()
            .insertContent(text + " ")
            .run();
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
      setShowVoicePopup(false);
    },
    [editor],
  );

  // ── Live Word Count effect ──
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText();
      const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      setLiveWordCount({ words, chars: text.length });
    };
    editor.on("update", update);
    update();
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  if (!editor) return <div className="h-[600px] rounded-2xl bg-secondary/50 animate-pulse" />;

  return (
    <div className={`wp-root${isFullscreen ? " wp-fullscreen" : ""}${isReadingMode ? " wp-reading-mode" : ""}`}>
      <style>{WP_CSS}</style>

      {heroVisible && (
        <div className="wp-hero">
          <span>✨ No Google account. No Microsoft account. Just open and write.</span>
          <button
            aria-label="Dismiss"
            onClick={() => {
              setHeroVisible(false);
              try {
                localStorage.setItem("wp:hero_dismissed", "1");
              } catch {}
            }}
            className="wp-hero-x"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Toolbar
        editor={editor}
        saveState={saveState}
        showRulers={showRulers}
        setShowRulers={setShowRulers}
        unit={unit}
        setUnit={setUnit}
        onFind={() => setFindOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
        onResetMargins={resetMargins}
        margins={margins}
        zoomPercent={zoomPercent}
        onZoomChange={updateZoom}
        painterArmed={!!painterFormat}
        onTogglePainter={() => setPainterFormat((cur) => (cur ? null : capturePainterFormat(editor)))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        isReadingMode={isReadingMode}
        onToggleReadingMode={() => setIsReadingMode((v) => !v)}
        isListening={isListening}
        onToggleVoice={() => {
          if (isListening) {
            stopListening();
          } else {
            setShowVoicePopup(true);
          }
        }}
        isSpeaking={isSpeaking}
        onToggleSpeak={() => {
          if (isSpeaking) {
            stopSpeak();
            setIsSpeaking(false);
          } else {
            setShowSpeakPopup(true);
          }
        }}
      />

      <div className="wp-canvas" ref={canvasRef}>
        <div
          className="wp-stage"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: PAGE_WIDTH_PX,
            marginInline: "auto",
          }}
        >
          {showRulers && (
            <TopRuler
              unit={unit}
              marginLeft={margins.left}
              marginRight={margins.right}
              scale={scale}
              onChange={(patch) => updateMargins(patch)}
            />
          )}
          <div style={{ display: "flex" }}>
            {showRulers && (
              <LeftRuler
                unit={unit}
                marginTop={margins.top}
                marginBottom={margins.bottom}
                scale={scale}
                height={pageMinHeight}
                onChange={(patch) => updateMargins(patch)}
              />
            )}
            <div
              className={`wp-page${painterFormat ? " wp-painting" : ""}`}
              style={{
                minHeight: pageMinHeight,
                paddingTop: margins.top,
                paddingRight: margins.right,
                paddingBottom: margins.bottom,
                paddingLeft: margins.left,
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {findOpen && <FindReplace editor={editor} onClose={() => setFindOpen(false)} />}
      {templatesOpen && <TemplatesModal editor={editor} onClose={() => setTemplatesOpen(false)} />}

      {/* ── Voice Typing language popup ── */}
      {/* ── Read Aloud language popup ── */}
      {showSpeakPopup && (
        <div className="wp-popup-overlay" onClick={() => setShowSpeakPopup(false)}>
          <div className="wp-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="wp-popup-title">Read Aloud — Choose Language</h3>
            <div className="wp-popup-grid">
              {[
                { code: "en-US", label: "English (US)" },
                { code: "en-GB", label: "English (UK)" },
                { code: "ar-SA", label: "Arabic" },
                { code: "fr-FR", label: "French" },
                { code: "es-ES", label: "Spanish" },
                { code: "de-DE", label: "German" },
                { code: "pt-BR", label: "Portuguese" },
                { code: "it-IT", label: "Italian" },
                { code: "zh-CN", label: "Chinese" },
              ].map((l) => (
                <button
                  key={l.code}
                  className={speakLang === l.code ? "wp-popup-btn wp-popup-btn--active" : "wp-popup-btn"}
                  onClick={() => setSpeakLang(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="wp-popup-actions">
              <button className="wp-popup-cancel" onClick={() => setShowSpeakPopup(false)}>
                Cancel
              </button>
              <button
                className="wp-popup-confirm"
                onClick={() => {
                  setShowSpeakPopup(false);
                  setIsSpeaking(true);
                  speak(editor.getText(), speakLang, () => setIsSpeaking(false));
                }}
              >
                Start Reading
              </button>
            </div>
          </div>
        </div>
      )}
      {showVoicePopup && (
        <div className="wp-overlay" onClick={() => setShowVoicePopup(false)}>
          <div className="wp-popup" onClick={(e) => e.stopPropagation()}>
            <p className="wp-popup-title">🎤 Voice Typing — Select Language</p>
            {[
              { code: "en-US", label: "English (US)" },
              { code: "en-GB", label: "English (UK)" },
              { code: "ar-SA", label: "العربية" },
              { code: "fr-FR", label: "Français" },
              { code: "es-ES", label: "Español" },
              { code: "de-DE", label: "Deutsch" },
              { code: "zh-CN", label: "中文 (普通话)" },
              { code: "pt-BR", label: "Português (BR)" },
            ].map(({ code, label }) => (
              <button
                key={code}
                className={`wp-popup-item${voiceLang === code ? " wp-popup-item--active" : ""}`}
                onClick={() => {
                  setVoiceLang(code);
                  startListening(code);
                }}
              >
                {label}
              </button>
            ))}
            <button className="wp-popup-cancel" onClick={() => setShowVoicePopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Live Word Count Bar ── */}
      {!isReadingMode && (
        <div className="wp-word-bar">
          <span>{liveWordCount.words.toLocaleString()} words</span>
          <span className="wp-word-bar-sep">·</span>
          <span>{liveWordCount.chars.toLocaleString()} characters</span>
          {isListening && (
            <>
              <span className="wp-word-bar-sep">·</span>
              <span className="wp-word-bar-listening">🎤 Listening…</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Toolbar ----------
function Toolbar({
  editor,
  saveState,
  showRulers,
  setShowRulers,
  unit,
  setUnit,
  onFind,
  onTemplates,
  onResetMargins,
  margins,
  zoomPercent,
  onZoomChange,
  painterArmed,
  onTogglePainter,
  isFullscreen,
  onToggleFullscreen,
  isReadingMode,
  onToggleReadingMode,
  isListening,
  onToggleVoice,
  isSpeaking,
  onToggleSpeak,
}: {
  editor: Editor;
  saveState: "idle" | "saving" | "saved" | "error";
  showRulers: boolean;
  setShowRulers: (v: boolean) => void;
  unit: "cm" | "in";
  setUnit: (v: "cm" | "in") => void;
  onFind: () => void;
  onTemplates: () => void;
  onResetMargins: () => void;
  margins: { top: number; right: number; bottom: number; left: number };
  zoomPercent: number;
  onZoomChange: (v: number) => void;
  painterArmed: boolean;
  onTogglePainter: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isReadingMode: boolean;
  onToggleReadingMode: () => void;
  isListening: boolean;
  onToggleVoice: () => void;
  isSpeaking: boolean;
  onToggleSpeak: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [lhOpen, setLhOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openFile = async (f: File) => {
    const name = f.name.toLowerCase();
    if (name.endsWith(".txt")) {
      const t = await f.text();
      editor.commands.setContent(`<p>${t.replace(/\n/g, "</p><p>")}</p>`);
    } else if (name.endsWith(".html") || name.endsWith(".htm")) {
      editor.commands.setContent(await f.text());
    } else if (name.endsWith(".docx")) {
      const mammoth: any = await import("mammoth");
      const buf = await f.arrayBuffer();
      const r = await mammoth.convertToHtml({ arrayBuffer: buf });
      editor.commands.setContent(r.value || "<p></p>");
    } else {
      alert("Unsupported file type. Use .txt, .html, or .docx");
    }
  };

  const insertImage = async (f: File) => {
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    });
    editor.chain().focus().setImage({ src: dataUrl }).run();
  };

  const exportDocx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const docxMod: any = await import("docx");
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        HeadingLevel,
        AlignmentType,
        Table: DocxTable,
        TableRow: DocxTableRow,
        TableCell: DocxTableCell,
        BorderStyle,
        WidthType,
        ShadingType,
        ImageRun,
        PageBreak: DocxPageBreak,
        LevelFormat,
      } = docxMod;

      const json = editor.getJSON();

      // ---- Collect & pre-load every embedded (base64) image ----
      const imageCache = new Map<string, { width: number; height: number; data: Uint8Array; type: string }>();
      const collectImageSrcs = (node: any, set: Set<string>) => {
        if (node.type === "image" && typeof node.attrs?.src === "string" && node.attrs.src.startsWith("data:image/")) {
          set.add(node.attrs.src);
        }
        (node.content || []).forEach((child: any) => collectImageSrcs(child, set));
      };
      const srcs = new Set<string>();
      collectImageSrcs(json, srcs);
      for (const src of srcs) {
        try {
          const dims = await loadImageDims(src, 600);
          imageCache.set(src, { ...dims, data: dataUrlToUint8Array(src), type: dataUrlImageType(src) });
        } catch {
          // skip images that fail to decode
        }
      }

      const headingMap: any = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      };
      const alignMap: any = {
        left: AlignmentType.LEFT,
        center: AlignmentType.CENTER,
        right: AlignmentType.RIGHT,
        justify: AlignmentType.JUSTIFIED,
      };

      const sanitizeFont = (v: any): string | undefined => {
        if (typeof v !== "string") return undefined;
        const first = v
          .split(",")[0]
          ?.trim()
          .replace(/^["']|["']$/g, "");
        if (!first) return undefined;
        const generic = new Set([
          "serif",
          "sans-serif",
          "monospace",
          "cursive",
          "fantasy",
          "system-ui",
          "ui-serif",
          "ui-sans-serif",
          "ui-monospace",
        ]);
        if (generic.has(first.toLowerCase())) return undefined;
        return first;
      };
      const sanitizeHex = (v: any): string | undefined => {
        if (typeof v !== "string") return undefined;
        let s = v.trim();
        const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
        if (rgb) {
          const toHex = (n: string) =>
            Math.max(0, Math.min(255, parseInt(n, 10)))
              .toString(16)
              .padStart(2, "0");
          return (toHex(rgb[1]) + toHex(rgb[2]) + toHex(rgb[3])).toUpperCase();
        }
        if (s.startsWith("#")) s = s.slice(1);
        if (/^[0-9a-fA-F]{3}$/.test(s))
          s = s
            .split("")
            .map((c) => c + c)
            .join("");
        if (/^[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
        return undefined;
      };
      const sanitizeSizeHalfPoints = (v: any): number | undefined => {
        if (v == null) return undefined;
        const n = parseFloat(String(v));
        if (!isFinite(n) || n <= 0) return undefined;
        return Math.max(2, Math.min(800, Math.round(n * 2)));
      };

      const marksToRunProps = (marks: any[] = [], rtl: boolean, safeMode = false) => {
        const props: any = {};
        if (rtl) props.rightToLeft = true;
        for (const m of marks) {
          switch (m.type) {
            case "bold":
              props.bold = true;
              break;
            case "italic":
              props.italics = true;
              break;
            case "underline":
              props.underline = {};
              break;
            case "strike":
              props.strike = true;
              break;
            case "subscript":
              props.subScript = true;
              break;
            case "superscript":
              props.superScript = true;
              break;
            case "textStyle": {
              if (safeMode) break;
              const a = m.attrs || {};
              const color = sanitizeHex(a.color);
              if (color) props.color = color;
              const size = sanitizeSizeHalfPoints(a.fontSize);
              if (size) props.size = size;
              const font = sanitizeFont(a.fontFamily);
              if (font) props.font = font;
              break;
            }
            case "highlight": {
              if (safeMode) break;
              const a = m.attrs || {};
              try {
                const hl = hexToDocxHighlight(a.color);
                if (hl) props.highlight = hl;
              } catch {}
              break;
            }
          }
        }
        return props;
      };

      let safeMode = false;
      const inlineToRuns = (content: any[] = [], rtl: boolean): any[] => {
        const runs: any[] = [];
        for (const node of content) {
          if (node.type === "text") {
            try {
              runs.push(new TextRun({ text: node.text || "", ...marksToRunProps(node.marks, rtl, safeMode) }));
            } catch {
              runs.push(new TextRun({ text: node.text || "" }));
            }
          } else if (node.type === "hardBreak") {
            runs.push(new TextRun({ text: "", break: 1 }));
          }
        }
        return runs.length ? runs : [new TextRun({ text: "" })];
      };

      const lineSpacing = (lh?: string) => {
        if (!lh) return undefined;
        const v = parseFloat(lh);
        if (isNaN(v)) return undefined;
        return { line: Math.round(v * 240), lineRule: "auto" };
      };

      // Recursively turns TipTap JSON blocks into docx Paragraphs / Tables
      const walkBlocks = (
        nodes: any[] = [],
        opts: { listRef?: string; listLevel?: number; indent?: number } = {},
      ): any[] => {
        const out: any[] = [];
        for (const node of nodes || []) {
          const attrs = node.attrs || {};
          const rtl = attrs.dir === "rtl";
          const indent = opts.indent ? { left: opts.indent } : undefined;
          const numbering =
            opts.listRef !== undefined ? { reference: opts.listRef, level: opts.listLevel || 0 } : undefined;

          switch (node.type) {
            case "paragraph": {
              out.push(
                new Paragraph({
                  children: inlineToRuns(node.content, rtl),
                  alignment: alignMap[attrs.textAlign],
                  bidirectional: rtl || undefined,
                  spacing: lineSpacing(attrs.lineHeight),
                  indent,
                  numbering,
                }),
              );
              break;
            }
            case "heading": {
              out.push(
                new Paragraph({
                  heading: headingMap[attrs.level] || HeadingLevel.HEADING_1,
                  children: inlineToRuns(node.content, rtl),
                  alignment: alignMap[attrs.textAlign],
                  bidirectional: rtl || undefined,
                  indent,
                }),
              );
              break;
            }
            case "bulletList": {
              const level = Math.min((opts.listLevel ?? -1) + 1, 4);
              (node.content || []).forEach((li: any) => {
                out.push(
                  ...walkBlocks(li.content, { ...opts, listRef: "wp-bullet", listLevel: level, indent: undefined }),
                );
              });
              break;
            }
            case "orderedList": {
              const level = Math.min((opts.listLevel ?? -1) + 1, 4);
              (node.content || []).forEach((li: any) => {
                out.push(
                  ...walkBlocks(li.content, { ...opts, listRef: "wp-number", listLevel: level, indent: undefined }),
                );
              });
              break;
            }
            case "blockquote": {
              out.push(...walkBlocks(node.content, { ...opts, listRef: undefined, indent: (opts.indent || 0) + 720 }));
              break;
            }
            case "horizontalRule": {
              out.push(
                new Paragraph({
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" } },
                  spacing: { before: 100, after: 100 },
                }),
              );
              break;
            }
            case "pageBreak": {
              out.push(new Paragraph({ children: [new DocxPageBreak()] }));
              break;
            }
            case "image": {
              const src = attrs.src as string | undefined;
              const cached = src ? imageCache.get(src) : undefined;
              if (cached) {
                out.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: cached.data,
                        type: cached.type,
                        transformation: { width: cached.width, height: cached.height },
                      }),
                    ],
                  }),
                );
              } else {
                out.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: attrs.alt ? `[Image: ${attrs.alt}]` : "[Image]",
                        italics: true,
                        color: "999999",
                      }),
                    ],
                  }),
                );
              }
              break;
            }
            case "table": {
              const rows = (node.content || []).map((row: any) => {
                const isHeaderRow = (row.content || []).every((c: any) => c.type === "tableHeader");
                const cells = (row.content || []).map((cell: any) => {
                  const cellBlocks = walkBlocks(cell.content);
                  const isHeader = cell.type === "tableHeader" || isHeaderRow;
                  return new DocxTableCell({
                    children: cellBlocks.length ? cellBlocks : [new Paragraph("")],
                    shading: isHeader ? { fill: "F0F0F0", type: ShadingType.CLEAR, color: "auto" } : undefined,
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  });
                });
                return new DocxTableRow({ children: cells });
              });
              if (rows.length) {
                out.push(new DocxTable({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
              }
              break;
            }
            default: {
              if (node.content) out.push(...walkBlocks(node.content, opts));
              break;
            }
          }
        }
        return out;
      };

      const numberingLevels = (format: any, textFn: (lvl: number) => string) =>
        [0, 1, 2, 3, 4].map((lvl) => ({
          level: lvl,
          format,
          text: textFn(lvl),
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720 * (lvl + 1), hanging: 260 } } },
        }));

      const buildDoc = () => {
        const children = walkBlocks(json.content || []);
        return new Document({
          numbering: {
            config: [
              {
                reference: "wp-bullet",
                levels: numberingLevels(LevelFormat.BULLET, (lvl) => (lvl % 2 === 0 ? "•" : "◦")),
              },
              {
                reference: "wp-number",
                levels: numberingLevels(LevelFormat.DECIMAL, (lvl) => `%${lvl + 1}.`),
              },
            ],
          },
          sections: [
            {
              properties: {
                page: {
                  // A4 in twips (1px = 15 twips at 96dpi, 1440 twips = 1in)
                  size: { width: 11906, height: 16838 },
                  margin: {
                    top: Math.round(margins.top * 15),
                    right: Math.round(margins.right * 15),
                    bottom: Math.round(margins.bottom * 15),
                    left: Math.round(margins.left * 15),
                  },
                },
              },
              children: children.length ? children : [new Paragraph("")],
            },
          ],
        });
      };

      let blob: Blob;
      try {
        blob = await Packer.toBlob(buildDoc());
      } catch (packErr) {
        // Safe-mode fallback: strip styling marks (color/font/size/highlight)
        // so the user always gets a downloadable .docx even with exotic input.
        console.warn("[word-processor] docx export hit an error, retrying in safe mode", packErr);
        safeMode = true;
        blob = await Packer.toBlob(buildDoc());
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[word-processor] docx export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const btn = "wp-btn";
  const active = (on: boolean) => `${btn}${on ? " wp-btn-active" : ""}`;

  return (
    <div className="wp-toolbar">
      {/* Row 1: File */}
      <div className="wp-row">
        <button
          className={btn}
          onClick={() => {
            if (confirm("Start a new blank document?")) editor.commands.setContent("<p></p>");
          }}
          title="New"
        >
          <FilePlus className="w-4 h-4" />
          New
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()} title="Open">
          <FileUp className="w-4 h-4" />
          Open
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.html,.htm,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])}
        />
        <button className={btn} onClick={() => exportTxt(editor)} title="Save .txt">
          <Save className="w-4 h-4" />
          Save
        </button>
        <button className={btn} onClick={() => window.print()} title="Export PDF">
          <FileDown className="w-4 h-4" />
          PDF
        </button>
        <button className={btn} onClick={exportDocx} title="Export .docx" disabled={exporting}>
          <FileDown className="w-4 h-4" />
          {exporting ? "Exporting…" : ".docx"}
        </button>
        <button className={btn} onClick={() => window.print()} title="Print">
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button className={btn} onClick={onTemplates} title="Templates">
          <FileTextIc className="w-4 h-4" />
          Templates
        </button>
        <div className="wp-spacer" />
        <SaveBadge state={saveState} />
      </div>

      {/* Row 2: Font */}
      <div className="wp-row wp-row-justify">
        <select
          className="wp-select"
          style={{ width: 160 }}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          defaultValue=""
          title="Font family"
        >
          <option value="">Font</option>
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="wp-select"
          style={{ width: 72 }}
          onChange={(e) => (editor.chain().focus() as any).setFontSize(`${e.target.value}pt`).run()}
          defaultValue="12"
          title="Font size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button aria-label="Bold (Ctrl+B)"
          className={active(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button aria-label="Italic (Ctrl+I)"
          className={active(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button aria-label="Underline (Ctrl+U)"
          className={active(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button aria-label="Strike"
          className={active(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strike"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <button aria-label="Subscript"
          className={active(editor.isActive("subscript"))}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <SubIcon className="w-4 h-4" />
        </button>
        <button aria-label="Superscript"
          className={active(editor.isActive("superscript"))}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <SupIcon className="w-4 h-4" />
        </button>

        <Popover
          open={colorOpen}
          setOpen={setColorOpen}
          trigger={
            <button className={btn} title="Text color">
              <span
                className="w-4 h-4 rounded-sm border border-border"
                style={{ background: editor.getAttributes("textStyle").color || "#000" }}
              />
              A
            </button>
          }
        >
          <ColorGrid
            current={editor.getAttributes("textStyle").color}
            onPick={(c) => {
              editor.chain().focus().setColor(c).run();
              setColorOpen(false);
            }}
          />
        </Popover>

        <Popover
          open={hlOpen}
          setOpen={setHlOpen}
          trigger={
            <button className={btn} title="Highlight">
              <span className="w-4 h-4 rounded-sm border border-border" style={{ background: "#ffff00" }} />
            </button>
          }
        >
          <ColorGrid
            current={editor.getAttributes("highlight").color}
            onPick={(c) => {
              editor.chain().focus().toggleHighlight({ color: c }).run();
              setHlOpen(false);
            }}
          />
        </Popover>

        <button aria-label="Clear formatting"
          className={btn}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear formatting"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <button aria-label="Format Painter — pick up formatting here, then select text elsewhere to apply it. Click again (or Esc) to stop."
          className={active(painterArmed)}
          onClick={onTogglePainter}
          title="Format Painter — pick up formatting here, then select text elsewhere to apply it. Click again (or Esc) to stop."
        >
          <Paintbrush className="w-4 h-4" />
        </button>
      </div>

      {/* Row 3: Paragraph */}
      <div className="wp-row wp-row-justify">
        <button aria-label="Align left"
          className={active(editor.isActive({ textAlign: "left" }))}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button aria-label="Align center"
          className={active(editor.isActive({ textAlign: "center" }))}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button aria-label="Align right"
          className={active(editor.isActive({ textAlign: "right" }))}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button aria-label="Justify"
          className={active(editor.isActive({ textAlign: "justify" }))}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
        <button
          className={btn}
          onClick={() => (editor.chain().focus() as any).setDirection("ltr").run()}
          title="Left-to-right"
        >
          LTR
        </button>
        <button
          className={btn}
          onClick={() => (editor.chain().focus() as any).setDirection("rtl").run()}
          title="Right-to-left"
        >
          RTL
        </button>
        <button aria-label="Bullet list"
          className={active(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </button>
        <button aria-label="Numbered list"
          className={active(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button aria-label="Indent"
          className={btn}
          onClick={() => (editor.chain().focus() as any).sinkListItem("listItem").run()}
          title="Indent"
        >
          <IndentIncrease className="w-4 h-4" />
        </button>
        <button aria-label="Outdent"
          className={btn}
          onClick={() => (editor.chain().focus() as any).liftListItem("listItem").run()}
          title="Outdent"
        >
          <IndentDecrease className="w-4 h-4" />
        </button>

        <Popover
          open={lhOpen}
          setOpen={setLhOpen}
          trigger={
            <button className={btn} title="Line spacing">
              Spacing
              <ChevronDown className="w-3 h-3" />
            </button>
          }
        >
          <div className="grid">
            {["1", "1.15", "1.5", "2", "2.5", "3"].map((v) => (
              <button
                key={v}
                className="wp-menu-item"
                onClick={() => {
                  (editor.chain().focus() as any).setLineHeight(v).run();
                  setLhOpen(false);
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </Popover>

        <Popover
          open={headingOpen}
          setOpen={setHeadingOpen}
          trigger={
            <button className={btn} title="Heading">
              Style
              <ChevronDown className="w-3 h-3" />
            </button>
          }
        >
          <div className="grid">
            <button
              className="wp-menu-item"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setHeadingOpen(false);
              }}
            >
              Normal
            </button>
            {[1, 2, 3, 4].map((l) => (
              <button
                key={l}
                className="wp-menu-item"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: l as any })
                    .run();
                  setHeadingOpen(false);
                }}
              >
                Heading {l}
              </button>
            ))}
            <button
              className="wp-menu-item"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setHeadingOpen(false);
              }}
            >
              Quote
            </button>
          </div>
        </Popover>
      </div>

      {/* Row 4: Insert */}
      <div className="wp-row wp-row-justify">
        <Popover
          open={tableOpen}
          setOpen={setTableOpen}
          trigger={
            <button className={btn} title="Insert table">
              <TableIc className="w-4 h-4" />
              Table
            </button>
          }
        >
          <TableGrid
            onPick={(r, c) => {
              editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
              setTableOpen(false);
            }}
          />
        </Popover>
        <button className={btn} onClick={() => imgRef.current?.click()} title="Insert image">
          <ImageIc className="w-4 h-4" />
          Image
        </button>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])}
        />
        <button aria-label="Horizontal rule"
          className={btn}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          className={btn}
          onClick={() => (editor.chain().focus() as any).insertContent({ type: "pageBreak" }).run()}
          title="Page break"
        >
          Page Break
        </button>
        <Popover
          open={specOpen}
          setOpen={setSpecOpen}
          trigger={
            <button className={btn} title="Special character">
              Ω
            </button>
          }
        >
          <div className="grid grid-cols-8 gap-1 w-64">
            {SPECIAL_CHARS.map((c) => (
              <button
                key={c}
                className="wp-menu-item text-center"
                onClick={() => {
                  editor.chain().focus().insertContent(c).run();
                  setSpecOpen(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </Popover>
        <button aria-label="Insert date/time"
          className={btn}
          onClick={() => editor.chain().focus().insertContent(new Date().toLocaleString()).run()}
          title="Insert date/time"
        >
          <Calendar className="w-4 h-4" />
        </button>

        <div className="wp-spacer" />

        {/* Table contextual mini-toolbar */}
        {editor.isActive("table") && (
          <>
            <button className={btn} onClick={() => editor.chain().focus().addRowAfter().run()}>
              +Row
            </button>
            <button className={btn} onClick={() => editor.chain().focus().addColumnAfter().run()}>
              +Col
            </button>
            <button className={btn} onClick={() => editor.chain().focus().deleteRow().run()}>
              -Row
            </button>
            <button className={btn} onClick={() => editor.chain().focus().deleteColumn().run()}>
              -Col
            </button>
            <button className={btn} onClick={() => editor.chain().focus().deleteTable().run()}>
              Delete Table
            </button>
          </>
        )}
      </div>

      {/* Row 5: Review */}
      <div className="wp-row wp-row-justify">
        <button aria-label="Undo (Ctrl+Z)" className={btn} onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button aria-label="Redo (Ctrl+Y)" className={btn} onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
        <button className={btn} onClick={onFind} title="Find & Replace (Ctrl+H)">
          <FileSearch className="w-4 h-4" />
          Find
        </button>
        <button className={btn} onClick={() => alert(wordStats(editor))} title="Word count">
          <Search className="w-4 h-4" />
          Count
        </button>
        <button
          className={active(isSpeaking)}
          onClick={onToggleSpeak}
          title={isSpeaking ? "Stop reading" : "Read aloud"}
        >
          <Volume2 className="w-4 h-4" />
          {isSpeaking ? "Stop" : "Read aloud"}
        </button>
        <button
          className={active(isListening)}
          onClick={onToggleVoice}
          title={isListening ? "Stop voice typing" : "Voice typing"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button aria-label={isReadingMode ? "Exit reading mode (Esc)" : "Reading mode — focus on content"}
          className={active(isReadingMode)}
          onClick={onToggleReadingMode}
          title={isReadingMode ? "Exit reading mode (Esc)" : "Reading mode — focus on content"}
        >
          <BookOpen className="w-4 h-4" />
        </button>
        <button aria-label="Toggle rulers" className={active(showRulers)} onClick={() => setShowRulers(!showRulers)} title="Toggle rulers">
          <Ruler className="w-4 h-4" />
        </button>
        <button className={btn} onClick={() => setUnit(unit === "cm" ? "in" : "cm")} title="Units">
          {unit}
        </button>
        <button className={btn} onClick={onResetMargins} title="Reset page margins to default">
          <RotateCcw className="w-4 h-4" />
          Margins
        </button>
        <button
          className={btn}
          onClick={() => {
            const el = editor.view.dom as HTMLElement;
            const cur = el.getAttribute("spellcheck") === "true";
            el.setAttribute("spellcheck", cur ? "false" : "true");
          }}
          title="Toggle spellcheck"
        >
          <Check className="w-4 h-4" />
          Spell
        </button>

        <div className="wp-spacer" />

        <button aria-label="Zoom out"
          className={btn}
          onClick={() => onZoomChange(ZOOM_PRESETS[Math.max(0, ZOOM_PRESETS.indexOf(zoomPercent) - 1)])}
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <select
          className="wp-select"
          style={{ width: 76 }}
          value={zoomPercent}
          onChange={(e) => onZoomChange(parseInt(e.target.value, 10))}
          title="Zoom level (page only — toolbar stays the same size)"
        >
          {ZOOM_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}%
            </option>
          ))}
        </select>
        <button aria-label="Zoom in"
          className={btn}
          onClick={() =>
            onZoomChange(ZOOM_PRESETS[Math.min(ZOOM_PRESETS.length - 1, ZOOM_PRESETS.indexOf(zoomPercent) + 1)])
          }
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          className={active(isFullscreen)}
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving")
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span
        className="text-xs text-muted-foreground inline-flex items-center gap-1.5"
        title="Your document is saved automatically to this browser every 30 seconds"
      >
        <span className="w-2 h-2 rounded-full bg-green-500" />
        💾 Auto-saved every 30s
      </span>
    );
  if (state === "error")
    return (
      <span
        className="text-xs inline-flex items-center gap-1.5"
        style={{ color: "#b45309" }}
        title="Your browser's storage is full, likely because of large images. Export a copy now so you don't lose your work."
      >
        <span className="w-2 h-2 rounded-full bg-red-500" />
        ⚠️ Save failed — export a copy
      </span>
    );
  return (
    <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
      Ready
    </span>
  );
}

// ---------- Helpers / sub-components ----------
function Popover({
  trigger,
  children,
  open,
  setOpen,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, setOpen]);
  return (
    <div className="relative" ref={ref}>
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open && <div className="wp-popover">{children}</div>}
    </div>
  );
}

function ColorGrid({ onPick, current }: { onPick: (c: string) => void; current?: string | null }) {
  const customValue = current && /^#[0-9a-fA-F]{6}$/.test(current) ? current : "#000000";
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 p-1">
        {COLORS.map((c) => {
          const isActive = !!current && current.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => onPick(c)}
              title={c}
              className="relative w-7 h-7 rounded-md ring-1 ring-inset ring-black/15 transition-transform hover:scale-110 hover:ring-2 hover:ring-[var(--cyan-brand)]"
              style={{ background: c }}
            >
              {isActive && (
                <Check
                  className="w-4 h-4 absolute inset-0 m-auto"
                  style={{ color: isLightColor(c) ? "#000" : "#fff" }}
                />
              )}
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 mt-2 pt-2 px-1 border-t border-border cursor-pointer">
        <input
          type="color"
          value={customValue}
          onChange={(e) => onPick(e.target.value)}
          className="w-7 h-7 rounded border border-border bg-transparent p-0 cursor-pointer"
          title="Pick any custom color"
        />
        <span className="text-xs text-muted-foreground">Custom color…</span>
      </label>
    </div>
  );
}

function TableGrid({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <div>
      <div className="grid grid-cols-10 gap-0.5">
        {Array.from({ length: 10 * 10 }).map((_, i) => {
          const r = Math.floor(i / 10) + 1,
            c = (i % 10) + 1;
          const on = r <= hover[0] && c <= hover[1];
          return (
            <button
              key={i}
              onMouseEnter={() => setHover([r, c])}
              onClick={() => onPick(r, c)}
              className="w-4 h-4 border border-border"
              style={{ background: on ? "var(--cyan-brand)" : "transparent" }}
            />
          );
        })}
      </div>
      <div className="text-xs text-center mt-1 text-muted-foreground">
        {hover[0]} × {hover[1]}
      </div>
    </div>
  );
}

// ---------- Draggable margin handle ----------
function MarginHandle({
  orientation,
  position,
  scale,
  title,
  onDrag,
}: {
  orientation: "x" | "y";
  position: number;
  scale: number;
  title: string;
  onDrag: (deltaPx: number) => void;
}) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startClient = orientation === "x" ? e.clientX : e.clientY;
    const move = (ev: MouseEvent) => {
      const cur = orientation === "x" ? ev.clientX : ev.clientY;
      onDrag((cur - startClient) / (scale || 1));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const style: React.CSSProperties =
    orientation === "x"
      ? { left: position - 4, top: 0, width: 8, height: "100%" }
      : { top: position - 4, left: 0, height: 8, width: "100%" };
  return (
    <div
      className={orientation === "x" ? "wp-ruler-handle" : "wp-ruler-handle-v"}
      style={style}
      onMouseDown={onMouseDown}
      title={title}
    />
  );
}

// ---------- Rulers (with drag-to-resize margins) ----------
function TopRuler({
  unit,
  marginLeft,
  marginRight,
  scale,
  onChange,
}: {
  unit: "cm" | "in";
  marginLeft: number;
  marginRight: number;
  scale: number;
  onChange: (patch: { left?: number; right?: number }) => void;
}) {
  const step = unit === "cm" ? PX_PER_CM : PX_PER_IN;
  const total = unit === "cm" ? 21 : 8;
  const ticks: number[] = [];
  for (let i = 0; i <= total * 2; i++) ticks.push(i);

  return (
    <div className="wp-ruler-h" style={{ width: PAGE_WIDTH_PX, marginLeft: 24 }}>
      {ticks.map((i) => {
        const half = i % 2 === 1;
        const x = (i / 2) * step;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: half ? 14 : 8,
              width: 1,
              height: half ? 6 : 12,
              background: "#666",
            }}
          />
        );
      })}
      {Array.from({ length: total + 1 }).map((_, i) => (
        <div key={`l${i}`} style={{ position: "absolute", left: i * step - 6, top: 0, fontSize: 9, color: "#333" }}>
          {i}
        </div>
      ))}

      <div className="wp-ruler-margin" style={{ left: 0, width: marginLeft }} />
      <div className="wp-ruler-margin" style={{ left: PAGE_WIDTH_PX - marginRight, width: marginRight }} />

      <MarginHandle
        orientation="x"
        position={marginLeft}
        scale={scale}
        title={`Left margin: ${pxToUnitLabel(marginLeft, unit)} — drag to adjust`}
        onDrag={(delta) =>
          onChange({ left: clamp(Math.round(marginLeft + delta), MIN_MARGIN, PAGE_WIDTH_PX - marginRight - 100) })
        }
      />
      <MarginHandle
        orientation="x"
        position={PAGE_WIDTH_PX - marginRight}
        scale={scale}
        title={`Right margin: ${pxToUnitLabel(marginRight, unit)} — drag to adjust`}
        onDrag={(delta) =>
          onChange({ right: clamp(Math.round(marginRight - delta), MIN_MARGIN, PAGE_WIDTH_PX - marginLeft - 100) })
        }
      />
    </div>
  );
}

function LeftRuler({
  unit,
  marginTop,
  marginBottom,
  scale,
  height,
  onChange,
}: {
  unit: "cm" | "in";
  marginTop: number;
  marginBottom: number;
  scale: number;
  height: number;
  onChange: (patch: { top?: number; bottom?: number }) => void;
}) {
  const step = unit === "cm" ? PX_PER_CM : PX_PER_IN;
  const ticksPerPage = Math.ceil(PAGE_UNIT_PX / step);
  // `height` is built from whole "page + gap" units (see pageMinHeight), so this recovers
  // the exact page count without any rounding drift.
  const pages = Math.max(1, Math.round((height + PAGE_GAP_PX) / PAGE_CYCLE_PX));

  const renderTicks = (pageTop: number) => (
    <>
      {Array.from({ length: ticksPerPage * 2 + 1 }).map((_, i) => {
        const half = i % 2 === 1;
        const y = (i / 2) * step;
        if (y > PAGE_UNIT_PX) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: pageTop + y,
              left: half ? 14 : 8,
              height: 1,
              width: half ? 6 : 12,
              background: "#666",
            }}
          />
        );
      })}
      {Array.from({ length: ticksPerPage + 1 }).map((_, i) => {
        if (i * step > PAGE_UNIT_PX) return null;
        return (
          <div
            key={`l${i}`}
            style={{ position: "absolute", top: pageTop + i * step - 4, left: 2, fontSize: 9, color: "#333" }}
          >
            {i}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="wp-ruler-v" style={{ width: 24, height }}>
      {Array.from({ length: pages }).map((_, p) => {
        const pageTop = p * PAGE_CYCLE_PX;
        const isFirst = p === 0;
        const isLast = p === pages - 1;
        return (
          <div key={p}>
            {renderTicks(pageTop)}

            {/* Margin shading repeats on every page for visual consistency... */}
            <div className="wp-ruler-margin-v" style={{ top: pageTop, height: marginTop }} />
            <div
              className="wp-ruler-margin-v"
              style={{ top: pageTop + PAGE_UNIT_PX - marginBottom, height: marginBottom }}
            />

            {/* ...but only the very first/last margin is actually draggable —
                it's the one that maps to .wp-page's real padding. */}
            {isFirst && (
              <MarginHandle
                orientation="y"
                position={pageTop + marginTop}
                scale={scale}
                title={`Top margin: ${pxToUnitLabel(marginTop, unit)} — drag to adjust`}
                onDrag={(delta) =>
                  onChange({ top: clamp(Math.round(marginTop + delta), MIN_MARGIN, PAGE_UNIT_PX - marginBottom - 100) })
                }
              />
            )}
            {isLast && (
              <MarginHandle
                orientation="y"
                position={pageTop + PAGE_UNIT_PX - marginBottom}
                scale={scale}
                title={`Bottom margin: ${pxToUnitLabel(marginBottom, unit)} — drag to adjust`}
                onDrag={(delta) =>
                  onChange({
                    bottom: clamp(Math.round(marginBottom - delta), MIN_MARGIN, PAGE_UNIT_PX - marginTop - 100),
                  })
                }
              />
            )}

            {/* Gap to the next page, labeled like Word's page separator */}
            {!isLast && (
              <div className="wp-ruler-gap" style={{ top: pageTop + PAGE_UNIT_PX, height: PAGE_GAP_PX }}>
                <span className="wp-ruler-page-label">{p + 2}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FindReplace({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [cs, setCs] = useState(false);

  const replaceAll = () => {
    if (!find) return;
    const html = editor.getHTML();
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), cs ? "g" : "gi");
    const out = html.replace(re, repl);
    editor.commands.setContent(out);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-4 w-full max-w-md space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Find & Replace</h3>
          <button aria-label="Close dialog" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          className="w-full px-3 py-2 rounded bg-secondary text-sm"
          placeholder="Find"
          value={find}
          onChange={(e) => setFind(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 rounded bg-secondary text-sm"
          placeholder="Replace with"
          value={repl}
          onChange={(e) => setRepl(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} /> Case sensitive
        </label>
        <div className="flex justify-end gap-2">
          <button className="wp-btn" onClick={onClose}>
            Close
          </button>
          <button className="wp-btn wp-btn-active" onClick={replaceAll}>
            <ArrowLeftRight className="w-4 h-4" />
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesModal({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const apply = (key: string) => {
    const hasContent = editor.getText().trim().length > 0;
    if (hasContent && !confirm("This will replace your current document. Continue?")) return;
    editor.commands.setContent(TEMPLATES[key]);
    onClose();
  };
  const items = [
    { k: "cv", t: "CV / Resume", d: "Name, contact, experience, education, skills." },
    { k: "cover", t: "Cover Letter", d: "Date, recipient, opening, body, closing." },
    { k: "invoice", t: "Invoice", d: "Header, items table, totals, payment." },
    { k: "essay", t: "Essay", d: "Title, intro, body sections, conclusion." },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-5 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Choose a template</h3>
          <button aria-label="Close dialog" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <button
              key={it.k}
              className="text-left p-4 rounded-lg border border-border hover:border-foreground/40 transition"
              onClick={() => apply(it.k)}
            >
              <div className="font-semibold mb-1">{it.t}</div>
              <div className="text-sm text-muted-foreground">{it.d}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function exportTxt(editor: Editor | null) {
  if (!editor) return;
  const text = editor.getText();
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function wordStats(editor: Editor) {
  const t = editor.getText();
  const words = (t.trim().match(/\S+/g) || []).length;
  const chars = t.length;
  const noSpace = t.replace(/\s/g, "").length;
  return `Words: ${words}\nCharacters: ${chars}\nCharacters (no spaces): ${noSpace}`;
}

function speak(text: string, lang: string, onEnd: () => void) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  speechSynthesis.speak(u);
}

function stopSpeak() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

// ---------- DOCX export helpers ----------

// Maps an arbitrary highlight hex color to the closest color docx's
// limited TextRun#highlight palette supports.
function hexToDocxHighlight(hex?: string): string {
  if (!hex) return "yellow";
  const map: Record<string, string> = {
    "#ffff00": "yellow",
    "#00cc00": "green",
    "#00ff00": "green",
    "#00ffff": "cyan",
    "#ff00ff": "magenta",
    "#9900ff": "magenta",
    "#0066ff": "blue",
    "#ff0000": "red",
    "#cc0000": "red",
    "#ff9900": "yellow",
    "#cccccc": "lightGray",
    "#999999": "darkGray",
    "#666666": "darkGray",
    "#000000": "black",
    "#ffffff": "white",
  };
  return map[hex.toLowerCase()] || "yellow";
}

function dataUrlImageType(dataUrl: string): string {
  const m = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const ext = (m?.[1] || "png").toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (["png", "jpg", "gif", "bmp", "svg"].includes(ext)) return ext;
  return "png";
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadImageDims(src: string, maxWidth: number): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      let w = img.naturalWidth || maxWidth;
      let h = img.naturalHeight || Math.round(maxWidth * 0.6);
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      resolve({ width: w, height: h });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

// ---------- CSS ----------
const WP_CSS = `
.wp-root { width: 100%; }
.wp-fullscreen {
  position: fixed; inset: 0; z-index: 1000;
  background: var(--background);
  padding: 12px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.wp-fullscreen .wp-hero { display: none; }
.wp-fullscreen .wp-canvas { flex: 1; height: auto !important; min-height: 0; }

/* ── Reading Mode ── */
.wp-reading-mode .wp-toolbar,
.wp-reading-mode .wp-hero,
.wp-reading-mode .wp-ruler-h,
.wp-reading-mode .wp-ruler-v { display: none !important; }
.wp-reading-mode .wp-canvas {
  background: var(--background) !important;
  padding: 32px 0 !important;
}
.wp-reading-mode .wp-page {
  max-width: 680px;
  margin: 0 auto !important;
  box-shadow: none !important;
  background-image: none !important;
}
.wp-reading-mode .wp-editor-content {
  font-size: 17px !important;
  line-height: 1.8 !important;
}

/* ── Voice popup ── */
.wp-overlay,
.wp-popup-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
}
.wp-popup {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  min-width: 240px;
  display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}
.wp-popup-title {
  font-weight: 700; font-size: 14px;
  margin-bottom: 4px; color: var(--foreground);
}
.wp-popup-item {
  display: block; width: 100%; text-align: left;
  padding: 9px 14px; border-radius: 10px;
  border: 1px solid transparent;
  font-size: 13px; color: var(--foreground);
  background: transparent; cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.wp-popup-item:hover { background: var(--secondary); }
.wp-popup-item--active {
  background: color-mix(in oklab, var(--primary) 18%, var(--card));
  border-color: var(--primary);
  color: var(--primary);
}
.wp-popup-cancel {
  margin-top: 4px; padding: 8px 14px; border-radius: 10px;
  border: 1px solid var(--border); font-size: 13px;
  color: var(--muted-foreground); background: transparent;
  cursor: pointer; transition: background 120ms;
  text-align: center;
}
.wp-popup-cancel:hover { background: var(--secondary); }
.wp-popup-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0;
}
.wp-popup-btn {
  padding: 8px 12px; border-radius: 8px; font-size: 12px;
  border: 1px solid var(--border); background: transparent;
  color: var(--foreground); cursor: pointer; transition: background 120ms;
  text-align: center;
}
.wp-popup-btn:hover { background: var(--secondary); }
.wp-popup-btn--active {
  background: color-mix(in oklab, var(--primary) 18%, var(--card));
  border-color: var(--primary); color: var(--primary);
}
.wp-popup-actions {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;
  border-top: 1px solid var(--border); padding-top: 8px;
}
.wp-popup-confirm {
  padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  background: var(--foreground); color: var(--background);
  cursor: pointer; border: none; transition: opacity 120ms;
}
.wp-popup-confirm:hover { opacity: 0.85; }

/* ── Live Word Count Bar ── */
.wp-word-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 14px;
  font-size: 11px; color: var(--muted-foreground);
  border-top: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 90%, transparent);
  user-select: none;
}
.wp-word-bar-sep { opacity: 0.4; }
.wp-word-bar-listening {
  color: var(--primary);
  animation: wp-blink 1.2s ease-in-out infinite;
}
@keyframes wp-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.wp-hero {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  background: color-mix(in oklab, var(--cyan-brand) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--cyan-brand) 25%, transparent);
  color: var(--foreground);
  padding: 8px 12px; border-radius: 10px; margin-bottom: 8px; font-size: 14px;
}
.wp-hero-x { padding: 4px; border-radius: 6px; }
.wp-hero-x:hover { background: color-mix(in oklab, var(--foreground) 8%, transparent); }
.wp-toolbar {
  position: sticky; top: 0; z-index: 10;
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  padding: 6px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px;
}
.wp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.wp-row-justify { justify-content: space-between; }
.wp-spacer { flex: 1; }
.wp-btn {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 36px; min-width: 36px; padding: 0 8px;
  border-radius: 6px; background: transparent; color: var(--foreground);
  font-size: 13px; border: 1px solid transparent;
}
.wp-btn:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
.wp-btn:disabled { opacity: 0.6; cursor: default; }
.wp-btn-active { background: color-mix(in oklab, var(--cyan-brand) 18%, transparent); border-color: color-mix(in oklab, var(--cyan-brand) 35%, transparent); }
.wp-select { min-height: 36px; padding: 0 6px; border-radius: 6px; background: var(--secondary); color: var(--foreground); border: 1px solid var(--border); font-size: 13px; }
.wp-popover { position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--popover); color: var(--popover-foreground); border: 1px solid var(--border); border-radius: 8px; padding: 8px; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.wp-menu-item { display: block; width: 100%; text-align: left; padding: 6px 10px; border-radius: 4px; font-size: 13px; }
.wp-menu-item:hover { background: color-mix(in oklab, var(--foreground) 8%, transparent); }

.wp-canvas {
  background: #d0d0d0;
  height: calc(100vh - 280px); min-height: 500px;
  overflow: auto; border-radius: 12px;
  padding: 24px 0;
}
.wp-stage { display: block; }

/* ---- Rulers ---- */
.wp-ruler-h { position: relative; height: 24px; background: #e8e8e8; border-bottom: 1px solid #c0c0c0; }
.wp-ruler-v { position: relative; width: 24px; background: #e8e8e8; border-right: 1px solid #c0c0c0; flex-shrink: 0; }
.wp-ruler-margin { position: absolute; top: 0; bottom: 0; background: rgba(0,0,0,0.06); pointer-events: none; }
.wp-ruler-margin-v { position: absolute; left: 0; right: 0; background: rgba(0,0,0,0.06); pointer-events: none; }
.wp-ruler-handle { position: absolute; cursor: ew-resize; background: var(--cyan-brand); opacity: 0.4; border-radius: 2px; z-index: 5; }
.wp-ruler-handle:hover, .wp-ruler-handle:active { opacity: 0.8; }
.wp-ruler-handle-v { position: absolute; cursor: ns-resize; background: var(--cyan-brand); opacity: 0.4; border-radius: 2px; z-index: 5; }
.wp-ruler-handle-v:hover, .wp-ruler-handle-v:active { opacity: 0.8; }
.wp-ruler-gap { position: absolute; left: 0; right: 0; background: #dcdcdc; display: flex; align-items: center; justify-content: center; }
.wp-ruler-page-label { font-size: 8px; color: #999; font-family: sans-serif; user-select: none; }

.wp-page {
  width: 794px;
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  margin-top: 8px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12pt; line-height: 1.5;
  background-image: repeating-linear-gradient(
    to bottom,
    #ffffff 0px,
    #ffffff ${PAGE_UNIT_PX}px,
    #bbbbbb ${PAGE_UNIT_PX + 10}px,
    #dcdcdc ${PAGE_UNIT_PX + 10}px,
    #dcdcdc ${PAGE_UNIT_PX + 30}px,
    #ffffff ${PAGE_CYCLE_PX}px
  );
  background-size: 100% ${PAGE_CYCLE_PX}px;
}
.wp-page, .wp-page * { color: #1a1a1a !important; }
.wp-page a { color: #0066cc !important; }
.wp-page .wp-page-break {
  page-break-after: always;
  border: none; border-top: 2px dashed #aaa;
  margin: 28px 0; height: 0; position: relative;
}
.wp-page .wp-page-break::after {
  content: "Page Break";
  position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
  background: #ffffff; padding: 0 8px; font-size: 9px; color: #999;
  font-family: sans-serif; letter-spacing: 0.5px;
}
.wp-editor-content { min-height: 800px; outline: none; }
.wp-painting .wp-editor-content, .wp-painting .wp-editor-content * { cursor: copy; }
.wp-editor-content p { margin: 0 0 8px; }
.wp-editor-content h1 { font-size: 24pt; font-weight: 700; margin: 16px 0 12px; }
.wp-editor-content h2 { font-size: 18pt; font-weight: 700; margin: 14px 0 10px; }
.wp-editor-content h3 { font-size: 14pt; font-weight: 700; margin: 12px 0 8px; }
.wp-editor-content h4 { font-size: 12pt; font-weight: 700; margin: 10px 0 6px; }
.wp-editor-content blockquote { border-left: 4px solid #ccc; padding-left: 12px; color: #555 !important; margin: 8px 0; }
.wp-editor-content ul { list-style: disc; padding-left: 24px; margin: 8px 0; }
.wp-editor-content ol { list-style: decimal; padding-left: 24px; margin: 8px 0; }
.wp-editor-content table { border-collapse: collapse; margin: 8px 0; width: 100%; }
.wp-editor-content th, .wp-editor-content td { border: 1px solid #999; padding: 6px 8px; min-width: 40px; }
.wp-editor-content th { background: #f0f0f0; font-weight: 700; }
.wp-editor-content img { max-width: 100%; height: auto; }
.wp-editor-content hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }

@media (min-width: 1024px) {
  .wp-toolbar .wp-row { gap: 8px; }
  .wp-toolbar .wp-row-justify { justify-content: space-between; }
  .wp-toolbar .wp-row-justify > .wp-btn,
  .wp-toolbar .wp-row-justify > .wp-select { flex: 0 0 auto; }
}

@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
  body * { visibility: hidden !important; }
  .wp-canvas, .wp-canvas * { visibility: visible !important; }
  .wp-canvas {
    position: absolute !important;
    top: 0 !important; left: 0 !important; right: 0 !important;
    width: 100% !important;
    background: #ffffff !important;
    height: auto !important; min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important; margin: 0 !important;
  }
  .wp-stage { transform: none !important; width: auto !important; margin: 0 auto !important; }
  .wp-page {
    box-shadow: none !important; margin: 0 auto !important; background-image: none !important;
    min-height: 0 !important; height: auto !important;
  }
  .wp-editor-content { min-height: 0 !important; }
  .wp-ruler-h, .wp-ruler-v, .wp-toolbar, .wp-hero { display: none !important; }
  .wp-page .wp-page-break { page-break-after: always; }
  .wp-page-break::after { display: none !important; }
}
`;
