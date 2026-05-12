import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Copy, Download, Trash2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { startRecognition, type RecognitionHandle } from "@/services/speechToText";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/speech-to-text")({
  head: () => buildToolMeta(toolBySlug("speech-to-text", tools)), => prev + txt);
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
          <ToolSeoContent
        title={"Free Speech to Text — Voice to Text Converter Online"}
        description={"Convert speech to text in real-time for free. Supports Arabic, English, French and Spanish. Uses your microphone directly in the browser. No app needed."}
        body={[
        "Click the microphone button, allow microphone access, and start speaking. Your words appear as text in real-time as you speak. Choose your language from the selector for accurate recognition.",
        "The speech recognition uses the Web Speech API built into modern browsers — no data is sent to Skycally's servers. Note that this feature works best in Google Chrome for the most accurate recognition.",
      ]}
        faqs={[
        { question: "Which browser works best for speech to text?", answer: "Google Chrome provides the best speech recognition accuracy. The feature also works in Edge and Safari, but may have reduced accuracy." },
        { question: "Is my voice data stored anywhere?", answer: "No. The Web Speech API sends audio to your browser provider (Google for Chrome) for processing, but Skycally never receives or stores your audio." },
        { question: "Can I use speech to text for Arabic?", answer: "Yes. Select Arabic from the language dropdown. We support multiple Arabic variants including Modern Standard Arabic and regional dialects." },
        { question: "What is the maximum recording length?", answer: "There is no strict limit. The tool uses continuous recognition mode, so you can speak as long as needed. Click Stop when finished." },
      ]}
      />
      </ToolPageShell>
  );
}
