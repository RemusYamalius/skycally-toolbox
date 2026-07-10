import type { Effect } from "./effects";
import { loadGifJs, getGifWorkerBlobUrl } from "./gif-loader";

export type Resolution = "480" | "720" | "1080";
export type Easing = "linear" | "ease-in-out";
export type OutputFormat = "mp4" | "gif";

export interface AnimSettings {
  effectId: string;
  duration: 3 | 5 | 8 | 10;
  fps: 24 | 30;
  outputFormat: OutputFormat;
  resolution: Resolution;
  loop: boolean;
  easing: Easing;
}

export interface RenderedOutput {
  blob: Blob;
  mimeType: string;
  extension: "mp4" | "webm" | "gif";
}

export function getOutputDimensions(
  img: HTMLImageElement,
  resolution: Resolution,
): { w: number; h: number } {
  const targetH = parseInt(resolution, 10);
  const ratio = img.naturalWidth / img.naturalHeight;
  let h = targetH;
  let w = Math.round(h * ratio);
  // Video encoders require even dimensions.
  if (w % 2 !== 0) w += 1;
  if (h % 2 !== 0) h += 1;
  return { w, h };
}

function applyEasing(t: number, easing: Easing): number {
  if (easing === "linear") return t;
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function pickVideoMime(): { mime: string; ext: "mp4" | "webm" } {
  if (typeof MediaRecorder === "undefined") return { mime: "video/webm", ext: "webm" };
  if (MediaRecorder.isTypeSupported("video/mp4")) return { mime: "video/mp4", ext: "mp4" };
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return { mime: "video/webm;codecs=vp9", ext: "webm" };
  }
  return { mime: "video/webm", ext: "webm" };
}

function bitrateFor(resolution: Resolution): number {
  if (resolution === "1080") return 8_000_000;
  if (resolution === "720") return 4_000_000;
  return 2_000_000;
}

export function renderVideo(
  img: HTMLImageElement,
  settings: AnimSettings,
  effect: Effect,
  onProgress: (pct: number) => void,
  onPreviewFrame?: (canvas: HTMLCanvasElement) => void,
): Promise<RenderedOutput> {
  return new Promise((resolve, reject) => {
    try {
      const totalFrames = settings.duration * settings.fps;
      const { w, h } = getOutputDimensions(img, settings.resolution);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      const stream = canvas.captureStream(settings.fps);
      const { mime, ext } = pickVideoMime();
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: bitrateFor(settings.resolution),
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error("MediaRecorder error"));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        resolve({ blob, mimeType: mime, extension: ext });
      };
      recorder.start();

      let frame = 0;
      function renderFrame() {
        if (frame >= totalFrames) {
          // Draw one final frame at t=1 to guarantee last frame is captured,
          // then flush after a short delay so the encoder picks it up.
          try {
            recorder.requestData();
          } catch {
            /* not all engines support requestData; ignore */
          }
          setTimeout(() => recorder.stop(), 100);
          return;
        }

        const raw = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
        const t = applyEasing(raw, settings.easing);

        ctx!.clearRect(0, 0, w, h);
        effect.animate(ctx!, img, t, w, h);

        onProgress(Math.round((frame / totalFrames) * 100));
        if (onPreviewFrame) onPreviewFrame(canvas);

        frame++;
        // Yield to the browser between frames so the captureStream ticks.
        setTimeout(renderFrame, 1000 / settings.fps);
      }

      renderFrame();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function renderGif(
  img: HTMLImageElement,
  settings: AnimSettings,
  effect: Effect,
  onProgress: (pct: number) => void,
  onPreviewFrame?: (canvas: HTMLCanvasElement) => void,
): Promise<RenderedOutput> {
  const gifFps = 15;
  const totalFrames = Math.min(settings.duration * gifFps, 150);
  const { w, h } = getOutputDimensions(img, settings.resolution);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));

  return loadGifJs()
    .then(() => getGifWorkerBlobUrl())
    .then(
      (workerUrl) =>
        new Promise<RenderedOutput>((resolve, reject) => {
          const gif = new window.GIF({
            workers: 2,
            quality: 8,
            width: w,
            height: h,
            workerScript: workerUrl,
            repeat: settings.loop ? 0 : -1,
          });

          for (let frame = 0; frame < totalFrames; frame++) {
            const raw = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
            const t = applyEasing(raw, settings.easing);
            ctx.clearRect(0, 0, w, h);
            effect.animate(ctx, img, t, w, h);
            gif.addFrame(canvas, { delay: Math.round(1000 / gifFps), copy: true });
            onProgress(Math.round((frame / totalFrames) * 50));
            if (onPreviewFrame) onPreviewFrame(canvas);
          }

          gif.on("progress", (p) => {
            const pct = typeof p === "number" ? p : 0;
            onProgress(50 + Math.round(pct * 50));
          });
          gif.on("finished", (blob) => {
            const b = blob as Blob;
            resolve({ blob: b, mimeType: "image/gif", extension: "gif" });
          });

          try {
            gif.render();
          } catch (err) {
            reject(err instanceof Error ? err : new Error("GIF render failed"));
          }
        }),
    );
}
