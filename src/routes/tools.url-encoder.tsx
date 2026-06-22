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

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPageShell
      title="URL Encoder / Decoder"
      description="Encode or decode URL-safe strings using percent-encoding instantly."
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
              {m === "encode" ? "Encode → URL" : "Decode ← URL"}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {mode === "encode" ? "Plain Text" : "Encoded URL"}
            </span>
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
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
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {error ? "Error" : "Output"}
              </span>
              {output && (
                <button onClick={copy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
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
          "Pick Encode or Decode.",
          "Paste your text or URL-encoded string.",
          "Click the action button and copy the result.",
        ]}
      />

      <ToolSeoContent
        title="Free URL Encoder & Decoder Online — Percent-Encode Any Text"
        description="Encode text to URL-safe percent-encoded format or decode %XX sequences back to readable text. Supports full Unicode, Arabic, emojis. Free, instant, no signup."
        body={[
          "URL encoding (also called percent-encoding) converts characters that are not allowed in URLs — including spaces, ampersands, question marks, hash symbols, and non-ASCII characters — into safe %XX hexadecimal sequences. This is essential when building query strings, constructing API endpoints, sharing search result URLs, or passing arbitrary text through HTTP parameters.",
          "Skycally's URL Encoder uses the browser's native encodeURIComponent and decodeURIComponent APIs, which correctly handle the full Unicode character set including Arabic, Chinese, Japanese, Korean, emojis, and any other non-ASCII characters. Each character is encoded as its UTF-8 byte representation in %XX format.",
          "URL decoding is the reverse process — it takes a percent-encoded string like 'Hello%20World%21' and converts it back to the original readable text 'Hello World!'. This is useful for reading garbled URLs copied from browser address bars, debugging API request logs, or understanding encoded form submissions.",
          "Common characters that require URL encoding include: space → %20, & → %26, = → %3D, + → %2B, # → %23, / → %2F, ? → %3F, @ → %40. Most programming languages have built-in URL encoding functions, but this tool lets you quickly test encoding without writing code.",
        ]}
        faqs={[
          {
            question: "What is URL encoding?",
            answer:
              "URL encoding (percent-encoding) converts reserved and non-ASCII characters into %XX hexadecimal escape sequences so they can be safely included in URLs. For example, a space becomes %20 and & becomes %26.",
          },
          {
            question: "What is the difference between encodeURI and encodeURIComponent?",
            answer:
              "encodeURI encodes a full URL and leaves characters like /, ?, &, and = intact because they have meaning in URLs. encodeURIComponent (used by this tool) encodes individual parameter values and encodes those characters too, making it the correct choice for query string values.",
          },
          {
            question: "Does it support Unicode, Arabic, and emojis?",
            answer:
              "Yes. The tool uses the browser's native encodeURIComponent which handles the full Unicode character set. Arabic text, Chinese characters, Japanese, emojis, and all other non-ASCII characters are correctly encoded as their UTF-8 byte sequences in %XX format.",
          },
          {
            question: "Is my text sent to a server?",
            answer:
              "No. All encoding and decoding runs locally in your browser using JavaScript's built-in encodeURIComponent and decodeURIComponent functions. Nothing is transmitted anywhere.",
          },
          {
            question: "How do I URL-encode a space?",
            answer:
              "A space encodes to %20 using encodeURIComponent (used by this tool). Some systems use + to represent a space in query strings, but %20 is the standard and more universally compatible encoding.",
          },
          {
            question: "What is the difference between URL encoding and Base64 encoding?",
            answer:
              "URL encoding makes arbitrary text safe for use in URLs by encoding special characters as %XX sequences. Base64 encoding converts binary data into ASCII text for transmission in systems that only handle text. They serve different purposes and are not interchangeable.",
          },
          {
            question: "Why does my URL contain %20 or %3D?",
            answer:
              "These are percent-encoded characters. %20 is a space, %3D is =, %26 is &, %3F is ?. Paste the encoded URL into the Decode field of this tool to see the original readable text.",
          },
          {
            question: "Can I URL-encode an entire URL?",
            answer:
              "You can, but usually you should only encode the individual query parameter values, not the full URL. Encoding the full URL would also encode the / and ? characters, making the URL unusable. Use encodeURIComponent on each value before appending it to the URL.",
          },
        ]}
      />

      <RelatedTools currentSlug="url-encoder" />
    </ToolPageShell>
  );
}
