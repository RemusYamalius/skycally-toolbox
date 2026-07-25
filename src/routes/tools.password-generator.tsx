import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useCallback, useEffect } from "react";
import { Copy, Check, RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/password-generator")({
  head: () => buildToolMeta(toolBySlug("password-generator", tools)),
  component: PasswordGeneratorPage,
});

// ─── Charsets ─────────────────────────────────────────────────────────────────
const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};
const AMBIGUOUS = new Set([..."0Ol1I"]);

// ─── Strength calculation (0–100 score) ──────────────────────────────────────
interface Strength {
  score: number; // 0-100
  label: string;
  color: string;
  Icon: typeof Shield;
  tips: string[];
}

function calcStrength(password: string): Strength {
  if (!password) return { score: 0, label: "None", color: "#6b7280", Icon: ShieldX, tips: [] };

  let score = 0;
  const tips: string[] = [];

  // Length scoring (up to 40 pts)
  if (password.length >= 6) score += 10;
  if (password.length >= 10) score += 10;
  if (password.length >= 14) score += 10;
  if (password.length >= 20) score += 10;
  if (password.length < 12) tips.push("Use at least 12 characters");

  // Character variety (up to 40 pts)
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (hasUpper) score += 10;
  else tips.push("Add uppercase letters");
  if (hasLower) score += 10;
  else tips.push("Add lowercase letters");
  if (hasNum) score += 10;
  else tips.push("Add numbers");
  if (hasSymbol) score += 10;
  else tips.push("Add symbols (!@#...)");

  // Entropy bonus (up to 20 pts)
  const uniqueRatio = new Set(password).size / password.length;
  if (uniqueRatio > 0.7) score += 10;
  if (uniqueRatio > 0.9) score += 10;

  const varietyCount = [hasUpper, hasLower, hasNum, hasSymbol].filter(Boolean).length;
  if (score <= 30 || varietyCount <= 1) return { score, label: "Very Weak", color: "#ef4444", Icon: ShieldX, tips };
  if (score <= 50) return { score, label: "Weak", color: "#f97316", Icon: ShieldAlert, tips };
  if (score <= 70) return { score, label: "Fair", color: "#f59e0b", Icon: Shield, tips };
  if (score <= 85) return { score, label: "Strong", color: "#22d3ee", Icon: ShieldCheck, tips };
  return { score, label: "Very Strong", color: "#22c55e", Icon: ShieldCheck, tips };
}

// ─── Generate one password ────────────────────────────────────────────────────
function generateOne(
  length: number,
  opts: { uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean },
  noAmbiguous: boolean,
): string {
  let charset = "";
  if (opts.uppercase) charset += CHARSETS.uppercase;
  if (opts.lowercase) charset += CHARSETS.lowercase;
  if (opts.numbers) charset += CHARSETS.numbers;
  if (opts.symbols) charset += CHARSETS.symbols;
  if (noAmbiguous) charset = [...charset].filter((c) => !AMBIGUOUS.has(c)).join("");
  if (!charset) return "";

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => charset[x % charset.length]).join("");
}

