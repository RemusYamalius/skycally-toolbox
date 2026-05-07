import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/video-compressor")({
  head: () => ({
    meta: [
      { title: "Video Compressor — Shrink videos · Skycally" },
      { name: "description", content: "Reduce video file size without losing quality." },
      { property: "og:title", content: "Video Compressor · Skycally" },
      { property: "og:description", content: "Reduce video file size without losing quality." },
    ],
  }),
  component: VideoCompressor,
});

const API = "https://skycally-api-production.up.railway.app";

type Quality = "low" | "medium" | "high";

const QUALITY_INFO: Record<Quality, { label: string; desc: string; color: string }> = {
  low:    { label: "Low",    desc: "Smallest file size",      color: "text-orange-400" },
  medium: { label: "Medium", desc: "Balanced size & quality", color: "text-cyan-400"   },
  high:   { label: "High",   desc: "Best quality",            color: "text-green-400"  },
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
      const form = new FormData();
      form.append("file", file);
      form.append("quality", quality);
      const res = await fetch(`${API}/api/video-compress`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Compression failed");
      }
      const blob = await res.blob();
      setCompressedSize(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.split(".")[0]}_compressed.mp4`;
      a.click();
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savings = file && compressedSize
    ? Math.round((1 - compressedSize / file.size) * 100)
    : null;

  return (
    <ToolPageShell title="Video Compressor" description="Reduce video file size without losing quality.">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-[#1e2d4a] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <p className="text-gray-200 font-medium text-sm">{file.name}</p>
              <p className="text-gray-500 text-xs">{formatSize(file.size)}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setDone(false); setCompressedSize(null); }}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop a video or click to browse</p>
              <p className="text-gray-700 text-xs">MP4, MOV, AVI, MKV, WEBM</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Compression Quality</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(QUALITY_INFO) as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    quality === q
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-[#1e2d4a] hover:border-gray-500"
                  }`}
                >
                  <p className={`text-sm font-medium ${quality === q ? QUALITY_INFO[q].color : "text-gray-400"}`}>
                    {QUALITY_INFO[q].label}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{QUALITY_INFO[q].desc}</p>
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
                <p className="text-xs text-gray-500">Original</p>
                <p className="text-sm font-mono text-gray-300">{formatSize(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Compressed</p>
                <p className="text-sm font-mono text-cyan-400">{formatSize(compressedSize)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Saved</p>
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
            ) : "Compress Video"}
          </button>
        )}
      </div>
      <HowToUse steps={[
        "Upload a video by dropping it or clicking to browse.",
        "Choose a compression quality: Low, Medium or High.",
        "Click Compress Video to download the smaller file instantly.",
      ]} />
    </ToolPageShell>
  );
}
