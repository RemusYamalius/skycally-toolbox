import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Film, Download, Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { Progress } from "@/components/ui/progress";
import { convertToGif, MAX_VIDEO_BYTES } from "@/services/videoToGif";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/video-to-gif")({
  head: () => ({
    meta: [
      { title: "Video to GIF — Skycally" },
      { name: "description", content: "Convert MP4, MOV, or WEBM videos to high-quality animated GIFs in your browser." },
      { property: "og:title", content: "Video to GIF · Skycally" },
      { property: "og:description", content: "Free browser-based video to GIF converter." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(3);
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(15);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [gif, setGif] = useState<{ url: string; blob: Blob } | null>(null);

  const onPick = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_BYTES) return toast.error("Max video size is 50MB");
    setFile(f);
    setGif(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setGif(null);
    try {
      const blob = await convertToGif(file, start, Math.min(duration, 10), width, fps, setProgress, setStatus);
      setGif({ url: URL.createObjectURL(blob), blob });
      toast.success("GIF ready!");
    } catch (e: any) {
      toast.error(e.message || "Conversion failed");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <ToolPageShell title="Video to GIF" description="Trim a clip from any video and turn it into a shareable GIF — all in your browser.">
      {!file && <DropZone accept="video/mp4,video/quicktime,video/webm" onFiles={onPick} label="Drop your video" hint="MP4, MOV, or WEBM · max 50MB" />}

      {file && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-semibold">{file.name}</p>
              <p className="text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setGif(null); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold mb-2 block">Start (seconds)</label>
              <input type="number" min={0} value={start} onChange={(e) => setStart(Math.max(0, +e.target.value))} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Duration (max 10s)</label>
              <input type="number" min={1} max={10} value={duration} onChange={(e) => setDuration(Math.min(10, Math.max(1, +e.target.value)))} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Width</label>
              <select value={width} onChange={(e) => setWidth(+e.target.value)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
                <option value={320}>320px</option>
                <option value={480}>480px</option>
                <option value={640}>640px</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">FPS</label>
              <select value={fps} onChange={(e) => setFps(+e.target.value)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>

          <button onClick={run} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} {busy ? (status || "Converting...") : "Convert to GIF"}
          </button>

          {busy && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {gif && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <img src={gif.url} alt="GIF preview" className="max-w-full rounded-xl border border-border" />
              <button onClick={() => downloadBlob(gif.blob, "video.gif")} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5">
                <Download className="w-4 h-4" /> Download GIF
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: video-to-gif-bottom 728x90 */}
      <AdZone id="video-to-gif-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload a video (MP4, MOV, or WEBM up to 50MB).",
        "Pick start time, duration, width, and FPS.",
        "Click Convert and download your GIF.",
      ]} />
          <ToolSeoContent
        title={"Convert Video to GIF Online — Free & Fast"}
        description={"Turn any video clip into a high-quality animated GIF using Skycally's free converter. Customize frame rate, size and duration for the perfect GIF."}
        body={[
        "Select your video clip, set the start time and duration (up to 10 seconds), choose your preferred width and frame rate, and convert to GIF in seconds. The tool uses FFmpeg WebAssembly running entirely in your browser.",
        "Our two-pass palette generation ensures your GIF has vibrant, accurate colors rather than the washed-out look common with basic converters. Perfect for social media, messaging apps and presentations.",
      ]}
        faqs={[
        { question: "Why is my GIF file so large?", answer: "GIFs are inherently large format. Reduce the width (try 320px), lower the FPS to 10, or shorten the duration to get a smaller file." },
        { question: "What is the maximum clip duration for GIF?", answer: "We limit GIF conversion to 10 seconds to keep file sizes manageable. For longer animations, consider using the Video Compressor instead." },
        { question: "Does the conversion happen in my browser?", answer: "Yes! We use FFmpeg WebAssembly which runs entirely in your browser. Your video never leaves your device." },
        { question: "Can I convert YouTube videos to GIF?", answer: "You need to have the video file on your device first. Use our Video Downloader to save the clip, then convert it to GIF." },
      ]}
      />
      </ToolPageShell>
  );
}
