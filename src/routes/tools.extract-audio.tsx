import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/extract-audio")({
  head: () => ({
    meta: [
      { title: "Extract Audio from Video — Skycally" },
      { name: "description", content: "Extract MP3, AAC or WAV audio from any video file." },
      { property: "og:title", content: "Extract Audio from Video · Skycally" },
      { property: "og:description", content: "Extract MP3, AAC or WAV audio from any video file." },
    ],
  }),
  component: ExtractAudio,
});

const API = import.meta.env.VITE_API_URL;

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
      const form = new FormData();
      form.append("file", file);
      form.append("format", format);
      const res = await fetch(`${API}/api/extract-audio`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Extraction failed");
      }
      const blob = await res.blob();
      setAudioSize(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.split(".")[0]}_audio.${format}`;
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell title="Extract Audio from Video" description="Extract MP3, AAC or WAV audio from any video file.">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-gray-200 font-medium text-sm">{file.name}</p>
              <p className="text-gray-500 text-xs">{formatSize(file.size)}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setDone(false);
                  setAudioSize(null);
                }}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop a video or click to browse</p>
              <p className="text-gray-700 text-xs">MP4, MOV, AVI, MKV, WEBM</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Output Format</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(FORMAT_INFO) as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === f ? "border-cyan-500 bg-cyan-500/10" : "border-[#1e2d4a] hover:border-gray-500"
                  }`}
                >
                  <p className={`text-sm font-medium ${format === f ? FORMAT_INFO[f].color : "text-gray-400"}`}>
                    {FORMAT_INFO[f].label}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{FORMAT_INFO[f].desc}</p>
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
                <p className="text-xs text-gray-500">Video size</p>
                <p className="text-sm font-mono text-gray-300">{formatSize(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Audio size</p>
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
            ) : `Extract ${format.toUpperCase()}`}
          </button>
        )}
      </div>
      <HowToUse steps={[
        "Upload a video by dropping it or clicking to browse.",
        "Choose your output format: MP3, AAC or WAV.",
        "Click Extract to download the audio file instantly.",
      ]} />
          <ToolSeoContent
        title={"Extract Audio from Video — Free MP3, AAC & WAV Converter"}
        description={"Extract the audio track from any video file and download it as MP3, AAC or WAV for free. Perfect for creating podcasts, music files or audio samples."}
        body={[
        "Upload any video file in MP4, MOV, AVI, MKV or WEBM format and extract the audio in your preferred format. MP3 works on all devices, AAC offers better quality at the same file size, and WAV provides uncompressed lossless audio.",
        "The extraction process uses FFmpeg on our secure server, ensuring high-quality audio output. Your video file is immediately deleted after the audio is extracted and downloaded.",
      ]}
        faqs={[
        { question: "Will the audio quality be affected?", answer: "For MP3 and AAC we use high quality settings (192kbps equivalent). WAV is completely lossless. The output quality matches the original audio in the video." },
        { question: "Can I extract audio from any video format?", answer: "Yes, we support all major video formats including MP4, MOV, AVI, MKV, WEBM and more." },
        { question: "How long does extraction take?", answer: "Audio extraction is very fast — typically a few seconds for most videos regardless of length, since no video re-encoding is required." },
        { question: "What is the difference between MP3, AAC and WAV?", answer: "MP3 is universal and works everywhere. AAC offers better quality at smaller file sizes and is preferred by Apple devices. WAV is uncompressed lossless audio with the largest file size." },
      ]}
      />
      </ToolPageShell>
  );
}
