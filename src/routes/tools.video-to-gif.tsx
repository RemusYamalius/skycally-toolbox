import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Film, Download, Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/video-to-gif")({
  head: () => buildToolMeta(toolBySlug("video-to-gif", tools)),
  component: Page,
});

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────
// gif.js is loaded lazily from a CDN as a plain <script> tag (UMD global),
// NOT as an ES module import. This avoids bundler/WASM/CORS/COOP-COEP
// issues entirely — it's a small (~50KB), battle-tested encoder that runs
// fully client-side with a Web Worker it spins up itself.
// ─────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    GIF: new (opts: Record<string, unknown>) => GifEncoderInstance;
  }
}

interface GifEncoderInstance {
  addFrame: (image: CanvasImageSource, opts?: { delay?: number; copy?: boolean }) => void;
  on: (event: "finished" | "progress", cb: (arg: unknown) => void) => void;
  render: () => void;
}

let gifJsLoadPromise: Promise<void> | null = null;

function loadGifJs(): Promise<void> {
  if (typeof window !== "undefined" && window.GIF) return Promise.resolve();
  if (gifJsLoadPromise) return gifJsLoadPromise;

  gifJsLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIF encoder"));
    document.head.appendChild(script);
  });

  return gifJsLoadPromise;
}

// ─────────────────────────────────────────────────────────────────────────
// gif.js spins up its own Web Worker internally by passing `workerScript`
// to `new Worker(...)`. Browsers refuse to construct a cross-origin Worker
// directly from a remote URL (this is a hard browser security rule, not
// fixable via CORS headers on the script itself). The fix: fetch the
// worker's source as TEXT, wrap it in a same-origin Blob, and hand gif.js
// that blob: URL instead — which the browser is happy to use as a Worker.
// ─────────────────────────────────────────────────────────────────────────
let gifWorkerBlobUrlPromise: Promise<string> | null = null;

