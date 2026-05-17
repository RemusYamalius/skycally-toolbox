import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/uuid-generator")({
  head: () => buildToolMeta(toolBySlug("uuid-generator", tools)),
  component: UuidGeneratorTool,
});

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}

function UuidGeneratorTool() {
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = () => {
    const n = Math.max(1, Math.min(20, count));
    setUuids(Array.from({ length: n }, uuidv4));
  };

  const copyOne = (u: string, i: number) => {
    navigator.clipboard.writeText(u);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    if (!uuids.length) return;
    navigator.clipboard.writeText(uuids.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <ToolPageShell title="UUID Generator" description="Generate random UUID v4 identifiers — single or in bulk.">
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">How many? (1–20)</label>
          <input
            type="number" min={1} max={20} value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-full mt-2 bg-transparent border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={generate}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Generate UUID{count > 1 ? "s" : ""}
        </button>

        {uuids.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{uuids.length} UUID{uuids.length > 1 ? "s" : ""}</span>
              <button onClick={copyAll} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                {copiedAll ? "✓ Copied" : "Copy All"}
              </button>
            </div>
            <ul className="space-y-2 max-h-[400px] overflow-auto">
              {uuids.map((u, i) => (
                <li key={i} className="flex items-center justify-between gap-3 bg-background/50 border border-border/60 rounded-xl px-3 py-2">
                  <code className="font-mono text-sm text-cyan-400 break-all">{u}</code>
                  <button onClick={() => copyOne(u, i)} className="shrink-0 text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {copiedIdx === i ? "✓" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Pick how many UUIDs you need (1–20).",
        "Click Generate to create them instantly.",
        "Copy a single value or use Copy All.",
      ]} />
      <RelatedTools currentSlug="uuid-generator" />
      <ToolSeoContent
        title="Free UUID v4 Generator — Online Tool"
        description="Generate cryptographically random UUID version 4 identifiers in your browser. Useful for database keys, API tokens, file names, and any case where you need a guaranteed unique identifier."
        body={[
          "A UUID (Universally Unique Identifier) is a 128-bit value commonly written as 36 hexadecimal characters with hyphens. Version 4 UUIDs are generated from random data, making collisions practically impossible.",
          "This tool uses the Web Crypto API (crypto.randomUUID) for true cryptographic randomness, with a getRandomValues fallback for older browsers. Nothing is transmitted — generation happens locally.",
        ]}
        faqs={[
          { question: "What is a UUID v4?", answer: "A 128-bit identifier generated from random data, formatted as 8-4-4-4-12 hex characters." },
          { question: "Are these truly unique?", answer: "Collisions are astronomically unlikely — UUID v4 is safe to use as a primary key." },
          { question: "How many can I generate at once?", answer: "Up to 20 UUIDs per click." },
          { question: "Is it secure?", answer: "Yes — generation uses the browser's cryptographically secure random source." },
        ]}
      />
    </ToolPageShell>
  );
}
