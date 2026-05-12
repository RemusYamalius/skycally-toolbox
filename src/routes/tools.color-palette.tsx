import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/color-palette")({
  head: () => buildToolMeta(toolBySlug("color-palette", tools)),)}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-cyan-400 font-mono font-bold w-6 text-center">{colorCount}</span>
        </div>

        {loading && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">Extracting colors...</p>
          </div>
        )}

        {colors.length > 0 && !loading && (
          <div className="space-y-3">
            <div className="flex rounded-2xl overflow-hidden h-14">
              {colors.map((c) => (
                <div
                  key={c.hex}
                  className="flex-1 cursor-pointer hover:scale-y-110 transition-transform origin-bottom"
                  style={{ backgroundColor: c.hex }}
                  onClick={() => copy(c.hex)}
                  title={c.hex}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colors.map((c) => (
                <div key={c.hex} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="h-16 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => copy(c.hex)}
                  />
                  <div className="p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm text-cyan-400">{c.hex}</span>
                      <button
                        onClick={() => copy(c.hex)}
                        className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
                      >
                        {copied === c.hex ? "✓" : "Copy"}
                      </button>
                    </div>
                    <button
                      onClick={() => copy(c.rgb)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      {c.rgb}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => copy(allHex)}
              className="w-full py-3 rounded-2xl border border-border text-muted-foreground hover:border-cyan-500/50 hover:text-cyan-400 text-sm font-medium transition-all"
            >
              {copied === allHex ? "✓ Copied all!" : "Copy all HEX values"}
            </button>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Drop an image or click to upload one.",
        "Adjust how many dominant colors you want (3–12).",
        "Click any swatch or HEX value to copy it.",
      ]} />
    </ToolPageShell>
  );
}
