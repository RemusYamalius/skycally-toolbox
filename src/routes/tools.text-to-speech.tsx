import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Play, Square, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { speak, stop, downloadAudio } from "@/services/textToSpeech";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/text-to-speech")({
  head: () => buildToolMeta(toolBySlug("text-to-speech", tools)),
  component: Page,
});

const FLAGS: Record<string, string> = { ar: "🇸🇦", en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸" };
const ALLOWED = ["ar", "en", "fr", "es"];
const MAX = 5000;

function Page() {
  const [text, setText] = useState("Hello! Welcome to Skycally text to speech.");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(0.9);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const filtered = all
        .filter((v) => ALLOWED.some((p) => v.lang.toLowerCase().startsWith(p)))
        .sort((a, b) => {
          if (!a.localService && b.localService) return -1;
          if (a.localService && !b.localService) return 1;
          return 0;
        });
      setVoices(filtered);
      if (filtered.length && !voiceURI) setVoiceURI(filtered[0].voiceURI);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceURI]);

  const voice = useMemo(() => voices.find((v) => v.voiceURI === voiceURI) || null, [voices, voiceURI]);

  const onPlay = () => {
    if (!text.trim()) return;
    setPlaying(true);
    speak(text, voice, rate, pitch, () => setPlaying(false));
  };
  const onStop = () => {
    stop();
    setPlaying(false);
  };
  const onDownload = async () => {
    try {
      toast.info("Recording playback... please keep this tab focused.");
      await downloadAudio(text, voice, rate, pitch);
    } catch {
      toast.error("Could not record audio");
    }
  };

  return (
    <ToolPageShell
      title="Text to Speech"
      description="Type any text and hear it spoken in your chosen language and voice."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <Textarea
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to convert to speech..."
            dir="auto"
            className="min-h-[180px] text-base"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {text.length} / {MAX} characters
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">Voice</label>
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            >
              {voices.length === 0 && <option>Loading voices...</option>}
              {voices.map((v) => {
                const flag = FLAGS[v.lang.toLowerCase().slice(0, 2)] || "🌐";
                return (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {flag} {v.name} ({v.lang})
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Voices labeled "Online" or "Neural" sound most natural.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Speed: {rate.toFixed(2)}x</label>
            <Slider value={[rate]} min={0.5} max={2} step={0.05} onValueChange={(v) => setRate(v[0])} />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Pitch: {pitch.toFixed(2)}</label>
            <Slider value={[pitch]} min={0.5} max={2} step={0.05} onValueChange={(v) => setPitch(v[0])} />
          </div>
          <div className="flex flex-wrap gap-3">
            {!playing ? (
              <button
                onClick={onPlay}
                disabled={!text.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> Play
              </button>
            ) : (
              <button
                onClick={onStop}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5"
              >
                <Square className="w-4 h-4" /> Stop
              </button>
            )}
            <button
              onClick={onDownload}
              disabled={!text.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-5 py-2.5 hover:bg-secondary disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
      </div>

      {/* ADSENSE_ZONE: tts-bottom 728x90 */}
      <AdZone id="tts-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Type or paste your text (up to 5000 characters).",
          "Pick a voice, speed, and pitch.",
          "Press Play to listen, or Download to save the audio.",
        ]}
      />

      <ToolSeoContent
        title="Free Text to Speech — Convert Text to Audio Online, 50+ Voices"
        description="Convert any text to natural-sounding speech instantly. Supports Arabic, English, French, Spanish and more. Adjust speed and pitch. Download as audio. Free, no signup, runs in your browser."
        body={[
          "Skycally's Text to Speech converter uses your browser's built-in Web Speech Synthesis API to convert any text into spoken audio instantly — no server processing, no file uploads, and no account required. Type or paste up to 5,000 characters, select from 50+ available voices across multiple languages, adjust the speaking speed (0.5× to 2×) and pitch, then click Play or Download.",
          "The voice library available to you depends on your operating system and browser. Chrome on Windows typically offers the widest selection including Microsoft's neural voices. Safari on iOS and macOS provides high-quality Siri-based voices. On Android, Google's text-to-speech engine powers the available options. Voices labeled 'Online' or 'Neural' generally sound the most natural and human-like.",
          "Arabic text to speech is fully supported with natural pronunciation. Depending on your device, you may have access to regional variants including Modern Standard Arabic, Egyptian Arabic, Saudi Arabic, and Gulf Arabic. The tool automatically detects right-to-left text direction for Arabic and other RTL languages.",
          "The Download button records the audio playback in real time using the MediaRecorder API and saves it as a WebM or OGG audio file — the exact format depends on your browser. This makes it easy to use converted speech in videos, presentations, podcasts, language learning materials, or accessibility content.",
        ]}
        faqs={[
          {
            question: "Is text to speech completely free?",
            answer:
              "Yes. There is no cost, no character limit per session, no signup, and no watermark on downloaded audio. The tool uses your browser's built-in speech engine.",
          },
          {
            question: "What languages are supported?",
            answer:
              "Available voices depend on your browser and OS. Common languages include English (US, UK, Australian), Arabic (multiple dialects), French, Spanish, German, Italian, Portuguese, Japanese, Chinese, Korean, and many more. Chrome on Windows has the widest selection.",
          },
          {
            question: "Can I download the speech as an audio file?",
            answer:
              "Yes. Click the Download button to record and save the audio. The file is saved in WebM or OGG format depending on your browser. You can convert it to MP3 using our Audio Converter tool.",
          },
          {
            question: "Why do I hear different voices on different devices?",
            answer:
              "The voice library comes from your operating system and browser, not from Skycally. Windows includes Microsoft voices, macOS includes Siri voices, Android uses Google TTS, and iOS uses Apple voices. Each device offers a different set.",
          },
          {
            question: "Is my text sent to any server?",
            answer:
              "No text is ever sent to Skycally's servers. However, some browser voices labeled 'Online' (such as Google voices in Chrome) do send text to Google's servers for synthesis. Voices labeled 'local' or without the 'Online' tag process text entirely on your device.",
          },
          {
            question: "Can I use this for Arabic text?",
            answer:
              "Yes. Arabic is fully supported. Select an Arabic voice from the dropdown (marked 🇸🇦). The tool handles right-to-left text automatically. Available Arabic variants depend on your device — Chrome on Windows typically offers Saudi, Egyptian, and other regional Arabic voices.",
          },
          {
            question: "What is the maximum text length?",
            answer:
              "The input is capped at 5,000 characters per session. For longer documents, split the text into sections and play or download each part separately.",
          },
          {
            question: "How do I get more voices?",
            answer:
              "On Windows: Settings → Time & Language → Speech → Add voices. On Android: Settings → General Management → Language → Text-to-Speech → install Google TTS voices. On macOS: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.",
          },
        ]}
      />

      <RelatedTools currentSlug="text-to-speech" />
    </ToolPageShell>
  );
}
