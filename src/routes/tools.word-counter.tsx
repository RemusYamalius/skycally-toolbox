import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/word-counter")({
  head: () => ({
    meta: [
      { title: "Word Counter — Count words, characters & reading time · Skycally" },
      { name: "description", content: "Count words, characters, sentences and estimate reading time. Free, fast, no signup." },
      { property: "og:title", content: "Word Counter · Skycally" },
      { property: "og:description", content: "Count words, characters, sentences and estimate reading time." },
    ],
  }),
  component: WordCounter,
});

function WordCounter() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    const sentences = text.trim() === "" ? 0 : text.split(/[.!?]+/).filter((s) => s.trim()).length;
    const paragraphs = text.trim() === "" ? 0 : text.split(/\n+/).filter((p) => p.trim()).length;
    const readingTime = Math.ceil(words / 200);
    return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime };
  }, [text]);

  const clear = () => setText("");
  const copy = () => navigator.clipboard.writeText(text);

  return (
    <ToolPageShell title="Word Counter" description="Count words, characters, sentences and estimate reading time.">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Words", value: stats.words },
            { label: "Characters", value: stats.chars },
            { label: "No Spaces", value: stats.charsNoSpaces },
            { label: "Sentences", value: stats.sentences },
            { label: "Paragraphs", value: stats.paragraphs },
            { label: "Read Time", value: `${stats.readingTime} min` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400 font-mono">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Text</span>
            <div className="flex gap-3">
              <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">Copy</button>
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">Clear</button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none text-sm min-h-[280px] leading-relaxed"
          />
        </div>
      </div>

      <HowToUse steps={[
        "Paste or type your text into the box.",
        "Stats update live: words, characters, sentences, paragraphs and reading time.",
        "Use Copy or Clear to manage your text.",
      ]} />
    </ToolPageShell>
  );
}
