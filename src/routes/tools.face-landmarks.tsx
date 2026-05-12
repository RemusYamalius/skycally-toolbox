import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge, ModelLoadingSkeleton, CameraPermissionError } from "@/components/ai-badges";
import { loadScript } from "@/lib/cdnScript";
import { downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/face-landmarks")({
  head: () => buildToolMeta(toolBySlug("face-landmarks", tools)),
  component: FaceLandmarksTool,
});

const FACE_MESH = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js";
const DRAW = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js";

function FaceLandmarksTool() {
  const [ready, setReady] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [camDenied, setCamDenied] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const meshRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);

  const showDotsRef = useRef(true);
  const showMeshRef = useRef(false);
  useEffect(() => { showDotsRef.current = showDots; }, [showDots]);
  useEffect(() => { showMeshRef.current = showMesh; }, [showMesh]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadScript(FACE_MESH), loadScript(DRAW)])
      .then(() => {
        if (!alive) return;
        const m = new window.FaceMesh({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}` });
        m.setOptions({ maxNumFaces: 4, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        meshRef.current = m;
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

  const draw = (canvas: HTMLCanvasElement, results: any) => {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    const faces = results.multiFaceLandmarks || [];
    setFaceCount(faces.length);
    for (const lm of faces) {
      if (showMeshRef.current && window.drawConnectors && window.FACEMESH_TESSELATION) {
        window.drawConnectors(ctx, lm, window.FACEMESH_TESSELATION, { color: "rgba(0,212,255,0.35)", lineWidth: 0.5 });
      }
      if (showDotsRef.current) {
        ctx.fillStyle = "#00D4FF";
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const runImage = async (file: File) => {
    if (!meshRef.current) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("bad"));
        i.src = url;
      });
      const c = canvasRef.current!;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      meshRef.current.onResults((r: any) => draw(c, r));
      await meshRef.current.send({ image: img });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (imgFile && ready) runImage(imgFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgFile, ready, showDots, showMesh]);

  const startCamera = async () => {
    setCamDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      const c = camCanvasRef.current!;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      meshRef.current.onResults((r: any) => draw(c, r));
      setCamOn(true);
      const tick = async () => {
        if (!videoRef.current || !meshRef.current) return;
        await meshRef.current.send({ image: videoRef.current });
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

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((b) => b && downloadBlob(b, "face-landmarks.png"), "image/png");
  };

  return (
    <ToolPageShell title="Face Landmarks" description="Detects 468 facial landmarks per face — works on photos or live camera, all in your browser.">
      {!ready && <ModelLoadingSkeleton label="Loading Face Mesh..." />}
      {ready && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Faces detected</p>
              <p className="text-2xl font-bold">{faceCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Landmarks / face</p>
              <p className="text-2xl font-bold">468</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Fun fact</p>
              <p className="text-sm">Tracks 468 facial landmarks in real time.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 mb-6 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showDots} onChange={(e) => setShowDots(e.target.checked)} /> Show dots</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showMesh} onChange={(e) => setShowMesh(e.target.checked)} /> Show mesh overlay</label>
          </div>

          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
              <TabsTrigger value="camera">Live Camera</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6 space-y-4">
              <DropZone accept="image/*" onFiles={(f) => f[0] && setImgFile(f[0])} label="Drop a photo with faces" hint="JPG, PNG, WebP" />
              <div className="rounded-2xl border border-border bg-card p-3 overflow-auto">
                <canvas ref={canvasRef} className="max-w-full h-auto mx-auto" />
              </div>
              {imgFile && <button onClick={download} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5">Download annotated PNG</button>}
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
        <PoweredBy name="MediaPipe Face Mesh" />
        <BrowserOnlyBadge />
      </div>

      {/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}
      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse steps={[
        "Upload a photo or start your camera.",
        "Toggle dots and mesh overlays as desired.",
        "Download the annotated image (image mode).",
      ]} />
          <ToolSeoContent
        title={"Face Landmark Detection — 468 Points Real-time | Skycally"}
        description={"Detect and visualize 468 facial landmarks in real-time using MediaPipe Face Mesh. Works with photos or live camera. Free, browser-based, no signup."}
        body={[
        "Upload a photo or use your camera to detect detailed facial landmarks in real-time. The AI maps 468 precise points across the face including eyes, eyebrows, nose, lips, jaw and cheekbones.",
        "Face landmark detection is used in augmented reality, facial analysis, emotion recognition and 3D face modeling. Our tool uses MediaPipe Face Mesh running in your browser — no facial data is stored or transmitted.",
      ]}
        faqs={[
        { question: "How many faces can be detected at once?", answer: "The tool can detect and map landmarks on up to 4 faces simultaneously in a single image or camera frame." },
        { question: "Is my facial data stored?", answer: "No. All processing happens locally in your browser. No facial data, images or landmarks are ever sent to Skycally's servers." },
        { question: "What are facial landmarks used for?", answer: "Facial landmarks are used in augmented reality filters, face swap apps, emotion detection, beauty apps, accessibility tools and medical facial analysis." },
        { question: "Can I toggle the landmark display?", answer: "Yes. Use the toggle buttons to show/hide individual landmark dots and the mesh connection lines independently." },
      ]}
      />
      </ToolPageShell>
  );
}
