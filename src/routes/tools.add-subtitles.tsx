import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Captions, Download, Loader2, Plus, X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/add-subtitles")({
  head: () => buildToolMeta(toolBySlug("add-subtitles", tools)),
  component: Page,
});

interface Sub { id: string; start: string; end: string; text: string; }

const toSRT = (subs: Sub[]) =>
  subs.map((s, i) => `${i + 1}\n${s.start} --> ${s.end}\n${s.text}\n`).join("\n");

const COLOR_MAP: Record<string, string> = {
  white: "FFFFFF",
  yellow: "00FFFF",
  cyan: "FFFF00",
};

const timeToSec = (t: string) => {
  const [h, m, rest] = t.split(":");
  const [s, ms] = (rest || "0").replace(",", ".").split(".");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (parseInt(ms || "0") / 1000);
};

const parseSRT = (content: string) => {
  const blocks = content.trim().split(/\n\n+/);
  return blocks.map((b) => {
    const lines = b.split("\n");
    const times = (lines[1] || "").split(" --> ");
    return { start: timeToSec(times[0] || "0"), end: timeToSec(times[1] || "0"), text: lines.slice(2).join(" ") };
  }).filter((s) => s.text);
};

function Page() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"manual" | "upload">("manual");
  const [subs, setSubs] = useState<Sub[]>([
    { id: crypto.randomUUID(), start: "00:00:01,000", end: "00:00:04,000", text: "First subtitle" },
    { id: crypto.randomUUID(), start: "00:00:05,000", end: "00:00:08,000", text: "Second subtitle" },
  ]);
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState<keyof typeof COLOR_MAP>("white");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const srtRef = useRef<HTMLInputElement>(null);

  const pickVideo = (f: File) => {
    setVideoFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setResult(null);
  };

  const updateSub = (id: string, patch: Partial<Sub>) =>
    setSubs((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const run = async () => {
    if (!videoFile) return;
    setBusy(true); setProgress(0); setResult(null);
    try {
      setStatus("Loading video...");
      const activeSubs: { start: number; end: number; text: string }[] = (
        mode === "upload" && srtFile
          ? parseSRT(await srtFile.text())
          : subs.map((s) => ({ start: timeToSec(s.start), end: timeToSec(s.end), text: s.text }))
      );

      const video = document.createElement("video");
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const colorMap: Record<string, string> = { white: "#ffffff", yellow: "#ffff00", cyan: "#00ffff" };
      const subtitleColor = colorMap[color] || "#ffffff";
      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const t = video.currentTime;
        const sub = activeSubs.find((s) => t >= s.start && t <= s.end);
        if (sub) {
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = "center";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.strokeText(sub.text, canvas.width / 2, canvas.height - 40);
          ctx.fillStyle = subtitleColor;
          ctx.fillText(sub.text, canvas.width / 2, canvas.height - 40);
        }
      };

      recorder.start(100);
      await video.play();

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          drawFrame();
          const pct = Math.round((video.currentTime / video.duration) * 90);
          setProgress(pct);
          setStatus(`Processing ${Math.round(video.currentTime)}s / ${Math.round(video.duration)}s...`);
          if (video.ended) { clearInterval(interval); video.pause(); recorder.stop(); }
        }, 33);
        recorder.onstop = () => resolve();
      });

      const blob = new Blob(chunks, { type: mimeType });
      setResult({ url: URL.createObjectURL(blob), blob });
      setProgress(100);
      toast.success("Subtitles burned!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to burn subtitles");
    } finally { setBusy(false); setStatus(""); }
  };

  return (
    <ToolPageShell title="Add Subtitles to Video" description="Burn subtitles into any video — works entirely in your browser.">

      {/* Video upload */}
      <div
        onClick={() => !videoFile && vidRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickVideo(f); }}
        onDragOver={(e) => e.preventDefault()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-foreground/30 bg-card p-6 text-center transition"
      >
        <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickVideo(f); }} />
        {videoFile ? (
          <div>
            <p className="font-semibold">{videoFile.name}</p>
            <button onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoUrl(""); setResult(null); }} className="text-xs text-muted-foreground hover:text-foreground mt-2">Change</button>
          </div>
        ) : (
          <>
            <Captions className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="font-display font-semibold">Upload your video</p>
          </>
        )}
      </div>

      {videoUrl && <video src={videoUrl} controls className="mt-4 w-full rounded-2xl border border-border bg-black" />}

      {videoFile && (
        <div className="mt-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-3">
            {(["manual", "upload"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${mode === m ? "border-transparent bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {m === "manual" ? "Write subtitles" : "Upload .SRT file"}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            <div onClick={() => srtRef.current?.click()} className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center hover:border-foreground/30">
              <input ref={srtRef} type="file" accept=".srt" className="hidden" onChange={(e) => setSrtFile(e.target.files?.[0] || null)} />
              {srtFile ? <p className="font-semibold">{srtFile.name}</p> : <p className="text-muted-foreground">Upload .SRT subtitle file</p>}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Subtitles ({subs.length})</p>
                <button onClick={() => setSubs((p) => [...p, { id: crypto.randomUUID(), start: "00:00:00,000", end: "00:00:03,000", text: "New subtitle" }])} className="inline-flex items-center gap-1 text-xs hover:text-foreground text-muted-foreground">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {subs.map((s, i) => (
                <div key={s.id} className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <button onClick={() => setSubs((p) => p.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={s.start} placeholder="00:00:01,000" onChange={(e) => updateSub(s.id, { start: e.target.value })} className="rounded-md border border-border bg-transparent px-2 py-1 text-xs font-mono" />
                    <input value={s.end} placeholder="00:00:04,000" onChange={(e) => updateSub(s.id, { end: e.target.value })} className="rounded-md border border-border bg-transparent px-2 py-1 text-xs font-mono" />
                  </div>
                  <input value={s.text} onChange={(e) => updateSub(s.id, { text: e.target.value })} className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          )}

          {/* Style */}
          <div className="rounded-2xl border border-border bg-card p-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Font size: {fontSize}px</label>
              <input type="range" min={14} max={48} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-2">
                {(Object.keys(COLOR_MAP) as Array<keyof typeof COLOR_MAP>).map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`px-3 py-1 rounded-lg text-xs capitalize border transition ${color === c ? "border-transparent bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={run} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-3 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Captions className="w-4 h-4" />} {busy ? (status || "Working...") : "Burn Subtitles"}
          </button>

          {busy && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{status} · {progress}%</p>
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <video src={result.url} controls className="w-full rounded-xl border border-border bg-black" />
              <button onClick={() => downloadBlob(result.blob, "video_with_subtitles.mp4")} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: add-subtitles-bottom 728x90 */}
      <AdZone id="add-subtitles-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload your video file.",
        "Write subtitles inline or upload a .SRT file, then pick size and color.",
        "Click Burn Subtitles and download the result.",
      ]} />

      <PoweredByNote />
          <RelatedTools currentSlug="add-subtitles" />
          <ToolSeoContent
        title={"Add Subtitles to Video Online — Free Subtitle Burner"}
        description={"Burn subtitles permanently into your video using Skycally's free online subtitle tool. Write subtitles manually or upload an SRT file — no software needed."}
        body={[
        "Choose between writing your own subtitles with precise timing control or uploading an existing SRT subtitle file. Customize the font size and color to match your video style.",
        "Subtitles are burned directly into the video frames, making them visible on all devices and platforms without needing a separate subtitle file. Perfect for social media videos, educational content and presentations.",
      ]}
        faqs={[
        { question: "What subtitle file formats are supported?", answer: "We support SRT (SubRip) format for file uploads, which is the most widely used subtitle format compatible with all major video players." },
        { question: "Can I add subtitles in Arabic or other RTL languages?", answer: "Yes, our subtitle tool supports all languages including Arabic, Hebrew and other right-to-left languages." },
        { question: "Are the subtitles permanent or removable?", answer: "Subtitles are burned (hardcoded) into the video, meaning they are permanent and visible on all devices without needing a subtitle player." },
        { question: "What is SRT format?", answer: "SRT (SubRip Subtitle) is a plain text file containing subtitle text with start and end timestamps. You can create one with any text editor." },
      ]}
      />
      </ToolPageShell>
  );
}
