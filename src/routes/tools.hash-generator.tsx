import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/hash-generator")({
  head: () => buildToolMeta(toolBySlug("hash-generator", tools)),
  component: HashGeneratorTool,
});

// Minimal MD5 implementation (public domain, Joseph Myers)
function md5(str: string): string {
  function rh(n: number) {
    let s = "";
    for (let j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
    return s;
  }
  function ad(x: number, y: number) {
    const l = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff);
  }
  function rl(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cm(q: number, a: number, b: number, x: number, s: number, t: number) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm(c ^ (b | ~d), a, b, x, s, t); }
  function cb(s: string): number[] {
    const n = s.length;
    const blks: number[] = [];
    for (let i = 0; i < n; i++) blks[i >> 2] = (blks[i >> 2] || 0) | (s.charCodeAt(i) << ((i % 4) * 8));
    blks[n >> 2] = (blks[n >> 2] || 0) | (0x80 << ((n % 4) * 8));
    blks[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8;
    return blks;
  }
  const utf8 = unescape(encodeURIComponent(str));
  const x = cb(utf8);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i] | 0, 7, -680876936);
    d = ff(d, a, b, c, x[i + 1] | 0, 12, -389564586);
    c = ff(c, d, a, b, x[i + 2] | 0, 17, 606105819);
    b = ff(b, c, d, a, x[i + 3] | 0, 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4] | 0, 7, -176418897);
    d = ff(d, a, b, c, x[i + 5] | 0, 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6] | 0, 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7] | 0, 22, -45705983);
    a = ff(a, b, c, d, x[i + 8] | 0, 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9] | 0, 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10] | 0, 17, -42063);
    b = ff(b, c, d, a, x[i + 11] | 0, 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12] | 0, 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13] | 0, 12, -40341101);
    c = ff(c, d, a, b, x[i + 14] | 0, 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15] | 0, 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1] | 0, 5, -165796510);
    d = gg(d, a, b, c, x[i + 6] | 0, 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11] | 0, 14, 643717713);
    b = gg(b, c, d, a, x[i] | 0, 20, -373897302);
    a = gg(a, b, c, d, x[i + 5] | 0, 5, -701558691);
    d = gg(d, a, b, c, x[i + 10] | 0, 9, 38016083);
    c = gg(c, d, a, b, x[i + 15] | 0, 14, -660478335);
    b = gg(b, c, d, a, x[i + 4] | 0, 20, -405537848);
    a = gg(a, b, c, d, x[i + 9] | 0, 5, 568446438);
    d = gg(d, a, b, c, x[i + 14] | 0, 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3] | 0, 14, -187363961);
    b = gg(b, c, d, a, x[i + 8] | 0, 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13] | 0, 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2] | 0, 9, -51403784);
    c = gg(c, d, a, b, x[i + 7] | 0, 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12] | 0, 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5] | 0, 4, -378558);
    d = hh(d, a, b, c, x[i + 8] | 0, 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11] | 0, 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14] | 0, 23, -35309556);
    a = hh(a, b, c, d, x[i + 1] | 0, 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4] | 0, 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7] | 0, 16, -155497632);
    b = hh(b, c, d, a, x[i + 10] | 0, 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13] | 0, 4, 681279174);
    d = hh(d, a, b, c, x[i] | 0, 11, -358537222);
    c = hh(c, d, a, b, x[i + 3] | 0, 16, -722521979);
    b = hh(b, c, d, a, x[i + 6] | 0, 23, 76029189);
    a = hh(a, b, c, d, x[i + 9] | 0, 4, -640364487);
    d = hh(d, a, b, c, x[i + 12] | 0, 11, -421815835);
    c = hh(c, d, a, b, x[i + 15] | 0, 16, 530742520);
    b = hh(b, c, d, a, x[i + 2] | 0, 23, -995338651);
    a = ii(a, b, c, d, x[i] | 0, 6, -198630844);
    d = ii(d, a, b, c, x[i + 7] | 0, 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14] | 0, 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5] | 0, 21, -57434055);
    a = ii(a, b, c, d, x[i + 12] | 0, 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3] | 0, 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10] | 0, 15, -1051523);
    b = ii(b, c, d, a, x[i + 1] | 0, 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8] | 0, 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15] | 0, 10, -30611744);
    c = ii(c, d, a, b, x[i + 6] | 0, 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13] | 0, 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4] | 0, 6, -145523070);
    d = ii(d, a, b, c, x[i + 11] | 0, 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2] | 0, 15, 718787259);
    b = ii(b, c, d, a, x[i + 9] | 0, 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

async function sha(algo: "SHA-1" | "SHA-256" | "SHA-512", text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Hashes = { md5: string; sha1: string; sha256: string; sha512: string };

function HashGeneratorTool() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Hashes | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const generate = async () => {
    if (!input) { setHashes(null); return; }
    const [sha1, sha256, sha512] = await Promise.all([sha("SHA-1", input), sha("SHA-256", input), sha("SHA-512", input)]);
    setHashes({ md5: md5(input), sha1, sha256, sha512 });
  };

  const copy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const rows: { key: keyof Hashes; label: string }[] = [
    { key: "md5", label: "MD5" },
    { key: "sha1", label: "SHA-1" },
    { key: "sha256", label: "SHA-256" },
    { key: "sha512", label: "SHA-512" },
  ];

  return (
    <ToolPageShell title="Hash Generator" description="Compute MD5, SHA-1, SHA-256 and SHA-512 hashes from any text.">
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Input text</span>
            <button onClick={() => { setInput(""); setHashes(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to hash..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none font-mono text-sm min-h-[120px]"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{input.length} chars</div>
        </div>

        <button
          onClick={generate}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Generate Hashes
        </button>

        {hashes && (
          <div className="space-y-3">
            {rows.map(({ key, label }) => (
              <div key={key} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
                  <button onClick={() => copy(key, hashes[key])} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {copiedKey === key ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-sm text-cyan-400 break-all">{hashes[key]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Paste or type any text into the input box.",
        "Click Generate Hashes to compute all four.",
        "Copy any individual hash with one click.",
      ]} />
      <RelatedTools currentSlug="hash-generator" />
      <ToolSeoContent
        title="Free MD5, SHA-1, SHA-256 & SHA-512 Hash Generator"
        description="Generate cryptographic hashes from any text in your browser. Get MD5, SHA-1, SHA-256, and SHA-512 digests instantly — useful for checksums, integrity verification, and development workflows."
        body={[
          "Hash functions take an input of any length and produce a fixed-length fingerprint. Even a one-character change in the input produces a completely different hash, which makes hashes ideal for verifying data integrity or comparing values without exposing the original.",
          "MD5 and SHA-1 are fast but no longer considered secure for cryptographic purposes — use SHA-256 or SHA-512 for security-sensitive work. All computation happens locally using the Web Crypto API; your text never leaves the browser.",
        ]}
        faqs={[
          { question: "Are these hashes secure?", answer: "SHA-256 and SHA-512 are secure. MD5 and SHA-1 are suitable only for non-security uses like checksums." },
          { question: "Which API is used?", answer: "SHA variants use the browser's Web Crypto API; MD5 uses a pure-JS implementation since Web Crypto doesn't include it." },
          { question: "Does it support Unicode?", answer: "Yes — input is encoded as UTF-8 before hashing." },
          { question: "Is my text uploaded?", answer: "No. Everything runs entirely in your browser." },
        ]}
      />
    </ToolPageShell>
  );
}
