import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState, useEffect } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  original: string;
  short: string;
  date: string;
}

const LS_KEY = "skycally:link-history";
const MAX_HISTORY = 15;

// ─── Shortener APIs (with fallback) ──────────────────────────────────────────

async function shortenWithTinyUrl(url: string): Promise<string> {
  const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("TinyURL failed");
  const text = (await res.text()).trim();
  if (!/^https?:\/\//i.test(text)) throw new Error("Invalid TinyURL response");
  return text;
}

async function shortenWithIsGd(url: string): Promise<string> {
  const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("is.gd failed");
  const text = (await res.text()).trim();
  if (!/^https?:\/\//i.test(text)) throw new Error("Invalid is.gd response");
  return text;
}

async function shortenUrl(url: string): Promise<string> {
  try {
    return await shortenWithTinyUrl(url);
  } catch {
    // Fallback to is.gd
    return await shortenWithIsGd(url);
  }
}

// ─── QR helpers ───────────────────────────────────────────────────────────────

async function renderQR(canvas: HTMLCanvasElement, url: string, color: string) {
  const QR = (await import("qrcode")).default;
  await QR.toCanvas(canvas, url, {
    width: 256,
    margin: 2,
    color: { dark: color, light: "#ffffff" },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

function LinkShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrColor, setQrColor] = useState("#000000");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load history from localStorage
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
    try {
      const result = await shortenUrl(trimmed);
      setShortUrl(result);

      // Render QR
      if (canvasRef.current) {
        await renderQR(canvasRef.current, result, qrColor);
      }

      // Save to history
      const item: HistoryItem = {
        original: trimmed,
        short: result,
        date: new Date().toLocaleDateString(),
      };
      const next = [item, ...history.filter((h) => h.original !== trimmed)].slice(0, MAX_HISTORY);
      saveHistory(next);

      toast.success("Link shortened!");
    } catch {
      toast.error("Both shorteners failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, idx?: number) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied!");
    if (idx !== undefined) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const downloadQr = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "skycally-qr.png";
    a.click();
  };

  const updateQrColor = async (color: string) => {
    setQrColor(color);
    if (shortUrl && canvasRef.current) {
      await renderQR(canvasRef.current, shortUrl, color);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUrl(item.original);
    setShortUrl(item.short);
    if (canvasRef.current) renderQR(canvasRef.current, item.short, qrColor);
  };

  const removeFromHistory = (idx: number) => {
    const next = history.filter((_, i) => i !== idx);
    saveHistory(next);
  };

  const clearHistory = () => {
    saveHistory([]);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    toast.success("History cleared");
  };

  const tool = toolBySlug("link-shortener", tools);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* ── Input ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <label className="text-sm font-medium block">Long URL</label>
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

        {/* ── Result ── */}
        {shortUrl && (
          <div className="mt-2 grid gap-6 md:grid-cols-[1fr,auto] items-start">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your short link</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate font-mono text-sm"
                  style={{ color: "var(--cyan-brand)" }}
                >
                  {shortUrl}
                </a>
                <Button variant="outline" size="sm" onClick={() => copy(shortUrl)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <a href={shortUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>

              {/* QR color picker */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">QR color:</label>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => updateQrColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent p-0"
                  title="QR code color"
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

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <canvas ref={canvasRef} className="rounded-xl border border-border bg-white" />
              <Button variant="outline" size="sm" onClick={downloadQr} className="w-full">
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
            <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-red-400 transition">
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2 group"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={item.short}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono truncate block"
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
                    title="Copy short link"
                  >
                    {copiedIdx === i ? "✓" : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => loadFromHistory(item)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-foreground"
                    title="Load this link"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromHistory(i)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-red-400"
                    title="Remove"
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
          "Paste any long URL into the box and click Shorten.",
          "Copy your short link or open it directly to verify.",
          "Download the QR code — customize the color to match your brand.",
        ]}
      />

      <ToolSeoContent
        title="Free Link Shortener with QR Code — Shorten URLs Instantly Online"
        description="Shorten any URL instantly and get a downloadable QR code. Includes link history, custom QR colors, and dual-API fallback. Free, no signup, no expiry."
        body={[
          "Skycally's Link Shortener converts any long URL into a clean, shareable short link in under a second. The tool uses TinyURL as the primary shortener with is.gd as an automatic fallback — so if one service is temporarily unavailable, the other takes over seamlessly. Shortened links are permanent and never expire as long as the upstream service operates.",
          "Every shortened link automatically generates a QR code you can download as a high-resolution PNG. The QR code color is fully customizable — pick any hex color to match your brand, presentation, or printed material. QR codes work with any modern smartphone camera without requiring a separate app.",
          "Your 15 most recent shortened links are saved automatically in your browser's localStorage and displayed in the Recent Links panel. Each history entry shows the original URL, the short link, and the date it was created. You can copy, reload, or delete individual entries, or clear the entire history with one click. Nothing is stored on any server — your link history stays on your device.",
          "Short links are widely used in social media posts where character counts matter, printed marketing materials like flyers and business cards, email campaigns, presentations, and any context where a long URL would be unwieldy. The QR code format is ideal for physical-to-digital bridges — placing a QR code on printed material lets anyone scan it with their phone to reach the destination instantly.",
        ]}
        faqs={[
          {
            question: "Do the short links expire?",
            answer:
              "No. TinyURL links are permanent and do not expire. is.gd links (used as fallback) are also permanent. Both services have operated continuously for over a decade.",
          },
          {
            question: "What happens if TinyURL is down?",
            answer:
              "The tool automatically falls back to is.gd, a second independent URL shortener. If both services are temporarily unavailable, you will see an error message — try again after a few seconds.",
          },
          {
            question: "Can I customize the short URL slug?",
            answer:
              "This tool generates standard short URLs automatically. Custom slugs (like tinyurl.com/my-brand) require a TinyURL account on their website. Skycally does not currently offer custom domain short links.",
          },
          {
            question: "Is my URL stored on Skycally's servers?",
            answer:
              "No. Your URL is sent directly to TinyURL or is.gd's API to create the short link — Skycally's servers are not involved. Your link history is saved only in your browser's localStorage and never transmitted anywhere.",
          },
          {
            question: "How do I use the QR code?",
            answer:
              "Click Download QR to save a 256×256 PNG. Use it anywhere: print it on business cards, flyers, packaging, slides, posters, or menus. Anyone who scans it with a smartphone camera (no app needed on iOS or Android) is redirected to your short link.",
          },
          {
            question: "Can I change the QR code color?",
            answer:
              "Yes. Click the color swatch next to 'QR color' to open a color picker and choose any color. The QR code regenerates instantly. For reliable scanning, ensure strong contrast between the QR color and the white background.",
          },
          {
            question: "Are there any usage limits?",
            answer:
              "There are no limits enforced by Skycally. TinyURL and is.gd may rate-limit very high-volume usage (thousands of requests per hour), but for typical personal and business use there are no restrictions.",
          },
          {
            question: "How long is the link history kept?",
            answer:
              "Your 15 most recent links are stored in your browser's localStorage. They persist between sessions until you clear them manually or clear your browser's site data for skycally.com.",
          },
        ]}
      />

      <RelatedTools currentSlug="link-shortener" />
    </ToolPageShell>
  );
}
