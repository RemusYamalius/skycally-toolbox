import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

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
    setError("");
    setOutput("");
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const minify = () => {
    setError("");
    setOutput("");
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

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

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
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
                setOutput("");
              }}
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

      <HowToUse
        steps={[
          "Paste your JSON into the input box on the left.",
          "Click Format to prettify with 2 or 4-space indentation, or Minify to compact it to one line.",
          "Copy the formatted output with one click.",
        ]}
      />

      <ToolSeoContent
        title="Free JSON Formatter & Validator — Beautify and Minify JSON Online"
        description="Format, prettify, validate and minify JSON instantly in your browser. Highlights syntax errors with clear messages. No data sent to any server — completely free, no signup."
        body={[
          "JSON (JavaScript Object Notation) is the most widely used data format for APIs, configuration files, and data exchange between applications. Skycally's JSON Formatter instantly parses and reformats any JSON string with proper indentation and line breaks, making it easy to read, debug, and understand the structure of any data response.",
          "The formatter also acts as a JSON validator — if your input contains a syntax error (missing comma, unclosed bracket, invalid value), the tool displays a precise error message showing exactly what went wrong. This is especially useful when debugging API responses or hand-editing configuration files where a single misplaced character breaks everything.",
          "Minifying JSON removes all whitespace, line breaks, and indentation to produce the most compact possible representation. This is used in production environments to reduce the size of JSON payloads sent over the network, improving API response times and reducing bandwidth costs. The difference can be significant for large JSON objects — a formatted 10 KB file might minify to 4 KB.",
        ]}
        faqs={[
          {
            question: "What does JSON formatting do?",
            answer:
              "Formatting (also called prettifying or beautifying) parses your JSON and rewrites it with consistent indentation, line breaks, and spacing. This makes nested structures easy to read and understand, compared to a compact single-line representation.",
          },
          {
            question: "What is JSON validation?",
            answer:
              "JSON validation checks whether your input is syntactically valid JSON. Common errors include missing or extra commas, unclosed brackets or braces, unquoted keys, single-quoted strings (JSON requires double quotes), and trailing commas. This tool highlights the exact error when validation fails.",
          },
          {
            question: "What is the difference between 2-space and 4-space indentation?",
            answer:
              "Both are valid and commonly used. 2-space indentation produces more compact output and is common in web development (JavaScript, Node.js). 4-space indentation is common in Python and other ecosystems. Choose based on your team's style guide or personal preference.",
          },
          {
            question: "What does minifying JSON do?",
            answer:
              "Minifying removes all whitespace, line breaks, and indentation from JSON, producing the smallest possible valid JSON string. This is used in APIs and web applications to reduce payload size and improve transfer speed. The data content is identical — only the formatting is removed.",
          },
          {
            question: "Is my JSON data sent to a server?",
            answer:
              "No. All formatting, validation, and minification happens locally in your browser using JavaScript's built-in JSON.parse() and JSON.stringify() functions. Your data never leaves your device.",
          },
          {
            question: "Can this handle very large JSON files?",
            answer:
              "Yes, within browser memory limits. JSON files up to several megabytes are handled without issues. Very large files (50 MB+) may be slow depending on your device, since parsing and stringifying large objects is memory-intensive.",
          },
          {
            question: "What is JSON used for?",
            answer:
              "JSON is used as the standard data format for REST APIs, configuration files (package.json, tsconfig.json), database documents (MongoDB, Firestore), data export/import, and communication between web services. It is supported natively in every major programming language.",
          },
          {
            question: "How do I fix a JSON syntax error?",
            answer:
              "Common fixes: ensure all keys are wrapped in double quotes (not single), check for trailing commas after the last item in arrays or objects, make sure all brackets and braces are properly closed, and verify that string values use double quotes. The error message shown by this tool points to the location of the problem.",
          },
        ]}
      />

      <RelatedTools currentSlug="json-formatter" />
    </ToolPageShell>
  );
}
