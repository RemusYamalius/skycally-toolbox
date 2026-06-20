import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/markdown-to-html")({
  head: () => buildToolMeta(toolBySlug("markdown-to-html", tools)),
  component: MarkdownToHtml,
});

function parseMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img alt="$1" src="$2">')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

const SAMPLE = `# Welcome to Markdown

## Features

Convert **Markdown** to *HTML* instantly.

### Lists

- Item one
- Item two
- Item three

### Code

Use \`inline code\` easily.

> This is a blockquote

---

[Visit Skycally](https://skycally.com)
`;

function MarkdownToHtml() {
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState(false);

  const html = parseMarkdown(markdown);

  const copy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([`<!DOCTYPE html><html><body>${html}</body></html>`], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "output.html";
    a.click();
  };

  const clear = () => setMarkdown("");

  return (
    <ToolPageShell title="Markdown to HTML" description="Convert Markdown to clean HTML with live preview instantly.">
      <div className="w-full space-y-5">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setMarkdown(SAMPLE)}
            className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-border text-sm transition-all"
          >
            Load Sample
          </button>
          <button
            onClick={clear}
            className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 text-sm transition-all"
          >
            Clear
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={copy}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/50 text-sm transition-all"
            >
              {copied ? "✓ Copied" : "Copy HTML"}
            </button>
            <button
              onClick={download}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium transition-all"
            >
              Download .html
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0d1526] border border-border rounded-2xl p-4 flex flex-col">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Markdown</p>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none font-mono text-sm leading-relaxed min-h-[400px]"
              placeholder="Type your Markdown here..."
              spellCheck={false}
            />
          </div>

          <div className="bg-[#0d1526] border border-border rounded-2xl p-4 flex flex-col">
            <div className="flex gap-1 mb-4 bg-background rounded-xl p-1 w-fit">
              {(["preview", "html"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === t ? "bg-cyan-500 text-black" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "preview" ? "Preview" : "HTML"}
                </button>
              ))}
            </div>

            {tab === "preview" ? (
              <div
                className="prose prose-invert prose-sm max-w-none flex-1 overflow-auto text-foreground leading-relaxed
                  [&_h1]:text-cyan-300 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                  [&_h2]:text-cyan-400 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
                  [&_h3]:text-cyan-500 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2
                  [&_strong]:text-foreground [&_em]:text-muted-foreground
                  [&_code]:bg-background [&_code]:text-cyan-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                  [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-500 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic
                  [&_hr]:border-border [&_hr]:my-4
                  [&_a]:text-cyan-400 [&_a]:underline
                  [&_li]:ml-4 [&_li]:list-disc"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="flex-1 overflow-auto font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap break-all min-h-[360px]">
                {html}
              </pre>
            )}
          </div>
        </div>
      </div>

      <HowToUse
        steps={[
          "Type or paste your Markdown into the editor on the left.",
          "See a live styled preview on the right, or switch to the HTML tab to see the raw output.",
          "Copy the HTML to clipboard or download it as a complete .html file.",
        ]}
      />

      <ToolSeoContent
        title="Free Markdown to HTML Converter — Live Preview Online"
        description="Convert Markdown to clean, valid HTML instantly with a live preview. Supports headings, bold, italic, lists, links, images, code, blockquotes and more. Runs in your browser — no upload, no signup."
        body={[
          "Markdown is a lightweight markup language widely used by developers, bloggers, and technical writers to write formatted content using plain text. This converter transforms Markdown syntax into clean, valid HTML instantly — with a live preview that updates as you type, so you can see exactly how your content will look in a browser.",
          "The tool supports the most common Markdown elements: headings (H1–H3), bold and italic text, unordered and ordered lists, inline code, blockquotes, horizontal rules, hyperlinks, and images. The Preview tab renders the HTML with styled typography, while the HTML tab shows the raw output ready to paste into any webpage or CMS.",
          "Markdown is the standard format for README files on GitHub, documentation sites (GitBook, Docusaurus), blogging platforms (Ghost, Hashnode), and note-taking apps (Obsidian, Notion). Converting Markdown to HTML is a common workflow for publishing content from these platforms to custom websites or email templates.",
        ]}
        faqs={[
          {
            question: "What Markdown syntax is supported?",
            answer:
              "Headings (# H1, ## H2, ### H3), bold (**text**), italic (*text*), bold+italic (***text***), inline code (`code`), blockquotes (> text), unordered lists (- item), ordered lists (1. item), horizontal rules (---), hyperlinks ([text](url)), and images (![alt](url)).",
          },
          {
            question: "Does it show a live preview?",
            answer:
              "Yes. The Preview tab on the right updates in real time as you type in the Markdown editor. It renders headings, lists, code, links, and other elements with styled typography so you can see exactly how the output will look.",
          },
          {
            question: "Can I download the result as an HTML file?",
            answer:
              "Yes. Click Download .html to save a complete HTML document (with DOCTYPE and body tags) containing your converted content. You can open it directly in any browser or paste the body content into your website.",
          },
          {
            question: "What is Markdown used for?",
            answer:
              "Markdown is used for README files on GitHub, documentation (Docusaurus, GitBook), blog posts (Ghost, Hashnode, Dev.to), note-taking (Obsidian, Notion), and forum posts (Reddit, Stack Overflow). It lets you write formatted content without touching HTML directly.",
          },
          {
            question: "Is my content sent to a server?",
            answer:
              "No. All conversion happens locally in your browser using JavaScript string processing. Your text never leaves your device.",
          },
          {
            question: "Does it support code blocks (triple backtick)?",
            answer:
              "Currently the tool supports inline code using single backticks. Full fenced code block support (triple backtick with syntax highlighting) is a planned enhancement.",
          },
          {
            question: "Can I use this for email templates?",
            answer:
              "You can convert your Markdown to HTML and use the output as a base for email templates. Note that email clients have limited CSS support, so you may need to add inline styles before sending. The raw HTML output from the HTML tab is a good starting point.",
          },
          {
            question: "Is there a character or document length limit?",
            answer:
              "No. There is no enforced limit. You can convert documents of any length — the conversion runs entirely in your browser and is near-instant even for large files.",
          },
        ]}
      />

      <RelatedTools currentSlug="markdown-to-html" />
    </ToolPageShell>
  );
}
