import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { useEditor, EditorContent, Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Subscript as SubIcon, Superscript as SupIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Printer, Save, FileUp, FilePlus, FileDown,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  Image as ImageIc, Table as TableIc, Minus, Search,
  Eraser, Volume2, Calendar, Ruler, FileText as FileTextIc,
  ChevronDown, X, Check, ArrowLeftRight, FileSearch,
} from "lucide-react";

export const Route = createFileRoute("/tools/word-processor")({
  head: () => buildPageMeta({
    title: "Free Online Word Processor — No Signup, No Microsoft Account | Skycally",
    description: "Write and format documents free in your browser. No Google account, no Microsoft account needed. Supports Arabic RTL, exports to PDF and Word. Try Skycally's free word processor now.",
    path: "/tools/word-processor",
  }),
  component: WordProcessor,
});

// ---------- Fonts ----------
const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana",
  "Courier New", "Trebuchet MS", "Tahoma",
  "Inter", "Roboto", "Open Sans", "Lato", "Playfair Display", "Merriweather",
  "Cairo", "Tajawal", "Amiri", "Scheherazade New",
  "Noto Sans JP", "Noto Sans SC", "Noto Sans KR",
];
const WEB_FONTS = ["Inter","Roboto","Open Sans","Lato","Playfair Display","Merriweather","Cairo","Tajawal","Amiri","Scheherazade New","Noto Sans JP","Noto Sans SC","Noto Sans KR"];
const GFONT_HREF = `https://fonts.googleapis.com/css2?${WEB_FONTS.map(f=>`family=${encodeURIComponent(f).replace(/%20/g,"+")}:wght@400;700`).join("&")}&display=swap`;

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

const COLORS = [
  "#000000","#434343","#666666","#999999","#cccccc","#ffffff",
  "#cc0000","#ff0000","#ff9900","#ffff00","#00cc00","#00ffff","#0066ff","#9900ff","#ff00ff",
  "#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc",
];

const SPECIAL_CHARS = ["©","®","™","°","±","×","÷","→","←","↑","↓","★","☆","♦","♥","♣","♠","§","¶","•","—","–","…","«","»","“","”","‘","’","€","£","¥","¢","№","✓","✗","✦","➤"];

