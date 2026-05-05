import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardPaste, X, Download as DownloadIcon, Loader2, Music } from "lucide-react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { AdZone } from "@/components/ad-zone";
import { HowToUse } from "@/components/how-to-use";
import { fetchVideo, type VideoResult } from "@/services/videoApi";

export const Route = createFileRoute("/tools/video-downloader")({
  head: () => ({
    meta: [
      { title: "Video Downloader — TikTok, Instagram, YouTube · Skycally" },
      { name: "description", content: "Download videos from TikTok, Instagram, YouTube, Twitter, Facebook and more in HD. Free, fast, no signup." },
      { property: "og:title", content: "Video Downloader · Skycally" },
      { property: "og:description", content: "Download videos from any major platform in HD." },
    ],
  }),
  component: VideoDownloader,
});

const platforms = ["TikTok", "Instagram", "YouTube", "Twitter/X", "Facebook", "Snapchat", "Pinterest", "Vimeo", "Dailymotion"];

function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoResult | null>(null);

  const handleFetch = async () => {
    if (!/^https?:\/\//i.test(url)) { toast.error("Please paste a valid video URL"); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await fetchVideo({ url });
      setResult(r);
      toast.success("Video found!");
    } catch (e: any) {
      const code = e?.message || "";
      const map: Record<string, string> = {
        VIDEO_NOT_FOUND: "Video not found or is private.",
        RATE_LIMITED: "Server busy. Please try again in a minute.",
        API_REQUEST_FAILED: "Server error. Please try again.",
      };
      toast.error(map[code] || "Could not process this URL. Make sure it's a valid video link.");
    } finally {
      setLoading(false);
    }
  };

  const paste = async () => {
    try { setUrl(await navigator.clipboard.readText()); } catch { toast.error("Clipboard unavailable"); }
  };

  return (
    <ToolPageShell title="Video Downloader" description="Paste a link from any major platform — get your video in seconds.">
      <div className="flex flex-wrap gap-2 mb-8">
        {platforms.map((p) => (
          <span key={p} className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium">{p}</span>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="relative">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here..."
            className="w-full rounded-xl border border-border bg-background px-4 py-4 pr-28 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {url && (
              <button onClick={() => setUrl("")} className="p-2 rounded-lg hover:bg-secondary" aria-label="Clear"><X className="w-4 h-4" /></button>
            )}
            <button onClick={paste} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">
              <ClipboardPaste className="w-4 h-4" /> Paste
            </button>
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading || !url}
          className="mt-4 w-full rounded-xl bg-foreground text-background font-semibold py-4 text-base transition disabled:opacity-50 hover:opacity-90 inline-flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching...</> : <>Fetch video</>}
        </button>
      </div>

      <AdZone id="video-tool-above-button" size="300x250" />

      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-[240px_1fr]">
          <div className="aspect-video rounded-xl skeleton" />
          <div className="space-y-3">
            <div className="h-6 rounded skeleton w-2/3" />
            <div className="h-12 rounded skeleton" />
            <div className="h-12 rounded skeleton" />
          </div>
        </div>
      )}

      {result && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            {result.thumbnail && <img src={result.thumbnail} alt={result.title} className="w-full sm:w-72 aspect-video object-cover rounded-xl border border-border" />}
            <div>
              <h2 className="font-display text-2xl font-bold">{result.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose a quality below to download.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.formats.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)", color: "var(--cyan-brand)" }}>
                    {f.ext === "mp3" ? <Music className="w-5 h-5" /> : <DownloadIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{f.quality}</div>
                    <div className="text-xs text-muted-foreground">{f.ext.toUpperCase()}{f.size ? ` · ${f.size}` : ""}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const API_URL = import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";
                    const downloadUrl = `${API_URL}/api/download?url=${encodeURIComponent(url)}&video_url=${encodeURIComponent(f.url)}`;
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = `video.${f.ext || "mp4"}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    toast.success("Your download is starting...");
                  }}
                  className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:opacity-90"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <HowToUse steps={[
        "Copy the link of the video you want to download.",
        "Paste it in the box above and click Fetch video.",
        "Pick your preferred quality — your download starts instantly.",
      ]} />

      <AdZone id="video-tool-below-results" size="728x90" />
    </ToolPageShell>
  );
}
