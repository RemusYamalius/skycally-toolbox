import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Link as LinkIcon, Loader2 } from "lucide-react";

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

function LinkShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shorten = async () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    setBusy(true);
    setShortUrl("");
    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Failed");
      const text = (await res.text()).trim();
      if (!/^https?:\/\//i.test(text)) throw new Error("Invalid response");
      setShortUrl(text);
      const QR = (await import("qrcode")).default;
      if (canvasRef.current) {
        await QR.toCanvas(canvasRef.current, text, { width: 256, margin: 2, color: { dark: "#0b0b0f", light: "#ffffff" } });
      }
      toast.success("Link shortened!");
    } catch {
      toast.error("Couldn't shorten that URL. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Copied to clipboard");
  };

  const downloadQr = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "skycally-qr.png";
    a.click();
  };

  const tool = toolBySlug("link-shortener", tools);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="rounded-2xl border border-border bg-card p-6">
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

        {shortUrl && (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr,auto] items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Your short link</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <a href={shortUrl} target="_blank" rel="noreferrer" className="flex-1 truncate font-mono text-sm" style={{ color: "var(--cyan-brand)" }}>{shortUrl}</a>
                <Button variant="outline" size="sm" onClick={copy}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <canvas ref={canvasRef} className="rounded-md bg-white" />
              <Button variant="outline" size="sm" onClick={downloadQr}>
                <Download className="w-4 h-4 mr-1" /> Download QR
              </Button>
            </div>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Paste any long URL into the box",
        "Click Shorten to get a short link",
        "Copy the link or download the QR code",
      ]} />

      <ToolSeoContent
        title="Free Link Shortener with QR Code — Skycally"
        description="Shorten any URL instantly and get a downloadable QR code for sharing — no signup required."
        body={[
          "Skycally's Link Shortener turns long, messy URLs into clean, shareable short links in a single click. We use TinyURL under the hood, so the resulting links are short, reliable, and never expire — perfect for social posts, emails, presentations, and printed materials.",
          "Every shortened link comes with an automatically generated QR code. Download it as a high-resolution PNG and drop it into flyers, business cards, packaging, or slides so people can reach your link instantly with a phone camera.",
          "The tool runs entirely in your browser — we don't track your URLs, store them, or require an account. Just paste, shorten, copy, and share.",
        ]}
        faqs={[
          { question: "Do the short links expire?", answer: "No. TinyURL links are permanent and don't expire as long as TinyURL operates the service." },
          { question: "Is there a usage limit?", answer: "There's no hard limit for typical personal use. If you shorten thousands of links rapidly, the upstream service may rate-limit you." },
          { question: "Can I customize the short URL?", answer: "This tool generates standard TinyURL links automatically. Custom aliases require a TinyURL account on their site." },
          { question: "What can I do with the QR code?", answer: "Download it as a PNG and use it anywhere — print materials, slides, packaging, or digital posts. Anyone scanning it will be sent to your shortened URL." },
        ]}
      />

      <RelatedTools currentSlug="link-shortener" />
    </ToolPageShell>
  );
}
