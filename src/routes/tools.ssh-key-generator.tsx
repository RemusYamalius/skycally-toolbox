import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Copy, Check, Download, Loader2, AlertTriangle, Lock, ShieldAlert } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { loadScript } from "@/lib/cdnScript";

export const Route = createFileRoute("/tools/ssh-key-generator")({
  head: () => buildToolMeta(toolBySlug("ssh-key-generator", tools)),
  component: SshKeyGeneratorPage,
});

type KeyType = "ed25519" | "rsa-2048" | "rsa-3072" | "rsa-4096";

interface KeyPair {
  publicKey: string;
  privateKey: string;
  type: KeyType;
}

// ---------------- Helpers ----------------

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}

function sshString(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return concatBytes(u32(bytes.length), bytes);
}

function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function wrap64(s: string): string {
  return s.match(/.{1,70}/g)?.join("\n") ?? s;
}

// Extract 32-byte raw Ed25519 private seed from PKCS8 export.
// PKCS8 Ed25519 layout ends with OCTET STRING (32 bytes seed) wrapped in
// another OCTET STRING. We find the last 0x04 0x20 marker.
function extractEd25519Seed(pkcs8: Uint8Array): Uint8Array {
  for (let i = pkcs8.length - 34; i >= 0; i--) {
    if (pkcs8[i] === 0x04 && pkcs8[i + 1] === 0x20) {
      return pkcs8.slice(i + 2, i + 34);
    }
  }
  throw new Error("Could not parse Ed25519 PKCS8 key");
}

// ---------------- Ed25519 generation ----------------

async function generateEd25519(comment: string): Promise<KeyPair> {
  const subtle = window.crypto?.subtle as SubtleCrypto | undefined;
  if (!subtle) throw new Error("Web Crypto API not available");

  let keyPair: CryptoKeyPair;
  try {
    keyPair = (await subtle.generateKey(
      { name: "Ed25519" } as unknown as AlgorithmIdentifier,
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;
  } catch {
    throw new Error("Ed25519 is not supported in this browser. Please choose RSA instead.");
  }

  const rawPub = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
  const pkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));
  const seed = extractEd25519Seed(pkcs8);
  const privBlob = concatBytes(seed, rawPub); // 64 bytes: seed || pub

  // --- Public key (one-line OpenSSH) ---
  const pubWire = concatBytes(sshString("ssh-ed25519"), sshString(rawPub));
  const publicKey = `ssh-ed25519 ${base64Encode(pubWire)} ${comment}`.trim();

  // --- Private key (OpenSSH v1 unencrypted) ---
  const magic = new TextEncoder().encode("openssh-key-v1\0");
  const checkInt = crypto.getRandomValues(new Uint8Array(4));

  const innerUnpadded = concatBytes(
    checkInt,
    checkInt,
    sshString("ssh-ed25519"),
    sshString(rawPub),
    sshString(privBlob),
    sshString(comment),
  );
  // Pad to multiple of 8 (block size for "none" cipher)
  const padLen = (8 - (innerUnpadded.length % 8)) % 8;
  const padding = new Uint8Array(padLen);
  for (let i = 0; i < padLen; i++) padding[i] = i + 1;
  const inner = concatBytes(innerUnpadded, padding);

  const body = concatBytes(
    magic,
    sshString("none"), // ciphername
    sshString("none"), // kdfname
    sshString(""), // kdfoptions
    u32(1), // number of keys
    sshString(pubWire), // public key blob
    sshString(inner), // encrypted (unencrypted) private blob
  );

  const privateKey =
    `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrap64(base64Encode(body))}\n-----END OPENSSH PRIVATE KEY-----\n`;

  return { publicKey, privateKey, type: "ed25519" };
}

// ---------------- RSA generation (via node-forge CDN) ----------------

const FORGE_URL = "https://cdn.jsdelivr.net/npm/node-forge@1.3.1/dist/forge.min.js";

async function generateRsa(bits: number, comment: string, type: KeyType): Promise<KeyPair> {
  await loadScript(FORGE_URL);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forge = (window as any).forge;
  if (!forge?.pki?.rsa) throw new Error("Failed to load RSA library");

  const keypair: { publicKey: unknown; privateKey: unknown } = await new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits, workers: -1 }, (err: Error | null, kp: unknown) => {
      if (err) reject(err);
      else resolve(kp as { publicKey: unknown; privateKey: unknown });
    });
  });

  const publicKey: string = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, comment);
  const privateKey: string = forge.ssh.privateKeyToOpenSSH(keypair.privateKey);

  return { publicKey: publicKey.trim(), privateKey: privateKey.endsWith("\n") ? privateKey : privateKey + "\n", type };
}

