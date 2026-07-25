import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
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
import { RelatedTools } from "@/components/related-tools";

// SEO NOTE: Search Console shows demand for "best free speech to text" (44
// impressions, position ~68 — page 7). The title below leads with "Free"
// and "Speech to Text" together rather than relying on the generic template.
export const Route = createFileRoute("/tools/speech-to-text")({
  head: () => {
    const tool = toolBySlug("speech-to-text", tools);
    const title = "Free Speech to Text Online — Best Real-Time Voice Transcription | Skycally";
    const description =
      "The best free speech to text tool online. Real-time voice transcription, multiple languages, no signup, 100% private — runs in your browser.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Speech to Text",
            alternateName: ["Voice to Text", "Speech Transcription", "Voice Transcription"],
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: tool.featureList ?? [],
          }),
        },
      ],
    };
  },
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
    handleRef.current = startRecognition(
      lang,
      (txt, isFinal) => {
        if (isFinal) {
          setFinalText((prev) => prev + txt);
          setInterim("");
        } else {
          setInterim(txt);
        }
      },
      (err) => {
        toast.error(err);
        setRecording(false);
      },
    );
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
  const clear = () => {
    setFinalText("");
    setInterim("");
  };

  return (
    <ToolPageShell
      title="Speech to Text"
      description="Click the mic and speak. Your words appear instantly — no upload, no signup."
    >
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
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              disabled={recording}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
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
              <button
                onClick={copy}
                disabled={!fullText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={download}
                disabled={!fullText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> .txt
              </button>
              <button
                onClick={clear}
                disabled={!fullText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">Works best in Google Chrome.</p>
      </div>

      {/* ADSENSE_ZONE: stt-bottom 728x90 */}
      <AdZone id="stt-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose your spoken language.",
          "Click the microphone and start speaking.",
          "Copy or download your transcript when done.",
        ]}
      />

      <ToolSeoContent
        title="Free Speech to Text — Voice to Text Converter Online, Real-Time"
        description="Convert speech to text in real-time for free. Supports Arabic, English, French, Spanish and more. Uses your microphone directly in the browser. No app, no signup needed."
        body={[
          "Skycally's Speech to Text tool converts your spoken words into written text in real time, directly in your browser. Click the microphone button, grant microphone access, and start speaking — your words appear on screen as you talk. The tool uses the Web Speech API built into modern browsers, which means no audio files are uploaded to Skycally's servers at any point.",
          "Accuracy depends heavily on the browser you use. Google Chrome delivers the best speech recognition results because it uses Google's cloud-based recognition engine. Microsoft Edge also performs well. Safari on macOS and iOS supports the API but may have lower accuracy on some accents and languages. Firefox does not currently support the Web Speech API.",
          "Arabic speech recognition is supported for multiple regional variants including Modern Standard Arabic (ar-SA), Egyptian Arabic, and Moroccan Arabic. Select the appropriate Arabic dialect from the language dropdown for best results. The recognized text is displayed with correct right-to-left alignment.",
          "The full transcript can be copied to your clipboard with one click or downloaded as a plain text (.txt) file. This makes Speech to Text useful for transcribing voice memos, dictating notes hands-free, creating captions for videos, or converting meeting recordings into written summaries.",
        ]}
        faqs={[
          {
            question: "Which browser works best?",
            answer:
              "Google Chrome provides the best accuracy because it uses Google's cloud speech recognition engine. Microsoft Edge also works well. Safari supports the feature but with lower accuracy on some languages. Firefox does not support the Web Speech API and is not compatible with this tool.",
          },
          {
            question: "Is my voice uploaded to Skycally's servers?",
            answer:
              "No audio is ever sent to Skycally. However, when using Chrome or Edge, your audio is sent to Google's or Microsoft's speech recognition servers respectively for processing. Choose a browser with on-device recognition if you require full privacy.",
          },
          {
            question: "Can I use this for Arabic speech recognition?",
            answer:
              "Yes. Select Arabic (ar-SA, ar-EG, ar-MA, etc.) from the language dropdown. Arabic recognition works best in Chrome. Modern Standard Arabic typically has higher accuracy than regional dialects.",
          },
          {
            question: "Is there a time limit on recording?",
            answer:
              "No strict limit. The tool uses continuous recognition mode, so you can speak for as long as needed. Some browsers may pause recognition after a few minutes of silence — simply click the microphone again to resume.",
          },
          {
            question: "Can I edit the recognized text?",
            answer:
              "Yes. The transcript appears in a text area that you can edit directly before copying or downloading. This lets you correct any recognition errors manually.",
          },
          {
            question: "What languages are supported?",
            answer:
              "The available languages depend on your browser. Chrome typically supports 50+ languages including English, Arabic, French, Spanish, German, Italian, Portuguese, Japanese, Chinese, Korean, Turkish, and many more. Select your language from the dropdown before speaking.",
          },
          {
            question: "How accurate is the recognition?",
            answer:
              "Accuracy varies by language, accent, microphone quality, and background noise. In quiet conditions with a decent microphone, Chrome achieves 90%+ accuracy for clear English speech. Accuracy is lower for heavily accented speech, technical jargon, or noisy environments.",
          },
          {
            question: "Can I download the transcript?",
            answer:
              "Yes. Click the Download button to save the full transcript as a .txt file to your device. You can also click Copy to copy the text to your clipboard.",
          },
        ]}
      />

      <RelatedTools currentSlug="speech-to-text" />
    </ToolPageShell>
  );
}
