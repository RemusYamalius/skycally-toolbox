import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
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
            type="number"
            min={1}
            max={20}
            value={count}
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
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {uuids.length} UUID{uuids.length > 1 ? "s" : ""}
              </span>
              <button onClick={copyAll} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                {copiedAll ? "✓ Copied" : "Copy All"}
              </button>
            </div>
            <ul className="space-y-2 max-h-[400px] overflow-auto">
              {uuids.map((u, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 bg-background/50 border border-border/60 rounded-xl px-3 py-2"
                >
                  <code className="font-mono text-sm text-cyan-400 break-all">{u}</code>
                  <button
                    onClick={() => copyOne(u, i)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
                  >
                    {copiedIdx === i ? "✓" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AdZone id="uuid-generator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick how many UUIDs you need (1–20).",
          "Click Generate to create them instantly.",
          "Copy a single value or use Copy All.",
        ]}
      />

      <ToolSeoContent
        title="Free UUID Generator Online — Generate UUID v4 Instantly"
        description="Generate cryptographically secure UUID v4 identifiers instantly in your browser. Bulk generate up to 20 at once. Free, no signup, runs locally."
        body={[
          "A UUID (Universally Unique Identifier) is a 128-bit value that is practically guaranteed to be unique across all space and time. UUID version 4 identifiers are generated entirely from random data, formatted as 32 hexadecimal characters separated by hyphens in the pattern 8-4-4-4-12 (e.g., 550e8400-e29b-41d4-a716-446655440000). They are the standard choice for database primary keys, session tokens, file names, and any context requiring a unique identifier.",
          "This tool uses the browser's Web Crypto API (crypto.randomUUID()) to generate cryptographically secure random UUIDs. The Web Crypto API uses the operating system's secure random number generator, making the output suitable for security-sensitive applications — unlike Math.random() which is not cryptographically secure. A getRandomValues fallback is used for older browsers that don't support crypto.randomUUID.",
          "You can generate between 1 and 20 UUIDs per click. Each UUID is displayed in the standard lowercase format with hyphens. Click Copy next to any individual UUID to copy it, or use Copy All to copy the entire batch as a newline-separated list for pasting into code, spreadsheets, or databases.",
          "UUID v4 collision probability is negligibly small. The number of random version 4 UUIDs that would need to be generated to have a 50% probability of a single collision is approximately 2.71 quintillion — making practical collisions impossible for any real application.",
        ]}
        faqs={[
          {
            question: "What is a UUID v4?",
            answer:
              "UUID v4 is a 128-bit identifier generated entirely from random data. It is formatted as 32 hexadecimal characters in the pattern 8-4-4-4-12 separated by hyphens. The 'v4' indicates it uses random generation rather than time-based (v1) or name-based (v3/v5) methods.",
          },
          {
            question: "Are generated UUIDs truly unique?",
            answer:
              "Yes, practically. The probability of generating two identical UUID v4s is approximately 1 in 5.3 × 10^36. For context, you would need to generate 1 billion UUIDs per second for 100 years to have a 50% chance of a single collision. UUID v4 is safe to use as a primary key without any collision checking.",
          },
          {
            question: "Is the generation cryptographically secure?",
            answer:
              "Yes. The tool uses the browser's Web Crypto API (crypto.randomUUID()), which draws from the operating system's cryptographically secure random number generator (CSPRNG). This is the same source used for cryptographic keys and is suitable for security-sensitive identifiers.",
          },
          {
            question: "How many UUIDs can I generate at once?",
            answer: "Up to 20 UUIDs per generation. Click Generate again for another batch of up to 20.",
          },
          {
            question: "What is the difference between UUID v1, v4, and v7?",
            answer:
              "UUID v1 is time-based and includes the MAC address of the generating machine (a privacy concern). UUID v4 is fully random — the most widely used version. UUID v7 is a newer standard that combines a timestamp prefix with random data for sortability, which is useful for database performance.",
          },
          {
            question: "Can I use these UUIDs as database primary keys?",
            answer:
              "Yes. UUID v4 is one of the most common choices for primary keys in distributed systems because it can be generated client-side without querying the database, and is guaranteed unique across multiple servers. Some databases (PostgreSQL, MySQL 8+) have native UUID types for efficient storage.",
          },
          {
            question: "Is anything sent to a server?",
            answer:
              "No. UUID generation runs entirely in your browser using the Web Crypto API. Nothing is transmitted to any server, and no generated UUID is ever logged or stored by Skycally.",
          },
          {
            question: "What format are the UUIDs in?",
            answer:
              "Standard UUID format: lowercase hexadecimal characters in the pattern xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx, where 4 identifies the version and y is either 8, 9, a, or b (the variant bits). Example: 550e8400-e29b-41d4-a716-446655440000.",
          },
        ]}
      />

      <RelatedTools currentSlug="uuid-generator" />
    </ToolPageShell>
  );
}
