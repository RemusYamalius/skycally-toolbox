import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/lorem-ipsum")({
  head: () => buildToolMeta(toolBySlug("lorem-ipsum", tools)),
  component: LoremIpsumTool,
});

const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

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
    <ToolPageShell title="Lorem Ipsum Generator" description="Generate placeholder Lorem Ipsum text with custom length and format.">
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Paragraphs: {paragraphs}</label>
            <input
              type="range" min={1} max={10} value={paragraphs}
              onChange={(e) => setParagraphs(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-500"
            />
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Words / paragraph: {wpp}</label>
            <input
              type="range" min={20} max={100} value={wpp}
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
                format === f ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
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
            <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words max-h-[400px] overflow-auto">{output}</pre>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Choose paragraphs and words per paragraph.",
        "Pick plain text or HTML <p> output.",
        "Click Generate, then Copy All.",
      ]} />
      <RelatedTools currentSlug="lorem-ipsum" />
      <ToolSeoContent
        title="Free Lorem Ipsum Generator — Online Tool"
        description="Quickly generate Lorem Ipsum placeholder text for mockups, wireframes, and design prototypes. Choose the number of paragraphs, words per paragraph, and copy as plain text or wrapped in HTML paragraph tags."
        body={[
          "Lorem Ipsum is the standard placeholder text used by designers and developers since the 1500s. It lets you focus on layout, typography, and spacing without being distracted by meaningful copy.",
          "This generator runs entirely in your browser. Adjust the sliders to control length, switch between plain text and HTML output, and paste straight into your design tool or codebase.",
        ]}
        faqs={[
          { question: "What is Lorem Ipsum?", answer: "It's classical Latin text used as filler content in mockups and prototypes." },
          { question: "Can I get HTML output?", answer: "Yes — toggle HTML <p> mode to wrap each paragraph in a <p> tag." },
          { question: "How many paragraphs can I generate?", answer: "Up to 10 paragraphs of up to 100 words each per click." },
          { question: "Is anything sent to a server?", answer: "No. Generation happens locally." },
        ]}
      />
    </ToolPageShell>
  );
}
