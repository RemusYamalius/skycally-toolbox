import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Shuffle, X as XIcon, Plus, Trash2, Upload } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/color-picker")({
  head: () => buildToolMeta(toolBySlug("color-picker", tools)),
  component: ColorPickerPage,
});

/* ---------------- Color math ---------------- */

type RGB = { r: number; g: number; b: number };
type HSL = { h: number; s: number; l: number };
type HSB = { h: number; s: number; v: number };
type CMYK = { c: number; m: number; y: number; k: number };

const clamp = (n: number, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, n));

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R:
        h = (G - B) / d + (G < B ? 6 : 0);
        break;
      case G:
        h = (B - R) / d + 2;
        break;
      case B:
        h = (R - G) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const S = s / 100,
    L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = L - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function rgbToHsb({ r, g, b }: RGB): HSB {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case R:
        h = (G - B) / d + (G < B ? 6 : 0);
        break;
      case G:
        h = (B - R) / d + 2;
        break;
      case B:
        h = (R - G) / d + 4;
        break;
    }
    h *= 60;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  return { h, s, v: max * 100 };
}

function hsbToRgb({ h, s, v }: HSB): RGB {
  const S = s / 100,
    V = v / 100;
  const c = V * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = V - c;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const k = 1 - Math.max(R, G, B);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: ((1 - R - k) / (1 - k)) * 100,
    m: ((1 - G - k) / (1 - k)) * 100,
    y: ((1 - B - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function getContrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

type HarmonyMode = "complementary" | "analogous" | "triadic" | "split" | "tetradic";

function getHarmonyColors(hex: string, mode: HarmonyMode): string[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  const shift = (deg: number) => rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + deg + 360) % 360 }));
  switch (mode) {
    case "complementary":
      return [hex, shift(180)];
    case "analogous":
      return [shift(-30), hex, shift(30)];
    case "triadic":
      return [hex, shift(120), shift(240)];
    case "split":
      return [hex, shift(150), shift(210)];
    case "tetradic":
      return [hex, shift(90), shift(180), shift(270)];
  }
}

function getShades(hex: string): string[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  return [0.8, 0.6, 0.4, 0.25, 0.12].map((f) => rgbToHex(hslToRgb({ ...hsl, l: hsl.l * f })));
}

function getTints(hex: string): string[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  return [0.2, 0.4, 0.6, 0.8].map((f) => rgbToHex(hslToRgb({ ...hsl, l: hsl.l + (100 - hsl.l) * f })));
}

function getRandomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.random() * 30;
  const l = 40 + Math.random() * 20;
  return rgbToHex(hslToRgb({ h, s, l }));
}

