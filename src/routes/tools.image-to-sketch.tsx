import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/image-to-sketch")({
  head: () => buildToolMeta(toolBySlug("image-to-sketch", tools)), => { e.stopPropagation(); inputRef.current?.click(); }}
                className="text-xs text-gray-600 hover:text-cyan-400 transition-colors"
              >
                Change image
              </button>
            </div>
          ) : (
            <div className="py-8 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop an image or click to browse</p>
            </div>
          )}
        </div>

        {preview && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Sketch Style</p>
            <div className="grid grid-cols-3 gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStyle(s.value); setResult(""); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === s.value
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-[#1e2d4a] hover:border-gray-500"
                  }`}
                >
                  <p className={`text-sm font-medium ${style === s.value ? "text-cyan-300" : "text-gray-400"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {preview && (
          <button
            onClick={convert}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Converting..." : "Convert to Sketch"}
          </button>
        )}

        {result && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Result — {style}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 mb-2 text-center">Original</p>
                <img src={preview} alt="Original" className="w-full rounded-xl object-contain max-h-48" />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2 text-center">Sketch</p>
                <img src={result} alt="Sketch" className="w-full rounded-xl object-contain max-h-48" />
              </div>
            </div>
            <button
              onClick={download}
              className="w-full py-3 rounded-xl border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-sm font-medium transition-all"
            >
              Download Sketch
            </button>
          </div>
        )}
      </div>
      <HowToUse steps={[
        "Upload a photo by drag-and-drop or browse.",
        "Pick a sketch style: pencil, charcoal, or edges.",
        "Click Convert and download your sketch as PNG.",
      ]} />
    </ToolPageShell>
  );
}
