import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/video-compressor")({
  head: () => buildToolMeta(toolBySlug("video-compressor", tools)),}</p>
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
          <ToolSeoContent
        title={"Free Video Compressor — Reduce Video File Size Online"}
        description={"Reduce your video file size without losing quality using Skycally's free video compressor. Perfect for sharing on social media, email, or saving storage space."}
        body={[
        "Choose from three compression levels: Low for maximum compression, Medium for a balanced result, and High for the best quality. Our tool uses the H.264 codec to ensure maximum compatibility across all devices and platforms.",
        "The compression happens on our secure server using FFmpeg, one of the most trusted video processing tools available. Your files are processed and immediately deleted after download.",
      ]}
        faqs={[
        { question: "How much can I reduce my video file size?", answer: "Depending on the original video and quality setting, you can typically reduce file size by 30-70% without noticeable quality loss." },
        { question: "What video formats are supported?", answer: "You can upload MP4, MOV, AVI, MKV and WEBM files. The compressed output is always in MP4 format for maximum compatibility." },
        { question: "Is there a file size limit?", answer: "We support files up to 500MB. For larger files, we recommend using the High quality setting to minimize processing time." },
        { question: "Will the video dimensions change after compression?", answer: "No. The video resolution stays the same — only the bitrate is reduced to achieve a smaller file size." },
      ]}
      />
      </ToolPageShell>
  );
}
