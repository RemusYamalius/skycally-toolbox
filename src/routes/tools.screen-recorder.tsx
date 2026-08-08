import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Monitor,
  Camera,
  Square,
  Download,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  FlipHorizontal,
} from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/screen-recorder")({
  head: () => buildToolMeta(toolBySlug("screen-recorder", tools)),
  component: ScreenRecorderPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isMobileDevice = () => typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const formatTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const getBestMimeType = (): string => {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2", // H.264+AAC — best VLC/player compat
    "video/mp4",
    "video/webm;codecs=vp8,opus", // VP8 — VLC 2.x+
    "video/webm;codecs=vp8",
    "video/webm;codecs=vp9,opus", // VP9 — VLC 3.x+
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
};

const getFileExtension = (mime: string) => {
  if (mime.startsWith("video/mp4")) return "mp4";
  return "webm";
};

type RecState = "idle" | "recording" | "paused" | "stopped";

// ─── Screen Recorder (desktop) ────────────────────────────────────────────────
function ScreenRecorderDesktop() {
  const [state, setState] = useState<RecState>("idle");
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [mimeUsed, setMimeUsed] = useState("");
  const [audioMode, setAudioMode] = useState<"none" | "system" | "mic" | "both">("both");
  const [quality, setQuality] = useState<"720" | "1080">("1080");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const start = async () => {
    try {
      // ── Screen stream (with or without system audio) ──
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, height: parseInt(quality) as any },
        audio: audioMode === "system" || audioMode === "both",
      });

      // ── Microphone stream (if needed) ──
      let micStream: MediaStream | null = null;
      if (audioMode === "mic" || audioMode === "both") {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          toast.error("Microphone access denied — recording without mic.");
        }
      }

      // ── Merge tracks ──
      const tracks: MediaStreamTrack[] = [
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
        ...(micStream ? micStream.getAudioTracks() : []),
      ];
      const stream = new MediaStream(tracks);

      chunksRef.current = [];
      const mime = getBestMimeType();
      setMimeUsed(mime);
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        displayStream.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setState("stopped");
        clearTimer();
      };
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.start(500);
      recorderRef.current = recorder;
      setState("recording");
      setDuration(0);
      setVideoUrl("");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast.error("Could not start recording. Make sure your browser supports screen capture.");
      }
    }
  };

  const pause = () => {
    if (!recorderRef.current) return;
    if (recorderRef.current.state === "recording") {
      recorderRef.current.pause();
      clearTimer();
      setState("paused");
    } else if (recorderRef.current.state === "paused") {
      recorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      setState("recording");
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const download = () => {
    if (!videoUrl) return;
    const ext = getFileExtension(mimeUsed);
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `screen-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${ext}`;
    a.click();
  };

  const reset = () => {
    setVideoUrl("");
    setState("idle");
    setDuration(0);
    setMimeUsed("");
  };

  useEffect(() => () => clearTimer(), []);

  const ext = getFileExtension(mimeUsed);

  return (
    <div className="space-y-4">
      {/* Options row — only shown when idle */}
      {state === "idle" && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recording Options</p>
          <div className="space-y-3">
            {/* Audio mode */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Audio Source</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: "none", icon: "🔇", label: "No Audio", desc: "Silent recording" },
                    { id: "system", icon: "🖥️", label: "System Audio", desc: "Computer sounds only" },
                    { id: "mic", icon: "🎙️", label: "Microphone", desc: "Your voice only" },
                    { id: "both", icon: "🎙️+🖥️", label: "Mic + System", desc: "Best for tutorials" },
                  ] as const
                ).map(({ id, icon, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setAudioMode(id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition ${
                      audioMode === id
                        ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="font-semibold leading-tight text-center">{label}</span>
                    <span className="text-[9px] opacity-60 leading-tight text-center">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Quality</p>
              <div className="flex gap-2">
                {(["720", "1080"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-4 py-2 rounded-xl border text-sm transition ${
                      quality === q
                        ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {q}p
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* What to record — guide */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">What can you record?</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🖥️", label: "Entire Screen", desc: "Everything visible on your monitor" },
                { icon: "🪟", label: "App Window", desc: "One specific application window" },
                { icon: "🗂️", label: "Browser Tab", desc: "A single tab — great for web demos" },
              ].map((opt) => (
                <div key={opt.label} className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
                  <p className="text-xl mb-1">{opt.icon}</p>
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 After clicking Start, your browser will ask you to choose one of the above. Select it and click{" "}
              <strong>Share</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Main recorder card */}
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5">
        {/* Status icon */}
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 transition-all ${
            state === "recording"
              ? "border-red-500 bg-red-500/10 animate-pulse"
              : state === "paused"
                ? "border-amber-400 bg-amber-400/10"
                : state === "stopped"
                  ? "border-green-500 bg-green-500/10"
                  : "border-border bg-secondary/30"
          }`}
        >
          {state === "recording" ? (
            <Square className="w-6 h-6 text-red-400" />
          ) : state === "paused" ? (
            <Monitor className="w-8 h-8 text-amber-400" />
          ) : state === "stopped" ? (
            <Download className="w-7 h-7 text-green-400" />
          ) : (
            <Monitor className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Status text */}
        <div>
          <p className="text-lg font-semibold">
            {state === "idle" && "Ready to Record"}
            {state === "recording" && "Recording..."}
            {state === "paused" && "Paused"}
            {state === "stopped" && "Recording Complete"}
          </p>
          {(state === "recording" || state === "paused") && (
            <p
              className={`font-mono text-2xl font-bold mt-1 ${state === "paused" ? "text-amber-400" : "text-red-400"}`}
            >
              {formatTime(duration)}
            </p>
          )}
          {state === "idle" && (
            <p className="text-sm text-muted-foreground mt-1">Screen + audio · Runs in browser · No upload</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {state === "idle" && (
            <button
              onClick={start}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
            >
              🔴 Start Recording
            </button>
          )}
          {(state === "recording" || state === "paused") && (
            <div className="flex gap-2">
              <button
                onClick={pause}
                className={`flex-1 py-3 rounded-xl border font-semibold transition ${
                  state === "paused"
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-amber-400/40 bg-amber-400/10 text-amber-400"
                }`}
              >
                {state === "paused" ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                onClick={stop}
                className="flex-1 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition"
              >
                ⏹ Stop
              </button>
            </div>
          )}
          {state === "stopped" && (
            <div className="space-y-2">
              <button
                onClick={download}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Recording (.{ext})
              </button>
              {ext === "webm" && (
                <p className="text-xs text-muted-foreground text-center">
                  💡 WebM plays natively in Chrome, Firefox, Edge, and VLC. If a specific app you use doesn't support
                  it, you may need a separate converter to get an MP4 version.
                </p>
              )}
              <button
                onClick={reset}
                className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Record Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {videoUrl && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
          <video ref={videoRef} src={videoUrl} controls className="w-full rounded-xl max-h-72 bg-black" />
          <p className="text-xs text-muted-foreground text-center">Duration: {formatTime(duration)}</p>
        </div>
      )}

      {/* Feature badges */}
      {state === "idle" && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🖥️", label: "Full Screen", desc: "or any window / tab" },
            { icon: "🎙️", label: "With Audio", desc: "system + mic (optional)" },
            { icon: "🔒", label: "100% Private", desc: "no upload, local only" },
          ].map((b) => (
            <div key={b.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-2xl mb-1">{b.icon}</p>
              <p className="text-xs font-medium">{b.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{b.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Camera Recorder (mobile) ────────────────────────────────────────────────
function CameraRecorderMobile() {
  const [state, setState] = useState<RecState>("idle");
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [mimeUsed, setMimeUsed] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [withAudio, setWithAudio] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startPreview = async (facing: "user" | "environment") => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: withAudio,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play();
      }
    } catch {
      toast.error("Could not access camera. Please grant camera permissions.");
    }
  };

  useEffect(() => {
    startPreview(facingMode);
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line

  const flip = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (state !== "recording") await startPreview(next);
  };

  const start = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = getBestMimeType();
    setMimeUsed(mime);
    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      setState("stopped");
      clearTimer();
    };
    recorder.start(500);
    recorderRef.current = recorder;
    setState("recording");
    setDuration(0);
    setVideoUrl("");
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const download = () => {
    if (!videoUrl) return;
    const ext = getFileExtension(mimeUsed);
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `camera-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${ext}`;
    a.click();
  };

  const reset = () => {
    setVideoUrl("");
    setState("idle");
    setDuration(0);
    setMimeUsed("");
    startPreview(facingMode);
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        📱 Screen recording is not available in mobile browsers. You can record using your{" "}
        <strong>device camera</strong> below, or use your device's built-in screen recorder from the control center /
        quick settings.
      </div>

      {/* Camera preview */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-[9/16] max-h-[65vh] w-full">
        <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover" />

        {/* Recording badge */}
        {state === "recording" && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono font-bold">{formatTime(duration)}</span>
          </div>
        )}

        {/* Flip button */}
        {state !== "recording" && (
          <button
            onClick={flip}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Audio toggle */}
        <button
          onClick={() => setWithAudio((v) => !v)}
          disabled={state === "recording"}
          className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition disabled:opacity-40"
        >
          {withAudio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Record / Stop button */}
        {state !== "stopped" ? (
          <button
            onClick={state === "recording" ? stop : start}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
              state === "recording" ? "border-red-500 bg-red-500/20" : "border-red-400 bg-red-500"
            }`}
          >
            {state === "recording" ? (
              <Square className="w-8 h-8 text-red-400" fill="currentColor" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-white" />
            )}
          </button>
        ) : (
          <button aria-label="Flip camera"
            onClick={reset}
            className="w-20 h-20 rounded-full border-4 border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className="w-7 h-7" />
          </button>
        )}

        {/* Camera icon placeholder (balance) */}
        <div className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground">
          <Video className="w-5 h-5" />
        </div>
      </div>

      {/* Download */}
      {videoUrl && (
        <div className="space-y-3">
          <video src={videoUrl} controls className="w-full rounded-2xl border border-border bg-black max-h-64" />
          <button
            onClick={download}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Video
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function ScreenRecorderPage() {
  const [isMobile] = useState(() => isMobileDevice());

  return (
    <ToolPageShell
      title="Screen Recorder"
      description="Record your screen (desktop) or camera (mobile) directly in the browser — no install, no upload."
    >
      {/* Tab switcher on desktop to also access camera recorder */}
      {!isMobile && (
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="w-4 h-4" />
          <span>Desktop — screen recording enabled</span>
        </div>
      )}

      {isMobile ? <CameraRecorderMobile /> : <ScreenRecorderDesktop />}

      <AdZone id="screen-recorder-mid" size="728x90" />

      <HowToUse
        steps={
          isMobile
            ? [
                "Grant camera permission when prompted — tap Allow.",
                "Tap the red button to start recording. Tap again to stop.",
                "Use the flip button to switch between front and rear camera.",
                "When done, preview your video and download it to your device.",
              ]
            : [
                "Choose your options — turn audio on or off, pick 720p or 1080p quality.",
                "Click Start Recording. Your browser will ask which screen, window or tab to share — choose one and click Share.",
                "Use Pause / Resume to control the recording. Click Stop when finished.",
                "Preview the result and download it as a .webm file — a modern, widely-supported video format that plays natively in Chrome, Firefox, Edge and VLC.",
              ]
        }
      />

      <ToolSeoContent
        title="Free Screen Recorder — Record Screen or Camera Online, No Install"
        description="Record your screen (desktop) or camera (mobile) directly in your browser — no software to install, no account needed, no upload. Everything stays on your device. Free and unlimited."
        body={[
          "Skycally's Screen Recorder lets you capture your screen directly in the browser using the native MediaRecorder and getDisplayMedia APIs — no browser extension, no desktop application, and no account required. On desktop, you can record your entire screen, a specific application window, or a single browser tab, with or without audio. On mobile, the tool switches automatically to a camera recorder, letting you record using your front or rear camera. All processing happens locally: your recording never leaves your device.",
          "Screen recording is useful across dozens of workflows: software developers record bug reports to share with teammates; educators and content creators record tutorials and walkthroughs; remote workers capture meeting highlights; gamers record gameplay sessions. The desktop recorder supports up to 1080p at 30 frames per second, includes system audio and microphone capture, and supports pause/resume so you can skip unwanted sections without editing. Recordings download as WebM files — the open-source video format natively supported by Chrome, Firefox and Edge.",
          "WebM is a modern, efficient video format that produces smaller files than MP4 at comparable quality. It plays natively in all Chromium-based browsers and Firefox. If you need to trim, compress, or extract a still frame from your recording afterward, our Video Trimmer and Video Compressor tools accept WebM files directly and run entirely in your browser too.",
          "Because there's no upload step, recordings of any length are limited only by your device's available memory and storage — useful for longer tutorials or meeting captures where a cloud-based recorder might cut you off or require a paid tier past a few minutes.",
        ]}
        faqs={[
          {
            question: "Does screen recording work on mobile phones?",
            answer:
              "Screen recording via the browser is not supported on mobile — this is a restriction of all mobile browsers (Chrome, Safari, Firefox) enforced by Android and iOS for security reasons. On mobile, Skycally automatically switches to a camera recorder, letting you record using your device camera. For screen recording on mobile, use your device's built-in screen recorder (available in Control Center on iPhone, or Quick Settings on Android).",
          },
          {
            question: "Is my recording uploaded to a server?",
            answer:
              "No. Everything is processed locally in your browser using the native MediaRecorder API. Your recording never leaves your device and is never transmitted over the internet. You can disconnect from the internet after the page loads and the recorder will still work.",
          },
          {
            question: "What format are recordings saved in?",
            answer:
              "Recordings are saved as .webm files. WebM is a modern open-source video format supported natively by Chrome, Firefox, Edge and VLC. Most modern video editors and social platforms accept WebM directly; if a specific app you use doesn't, you may need a separate converter to get an MP4 version.",
          },
          {
            question: "Can I record audio along with the screen?",
            answer:
              "Yes. Toggle Audio On before starting to capture both system audio and microphone input simultaneously. Toggle Audio Off to record the screen silently — useful for tutorial recordings where you plan to add voiceover in a video editor.",
          },
          {
            question: "Can I record just one browser tab instead of the whole screen?",
            answer:
              "Yes. When your browser shows the screen-sharing dialog after clicking Start, select the 'Tab' option to record only the current browser tab. You can also choose a specific application window instead of the entire screen.",
          },
          {
            question: "Is there a time limit for recordings?",
            answer:
              "There is no enforced time limit. However, very long recordings (over 30 minutes) accumulate in your browser's memory before being saved. For long sessions, consider stopping and downloading every 30 minutes to avoid potential memory issues.",
          },
          {
            question: "Can I pause the recording?",
            answer:
              "Yes. Use the Pause button to pause mid-recording and Resume to continue. The timer pauses too, so the displayed duration reflects actual recorded time, not elapsed wall-clock time.",
          },
          {
            question: "Which browsers support screen recording?",
            answer:
              "Screen recording works in Chrome 72+, Edge 79+, and Opera 60+. Firefox supports it from version 66 but may show a different sharing dialog. Safari on macOS does not support getDisplayMedia and will not work. All modern mobile browsers (Chrome Android, Safari iOS) do not support screen capture — this is a system-level restriction.",
          },
        ]}
      />

      <RelatedTools currentSlug="screen-recorder" />
    </ToolPageShell>
  );
}
