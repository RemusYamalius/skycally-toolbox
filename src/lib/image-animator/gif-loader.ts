// Shared gif.js loader (identical strategy to tools.video-to-gif.tsx).
// The library is UMD, so it's loaded via a <script> tag and read from window.GIF.
// gif.js spins up its own Worker; browsers refuse a cross-origin Worker URL,
// so we fetch the worker script and wrap it in a same-origin Blob URL.

export interface GifEncoderInstance {
  addFrame: (image: CanvasImageSource, opts?: { delay?: number; copy?: boolean }) => void;
  on: (event: "finished" | "progress", cb: (arg: unknown) => void) => void;
  render: () => void;
}

declare global {
  interface Window {
    GIF: new (opts: Record<string, unknown>) => GifEncoderInstance;
  }
}

let gifJsLoadPromise: Promise<void> | null = null;

export function loadGifJs(): Promise<void> {
  if (typeof window !== "undefined" && window.GIF) return Promise.resolve();
  if (gifJsLoadPromise) return gifJsLoadPromise;

  gifJsLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIF encoder"));
    document.head.appendChild(script);
  });

  return gifJsLoadPromise;
}

let gifWorkerBlobUrlPromise: Promise<string> | null = null;

export function getGifWorkerBlobUrl(): Promise<string> {
  if (gifWorkerBlobUrlPromise) return gifWorkerBlobUrlPromise;

  gifWorkerBlobUrlPromise = fetch("https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch GIF worker script");
      return res.text();
    })
    .then((code) => {
      const blob = new Blob([code], { type: "application/javascript" });
      return URL.createObjectURL(blob);
    });

  return gifWorkerBlobUrlPromise;
}
