import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { getFFmpeg } from "@/utils/ffmpegLoader";
import { fetchFile } from "@ffmpeg/util";

export const Route = createFileRoute("/tools/audio-converter")({
  head: () => buildToolMeta(toolBySlug("audio-converter", tools)),
  component: AudioConverter,
});

const FORMATS = ["mp3", "wav", "ogg", "aac", "flac"] as const;
type Format = (typeof FORMATS)[number];

const FORMAT_INFO: Record<Format, { desc: string; color: string; badge: string }> = {
  mp3: { desc: "Universal — works everywhere", color: "#00D4FF", badge: "Most popular" },
  wav: { desc: "Lossless — perfect quality", color: "#a78bfa", badge: "Lossless" },
  ogg: { desc: "Open format — good compression", color: "#34d399", badge: "Open source" },
  aac: { desc: "Streaming — best size/quality", color: "#f59e0b", badge: "Streaming" },
  flac: { desc: "Lossless — compressed archive", color: "#f472b6", badge: "Lossless" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function AudioConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>("mp3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    setFile(f);
    setError("");
    setDone(false);
    setOutputBlob(null);
    setOutputUrl(null);
    setOutputSize(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setDone(false);
    setOutputBlob(null);
    setOutputUrl(null);
    setOutputSize(null);
    try {
      const ffmpeg = await getFFmpeg();
      const inputName = "input_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const outputName = "output." + format;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const args: string[] = ["-i", inputName];
      if (format === "mp3") args.push("-codec:a", "libmp3lame", "-qscale:a", "2");
      else if (format === "aac") args.push("-codec:a", "aac", "-b:a", "192k");
      else if (format === "ogg") args.push("-codec:a", "libvorbis", "-qscale:a", "5");
      else if (format === "flac") args.push("-codec:a", "flac");
      else if (format === "wav") args.push("-codec:a", "pcm_s16le");
      args.push(outputName);
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outputName);
      const bytes = data as Uint8Array;
      const mimeMap: Record<Format, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        aac: "audio/aac",
        flac: "audio/flac",
      };
      const blob = new Blob([new Uint8Array(bytes)], { type: mimeMap[format] });
      const url = URL.createObjectURL(blob);
      setOutputBlob(blob);
      setOutputUrl(url);
      setOutputSize(blob.size);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!outputUrl || !file) return;
    const base = file.name.includes(".") ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${base || "audio"}.${format}`;
    a.click();
  };

  const currentExt = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const info = FORMAT_INFO[format];

  return (
    <ToolPageShell
      title="Audio Converter"
      description="Convert audio files between MP3, WAV, OGG, AAC and FLAC instantly — runs entirely in your browser."
    >
      <div className="w-full max-w-xl mx-auto space-y-5">
        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/mp4"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
            }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
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
                  setOutputBlob(null);
                  setOutputUrl(null);
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
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Drop an audio file or click to browse</p>
              <p className="text-muted-foreground text-xs">MP3, WAV, OGG, AAC, FLAC, M4A</p>
            </div>
          )}
        </div>

        {/* Format selector */}
        {file && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Convert to</span>
              {currentExt && (
                <span className="text-xs font-mono text-muted-foreground">
                  .{currentExt} → .{format}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  disabled={f === currentExt}
                  className={`py-2.5 rounded-xl border text-sm font-mono font-medium transition-all ${
                    format === f
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : f === currentExt
                        ? "border-border text-muted-foreground/40 cursor-not-allowed"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  .{f}
                </button>
              ))}
            </div>
            {/* Format info badge */}
            <div className="flex items-center gap-2 pt-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: info.color, borderColor: `${info.color}44`, background: `${info.color}14` }}
              >
                {info.badge}
              </span>
              <span className="text-xs text-muted-foreground">{info.desc}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {done && outputUrl && outputSize && file && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-400 text-sm font-medium">Converted successfully!</p>
            </div>
            {/* Size comparison */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Original</p>
                <p className="text-sm font-mono text-foreground">{formatSize(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Output</p>
                <p className="text-sm font-mono text-cyan-400">{formatSize(outputSize)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={`text-sm font-mono ${outputSize < file.size ? "text-green-400" : "text-orange-400"}`}>
                  {outputSize < file.size
                    ? `-${Math.round((1 - outputSize / file.size) * 100)}%`
                    : `+${Math.round((outputSize / file.size - 1) * 100)}%`}
                </p>
              </div>
            </div>
            {/* Audio preview */}
            <audio controls src={outputUrl} className="w-full rounded-xl" />
            {/* Download button */}
            <button
              onClick={download}
              className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download .{format}
            </button>
          </div>
        )}

        {/* Convert button */}
        {file && (
          <button
            onClick={convert}
            disabled={loading || format === currentExt}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Converting...
              </span>
            ) : (
              `Convert to .${format}`
            )}
          </button>
        )}
      </div>

      <AdZone id="audio-converter-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload an audio file by dropping it or clicking to browse — MP3, WAV, OGG, AAC, FLAC, or M4A.",
          "Select the target format. A badge shows the best use case for each format.",
          "Click Convert, preview the result in the built-in player, and download the file.",
        ]}
      />

      <ToolSeoContent
        title="Free Audio Converter — MP3, WAV, OGG, AAC, FLAC Online, No Upload"
        description="Convert audio files between MP3, WAV, OGG, AAC, and FLAC instantly in your browser. Free, no signup, no server upload — powered by FFmpeg WebAssembly."
        body={[
          "Skycally's Audio Converter lets you convert any audio file between five popular formats — MP3, WAV, OGG, AAC, and FLAC — directly in your browser. Upload your file, select the target format, click Convert, preview the result in the built-in audio player, and download. No server upload, no account, no waiting in queues.",
          "Choosing the right audio format depends on your use case. MP3 is the most universal format and works on every device, app, and platform. AAC offers better audio quality at the same file size and is the standard for Apple devices, YouTube, and Spotify. OGG is an open-source format with excellent compression used by games and web apps. WAV and FLAC are lossless formats that preserve every detail of the original audio — ideal for music production, podcasting, and archiving.",
          "All conversion runs locally using FFmpeg WebAssembly — the same powerful engine used by professional video editors, compiled to run entirely in your browser tab. Your audio file never leaves your device, making this tool completely private. There is no file size limit enforced by a server and no data sent to any third party.",
          "After conversion, a built-in audio player lets you preview the result before downloading, and a size comparison shows exactly how much the file size changed. Lossless-to-lossy conversions (like WAV to MP3) typically reduce size by 60–80%, while lossless-to-lossless (like WAV to FLAC) reduce size by 20–40% with zero quality loss.",
        ]}
        faqs={[
          {
            question: "What audio formats can I convert to?",
            answer:
              "You can convert to MP3, WAV, OGG, AAC, and FLAC. Each format is suited to different use cases — MP3 for universal compatibility, AAC for streaming, WAV/FLAC for lossless quality.",
          },
          {
            question: "What input formats are supported?",
            answer:
              "Most audio formats are supported including MP3, WAV, OGG, AAC, FLAC, M4A, and MP4 (audio track). FFmpeg handles a wide range of codecs and containers.",
          },
          {
            question: "Is my audio file uploaded to a server?",
            answer:
              "No. All conversion runs locally in your browser using FFmpeg WebAssembly. Your file never leaves your device.",
          },
          {
            question: "Does converting audio reduce quality?",
            answer:
              "Converting from a lossless format (WAV, FLAC) to a lossy format (MP3, AAC, OGG) involves some quality reduction. Converting between two lossless formats preserves full quality. Re-encoding an already-lossy file (MP3 to AAC) may cause minor additional quality loss.",
          },
          {
            question: "Which format should I choose?",
            answer:
              "MP3: universal, works everywhere. AAC: best for streaming and Apple devices. OGG: open-source, great for games and web apps. WAV: uncompressed lossless, best for editing. FLAC: compressed lossless, best for archiving.",
          },
          {
            question: "Is there a file size limit?",
            answer:
              "There is no server-enforced file size limit. Very large files (over 500MB) may be slow to process depending on your device's CPU and memory.",
          },
          {
            question: "Can I preview the audio before downloading?",
            answer:
              "Yes. After conversion, a built-in audio player lets you preview the result directly in the browser before you download the file.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The Audio Converter works on smartphones and tablets running Chrome or other modern mobile browsers that support WebAssembly.",
          },
        ]}
      />

      <RelatedTools currentSlug="audio-converter" />
    </ToolPageShell>
  );
}
