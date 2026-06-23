import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { getFFmpeg } from "@/utils/ffmpegLoader";
import { fetchFile } from "@ffmpeg/util";

export const Route = createFileRoute("/tools/extract-audio")({
  head: () => buildToolMeta(toolBySlug("extract-audio", tools)),
  component: ExtractAudio,
});

type Format = "mp3" | "aac" | "wav";

const FORMAT_INFO: Record<Format, { label: string; desc: string; color: string }> = {
  mp3: { label: "MP3", desc: "Most compatible", color: "text-cyan-400" },
  aac: { label: "AAC", desc: "Better quality", color: "text-purple-400" },
  wav: { label: "WAV", desc: "Lossless audio", color: "text-green-400" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function ExtractAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>("mp3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [audioSize, setAudioSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    setFile(f);
    setError("");
    setDone(false);
    setAudioSize(null);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const extract = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setDone(false);
    setAudioSize(null);
    try {
      const ffmpeg = await getFFmpeg();
      const inputName = "input_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const outputName = "audio." + format;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const args: string[] = ["-i", inputName, "-vn"];
      if (format === "mp3") args.push("-codec:a", "libmp3lame", "-qscale:a", "2");
      else if (format === "aac") args.push("-codec:a", "aac", "-b:a", "192k");
      else if (format === "wav") args.push("-codec:a", "pcm_s16le");
      args.push(outputName);
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outputName);
      const bytes = data as Uint8Array;
      const blob = new Blob([new Uint8Array(bytes)], { type: "audio/" + format });
      setAudioSize(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.split(".")[0]}_audio.${format}`;
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Extract Audio from Video"
      description="Extract MP3, AAC or WAV audio from any video file — runs entirely in your browser."
    >
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
                  setAudioSize(null);
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
              <p className="text-muted-foreground text-sm">Drop a video or click to browse</p>
              <p className="text-muted-foreground text-xs">MP4, MOV, AVI, MKV, WEBM</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Output Format</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(FORMAT_INFO) as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`p-3 rounded-xl border text-left transition-all ${format === f ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-border"}`}
                >
                  <p className={`text-sm font-medium ${format === f ? FORMAT_INFO[f].color : "text-muted-foreground"}`}>
                    {FORMAT_INFO[f].label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{FORMAT_INFO[f].desc}</p>
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

        {done && audioSize && file && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-400 text-sm font-medium">Audio extracted successfully!</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Video size</p>
                <p className="text-sm font-mono text-foreground">{formatSize(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Audio size</p>
                <p className="text-sm font-mono text-cyan-400">{formatSize(audioSize)}</p>
              </div>
            </div>
          </div>
        )}

        {file && (
          <button
            onClick={extract}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Extracting...
              </span>
            ) : (
              `Extract ${format.toUpperCase()}`
            )}
          </button>
        )}
      </div>

      <HowToUse
        steps={[
          "Upload any video file (MP4, MOV, AVI, MKV, WEBM).",
          "Choose your output audio format: MP3, AAC, or WAV.",
          "Click Extract — the audio file downloads automatically.",
        ]}
      />

      <ToolSeoContent
        title="Extract Audio from Video Online Free — MP3, AAC & WAV, No Upload"
        description="Extract the audio track from any video and download it as MP3, AAC, or WAV for free. Runs entirely in your browser with FFmpeg — no server upload, no signup."
        body={[
          "Skycally's Extract Audio tool lets you pull the audio track from any video file and save it as MP3, AAC, or WAV, directly in your browser. Upload a video in MP4, MOV, AVI, MKV, or WEBM format, choose your preferred audio format, and download the audio file in seconds using FFmpeg WebAssembly — no server required.",
          "Extracting audio from video is useful in many everyday situations: saving the soundtrack from a recorded concert, converting a lecture video into a podcast episode, pulling music from a screen recording, or extracting narration from a presentation. This tool handles all of those needs in a simple, distraction-free interface.",
          "MP3 is the most universally compatible format and works on every device and platform. AAC offers better audio quality at the same file size and is the preferred format for Apple devices, Spotify, and YouTube. WAV is uncompressed lossless audio — the largest file size but perfect when you need to preserve every detail for professional editing.",
          "All audio extraction runs locally using FFmpeg WebAssembly. Your video file never leaves your browser tab, making this tool completely private. There is no account required, no file size restriction enforced by a server, and no waiting in upload queues.",
        ]}
        faqs={[
          {
            question: "What video formats are supported?",
            answer:
              "You can upload MP4, MOV, AVI, MKV, WEBM, and most other common video formats. FFmpeg handles a wide range of container and codec combinations.",
          },
          {
            question: "What audio formats can I extract to?",
            answer:
              "MP3 (most compatible, works everywhere), AAC (better quality at same size, preferred by Apple and streaming platforms), and WAV (uncompressed lossless audio, largest file size).",
          },
          {
            question: "Will the audio quality be affected?",
            answer:
              "For MP3 we use variable bitrate quality setting 2 (~190kbps average). For AAC we use 192kbps CBR. WAV is completely lossless. Output quality closely matches the original audio in the video.",
          },
          {
            question: "Is my video uploaded to a server?",
            answer:
              "No. Everything runs locally in your browser using FFmpeg WebAssembly. Your video never leaves your device.",
          },
          {
            question: "How long does extraction take?",
            answer:
              "Audio extraction is very fast — typically a few seconds for most videos regardless of length, since only the audio stream is processed without re-encoding the video.",
          },
          {
            question: "Can I extract audio from a video with multiple audio tracks?",
            answer:
              "The tool extracts the default (first) audio track from the video. For multi-track extraction or track selection, a desktop tool like VLC or FFmpeg CLI would be needed.",
          },
          {
            question: "What is the difference between MP3, AAC, and WAV?",
            answer:
              "MP3 is universal and works everywhere. AAC offers better quality at smaller file sizes and is preferred by Apple devices and streaming services. WAV is uncompressed lossless audio with the largest file size — ideal for further editing.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The tool works on smartphones and tablets running Chrome or other modern mobile browsers that support WebAssembly.",
          },
        ]}
      />

      <RelatedTools currentSlug="extract-audio" />
    </ToolPageShell>
  );
}
