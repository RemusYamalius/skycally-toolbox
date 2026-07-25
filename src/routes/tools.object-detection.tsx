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
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/object-detection")({
  head: () => buildToolMeta(toolBySlug("object-detection", tools)),
  component: ObjectDetectionTool,
});

const TFJS = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.0.0/dist/tf.min.js";
const COCO = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js";

interface Pred {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

function colorFor(cls: string) {
  let h = 0;
  for (let i = 0; i < cls.length; i++) h = (h * 31 + cls.charCodeAt(i)) % 360;
  return `hsl(${h}, 80%, 55%)`;
}

const EMOJI: Record<string, string> = {
  person: "🧑",
  car: "🚗",
  truck: "🚚",
  bicycle: "🚲",
  motorcycle: "🏍️",
  bus: "🚌",
  dog: "🐶",
  cat: "🐱",
  bird: "🐦",
  "cell phone": "📱",
  laptop: "💻",
  book: "📖",
  chair: "🪑",
  "dining table": "🍽️",
  cup: "🥤",
  bottle: "🍶",
  tv: "📺",
  remote: "🎮",
  keyboard: "⌨️",
  mouse: "🖱️",
};

function ObjectDetectionTool() {
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState<any>(null);
  const [preds, setPreds] = useState<Pred[]>([]);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camDenied, setCamDenied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript(TFJS);
        await loadScript(COCO);
        const m = await window.cocoSsd.load();
        if (!alive) return;
        setModel(m);
        setReady(true);
      } catch {
        toast.error("Failed to load model");
      }
    })();
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      if (v && v.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, []);

  const drawPreds = (
    canvas: HTMLCanvasElement,
    source: CanvasImageSource,
    w: number,
    h: number,
    predictions: Pred[],
  ) => {
    const ctx = canvas.getContext("2d")!;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    ctx.lineWidth = Math.max(2, Math.round(w / 400));
    ctx.font = `${Math.max(14, Math.round(w / 60))}px sans-serif`;
    for (const p of predictions) {
      const [x, y, ww, hh] = p.bbox;
      const c = colorFor(p.class);
      ctx.strokeStyle = c;
      ctx.strokeRect(x, y, ww, hh);
      const label = `${p.class} ${Math.round(p.score * 100)}%`;
      const tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = c;
      ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, Math.max(14, y - 6));
    }
  };

  const runImage = async (file: File) => {
    if (!model) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("bad"));
        i.src = url;
      });
      imgRef.current = img;
      const predictions: Pred[] = await model.detect(img);
      setPreds(predictions);
      drawPreds(canvasRef.current!, img, img.naturalWidth, img.naturalHeight, predictions);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (imgFile && ready) runImage(imgFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgFile, ready]);

  const startCamera = async () => {
    setCamDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setCamOn(true);
      const tick = async () => {
        if (!videoRef.current || !model) return;
        const predictions: Pred[] = await model.detect(videoRef.current);
        setPreds(predictions);
        drawPreds(camCanvasRef.current!, videoRef.current, v.videoWidth, v.videoHeight, predictions);
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

  const uniqueClasses = new Set(preds.map((p) => p.class)).size;

  return (
    <ToolPageShell
      title="Object Detection"
      description="Detect everyday objects in images or live video using COCO-SSD — entirely in your browser."
    >
      {!ready && <ModelLoadingSkeleton label="Loading COCO-SSD model (~5MB)..." />}
      {ready && (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total detections</p>
              <p className="text-2xl font-bold">{preds.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Unique classes</p>
              <p className="text-2xl font-bold">{uniqueClasses}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_280px] gap-5">
            <div>
              <Tabs defaultValue="upload">
                <TabsList>
                  <TabsTrigger value="upload">Upload Image</TabsTrigger>
                  <TabsTrigger value="camera">Live Camera</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-6 space-y-4">
                  <DropZone
                    accept="image/*"
                    onFiles={(f) => f[0] && setImgFile(f[0])}
                    label="Drop an image"
                    hint="JPG, PNG, WebP"
                  />
                  <div className="rounded-2xl border border-border bg-card p-3 overflow-auto">
                    <canvas ref={canvasRef} className="max-w-full h-auto mx-auto" />
                  </div>
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
                      <button
                        onClick={startCamera}
                        className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5"
                      >
                        Start camera
                      </button>
                    ) : (
                      <button onClick={stopCamera} className="rounded-lg border border-border font-medium px-5 py-2.5">
                        Stop camera
                      </button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <aside className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Detections</h3>
              {preds.length === 0 && <p className="text-xs text-muted-foreground">Nothing detected yet.</p>}
              <ul className="space-y-3 max-h-[480px] overflow-auto">
                {preds.map((p, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {EMOJI[p.class] || "🔹"} {p.class}
                      </span>
                      <span className="text-xs text-muted-foreground">{Math.round(p.score * 100)}%</span>
                    </div>
                    <div className="h-1.5 mt-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full" style={{ width: `${p.score * 100}%`, background: colorFor(p.class) }} />
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </>
      )}

      <div>
        <PoweredBy name="TensorFlow.js + COCO-SSD" />
        <BrowserOnlyBadge />
      </div>

      {/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}
      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse
        steps={[
          "Choose Upload Image or Live Camera.",
          "Wait for the model to detect objects.",
          "See bounding boxes and a sidebar list of confidences.",
        ]}
      />
      <ToolSeoContent
        title={"AI Object Detection Online — Real-time Detection Free"}
        description={
          "Detect and identify objects in images or live video using AI. Powered by TensorFlow.js COCO-SSD. Recognizes 80 object categories. Works in your browser."
        }
        body={[
          "Upload an image or enable your camera for real-time object detection. The AI draws bounding boxes around detected objects and labels them with confidence percentages. Detected objects are also listed in a sidebar for easy reference — no signup required to use any of it.",
          "The COCO-SSD model can recognize 80 common object categories including people, vehicles, animals, furniture, food and everyday items. COCO-SSD stands for Common Objects in Context — Single Shot Detector, a widely used real-time object detection architecture trained on Microsoft's COCO dataset of over 200,000 labeled images. The model runs entirely in your browser using TensorFlow.js — no images or video frames are sent to any server.",
          "Object detection differs from simple image classification: instead of just labeling what's in a photo, it locates exactly where each object is with a bounding box, and can detect multiple different objects in the same frame simultaneously. This makes it useful for counting items, building accessibility tools that describe a scene out loud, prototyping computer-vision ideas, or simply exploring what modern AI can recognize in a photo you already have.",
          "Because everything runs client-side via TensorFlow.js and WebAssembly, this tool works entirely offline once the ~25MB model has loaded, and nothing you upload or capture via your camera is ever transmitted anywhere. That makes it suitable for testing with personal or sensitive photos where a cloud-based detection API would be a privacy concern.",
        ]}
        faqs={[
          {
            question: "What objects can the AI detect?",
            answer:
              "The model recognizes 80 object categories from the COCO dataset including person, car, bicycle, dog, cat, chair, bottle, laptop, phone and many more common objects.",
          },
          {
            question: "How accurate is the detection?",
            answer:
              "Accuracy varies by object and image quality. Well-lit, clear images of common objects typically achieve 70-95% confidence. The model works best with objects clearly visible and not overlapping.",
          },
          {
            question: "Does real-time camera detection affect privacy?",
            answer:
              "No. All processing happens locally in your browser using TensorFlow.js. Camera frames are never sent to Skycally's servers.",
          },
          {
            question: "Why does the model take time to load?",
            answer:
              "The COCO-SSD model is approximately 25MB and loads once when you first visit the page. Subsequent uses within the same session are instant.",
          },
          {
            question: "What is COCO-SSD?",
            answer:
              "COCO-SSD (Common Objects in Context — Single Shot Detector) is a real-time object detection model trained on Microsoft's COCO dataset. It's optimized to run efficiently in the browser via TensorFlow.js rather than requiring a server.",
          },
          {
            question: "Can it detect multiple objects at once?",
            answer:
              "Yes. The model detects and draws a separate bounding box for every object it recognizes in the frame, whether that's 1 object or 20, and lists each one with its own confidence score.",
          },
          {
            question: "Does it work on mobile devices?",
            answer:
              "Yes. The tool works on any modern browser, including mobile, though live camera detection performance depends on your device's processing power.",
          },
          {
            question: "Is this free to use?",
            answer:
              "Yes, completely free with no signup and no usage limit — the entire model runs in your browser at no cost to you.",
          },
        ]}
      />
      <RelatedTools currentSlug="object-detection" />
    </ToolPageShell>
  );
}
