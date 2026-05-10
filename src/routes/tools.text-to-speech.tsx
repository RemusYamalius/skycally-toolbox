import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/tools/text-to-speech")({
  head: () => ({
    meta: [
      { title: "Free Text to Speech — Convert Text to Audio Online | Skycally" },
      { name: "description", content: "Convert text to speech for free. 50+ voices in Arabic, English, French and Spanish. Download as MP3. Works entirely in your browser." },
      { property: "og:title", content: "Free Text to Speech | Skycally" },
      { property: "og:description", content: "Free browser-based TTS in multiple languages." },
      { property: "og:url", content: "https://skycally.com/tools/text-to-speech" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/text-to-speech" }],
  }),
  component: Page,
});

const FLAGS: Record<string, string> = { ar: "🇸🇦", en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸" };
const ALLOWED = ["ar", "en", "fr", "es"];
const MAX = 5000;

function Page() {
  const [text, setText] = useState("Hello! Welcome to Skycally text to speech.");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const filtered = all.filter((v) => ALLOWED.some((p) => v.lang.toLowerCase().startsWith(p)));
      setVoices(filtered);
      if (filtered.length && !voiceURI) setVoiceURI(filtered[0].voiceURI);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [voiceURI]);

  const voice = useMemo(() => voices.find((v) => v.voiceURI === voiceURI) || null, [voices, voiceURI]);

  const onPlay = () => {
    if (!text.trim()) return;
    setPlaying(true);
    speak(text, voice, rate, pitch, () => setPlaying(false));
  };
  const onStop = () => { stop(); setPlaying(false); };
  const onDownload = async () => {
    try {
      toast.info("Recording playback... please keep this tab focused.");
      await downloadAudio(text, voice, rate, pitch);
    } catch {
      toast.error("Could not record audio");
    }
  };

  return (
    <ToolPageShell title="Text to Speech" description="Type any text and hear it spoken in your chosen language and voice.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <Textarea value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="Enter text to convert to speech..." dir="auto" className="min-h-[180px] text-base" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{text.length} / {MAX} characters</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">Voice</label>
            <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
              {voices.length === 0 && <option>Loading voices...</option>}
              {voices.map((v) => {
                const flag = FLAGS[v.lang.toLowerCase().slice(0, 2)] || "🌐";
                return <option key={v.voiceURI} value={v.voiceURI}>{flag} {v.name} ({v.lang})</option>;
              })}
            </select>
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
              <button onClick={onPlay} disabled={!text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5 disabled:opacity-50">
                <Play className="w-4 h-4" /> Play
              </button>
            ) : (
              <button onClick={onStop} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-5 py-2.5">
                <Square className="w-4 h-4" /> Stop
              </button>
            )}
            <button onClick={onDownload} disabled={!text.trim()} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-5 py-2.5 hover:bg-secondary disabled:opacity-50">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
      </div>

      {/* ADSENSE_ZONE: tts-bottom 728x90 */}
      <AdZone id="tts-bottom" size="728x90" />

      <HowToUse steps={[
        "Type or paste your text (up to 5000 characters).",
        "Pick a voice, speed, and pitch.",
        "Press Play to listen, or Download to save the audio.",
      ]} />
          <ToolSeoContent
        title={"Free Text to Speech — Convert Text to Audio Online"}
        description={"Convert any text to natural-sounding speech for free. 50+ voices in Arabic, English, French and Spanish. Adjust speed and pitch. Download as audio."}
        body={[
        "Type or paste your text, select a voice from our library of 50+ options across multiple languages, adjust the speaking speed and pitch, then click Play or Download. The tool uses your browser's built-in speech synthesis engine for instant, private conversion.",
        "Arabic voices are fully supported with natural-sounding pronunciation. Select from regional Arabic variants including Moroccan, Egyptian, Saudi and Gulf Arabic dialects depending on your browser's installed voices.",
      ]}
        faqs={[
        { question: "Is text to speech completely free?", answer: "Yes, completely free with no character limits, no signup and no watermarks on downloaded audio." },
        { question: "What languages are supported?", answer: "The available voices depend on your browser and operating system. Common supported languages include English, Arabic, French, Spanish, German, Italian, Portuguese and many more." },
        { question: "Can I download the audio as MP3?", answer: "Yes. Click the Download button to save the generated speech as an audio file to your device." },
        { question: "Why do I hear different voices on different devices?", answer: "The voice library comes from your operating system and browser. Windows, Mac, iOS and Android each have different built-in voices." },
      ]}
      />
      </ToolPageShell>
  );
}
