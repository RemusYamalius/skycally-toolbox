import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Film, Download, Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { getFFmpeg } from "@/utils/ffmpegLoader";
import { fetchFile } from "@ffmpeg/util";

export const Route = createFileRoute("/tools/video-to-gif")({
  head: () => buildToolMeta(toolBySlug("video-to-gif", tools)),
  component: Page,
});

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(3);
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(15);
  const [busy, setBusy] = useState(false);
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
    setGif(null);
    try {
      const ffmpeg = await getFFmpeg();
      const inputName = "input_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const dur = String(Math.min(duration, 10));
      const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
      await ffmpeg.exec([
        "-ss",
        String(start),
        "-t",
        dur,
        "-i",
        inputName,
        "-filter_complex",
        vf,
        "-loop",
        "0",
        "output.gif",
      ]);
      const data = await ffmpeg.readFile("output.gif");
      const bytes = data as Uint8Array;
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/gif" });
      setGif({ url: URL.createObjectURL(blob), blob });
      toast.success("GIF ready!");
    } catch (e: any) {
      toast.error(e?.message || "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Video to GIF" description="Trim a clip from any video and turn it into a shareable GIF.">
      {!file && (
        <DropZone
          accept="video/mp4,video/quicktime,video/webm"
          onFiles={onPick}
          label="Drop your video"
          hint="MP4, MOV, or WEBM · max 50MB"
        />
      )}

      {file && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-semibold">{file.name}</p>
              <p className="text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setGif(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold mb-2 block">Start (seconds)</label>
              <input
                type="number"
                min={0}
                value={start}
                onChange={(e) => setStart(Math.max(0, +e.target.value))}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Duration (max 10s)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(e) => setDuration(Math.min(10, Math.max(1, +e.target.value)))}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Width</label>
              <select
                value={width}
                onChange={(e) => setWidth(+e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              >
                <option value={320}>320px</option>
                <option value={480}>480px</option>
                <option value={640}>640px</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">FPS</label>
              <select
                value={fps}
                onChange={(e) => setFps(+e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>

          <button
            onClick={run}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}{" "}
            {busy ? "Converting..." : "Convert to GIF"}
          </button>

          {busy && (
            <p className="text-sm text-muted-foreground text-center">
              Converting your video... this may take a few seconds.
            </p>
          )}

          {gif && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <img src={gif.url} alt="GIF preview" className="max-w-full rounded-xl border border-border" />
              <button
                onClick={() => downloadBlob(gif.blob, "video.gif")}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5"
              >
                <Download className="w-4 h-4" /> Download GIF
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: video-to-gif-bottom 728x90 */}
      <AdZone id="video-to-gif-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload a video (MP4, MOV, or WEBM up to 50MB).",
          "Pick start time, duration, width, and FPS.",
          "Click Convert and download your GIF.",
        ]}
      />

      <ToolSeoContent
        title="Convert Video to GIF Online Free — MP4, MOV, WebM to Animated GIF"
        description="Convert any video clip to an animated GIF for free. Customize frame rate, size, and duration. Fast, no signup required."
        body={[
          "Skycally's Video to GIF converter turns any video clip into a smooth animated GIF in seconds. Upload an MP4, MOV, or WebM file, set your start time and clip duration, choose the output width and frame rate, and download your GIF. Conversion uses FFmpeg on our secure server for fast, reliable results with accurate color reproduction.",
          "Frame rate is the biggest factor controlling GIF quality and file size. A frame rate of 8–12 fps produces small files suitable for messaging apps and social media. Frame rates of 20–24 fps produce smoother motion but significantly larger files. For most use cases, 12–15 fps is the sweet spot between quality and file size.",
          "GIF is the format of choice for short looping animations on the web, messaging platforms, and social media. Unlike MP4, GIFs loop automatically and require no video player — they embed directly into web pages, emails, and chat apps. This makes them ideal for tutorials, reactions, product demos, and visual explanations.",
          "For best results, keep source clips under 10 seconds and 480px wide. Longer or wider GIFs can exceed 10MB, which many platforms reject. If you need a GIF from a longer video, use the trim controls to select just the essential moment before converting.",
        ]}
        faqs={[
          {
            question: "What video formats can I convert to GIF?",
            answer:
              "MP4 (H.264), MOV (QuickTime), and WebM files are supported. MP4 is the most widely compatible format and recommended for best results.",
          },
          {
            question: "Why is my GIF file so large?",
            answer:
              "GIFs are an inherently large format. Reduce the output width (try 320–480px), lower the frame rate to 10 fps, or shorten the clip duration to get a smaller file. A 10-second clip at 10 fps and 480px is typically 2–5 MB.",
          },
          {
            question: "What is the maximum clip duration?",
            answer:
              "GIF conversion is limited to 10 seconds to keep file sizes manageable. For longer content, consider using the Video Compressor to reduce file size while keeping video format.",
          },
          {
            question: "How is my video processed?",
            answer:
              "Your video is uploaded to our secure server, processed with FFmpeg, and the resulting GIF is sent back to your browser. Files are deleted immediately after processing and never stored permanently.",
          },
          {
            question: "Can I convert a YouTube video to GIF?",
            answer:
              "You need the video file on your device first. Use Skycally's Video Downloader to save the clip locally, then upload it here to convert to GIF.",
          },
          {
            question: "Why does my GIF look washed out or pixelated?",
            answer:
              "GIF supports only 256 colors, which causes color banding on photos and gradients. This is a fundamental GIF format limitation. Our two-pass palette generation minimizes this effect, but for rich color video, results will never match the original.",
          },
          {
            question: "What frame rate should I use?",
            answer:
              "8–10 fps: small file, slightly choppy. 12–15 fps: good balance (recommended for most uses). 20–24 fps: smooth motion, larger file. Most social platforms display GIFs at their native frame rate.",
          },
          {
            question: "Can I embed a GIF in a website or email?",
            answer:
              "Yes. GIFs embed directly in HTML with a standard img tag. In emails, GIFs are supported by most clients except older Outlook versions, which show only the first frame.",
          },
        ]}
      />

      <RelatedTools currentSlug="video-to-gif" />
    </ToolPageShell>
  );
}
