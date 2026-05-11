import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, FileCode, Copy, ChevronDown, Upload, X } from "lucide-react";
type QRCodeModule = typeof import("qrcode");
let QRCode: QRCodeModule | null = null;
let qrcodePromise: Promise<QRCodeModule> | null = null;
const loadQRCode = () => (qrcodePromise ??= import("qrcode").then((m) => (QRCode = m)));
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadBlob } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/qr-generator")({
  head: () => ({
    meta: [
      { title: "Free QR Code Generator with Logo — Custom Colors | Skycally" },
      { name: "description", content: "Create custom QR codes with logo, colors and different styles for free. Download as PNG or SVG. No signup required. Perfect for business cards and marketing." },
      { property: "og:title", content: "Free QR Code Generator | Skycally" },
      { property: "og:description", content: "Generate pro-grade QR codes with custom colors, logos, and styles." },
      { property: "og:url", content: "https://skycally.com/tools/qr-generator" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/qr-generator" }],
  }),
  component: QrGeneratorPage,
});

type QRType = "url" | "text" | "email" | "phone" | "wifi" | "vcard";
type DotStyle = "square" | "rounded" | "dots" | "classy" | "classy-rounded";
type ColorMode = "solid" | "gradient";
type GradientType = "linear" | "radial";
type FrameStyle = "none" | "simple" | "rounded" | "badge";
type LogoChoice =
  | { kind: "none" }
  | { kind: "builtin"; id: string }
  | { kind: "upload"; dataUrl: string };

const QR_TYPES: { id: QRType; label: string; icon: string }[] = [
  { id: "url", label: "URL", icon: "🔗" },
  { id: "text", label: "Text", icon: "📝" },
  { id: "email", label: "Email", icon: "✉️" },
  { id: "phone", label: "Phone", icon: "📞" },
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "vcard", label: "vCard", icon: "👤" },
];

const DOT_STYLES: { id: DotStyle; label: string; glyph: string; tip: string }[] = [
  { id: "square", label: "Square", glyph: "■", tip: "Classic sharp squares — most universal" },
  { id: "rounded", label: "Rounded", glyph: "▢", tip: "Slightly softened corners" },
  { id: "dots", label: "Dots", glyph: "●", tip: "Full circular dots — modern look" },
  { id: "classy", label: "Classy", glyph: "▪", tip: "Tight squares with extra gaps" },
  { id: "classy-rounded", label: "Classy Rounded", glyph: "◉", tip: "Soft squares with extra spacing" },
];

const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "simple", label: "Simple" },
  { id: "rounded", label: "Rounded" },
  { id: "badge", label: "Badge" },
];

const CTA_PRESETS = ["SCAN ME", "Visit Website", "Follow Us", "Get Offer"];

// Built-in logos: colored circle + monogram
const BUILTIN_LOGOS: { id: string; label: string; bg: string; fg: string; text: string }[] = [
  { id: "wifi", label: "WiFi", bg: "#0EA5E9", fg: "#fff", text: "📶" },
  { id: "link", label: "Link", bg: "#64748B", fg: "#fff", text: "🔗" },
  { id: "email", label: "Email", bg: "#EF4444", fg: "#fff", text: "✉" },
  { id: "phone", label: "Phone", bg: "#22C55E", fg: "#fff", text: "📞" },
  { id: "location", label: "Location", bg: "#F97316", fg: "#fff", text: "📍" },
  { id: "instagram", label: "Instagram", bg: "#E1306C", fg: "#fff", text: "IG" },
  { id: "facebook", label: "Facebook", bg: "#1877F2", fg: "#fff", text: "f" },
  { id: "twitter", label: "X", bg: "#000000", fg: "#fff", text: "𝕏" },
  { id: "whatsapp", label: "WhatsApp", bg: "#25D366", fg: "#fff", text: "W" },
  { id: "youtube", label: "YouTube", bg: "#FF0000", fg: "#fff", text: "▶" },
  { id: "tiktok", label: "TikTok", bg: "#010101", fg: "#fff", text: "♪" },
  { id: "linkedin", label: "LinkedIn", bg: "#0A66C2", fg: "#fff", text: "in" },
];

