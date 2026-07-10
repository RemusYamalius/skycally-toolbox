export type EffectId =
  | "ken-burns"
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  | "parallax";

export interface Effect {
  id: EffectId;
  label: string;
  emoji: string;
  description: string;
  /** CSS transform used for the live preview (applied via a 2s ease-in-out transition, alternating). */
  cssPreview: string;
  /** Draw one frame at `progress` (0..1) onto `ctx` sized `w`×`h`. */
  animate: (
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource,
    progress: number,
    w: number,
    h: number,
  ) => void;
}

// Source dimensions helper — CanvasImageSource can be an HTMLImageElement
// or an ImageBitmap; both expose width/height (naturalWidth on HTMLImageElement).
function srcDims(img: CanvasImageSource): { sw: number; sh: number } {
  if (img instanceof HTMLImageElement) return { sw: img.naturalWidth, sh: img.naturalHeight };
  if (img instanceof HTMLCanvasElement) return { sw: img.width, sh: img.height };
  if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) {
    return { sw: img.width, sh: img.height };
  }
  return { sw: (img as unknown as { width: number }).width, sh: (img as unknown as { height: number }).height };
}

export const EFFECTS: Effect[] = [
  {
    id: "ken-burns",
    label: "Ken Burns",
    emoji: "🎬",
    description: "Slow zoom with a gentle pan — the documentary classic",
    cssPreview: "scale(1.15) translate(2%, 1.5%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1 + progress * 0.15;
      const cw = sw / scale;
      const ch = sh / scale;
      const cx = progress * sw * 0.05;
      const cy = progress * sh * 0.03;
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "zoom-in",
    label: "Zoom In",
    emoji: "🔍",
    description: "Slow cinematic zoom toward the center",
    cssPreview: "scale(1.2)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1 + progress * 0.2;
      const cw = sw / scale;
      const ch = sh / scale;
      ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    emoji: "🔭",
    description: "Reveal the full scene by zooming out",
    cssPreview: "scale(0.9)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1.2 - progress * 0.2;
      const cw = sw / scale;
      const ch = sh / scale;
      ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "pan-left",
    label: "Pan Left",
    emoji: "⬅️",
    description: "Camera sweeps from right to left",
    cssPreview: "scale(1.15) translateX(-6%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1.2;
      const cw = sw / scale;
      const ch = sh / scale;
      const maxOffset = sw - cw;
      const cx = maxOffset * (1 - progress);
      ctx.drawImage(img, cx, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "pan-right",
    label: "Pan Right",
    emoji: "➡️",
    description: "Camera sweeps from left to right",
    cssPreview: "scale(1.15) translateX(6%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1.2;
      const cw = sw / scale;
      const ch = sh / scale;
      const maxOffset = sw - cw;
      const cx = maxOffset * progress;
      ctx.drawImage(img, cx, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "pan-up",
    label: "Pan Up",
    emoji: "⬆️",
    description: "Camera tilts upward through the scene",
    cssPreview: "scale(1.15) translateY(-6%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1.2;
      const cw = sw / scale;
      const ch = sh / scale;
      const maxOffset = sh - ch;
      const cy = maxOffset * (1 - progress);
      ctx.drawImage(img, (sw - cw) / 2, cy, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "pan-down",
    label: "Pan Down",
    emoji: "⬇️",
    description: "Camera tilts downward through the scene",
    cssPreview: "scale(1.15) translateY(6%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const scale = 1.2;
      const cw = sw / scale;
      const ch = sh / scale;
      const maxOffset = sh - ch;
      const cy = maxOffset * progress;
      ctx.drawImage(img, (sw - cw) / 2, cy, cw, ch, 0, 0, w, h);
    },
  },
  {
    id: "parallax",
    label: "Parallax",
    emoji: "🌀",
    description: "Subtle depth illusion — mesmerising loop",
    cssPreview: "scale(1.08) translate(1%, 0.5%)",
    animate: (ctx, img, progress, w, h) => {
      const { sw, sh } = srcDims(img);
      const t = Math.sin(progress * Math.PI * 2);
      const scale = 1.08 + t * 0.04;
      const cw = sw / scale;
      const ch = sh / scale;
      const cx = (sw - cw) / 2 + t * sw * 0.02;
      const cy = (sh - ch) / 2 + t * sh * 0.01;
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);
    },
  },
];

export function findEffect(id: EffectId): Effect {
  const e = EFFECTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown effect: ${id}`);
  return e;
}
