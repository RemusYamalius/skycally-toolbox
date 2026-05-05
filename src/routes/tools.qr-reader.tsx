import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, X } from "lucide-react";
import jsQR from "jsqr";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";

export const Route = createFileRoute("/tools/qr-reader")({
  head: () => ({
    meta: [
      { title: "QR Code Reader — Skycally" },
      { name: "description", content: "Decode QR codes from images or your camera, instantly in your browser." },
      { property: "og:title", content: "QR Code Reader · Skycally" },
      { property: "og:description", content: "Scan QR codes from photos or live camera." },
    ],
  }),
  component: QrReaderPage,
});

function decodeImage(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Canvas error")); }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(data.data, data.width, data.height);
      URL.revokeObjectURL(url);
      resolve(code ? code.data : null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function QrReaderPage() {
  const [result, setResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = () => {
    setScanning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const onFile = async (files: File[]) => {
    try {
      const text = await decodeImage(files[0]);
      if (!text) { toast.error("No QR code found in this image"); return; }
      setResult(text);
      toast.success("QR code decoded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to read image");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(data.data, data.width, data.height);
            if (code) {
              setResult(code.data);
              toast.success("QR code detected");
              stopCamera();
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      toast.error("Could not access camera");
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  const isUrl = result ? /^https?:\/\//i.test(result.trim()) : false;

  return (
    <ToolPageShell title="QR Code Reader" description="Decode QR codes from an image or your camera — instantly in your browser.">
      <div className="space-y-6">
        {!scanning && (
          <DropZone accept="image/png,image/jpeg,image/gif" onFiles={onFile} hint="PNG, JPG, GIF" />
        )}

        {!scanning ? (
          <div className="text-center">
            <button onClick={startCamera} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-5 py-2.5 hover:bg-secondary">
              <Camera className="w-4 h-4" /> Scan from Camera
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            </div>
            <button onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2 hover:bg-secondary">
              <X className="w-4 h-4" /> Stop
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">DECODED CONTENT</p>
              <p className="break-all text-sm" dir="auto">{result}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5">
                <Copy className="w-4 h-4" /> Copy
              </button>
              {isUrl && (
                <a href={result} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 hover:bg-secondary">
                  <ExternalLink className="w-4 h-4" /> Open Link
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADSENSE_ZONE: qr-reader-bottom 728x90 */}
      <AdZone id="qr-reader-bottom" size="728x90" />

      <HowToUse steps={[
        "Upload a QR image or click 'Scan from Camera'.",
        "We decode it instantly in your browser.",
        "Copy the result or open the link if it's a URL.",
      ]} />
    </ToolPageShell>
  );
}
