import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressHandler: ((p: number) => void) | null = null;

export const FFMPEG_FIRST_USE_KEY = "ffmpeg-warmed";

export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  progressHandler = onProgress ?? null;

  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const inst = new FFmpeg();

      inst.on("progress", ({ progress }) => {
        progressHandler?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
      });

      // Files served from same origin — no CORS, no CDN, Worker adds COOP/COEP
      await inst.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });

      ffmpegInstance = inst;
      try {
        localStorage.setItem(FFMPEG_FIRST_USE_KEY, "1");
      } catch {
        /* ignore */
      }
      return inst;
    } catch (err) {
      loadPromise = null;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Could not load the video converter. Please try again.\n${msg}`);
    }
  })();

  return loadPromise;
}

export function preloadFFmpeg(): void {
  if (ffmpegInstance || loadPromise || typeof window === "undefined") return;
  const warm = () => getFFmpeg().catch(() => {});
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm);
  } else {
    setTimeout(warm, 3000);
  }
}
