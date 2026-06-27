import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, SlidersHorizontal, Camera, ImageIcon, Sparkles, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { loadScript } from "@/lib/cdnScript";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/background-blur")({
  head: () => buildToolMeta(toolBySlug("background-blur", tools)),
  component: BackgroundBlurTool,
});

const SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js";

const BLUR_PRESETS = [
  { label: "Subtle", value: 8 },
  { label: "Portrait", value: 15 },
  { label: "Studio", value: 22 },
  { label: "Maximum", value: 30 },
];

function BackgroundBlurTool() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blur, setBlur] = useState(15);
  const blurRef = useRef(15);
  const segRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    blurRef.current = blur;
  }, [blur]);

  useEffect(() => {
    let mounted = true;
    loadScript(SCRIPT)
      .then(() => {
        if (!mounted) return;
        const seg = new (window as any).SelfieSegmentation({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`,
        });
        seg.setOptions({ modelSelection: 1, selfieMode: false });
        segRef.current = seg;
        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load AI model");
        setLoading(false);
      });
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, []);

  const composite = (canvas: HTMLCanvasElement, results: any) => {
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-over";
    ctx.filter = `blur(${blurRef.current}px)`;
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    ctx.restore();
  };

  const runOnImage = async (file: File) => {
    if (!segRef.current) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("bad image"));
        i.src = url;
      });
      const canvas = canvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      segRef.current.onResults((r: any) => {
        composite(canvas, r);
        setHasResult(true);
      });
      await segRef.current.send({ image: img });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (imageFile && ready) runOnImage(imageFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blur, imageFile, ready]);

  const onUpload = (files: File[]) => {
    if (files[0]) {
      setImageFile(files[0]);
      setHasResult(false);
    }
  };

  const downloadResult = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((b) => b && downloadBlob(b, "background-blur.png"), "image/png");
    toast.success("Image downloaded!");
  };

  const startCamera = async () => {
    setCamDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      const canvas = camCanvasRef.current!;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      segRef.current.onResults((r: any) => composite(canvas, r));
      setCamOn(true);
      const tick = async () => {
        if (!videoRef.current || !segRef.current) return;
        await segRef.current.send({ image: videoRef.current });
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setCamDenied(true);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setCamOn(false);
  };

  return (
    <ToolPageShell
      title="AI Background Blur"
      description="Blur photo or webcam backgrounds instantly using AI. Portrait mode for any image — runs entirely in your browser."
      showFileDisclaimer={false}
    >
      {/* Privacy + AI badge */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
          Powered by MediaPipe AI — runs in your browser
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
          100% private — your images never leave your device
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-sm">Loading AI model…</p>
            <p className="text-xs text-muted-foreground mt-1">MediaPipe Selfie Segmentation (~2MB, one-time)</p>
          </div>
        </div>
      )}

      {ready && (
        <>
          {/* Blur controls */}
          <div className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Blur Intensity</span>
              <span className="ml-auto text-sm font-mono" style={{ color: "var(--cyan-brand)" }}>
                {blur}px
              </span>
            </div>
            <Slider min={5} max={30} step={1} value={[blur]} onValueChange={(v) => setBlur(v[0])} />
            <div className="grid grid-cols-4 gap-2">
              {BLUR_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setBlur(p.value)}
                  className={`py-1.5 text-xs rounded-lg border transition-all font-medium ${
                    blur === p.value
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="upload">
                <ImageIcon className="w-4 h-4 mr-1.5" aria-hidden="true" /> Photo
              </TabsTrigger>
              <TabsTrigger value="camera">
                <Camera className="w-4 h-4 mr-1.5" aria-hidden="true" /> Live Camera
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6 space-y-4">
              {!imageFile ? (
                <DropZone
                  accept="image/*"
                  onFiles={onUpload}
                  label="Drop an image here"
                  hint="JPG, PNG, WebP — stays on your device"
                />
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[200px]">{imageFile.name}</p>
                      <p className="text-xs text-muted-foreground">Processing with AI…</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setHasResult(false);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              <AnimatePresence>
                {imageFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border bg-black/20 p-3 overflow-auto"
                  >
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto mx-auto rounded-xl"
                      aria-label="Blurred background result"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {hasResult && (
                <button
                  onClick={downloadResult}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" aria-hidden="true" /> Download PNG
                </button>
              )}
            </TabsContent>

            <TabsContent value="camera" className="mt-6 space-y-4">
              {camDenied && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                  Camera access denied. Please allow camera permission in your browser settings and try again.
                  <button onClick={startCamera} className="ml-3 underline hover:no-underline">
                    Try again
                  </button>
                </div>
              )}
              <div className="rounded-2xl border border-border bg-black/20 p-3">
                <div className="relative mx-auto aspect-video w-full max-w-3xl">
                  <video ref={videoRef} playsInline muted className="hidden" aria-hidden="true" />
                  <canvas
                    ref={camCanvasRef}
                    className="w-full h-full object-contain rounded-xl bg-black"
                    aria-label="Live camera with background blur"
                  />
                  {!camOn && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                      <p className="text-sm text-white/60">Camera preview will appear here</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                {!camOn ? (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02]"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" /> Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-colors"
                  >
                    Stop Camera
                  </button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AdZone id="background-blur-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload a photo or switch to Live Camera mode. The AI model loads automatically — no setup needed.",
          "Adjust the blur intensity from Subtle to Maximum, or choose a preset. The result updates in real time.",
          "Download the blurred image as a PNG. For live camera, the blur applies instantly to your webcam feed.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Background Blur — Blur Photo Backgrounds Online Instantly"
        description="Blur photo or webcam backgrounds instantly using AI. Portrait mode for any image — 4 blur presets, real-time camera preview. 100% private, runs in your browser. No signup."
        body={[
          "Skycally's AI Background Blur uses MediaPipe Selfie Segmentation to automatically detect the person in your photo or webcam feed and apply a smooth blur to everything behind them. The result looks like portrait mode on a high-end smartphone — without needing one. Upload any JPG, PNG, or WebP image and the blurred version appears in seconds.",
          "Four blur presets cover every use case: Subtle (8px) for a gentle depth-of-field effect, Portrait (15px) for the classic smartphone bokeh look, Studio (22px) for a professional photography feel, and Maximum (30px) for heavily defocused backgrounds. A slider lets you fine-tune to any value between 5 and 30 pixels.",
          "Live Camera mode applies background blur to your webcam feed in real time — ideal for testing how you'll look in a video call or creating content with a blurred background without a green screen. The camera starts and stops with a single click and requires only browser camera permission — no extension or software needed.",
          "Everything runs locally in your browser using WebAssembly and the MediaPipe AI model. Your photos and camera feed never leave your device and are never uploaded to any server. This makes the tool completely safe for personal photos, professional headshots, confidential meeting backgrounds, and any image you would not want stored on a third-party service.",
        ]}
        faqs={[
          {
            question: "Does this work for group photos with multiple people?",
            answer:
              "Yes. The AI detects all people in the frame and keeps them in focus while blurring the background behind all of them.",
          },
          {
            question: "Can I use this for video call backgrounds?",
            answer:
              "Yes — use Live Camera mode to preview your blurred background in real time. Note that this tool cannot directly integrate with Zoom or Teams as a virtual camera; use it to create a blurred background image to upload as a virtual background.",
          },
          {
            question: "What blur strength should I use?",
            answer:
              "For a natural portrait look, use the Portrait preset (15px). For a strong studio effect, try Studio (22px). Subtle (8px) works well for product photos and headshots where a gentle blur is preferred.",
          },
          {
            question: "Does it work with non-human subjects?",
            answer:
              "The model is optimized for human subjects. For objects, pets, or scenes without people, results may be less accurate.",
          },
          {
            question: "Is my photo uploaded to a server?",
            answer:
              "No. Everything runs locally in your browser using WebAssembly. Your images and camera feed never leave your device.",
          },
          {
            question: "What image formats are supported?",
            answer:
              "JPG, PNG, and WebP are all supported. The output is always saved as a high-quality PNG to preserve transparency and avoid compression artifacts.",
          },
          {
            question: "How long does the AI model take to load?",
            answer:
              "The MediaPipe model loads once when you first open the tool — typically 2–4 seconds depending on your internet speed. Subsequent uses in the same session are instant.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. Upload mode works on all mobile browsers. Live Camera mode works on mobile browsers that support getUserMedia — most modern iOS and Android browsers do.",
          },
        ]}
      />

      <RelatedTools currentSlug="background-blur" />
    </ToolPageShell>
  );
}