// ---------- Custom extensions ----------
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g,"") || null,
          renderHTML: (attrs: any) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() { return { types: ["paragraph","heading"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: any) => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setLineHeight: (lh: string) => ({ tr, state, dispatch }: any) => {
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
  addOptions() { return { types: ["paragraph","heading","listItem","blockquote"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        dir: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute("dir"),
          renderHTML: (attrs: any) => attrs.dir ? { dir: attrs.dir } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setDirection: (dir: "ltr"|"rtl") => ({ tr, state, dispatch }: any) => {
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

// ---------- Templates ----------
const TEMPLATES: Record<string,string> = {
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
  useEffect(() => { setMounted(true); }, []);
  return (
    <ToolPageShell
      title="Free Online Word Processor — Write Anywhere, No Account Needed"
      description="Write and format documents free in your browser. No Google account, no Microsoft account needed. Supports Arabic RTL, exports to PDF and Word."
    >
      {mounted ? <Editor4U /> : <div className="h-[600px] rounded-2xl bg-secondary/50 animate-pulse" />}

      <HowToUse steps={[
        "Type or paste your content into the page below.",
        "Use the toolbar to format text, insert tables, images, and lists.",
        "Export your document as PDF, Word (.docx), or plain text.",
      ]} />

      <RelatedTools currentSlug="word-processor" />

      <ToolSeoContent
        title="Free Online Word Processor — No Signup, No Microsoft Account"
        description="A free word processor online no signup required, working entirely in your browser. A true Microsoft Word alternative free for anyone."
        body={[
          "Skycally's free word processor online no signup gives you a clean, distraction-free way to write documents on any device. There's no download, no install, and no account to create — just open the page and start writing.",
          "As a Microsoft Word alternative free of charge, it covers everything you need: rich formatting, headings, tables, images, lists, alignment, and a real A4 page layout. Export to PDF or .docx whenever you're ready, or save plain text. Your work auto-saves to your browser, so closing the tab won't lose it.",
          "The editor includes full free word processor arabic rtl support — flip direction with one click, pick Arabic fonts like Cairo or Amiri, and write naturally. Whether you need to write documents online free for school, work, or a side project, this online word processor no download keeps your files private. It's a word processor browser no account workflow from start to finish.",
        ]}
        faqs={[
          { question: "Do I need a Microsoft or Google account?", answer: "No. There is no signup and no account. Open the page and start writing — your document stays in your browser." },
          { question: "Can I write in Arabic with RTL support?", answer: "Yes. Click the RTL button to flip text direction, and choose an Arabic font like Cairo, Tajawal, Amiri, or Scheherazade New." },
          { question: "Can I export to Microsoft Word (.docx) or PDF?", answer: "Yes. Use the File row to export as .docx using the docx engine, or export as PDF via your browser's print dialog." },
          { question: "Does it work offline?", answer: "Once the page is loaded it works fully offline for typing, formatting, and saving to your browser. Google Fonts and the .docx export library require an initial connection." },
        ]}
      />
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
    l.id = "wp-gfonts"; l.rel = "stylesheet"; l.href = GFONT_HREF;
    document.head.appendChild(l);
  }, []);

  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("wp:hero_dismissed") === "1") setHeroVisible(false);
  }, []);

  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved">("idle");
  const [showRulers, setShowRulers] = useState(true);
  const [unit, setUnit] = useState<"cm"|"in">("cm");
  const [findOpen, setFindOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1,2,3,4] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading","paragraph"] }),
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Image.configure({ allowBase64: true, inline: false }),
      Placeholder.configure({ placeholder: "Start writing your document…" }),
      FontSize, LineHeight, Direction,
    ],
    content: typeof localStorage !== "undefined"
      ? (localStorage.getItem("skycally_word_doc") || localStorage.getItem("wp:doc") || `<h1>Welcome to Skycally Word Processor</h1><p>Start typing here. Use the toolbar above to format your document.</p>`)
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

  // Debounced + interval autosave
  const saveTimer = useRef<any>(null);
  const scheduleSave = useCallback((html: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem("skycally_word_doc", html); setSaveState("saved"); } catch { setSaveState("idle"); }
    }, 1200);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (editor) {
        try { localStorage.setItem("skycally_word_doc", editor.getHTML()); setSaveState("saved"); } catch {}
      }
    }, 30000);
    return () => clearInterval(id);
  }, [editor]);

  // Mobile scale
  useEffect(() => {
    const updateScale = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const target = Math.min(1, (w - 32) / 794);
      setScale(target);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts: Ctrl+S, Ctrl+P, Ctrl+F, Ctrl+H
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); exportTxt(editor); }
      else if (k === "p") { e.preventDefault(); window.print(); }
      else if (k === "f" || k === "h") { e.preventDefault(); setFindOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  if (!editor) return <div className="h-[600px] rounded-2xl bg-secondary/50 animate-pulse" />;

  return (
    <div className="wp-root">
      <style>{WP_CSS}</style>

      {heroVisible && (
        <div className="wp-hero">
          <span>✨ No Google account. No Microsoft account. Just open and write.</span>
          <button
            aria-label="Dismiss"
            onClick={() => { setHeroVisible(false); try { localStorage.setItem("wp:hero_dismissed","1"); } catch{} }}
            className="wp-hero-x"
          ><X className="w-4 h-4" /></button>
        </div>
      )}

      <Toolbar
        editor={editor}
        saveState={saveState}
        showRulers={showRulers} setShowRulers={setShowRulers}
        unit={unit} setUnit={setUnit}
        onFind={() => setFindOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
      />

      <div className="wp-canvas" ref={canvasRef}>
        <div className="wp-stage" style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: 794, marginInline: "auto" }}>
          {showRulers && <TopRuler unit={unit} />}
          <div style={{ display: "flex" }}>
            {showRulers && <LeftRuler unit={unit} />}
            <div className="wp-page" ref={pageRef}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {findOpen && <FindReplace editor={editor} onClose={() => setFindOpen(false)} />}
      {templatesOpen && <TemplatesModal editor={editor} onClose={() => setTemplatesOpen(false)} />}
    </div>
  );
}

