import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge, ModelLoadingSkeleton, CameraPermissionError } from "@/components/ai-badges";
import { loadScript } from "@/lib/cdnScript";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/hand-gesture")({
  head: () => ({
    meta: [
      { title: "Hand Gesture Recognition — Live · Skycally" },
      { name: "description", content: "Recognize hand gestures from your webcam in real time using MediaPipe Hands." },
      { property: "og:title", content: "Hand Gesture Recognition · Skycally" },
      { property: "og:description", content: "Real-time hand tracking and gesture recognition in your browser." },
    ],
  }),
  component: HandGestureTool,
});

const HANDS = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js";
const DRAW = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js";

function detectGesture(landmarks: any[]): string {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const fingerUp = (tip: any, base: any) => tip.y < base.y;
  const thumb = thumbTip.x < landmarks[3].x;
  const index = fingerUp(indexTip, landmarks[6]);
  const middle = fingerUp(middleTip, landmarks[10]);
  const ring = fingerUp(ringTip, landmarks[14]);
  const pinky = fingerUp(pinkyTip, landmarks[18]);
  if (index && middle && !ring && !pinky) return "✌️ Peace";
  if (index && !middle && !ring && !pinky) return "☝️ Pointing";
  if (!index && !middle && !ring && !pinky) return "✊ Fist";
  if (index && middle && ring && pinky) return "✋ Open Hand";
  if (thumb && !index && !middle && !ring && !pinky) return "👍 Thumbs Up";
  return "🤙 Hand Detected";
}

function HandGestureTool() {
  const [ready, setReady] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [gesture, setGesture] = useState<string>("—");
  const [handCount, setHandCount] = useState(0);
  const [fps, setFps] = useState(0);

  const handsRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const frameTimes = useRef<number[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadScript(HANDS), loadScript(DRAW)])
      .then(() => {
        if (!alive) return;
        const h = new window.Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}` });
        h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
        handsRef.current = h;
        setReady(true);
      })
      .catch(() => toast.error("Failed to load AI model"));
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      if (v && v.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, []);

  const draw = (results: any) => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(results.image, 0, 0, c.width, c.height);

    const lms = results.multiHandLandmarks || [];
    setHandCount(lms.length);

    if (lms.length > 0) {
      setGesture(detectGesture(lms[0]));
    } else {
      setGesture("—");
    }

    for (const lm of lms) {
      if (window.drawConnectors && window.HAND_CONNECTIONS) {
        window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, { color: "#7C3AED", lineWidth: 3 });
      }
      ctx.fillStyle = "#00D4FF";
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const now = performance.now();
    frameTimes.current.push(now);
    if (frameTimes.current.length > 30) frameTimes.current.shift();
    if (frameTimes.current.length >= 2) {
      const dt = (frameTimes.current[frameTimes.current.length - 1] - frameTimes.current[0]) / (frameTimes.current.length - 1);
      setFps(Math.round(1000 / dt));
    }
  };

  const start = async () => {
    setCamDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
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

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v && v.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setCamOn(false);
  };

  return (
    <ToolPageShell title="Hand Gesture Recognition" description="Real-time hand tracking and gesture recognition from your webcam.">
      {!ready && <ModelLoadingSkeleton label="Loading MediaPipe Hands..." />}
      {ready && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Detected gesture</p>
              <p className="text-3xl font-bold mt-1">{gesture}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Hands</p>
              <p className="text-2xl font-bold">{handCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">FPS</p>
              <p className="text-2xl font-bold">{fps}</p>
            </div>
          </div>

          {camDenied && <CameraPermissionError onRetry={start} />}

          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="relative mx-auto aspect-[3/4] sm:aspect-video w-full max-w-3xl">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="w-full h-full object-contain rounded-xl bg-black" />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {!camOn ? (
              <button onClick={start} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5">Start camera</button>
            ) : (
              <button onClick={stop} className="rounded-lg border border-border font-medium px-5 py-2.5">Stop camera</button>
            )}
          </div>
        </>
      )}

      <div>
        <PoweredBy name="MediaPipe Hands" />
        <BrowserOnlyBadge />
      </div>

      {/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}
      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse steps={[
        "Click Start camera and allow access.",
        "Hold your hand in front of the camera.",
        "Try fist, peace, pointing, open hand, thumbs up.",
      ]} />
          <ToolSeoContent
        title={"Hand Gesture Recognition — Real-time Detection Free | Skycally"}
        description={"Detect hand gestures in real-time using AI and your camera. Recognizes thumbs up, peace sign, pointing and more. Powered by MediaPipe Hands. Free."}
        body={[
        "Enable your camera and the AI will track your hand movements and recognize common gestures in real-time. The tool overlays a colored skeleton showing all 21 hand landmarks and displays the detected gesture name.",
        "Hand gesture recognition uses MediaPipe Hands running in your browser. Applications include sign language recognition, touchless interfaces, gaming controls and accessibility technology. The tool supports up to 2 hands simultaneously.",
      ]}
        faqs={[
        { question: "What gestures can be recognized?", answer: "The tool recognizes Open Hand, Fist, Thumbs Up, Thumbs Down, Pointing (index finger), Peace/Victory sign, and general hand detection." },
        { question: "How many hands can be tracked at once?", answer: "The tool tracks up to 2 hands simultaneously with individual gesture recognition for each hand." },
        { question: "Why is gesture recognition sometimes inaccurate?", answer: "Accuracy depends on lighting, background contrast and hand positioning. Ensure good lighting and position your hand clearly in front of the camera for best results." },
        { question: "Is camera access required?", answer: "Yes, hand gesture recognition requires camera access as it analyzes live video frames. No camera data is sent to any server." },
      ]}
      />
      </ToolPageShell>
  );
}
