import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Combine, Download, Loader2, ArrowUp, ArrowDown, X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/file-utils";
import { FFmpegBanner, PoweredByNote } from "@/components/ffmpeg-banner";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/video-merger")({
  head: () => buildToolMeta(toolBySlug("video-merger", tools)),
  component: Page,
});

interface Item { id: string; file: File; url: string; }

function Page() {
  const [videos, setVideos] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files).map((f) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) }));
    setVideos((p) => [...p, ...items]);
    setResult(null);
  };

  const remove = (id: string) => setVideos((p) => p.filter((v) => v.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    setVideos((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const arr = [...p];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const run = async () => {
    if (videos.length < 2) return;
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      setStatus("Loading merger...");
      const { fetchFile } = await import("@ffmpeg/util");
      const { getFFmpeg } = await import("@/utils/ffmpegLoader");
      const ffmpeg = await getFFmpeg(setProgress);

      setStatus("Reading videos...");
      const names: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        const ext = videos[i].file.name.split(".").pop() || "mp4";
        const name = `input_${i}.${ext}`;
        await ffmpeg.writeFile(name, await fetchFile(videos[i].file));
        names.push(name);
      }
      const concat = names.map((n) => `file '${n}'`).join("\n");
      await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concat));

      setStatus("Merging...");
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);

      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const buf = new Uint8Array(data);
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: "video/mp4" });
      setResult({ url: URL.createObjectURL(blob), blob });
      toast.success("Merged!");
    } catch (e: any) {
      toast.error(e?.message || "Merge failed. All videos must share the same codec/format.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <ToolPageShell title="Video Merger" description="Combine multiple videos into one — works entirely in your browser.">
      <FFmpegBanner />

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-foreground/30 bg-card p-8 text-center transition"
      >
        <input ref={inputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
        <Combine className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-display font-semibold">Drop videos or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">Add 2 or more videos to merge (same format)</p>
      </div>

      {videos.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Videos ({videos.length}) — reorder with arrows</p>
          {videos.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 border border-border px-3 py-2">
              <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}</span>
              <video src={v.url} className="w-16 h-10 object-cover rounded-md bg-black" />
              <p className="flex-1 text-sm truncate">{v.file.name}</p>
              <p className="text-xs text-muted-foreground">{(v.file.size / 1024 / 1024).toFixed(1)}MB</p>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30 hover:text-foreground text-muted-foreground"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === videos.length - 1} className="p-1 disabled:opacity-30 hover:text-foreground text-muted-foreground"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => remove(v.id)} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {videos.length >= 2 && (
        <button onClick={run} disabled={busy} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Combine className="w-4 h-4" />} {busy ? (status || "Merging...") : `Merge ${videos.length} videos`}
        </button>
      )}

      {videos.length === 1 && <p className="mt-4 text-center text-sm text-muted-foreground">Add at least one more video to merge.</p>}

      {busy && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground text-center">{status} · {progress}%</p>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
          <video src={result.url} controls className="w-full rounded-xl border border-border bg-black" />
          <button onClick={() => downloadBlob(result.blob, "merged_video.mp4")} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      )}

      {/* ADSENSE_ZONE: video-merger-bottom 728x90 */}
      <AdZone id="video-merger-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload two or more videos (same format works best).",
        "Reorder them with the up/down arrows.",
        "Click Merge and download the combined video.",
      ]} />

      <PoweredByNote />
          <RelatedTools currentSlug="video-merger" />
          <ToolSeoContent
        title={"Merge Videos Online Free — Combine Multiple Videos"}
        description={"Combine two or more video files into one seamless video with Skycally's free online video merger. Reorder clips, then download the merged result instantly."}
        body={[
        "Upload multiple video files, arrange them in the desired order using the up/down controls, and merge them into a single MP4 file. The tool supports MP4, MOV, AVI and WEBM input formats.",
        "Video merging uses stream concatenation — no re-encoding means your original video quality is fully preserved and processing is fast even for large files.",
      ]}
        faqs={[
        { question: "Do the videos need to be the same resolution?", answer: "For best results, videos should have the same resolution and frame rate. Merging videos with different specs may cause playback issues." },
        { question: "How many videos can I merge at once?", answer: "You can merge unlimited videos in a single session. Simply upload all files and arrange them in the desired order." },
        { question: "Will there be a gap between merged clips?", answer: "No. The merger joins clips seamlessly with no gaps, transitions or black frames between them." },
        { question: "Is there a file size limit per video?", answer: "Since processing happens in your browser, the limit depends on your device's available memory. Files up to 500MB per clip work well on most devices." },
      ]}
      />
      </ToolPageShell>
  );
}