function getGifWorkerBlobUrl(): Promise<string> {
  if (gifWorkerBlobUrlPromise) return gifWorkerBlobUrlPromise;

  gifWorkerBlobUrlPromise = fetch("https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch GIF worker script");
      return res.text();
    })
    .then((code) => {
      const blob = new Blob([code], { type: "application/javascript" });
      return URL.createObjectURL(blob);
    });

  return gifWorkerBlobUrlPromise;
}

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(3);
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(15);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gif, setGif] = useState<{ url: string; blob: Blob } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onPick = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_BYTES) return toast.error("Max video size is 50MB");
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setGif(null);
  };

  const run = async () => {
    if (!file || !videoUrl) return;
    setBusy(true);
    setProgress(0);
    setGif(null);

    try {
      const [, workerScriptUrl] = await Promise.all([loadGifJs(), getGifWorkerBlobUrl()]);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("Player not ready");

      // Wait for metadata so we know the natural dimensions
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) return resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Could not read video metadata"));
      });

      const aspect = video.videoHeight / video.videoWidth;
      const outW = Math.min(width, video.videoWidth);
      const outH = Math.round(outW * aspect);
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const clampedStart = Math.max(0, Math.min(start, video.duration - 0.1));
      const clampedDur = Math.min(Math.max(duration, 1), 10);
      const frameCount = Math.max(1, Math.round(clampedDur * fps));
      const frameDelayMs = Math.round(1000 / fps);

      const gifEncoder = new window.GIF({
        workers: 2,
        quality: 10,
        width: outW,
        height: outH,
        workerScript: workerScriptUrl,
      });

      gifEncoder.on("progress", (p: unknown) => {
        // gif.js reports 0..1 progress during the render/encode phase
        setProgress(Math.round((p as number) * 100));
      });

      // ── Capture frames by seeking the <video> element and drawing to canvas ──
      for (let i = 0; i < frameCount; i++) {
        const t = clampedStart + i / fps;

        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = t;
          // Safety timeout in case 'seeked' never fires for this browser/codec
          setTimeout(() => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          }, 800);
          void reject; // not used — kept for clarity of intent
        });

        ctx.drawImage(video, 0, 0, outW, outH);
        gifEncoder.addFrame(canvas, { delay: frameDelayMs, copy: true });

        // Frame-capture phase counts as the first half of overall progress
        setProgress(Math.round(((i + 1) / frameCount) * 50));
      }

      // ── Encode ──
      const blob: Blob = await new Promise((resolve) => {
        gifEncoder.on("finished", (b: unknown) => resolve(b as Blob));
        gifEncoder.render();
      });

      setGif({ url: URL.createObjectURL(blob), blob });
      setProgress(100);
      toast.success("GIF ready!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Conversion failed. Please try a shorter clip.";
      toast.error(msg);
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
          {/* File info */}
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-semibold">{file.name}</p>
              <p className="text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setVideoUrl(null);
                setGif(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>

          {/* Hidden video + canvas used purely for frame extraction */}
          {videoUrl && (
            <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" style={{ display: "none" }} />
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Controls */}
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

          {/* Convert button */}
          <button
            onClick={run}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}{" "}
            {busy ? `Converting... ${progress}%` : "Convert to GIF"}
          </button>

          {busy && (
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-foreground transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {progress < 50 ? "Capturing frames from your video..." : "Encoding GIF — almost there..."}
              </p>
            </div>
          )}

          {/* Result */}
          {gif && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <img src={gif.url} alt="GIF preview" className="max-w-full rounded-xl border border-border" />
              <button
                onClick={() => downloadBlob(gif.blob, "skycally.gif")}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5"
              >
                <Download className="w-4 h-4" /> Download GIF
              </button>
            </div>
          )}
        </div>
      )}

      <AdZone id="video-to-gif-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload a video (MP4, MOV, or WEBM up to 50MB).",
          "Set start time, duration, output width, and frame rate.",
          "Click Convert to GIF and download your animated GIF instantly.",
        ]}
      />

      <ToolSeoContent
        title="Convert Video to GIF Online Free — MP4, MOV, WebM to Animated GIF"
        description="Convert any video clip to an animated GIF for free. Customize frame rate, size, and duration. Fast, no signup required."
        body={[
          "Skycally's Video to GIF converter turns any video clip into a smooth animated GIF in seconds. Upload an MP4, MOV, or WebM file, set your start time and clip duration, choose the output width and frame rate, and download your GIF. Conversion runs entirely in your browser using the HTML5 Canvas API and a lightweight, dedicated GIF encoder — no server uploads, no waiting in queues.",
          "Frame rate is the biggest factor controlling GIF quality and file size. A frame rate of 8–12 fps produces small files suitable for messaging apps and social media. Frame rates of 20–24 fps produce smoother motion but significantly larger files. For most use cases, 12–15 fps is the sweet spot between quality and file size.",
          "GIF is the format of choice for short looping animations on the web, messaging platforms, and social media. Unlike MP4, GIFs loop automatically and require no video player — they embed directly into web pages, emails, and chat apps. This makes them ideal for tutorials, reactions, product demos, and visual explanations.",
          "For best results, keep source clips under 10 seconds and 480px wide. Longer or wider GIFs can exceed 10MB, which many platforms reject. If you need a GIF from a longer video, use the start time and duration controls to select just the essential moment before converting.",
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
              "GIF conversion is limited to 10 seconds to keep file sizes manageable. For longer video content, consider using the Video Trimmer to cut the exact moment you need first.",
          },
          {
            question: "Is my video uploaded to a server?",
            answer:
              "No. Frame capture happens directly in your browser using the Canvas API, and encoding runs in a background Web Worker. Your video file itself never leaves your device — only the small GIF encoder library is loaded from a CDN.",
          },
          {
            question: "Can I convert a YouTube video to GIF?",
            answer:
              "You need the video file on your device first. Download the clip locally, then upload it here to convert to GIF.",
          },
          {
            question: "Why does my GIF look washed out or pixelated?",
            answer:
              "GIF supports only 256 colors, which causes color banding on photos and gradients. This is a fundamental GIF format limitation, not a flaw in the converter — every GIF tool faces the same constraint.",
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