function builtinLogoDataUrl(id: string): string {
  const meta = BUILTIN_LOGOS.find((l) => l.id === id);
  if (!meta) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${meta.bg}"/><text x="50" y="50" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${meta.fg}" text-anchor="middle" dominant-baseline="central">${meta.text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function formatQRContent(type: QRType, d: any): string {
  switch (type) {
    case "url":
      return d.url ? (d.url.match(/^[a-z]+:\/\//i) ? d.url : `https://${d.url}`) : "";
    case "text":
      return d.text || "";
    case "email":
      if (!d.address) return "";
      return `mailto:${d.address}${d.subject ? `?subject=${encodeURIComponent(d.subject)}` : ""}`;
    case "phone":
      return d.phone ? `tel:${d.phone}` : "";
    case "wifi":
      if (!d.ssid) return "";
      return `WIFI:T:${d.security || "WPA"};S:${d.ssid};P:${d.password || ""};;`;
    case "vcard":
      if (!d.name) return "";
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${d.name}\nTEL:${d.phone || ""}\nEMAIL:${d.email || ""}\nURL:${d.website || ""}\nEND:VCARD`;
  }
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").slice(0, 6);
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function applyDotStyle(
  canvas: HTMLCanvasElement,
  content: string,
  style: DotStyle,
  fg: string,
  bg: string,
  errorCorrectionLevel: "M" | "H",
) {
  const ctx = canvas.getContext("2d")!;
  const size = canvas.width;
  const imageData = ctx.getImageData(0, 0, size, canvas.height);
  const data = imageData.data;
  const bgRgb = hexToRgb(bg);
  const qr = QRCode!.create(content, { errorCorrectionLevel });
  const moduleCount = qr.modules.size;
  const margin = 2;
  const moduleSize = size / (moduleCount + margin * 2);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      const sx = Math.min(size - 1, Math.floor(x + moduleSize / 2));
      const sy = Math.min(size - 1, Math.floor(y + moduleSize / 2));
      const idx = (sy * size + sx) * 4;
      const isDark =
        data[idx + 3] > 0 &&
        Math.abs(data[idx] - bgRgb.r) + Math.abs(data[idx + 1] - bgRgb.g) + Math.abs(data[idx + 2] - bgRgb.b) > 24;
      if (!isDark) continue;
      const inset = style === "square" || style === "rounded" ? 0 : moduleSize * 0.12;
      const w = moduleSize - inset * 2;
      const h = moduleSize - inset * 2;
      const px = x + inset;
      const py = y + inset;
      const radius = moduleSize * 0.35;
      ctx.beginPath();
      switch (style) {
        case "square":
          ctx.rect(x, y, moduleSize + 0.2, moduleSize + 0.2);
          break;
        case "rounded":
          ctx.roundRect(x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1, radius);
          break;
        case "dots":
          ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.4, 0, Math.PI * 2);
          break;
        case "classy":
          ctx.moveTo(px, py);
          ctx.lineTo(px + w - radius, py);
          ctx.quadraticCurveTo(px + w, py, px + w, py + radius);
          ctx.lineTo(px + w, py + h);
          ctx.lineTo(px, py + h);
          ctx.closePath();
          break;
        case "classy-rounded":
          ctx.roundRect(px, py, w, h, moduleSize * 0.18);
          break;
      }
      ctx.fill();
    }
  }
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function applyColorFill(
  canvas: HTMLCanvasElement,
  mode: ColorMode,
  color1: string,
  color2: string,
  gType: GradientType,
  angleDeg: number,
  bg: string,
) {
  const ctx = canvas.getContext("2d")!;
  const size = canvas.width;
  if (mode === "solid") return;

  // Build gradient
  let grad: CanvasGradient;
  if (gType === "radial") {
    grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  } else {
    const a = (angleDeg * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const x1 = cx - (Math.cos(a) * size) / 2;
    const y1 = cy - (Math.sin(a) * size) / 2;
    const x2 = cx + (Math.cos(a) * size) / 2;
    const y2 = cy + (Math.sin(a) * size) / 2;
    grad = ctx.createLinearGradient(x1, y1, x2, y2);
  }
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);

  // Temp canvas: copy current QR, then mask gradient to dark modules only
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.drawImage(canvas, 0, 0);

  // Replace dark/light pixels: keep only dark modules as opaque mask
  const imgData = tempCtx.getImageData(0, 0, size, size);
  const bgRgb = hexToRgb(bg);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const dr = Math.abs(imgData.data[i] - bgRgb.r);
    const dg = Math.abs(imgData.data[i + 1] - bgRgb.g);
    const db = Math.abs(imgData.data[i + 2] - bgRgb.b);
    const alpha = imgData.data[i + 3];
    if (!(alpha > 0 && dr + dg + db > 24)) {
      imgData.data[i + 3] = 0;
    }
  }
  tempCtx.putImageData(imgData, 0, 0);

  // Paint gradient only where mask is opaque
  tempCtx.globalCompositeOperation = "source-in";
  tempCtx.fillStyle = grad;
  tempCtx.fillRect(0, 0, size, size);

  // Redraw: bg + gradient-colored modules
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(tempCanvas, 0, 0);
}

async function drawLogo(canvas: HTMLCanvasElement, src: string, sizeRatio: number) {
  const ctx = canvas.getContext("2d")!;
  const qrSize = canvas.width;
  const size = qrSize * sizeRatio;
  const x = (qrSize - size) / 2;
  const y = (qrSize - size) / 2;
  const padding = size * 0.15;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  (ctx as any).roundRect(x - padding, y - padding, size + padding * 2, size + padding * 2, 16);
  ctx.fill();
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, x, y, size, size);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

function drawFrame(
  source: HTMLCanvasElement,
  style: FrameStyle,
  cta: string,
  frameColor: string,
  textColor: string,
  bg: string,
): HTMLCanvasElement {
  if (style === "none") return source;
  const size = source.width;
  const out = document.createElement("canvas");
  if (style === "badge") {
    const banner = Math.round(size * 0.14);
    out.width = size;
    out.height = size + banner;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(source, 0, 0);
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, size, size, banner);
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(banner * 0.55)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cta || "SCAN ME", size / 2, size + banner / 2);
    return out;
  }
  const pad = Math.round(size * 0.04);
  const stroke = Math.max(6, Math.round(size * 0.012));
  out.width = size + pad * 2;
  out.height = size + pad * 2;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, pad, pad);
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = stroke;
  if (style === "simple") {
    ctx.strokeRect(stroke / 2, stroke / 2, out.width - stroke, out.height - stroke);
  } else {
    ctx.beginPath();
    (ctx as any).roundRect(stroke / 2, stroke / 2, out.width - stroke, out.height - stroke, Math.round(size * 0.05));
    ctx.stroke();
  }
  return out;
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-display font-semibold">{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded cursor-pointer border border-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function QrGeneratorPage() {
  const [type, setType] = useState<QRType>("url");
  const [forms, setForms] = useState<Record<QRType, any>>({
    url: { url: "https://skycally.com" },
    text: { text: "Hello, world!" },
    email: { address: "", subject: "" },
    phone: { phone: "" },
    wifi: { ssid: "", password: "", security: "WPA" },
    vcard: { name: "", phone: "", email: "", website: "" },
  });

  const [dotStyle, setDotStyle] = useState<DotStyle>("square");
  const [colorMode, setColorMode] = useState<ColorMode>("solid");
  const [color1, setColor1] = useState("#000000");
  const [color2, setColor2] = useState("#0EA5E9");
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(45);
  const [bg, setBg] = useState("#ffffff");

  const [logo, setLogo] = useState<LogoChoice>({ kind: "none" });
  const [logoSize, setLogoSize] = useState(0.22);

  const [frameStyle, setFrameStyle] = useState<FrameStyle>("none");
  const [frameColor, setFrameColor] = useState("#000000");
  const [frameTextColor, setFrameTextColor] = useState("#ffffff");
  const [cta, setCta] = useState("SCAN ME");

  const previewRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const finalRef = useRef<HTMLCanvasElement | null>(null);

  const content = useMemo(() => formatQRContent(type, forms[type]), [type, forms]);
  const updateForm = (patch: any) => setForms((f) => ({ ...f, [type]: { ...f[type], ...patch } }));

  const logoSrc = useMemo(() => {
    if (logo.kind === "builtin") return builtinLogoDataUrl(logo.id);
    if (logo.kind === "upload") return logo.dataUrl;
    return "";
  }, [logo]);

  const lowContrast = useMemo(() => {
    const c1 = contrastRatio(color1, bg);
    if (colorMode === "solid") return c1 < 3;
    const c2 = contrastRatio(color2, bg);
    return Math.min(c1, c2) < 3;
  }, [color1, color2, bg, colorMode]);

  const render = useCallback(async () => {
    const canvas = previewRef.current;
    if (!canvas || !content) return;
    const errorCorrectionLevel = logo.kind !== "none" ? "H" : "M";
    try {
      await loadQRCode();
      await QRCode!.toCanvas(canvas, content, {
        width: 300,
        margin: 2,
        errorCorrectionLevel,
        color: { dark: color1, light: bg },
      });
      applyDotStyle(canvas, content, dotStyle, color1, bg, errorCorrectionLevel);
      applyColorFill(canvas, colorMode, color1, color2, gradientType, angle, bg);
      if (logoSrc) {
        await drawLogo(canvas, logoSrc, logoSize);
      }
      const framed = drawFrame(canvas, frameStyle, cta, frameColor, frameTextColor, bg);
      if (framed !== canvas) {
        canvas.width = framed.width;
        canvas.height = framed.height;
        canvas.getContext("2d")?.drawImage(framed, 0, 0);
      }
      finalRef.current = canvas;
    } catch (err) {
      console.error(err);
    }
  }, [content, logo.kind, color1, bg, dotStyle, colorMode, color2, gradientType, angle, logoSrc, logoSize, frameStyle, cta, frameColor, frameTextColor]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      render();
    });
    return () => cancelAnimationFrame(id);
  }, [render]);

  const downloadPng = () => {
    const c = finalRef.current;
    if (!c || !c.width) return;
    c.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, "qrcode.png");
        toast.success("✅ Download started!");
      }
    }, "image/png");
  };

  const downloadSvg = async () => {
    const styled = dotStyle !== "square" || colorMode !== "solid" || logo.kind !== "none" || frameStyle !== "none";
    try {
      if (!styled) {
        await loadQRCode();
        const svg = await QRCode!.toString(content, {
          type: "svg",
          width: 1000,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: color1, light: bg },
        });
        downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
      } else {
        const c = finalRef.current;
        if (!c) return;
        const dataUrl = c.toDataURL("image/png");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}"><image href="${dataUrl}" width="${c.width}" height="${c.height}"/></svg>`;
        downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
      }
      toast.success("✅ Download started!");
    } catch {
      toast.error("Failed to generate SVG");
    }
  };

  const copyImage = () => {
    const c = finalRef.current;
    if (!c || !c.width) return;
    c.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("QR code copied to clipboard!");
      } catch {
        toast.error("Clipboard not supported in this browser");
      }
    }, "image/png");
  };

  const onUploadLogo = (file: File) => {
    if (file.size > 200 * 1024) {
      toast.error("Logo must be under 200KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo({ kind: "upload", dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <ToolPageShell title="QR Code Generator" description="Create custom QR codes with logos, gradients, dot styles & frames — instantly, in your browser.">
      <TooltipProvider delayDuration={150}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT: controls */}
          <div className="space-y-4">
            {/* Type tabs */}
            <div className="flex flex-wrap gap-2">
              {QR_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold border transition ${type === t.id ? "bg-foreground text-background border-foreground" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dynamic content */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              {type === "url" && (
                <Input value={forms.url.url} onChange={(e) => updateForm({ url: e.target.value })} placeholder="https://example.com" />
              )}
              {type === "text" && (
                <Textarea value={forms.text.text} onChange={(e) => updateForm({ text: e.target.value })} placeholder="Enter any text..." className="min-h-[100px]" />
              )}
              {type === "email" && (
                <>
                  <Input value={forms.email.address} onChange={(e) => updateForm({ address: e.target.value })} placeholder="email@example.com" />
                  <Input value={forms.email.subject} onChange={(e) => updateForm({ subject: e.target.value })} placeholder="Subject (optional)" />
                </>
              )}
              {type === "phone" && (
                <Input value={forms.phone.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="+1234567890" />
              )}
              {type === "wifi" && (
                <>
                  <Input value={forms.wifi.ssid} onChange={(e) => updateForm({ ssid: e.target.value })} placeholder="Network name (SSID)" />
                  <Input value={forms.wifi.password} onChange={(e) => updateForm({ password: e.target.value })} placeholder="Password" />
                  <div className="flex gap-2">
                    {(["WPA", "WEP", "nopass"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateForm({ security: s })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm border transition ${forms.wifi.security === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                      >
                        {s === "nopass" ? "None" : s}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {type === "vcard" && (
                <>
                  <Input value={forms.vcard.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Full name" />
                  <Input value={forms.vcard.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="Phone" />
                  <Input value={forms.vcard.email} onChange={(e) => updateForm({ email: e.target.value })} placeholder="Email" />
                  <Input value={forms.vcard.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="Website" />
                </>
              )}
            </div>

            {/* Style & Colors */}
            <Section title="Style & Colors" defaultOpen>
              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">Dot Style</label>
                <div className="flex flex-wrap gap-2">
                  {DOT_STYLES.map((s) => (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setDotStyle(s.id)}
                          className={`min-w-16 rounded-lg px-3 py-2 text-sm border transition flex flex-col items-center gap-1 ${dotStyle === s.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                        >
                          <span className="text-lg leading-none">{s.glyph}</span>
                          <span className="text-[10px] uppercase tracking-wide">{s.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{s.tip}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">Color Mode</label>
                <div className="flex gap-2">
                  {(["solid", "gradient"] as ColorMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setColorMode(m)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border transition capitalize ${colorMode === m ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorField label={colorMode === "gradient" ? "Start color" : "QR color"} value={color1} onChange={setColor1} />
                {colorMode === "gradient" && <ColorField label="End color" value={color2} onChange={setColor2} />}
                <ColorField label="Background" value={bg} onChange={setBg} />
              </div>

              {colorMode === "gradient" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["linear", "radial"] as GradientType[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGradientType(g)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm border transition capitalize ${gradientType === g ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {gradientType === "linear" && (
                    <div>
                      <label className="text-xs font-semibold mb-2 block text-muted-foreground">Direction ({angle}°)</label>
                      <div className="flex gap-2">
                        {[
                          { a: 0, g: "→" },
                          { a: 45, g: "↘" },
                          { a: 90, g: "↓" },
                          { a: 135, g: "↙" },
                        ].map((p) => (
                          <button
                            key={p.a}
                            onClick={() => setAngle(p.a)}
                            className={`flex-1 rounded-lg px-3 py-2 text-base border transition ${angle === p.a ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                          >
                            {p.g} {p.a}°
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    💡 Tip: Keep contrast between QR color and background above 4:1 for reliable scanning.
                  </p>
                </div>
              )}
            </Section>

            {/* Center Logo */}
            <Section title="Center Logo (optional)">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLogo({ kind: "none" })}
                  className={`rounded-lg px-3 py-2 text-sm border transition ${logo.kind === "none" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                >
                  None
                </button>
                <label className="rounded-lg px-3 py-2 text-sm border border-border hover:bg-secondary cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUploadLogo(e.target.files[0])}
                  />
                </label>
                {logo.kind === "upload" && (
                  <button
                    onClick={() => setLogo({ kind: "none" })}
                    className="rounded-lg px-3 py-2 text-sm border border-border hover:bg-secondary inline-flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Clear upload
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">Built-in icons</label>
                <div className="grid grid-cols-6 gap-2">
                  {BUILTIN_LOGOS.map((b) => {
                    const active = logo.kind === "builtin" && logo.id === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setLogo({ kind: "builtin", id: b.id })}
                        title={b.label}
                        className={`aspect-square rounded-lg border flex items-center justify-center text-base font-bold transition ${active ? "ring-2 ring-foreground border-foreground" : "border-border hover:bg-secondary"}`}
                        style={{ background: b.bg, color: b.fg }}
                      >
                        {b.text}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">
                  Logo size ({Math.round(logoSize * 100)}%)
                </label>
                <Slider
                  value={[Math.round(logoSize * 100)]}
                  min={15}
                  max={35}
                  step={1}
                  onValueChange={(v) => setLogoSize(v[0] / 100)}
                />
              </div>
            </Section>

            {/* Frame */}
            <Section title="Frame (optional)">
              <div className="flex gap-2 flex-wrap">
                {FRAMES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrameStyle(f.id)}
                    className={`rounded-lg px-3 py-2 text-sm border transition ${frameStyle === f.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {frameStyle !== "none" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Frame color" value={frameColor} onChange={setFrameColor} />
                    {frameStyle === "badge" && (
                      <ColorField label="Text color" value={frameTextColor} onChange={setFrameTextColor} />
                    )}
                  </div>
                  {frameStyle === "badge" && (
                    <div>
                      <label className="text-xs font-semibold mb-2 block text-muted-foreground">CTA text</label>
                      <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="SCAN ME" />
                      <div className="flex gap-2 flex-wrap mt-2">
                        {CTA_PRESETS.map((p) => (
                          <button
                            key={p}
                            onClick={() => setCta(p)}
                            className="text-xs rounded-md px-2.5 py-1 border border-border hover:bg-secondary"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          </div>

          {/* RIGHT: preview */}
          <div className="lg:sticky lg:top-24 self-start space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
              {logo.kind !== "none" && (
                <div className="text-[11px] text-muted-foreground bg-secondary rounded-md px-2 py-1">
                  ⚡ High error correction enabled for logo compatibility
                </div>
              )}
              <div className="rounded-xl p-3" style={{ background: bg }}>
                <div key={content} className="animate-in fade-in duration-200">
                  <canvas
                    ref={previewRef}
                    className="max-w-full h-auto"
                    style={{ maxWidth: 300 }}
                  />
                </div>
              </div>
              {content && lowContrast && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-[300px]">
                  ⚠️ Low contrast detected — QR code may not scan correctly. Try darker colors.
                </p>
              )}
              {!content && (
                <p className="text-xs text-muted-foreground">Enter content to generate your QR code.</p>
              )}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={downloadPng} disabled={!content} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground text-background font-semibold px-3 py-2.5 text-sm disabled:opacity-50">
                  <Download className="w-4 h-4" /> PNG
                </button>
                <button onClick={downloadSvg} disabled={!content} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border font-semibold px-3 py-2.5 text-sm disabled:opacity-50 hover:bg-secondary">
                  <FileCode className="w-4 h-4" /> SVG
                </button>
                <button onClick={copyImage} disabled={!content} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border font-semibold px-3 py-2.5 text-sm disabled:opacity-50 hover:bg-secondary">
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* ADSENSE_ZONE: qr-generator-bottom 728x90 */}
      <AdZone id="qr-generator-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Pick a QR type (URL, WiFi, vCard, etc.) and fill the fields.",
          "Customize dot style, colors, gradient, logo and frame — preview updates live.",
          "Download as PNG or SVG, or copy the image straight to your clipboard.",
        ]}
      />
    </ToolPageShell>
  );
}
