import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/audio-converter")({
  head: () => buildToolMeta(toolBySlug("audio-converter", tools)),
  component: AudioConverter,
});

import { getFFmpeg } from "@/utils/ffmpegLoader";
import { fetchFile } from "@ffmpeg/util";

const FORMATS = ["mp3", "wav", "ogg", "aac", "flac"];
const FORMAT_INFO: Record<string, string> = {
  mp3: "Best for music & podcasts",
  wav: "Lossless, large file size",
  ogg: "Open format, good quality",
  aac: "Best for streaming",
  flac: "Lossless compression",
};

function AudioConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    setFile(f);
    setError("");
    setDone(false);
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
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("format", format);
      const res = await fetch(`${API}/api/audio-convert`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Conversion failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = file.name.includes(".") ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;
      a.download = `${base || "audio"}.${format}`;
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentExt = file?.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    <ToolPageShell title="Audio Converter" description="Convert audio files between MP3, WAV, OGG, AAC and FLAC instantly.">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef} type="file"
            accept="audio/*,video/mp4"
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
              <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setDone(false); }}
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
              <p className="text-gray-500 text-sm">Drop an audio file or click to browse</p>
              <p className="text-gray-700 text-xs">MP3, WAV, OGG, AAC, FLAC, M4A</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Convert to</span>
              {currentExt && (
                <span className="text-xs font-mono text-gray-600">
                  .{currentExt} →
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
                      ? "border-[#1e2d4a] text-gray-700 cursor-not-allowed"
                      : "border-[#1e2d4a] text-gray-500 hover:border-gray-500 hover:text-gray-300"
                  }`}
                >
                  .{f}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">{FORMAT_INFO[format]}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {done && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-400 text-sm">Converted successfully — downloading...</p>
          </div>
        )}

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
            ) : `Convert to .${format}`}
          </button>
        )}
      </div>
      <HowToUse steps={[
        "Upload an audio file by dropping it or clicking to browse.",
        "Pick the target format (MP3, WAV, OGG, AAC or FLAC).",
        "Click Convert to download the converted audio instantly.",
      ]} />
          <RelatedTools currentSlug="audio-converter" />
          <ToolSeoContent
        title="Free Audio Converter — MP3, WAV, OGG, AAC, FLAC"
        description="Skycally's Audio Converter lets you convert audio files between the most popular formats: MP3, WAV, OGG, AAC, and FLAC. It supports a wide range of input formats including M4A and MP4. The conversion is handled securely on our server and the result is downloaded to your device automatically. Fast, free, and no signup required."
        body={[]}
        faqs={[{"question":"What formats can I convert to?","answer":"You can convert to MP3, WAV, OGG, AAC, and FLAC."},{"question":"What formats can I upload?","answer":"Most audio formats are supported including MP3, WAV, OGG, AAC, FLAC, M4A, and MP4."},{"question":"How long does conversion take?","answer":"Most conversions complete in under 30 seconds depending on file size."},{"question":"Is there a file size limit?","answer":"For best performance, we recommend files under 100MB."},{"question":"Is my audio file stored on your server?","answer":"No. Files are processed and deleted immediately after conversion."}]}
      />
    </ToolPageShell>
  );
}
