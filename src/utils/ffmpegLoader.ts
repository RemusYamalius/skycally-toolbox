import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressHandler: ((p: number) => void) | null = null;

export const FFMPEG_FIRST_USE_KEY = "ffmpeg-warmed";

// ─── Single-threaded core (no SharedArrayBuffer / no COOP-COEP required) ────
// Uses @ffmpeg/core (NOT @ffmpeg/core-mt) served from jsDelivr.
// jsDelivr is more reliable than unpkg for large WASM files.
const CORE_VERSION = "0.12.6";
const BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

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

      // Fetch core JS and WASM in parallel with a 30s timeout each
      const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout loading ${label} after ${ms}ms`)), ms),
          ),
        ]);

      const [coreURL, wasmURL] = await Promise.all([
        withTimeout(toBlobURL(`${BASE}/ffmpeg-core.js`, "text/javascript"), 30_000, "ffmpeg-core.js"),
        withTimeout(toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm"), 30_000, "ffmpeg-core.wasm"),
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
      // Reset so the user can retry
      loadPromise = null;
      const msg = err instanceof Error ? err.message : "Failed to load video converter";
      throw new Error(`Could not load the video converter. Please check your connection and try again.\n${msg}`);
    }
  })();

  return loadPromise;
}

// ─── Warm up in background after page idle ───────────────────────────────────
export function preloadFFmpeg(): void {
  if (ffmpegInstance || loadPromise) return;
  if (typeof window === "undefined") return;

  const warm = () =>
    getFFmpeg().catch(() => {
      // Silent — user gets proper error on click
    });

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm);
  } else {
    setTimeout(warm, 3000);
  }
}
