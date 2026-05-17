import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/url-encoder")({
  head: () => buildToolMeta(toolBySlug("url-encoder", tools)),
  component: UrlEncoderTool,
});

type Mode = "encode" | "decode";

function UrlEncoderTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const process = () => {
    setError("");
    if (!input.trim()) return;
    try {
      setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
    } catch {
      setError("Invalid URL-encoded string");
      setOutput("");
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => { setInput(""); setOutput(""); setError(""); };

  return (
    <ToolPageShell title="URL Encoder / Decoder" description="Encode or decode URL-safe strings using percent-encoding instantly.">
      <div className="space-y-5">
        <div className="flex bg-card border border-border rounded-2xl p-1">
          {(["encode", "decode"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setOutput(""); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === m ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "encode" ? "Encode → URL" : "Decode ← URL"}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {mode === "encode" ? "Plain Text" : "Encoded URL"}
            </span>
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Enter text to encode..." : "Enter %XX-encoded text to decode..."}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none font-mono text-sm min-h-[120px]"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{input.length} chars</div>
        </div>

        <button
          onClick={process}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {mode === "encode" ? "Encode URL" : "Decode URL"}
        </button>

        {(output || error) && (
          <div className={`bg-card border rounded-2xl p-4 ${error ? "border-red-500/40" : "border-border"}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{error ? "Error" : "Output"}</span>
              {output && (
                <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
            {error ? <p className="text-red-400 text-sm">{error}</p> : <p className="font-mono text-sm text-cyan-400 break-all">{output}</p>}
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Pick Encode or Decode.",
        "Paste your text or URL-encoded string.",
        "Click the action button and copy the result.",
      ]} />
      <RelatedTools currentSlug="url-encoder" />
      <ToolSeoContent
        title="Free URL Encoder & Decoder — Online Tool"
        description="Skycally's URL encoder converts text into URL-safe percent-encoded format and decodes it back. Perfect for query strings, API parameters, and links containing spaces or special characters."
        body={[
          "URL encoding (percent-encoding) replaces reserved characters like spaces, &, ?, and non-ASCII letters with %XX sequences so they can safely travel inside a URL. This is essential whenever you build query strings, share search links, or pass arbitrary text through HTTP parameters.",
          "Our tool uses the browser's native encodeURIComponent and decodeURIComponent APIs, which means it handles full Unicode — emojis, Arabic, CJK characters — correctly. No data ever leaves your device.",
        ]}
        faqs={[
          { question: "What does URL encoding do?", answer: "It converts reserved and non-ASCII characters into %XX hexadecimal escape sequences so they can be used safely in URLs." },
          { question: "Should I use encodeURI or encodeURIComponent?", answer: "This tool uses encodeURIComponent — the correct choice for query parameter values." },
          { question: "Does it support Unicode and emojis?", answer: "Yes, full Unicode is supported." },
          { question: "Is my data sent to a server?", answer: "No. Everything runs locally in your browser." },
        ]}
      />
    </ToolPageShell>
  );
}
