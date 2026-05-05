import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Copy, Download, Trash2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { startRecognition, type RecognitionHandle } from "@/services/speechToText";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/speech-to-text")({
  head: () => ({
    meta: [
      { title: "Speech to Text — Skycally" },
      { name: "description", content: "Free real-time speech-to-text transcription in Arabic, English, French, and Spanish." },
      { property: "og:title", content: "Speech to Text · Skycally" },
      { property: "og:description", content: "Transcribe your voice instantly in your browser." },
    ],
  }),
  component: Page,
});

const LANGS = [
  { code: "ar-MA", label: "Arabic (Morocco)" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { code: "ar-EG", label: "Arabic (Egypt)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "fr-FR", label: "French" },
  { code: "es-ES", label: "Spanish" },
];

function Page() {
  const [lang, setLang] = useState("en-US");
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const handleRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => () => handleRef.current?.stop(), []);

  const start = () => {
    setRecording(true);
    setInterim("");
    handleRef.current = startRecognition(lang, (txt, isFinal) => {
      if (isFinal) {
        setFinalText((prev) => prev + txt);
        setInterim("");
      } else {
        setInterim(txt);
      }
    }, (err) => {
      toast.error(err);
      setRecording(false);
    });
  };
  const stop = () => {
    handleRef.current?.stop();
    setRecording(false);
    setInterim("");
  };

  const fullText = (finalText + interim).trim();
  const wordCount = fullText ? fullText.split(/\s+/).length : 0;

  const copy = async () => {
    if (!fullText) return;
    await navigator.clipboard.writeText(fullText);
    toast.success("Copied!");
  };
  const download = () => {
    if (!fullText) return;
    downloadBlob(new Blob([fullText], { type: "text/plain;charset=utf-8" }), "transcript.txt");
  };
  const clear = () => { setFinalText(""); setInterim(""); };

  return (
    <ToolPageShell title="Speech to Text" description="Click the mic and speak. Your words appear instantly — no upload, no signup.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4">
          <div className="relative">
            {recording && <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />}
            <button
              onClick={recording ? stop : start}
              className="relative w-24 h-24 rounded-full inline-flex items-center justify-center font-semibold text-white transition shadow-lg"
              style={{ background: recording ? "rgb(239,68,68)" : "var(--cyan-brand)" }}
              aria-label={recording ? "Stop" : "Start"}
            >
              {recording ? <Square className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {recording ? "Listening..." : "Click the microphone to start recording"}
          </p>
          <div className="w-full max-w-xs">
            <label className="text-xs font-semibold mb-1 block text-muted-foreground">Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={recording} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="relative">
            <Textarea
              value={finalText + (interim ? interim : "")}
              onChange={(e) => setFinalText(e.target.value)}
              placeholder="Your transcript will appear here..."
              dir="auto"
              className="min-h-[200px] text-base"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{wordCount} words</span>
            <div className="flex gap-2">
              <button onClick={copy} disabled={!fullText} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"><Copy className="w-3.5 h-3.5" /> Copy</button>
              <button onClick={download} disabled={!fullText} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"><Download className="w-3.5 h-3.5" /> .txt</button>
              <button onClick={clear} disabled={!fullText} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">Works best in Google Chrome.</p>
      </div>

      {/* ADSENSE_ZONE: stt-bottom 728x90 */}
      <AdZone id="stt-bottom" size="728x90" />

      <HowToUse steps={[
        "Choose your spoken language.",
        "Click the microphone and start speaking.",
        "Copy or download your transcript when done.",
      ]} />
    </ToolPageShell>
  );
}
