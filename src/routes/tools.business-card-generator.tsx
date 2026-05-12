import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Upload, X, Download, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import ToolSeoContent from "@/components/tool-seo-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/tools/business-card-generator")({
  head: () => buildToolMeta(toolBySlug("business-card-generator", tools)),
  component: BusinessCardGeneratorPage,
});

// ── Types ───────────────────────────────────────────────
interface TemplateColors {
  bg: string;
  accent: string;
  text: string;
}
interface Template {
  id: string;
  name: string;
  description: string;
  colors: TemplateColors;
}
interface CardInfo {
  fullName: string;
  jobTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  qrContent: string;
  showQR: boolean;
  logoUrl: string | null;
}

const TEMPLATES: Template[] = [
  { id: "classic-white", name: "Classic White", description: "Clean minimal design", colors: { bg: "#ffffff", accent: "#1e293b", text: "#1e293b" } },
  { id: "dark-elegant", name: "Dark Elegant", description: "Premium black & gold", colors: { bg: "#0a0a0a", accent: "#d4af37", text: "#ffffff" } },
  { id: "navy-professional", name: "Navy Professional", description: "Corporate navy blue", colors: { bg: "#0f172a", accent: "#38bdf8", text: "#ffffff" } },
  { id: "red-bold", name: "Red Bold", description: "Bold red accent", colors: { bg: "#ffffff", accent: "#dc2626", text: "#1e293b" } },
  { id: "green-modern", name: "Green Modern", description: "Fresh modern green", colors: { bg: "#ffffff", accent: "#16a34a", text: "#1e293b" } },
  { id: "orange-creative", name: "Orange Creative", description: "Creative orange style", colors: { bg: "#1c1c1c", accent: "#f97316", text: "#ffffff" } },
  { id: "purple-luxury", name: "Purple Luxury", description: "Luxury purple gradient", colors: { bg: "#1e1b4b", accent: "#a78bfa", text: "#ffffff" } },
  { id: "minimal-gray", name: "Minimal Gray", description: "Ultra minimal gray", colors: { bg: "#f8fafc", accent: "#64748b", text: "#1e293b" } },
];

const FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
  { value: "Georgia", label: "Georgia" },
  { value: "Oswald", label: "Oswald" },
];

const PRESETS: TemplateColors[] = [
  { bg: "#ffffff", accent: "#1e293b", text: "#1e293b" },
  { bg: "#0a0a0a", accent: "#d4af37", text: "#ffffff" },
  { bg: "#0f172a", accent: "#38bdf8", text: "#ffffff" },
  { bg: "#ffffff", accent: "#dc2626", text: "#1e293b" },
  { bg: "#1e1b4b", accent: "#a78bfa", text: "#ffffff" },
  { bg: "#f8fafc", accent: "#64748b", text: "#1e293b" },
];

const CARD_W = 1050;
const CARD_H = 600;

const EMPTY_INFO: CardInfo = {
  fullName: "",
  jobTitle: "",
  company: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  linkedin: "",
  instagram: "",
  twitter: "",
  qrContent: "",
  showQR: true,
  logoUrl: null,
};

type QrPos = "bottom-left" | "bottom-right" | "none";
type LogoPos = "top-left" | "top-center" | "top-right";
type Orientation = "horizontal" | "vertical";

function BusinessCardGeneratorPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const [info, setInfo] = useState<CardInfo>(EMPTY_INFO);
  const [qrTouched, setQrTouched] = useState(false);

  // Step-3 customization
  const [colors, setColors] = useState<TemplateColors>(TEMPLATES[0].colors);
  const [font, setFont] = useState("Inter");
  const [nameSize, setNameSize] = useState(36);
  const [infoSize, setInfoSize] = useState(13);
  const [qrPos, setQrPos] = useState<QrPos>("bottom-right");
  const [qrSize, setQrSize] = useState<"S" | "M" | "L">("M");
  const [logoPos, setLogoPos] = useState<LogoPos>("top-right");
  const [showDivider, setShowDivider] = useState(true);
  const [dividerColor, setDividerColor] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [side, setSide] = useState<"front" | "back">("front");

  const frontRef = useRef<HTMLCanvasElement | null>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [qrCanvas, setQrCanvas] = useState<HTMLCanvasElement | null>(null);

  // Inject Google Fonts once
  useEffect(() => {
    const id = "bcg-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;700&family=Roboto:wght@400;500;700&family=Oswald:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // When template selected, sync colors
  useEffect(() => {
    setColors(template.colors);
  }, [template]);

  // Auto-fill QR content from website until user edits it
  useEffect(() => {
    if (!qrTouched) {
      const fallback = info.fullName
        ? `BEGIN:VCARD\nVERSION:3.0\nFN:${info.fullName}\nTEL:${info.phone}\nEMAIL:${info.email}\nEND:VCARD`
        : "";
      setInfo((p) => ({ ...p, qrContent: p.website || fallback }));
    }
  }, [info.website, info.fullName, info.phone, info.email, qrTouched]);

  // Build QR canvas off-screen whenever content/showQR changes
  useEffect(() => {
    let cancelled = false;
    if (!info.showQR) {
      setQrCanvas(null);
      return;
    }
    const c = document.createElement("canvas");
    import("qrcode").then((QRCode) =>
      QRCode.toCanvas(c, info.qrContent || "https://skycally.com", {
        width: 300,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(() => {
          if (!cancelled) setQrCanvas(c);
        })
        .catch(() => {})
    );
    return () => {
      cancelled = true;
    };
  }, [info.qrContent, info.showQR]);

  // Load logo
  useEffect(() => {
    if (!info.logoUrl) {
      setLogoImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoImg(img);
    img.src = info.logoUrl;
  }, [info.logoUrl]);

  const qrPx = qrSize === "S" ? 90 : qrSize === "L" ? 140 : 110;

  // Draw front card
  const drawFront = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = orientation === "horizontal" ? CARD_W : CARD_H;
    const H = orientation === "horizontal" ? CARD_H : CARD_W;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = colors.accent;
    ctx.fillRect(0, 0, 40, H);

    if (showDivider) {
      ctx.fillStyle = dividerColor || colors.accent;
      ctx.fillRect(60, H * 0.42, W * 0.5, 2);
    }

    // Logo
    if (logoImg) {
      const logoSize = 60;
      let lx = W - logoSize - 40;
      if (logoPos === "top-left") lx = 60;
      else if (logoPos === "top-center") lx = W / 2 - logoSize / 2;
      ctx.drawImage(logoImg, lx, 30, logoSize, logoSize);
    }

    ctx.fillStyle = colors.text;
    ctx.font = `bold ${nameSize}px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(info.fullName || "Your Name", 60, H * 0.25);

    ctx.fillStyle = colors.accent;
    ctx.font = `500 ${Math.round(nameSize * 0.45)}px ${font}`;
    ctx.fillText(info.jobTitle || "Job Title", 60, H * 0.35);

    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.7;
    ctx.font = `${infoSize + 1}px ${font}`;
    ctx.fillText(info.company || "Company Name", 60, H * 0.35 + 24);
    ctx.globalAlpha = 1;

    const items = [
      info.phone && { icon: "📞", text: info.phone },
      info.email && { icon: "✉", text: info.email },
      info.website && { icon: "🌐", text: info.website },
      info.address && { icon: "📍", text: info.address },
    ].filter(Boolean) as { icon: string; text: string }[];

    ctx.font = `${infoSize}px ${font}`;
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.85;
    items.forEach((it, i) => {
      ctx.fillText(`${it.icon}  ${it.text}`, 60, H * 0.55 + i * (infoSize + 13));
    });
    ctx.globalAlpha = 1;

    if (info.showQR && qrCanvas && qrPos !== "none") {
      const qx = qrPos === "bottom-left" ? 60 : W - qrPx - 40;
      const qy = H - qrPx - 40;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      // @ts-ignore roundRect available in modern browsers
      ctx.roundRect(qx - 8, qy - 8, qrPx + 16, qrPx + 16, 8);
      ctx.fill();
      ctx.drawImage(qrCanvas, qx, qy, qrPx, qrPx);
    } else if (info.website) {
      ctx.fillStyle = colors.accent;
      ctx.font = `bold 13px ${font}`;
      ctx.textAlign = "right";
      ctx.fillText(info.website, W - 40, H - 20);
    }
  };

  const drawBack = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = orientation === "horizontal" ? CARD_W : CARD_H;
    const H = orientation === "horizontal" ? CARD_H : CARD_W;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = colors.accent;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.05;
    for (let i = 0; i < W; i += 30) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(i, 0, 1, H);
    }
    ctx.globalAlpha = 1;

    if (logoImg) {
      const logoSize = 100;
      ctx.drawImage(logoImg, W / 2 - logoSize / 2, H / 2 - logoSize / 2 - 20, logoSize, logoSize);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px ${font}`;
    ctx.textAlign = "center";
    const nameY = logoImg ? H / 2 + 70 : H / 2 - 10;
    ctx.fillText(info.company || "Company Name", W / 2, nameY);

    if (info.website) {
      ctx.globalAlpha = 0.7;
      ctx.font = `16px ${font}`;
      ctx.fillText(info.website, W / 2, nameY + 30);
      ctx.globalAlpha = 1;
    }
  };

  // Re-render whenever any visual state changes
  useEffect(() => {
    if (step !== 3) return;
    if (frontRef.current) drawFront(frontRef.current);
    if (backRef.current) drawBack(backRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, info, colors, font, nameSize, infoSize, qrPos, qrSize, qrPx, logoPos, showDivider, dividerColor, orientation, qrCanvas, logoImg, side]);

  const handleLogo = (file: File | null) => {
    if (!file) {
      setInfo((p) => ({ ...p, logoUrl: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setInfo((p) => ({ ...p, logoUrl: url }));
  };

  const downloadCanvas = (canvas: HTMLCanvasElement | null, name: string) => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = name;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadBoth = () => {
    if (!frontRef.current || !backRef.current) return;
    const W = frontRef.current.width;
    const H = frontRef.current.height;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H * 2 + 40;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(frontRef.current, 0, 0);
    ctx.drawImage(backRef.current, 0, H + 40);
    const link = document.createElement("a");
    link.download = "business-card-both-sides.png";
    link.href = c.toDataURL("image/png");
    link.click();
  };

  return (
    <ToolPageShell
      title="Business Card Generator"
      description="Design professional business cards online — free, instant, print-ready."
    >
      {/* Step indicator */}
      <Stepper step={step} />

      {step === 1 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold mb-4">Choose a template</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTemplate(t);
                  setStep(2);
                }}
                className="text-left rounded-xl border border-border bg-card p-3 hover:border-foreground/40 transition"
              >
                <MiniPreview colors={t.colors} />
                <div className="mt-2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 space-y-6">
          <h2 className="font-display text-xl font-bold">Fill in your information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <Input
                maxLength={30}
                value={info.fullName}
                onChange={(e) => setInfo({ ...info, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </Field>
            <Field label="Job title">
              <Input
                maxLength={40}
                value={info.jobTitle}
                onChange={(e) => setInfo({ ...info, jobTitle: e.target.value })}
                placeholder="Graphic Designer"
              />
            </Field>
            <Field label="Company">
              <Input value={info.company} onChange={(e) => setInfo({ ...info, company: e.target.value })} placeholder="Acme Corp" />
            </Field>
            <Field label="Phone">
              <Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="+1 234 567 890" />
            </Field>
            <Field label="Email">
              <Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="john@acme.com" />
            </Field>
            <Field label="Website">
              <Input value={info.website} onChange={(e) => setInfo({ ...info, website: e.target.value })} placeholder="www.acme.com" />
            </Field>
            <Field label="Address">
              <Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="123 Main St, New York" />
            </Field>
            <Field label="LinkedIn (optional)">
              <Input value={info.linkedin} onChange={(e) => setInfo({ ...info, linkedin: e.target.value })} />
            </Field>
            <Field label="Instagram (optional)">
              <Input value={info.instagram} onChange={(e) => setInfo({ ...info, instagram: e.target.value })} />
            </Field>
            <Field label="Twitter (optional)">
              <Input value={info.twitter} onChange={(e) => setInfo({ ...info, twitter: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Show QR code on card</Label>
              <Switch checked={info.showQR} onCheckedChange={(v) => setInfo({ ...info, showQR: v })} />
            </div>
            {info.showQR && (
              <Field label="QR content (auto-filled from website)">
                <Input
                  value={info.qrContent}
                  onChange={(e) => {
                    setQrTouched(true);
                    setInfo({ ...info, qrContent: e.target.value });
                  }}
                />
              </Field>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <Label className="text-sm font-semibold">Logo (optional)</Label>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-4 py-3 text-sm hover:bg-secondary/40">
                <Upload className="w-4 h-4" />
                Upload logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
                />
              </label>
              {info.logoUrl && (
                <div className="flex items-center gap-2">
                  <img src={info.logoUrl} alt="logo preview" className="w-12 h-12 rounded object-contain border border-border" />
                  <Button variant="ghost" size="icon" onClick={() => handleLogo(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Preview Card <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Preview */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-center overflow-auto">
              <div className="w-full" style={{ maxWidth: orientation === "horizontal" ? 700 : 400 }}>
                <canvas
                  ref={frontRef}
                  className={side === "front" ? "block w-full h-auto rounded-lg shadow-lg" : "hidden"}
                />
                <canvas
                  ref={backRef}
                  className={side === "back" ? "block w-full h-auto rounded-lg shadow-lg" : "hidden"}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={() => setSide(side === "front" ? "back" : "front")}>
                <RotateCw className="w-4 h-4" /> Show {side === "front" ? "back" : "front"}
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={() => downloadCanvas(frontRef.current, "business-card-front.png")}>
                <Download className="w-4 h-4" /> Download Front
              </Button>
              <Button onClick={() => downloadCanvas(backRef.current, "business-card-back.png")}>
                <Download className="w-4 h-4" /> Download Back
              </Button>
              <Button variant="secondary" onClick={downloadBoth}>
                <Download className="w-4 h-4" /> Both Sides
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">📐 Print specifications</p>
              <p>• Size: 3.5″ × 2″ (standard business card)</p>
              <p>• Resolution: 300 DPI (print quality)</p>
              <p>• Format: PNG</p>
              <p>• Recommended: Add 3mm bleed when printing</p>
            </div>

            <AdZone id="business-card-below-download" size="300x250" />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4" /> Edit info
              </Button>
            </div>
          </div>

          {/* Customize panel */}
          <aside className="space-y-6 rounded-xl border border-border bg-card p-4 h-fit">
            <Section title="Colors">
              <div className="grid grid-cols-3 gap-2">
                <ColorInput label="Background" value={colors.bg} onChange={(v) => setColors({ ...colors, bg: v })} />
                <ColorInput label="Accent" value={colors.accent} onChange={(v) => setColors({ ...colors, accent: v })} />
                <ColorInput label="Text" value={colors.text} onChange={(v) => setColors({ ...colors, text: v })} />
              </div>
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Quick presets</Label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setColors(p)}
                      className="h-8 rounded-md border border-border overflow-hidden flex"
                      title={`Preset ${i + 1}`}
                    >
                      <span style={{ background: p.bg, flex: 1 }} />
                      <span style={{ background: p.accent, flex: 1 }} />
                      <span style={{ background: p.text, flex: 1 }} />
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Typography">
              <Field label="Font">
                <Select value={font} onValueChange={setFont}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`Name size: ${nameSize}px`}>
                <Slider min={24} max={48} step={1} value={[nameSize]} onValueChange={(v) => setNameSize(v[0])} />
              </Field>
              <Field label={`Info size: ${infoSize}px`}>
                <Slider min={11} max={16} step={1} value={[infoSize]} onValueChange={(v) => setInfoSize(v[0])} />
              </Field>
            </Section>

            <Section title="Layout">
              <Field label="QR position">
                <ToggleRow
                  options={[
                    { v: "bottom-left", l: "BL" },
                    { v: "bottom-right", l: "BR" },
                    { v: "none", l: "Off" },
                  ]}
                  value={qrPos}
                  onChange={(v) => setQrPos(v as QrPos)}
                />
              </Field>
              <Field label="QR size">
                <ToggleRow
                  options={[{ v: "S", l: "S" }, { v: "M", l: "M" }, { v: "L", l: "L" }]}
                  value={qrSize}
                  onChange={(v) => setQrSize(v as "S" | "M" | "L")}
                />
              </Field>
              <Field label="Logo position">
                <ToggleRow
                  options={[
                    { v: "top-left", l: "TL" },
                    { v: "top-center", l: "TC" },
                    { v: "top-right", l: "TR" },
                  ]}
                  value={logoPos}
                  onChange={(v) => setLogoPos(v as LogoPos)}
                />
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Divider line</Label>
                <Switch checked={showDivider} onCheckedChange={setShowDivider} />
              </div>
              {showDivider && (
                <ColorInput
                  label="Divider color"
                  value={dividerColor || colors.accent}
                  onChange={setDividerColor}
                />
              )}
            </Section>

            <Section title="Orientation">
              <ToggleRow
                options={[
                  { v: "horizontal", l: "Horizontal ↔" },
                  { v: "vertical", l: "Vertical ↕" },
                ]}
                value={orientation}
                onChange={(v) => setOrientation(v as Orientation)}
              />
            </Section>
          </aside>
        </section>
      )}

      <HowToUse
        steps={[
          "Choose a template that fits your style",
          "Fill in your contact information",
          "Customize colors and download print-ready PNG",
        ]}
      />
          <ToolSeoContent
        title={"Free Business Card Generator — Design & Download Online"}
        description={"Design professional business cards online for free. 8 templates, QR code integration, custom colors. Download print-ready PNG at 300 DPI. No signup needed."}
        body={[
        "Choose from 8 professionally designed templates ranging from clean minimal white to premium dark and gold. Fill in your contact details, upload your logo, and customize colors to match your brand identity.",
        "Every business card automatically includes a QR code generated from your website URL, making it easy for contacts to find you online. Download the front and back separately or combined in a single file ready for printing at standard business card size (3.5\" × 2\").",
      ]}
        faqs={[
        { question: "Are the business cards print-ready?", answer: "Yes. Cards are generated at 1050×600px which equals 300 DPI at standard business card size (3.5\"×2\"). Add 3mm bleed when sending to professional printers." },
        { question: "Can I add my company logo?", answer: "Yes. Upload any PNG or JPG logo and it will be placed on your card. Transparent PNG logos work best for a professional look." },
        { question: "Is the QR code on the business card scannable?", answer: "Yes. The QR code is generated at high error correction level ensuring it remains scannable even at small print sizes." },
        { question: "Can I download both sides of the business card?", answer: "Yes. Download the front, back, or both sides combined in a single image file for easy printing." },
      ]}
      />
      </ToolPageShell>
  );
}

// ── Sub components ──────────────────────────────────────
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Template", "Info", "Design"];
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      {labels.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${
                active ? "bg-foreground text-background border-foreground" : done ? "border-foreground/40 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[11px] font-bold">
                {n}
              </span>
              {l}
            </div>
            {i < 2 && <span className="text-muted-foreground">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border border-border bg-transparent cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-xs" />
      </div>
    </div>
  );
}

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`text-xs rounded-md py-1.5 border transition ${
            value === o.v ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function MiniPreview({ colors }: { colors: TemplateColors }) {
  return (
    <div
      className="aspect-[7/4] w-full rounded-md overflow-hidden flex"
      style={{ background: colors.bg }}
    >
      <div style={{ width: 8, background: colors.accent }} />
      <div className="flex-1 p-2 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="h-2 w-3/4 rounded" style={{ background: colors.text, opacity: 0.9 }} />
          <div className="h-1.5 w-1/2 rounded" style={{ background: colors.accent }} />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-2/3 rounded" style={{ background: colors.text, opacity: 0.5 }} />
          <div className="h-1 w-1/2 rounded" style={{ background: colors.text, opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}
