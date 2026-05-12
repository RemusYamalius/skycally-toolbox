import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge, ModelLoadingSkeleton, CameraPermissionError } from "@/components/ai-badges";
import { loadScript } from "@/lib/cdnScript";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/background-blur")({
  head: () => ({
    meta: [
      { title: "AI Background Blur — Free Online · Skycally" },
      { name: "description", content: "Blur photo or webcam backgrounds in real time using on-device AI." },
      { property: "og:title", content: "AI Background Blur · Skycally" },
      { property: "og:description", content: "Real-time background blur powered by MediaPipe — runs in your browser." },
    ],
  }),
  component: BackgroundBlurTool,
});

const SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js";

function BackgroundBlurTool() {
  const [ready, setReady] = useState(false);
  const [blur, setBlur] = useState(15);
  const blurRef = useRef(15);
  const segRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => { blurRef.current = blur; }, [blur]);

  useEffect(() => {
    let mounted = true;
    loadScript(SCRIPT)
      .then(() => {
        if (!mounted) return;
        const seg = new window.SelfieSegmentation({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`,
        });
        seg.setOptions({ modelSelection: 1, selfieMode: false });
        segRef.current = seg;
        setReady(true);
      })
      .catch(() => toast.error("Failed to load AI model"));
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      if (v && v.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
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
      segRef.current.onResults((r: any) => composite(canvas, r));
      await segRef.current.send({ image: img });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  // re-run image whenever blur changes
  useEffect(() => {
    if (imageFile && ready) runOnImage(imageFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blur, imageFile, ready]);

  const onUpload = (files: File[]) => {
    if (files[0]) setImageFile(files[0]);
  };

  const downloadResult = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((b) => b && downloadBlob(b, "background-blur.png"), "image/png");
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
    if (v && v.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setCamOn(false);
  };

  return (
    <ToolPageShell title="AI Background Blur" description="Blur photo or webcam backgrounds in real time — your media never leaves your device.">
      {!ready && <ModelLoadingSkeleton label="Loading AI model (MediaPipe Selfie Segmentation)..." />}
      {ready && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 mb-6 flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium">Blur intensity: {blur}px</label>
            <div className="flex-1 min-w-48">
              <Slider min={5} max={30} step={1} value={[blur]} onValueChange={(v) => setBlur(v[0])} />
            </div>
          </div>

          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
              <TabsTrigger value="camera">Live Camera</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6 space-y-4">
              <DropZone accept="image/*" onFiles={onUpload} label="Drop an image" hint="JPG, PNG, WebP" />
              <div className="rounded-2xl border border-border bg-card p-3 overflow-auto">
                <canvas ref={canvasRef} className="max-w-full h-auto mx-auto" />
              </div>
              {imageFile && (
                <button onClick={downloadResult} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5">
                  Download PNG
                </button>
              )}
            </TabsContent>

            <TabsContent value="camera" className="mt-6 space-y-4">
              {camDenied && <CameraPermissionError onRetry={startCamera} />}
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="relative mx-auto aspect-[3/4] sm:aspect-video w-full max-w-3xl">
                  <video ref={videoRef} playsInline muted className="hidden" />
                  <canvas ref={camCanvasRef} className="w-full h-full object-contain rounded-xl bg-black" />
                </div>
              </div>
              <div className="flex gap-2">
                {!camOn ? (
                  <button onClick={startCamera} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5">Start camera</button>
                ) : (
                  <button onClick={stopCamera} className="rounded-lg border border-border font-medium px-5 py-2.5">Stop camera</button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <div>
        <PoweredBy name="MediaPipe Selfie Segmentation" />
        <BrowserOnlyBadge />
      </div>

      {/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}
      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse steps={[
        "Pick Upload Image or Live Camera.",
        "Adjust the blur intensity slider to taste.",
        "Download the result, or just enjoy the live preview.",
      ]} />
          <ToolSeoContent
        title={"AI Background Blur — Blur Photo Background Free Online"}
        description={"Automatically blur image backgrounds using AI. Works with photos or live camera. Adjust blur intensity. Powered by MediaPipe. No signup needed."}
        body={[
        "Upload a photo or enable your camera for real-time background blurring. The AI detects the subject (person) and applies a customizable blur effect to the background — similar to the portrait mode on modern smartphones.",
        "Background blurring uses MediaPipe Selfie Segmentation running in your browser. The AI model processes each frame locally without sending any data to external servers. Adjust the blur intensity from subtle to strong using the slider.",
      ]}
        faqs={[
        { question: "Does background blur work for group photos?", answer: "Yes, the AI can detect multiple people in a photo and keep all of them in focus while blurring the background." },
        { question: "Can I use this for video calls?", answer: "Our tool works with your camera in real-time but cannot integrate directly with video call applications. It works great for creating blurred background images to use as virtual backgrounds." },
        { question: "What blur strength should I use?", answer: "For a natural portrait look, use 10-15px blur. For a strong studio effect, try 20-25px. Maximum blur (30px) creates a heavily defocused background." },
        { question: "Does it work with non-human subjects?", answer: "The model is optimized for human subjects. Results for objects, animals or non-person subjects may vary." },
      ]}
      />
      </ToolPageShell>
  );
}
