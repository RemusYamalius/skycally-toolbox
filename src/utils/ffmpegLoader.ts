import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressHandler: ((p: number) => void) | null = null;

export const FFMPEG_FIRST_USE_KEY = "ffmpeg-warmed";

// ─── CDN sources tried in order ──────────────────────────────────────────────
// unpkg is unreliable for large WASM files (CORS timeouts, rate limits).
// jsdelivr is the primary; unpkg is kept as last-resort fallback.
const CDN_BASES = [
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tryLoad(inst: FFmpeg, baseURL: string): Promise<void> {
  const { toBlobURL } = await import("@ffmpeg/util");

  // Fetch both files in parallel — fail fast if either times out
  const TIMEOUT_MS = 20_000;

  const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`CDN timeout after ${ms}ms`)), ms)),
    ]);

  const [coreURL, wasmURL] = await Promise.all([
    withTimeout(toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"), TIMEOUT_MS),
    withTimeout(toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"), TIMEOUT_MS),
  ]);

  await inst.load({ coreURL, wasmURL });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  progressHandler = onProgress ?? null;

  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const inst = new FFmpeg();

    inst.on("progress", ({ progress }) => {
      progressHandler?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
    });

    // Try each CDN in order; move to next on any error
    let lastError: unknown;
    for (const base of CDN_BASES) {
      try {
        await tryLoad(inst, base);
        ffmpegInstance = inst;

        try {
          localStorage.setItem(FFMPEG_FIRST_USE_KEY, "1");
        } catch {
          /* ignore storage errors */
        }

        return inst;
      } catch (err) {
        console.warn(`[ffmpegLoader] Failed to load from ${base}:`, err);
        lastError = err;
      }
    }

    // All CDNs failed — reset so the next call retries from scratch
    loadPromise = null;

    throw new Error(
      "Could not load the video converter. Please check your internet connection and try again.\n" +
        (lastError instanceof Error ? lastError.message : String(lastError)),
    );
  })();

  return loadPromise;
}

// ─── Optional: preload in the background after page idle ─────────────────────
// Call this once from the tool page to warm up the WASM before the user clicks.
export function preloadFFmpeg(): void {
  if (ffmpegInstance || loadPromise) return;
  if (typeof window === "undefined") return;

  const warm = () => {
    getFFmpeg().catch(() => {
      // Preload failure is silent — the user will get a proper error on click
    });
  };

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(warm);
  } else {
    setTimeout(warm, 3000);
  }
}
