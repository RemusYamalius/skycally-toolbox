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
      const { toBlobURL } = await import("@ffmpeg/util");
      const inst = new FFmpeg();

      inst.on("progress", ({ progress }) => {
        progressHandler?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
      });

      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";

      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      ]);

      await inst.load({ coreURL, wasmURL });

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