// ---------------- UI ----------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SshKeyGeneratorPage() {
  const tool = toolBySlug("ssh-key-generator", tools);
  const [keyType, setKeyType] = useState<KeyType>("ed25519");
  const [comment, setComment] = useState("user@hostname");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KeyPair | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const safeComment = comment.trim() || "user@hostname";
      let pair: KeyPair;
      if (keyType === "ed25519") {
        pair = await generateEd25519(safeComment);
      } else {
        const bits = keyType === "rsa-2048" ? 2048 : keyType === "rsa-3072" ? 3072 : 4096;
        pair = await generateRsa(bits, safeComment, keyType);
      }
      setResult(pair);
    } catch (e) {
      setError((e as Error).message || "Key generation failed.");
    } finally {
      setLoading(false);
    }
  }, [keyType, comment]);

  const handleDownload = () => {
    if (!result) return;
    const base = result.type === "ed25519" ? "id_ed25519" : "id_rsa";
    downloadText(`${base}.pub.txt`, result.publicKey + "\n");
    downloadText(`${base}.txt`, result.privateKey);
  };

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* Privacy badge */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "color-mix(in oklab, var(--green-brand) 12%, transparent)",
            color: "var(--green-brand)",
            border: "1px solid color-mix(in oklab, var(--green-brand) 35%, transparent)",
          }}
        >
          <Lock className="w-3.5 h-3.5" /> No data is stored on our servers — keys are generated locally in your browser
        </span>
      </div>

      {/* Options panel */}
      <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="key-type" className="block text-sm font-medium text-foreground mb-2">
              Key type
            </label>
            <select
              id="key-type"
              value={keyType}
              onChange={(e) => setKeyType(e.target.value as KeyType)}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="ed25519">Ed25519 (recommended)</option>
              <option value="rsa-2048">RSA 2048</option>
              <option value="rsa-3072">RSA 3072</option>
              <option value="rsa-4096">RSA 4096</option>
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              Ed25519 is faster and shorter; RSA is widely compatible with older servers.
            </p>
          </div>

          <div>
            <label htmlFor="key-comment" className="block text-sm font-medium text-foreground mb-2">
              Comment / label <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="key-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="user@hostname"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Appears at the end of the public key — typically your email or user@hostname.
            </p>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} size="lg" className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {loading
            ? keyType.startsWith("rsa")
              ? "Generating RSA key (may take a few seconds)…"
              : "Generating…"
            : "Generate Key Pair"}
        </Button>
      </div>

      {error && (
        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: "color-mix(in oklab, var(--orange-brand) 40%, transparent)",
            background: "color-mix(in oklab, var(--orange-brand) 10%, transparent)",
            color: "var(--foreground)",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Warning banner */}
          <div
            className="mt-6 rounded-xl border p-4 flex items-start gap-3"
            style={{
              borderColor: "color-mix(in oklab, var(--orange-brand) 45%, transparent)",
              background: "color-mix(in oklab, var(--orange-brand) 12%, transparent)",
            }}
          >
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--orange-brand)" }} />
            <div className="text-sm text-foreground">
              <strong>Never share your private key.</strong> Save it securely immediately — anyone with this file can authenticate as you.
            </div>
          </div>

          {/* Public key */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-card/60 p-5"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display text-lg font-semibold">Public Key</h3>
              <CopyButton value={result.publicKey} />
            </div>
            <pre className="rounded-lg bg-background border border-border p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-64">
              {result.publicKey}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Safe to share. Add this to <code>~/.ssh/authorized_keys</code> on servers or to your GitHub / GitLab account.
            </p>
          </motion.div>

          {/* Private key */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border p-5"
            style={{
              borderColor: "color-mix(in oklab, var(--orange-brand) 45%, transparent)",
              background: "color-mix(in oklab, var(--orange-brand) 6%, transparent)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold">Private Key</h3>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "color-mix(in oklab, var(--orange-brand) 20%, transparent)",
                    color: "var(--orange-brand)",
                    border: "1px solid color-mix(in oklab, var(--orange-brand) 45%, transparent)",
                  }}
                >
                  <ShieldAlert className="w-3 h-3" /> Keep secret
                </span>
              </div>
              <CopyButton value={result.privateKey} />
            </div>
            <pre className="rounded-lg bg-background border border-border p-3 text-xs font-mono whitespace-pre overflow-x-auto max-h-80">
              {result.privateKey}
            </pre>
            <p className="mt-2 text-xs" style={{ color: "var(--orange-brand)" }}>
              Save to <code>~/.ssh/id_{result.type === "ed25519" ? "ed25519" : "rsa"}</code> and run{" "}
              <code>chmod 600</code> on it. Never paste this anywhere public.
            </p>
          </motion.div>

          <div className="mt-4">
            <Button onClick={handleDownload} variant="secondary" size="lg" className="gap-2">
              <Download className="w-4 h-4" />
              Download Keys
            </Button>
          </div>
        </>
      )}

      {/* Explanation */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h4 className="font-display font-semibold mb-2">What is SSH?</h4>
          <p className="text-sm text-muted-foreground">
            SSH (Secure Shell) is the standard protocol for logging into remote servers and pushing code to Git providers. Key pairs replace passwords with strong public-key cryptography.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h4 className="font-display font-semibold mb-2">Public vs Private</h4>
          <p className="text-sm text-muted-foreground">
            Your <strong>public key</strong> is uploaded to servers or GitHub and identifies you. Your <strong>private key</strong> stays only on your machine and proves you're you. Anyone with your private key can impersonate you.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h4 className="font-display font-semibold mb-2">How to use it</h4>
          <p className="text-sm text-muted-foreground">
            On GitHub: <em>Settings → SSH and GPG keys → New SSH key</em> and paste your public key. On a server: append the public key to <code>~/.ssh/authorized_keys</code>. Keep the private key in <code>~/.ssh/</code> with permissions <code>600</code>.
          </p>
        </div>
      </section>

      <HowToUse
        steps={[
          "Choose a key type — Ed25519 is recommended for new keys; RSA is best for legacy compatibility.",
          "Add an optional comment (typically your email or user@hostname) to label the key.",
          "Click Generate Key Pair — everything happens locally in your browser.",
          "Copy or download both keys. Add the public key to your server or GitHub; keep the private key safe and never share it.",
        ]}
      />

      <ToolSeoContent
        title="Free SSH Key Generator — Create Ed25519 & RSA Keys in Your Browser"
        description="Generate secure SSH key pairs (Ed25519 or RSA 2048/3072/4096) entirely in your browser. Standard OpenSSH format, ready for GitHub, GitLab and any Linux server."
        body={[
          "Our free SSH Key Generator creates a fresh key pair in standard OpenSSH format directly inside your browser, using the Web Crypto API for Ed25519 and the well-known node-forge library for RSA. Nothing is ever uploaded — the public and private keys are computed on your device and never touch our servers.",
          "Ed25519 is the modern default: small, fast and secure with a 256-bit key that's the cryptographic equivalent of RSA 3072+. Use RSA 2048, 3072 or 4096 if you need to connect to older systems that don't yet support Ed25519. The output is fully compatible with OpenSSH, GitHub, GitLab, Bitbucket, AWS, and any standard Linux/macOS server.",
          "Once generated, copy the public key into your server's authorized_keys file or paste it into your GitHub SSH settings. Save the private key to ~/.ssh/, set its permissions with chmod 600, and never share it — anyone with your private key can authenticate as you.",
        ]}
        faqs={[
          {
            question: "Is this SSH key generator safe to use?",
            answer:
              "Yes. Key generation runs entirely in your browser using the Web Crypto API (Ed25519) and node-forge (RSA). Your private key is never transmitted, logged, or stored on our servers.",
          },
          {
            question: "Should I choose Ed25519 or RSA?",
            answer:
              "Ed25519 is recommended for almost every modern use case — it's faster, shorter and very secure. Choose RSA 3072 or 4096 only if you need to connect to legacy servers that don't support Ed25519.",
          },
          {
            question: "How do I add the key to GitHub?",
            answer:
              "Copy the public key, then go to GitHub → Settings → SSH and GPG keys → New SSH key, paste it in and save. You can then push and pull via SSH using git@github.com URLs.",
          },
          {
            question: "What format are the keys in?",
            answer:
              "Both keys use the standard OpenSSH format. The public key is a single ssh-ed25519 or ssh-rsa line; the private key is wrapped in -----BEGIN OPENSSH PRIVATE KEY----- and works with ssh, scp, git and OpenSSH-compatible clients.",
          },
        ]}
      />

      <RelatedTools currentSlug="ssh-key-generator" />
    </ToolPageShell>
  );
}