/* Tailwind v3 palette (slate → rose, 50-950). Hardcoded for offline lookup. */
const TAILWIND_COLORS: Record<string, Record<string, string>> = {
  slate: {
    "50": "#f8fafc",
    "100": "#f1f5f9",
    "200": "#e2e8f0",
    "300": "#cbd5e1",
    "400": "#94a3b8",
    "500": "#64748b",
    "600": "#475569",
    "700": "#334155",
    "800": "#1e293b",
    "900": "#0f172a",
    "950": "#020617",
  },
  gray: {
    "50": "#f9fafb",
    "100": "#f3f4f6",
    "200": "#e5e7eb",
    "300": "#d1d5db",
    "400": "#9ca3af",
    "500": "#6b7280",
    "600": "#4b5563",
    "700": "#374151",
    "800": "#1f2937",
    "900": "#111827",
    "950": "#030712",
  },
  zinc: {
    "50": "#fafafa",
    "100": "#f4f4f5",
    "200": "#e4e4e7",
    "300": "#d4d4d8",
    "400": "#a1a1aa",
    "500": "#71717a",
    "600": "#52525b",
    "700": "#3f3f46",
    "800": "#27272a",
    "900": "#18181b",
    "950": "#09090b",
  },
  neutral: {
    "50": "#fafafa",
    "100": "#f5f5f5",
    "200": "#e5e5e5",
    "300": "#d4d4d4",
    "400": "#a3a3a3",
    "500": "#737373",
    "600": "#525252",
    "700": "#404040",
    "800": "#262626",
    "900": "#171717",
    "950": "#0a0a0a",
  },
  stone: {
    "50": "#fafaf9",
    "100": "#f5f5f4",
    "200": "#e7e5e4",
    "300": "#d6d3d1",
    "400": "#a8a29e",
    "500": "#78716c",
    "600": "#57534e",
    "700": "#44403c",
    "800": "#292524",
    "900": "#1c1917",
    "950": "#0c0a09",
  },
  red: {
    "50": "#fef2f2",
    "100": "#fee2e2",
    "200": "#fecaca",
    "300": "#fca5a5",
    "400": "#f87171",
    "500": "#ef4444",
    "600": "#dc2626",
    "700": "#b91c1c",
    "800": "#991b1b",
    "900": "#7f1d1d",
    "950": "#450a0a",
  },
  orange: {
    "50": "#fff7ed",
    "100": "#ffedd5",
    "200": "#fed7aa",
    "300": "#fdba74",
    "400": "#fb923c",
    "500": "#f97316",
    "600": "#ea580c",
    "700": "#c2410c",
    "800": "#9a3412",
    "900": "#7c2d12",
    "950": "#431407",
  },
  amber: {
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03",
  },
  yellow: {
    "50": "#fefce8",
    "100": "#fef9c3",
    "200": "#fef08a",
    "300": "#fde047",
    "400": "#facc15",
    "500": "#eab308",
    "600": "#ca8a04",
    "700": "#a16207",
    "800": "#854d0e",
    "900": "#713f12",
    "950": "#422006",
  },
  lime: {
    "50": "#f7fee7",
    "100": "#ecfccb",
    "200": "#d9f99d",
    "300": "#bef264",
    "400": "#a3e635",
    "500": "#84cc16",
    "600": "#65a30d",
    "700": "#4d7c0f",
    "800": "#3f6212",
    "900": "#365314",
    "950": "#1a2e05",
  },
  green: {
    "50": "#f0fdf4",
    "100": "#dcfce7",
    "200": "#bbf7d0",
    "300": "#86efac",
    "400": "#4ade80",
    "500": "#22c55e",
    "600": "#16a34a",
    "700": "#15803d",
    "800": "#166534",
    "900": "#14532d",
    "950": "#052e16",
  },
  emerald: {
    "50": "#ecfdf5",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
    "950": "#022c22",
  },
  teal: {
    "50": "#f0fdfa",
    "100": "#ccfbf1",
    "200": "#99f6e4",
    "300": "#5eead4",
    "400": "#2dd4bf",
    "500": "#14b8a6",
    "600": "#0d9488",
    "700": "#0f766e",
    "800": "#115e59",
    "900": "#134e4a",
    "950": "#042f2e",
  },
  cyan: {
    "50": "#ecfeff",
    "100": "#cffafe",
    "200": "#a5f3fc",
    "300": "#67e8f9",
    "400": "#22d3ee",
    "500": "#06b6d4",
    "600": "#0891b2",
    "700": "#0e7490",
    "800": "#155e75",
    "900": "#164e63",
    "950": "#083344",
  },
  sky: {
    "50": "#f0f9ff",
    "100": "#e0f2fe",
    "200": "#bae6fd",
    "300": "#7dd3fc",
    "400": "#38bdf8",
    "500": "#0ea5e9",
    "600": "#0284c7",
    "700": "#0369a1",
    "800": "#075985",
    "900": "#0c4a6e",
    "950": "#082f49",
  },
  blue: {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554",
  },
  indigo: {
    "50": "#eef2ff",
    "100": "#e0e7ff",
    "200": "#c7d2fe",
    "300": "#a5b4fc",
    "400": "#818cf8",
    "500": "#6366f1",
    "600": "#4f46e5",
    "700": "#4338ca",
    "800": "#3730a3",
    "900": "#312e81",
    "950": "#1e1b4b",
  },
  violet: {
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
    "950": "#2e1065",
  },
  purple: {
    "50": "#faf5ff",
    "100": "#f3e8ff",
    "200": "#e9d5ff",
    "300": "#d8b4fe",
    "400": "#c084fc",
    "500": "#a855f7",
    "600": "#9333ea",
    "700": "#7e22ce",
    "800": "#6b21a8",
    "900": "#581c87",
    "950": "#3b0764",
  },
  fuchsia: {
    "50": "#fdf4ff",
    "100": "#fae8ff",
    "200": "#f5d0fe",
    "300": "#f0abfc",
    "400": "#e879f9",
    "500": "#d946ef",
    "600": "#c026d3",
    "700": "#a21caf",
    "800": "#86198f",
    "900": "#701a75",
    "950": "#4a044e",
  },
  pink: {
    "50": "#fdf2f8",
    "100": "#fce7f3",
    "200": "#fbcfe8",
    "300": "#f9a8d4",
    "400": "#f472b6",
    "500": "#ec4899",
    "600": "#db2777",
    "700": "#be185d",
    "800": "#9d174d",
    "900": "#831843",
    "950": "#500724",
  },
  rose: {
    "50": "#fff1f2",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
    "950": "#4c0519",
  },
};

