import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/meme-generator")({
  head: () => buildToolMeta(toolBySlug("meme-generator", tools)),) {
          await navigator.share({ files: [file], title: "My meme" });
        } else {
          await navigator.share({ title: "My meme", url: location.href });
        }
      } catch {/* user cancel */}
    }, "image/png");
  };

  return (
    <ToolPageShell title="Meme Generator" description="Create classic memes from popular templates or your own image.">
      {!imgSrc ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Pick a template:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {MEME_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => setImgSrc(t.url)} className="group rounded-lg overflow-hidden border border-border bg-card hover:ring-2 hover:ring-[var(--cyan-brand)] transition">
                <img src={t.url} alt={t.name} crossOrigin="anonymous" className="w-full aspect-square object-cover" />
                <p className="text-[11px] py-1 px-1 text-center truncate">{t.name}</p>
              </button>
            ))}
          </div>
          <label className="block">
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-foreground/30">
              <p className="font-semibold">Or upload your own image</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WEBP</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
          </div>
          <div className="space-y-3">
            <input value={topText} onChange={(e) => setTopText(e.target.value)} placeholder="Top text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input value={bottomText} onChange={(e) => setBottomText(e.target.value)} placeholder="Bottom text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>Impact</option><option>Arial</option><option>Oswald</option>
            </select>
            <label className="block text-xs text-muted-foreground">Font size: {fontSize}px
              <input type="range" min={24} max={80} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Text color<input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
              <label className="text-xs text-muted-foreground">Outline<input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="mt-1 w-full h-8 rounded border border-border" /></label>
            </div>
            <label className="block text-xs text-muted-foreground">Outline width: {outlineWidth}px
              <input type="range" min={1} max={8} value={outlineWidth} onChange={(e) => setOutlineWidth(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allCaps} onChange={(e) => setAllCaps(e.target.checked)} />ALL CAPS</label>

            <button onClick={download} className="w-full py-3 rounded-xl bg-foreground text-background font-semibold">Download Meme</button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button onClick={share} className="w-full py-2 rounded-xl border border-border text-sm hover:bg-secondary">Share</button>
            )}
            <button onClick={() => { setImgSrc(""); imgRef.current = null; }} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">Choose another template</button>
          </div>
        </div>
      )}
      <AdZone id="image-tool-below-result" size="300x250" />
      <HowToUse steps={[
        "Pick a template or upload your own image.",
        "Type your top and bottom text and tweak font, size and outline.",
        "Click Download Meme to save your masterpiece as PNG.",
      ]} />
          <ToolSeoContent
        title={"Free Meme Generator — Create Custom Memes Online"}
        description={"Create memes from popular templates or upload your own image. Add top and bottom text with classic Impact font. Customize colors, size and outline. Download instantly."}
        body={[
        "Choose from 12 iconic meme templates including Drake, Distracted Boyfriend, Two Buttons, This is Fine and more — or upload your own custom image. Add your text in the classic Impact font with bold outline for maximum readability.",
        "All customization happens in real-time — see your meme update as you type. Download as PNG when you're happy with the result and share anywhere.",
      ]}
        faqs={[
        { question: "Can I use my own image for a meme?", answer: "Yes! Click 'Upload Your Own' to use any image from your device as the meme background." },
        { question: "Why does meme text use Impact font?", answer: "Impact is the traditional meme font — its bold, condensed style with white fill and black outline is instantly recognizable and highly readable on any image background." },
        { question: "Can I save my meme and edit it later?", answer: "Currently memes are generated fresh each session. We recommend downloading immediately after creation." },
        { question: "Are the meme templates copyright free?", answer: "Meme templates are widely used for parody and commentary purposes under fair use. However, always check local copyright laws before commercial use." },
      ]}
      />
      </ToolPageShell>
  );
}
