import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/password-generator")({
  head: () => buildToolMeta(toolBySlug("password-generator", tools)),
  component: PasswordGeneratorPage,
});

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

function getStrength(password: string): { label: string; color: string; width: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", color: "#ef4444", width: "33%" };
  if (score <= 3) return { label: "Fair", color: "#f59e0b", width: "60%" };
  return { label: "Strong", color: "#22d3ee", width: "100%" };
}

function PasswordGeneratorPage() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let charset = "";
    if (options.uppercase) charset += CHARSETS.uppercase;
    if (options.lowercase) charset += CHARSETS.lowercase;
    if (options.numbers) charset += CHARSETS.numbers;
    if (options.symbols) charset += CHARSETS.symbols;
    if (!charset) return;

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    setPassword(Array.from(array, (x) => charset[x % charset.length]).join(""));
    setCopied(false);
  }, [length, options]);

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = password ? getStrength(password) : null;
  const noneSelected = !options.uppercase && !options.lowercase && !options.numbers && !options.symbols;

  return (
    <ToolPageShell title="Password Generator" description="Generate strong, secure passwords instantly.">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        {/* Password Display */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <code className="flex-1 font-mono text-sm sm:text-base break-all min-h-[1.5rem]">
              {password || <span className="text-muted-foreground">Click generate...</span>}
            </code>
            <button
              onClick={copy}
              disabled={!password}
              aria-label="Copy password"
              className="shrink-0 rounded-lg border border-border bg-card p-2 hover:bg-secondary disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-[color:var(--green-brand)]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {strength && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Strength</span>
                <span className="font-semibold" style={{ color: strength.color }}>{strength.label}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full transition-all" style={{ width: strength.width, background: strength.color }} />
              </div>
            </div>
          )}
        </div>

        {/* Length Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Length</span>
            <span className="text-sm font-mono px-2 py-0.5 rounded bg-secondary">{length}</span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4</span>
            <span>64</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(options) as (keyof typeof options)[]).map((key) => {
            const active = options[key];
            return (
              <button
                key={key}
                onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  active
                    ? "border-[color:var(--cyan-brand)] bg-[color:color-mix(in_oklab,var(--cyan-brand)_15%,transparent)] text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <span className={`w-4 h-4 rounded grid place-content-center border ${active ? "border-[color:var(--cyan-brand)] bg-[color:var(--cyan-brand)]" : "border-border"}`}>
                  {active && <Check className="w-3 h-3 text-background" />}
                </span>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={noneSelected}
          className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50"
        >
          Generate Password
        </button>
      </div>

      <HowToUse steps={[
        "Pick a length and choose which character types to include.",
        "Click Generate Password to create a cryptographically random password.",
        "Copy it with one click — nothing leaves your browser.",
      ]} />
          <ToolSeoContent
        title="Free Password Generator — Strong Secure Passwords"
        description="Skycally's Password Generator creates strong, secure passwords instantly using your browser's built-in cryptographic API. Customize the length (4 to 64 characters) and choose which character types to include: uppercase, lowercase, numbers, and symbols. Your generated passwords are never stored or transmitted anywhere."
        body={[]}
        faqs={[{"question":"How secure are the generated passwords?","answer":"Passwords are generated using the Web Crypto API, which provides cryptographically secure randomness."},{"question":"Can I choose the password length?","answer":"Yes, you can set any length between 4 and 64 characters."},{"question":"Are my passwords stored anywhere?","answer":"No. Passwords are generated and displayed only in your browser and never transmitted."},{"question":"What does the strength indicator measure?","answer":"It evaluates length, use of uppercase, numbers, and symbols to estimate password strength."},{"question":"Can I generate multiple passwords at once?","answer":"Click Generate as many times as you like to get a new password each time."}]}
      />
    </ToolPageShell>
  );
}
