import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Download, Link as LinkIcon, Loader2, Trash2, ExternalLink, Clock } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/link-shortener")({
  head: () => buildToolMeta(toolBySlug("link-shortener", tools)),
  component: LinkShortener,
});

const WORKER_URL = "https://link-shortener.skycally-tools.workers.dev";
const LS_KEY = "skycally:link-history";
const MAX_HISTORY = 15;

interface HistoryItem {
  original: string;
  short: string;
  slug: string;
  date: string;
}

async function generateQrDataUrl(url: string, color: string): Promise<string> {
  const QR = (await import("qrcode")).default;
  return QR.toDataURL(url, {
    width: 256,
    margin: 2,
    color: { dark: color, light: "#ffffff" },
  });
}

function LinkShortener() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrColor, setQrColor] = useState("#000000");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedMain, setCopiedMain] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  };

  const shorten = async () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    setBusy(true);
    setShortUrl("");
    setQrDataUrl("");
    try {
      const res = await fetch(`${WORKER_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, alias: alias.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to shorten URL");
        return;
      }

      setShortUrl(data.short);

      // Generate QR immediately as data URL
      const dataUrl = await generateQrDataUrl(data.short, qrColor);
      setQrDataUrl(dataUrl);

      // Save to history
      const item: HistoryItem = {
        original: trimmed,
        short: data.short,
        slug: data.slug,
        date: new Date().toLocaleDateString(),
      };
      const next = [item, ...history.filter((h) => h.original !== trimmed)].slice(0, MAX_HISTORY);
      saveHistory(next);
      toast.success("Link shortened!");
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const updateQrColor = async (color: string) => {
    setQrColor(color);
    if (shortUrl) {
      const dataUrl = await generateQrDataUrl(shortUrl, color);
      setQrDataUrl(dataUrl);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "skycally-qr.png";
    a.click();
  };

  const copy = async (text: string, idx?: number) => {
    await navigator.clipboard.writeText(text);
    if (idx !== undefined) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } else {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    }
    toast.success("Copied!");
  };

  const loadFromHistory = async (item: HistoryItem) => {
    setUrl(item.original);
    setShortUrl(item.short);
    const dataUrl = await generateQrDataUrl(item.short, qrColor);
    setQrDataUrl(dataUrl);
  };

  const removeFromHistory = (idx: number) => {
    saveHistory(history.filter((_, i) => i !== idx));
  };

  const tool = toolBySlug("link-shortener", tools);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* ── Input ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {/* URL */}
        <div>
          <label className="text-sm font-medium mb-2 block">Long URL</label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/very/long/path"
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && shorten()}
              />
            </div>
            <Button onClick={shorten} disabled={busy || !url} className="sm:w-32">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Shorten"}
            </Button>
          </div>
        </div>

        {/* Custom alias */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Custom alias <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground shrink-0">go.skycally.com/</span>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-link"
              maxLength={30}
              className="max-w-[200px]"
            />
            {alias && <span className="text-xs text-cyan-400 font-mono">→ go.skycally.com/{alias}</span>}
          </div>
        </div>

        {/* Result */}
        {shortUrl && (
          <div className="pt-4 border-t border-border grid gap-6 md:grid-cols-[1fr,auto] items-start">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Your short link</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 truncate font-mono text-sm font-semibold"
                    style={{ color: "var(--cyan-brand)" }}
                  >
                    {shortUrl}
                  </a>
                  <Button variant="outline" size="sm" onClick={() => copy(shortUrl)}>
                    {copiedMain ? (
                      "✓"
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <a href={shortUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* QR Color */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">QR color:</label>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => updateQrColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent p-0"
                />
                <span className="text-xs font-mono text-muted-foreground">{qrColor}</span>
                <button
                  onClick={() => updateQrColor("#000000")}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* QR Image */}
            <div className="flex flex-col items-center gap-2">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="rounded-xl border border-border"
                  width={256}
                  height={256}
                />
              )}
              <Button variant="outline" size="sm" onClick={downloadQr} disabled={!qrDataUrl} className="w-full">
                <Download className="w-4 h-4 mr-1" /> Download QR
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Links</h3>
              <span className="text-xs text-muted-foreground">
                ({history.length}/{MAX_HISTORY})
              </span>
            </div>
            <button
              onClick={() => saveHistory([])}
              className="text-xs text-muted-foreground hover:text-red-400 transition"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={item.short}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono truncate block font-semibold"
                    style={{ color: "var(--cyan-brand)" }}
                  >
                    {item.short}
                  </a>
                  <p className="text-xs text-muted-foreground truncate">{item.original}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{item.date}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => copy(item.short, i)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-foreground"
                    title="Copy"
                  >
                    {copiedIdx === i ? "✓" : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => loadFromHistory(item)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-foreground"
                    title="Load"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromHistory(i)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Paste your long URL and optionally type a custom alias like 'my-brand'.",
          "Click Shorten — your branded link go.skycally.com/my-brand is ready instantly.",
          "Copy the short link or download the QR code. Change the QR dot color to match your brand.",
        ]}
      />

      <ToolSeoContent
        title="Free Link Shortener — go.skycally.com Branded Short URLs with QR Code"
        description="Shorten any URL to a branded go.skycally.com link with a custom alias. Includes instant QR code, custom colors, and link history. Free, no signup."
        body={[
          "Skycally's Link Shortener creates branded short URLs on the go.skycally.com domain — powered by Cloudflare Workers and KV, with no dependency on TinyURL or Bitly. Type a custom alias like 'my-brand' and your link becomes go.skycally.com/my-brand instantly. Leave the alias blank for a random 7-character slug. Links are stored permanently in Cloudflare's global edge network and resolve in milliseconds from anywhere in the world.",
          "Every shortened link generates an instant QR code — no extra click needed. The QR code appears immediately after shortening and you can customize the dot color to match your brand, presentation theme, or print material. Download as a high-resolution PNG and use it on business cards, flyers, menus, packaging, or slides. Anyone can scan it with a standard smartphone camera.",
          "Your 15 most recent shortened links are saved locally in your browser's localStorage and displayed in the Recent Links panel. Each entry shows the original URL, the short link, and the creation date. Copy, reload, or delete individual entries at any time. Nothing is stored on Skycally's servers beyond the link mapping itself.",
          "Custom alias shorteners are used in marketing campaigns to create memorable, on-brand links; in print materials where clean URLs matter; in social media posts where character count is limited; and in presentations where a short memorable link is more professional than a long parameter-heavy URL.",
        ]}
        faqs={[
          {
            question: "What domain are the short links on?",
            answer:
              "All links use go.skycally.com — Skycally's own branded subdomain. For example: go.skycally.com/my-link. Powered by Cloudflare Workers and KV with no third-party dependency.",
          },
          {
            question: "Can I choose my own custom alias?",
            answer:
              "Yes. Type your alias in the Custom alias field (letters, numbers, and hyphens only, 3–30 characters). If already taken, you will see an error. Leave blank for a random 7-character slug.",
          },
          {
            question: "Do the short links expire?",
            answer:
              "No. Links are stored with a 5-year TTL in Cloudflare KV and are effectively permanent for any practical use.",
          },
          {
            question: "Does the QR code appear automatically?",
            answer:
              "Yes. The QR code generates instantly as soon as your short link is created — no extra step needed. You can then change the dot color and download it.",
          },
          {
            question: "Can I customize the QR code color?",
            answer:
              "Yes. After shortening, click the color swatch to open a color picker. The QR updates instantly. Ensure strong contrast between the dot color and the white background for reliable scanning.",
          },
          {
            question: "What happens if my alias is already taken?",
            answer:
              "You will see: 'This alias is already taken. Try another.' Choose a different alias or leave the field blank for a unique random slug.",
          },
          {
            question: "Is there a usage limit?",
            answer:
              "The Cloudflare Worker runs on the free plan: 100,000 requests per day. For typical personal and business use this limit is never reached.",
          },
          {
            question: "Is my original URL stored anywhere?",
            answer:
              "The alias-to-URL mapping is stored in Cloudflare KV to enable redirection. Your link history is stored only in your browser's localStorage and never transmitted to any server.",
          },
        ]}
      />

      <RelatedTools currentSlug="link-shortener" />
    </ToolPageShell>
  );
}
