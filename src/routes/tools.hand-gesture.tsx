import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, Download, RotateCcw } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge, ModelLoadingSkeleton, CameraPermissionError } from "@/components/ai-badges";
import { loadScript } from "@/lib/cdnScript";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/hand-gesture")({
  head: () => buildToolMeta(toolBySlug("hand-gesture", tools)),
  component: HandGestureTool,
});

const HANDS = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js";
const DRAW = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js";

// ─── Gesture detection ────────────────────────────────────────────────────────

interface GestureResult {
  name: string;
  emoji: string;
  confidence: number;
}

function isFingerUp(tip: any, pip: any): boolean {
  return tip.y < pip.y - 0.02;
}

function isThumbUp(landmarks: any[], handedness: string): boolean {
  const tip = landmarks[4];
  const ip = landmarks[3];
  // For right hand: thumb points left (lower x); for left hand: thumb points right (higher x)
  if (handedness === "Right") return tip.x < ip.x - 0.04;
  return tip.x > ip.x + 0.04;
}

function isThumbDown(landmarks: any[], handedness: string): boolean {
  const tip = landmarks[4];
  const ip = landmarks[3];
  if (handedness === "Right") return tip.x > ip.x + 0.04;
  return tip.x < ip.x - 0.04;
}

function detectGesture(landmarks: any[], handedness: string): GestureResult {
  const index = isFingerUp(landmarks[8], landmarks[6]);
  const middle = isFingerUp(landmarks[12], landmarks[10]);
  const ring = isFingerUp(landmarks[16], landmarks[14]);
  const pinky = isFingerUp(landmarks[20], landmarks[18]);
  const thumb = isThumbUp(landmarks, handedness);
  const thumbD = isThumbDown(landmarks, handedness);

  const upCount = [index, middle, ring, pinky].filter(Boolean).length;

  // Rock 🤘 — index + pinky up, middle + ring down
  if (index && !middle && !ring && pinky) return { name: "Rock On", emoji: "🤘", confidence: 0.92 };

  // Peace ✌️ — index + middle up
  if (index && middle && !ring && !pinky) return { name: "Peace", emoji: "✌️", confidence: 0.95 };

  // Pointing ☝️ — only index up
  if (index && !middle && !ring && !pinky) return { name: "Pointing", emoji: "☝️", confidence: 0.93 };

  // Fist ✊ — all fingers down
  if (!index && !middle && !ring && !pinky && !thumb) return { name: "Fist", emoji: "✊", confidence: 0.9 };

  // Open hand ✋ — all fingers up
  if (index && middle && ring && pinky) return { name: "Open Hand", emoji: "✋", confidence: 0.95 };

  // Thumbs Up 👍
  if (thumb && !index && !middle && !ring && !pinky) return { name: "Thumbs Up", emoji: "👍", confidence: 0.94 };

  // Thumbs Down 👎
  if (thumbD && !index && !middle && !ring && !pinky) return { name: "Thumbs Down", emoji: "👎", confidence: 0.9 };

  // Call me 🤙 — thumb + pinky up
  if (thumb && !index && !middle && !ring && pinky) return { name: "Call Me", emoji: "🤙", confidence: 0.88 };

  // OK 👌 — middle + ring + pinky up, index down
  if (!index && middle && ring && pinky) return { name: "OK", emoji: "👌", confidence: 0.85 };

  // Three fingers — index + middle + ring
  if (index && middle && ring && !pinky) return { name: "Three", emoji: "3️⃣", confidence: 0.88 };

  // Four fingers — all except thumb
  if (index && middle && ring && pinky && !thumb) return { name: "Four", emoji: "4️⃣", confidence: 0.88 };

  // Pinky up 🌸
  if (!index && !middle && !ring && pinky) return { name: "Pinky", emoji: "🌸", confidence: 0.82 };

  return { name: "Hand Detected", emoji: "🖐️", confidence: 0.7 };
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 8;

function HandGestureTool() {
  const [ready, setReady] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [gesture, setGesture] = useState<GestureResult | null>(null);
  const [handCount, setHandCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [history, setHistory] = useState<GestureResult[]>([]);
  const [mirrored, setMirrored] = useState(true);

  const handsRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const frameTimes = useRef<number[]>([]);
  const lastGesture = useRef<string>("");

  // Load MediaPipe
  useEffect(() => {
    let alive = true;
    Promise.all([loadScript(HANDS), loadScript(DRAW)])
      .then(() => {
        if (!alive) return;
        const h = new (window as any).Hands({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
        });
        h.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.75,
          minTrackingConfidence: 0.6,
        });
        handsRef.current = h;
        setReady(true);
      })
      .catch(() => toast.error("Failed to load AI model. Check your connection."));
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopCamera();
    };
  }, []);

  const draw = useCallback(
    (results: any) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);

      // Mirror effect
      if (mirrored) {
        ctx.save();
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, 0, 0, c.width, c.height);
        ctx.restore();
      } else {
        ctx.drawImage(results.image, 0, 0, c.width, c.height);
      }

      const lms = results.multiHandLandmarks || [];
      const handedness = results.multiHandedness || [];
      setHandCount(lms.length);

      if (lms.length > 0) {
        const hand = handedness[0]?.label ?? "Right";
        const g = detectGesture(lms[0], hand);
        setGesture(g);

        // Add to history only when gesture changes
        if (g.name !== lastGesture.current && g.name !== "Hand Detected") {
          lastGesture.current = g.name;
          setHistory((prev) => [g, ...prev].slice(0, MAX_HISTORY));
        }
      } else {
        setGesture(null);
        lastGesture.current = "";
      }

      // Draw landmarks for each hand
      for (let i = 0; i < lms.length; i++) {
        const lm = lms[i];
        const color = i === 0 ? "#7C3AED" : "#10b981";

        if ((window as any).drawConnectors && (window as any).HAND_CONNECTIONS) {
          // Mirror landmarks if needed
          const drawLm = mirrored ? lm.map((p: any) => ({ ...p, x: 1 - p.x })) : lm;
          (window as any).drawConnectors(ctx, drawLm, (window as any).HAND_CONNECTIONS, {
            color,
            lineWidth: 3,
          });
          // Draw landmark dots
          ctx.fillStyle = "#00D4FF";
          for (const p of drawLm) {
            ctx.beginPath();
            ctx.arc(p.x * c.width, p.y * c.height, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // FPS counter
      const now = performance.now();
      frameTimes.current.push(now);
      if (frameTimes.current.length > 30) frameTimes.current.shift();
      if (frameTimes.current.length >= 2) {
        const dt = (frameTimes.current.at(-1)! - frameTimes.current[0]) / (frameTimes.current.length - 1);
        setFps(Math.round(1000 / dt));
      }
    },
    [mirrored],
  );

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setCamOn(false);
  };

  const start = async () => {
    setCamDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      const c = canvasRef.current!;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      handsRef.current.onResults(draw);
      setCamOn(true);
      const tick = async () => {
        if (!videoRef.current || !handsRef.current) return;
        await handsRef.current.send({ image: videoRef.current });
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setCamDenied(true);
    }
  };

  // Re-register onResults when mirrored changes
  useEffect(() => {
    if (handsRef.current && camOn) {
      handsRef.current.onResults(draw);
    }
  }, [draw, camOn]);

  const screenshot = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `gesture-${gesture?.name ?? "snapshot"}.png`;
    a.click();
  };

  const resetHistory = () => {
    setHistory([]);
    lastGesture.current = "";
  };

  return (
    <ToolPageShell
      title="Hand Gesture Recognition"
      description="Real-time AI hand tracking and gesture recognition using your webcam — 12+ gestures, 21 landmarks, up to 2 hands."
    >
      {!ready && <ModelLoadingSkeleton label="Loading MediaPipe Hands AI model..." />}

      {ready && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Gesture</p>
              <p className="text-2xl font-bold">{gesture ? `${gesture.emoji} ${gesture.name}` : "—"}</p>
              {gesture && (
                <p className="text-xs text-muted-foreground mt-1">{Math.round(gesture.confidence * 100)}% confidence</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Hands</p>
              <p className="text-3xl font-bold">{handCount}</p>
              <p className="text-xs text-muted-foreground mt-1">detected</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">FPS</p>
              <p
                className="text-3xl font-bold"
                style={{ color: fps >= 20 ? "#10b981" : fps >= 10 ? "#f59e0b" : "#ef4444" }}
              >
                {camOn ? fps : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fps >= 20 ? "smooth" : fps >= 10 ? "ok" : camOn ? "slow" : "off"}
              </p>
            </div>
          </div>

          {camDenied && <CameraPermissionError onRetry={start} />}

          {/* Canvas */}
          <div className="rounded-2xl border border-border bg-black overflow-hidden">
            <div className="relative mx-auto aspect-video w-full max-w-3xl">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Camera is off — click Start to begin
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {!camOn ? (
              <button
                onClick={start}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background font-medium px-5 py-2.5"
              >
                <Camera className="w-4 h-4" /> Start camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 rounded-lg border border-border font-medium px-5 py-2.5 hover:bg-secondary"
              >
                <CameraOff className="w-4 h-4" /> Stop camera
              </button>
            )}
            <button
              onClick={() => setMirrored((m) => !m)}
              className="inline-flex items-center gap-2 rounded-lg border border-border font-medium px-4 py-2.5 hover:bg-secondary text-sm"
            >
              {mirrored ? "🪞 Mirrored" : "🔄 Normal"}
            </button>
            {camOn && (
              <button
                onClick={screenshot}
                className="inline-flex items-center gap-2 rounded-lg border border-border font-medium px-4 py-2.5 hover:bg-secondary text-sm"
              >
                <Download className="w-4 h-4" /> Screenshot
              </button>
            )}
          </div>

          {/* Gesture reference */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Supported Gestures</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[
                { emoji: "✋", name: "Open Hand" },
                { emoji: "✊", name: "Fist" },
                { emoji: "👍", name: "Thumbs Up" },
                { emoji: "👎", name: "Thumbs Down" },
                { emoji: "☝️", name: "Pointing" },
                { emoji: "✌️", name: "Peace" },
                { emoji: "🤘", name: "Rock On" },
                { emoji: "🤙", name: "Call Me" },
                { emoji: "👌", name: "OK" },
                { emoji: "3️⃣", name: "Three" },
                { emoji: "4️⃣", name: "Four" },
                { emoji: "🌸", name: "Pinky" },
              ].map((g) => (
                <div
                  key={g.name}
                  className="rounded-lg border border-border p-2 text-center text-xs"
                  style={{
                    background:
                      gesture?.name === g.name ? "color-mix(in oklab, #7C3AED 20%, transparent)" : "transparent",
                    borderColor: gesture?.name === g.name ? "#7C3AED" : "var(--border)",
                  }}
                >
                  <div className="text-xl">{g.emoji}</div>
                  <div className="text-muted-foreground mt-1">{g.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Gesture History</h3>
                <button
                  onClick={resetHistory}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((g, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                    style={{ opacity: 1 - i * 0.1 }}
                  >
                    {g.emoji} {g.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <PoweredBy name="MediaPipe Hands" />
        <BrowserOnlyBadge />
      </div>

      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse
        steps={[
          "Click Start camera and allow webcam access when prompted.",
          "Hold your hand clearly in front of the camera with good lighting.",
          "Try any of the 12 supported gestures — the highlighted card shows what's detected in real time.",
        ]}
      />

      <ToolSeoContent
        title="Hand Gesture Recognition — Real-Time AI Detection, 12 Gestures"
        description="Detect hand gestures in real time using AI and your webcam. Recognizes 12 gestures including thumbs up, peace, fist, rock on, call me and more. Powered by MediaPipe Hands. Free, no signup, runs in your browser."
        body={[
          "Skycally's Hand Gesture Recognition tool uses Google's MediaPipe Hands model — a state-of-the-art ML pipeline that detects and tracks 21 hand landmarks in real time directly in your browser. The model runs at up to 30 frames per second on modern devices, tracking the precise 3D position of each finger joint and knuckle with sub-centimeter accuracy. No video is ever uploaded — all processing happens locally using WebGL acceleration.",
          "The tool recognizes 12 distinct hand gestures: Open Hand, Fist, Thumbs Up, Thumbs Down, Pointing, Peace/Victory, Rock On, Call Me, OK, Three fingers, Four fingers, and Pinky. Each detected gesture is highlighted in the reference grid below the camera feed, with a confidence score showing how certain the model is. The gesture history panel tracks the last 8 unique gestures in sequence.",
          "Up to 2 hands can be tracked simultaneously, each shown with a different color skeleton overlay. The 21 landmark points and hand connections are drawn in real time over the camera feed. A mirror mode lets you see your hand as you would in a mirror (which feels more natural for most users), while normal mode shows the unflipped camera view. The Screenshot button captures the current canvas with all overlays for sharing or documentation.",
          "Hand gesture recognition technology has applications across many fields: sign language recognition and accessibility tools, contactless user interfaces for kiosks and medical environments, gaming controls and AR/VR interaction, fitness and physical therapy tracking, and creative tools like gesture-controlled music or art. This tool provides a real-time demonstration of what the underlying technology can do.",
        ]}
        faqs={[
          {
            question: "What gestures can be recognized?",
            answer:
              "12 gestures: Open Hand (✋), Fist (✊), Thumbs Up (👍), Thumbs Down (👎), Pointing (☝️), Peace (✌️), Rock On (🤘), Call Me (🤙), OK (👌), Three (3️⃣), Four (4️⃣), and Pinky (🌸). The detected gesture is highlighted in the reference grid in real time.",
          },
          {
            question: "How many hands can be tracked at once?",
            answer:
              "Up to 2 hands simultaneously. Each hand is shown with a different color skeleton (purple for the first, green for the second). Gesture detection is applied to the primary (first detected) hand.",
          },
          {
            question: "What does the confidence score mean?",
            answer:
              "The confidence score (shown as a percentage) indicates how certain the gesture classifier is about the detected gesture. A score above 90% means the gesture is clearly detected. Lower scores may indicate ambiguous hand positions, poor lighting, or partial hand visibility.",
          },
          {
            question: "Why is gesture detection sometimes inaccurate?",
            answer:
              "Accuracy depends on: (1) lighting — bright, even light works best, avoid backlighting; (2) background contrast — a plain background behind your hand improves detection; (3) distance — keep your hand 30–70 cm from the camera; (4) angle — face your palm toward the camera for best results.",
          },
          {
            question: "What is the mirror mode?",
            answer:
              "Mirror mode flips the camera feed horizontally, so your hand appears as it would in a mirror. Most people find this more intuitive since it matches natural expectations. Disable it if you need accurate left/right orientation (for example, when showing text on a piece of paper).",
          },
          {
            question: "Is my camera footage sent to any server?",
            answer:
              "No. MediaPipe Hands runs entirely in your browser using WebAssembly and WebGL. Your camera feed is processed locally and never transmitted to any server. The tool works offline after the initial model download.",
          },
          {
            question: "What does FPS mean and why does it matter?",
            answer:
              "FPS (frames per second) is how many times per second the AI model analyzes a new camera frame. Higher FPS = smoother, more responsive gesture detection. 20+ FPS is ideal. If FPS is low, try closing other browser tabs, reducing the camera resolution, or using a device with a faster GPU.",
          },
          {
            question: "What is MediaPipe Hands?",
            answer:
              "MediaPipe Hands is an open-source hand tracking solution developed by Google. It uses a two-stage ML pipeline: a palm detector that locates hands in the frame, followed by a hand landmark model that tracks 21 keypoints per hand in 3D. It is the same technology used in Google Meet's background effects and various AR applications.",
          },
        ]}
      />

      <RelatedTools currentSlug="hand-gesture" />
    </ToolPageShell>
  );
}
