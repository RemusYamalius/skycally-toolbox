import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/lorem-ipsum")({
  head: () => buildToolMeta(toolBySlug("lorem-ipsum", tools)),
  component: LoremIpsumTool,
});

const WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
    " ",
  );

type Format = "text" | "html";

function gen(paragraphs: number, wpp: number): string[] {
  const out: string[] = [];
  for (let p = 0; p < paragraphs; p++) {
    const words: string[] = [];
    for (let i = 0; i < wpp; i++) {
      words.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    }
    let para = words.join(" ");
    para = para.charAt(0).toUpperCase() + para.slice(1) + ".";
    out.push(para);
  }
  return out;
}

function LoremIpsumTool() {
  const [paragraphs, setParagraphs] = useState(3);
  const [wpp, setWpp] = useState(50);
  const [format, setFormat] = useState<Format>("text");
  const [result, setResult] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGen = () => setResult(gen(paragraphs, wpp));

  const output = format === "html" ? result.map((p) => `<p>${p}</p>`).join("\n") : result.join("\n\n");

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell
      title="Lorem Ipsum Generator"
      description="Generate placeholder Lorem Ipsum text with custom length and format."
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Paragraphs: {paragraphs}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={paragraphs}
              onChange={(e) => setParagraphs(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-500"
            />
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Words / paragraph: {wpp}</label>
            <input
              type="range"
              min={20}
              max={100}
              value={wpp}
              onChange={(e) => setWpp(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-500"
            />
          </div>
        </div>

        <div className="flex bg-card border border-border rounded-2xl p-1">
          {(["text", "html"] as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                format === f
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "text" ? "Plain Text" : "HTML <p>"}
            </button>
          ))}
        </div>

        <button
          onClick={handleGen}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Generate Lorem Ipsum
        </button>

        {output && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                {copied ? "✓ Copied" : "Copy All"}
              </button>
            </div>
            <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words max-h-[400px] overflow-auto">
              {output}
            </pre>
          </div>
        )}
      </div>

      <AdZone id="lorem-ipsum-mid" size="728x90" />

      <HowToUse
        steps={[
          "Choose paragraphs and words per paragraph.",
          "Pick plain text or HTML <p> output.",
          "Click Generate, then Copy All.",
        ]}
      />

      <ToolSeoContent
        title="Free Lorem Ipsum Generator — Placeholder Text for Designs & Mockups"
        description="Generate Lorem Ipsum placeholder text instantly. Choose paragraph count, word count, and output as plain text or HTML. Free, instant, no signup."
        body={[
          "Lorem Ipsum is the standard placeholder text used by graphic designers, web developers, and UX designers since the 1500s. It allows you to focus entirely on visual layout, typography, spacing, and color without being distracted by meaningful copy. Skycally's Lorem Ipsum generator lets you customize the number of paragraphs, words per paragraph, and output format in seconds.",
          "The generated text is derived from Cicero's De Finibus Bonorum et Malorum, written in 45 BC — scrambled and altered to be unreadable, preventing readers from focusing on the content rather than the design. The standard Lorem Ipsum passage beginning with 'Lorem ipsum dolor sit amet' has been the industry's standard since the 1960s when Letraset popularized it on dry transfer sheets.",
          "You can generate output as plain text for use in design tools like Figma, Sketch, Adobe XD, and InDesign, or as HTML with each paragraph wrapped in <p> tags for direct use in web projects and CMS content areas. All generation happens instantly in your browser — nothing is sent to any server.",
          "Lorem Ipsum is used across virtually every field of design and publishing: website mockups, app wireframes, email templates, print layouts, book interior design, and any context where realistic-length placeholder copy is needed before real content is available.",
        ]}
        faqs={[
          {
            question: "What is Lorem Ipsum and why is it used?",
            answer:
              "Lorem Ipsum is scrambled Latin text used as placeholder copy in design mockups. It looks like readable text from a distance, making it ideal for testing layouts, without drawing attention to the words themselves. It has been the standard placeholder since the 1960s.",
          },
          {
            question: "Can I get HTML output?",
            answer:
              "Yes. Toggle the HTML mode to wrap each generated paragraph in <p> tags. This is useful for pasting directly into HTML files, CMS editors, or React/Vue components that render HTML content.",
          },
          {
            question: "How many paragraphs and words can I generate?",
            answer:
              "Up to 10 paragraphs with up to 100 words each per generation. Click Generate again to produce a fresh batch with different word order.",
          },
          {
            question: "Is anything sent to a server?",
            answer:
              "No. All Lorem Ipsum generation runs locally in your browser using JavaScript. Nothing is transmitted anywhere.",
          },
          {
            question: "Is this real Latin?",
            answer:
              "The words are derived from a real Latin text (Cicero's De Finibus, 45 BC) but they have been scrambled and altered to create nonsense. The passage is not grammatically correct Latin and should not be used in contexts where actual Latin text is required.",
          },
          {
            question: "Can I use Lorem Ipsum in my commercial projects?",
            answer:
              "Yes, completely. Lorem Ipsum text is in the public domain and free to use in any project — commercial or personal — without attribution or licensing.",
          },
          {
            question: "What design tools can I use this with?",
            answer:
              "Any tool that accepts pasted text: Figma, Sketch, Adobe XD, InDesign, Canva, Microsoft Word, Google Docs, VS Code, web editors, and CMS platforms like WordPress or Webflow.",
          },
          {
            question: "Is Lorem Ipsum the only placeholder text option?",
            answer:
              "No. Other popular options include Cicero's original Latin, random words, custom repeated text, or language-specific placeholders. Lorem Ipsum remains the most universally recognized option in professional design.",
          },
        ]}
      />

      <RelatedTools currentSlug="lorem-ipsum" />
    </ToolPageShell>
  );
}
