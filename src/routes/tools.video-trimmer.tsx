import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scissors, Download, Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/file-utils";
import { FFmpegBanner, PoweredByNote } from "@/components/ffmpeg-banner";

export const Route = createFileRoute("/tools/video-trimmer")({
  head: () => ({
    meta: [
      { title: "Video Trimmer — Skycally" },
      { name: "description", content: "Cut and trim any video — entirely in your browser, no upload required." },
      { property: "og:title", content: "Video Trimmer · Skycally" },
      { property: "og:description", content: "Free browser-based video trimmer powered by FFmpeg WebAssembly." },
    ],
  }),
  component: Page,
});

const MAX_BYTES = 200 * 1024 * 1024;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onPick = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("Max video size is 200MB");
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setResult(null);
  };

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const onMeta = () => {
    const d = videoRef.current?.duration ?? 0;
    if (!isFinite(d)) return;
    setDuration(Math.floor(d));
    setEnd(Math.min(Math.floor(d), 30));
    setStart(0);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      setStatus("Loading trimmer...");
      const { fetchFile } = await import("@ffmpeg/util");
      const { getFFmpeg } = await import("@/utils/ffmpegLoader");
      const ffmpeg = await getFFmpeg(setProgress);

      const ext = file.name.split(".").pop() || "mp4";
      setStatus("Reading video...");
      await ffmpeg.writeFile(`input.${ext}`, await fetchFile(file));

      setStatus("Trimming...");
      await ffmpeg.exec([
        "-ss", String(start),
        "-t", String(end - start),
        "-i", `input.${ext}`,
        "-c", "copy",
        "output.mp4",
      ]);

      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const buf = new Uint8Array(data);
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: "video/mp4" });
      setResult({ url: URL.createObjectURL(blob), blob });
      toast.success("Trim complete!");
    } catch (e: any) {
      toast.error(e?.message || "Trim failed");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <ToolPageShell title="Video Trimmer" description="Cut and trim any video — works entirely in your browser, no uploads.">
      {!file && (
        <>
          <FFmpegBanner />
          <DropZone accept="video/*" onFiles={onPick} label="Drop your video" hint="MP4, MOV, WEBM · max 200MB" />
        </>
      )}

      {file && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-semibold">{file.name}</p>
              <p className="text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setVideoUrl(""); setResult(null); }} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onLoadedMetadata={onMeta}
              className="w-full rounded-2xl border border-border bg-black"
            />
          )}

          {duration > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Trim · total {formatTime(duration)}</p>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-mono" style={{ color: "var(--cyan-brand)" }}>{formatTime(start)}</span>
                </div>
                <input type="range" min={0} max={Math.max(0, duration - 1)} value={start}
                  onChange={(e) => { const v = +e.target.value; setStart(v); if (v >= end) setEnd(Math.min(v + 1, duration)); }}
                  className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-mono" style={{ color: "var(--cyan-brand)" }}>{formatTime(end)}</span>
                </div>
                <input type="range" min={1} max={duration} value={end}
                  onChange={(e) => { const v = +e.target.value; setEnd(v); if (v <= start) setStart(Math.max(v - 1, 0)); }}
                  className="w-full" />
              </div>
              <div className="flex justify-between text-sm bg-secondary/40 rounded-xl px-4 py-3">
                <span className="text-muted-foreground">Clip duration</span>
                <span className="font-mono font-bold">{formatTime(end - start)}</span>
              </div>
            </div>
          )}

          <button onClick={run} disabled={busy || end <= start} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />} {busy ? (status || "Working...") : "Trim Video"}
          </button>

          {busy && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{status} · {progress}%</p>
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <video src={result.url} controls className="w-full rounded-xl border border-border bg-black" />
              <button onClick={() => downloadBlob(result.blob, `trimmed_${file.name.replace(/\.[^.]+$/, "")}.mp4`)} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: video-trimmer-bottom 728x90 */}
      <AdZone id="video-trimmer-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload a video file (MP4, MOV, WEBM up to 200MB).",
        "Drag the start and end sliders to choose your clip.",
        "Click Trim and download the trimmed video.",
      ]} />

      <PoweredByNote />
    </ToolPageShell>
  );
}

export function FFmpegBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!localStorage.getItem("ffmpeg-warmed")); } catch {}
  }, []);
  if (!show) return null;
  return (
    <div className="mb-6 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
      <span>⚡</span>
      <span>First use downloads FFmpeg (~30 MB). Subsequent runs are instant.</span>
    </div>
  );
}

export function PoweredByNote() {
  return <p className="mt-6 text-center text-xs text-muted-foreground">Powered by FFmpeg WebAssembly · runs entirely in your browser</p>;
}
