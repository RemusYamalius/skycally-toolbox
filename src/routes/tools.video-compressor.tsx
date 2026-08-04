import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/video-compressor")({
  head: () => buildToolMeta(toolBySlug("video-compressor", tools)),
  component: VideoCompressor,
});

type Quality = "low" | "medium" | "high";

const QUALITY_INFO: Record<Quality, { label: string; desc: string; color: string }> = {
  low: { label: "Low", desc: "Smallest file size", color: "text-orange-400" },
  medium: { label: "Medium", desc: "Balanced size & quality", color: "text-cyan-400" },
  high: { label: "High", desc: "Best quality", color: "text-green-400" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    setFile(f);
    setError("");
    setDone(false);
    setCompressedSize(null);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setDone(false);
    setCompressedSize(null);
    try {
      const bitrates: Record<Quality, number> = { low: 300_000, medium: 800_000, high: 2_000_000 };
      const targetBitrate = bitrates[quality];
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.muted = true;
      await new Promise<void>((res) => {
        video.onloadedmetadata = () => res();
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(24);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: targetBitrate });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(100);
      await video.play();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (video.ended) {
            clearInterval(interval);
            video.pause();
            recorder.stop();
          }
        }, 1000 / 24);
        recorder.onstop = () => resolve();
      });
      const blob = new Blob(chunks, { type: mimeType });
      setCompressedSize(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.split(".")[0]}_compressed.webm`;
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Compression failed");
    } finally {
      setLoading(false);
    }
  };

  const savings = file && compressedSize ? Math.round((1 - compressedSize / file.size) * 100) : null;

  return (
    <ToolPageShell title="Video Compressor" description="Reduce video file size without losing quality.">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
            }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  />
                </svg>
              </div>
              <p className="text-foreground font-medium text-sm">{file.name}</p>
              <p className="text-muted-foreground text-xs">{formatSize(file.size)}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setDone(false);
                  setCompressedSize(null);
                }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Drop a video or click to browse</p>
              <p className="text-muted-foreground text-xs">MP4, MOV, AVI, MKV, WEBM</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Compression Quality</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(QUALITY_INFO) as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`p-3 rounded-xl border text-left transition-all ${quality === q ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-border"}`}
                >
                  <p
                    className={`text-sm font-medium ${quality === q ? QUALITY_INFO[q].color : "text-muted-foreground"}`}
                  >
                    {QUALITY_INFO[q].label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{QUALITY_INFO[q].desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {done && compressedSize && file && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-400 text-sm font-medium">Compressed successfully!</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Original</p>
                <p className="text-sm font-mono text-foreground">{formatSize(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Compressed</p>
                <p className="text-sm font-mono text-cyan-400">{formatSize(compressedSize)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saved</p>
                <p className="text-sm font-mono text-green-400">{savings}%</p>
              </div>
            </div>
          </div>
        )}

        {file && (
          <button
            onClick={compress}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Compressing...
              </span>
            ) : (
              "Compress Video"
            )}
          </button>
        )}
      </div>

      <AdZone id="video-compressor-mid" size="728x90" />

      <HowToUse
        steps={[
          "Upload a video by dropping it or clicking to browse (MP4, MOV, AVI, MKV, WEBM).",
          "Choose a compression quality: Low for smallest size, Medium for balance, High for best quality.",
          "Click Compress Video — the smaller file downloads automatically.",
        ]}
      />

      <ToolSeoContent
        title="Free Video Compressor — Reduce Video File Size Online, No Upload"
        description="Reduce your video file size by up to 70% using Skycally's free online video compressor. Choose your quality level and download instantly — no signup, no server upload."
        body={[
          "Skycally's Video Compressor reduces the file size of any video directly in your browser, with no server upload required. Choose from three quality levels — Low for maximum compression, Medium for a balanced result, or High for the best quality — then click Compress and download the smaller file automatically.",
          "Video compression is essential for sharing videos on WhatsApp, email, and social media platforms that enforce file size limits. A 100MB recording from your phone can typically be reduced to 20–40MB at Medium quality with no visible difference in a small preview window.",
          "All compression runs locally using the browser's MediaRecorder API with configurable bitrate settings. Low quality targets 300kbps, Medium 800kbps, and High 2Mbps — giving you flexible control over the quality-to-size tradeoff. The output is a WebM file compatible with Chrome, Firefox, Android, and most modern platforms.",
          "Because everything runs in the browser, your video never leaves your device. This is especially important for sensitive recordings such as medical consultations, private meetings, or personal videos that you don't want to pass through a third-party server.",
        ]}
        faqs={[
          {
            question: "How much can I reduce my video file size?",
            answer:
              "Depending on the original video and the quality setting chosen, you can typically reduce file size by 30–70%. Videos with low motion (screencasts, talking head videos) compress more than action-heavy content.",
          },
          {
            question: "What video formats are supported?",
            answer:
              "You can upload MP4, MOV, AVI, MKV, and WEBM files. The compressed output is saved as WebM (VP9) for maximum browser compatibility.",
          },
          {
            question: "Is my video uploaded to a server?",
            answer:
              "No. Compression runs entirely in your browser using the MediaRecorder API. Your video never leaves your device.",
          },
          {
            question: "What do the quality levels mean?",
            answer:
              "Low targets 300kbps video bitrate — smallest file, most compression. Medium targets 800kbps — good balance for most uses. High targets 2Mbps — closest to original quality with modest size reduction.",
          },
          {
            question: "Will the video resolution change?",
            answer:
              "No. The video dimensions stay the same — only the bitrate is reduced. The output resolution matches the original.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no enforced size limit. However, very large files (over 1GB) may be slow to compress depending on your device's CPU and available memory.",
          },
          {
            question: "Why is the output a .webm file instead of .mp4?",
            answer:
              "WebM is the format produced by the browser's built-in MediaRecorder. It is natively supported by Chrome, Firefox, and Android. For MP4 output, convert the file after downloading.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The Video Compressor works on smartphones and tablets running Chrome or other modern mobile browsers.",
          },
        ]}
      />

      <RelatedTools currentSlug="video-compressor" />
    </ToolPageShell>
  );
}
