import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { AlertCircle } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/video-downloader")({
  head: () => buildToolMeta(toolBySlug("video-downloader", tools)),
  component: VideoDownloader,
});

function VideoDownloader() {
  return (
    <ToolPageShell title="Video Downloader" description="Download videos from popular platforms.">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="font-display text-xl font-bold">Temporarily unavailable</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The video downloader relied on a backend service that has been retired. This tool is currently
          offline. In the meantime, try our browser-based tools like Video Trimmer, Video Compressor or
          Video to GIF on a local file.
        </p>
      </div>

      <HowToUse steps={[
        "This tool is temporarily offline.",
        "Use a local video file with our other browser-based video tools.",
        "Check back soon for updates.",
      ]} />
      <RelatedTools currentSlug="video-downloader" />
      <ToolSeoContent
        title={"Video Downloader — Skycally"}
        description={"Skycally's video downloader is temporarily unavailable while we move to a fully browser-based pipeline."}
        body={[
          "We're rebuilding our video downloader to run entirely in your browser, with no server uploads required.",
          "In the meantime, you can use our other browser-based video tools like Video Trimmer, Video Compressor, Video Merger, Add Subtitles and Video to GIF — all of which work directly on local files.",
        ]}
        faqs={[
          { question: "When will the video downloader come back?", answer: "We're working on a fully browser-based replacement. No date yet — check back soon." },
          { question: "Why was it taken offline?", answer: "The backend service it relied on has been retired so we can focus on tools that run entirely on your device." },
          { question: "Can I still process my own video files?", answer: "Yes — every other video tool on Skycally runs locally in your browser and works with files already on your device." },
          { question: "Will downloads work on mobile when it returns?", answer: "Yes, the replacement is being designed to work on both desktop and mobile browsers." },
        ]}
      />
    </ToolPageShell>
  );
}
