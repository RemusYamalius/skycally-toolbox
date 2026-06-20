import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

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
    <ToolPageShell
      title="Base64 Encoder / Decoder"
      description="Encode plain text to Base64 or decode Base64 strings instantly."
    >
      <div className="space-y-5">
        <div className="flex bg-card border border-border rounded-2xl p-1">
          {(["encode", "decode"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setOutput("");
                setError("");
              }}
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
                  <button
                    onClick={copy}
                    className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
                  >
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

      <HowToUse
        steps={[
          "Pick Encode to convert text to Base64, or Decode to convert Base64 back to text.",
          "Paste your input and click the action button.",
          "Copy the result or use Swap to reverse the operation instantly.",
        ]}
      />

      <ToolSeoContent
        title="Free Base64 Encoder & Decoder — Online Tool, No Upload"
        description="Encode plain text to Base64 or decode Base64 strings back to readable text instantly. Supports full Unicode including Arabic, emojis, and special characters. Runs entirely in your browser — no data sent to any server."
        body={[
          "Base64 is an encoding scheme that converts binary or text data into a string of ASCII characters, making it safe to transmit through systems that only handle text. It is one of the most commonly used encoding formats in web development, appearing in email attachments, data URIs, API authentication headers, and JSON payloads.",
          "This tool handles full Unicode text — including Arabic, Chinese, accented characters, and emojis — using the correct UTF-8 encoding pipeline (encodeURIComponent + btoa). Many simpler Base64 tools fail on non-ASCII characters. The Swap button lets you instantly reverse the operation: encode your output, then decode it again to verify round-trip fidelity.",
          "Base64 encoding increases data size by approximately 33% — every 3 bytes of input become 4 Base64 characters. This trade-off is acceptable for small payloads like authentication tokens or image data URIs, but Base64 is not suitable for large binary files where size matters.",
        ]}
        faqs={[
          {
            question: "What is Base64 used for?",
            answer:
              "Base64 is used to encode binary data for safe transmission in text-based systems. Common uses include embedding images in HTML or CSS as data URIs, encoding API credentials in HTTP Authorization headers (Basic Auth), encoding binary attachments in email (MIME), and storing binary data in JSON or XML.",
          },
          {
            question: "Does it support Unicode, Arabic, and emojis?",
            answer:
              "Yes. The tool uses the correct UTF-8 encoding pipeline (encodeURIComponent → btoa for encoding, atob → decodeURIComponent for decoding) which correctly handles all Unicode characters including Arabic, Chinese, accented Latin characters, and emojis. Simple btoa() alone would fail on these.",
          },
          {
            question: "What does the Swap button do?",
            answer:
              "Swap moves the current output into the input field and switches the mode from Encode to Decode (or vice versa). This lets you quickly verify that your encoded output decodes back to the original text — a round-trip check.",
          },
          {
            question: "What happens if I enter invalid Base64?",
            answer:
              "The tool displays a clear error message. Common causes of invalid Base64 include incorrect padding (Base64 strings must have a length divisible by 4, padded with = characters), invalid characters (only A–Z, a–z, 0–9, +, /, and = are valid), or corrupted data.",
          },
          {
            question: "Is my data sent to a server?",
            answer:
              "No. All encoding and decoding happens locally in your browser using the built-in btoa() and atob() JavaScript functions. Your data never leaves your device.",
          },
          {
            question: "Is Base64 the same as encryption?",
            answer:
              "No. Base64 is encoding, not encryption. It is completely reversible by anyone — no key or password is needed to decode it. Base64 is used for safe transmission of data, not for security. Never use Base64 to protect sensitive information.",
          },
          {
            question: "Why does Base64 make data larger?",
            answer:
              "Base64 encodes every 3 bytes of input into 4 ASCII characters, resulting in approximately 33% size increase. This overhead is the cost of making binary data safe for text-only transmission channels.",
          },
          {
            question: "Is there a size limit?",
            answer:
              "There is no enforced limit. However, very large inputs (several megabytes of text) may slow down the browser since encoding and decoding are synchronous operations. For large binary files, dedicated command-line tools are more appropriate.",
          },
        ]}
      />

      <RelatedTools currentSlug="base64" />
    </ToolPageShell>
  );
}
