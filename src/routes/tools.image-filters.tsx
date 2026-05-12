import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/image-filters")({
  head: () => buildToolMeta(toolBySlug("image-filters", tools)), => { e.stopPropagation(); inputRef.current?.click(); }}
                className="text-xs text-gray-600 hover:text-cyan-400 transition-colors"
              >
                Change image
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-[#1e2d4a] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Drop an image or click to browse</p>
            </div>
          )}
        </div>

        {/* Filters Row */}
        {preview && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Choose Filter</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FILTERS.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setSelected(i)}
                  className={`shrink-0 flex flex-col items-center gap-2 transition-all`}
                >
                  <div
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selected === i ? "border-cyan-400 scale-105" : "border-transparent"
                    }`}
                  >
                    <img
                      src={preview}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.style === "none" ? undefined : f.style }}
                    />
                  </div>
                  <span className={`text-xs ${selected === i ? "text-cyan-400" : "text-gray-600"}`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Button */}
        {preview && (
          <button
            onClick={download}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {downloading ? "Preparing..." : `Download — ${FILTERS[selected].name}`}
          </button>
        )}
      </div>
      <HowToUse steps={[
        "Drop an image or click to upload one.",
        "Pick a filter from the row of previews.",
        "Click Download to save the filtered image as PNG.",
      ]} />
    </ToolPageShell>
  );
}
