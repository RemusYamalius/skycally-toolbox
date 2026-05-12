import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/audio-converter")({
  head: () => buildToolMeta(toolBySlug("audio-converter", tools)),.toFixed(2)} MB</p>
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
    </ToolPageShell>
  );
}
