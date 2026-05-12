import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/base64")({
  head: () => buildToolMeta(toolBySlug("base64", tools)),
  component: Base64Tool,
});

type Mode = "encode" | "decode";

function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const process = () => {
    setError("");
    if (!input.trim()) return;
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
    } catch {
      setError(mode === "decode" ? "Invalid Base64 string" : "Encoding failed");
      setOutput("");
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swap = () => {
    setInput(output);
    setOutput("");
    setError("");
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPageShell title="Base64 Encoder / Decoder" description="Encode plain text to Base64 or decode Base64 strings instantly.">
      <div className="space-y-5">
        <div className="flex bg-card border border-border rounded-2xl p-1">
          {(["encode", "decode"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setOutput(""); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === m
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "encode" ? "Encode → Base64" : "Decode ← Base64"}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {mode === "encode" ? "Plain Text" : "Base64 String"}
            </span>
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none font-mono text-sm min-h-[120px]"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{input.length} chars</div>
        </div>

        <button
          onClick={process}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {mode === "encode" ? "Encode to Base64" : "Decode from Base64"}
        </button>

        {(output || error) && (
          <div className={`bg-card border rounded-2xl p-4 ${error ? "border-red-500/40" : "border-border"}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {error ? "Error" : mode === "encode" ? "Base64 Output" : "Decoded Text"}
              </span>
              {output && (
                <div className="flex gap-3">
                  <button onClick={swap} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                    ⇄ Swap
                  </button>
                  <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
            {error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : (
              <p className="font-mono text-sm text-cyan-400 break-all">{output}</p>
            )}
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Pick Encode or Decode.",
        "Paste your text or Base64 string and click the action button.",
        "Copy the result, or use Swap to round-trip back.",
      ]} />
    </ToolPageShell>
  );
}