// ─── Main component ───────────────────────────────────────────────────────────
function PasswordGeneratorPage() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: false });
  const [noAmbiguous, setNoAmbiguous] = useState(false);
  const [autoRegen, setAutoRegen] = useState(false);
  const [count, setCount] = useState(1); // 1-10 passwords
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const noneSelected = !options.uppercase && !options.lowercase && !options.numbers && !options.symbols;

  const generate = useCallback(() => {
    if (noneSelected) return;
    const list = Array.from({ length: count }, () => generateOne(length, options, noAmbiguous));
    setPasswords(list);
    setCopied(null);
  }, [length, options, noAmbiguous, count, noneSelected]);

  // Auto-regenerate when settings change (if enabled)
  useEffect(() => {
    if (autoRegen && !noneSelected) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, options, noAmbiguous, autoRegen]);

  // Generate on first load
  useEffect(() => {
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyOne = async (pwd: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(idx);
      toast.success("Copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(passwords.join("\n"));
      toast.success(`${passwords.length} passwords copied!`);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const strength = passwords[0] ? calcStrength(passwords[0]) : null;
  const StrIcon = strength?.Icon ?? ShieldX;

  const OPTION_LABELS: Record<keyof typeof options, string> = {
    uppercase: "A–Z",
    lowercase: "a–z",
    numbers: "0–9",
    symbols: "!@#",
  };

  return (
    <ToolPageShell
      title="Password Generator"
      description="Generate strong, cryptographically secure passwords instantly — free, no signup, nothing stored."
    >
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        {/* ── Password list ── */}
        <div className="space-y-2">
          {passwords.length === 0 && (
            <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-muted-foreground text-sm">
              Click Generate to create your first password…
            </div>
          )}
          {passwords.map((pwd, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3"
            >
              <code className="flex-1 font-mono text-sm sm:text-base break-all select-all">{pwd}</code>
              <button
                onClick={() => copyOne(pwd, idx)}
                aria-label="Copy password"
                className="shrink-0 rounded-lg border border-border bg-card p-2 hover:bg-secondary transition"
              >
                {copied === idx ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
          {passwords.length > 1 && (
            <button
              onClick={copyAll}
              className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2"
            >
              Copy all {passwords.length} passwords
            </button>
          )}
        </div>

        {/* ── Strength indicator ── */}
        {strength && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <StrIcon className="w-3.5 h-3.5" style={{ color: strength.color }} />
                Strength
              </span>
              <span className="font-semibold" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${strength.score}%`, background: strength.color }}
              />
            </div>
            {strength.tips.length > 0 && <p className="text-[11px] text-muted-foreground">💡 {strength.tips[0]}</p>}
          </div>
        )}

        {/* ── Length slider ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Length</span>
            <span className="text-sm font-mono px-2 py-0.5 rounded bg-secondary min-w-[3rem] text-center">
              {length}
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-cyan-400"
            aria-label="Password length"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4 (min)</span>
            <span className="text-muted-foreground">Recommended: 12–20</span>
            <span>64 (max)</span>
          </div>
        </div>

        {/* ── Character options ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(options) as (keyof typeof options)[]).map((key) => {
            const active = options[key];
            return (
              <button
                key={key}
                onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  active
                    ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded grid place-content-center border shrink-0 ${active ? "border-cyan-400 bg-cyan-400" : "border-border"}`}
                >
                  {active && <Check className="w-3 h-3 text-background" />}
                </span>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">{OPTION_LABELS[key]}</span>
              </button>
            );
          })}
        </div>

        {/* ── Extra options row ── */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Exclude ambiguous */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              className={`w-4 h-4 rounded grid place-content-center border shrink-0 transition ${noAmbiguous ? "border-cyan-400 bg-cyan-400" : "border-border"}`}
              onClick={() => setNoAmbiguous((v) => !v)}
            >
              {noAmbiguous && <Check className="w-3 h-3 text-background" />}
            </span>
            <span className="text-muted-foreground">
              Exclude ambiguous <code className="bg-secondary rounded px-1 text-xs">0 O l 1 I</code>
            </span>
          </label>

          {/* Auto-regenerate */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              className={`w-4 h-4 rounded grid place-content-center border shrink-0 transition ${autoRegen ? "border-cyan-400 bg-cyan-400" : "border-border"}`}
              onClick={() => setAutoRegen((v) => !v)}
            >
              {autoRegen && <Check className="w-3 h-3 text-background" />}
            </span>
            <span className="text-muted-foreground">Auto-regenerate on change</span>
          </label>

          {/* Count */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground text-sm">Generate</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground text-sm">at once</span>
          </div>
        </div>

        {/* ── Generate button ── */}
        {noneSelected && <p className="text-xs text-amber-400 text-center">Select at least one character type.</p>}
        <button
          onClick={generate}
          disabled={noneSelected}
          className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {passwords.length ? "Regenerate" : "Generate Password"}
        </button>
      </div>

      <HowToUse
        steps={[
          "Set your desired password length using the slider — 16+ characters is recommended for most accounts.",
          "Choose which character types to include: uppercase, lowercase, numbers and symbols. More types = stronger password.",
          "Optionally enable 'Exclude ambiguous characters' to avoid characters like 0, O, l, 1 and I that look similar.",
          "Click Generate (or enable Auto-regenerate) to create one or more passwords instantly. Copy with one click — nothing is ever stored.",
        ]}
      />

      <ToolSeoContent
        title="Free Password Generator — Strong, Secure, Random Passwords Online"
        description="Generate strong, cryptographically random passwords instantly. Choose length (4–64), character types, and exclude ambiguous characters. Generate up to 10 passwords at once. Free, no signup, nothing stored or transmitted."
        body={[
          "Skycally's Password Generator creates cryptographically secure random passwords using the Web Crypto API built into every modern browser. Unlike Math.random() — which is predictable and unsuitable for security — the Web Crypto API uses your operating system's entropy sources (hardware timing, mouse movements, keyboard events) to produce randomness that cannot be predicted or reproduced. Every password you generate is unique and genuinely secure.",
          "A strong password should be at least 12 characters long and include a mix of uppercase letters, lowercase letters, numbers and symbols. The strength indicator scores your generated password on five factors: length, uppercase variety, lowercase variety, numeric variety, symbol variety, and character uniqueness ratio. A 16-character password using all four character types scores 'Very Strong' and would take centuries to crack with current hardware using brute-force methods. For critical accounts (banking, email, cloud storage), aim for 20+ characters with all character types enabled.",
          "The 'Exclude ambiguous characters' option removes characters that look visually similar in many fonts: the letter O and the number 0, the lowercase letter l and the number 1, and the capital letter I. This prevents copy errors when manually typing passwords from a screen — especially useful for Wi-Fi passwords and system administration tasks. The 'Generate multiple' option lets you create up to 10 unique passwords at once, ideal for batch account creation or comparing options.",
          "A password generator only solves half the problem — remembering dozens of unique, random passwords isn't realistic without help. Pair generated passwords with a reputable password manager to store them securely, and enable two-factor authentication wherever it's offered as an additional layer of protection beyond the password itself.",
        ]}
        faqs={[
          {
            question: "How secure are the generated passwords?",
            answer:
              "Passwords are generated using the Web Crypto API (window.crypto.getRandomValues), which provides cryptographically secure pseudorandom numbers based on your operating system's entropy. This is the same standard used by password managers and security tools. A 16-character password with all character types has over 95^16 possible combinations — effectively impossible to brute-force.",
          },
          {
            question: "Are my passwords stored or sent anywhere?",
            answer:
              "No. The entire generation process runs in your browser using JavaScript. Your password is never transmitted over the network, never logged, and never stored. Closing the tab erases it permanently. You can verify this by switching to airplane mode — the generator still works.",
          },
          {
            question: "What password length should I use?",
            answer:
              "Use at least 12 characters for standard accounts and 16–20 characters for critical accounts like email, banking, and cloud storage. The slider goes up to 64 characters — pair that with a password manager and you never need to memorise it.",
          },
          {
            question: "What does 'exclude ambiguous characters' do?",
            answer:
              "It removes characters that look visually similar in certain fonts: 0 (zero) and O (uppercase O), 1 (one) and l (lowercase L), and I (uppercase i). This prevents confusion when manually typing a password — for example when setting a Wi-Fi password on a TV or router.",
          },
          {
            question: "What is the strength indicator measuring?",
            answer:
              "The strength score (0–100) considers five factors: password length (up to 40 points), presence of uppercase letters, lowercase letters, numbers and symbols (10 points each), and character uniqueness ratio (up to 20 bonus points). Ratings go from Very Weak to Very Strong.",
          },
          {
            question: "Can I generate multiple passwords at once?",
            answer:
              "Yes. Use the 'Generate X at once' dropdown to create up to 10 passwords in a single click. Each is independently random. You can copy individual passwords or all of them at once.",
          },
          {
            question: "Should I use a password manager?",
            answer:
              "Yes — this generator is best paired with a password manager like Bitwarden (free and open-source), 1Password, or your browser's built-in manager. Generate a unique strong password for every account and let the manager remember it. Never reuse passwords across sites.",
          },
          {
            question: "What is the difference between a passphrase and a password?",
            answer:
              "A password is a random string of characters (like this generator produces). A passphrase is a sequence of random words (e.g. 'correct-horse-battery-staple'). Passphrases are easier to memorise and can be equally secure at longer lengths. For machine-generated passwords used in a password manager, a random character string is typically stronger per character than a passphrase.",
          },
        ]}
      />

      <RelatedTools currentSlug="password-generator" />
    </ToolPageShell>
  );
}
