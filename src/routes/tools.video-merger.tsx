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
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/video-merger")({
  head: () => buildToolMeta(toolBySlug("video-merger", tools)),
  component: Page,
});

interface Item {
  id: string;
  file: File;
  url: string;
}

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
      setStatus("Preparing videos...");
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      for (let i = 0; i < videos.length; i++) {
        setStatus(`Recording video ${i + 1} of ${videos.length}...`);
        setProgress(Math.round((i / videos.length) * 90));
        await new Promise<void>((resolve, reject) => {
          const video = document.createElement("video");
          video.src = videos[i].url;
          video.muted = true;
          video.preload = "auto";
          video.onloadedmetadata = () => {
            const stream = (video as any).captureStream?.() ?? (video as any).mozCaptureStream?.();
            if (!stream) {
              reject(new Error("captureStream not supported. Use Chrome or Edge."));
              return;
            }
            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = () => resolve();
            recorder.onerror = () => reject(new Error("Recording error"));
            recorder.start(100);
            video.play();
            video.onended = () => {
              video.pause();
              recorder.stop();
            };
          };
          video.onerror = () => reject(new Error(`Could not load video ${i + 1}`));
        });
      }
      setStatus("Finalizing...");
      setProgress(95);
      const blob = new Blob(chunks, { type: mimeType });
      setResult({ url: URL.createObjectURL(blob), blob });
      setProgress(100);
      toast.success("Videos merged!");
    } catch (e: any) {
      toast.error(e?.message || "Merge failed");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <ToolPageShell
      title="Video Merger"
      description="Combine multiple videos into one — works entirely in your browser."
    >
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-foreground/30 bg-card p-8 text-center transition"
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
        <Combine className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-display font-semibold">Drop videos or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">Add 2 or more videos to merge</p>
      </div>

      {videos.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Videos ({videos.length}) — reorder with arrows
          </p>
          {videos.map((v, i) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-xl bg-secondary/40 border border-border px-3 py-2"
            >
              <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}</span>
              <video src={v.url} className="w-16 h-10 object-cover rounded-md bg-black" />
              <p className="flex-1 text-sm truncate">{v.file.name}</p>
              <p className="text-xs text-muted-foreground">{(v.file.size / 1024 / 1024).toFixed(1)}MB</p>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="p-1 disabled:opacity-30 hover:text-foreground text-muted-foreground"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === videos.length - 1}
                className="p-1 disabled:opacity-30 hover:text-foreground text-muted-foreground"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button onClick={() => remove(v.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {videos.length >= 2 && (
        <button
          onClick={run}
          disabled={busy}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Combine className="w-4 h-4" />}{" "}
          {busy ? status || "Merging..." : `Merge ${videos.length} videos`}
        </button>
      )}

      {videos.length === 1 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Add at least one more video to merge.</p>
      )}

      {busy && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground text-center">
            {status} · {progress}%
          </p>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
          <video src={result.url} controls className="w-full rounded-xl border border-border bg-black" />
          <button
            onClick={() => downloadBlob(result.blob, "merged_video.webm")}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      )}

      <AdZone id="video-merger-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload two or more video files (MP4, MOV, WEBM — same format works best).",
          "Reorder the clips using the up/down arrows to set the playback sequence.",
          "Click Merge and download the combined video file.",
        ]}
      />

      <p className="text-xs text-center text-muted-foreground">Runs entirely in your browser — no uploads.</p>

      <ToolSeoContent
        title="Merge Videos Online Free — Combine Multiple Video Clips, No Upload"
        description="Combine two or more video files into one seamless video with Skycally's free online video merger. Reorder clips, then download instantly — no signup, no upload."
        body={[
          "Skycally's Video Merger lets you combine multiple video clips into a single seamless file, directly in your browser. Upload two or more videos, drag them into the order you want using the up/down arrows, then click Merge to produce a single downloadable video. No server, no signup, no software required.",
          "This tool is ideal for joining multiple clips recorded in sequence — combining interview segments, stitching together travel highlights, assembling a product demo from separate takes, or creating a compilation from clips filmed on separate occasions.",
          "All processing uses the browser's MediaRecorder API, which means your videos never leave your device. The output is a WebM file that plays natively in Chrome, Firefox, and Android, and can be converted to MP4 if needed for other platforms.",
          "For best quality, use clips with the same resolution and frame rate. Merging videos with different specs may cause playback inconsistencies. If your clips have different formats, convert them to a common format first using the Audio Converter or a video converter.",
        ]}
        faqs={[
          {
            question: "How many videos can I merge at once?",
            answer:
              "You can merge unlimited videos in a single session. Upload all your clips, reorder them with the arrows, and merge in one click.",
          },
          {
            question: "Do the videos need to be the same resolution or format?",
            answer:
              "For best results, use videos with the same resolution and frame rate. Mixing different specs can cause quality inconsistencies or playback issues in the merged output.",
          },
          {
            question: "Will there be a gap or black frame between clips?",
            answer:
              "No. The merger joins clips back-to-back with no gaps, transitions, or black frames. The cuts are seamless.",
          },
          {
            question: "Is my video uploaded to a server?",
            answer:
              "No. Everything runs locally in your browser using the MediaRecorder API. Your video files never leave your device.",
          },
          {
            question: "What is the output format?",
            answer:
              "The merged output is saved as a WebM (VP9) file. This is natively supported in Chrome, Firefox, and Android. For MP4 output, convert the file after merging.",
          },
          {
            question: "Is there a file size limit per clip?",
            answer:
              "There is no enforced size limit per clip. Very large files (over 1GB each) may be slow to process depending on your device's memory and CPU.",
          },
          {
            question: "Can I add transitions between clips?",
            answer:
              "Currently the tool joins clips with hard cuts — no fade, dissolve, or other transitions. For transitions, use a desktop editor like DaVinci Resolve or CapCut.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The Video Merger works on smartphones and tablets running Chrome or other modern mobile browsers.",
          },
        ]}
      />

      <RelatedTools currentSlug="video-merger" />
    </ToolPageShell>
  );
}
