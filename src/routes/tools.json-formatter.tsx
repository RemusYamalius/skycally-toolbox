import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/json-formatter")({
  head: () => buildToolMeta(toolBySlug("json-formatter", tools)),
  component: JsonFormatter,
});

function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);

  const format = () => {
    setError(""); setOutput("");
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const minify = () => {
    setError(""); setOutput("");
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => { setInput(""); setOutput(""); setError(""); };

  const lineCount = output ? output.split("\n").length : 0;

  return (
    <ToolPageShell title="JSON Formatter" description="Format, prettify and minify JSON instantly.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
            <span className="text-xs text-muted-foreground">Indent</span>
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setIndent(n)}
                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                  indent === n ? "bg-cyan-500 text-black" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={format}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Format / Prettify
          </button>
          <button
            onClick={minify}
            className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:border-cyan-500/50 hover:text-cyan-400 text-sm font-semibold transition-all"
          >
            Minify
          </button>
          <button
            onClick={clear}
            className="py-2.5 px-4 rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 text-sm transition-all"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Input JSON</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); setOutput(""); }}
              placeholder={'{\n  "key": "value"\n}'}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none font-mono text-sm min-h-[320px] leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className={`bg-card border rounded-2xl p-4 ${error ? "border-red-500/40" : "border-border"}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {error ? "Error" : `Output ${lineCount > 0 ? `· ${lineCount} lines` : ""}`}
              </span>
              {output && (
                <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
            {error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-xs font-mono leading-relaxed">{error}</p>
              </div>
            ) : (
              <pre className="font-mono text-sm text-cyan-400 whitespace-pre-wrap break-all min-h-[280px] leading-relaxed">
                {output || <span className="text-muted-foreground/60">Output will appear here...</span>}
              </pre>
            )}
          </div>
        </div>
      </div>

      <HowToUse steps={[
        "Paste your JSON into the input box.",
        "Click Format to prettify with 2 or 4-space indent, or Minify to compact it.",
        "Copy the result with one click.",
      ]} />
    </ToolPageShell>
  );
}
