import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Captions, Download, Loader2, Plus, X } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/file-utils";
import { FFmpegBanner, PoweredByNote } from "@/components/ffmpeg-banner";

export const Route = createFileRoute("/tools/add-subtitles")({
  head: () => ({
    meta: [
      { title: "Add Subtitles to Video — Skycally" },
      { name: "description", content: "Burn subtitles into any video — entirely in your browser, no uploads." },
      { property: "og:title", content: "Add Subtitles · Skycally" },
      { property: "og:description", content: "Free browser-based subtitle burner powered by FFmpeg WebAssembly." },
    ],
  }),
  component: Page,
});

interface Sub { id: string; start: string; end: string; text: string; }

const toSRT = (subs: Sub[]) =>
  subs.map((s, i) => `${i + 1}\n${s.start} --> ${s.end}\n${s.text}\n`).join("\n");

const COLOR_MAP: Record<string, string> = {
  white: "FFFFFF",
  yellow: "00FFFF", // BGR for ASS
  cyan: "FFFF00",
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
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      setStatus("Loading processor...");
      const { fetchFile } = await import("@ffmpeg/util");
      const { getFFmpeg } = await import("@/utils/ffmpegLoader");
      const ffmpeg = await getFFmpeg(setProgress);

      const ext = videoFile.name.split(".").pop() || "mp4";
      await ffmpeg.writeFile(`input.${ext}`, await fetchFile(videoFile));

      let srtContent: string;
      if (mode === "upload" && srtFile) {
        srtContent = await srtFile.text();
      } else {
        srtContent = toSRT(subs);
      }
      await ffmpeg.writeFile("subs.srt", new TextEncoder().encode(srtContent));

      setStatus("Burning subtitles...");
      const style = `FontSize=${fontSize},PrimaryColour=&H00${COLOR_MAP[color]}&,Outline=2`;
      await ffmpeg.exec([
        "-i", `input.${ext}`,
        "-vf", `subtitles=subs.srt:force_style='${style}'`,
        "-c:a", "copy",
        "output.mp4",
      ]);

      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const buf = new Uint8Array(data);
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: "video/mp4" });
      setResult({ url: URL.createObjectURL(blob), blob });
      toast.success("Subtitles burned!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to burn subtitles");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <ToolPageShell title="Add Subtitles to Video" description="Burn subtitles into any video — works entirely in your browser.">
      <FFmpegBanner />

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
    </ToolPageShell>
  );
}
