import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, X } from "lucide-react";
import jsQR from "jsqr";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/qr-reader")({
  head: () => buildToolMeta(toolBySlug("qr-reader", tools)),
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
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("Canvas error"));
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(data.data, data.width, data.height);
      URL.revokeObjectURL(url);
      resolve(code ? code.data : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

function QrReaderPage() {
  const [result, setResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setCameraSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
  }, []);

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
      if (!text) {
        toast.error("No QR code found in this image");
        return;
      }
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
    } catch (err: any) {
      const name = err?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast.error("Camera access denied. Please allow camera permission in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not access camera. Try uploading an image instead.");
      }
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  const isUrl = result ? /^https?:\/\//i.test(result.trim()) : false;

  return (
    <ToolPageShell
      title="QR Code Reader"
      description="Decode QR codes from an image or your camera — instantly in your browser."
    >
      <div className="space-y-6">
        {!scanning && <DropZone accept="image/png,image/jpeg,image/gif" onFiles={onFile} hint="PNG, JPG, GIF" />}

        {!scanning ? (
          cameraSupported && (
            <div className="text-center">
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-5 py-2.5 hover:bg-secondary"
              >
                <Camera className="w-4 h-4" /> Scan from Camera
              </button>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            </div>
            <button
              onClick={stopCamera}
              className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2 hover:bg-secondary"
            >
              <X className="w-4 h-4" /> Stop
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">DECODED CONTENT</p>
              <p className="break-all text-sm" dir="auto">
                {result}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copy}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              {isUrl && (
                <a
                  href={result}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 hover:bg-secondary"
                >
                  <ExternalLink className="w-4 h-4" /> Open Link
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADSENSE_ZONE: qr-reader-bottom 728x90 */}
      <AdZone id="qr-reader-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Point your camera at a QR code or upload an image containing one.",
          "The tool decodes the QR code instantly and displays the result.",
          "Copy the decoded text, URL, or data with one click.",
        ]}
      />

      <ToolSeoContent
        title="Free QR Code Reader — Scan & Decode QR Codes Online"
        description="Scan QR codes using your camera or upload an image to decode them instantly. Free, browser-based QR code reader — no app needed, no signup required."
        body={[
          "Skycally's QR Code Reader decodes any QR code instantly — either by scanning through your device's camera in real time or by uploading an image file containing a QR code. Results appear immediately with a copy button for the decoded content. No app download, no account, and no data is sent to any server.",
          "QR codes (Quick Response codes) can contain URLs, plain text, contact information (vCard), WiFi credentials, payment data, calendar events, and more. This reader handles all standard QR code formats and displays the raw decoded content so you can see exactly what information is embedded before clicking any links.",
          "The camera scan mode uses your device's rear camera (or front camera on desktop) and continuously scans for QR codes in the viewfinder. This is ideal for scanning codes in the real world — on products, posters, restaurant menus, or event tickets. The upload mode accepts PNG, JPG, WebP, and other common image formats.",
          "All decoding happens locally in your browser using the jsQR or ZXing library — no image is transmitted to any server. This makes the tool suitable for scanning QR codes on sensitive documents, private messages, or internal business materials without privacy concerns.",
        ]}
        faqs={[
          {
            question: "Can I scan a QR code from my camera?",
            answer:
              "Yes. Click the camera button to activate your device's camera. The tool continuously scans the viewfinder and decodes any QR code it detects in real time.",
          },
          {
            question: "Can I upload an image to decode a QR code?",
            answer:
              "Yes. Click the upload button and select any image file (PNG, JPG, WebP) containing a QR code. The tool decodes it instantly.",
          },
          {
            question: "What types of QR codes are supported?",
            answer:
              "All standard QR code formats are supported, including URLs, plain text, vCard contacts, WiFi credentials, payment data, calendar events, and more.",
          },
          {
            question: "Is my image uploaded to a server?",
            answer: "No. All decoding happens locally in your browser. No image or data is sent to any server.",
          },
          {
            question: "Why can't the tool read my QR code?",
            answer:
              "Common reasons include low image quality, poor lighting, a damaged or partially obscured code, or the code being too small in the image. Try a higher-resolution image or move closer to the code.",
          },
          {
            question: "What do I do with the decoded URL?",
            answer:
              "Copy the URL with the copy button and paste it into your browser. Always verify URLs from unknown QR codes before visiting — malicious QR codes can link to phishing sites.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The camera scan mode works on smartphones and tablets using the rear camera. The upload mode also works on mobile by selecting an image from your photo library.",
          },
          {
            question: "Can I generate a QR code too?",
            answer:
              "Yes — use the QR Code Generator tool to create QR codes for any URL, text, or data. A link is available in the Related Tools section below.",
          },
        ]}
      />

      <RelatedTools currentSlug="qr-reader" />
    </ToolPageShell>
  );
}