function findClosestTailwindColor(hex: string): { name: string; hex: string } {
  const target = hexToRgb(hex);
  let best = { name: "cyan-500", hex: "#06b6d4", dist: Infinity };
  for (const family in TAILWIND_COLORS) {
    for (const shade in TAILWIND_COLORS[family]) {
      const c = TAILWIND_COLORS[family][shade];
      const rgb = hexToRgb(c);
      const d = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
      if (d < best.dist) best = { name: `${family}-${shade}`, hex: c, dist: d };
    }
  }
  return { name: best.name, hex: best.hex };
}

/* ---------------- UI helpers ---------------- */

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {}
  }, []);
  return { copiedKey, copy };
}

function CopyBtn({
  value,
  k,
  copiedKey,
  copy,
}: {
  value: string;
  k: string;
  copiedKey: string | null;
  copy: (v: string, k: string) => void;
}) {
  const done = copiedKey === k;
  return (
    <button
      onClick={() => copy(value, k)}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border hover:bg-secondary transition shrink-0"
      title="Copy"
      aria-label="Copy"
    >
      {done ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Swatch({
  hex,
  onClick,
  onCopy,
  copiedKey,
  ck,
  size = "md",
  removable,
  onRemove,
}: {
  hex: string;
  onClick?: () => void;
  onCopy: (v: string, k: string) => void;
  copiedKey: string | null;
  ck: string;
  size?: "sm" | "md" | "lg";
  removable?: boolean;
  onRemove?: () => void;
}) {
  const dim = size === "sm" ? "h-9" : size === "lg" ? "h-20" : "h-14";
  const done = copiedKey === ck;
  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        onClick={onClick}
        className={`w-full ${dim} rounded-lg border border-border transition hover:scale-[1.03]`}
        style={{ background: hex }}
        title={hex}
        aria-label={hex}
      />
      <div className="mt-1.5 flex items-center gap-1">
        <button
          onClick={() => onCopy(hex, ck)}
          className="flex-1 truncate text-[11px] font-mono text-muted-foreground hover:text-foreground text-left px-1"
          title="Copy hex"
        >
          {done ? "Copied!" : hex.toUpperCase()}
        </button>
        {removable && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-0.5" aria-label="Remove">
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

const DEFAULT_HEX = "#06b6d4";
const LS_SAVED = "cp:saved";
const LS_RECENT = "cp:recent";

function ColorPickerPage() {
  const initial = rgbToHsb(hexToRgb(DEFAULT_HEX));
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);
  const [alpha, setAlpha] = useState(1);
  const { copiedKey, copy } = useCopy();

  const rgb = useMemo(() => {
    const r = hsbToRgb({ h: hue, s: sat, v: val });
    return { r: Math.round(r.r), g: Math.round(r.g), b: Math.round(r.b) };
  }, [hue, sat, val]);
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const tw = useMemo(() => findClosestTailwindColor(hex), [hex]);

  const hexA =
    hex +
    Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
  const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
  const hslaStr = `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${alpha.toFixed(2)})`;
  const hsbStr = `hsb(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(val)}%)`;
  const cmykStr = `cmyk(${Math.round(cmyk.c)}%, ${Math.round(cmyk.m)}%, ${Math.round(cmyk.y)}%, ${Math.round(cmyk.k)}%)`;
  const cssVar = `--color-primary: ${hex};`;

  // Saved & recents
  const [saved, setSaved] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SAVED) || "[]");
      const r = JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
      if (Array.isArray(s)) setSaved(s);
      if (Array.isArray(r)) setRecent(r);
    } catch {}
  }, []);

  // push to recents (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      setRecent((prev) => {
        const next = [hex, ...prev.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 12);
        try {
          localStorage.setItem(LS_RECENT, JSON.stringify(next));
        } catch {}
        return next;
      });
    }, 500);
    return () => clearTimeout(id);
  }, [hex]);

  const setFromHex = useCallback((h: string) => {
    const rgb = hexToRgb(h);
    const hsb = rgbToHsb(rgb);
    setHue(hsb.h);
    setSat(hsb.s);
    setVal(hsb.v);
  }, []);

  const onHexInput = (s: string) => {
    let v = s.trim();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setFromHex(v);
  };

  const saveCurrent = () => {
    setSaved((prev) => {
      if (prev.includes(hex)) return prev;
      const next = [hex, ...prev].slice(0, 20);
      try {
        localStorage.setItem(LS_SAVED, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const removeSaved = (h: string) => {
    setSaved((prev) => {
      const next = prev.filter((x) => x !== h);
      try {
        localStorage.setItem(LS_SAVED, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const clearSaved = () => {
    setSaved([]);
    try {
      localStorage.removeItem(LS_SAVED);
    } catch {}
  };

  // SV canvas drag
  const svRef = useRef<HTMLDivElement | null>(null);
  const draggingSV = useRef(false);
  const updateSV = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    setSat(x * 100);
    setVal((1 - y) * 100);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (draggingSV.current) updateSV(e.clientX, e.clientY);
    };
    const up = () => {
      draggingSV.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const formats: { label: string; value: string; k: string }[] = [
    { label: "HEX", value: hex.toUpperCase(), k: "hex" },
    { label: "HEX + Alpha", value: hexA.toUpperCase(), k: "hexa" },
    { label: "RGB", value: rgbStr, k: "rgb" },
    { label: "RGBA", value: rgba, k: "rgba" },
    { label: "HSL", value: hslStr, k: "hsl" },
    { label: "HSLA", value: hslaStr, k: "hsla" },
    { label: "HSB / HSV", value: hsbStr, k: "hsb" },
    { label: "CMYK", value: cmykStr, k: "cmyk" },
    { label: "CSS Variable", value: cssVar, k: "css" },
    { label: "Tailwind", value: tw.name, k: "tw" },
  ];

  const hueBg = `hsl(${hue}, 100%, 50%)`;

  return (
    <ToolPageShell
      title="Color Picker"
      description="Pick, convert, and generate color palettes. HEX, RGB, HSL, HSB, CMYK plus harmony, contrast, gradients, and image extraction."
    >
      <style>{`
        .cp-tabs [data-state='active'] { color: ${hex} !important; box-shadow: inset 0 -2px 0 ${hex}; }
      `}</style>

      <Tabs defaultValue="picker" className="cp-tabs">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="picker" className="py-2">
            Picker
          </TabsTrigger>
          <TabsTrigger value="harmony" className="py-2">
            Harmony
          </TabsTrigger>
          <TabsTrigger value="contrast" className="py-2">
            Contrast
          </TabsTrigger>
          <TabsTrigger value="gradient" className="py-2">
            Gradient
          </TabsTrigger>
          <TabsTrigger value="extract" className="py-2">
            Extract
          </TabsTrigger>
        </TabsList>

        {/* PICKER */}
        <TabsContent value="picker" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              {/* SV canvas */}
              <div
                ref={svRef}
                onPointerDown={(e) => {
                  draggingSV.current = true;
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  updateSV(e.clientX, e.clientY);
                }}
                className="relative w-full rounded-xl border border-border overflow-hidden cursor-crosshair select-none"
                style={{
                  aspectRatio: "1.4",
                  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueBg}`,
                  touchAction: "none",
                }}
              >
                <div
                  className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
                  style={{
                    left: `calc(${sat}% - 8px)`,
                    top: `calc(${100 - val}% - 8px)`,
                    background: hex,
                  }}
                />
              </div>

              {/* Hue */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Hue</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={hue}
                  onChange={(e) => setHue(parseFloat(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                  }}
                />
              </div>

              {/* Alpha */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Opacity — {Math.round(alpha * 100)}%
                </label>
                <div
                  className="rounded-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                    backgroundSize: "10px 10px",
                    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, transparent, ${hex})`,
                    }}
                  />
                </div>
              </div>

              {/* Preview + actions */}
              <div className="flex items-stretch gap-3">
                <div className="flex-1 h-20 rounded-xl border border-border" style={{ background: hexA }} />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFromHex(getRandomColor())}
                    className="gap-2"
                  >
                    <Shuffle className="w-4 h-4" /> Random
                  </Button>
                  <Button type="button" onClick={saveCurrent} className="gap-2">
                    <Plus className="w-4 h-4" /> Save
                  </Button>
                </div>
              </div>

              {/* HEX input */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">HEX</label>
                <Input
                  value={hex.toUpperCase()}
                  onChange={(e) => onHexInput(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>

              {/* Shades & tints */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Shades & Tints</label>
                <div className="grid grid-cols-10 gap-1.5">
                  {[...getShades(hex).slice().reverse(), hex, ...getTints(hex)].map((c, i) => (
                    <button
                      key={i + c}
                      onClick={() => setFromHex(c)}
                      onDoubleClick={() => copy(c, "st" + i)}
                      title={c + " — click to use, double-click to copy"}
                      className="h-10 rounded-md border border-border hover:scale-110 transition"
                      style={{
                        background: c,
                        outline: c.toLowerCase() === hex.toLowerCase() ? `2px solid ${hex}` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Formats */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-base font-semibold mb-3">All Formats</h2>
              <div className="space-y-2">
                {formats.map((f) => (
                  <div key={f.k} className="flex items-center gap-2">
                    <div className="w-24 shrink-0 text-xs text-muted-foreground">{f.label}</div>
                    <div className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs truncate">
                      {f.value}
                    </div>
                    <CopyBtn value={f.value} k={f.k} copiedKey={copiedKey} copy={copy} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Closest Tailwind:</span>
                <span className="inline-block w-4 h-4 rounded border border-border" style={{ background: tw.hex }} />
                <span className="font-mono">{tw.name}</span>
                <span className="font-mono opacity-70">({tw.hex})</span>
              </div>
            </div>
          </div>

          {/* Recently used */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">Recently Used</h2>
              <span className="text-xs text-muted-foreground">{recent.length} / 12</span>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground">Colors you pick will appear here.</p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {recent.map((c, i) => (
                  <button
                    key={c + i}
                    onClick={() => setFromHex(c)}
                    className="h-10 rounded-md border border-border hover:scale-110 transition"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Saved palette */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display text-base font-semibold">
                Saved Palette <span className="text-xs text-muted-foreground font-normal">({saved.length} / 20)</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(JSON.stringify(saved), "saved-arr")}
                  disabled={saved.length === 0}
                  className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-secondary disabled:opacity-40"
                >
                  {copiedKey === "saved-arr" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy array
                </button>
                <button
                  onClick={clearSaved}
                  disabled={saved.length === 0}
                  className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-secondary disabled:opacity-40 text-destructive"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
            {saved.length === 0 ? (
              <p className="text-xs text-muted-foreground">Click Save to add the current color to your palette.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                {saved.map((c, i) => (
                  <Swatch
                    key={c + i}
                    hex={c}
                    onClick={() => setFromHex(c)}
                    onCopy={copy}
                    copiedKey={copiedKey}
                    ck={"sv" + i}
                    removable
                    onRemove={() => removeSaved(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* HARMONY */}
        <TabsContent value="harmony" className="mt-6">
          <HarmonyPanel hex={hex} setFromHex={setFromHex} copy={copy} copiedKey={copiedKey} />
        </TabsContent>

        {/* CONTRAST */}
        <TabsContent value="contrast" className="mt-6">
          <ContrastPanel currentHex={hex} />
        </TabsContent>

        {/* GRADIENT */}
        <TabsContent value="gradient" className="mt-6">
          <GradientPanel currentHex={hex} copy={copy} copiedKey={copiedKey} />
        </TabsContent>

        {/* EXTRACT */}
        <TabsContent value="extract" className="mt-6">
          <ExtractPanel setFromHex={setFromHex} copy={copy} copiedKey={copiedKey} />
        </TabsContent>
      </Tabs>

      <HowToUse
        steps={[
          "Click or drag on the color canvas to pick any color. Use the hue slider for the base color and opacity slider for transparency.",
          "Copy the color in any format — HEX, RGB, HSL, CMYK, CSS variable, or Tailwind class — with one click.",
          "Use the tabs: Harmony for palettes, Contrast for WCAG checking, Gradient for CSS gradients, Extract to pull colors from any image.",
        ]}
      />

      <ToolSeoContent
        title="Free Color Picker — HEX, RGB, HSL, CMYK + Palette Generator"
        description="Free online color picker with HEX, RGB, HSL, HSB, CMYK. Includes harmony generator, WCAG contrast checker, gradient builder, and image color extractor. No signup, browser only."
        body={[
          "Skycally's color picker is built for designers, developers, and anyone who needs precise colors fast. Drag the saturation/brightness canvas, scrub the hue slider, and read your color back in every format you use — HEX, HEX with alpha, RGB, RGBA, HSL, HSLA, HSB/HSV, CMYK, a CSS custom property, and the closest matching Tailwind class. Every format is a single click to copy, and the picker remembers your last twelve colors plus up to twenty pinned to a saved palette.",
          "Beyond the picker, five focused tabs cover the most common color workflows. The harmony generator builds complementary, analogous, triadic, split-complementary, and tetradic palettes from any base color. The contrast checker enforces WCAG 2.1 AA and AAA ratios for normal and large text with a live preview, so you can ship accessible UI without leaving the page. The gradient builder gives you up to five stops, full direction control, linear and radial modes, and copy-ready CSS plus a Tailwind class. The image extractor pulls the eight most dominant colors from any photo you drop in — purely in your browser, nothing uploaded.",
          "Everything runs client-side. Your colors, your saved palettes, and your uploaded images never leave your device — there is no account, no tracking, and no server round-trip. Bookmark the page, pin it as a tab, or use it on mobile with full touch support for the canvas and sliders.",
          "This is one tool covering what usually takes three or four separate sites: a color converter, a palette generator, an accessibility contrast checker, and an image color extractor. Designers building a brand palette can move from picking a base color, to generating a harmony, to verifying every text/background pairing meets WCAG contrast requirements, all without switching tabs or re-entering values.",
        ]}
        faqs={[
          {
            question: "What color formats does this picker support?",
            answer:
              "HEX (6-digit), HEX with alpha (8-digit), RGB, RGBA, HSL, HSLA, HSB/HSV, CMYK, a ready-to-paste CSS custom property (--color-primary), and the closest Tailwind CSS class (e.g. blue-500). Each output updates live and copies with one click.",
          },
          {
            question: "How does the WCAG contrast checker work?",
            answer:
              "We compute the relative luminance of your foreground and background colors using the official WCAG 2.1 formula, then return the contrast ratio. AA passes need 4.5:1 for normal text and 3:1 for large text (18pt+/14pt bold). AAA requires 7:1 and 4.5:1 respectively. Badges show pass/fail for each combination instantly.",
          },
          {
            question: "What color harmony rules are included?",
            answer:
              "Complementary (180°), Analogous (±30°), Triadic (120° apart), Split-Complementary (150°/210°), and Tetradic (90° apart). Each harmony shows clickable swatches you can promote to the active color or copy directly as HEX.",
          },
          {
            question: "How does the image color extractor work?",
            answer:
              "Drop an image, and a canvas reads its pixels, downscales for speed, buckets them into a color histogram, and returns the eight most frequent distinct colors. The image is processed entirely in your browser — it is never uploaded anywhere.",
          },
          {
            question: "Can I save my favorite colors?",
            answer:
              "Yes. Click Save to pin up to twenty colors to a palette stored in your browser's localStorage. They persist across page reloads and devices that share the same browser profile. You can also copy the whole palette as a JSON array for use in code.",
          },
          {
            question: "How accurate is the Tailwind color match?",
            answer:
              "We brute-force compare your color against the entire Tailwind CSS v3 palette (slate through rose, shades 50-950) using squared Euclidean distance in RGB space, and return the nearest named class. It is deterministic and works offline.",
          },
          {
            question: "Can I build CSS gradients?",
            answer:
              "Yes. The gradient builder supports up to five color stops with adjustable positions, an angle slider with preset directions, and a linear/radial toggle. Copy the CSS or grab a Tailwind class with bg-gradient-to-* + from/via/to arbitrary hex values.",
          },
          {
            question: "Is my data private?",
            answer:
              "Completely. The picker, all conversions, the harmony generator, the contrast checker, the gradient builder, and the image extractor all run in your browser using JavaScript and the Canvas API. No colors, images, or palettes are ever sent to a server.",
          },
        ]}
      />

      <RelatedTools currentSlug="color-picker" />
    </ToolPageShell>
  );
}

/* ---------------- Harmony Panel ---------------- */

function HarmonyPanel({
  hex,
  setFromHex,
  copy,
  copiedKey,
}: {
  hex: string;
  setFromHex: (h: string) => void;
  copy: (v: string, k: string) => void;
  copiedKey: string | null;
}) {
  const [mode, setMode] = useState<HarmonyMode>("complementary");
  const modes: { v: HarmonyMode; label: string }[] = [
    { v: "complementary", label: "Complementary" },
    { v: "analogous", label: "Analogous" },
    { v: "triadic", label: "Triadic" },
    { v: "split", label: "Split-Complementary" },
    { v: "tetradic", label: "Tetradic" },
  ];
  const colors = getHarmonyColors(hex, mode);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">Color Harmony</h2>
        <p className="text-sm text-muted-foreground">Generate balanced color palettes based on color theory.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.v}
            onClick={() => setMode(m.v)}
            className="text-xs rounded-full border px-3 py-1.5 transition"
            style={{
              borderColor: mode === m.v ? hex : "var(--border)",
              background: mode === m.v ? `color-mix(in oklab, ${hex} 15%, transparent)` : "transparent",
              color: mode === m.v ? hex : "var(--muted-foreground)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        className={`grid gap-3 grid-cols-${Math.min(colors.length, 4)} sm:grid-cols-${colors.length}`}
        style={{ gridTemplateColumns: `repeat(${colors.length}, minmax(0, 1fr))` }}
      >
        {colors.map((c, i) => (
          <Swatch
            key={c + i}
            hex={c}
            size="lg"
            onClick={() => setFromHex(c)}
            onCopy={copy}
            copiedKey={copiedKey}
            ck={"hm" + i}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Contrast Panel ---------------- */

function ContrastPanel({ currentHex }: { currentHex: string }) {
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState(currentHex);
  useEffect(() => setBg(currentHex), [currentHex]);

  const ratio = getContrastRatio(hexToRgb(fg), hexToRgb(bg));
  const r = ratio.toFixed(2);

  const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: ok
          ? "color-mix(in oklab, #10b981 18%, transparent)"
          : "color-mix(in oklab, #ef4444 18%, transparent)",
        color: ok ? "#10b981" : "#ef4444",
      }}
    >
      {ok ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
      {label}
    </span>
  );

  const ColorIn = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent"
        />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
            else onChange(v);
          }}
          className="font-mono uppercase"
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">WCAG Contrast Checker</h2>
        <p className="text-sm text-muted-foreground">
          Check accessibility-compliant text/background contrast (WCAG 2.1).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorIn label="Foreground (text)" value={fg} onChange={setFg} />
        <ColorIn label="Background" value={bg} onChange={setBg} />
      </div>

      <div className="rounded-xl p-6 border border-border" style={{ background: bg, color: fg }}>
        <p className="text-xl font-semibold mb-1">Large preview text</p>
        <p className="text-sm">The quick brown fox jumps over the lazy dog. Accessible color combinations matter.</p>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <div className="font-display text-3xl font-bold">{r}:1</div>
        <div className="flex flex-wrap gap-2">
          <Badge ok={ratio >= 4.5} label="AA Normal (4.5:1)" />
          <Badge ok={ratio >= 3} label="AA Large (3:1)" />
          <Badge ok={ratio >= 7} label="AAA Normal (7:1)" />
          <Badge ok={ratio >= 4.5} label="AAA Large (4.5:1)" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Gradient Panel ---------------- */

type GStop = { color: string; pos: number };

function GradientPanel({
  currentHex,
  copy,
  copiedKey,
}: {
  currentHex: string;
  copy: (v: string, k: string) => void;
  copiedKey: string | null;
}) {
  const [stops, setStops] = useState<GStop[]>([
    { color: currentHex, pos: 0 },
    { color: "#7c3aed", pos: 100 },
  ]);
  const [angle, setAngle] = useState(90);
  const [type, setType] = useState<"linear" | "radial">("linear");

  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const stopsCss = sorted.map((s) => `${s.color} ${s.pos}%`).join(", ");
  const css =
    type === "linear"
      ? `background: linear-gradient(${angle}deg, ${stopsCss});`
      : `background: radial-gradient(circle, ${stopsCss});`;
  const preview = css.replace("background: ", "").replace(/;$/, "");

  const tw =
    type === "linear"
      ? `bg-[linear-gradient(${angle}deg,${sorted.map((s) => `${s.color}_${s.pos}%`).join(",")})]`
      : `bg-[radial-gradient(circle,${sorted.map((s) => `${s.color}_${s.pos}%`).join(",")})]`;

  const updateStop = (i: number, patch: Partial<GStop>) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addStop = () => {
    if (stops.length >= 5) return;
    setStops((prev) => [...prev, { color: currentHex, pos: 50 }]);
  };
  const removeStop = (i: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  };

  const presets = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">Gradient Builder</h2>
        <p className="text-sm text-muted-foreground">Build linear and radial gradients with up to 5 stops.</p>
      </div>

      <div className="h-40 rounded-xl border border-border" style={{ background: preview }} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(["linear", "radial"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="text-xs px-3 py-1 rounded"
              style={{
                background: type === t ? "var(--secondary)" : "transparent",
                color: type === t ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {t === "linear" ? "Linear" : "Radial"}
            </button>
          ))}
        </div>
        {type === "linear" && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Angle</label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="w-40"
              />
              <span className="text-xs font-mono w-10">{angle}°</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAngle(p)}
                  className="text-[11px] rounded-md border border-border px-2 py-0.5 hover:bg-secondary"
                  style={{ background: angle === p ? "var(--secondary)" : undefined }}
                >
                  {p}°
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <input
              type="color"
              value={s.color}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="w-10 h-8 rounded border border-border cursor-pointer bg-transparent shrink-0"
            />
            <Input
              value={s.color.toUpperCase()}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="font-mono uppercase w-28 shrink-0"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={s.pos}
              onChange={(e) => updateStop(i, { pos: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs font-mono w-10 text-right">{s.pos}%</span>
            <button
              onClick={() => removeStop(i)}
              disabled={stops.length <= 2}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30 p-1"
              aria-label="Remove stop"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addStop}
          disabled={stops.length >= 5}
          className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> Add stop ({stops.length}/5)
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs truncate">
            {css}
          </div>
          <CopyBtn value={css} k="grad-css" copiedKey={copiedKey} copy={copy} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs truncate">
            {tw}
          </div>
          <CopyBtn value={tw} k="grad-tw" copiedKey={copiedKey} copy={copy} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Extract Panel ---------------- */

function ExtractPanel({
  setFromHex,
  copy,
  copiedKey,
}: {
  setFromHex: (h: string) => void;
  copy: (v: string, k: string) => void;
  copiedKey: string | null;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSrc(url);
    extract(url);
  };

  const extract = (url: string) => {
    setBusy(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxEdge = 120;
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        setBusy(false);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;
        const r = data[i] & 0xf0;
        const g = data[i + 1] & 0xf0;
        const b = data[i + 2] & 0xf0;
        const key = `${r}-${g}-${b}`;
        const cur = buckets.get(key);
        if (cur) {
          cur.count++;
          cur.r += data[i];
          cur.g += data[i + 1];
          cur.b += data[i + 2];
        } else {
          buckets.set(key, { count: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
        }
      }
      const top = [...buckets.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((b) => rgbToHex({ r: b.r / b.count, g: b.g / b.count, b: b.b / b.count }));
      setPalette(top);
      setBusy(false);
    };
    img.onerror = () => setBusy(false);
    img.src = url;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">Image Color Extractor</h2>
        <p className="text-sm text-muted-foreground">
          Upload any image to extract its 8 dominant colors. Runs entirely in your browser.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
        className="block rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-secondary/40 transition"
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">Drop an image or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, GIF</p>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || undefined)}
        />
      </label>

      {src && (
        <div className="grid gap-4 md:grid-cols-2">
          <img
            src={src}
            alt="Source"
            className="rounded-xl border border-border max-h-72 w-full object-contain bg-secondary/30"
          />
          <div>
            <h3 className="text-sm font-medium mb-2">
              Dominant colors {busy && <span className="text-xs text-muted-foreground">(analyzing…)</span>}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {palette.map((c, i) => (
                <Swatch
                  key={c + i}
                  hex={c}
                  onClick={() => setFromHex(c)}
                  onCopy={copy}
                  copiedKey={copiedKey}
                  ck={"ex" + i}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