// ---------- Toolbar ----------
function Toolbar({ editor, saveState, showRulers, setShowRulers, unit, setUnit, onFind, onTemplates }: {
  editor: Editor; saveState: "idle"|"saving"|"saved"; showRulers: boolean; setShowRulers: (v:boolean)=>void;
  unit: "cm"|"in"; setUnit: (v:"cm"|"in")=>void; onFind: ()=>void; onTemplates: ()=>void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [lhOpen, setLhOpen] = useState(false);

  const openFile = async (f: File) => {
    const name = f.name.toLowerCase();
    if (name.endsWith(".txt")) {
      const t = await f.text();
      editor.commands.setContent(`<p>${t.replace(/\n/g,"</p><p>")}</p>`);
    } else if (name.endsWith(".html") || name.endsWith(".htm")) {
      editor.commands.setContent(await f.text());
    } else if (name.endsWith(".docx")) {
      const mammoth: any = await import("mammoth/mammoth.browser");
      const buf = await f.arrayBuffer();
      const r = await mammoth.convertToHtml({ arrayBuffer: buf });
      editor.commands.setContent(r.value || "<p></p>");
    } else {
      alert("Unsupported file type. Use .txt, .html, or .docx");
    }
  };

  const insertImage = async (f: File) => {
    const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });
    editor.chain().focus().setImage({ src: dataUrl }).run();
  };

  const exportDocx = async () => {
    const docxMod: any = await import("docx");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docxMod;
    const html = editor.getHTML();
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const paragraphs: any[] = [];
    const headingMap: any = { H1: HeadingLevel.HEADING_1, H2: HeadingLevel.HEADING_2, H3: HeadingLevel.HEADING_3, H4: HeadingLevel.HEADING_4 };
    const alignMap: any = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
    const walk = (el: Element) => {
      Array.from(el.children).forEach((c) => {
        const tag = c.tagName;
        if (tag === "P" || /^H[1-4]$/.test(tag)) {
          const align = (c as HTMLElement).style.textAlign;
          paragraphs.push(new Paragraph({
            heading: headingMap[tag],
            alignment: alignMap[align],
            children: [new TextRun({ text: c.textContent || "", bold: tag !== "P" })],
          }));
        } else if (tag === "UL" || tag === "OL") {
          Array.from(c.children).forEach((li) => {
            paragraphs.push(new Paragraph({ text: `• ${li.textContent || ""}` }));
          });
        } else if (tag === "TABLE") {
          Array.from(c.querySelectorAll("tr")).forEach((tr) => {
            paragraphs.push(new Paragraph({ text: Array.from(tr.children).map(td => td.textContent).join("\t") }));
          });
        } else {
          paragraphs.push(new Paragraph({ text: c.textContent || "" }));
        }
      });
    };
    walk(tmp);
    const doc = new Document({ sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph("")] }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "document.docx"; a.click();
    URL.revokeObjectURL(url);
  };

  const btn = "wp-btn";
  const active = (on: boolean) => `${btn}${on ? " wp-btn-active" : ""}`;

  return (
    <div className="wp-toolbar">
      {/* Row 1: File */}
      <div className="wp-row">
        <button className={btn} onClick={() => { if (confirm("Start a new blank document?")) editor.commands.setContent("<p></p>"); }} title="New"><FilePlus className="w-4 h-4" />New</button>
        <button className={btn} onClick={() => fileRef.current?.click()} title="Open"><FileUp className="w-4 h-4" />Open</button>
        <input ref={fileRef} type="file" accept=".txt,.html,.htm,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
        <button className={btn} onClick={() => exportTxt(editor)} title="Save .txt"><Save className="w-4 h-4" />Save</button>
        <button className={btn} onClick={() => window.print()} title="Export PDF"><FileDown className="w-4 h-4" />PDF</button>
        <button className={btn} onClick={exportDocx} title="Export .docx"><FileDown className="w-4 h-4" />.docx</button>
        <button className={btn} onClick={() => window.print()} title="Print"><Printer className="w-4 h-4" />Print</button>
        <button className={btn} onClick={onTemplates} title="Templates"><FileTextIc className="w-4 h-4" />Templates</button>
        <div className="wp-spacer" />
        <SaveBadge state={saveState} />
      </div>

      {/* Row 2: Font */}
      <div className="wp-row">
        <select className="wp-select" style={{ width: 160 }}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          defaultValue=""
          title="Font family"
        >
          <option value="">Font</option>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select className="wp-select" style={{ width: 72 }}
          onChange={(e) => (editor.chain().focus() as any).setFontSize(`${e.target.value}pt`).run()}
          defaultValue="12"
          title="Font size"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className={active(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></button>
        <button className={active(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></button>
        <button className={active(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><UnderlineIcon className="w-4 h-4" /></button>
        <button className={active(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough className="w-4 h-4" /></button>
        <button className={active(editor.isActive("subscript"))} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript"><SubIcon className="w-4 h-4" /></button>
        <button className={active(editor.isActive("superscript"))} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript"><SupIcon className="w-4 h-4" /></button>

        <Popover open={colorOpen} setOpen={setColorOpen}
          trigger={<button className={btn} title="Text color"><span className="w-4 h-4 rounded-sm border border-border" style={{ background: editor.getAttributes("textStyle").color || "#000" }} />A</button>}
        >
          <ColorGrid onPick={(c) => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }} />
        </Popover>

        <Popover open={hlOpen} setOpen={setHlOpen}
          trigger={<button className={btn} title="Highlight"><span className="w-4 h-4 rounded-sm border border-border" style={{ background: "#ffff00" }} /></button>}
        >
          <ColorGrid onPick={(c) => { editor.chain().focus().toggleHighlight({ color: c }).run(); setHlOpen(false); }} />
        </Popover>

        <button className={btn} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><Eraser className="w-4 h-4" /></button>
      </div>

      {/* Row 3: Paragraph */}
      <div className="wp-row">
        <button className={active(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft className="w-4 h-4" /></button>
        <button className={active(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center"><AlignCenter className="w-4 h-4" /></button>
        <button className={active(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right"><AlignRight className="w-4 h-4" /></button>
        <button className={active(editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify"><AlignJustify className="w-4 h-4" /></button>
        <button className={btn} onClick={() => (editor.chain().focus() as any).setDirection("ltr").run()} title="Left-to-right">LTR</button>
        <button className={btn} onClick={() => (editor.chain().focus() as any).setDirection("rtl").run()} title="Right-to-left">RTL</button>
        <button className={active(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="w-4 h-4" /></button>
        <button className={active(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="w-4 h-4" /></button>
        <button className={btn} onClick={() => (editor.chain().focus() as any).sinkListItem("listItem").run()} title="Indent"><IndentIncrease className="w-4 h-4" /></button>
        <button className={btn} onClick={() => (editor.chain().focus() as any).liftListItem("listItem").run()} title="Outdent"><IndentDecrease className="w-4 h-4" /></button>

        <Popover open={lhOpen} setOpen={setLhOpen}
          trigger={<button className={btn} title="Line spacing">Spacing<ChevronDown className="w-3 h-3" /></button>}
        >
          <div className="grid">
            {["1","1.15","1.5","2","2.5","3"].map(v =>
              <button key={v} className="wp-menu-item" onClick={() => { (editor.chain().focus() as any).setLineHeight(v).run(); setLhOpen(false); }}>{v}</button>
            )}
          </div>
        </Popover>

        <Popover open={headingOpen} setOpen={setHeadingOpen}
          trigger={<button className={btn} title="Heading">Style<ChevronDown className="w-3 h-3" /></button>}
        >
          <div className="grid">
            <button className="wp-menu-item" onClick={() => { editor.chain().focus().setParagraph().run(); setHeadingOpen(false); }}>Normal</button>
            {[1,2,3,4].map(l =>
              <button key={l} className="wp-menu-item" onClick={() => { editor.chain().focus().toggleHeading({ level: l as any }).run(); setHeadingOpen(false); }}>Heading {l}</button>
            )}
            <button className="wp-menu-item" onClick={() => { editor.chain().focus().toggleBlockquote().run(); setHeadingOpen(false); }}>Quote</button>
          </div>
        </Popover>
      </div>

      {/* Row 4: Insert */}
      <div className="wp-row">
        <Popover open={tableOpen} setOpen={setTableOpen}
          trigger={<button className={btn} title="Insert table"><TableIc className="w-4 h-4" />Table</button>}
        >
          <TableGrid onPick={(r,c) => { editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setTableOpen(false); }} />
        </Popover>
        <button className={btn} onClick={() => imgRef.current?.click()} title="Insert image"><ImageIc className="w-4 h-4" />Image</button>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])} />
        <button className={btn} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus className="w-4 h-4" /></button>
        <button className={btn} onClick={() => editor.chain().focus().insertContent('<hr class="wp-page-break" />').run()} title="Page break">Page Break</button>
        <Popover open={specOpen} setOpen={setSpecOpen}
          trigger={<button className={btn} title="Special character">Ω</button>}
        >
          <div className="grid grid-cols-8 gap-1 w-64">
            {SPECIAL_CHARS.map(c =>
              <button key={c} className="wp-menu-item text-center" onClick={() => { editor.chain().focus().insertContent(c).run(); setSpecOpen(false); }}>{c}</button>
            )}
          </div>
        </Popover>
        <button className={btn} onClick={() => editor.chain().focus().insertContent(new Date().toLocaleString()).run()} title="Insert date/time"><Calendar className="w-4 h-4" /></button>

        <div className="wp-spacer" />

        {/* Table contextual mini-toolbar */}
        {editor.isActive("table") && (
          <>
            <button className={btn} onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</button>
            <button className={btn} onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</button>
            <button className={btn} onClick={() => editor.chain().focus().deleteRow().run()}>-Row</button>
            <button className={btn} onClick={() => editor.chain().focus().deleteColumn().run()}>-Col</button>
            <button className={btn} onClick={() => editor.chain().focus().deleteTable().run()}>Delete Table</button>
          </>
        )}
      </div>

      {/* Row 5: Review */}
      <div className="wp-row">
        <button className={btn} onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
        <button className={btn} onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></button>
        <button className={btn} onClick={onFind} title="Find & Replace (Ctrl+H)"><FileSearch className="w-4 h-4" />Find</button>
        <button className={btn} onClick={() => alert(wordStats(editor))} title="Word count"><Search className="w-4 h-4" />Count</button>
        <button className={btn} onClick={() => speak(editor)} title="Read aloud"><Volume2 className="w-4 h-4" /></button>
        <button className={active(showRulers)} onClick={() => setShowRulers(!showRulers)} title="Toggle rulers"><Ruler className="w-4 h-4" /></button>
        <button className={btn} onClick={() => setUnit(unit === "cm" ? "in" : "cm")} title="Units">{unit}</button>
        <button className={btn} onClick={() => {
          const el = (editor.view.dom as HTMLElement);
          const cur = el.getAttribute("spellcheck") === "true";
          el.setAttribute("spellcheck", cur ? "false" : "true");
        }} title="Toggle spellcheck"><Check className="w-4 h-4" />Spell</button>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle"|"saving"|"saved" }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />Saving…</span>;
  if (state === "saved") return <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />💾 Auto-saved</span>;
  return <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" />Ready</span>;
}

// ---------- Helpers / sub-components ----------
function Popover({ trigger, children, open, setOpen }: { trigger: React.ReactNode; children: React.ReactNode; open: boolean; setOpen: (v: boolean)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
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

function ColorGrid({ onPick }: { onPick: (c: string)=>void }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {COLORS.map(c => (
        <button key={c} onClick={() => onPick(c)} className="w-6 h-6 rounded border border-border" style={{ background: c }} />
      ))}
    </div>
  );
}

function TableGrid({ onPick }: { onPick: (r:number,c:number)=>void }) {
  const [hover, setHover] = useState<[number,number]>([0,0]);
  return (
    <div>
      <div className="grid grid-cols-10 gap-0.5">
        {Array.from({ length: 10*10 }).map((_, i) => {
          const r = Math.floor(i/10)+1, c = (i%10)+1;
          const on = r <= hover[0] && c <= hover[1];
          return <button key={i} onMouseEnter={() => setHover([r,c])} onClick={() => onPick(r,c)} className="w-4 h-4 border border-border" style={{ background: on ? "var(--cyan-brand)" : "transparent" }} />;
        })}
      </div>
      <div className="text-xs text-center mt-1 text-muted-foreground">{hover[0]} × {hover[1]}</div>
    </div>
  );
}

function TopRuler({ unit }: { unit: "cm"|"in" }) {
  // 794px ≈ 21cm at 96dpi (~37.8px/cm)
  const PX_PER_CM = 37.8;
  const PX_PER_IN = 96;
  const step = unit === "cm" ? PX_PER_CM : PX_PER_IN;
  const total = unit === "cm" ? 21 : 8;
  const ticks: number[] = [];
  for (let i = 0; i <= total*2; i++) ticks.push(i);
  return (
    <div style={{ width: 794, height: 24, background: "#e8e8e8", borderBottom: "1px solid #c0c0c0", position: "relative", marginLeft: 24 }}>
      {ticks.map((i) => {
        const half = i % 2 === 1;
        const x = (i / 2) * step;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: half ? 14 : 8, width: 1, height: half ? 6 : 12, background: "#666" }} />
        );
      })}
      {Array.from({ length: total+1 }).map((_, i) => (
        <div key={`l${i}`} style={{ position: "absolute", left: i*step - 6, top: 0, fontSize: 9, color: "#333" }}>{i}</div>
      ))}
    </div>
  );
}

function LeftRuler({ unit }: { unit: "cm"|"in" }) {
  const PX_PER_CM = 37.8, PX_PER_IN = 96;
  const step = unit === "cm" ? PX_PER_CM : PX_PER_IN;
  const total = unit === "cm" ? 29 : 11;
  const ticks: number[] = [];
  for (let i = 0; i <= total*2; i++) ticks.push(i);
  return (
    <div style={{ width: 24, height: 1123, background: "#e8e8e8", borderRight: "1px solid #c0c0c0", position: "relative" }}>
      {ticks.map((i) => {
        const half = i % 2 === 1;
        const y = (i / 2) * step;
        return <div key={i} style={{ position: "absolute", top: y, left: half ? 14 : 8, height: 1, width: half ? 6 : 12, background: "#666" }} />;
      })}
      {Array.from({ length: total+1 }).map((_, i) => (
        <div key={`l${i}`} style={{ position: "absolute", top: i*step - 4, left: 2, fontSize: 9, color: "#333" }}>{i}</div>
      ))}
    </div>
  );
}

function FindReplace({ editor, onClose }: { editor: Editor; onClose: ()=>void }) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [cs, setCs] = useState(false);

  const replaceAll = () => {
    if (!find) return;
    const html = editor.getHTML();
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), cs ? "g" : "gi");
    const out = html.replace(re, repl);
    editor.commands.setContent(out);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 w-full max-w-md space-y-3" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-semibold">Find & Replace</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <input className="w-full px-3 py-2 rounded bg-secondary text-sm" placeholder="Find" value={find} onChange={(e)=>setFind(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-secondary text-sm" placeholder="Replace with" value={repl} onChange={(e)=>setRepl(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cs} onChange={(e)=>setCs(e.target.checked)} /> Case sensitive</label>
        <div className="flex justify-end gap-2">
          <button className="wp-btn" onClick={onClose}>Close</button>
          <button className="wp-btn wp-btn-active" onClick={replaceAll}><ArrowLeftRight className="w-4 h-4" />Replace All</button>
        </div>
      </div>
    </div>
  );
}

function TemplatesModal({ editor, onClose }: { editor: Editor; onClose: ()=>void }) {
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
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-2xl" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Choose a template</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map(it => (
            <button key={it.k} className="text-left p-4 rounded-lg border border-border hover:border-foreground/40 transition" onClick={()=>apply(it.k)}>
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
  const a = document.createElement("a"); a.href = url; a.download = "document.txt"; a.click();
  URL.revokeObjectURL(url);
}

function wordStats(editor: Editor) {
  const t = editor.getText();
  const words = (t.trim().match(/\S+/g) || []).length;
  const chars = t.length;
  const noSpace = t.replace(/\s/g,"").length;
  return `Words: ${words}\nCharacters: ${chars}\nCharacters (no spaces): ${noSpace}`;
}

function speak(editor: Editor) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(editor.getText());
  speechSynthesis.speak(u);
}

// ---------- CSS ----------
const WP_CSS = `
.wp-root { width: 100%; }
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
.wp-spacer { flex: 1; }
.wp-btn {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 36px; min-width: 36px; padding: 0 8px;
  border-radius: 6px; background: transparent; color: var(--foreground);
  font-size: 13px; border: 1px solid transparent;
}
.wp-btn:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
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
.wp-page {
  width: 794px; min-height: 1123px;
  padding: 96px;
  background: #ffffff !important;
  color: #1a1a1a !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  margin-top: 8px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12pt; line-height: 1.5;
  background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 931px, #d0d0d0 931px, #d0d0d0 955px);
  background-size: 100% 1123px;
  background-attachment: local;
}
.wp-page, .wp-page * { color: #1a1a1a !important; }
.wp-page a { color: #0066cc !important; }
.wp-page .wp-page-break { page-break-after: always; border: none; border-top: 1px dashed #999; margin: 24px 0; }
.wp-editor-content { min-height: 800px; outline: none; }
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

@media print {
  body * { visibility: hidden !important; }
  .wp-canvas, .wp-canvas * { visibility: visible !important; }
  .wp-canvas { background: white !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
  .wp-stage { transform: none !important; }
  .wp-page { box-shadow: none !important; margin: 0 !important; background-image: none !important; }
  .wp-toolbar, .wp-hero { display: none !important; }
}
`;
