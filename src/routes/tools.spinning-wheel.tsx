import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, RotateCw } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/spinning-wheel")({
  head: () => buildToolMeta(toolBySlug("spinning-wheel", tools)),
  component: SpinningWheel,
});

const PALETTE = ["#06b6d4", "#a855f7", "#f97316", "#22c55e", "#ec4899", "#eab308", "#3b82f6", "#ef4444"];
const SIZE = 420;

function SpinningWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6"]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE / 2 - 8;
    const n = Math.max(options.length, 1);
    const seg = (Math.PI * 2) / n;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      const start = i * seg - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#0b0b0f";
      ctx.font = "bold 16px ui-sans-serif, system-ui, sans-serif";
      const label = options[i] ?? "";
      const max = r - 20;
      let txt = label;
      while (ctx.measureText(txt).width > max && txt.length > 3) txt = txt.slice(0, -1);
      if (txt !== label) txt = txt.slice(0, -1) + "…";
      ctx.fillText(txt, r - 14, 6);
      ctx.restore();
    }
    ctx.restore();
    // hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0b0f";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [options, rotation]);

  const spin = () => {
    if (spinning || options.length < 2) return;
    setSpinning(true);
    setWinner(null);
    const n = options.length;
    const target = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenterDeg = target * seg + seg / 2;
    const turns = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + turns * 360 + (360 - targetCenterDeg) - (rotation % 360);
    const start = performance.now();
    const duration = 4200;
    const from = rotation;
    const delta = finalRotation - from;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setRotation(from + delta * eased);
      if (p < 1) requestAnimationFrame(tick);
      else {
        setSpinning(false);
        setWinner(options[target]);
      }
    };
    requestAnimationFrame(tick);
  };

  const updateOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  const removeOption = (i: number) => setOptions((o) => (o.length > 2 ? o.filter((_, idx) => idx !== i) : o));
  const addOption = () => setOptions((o) => (o.length < 16 ? [...o, `Option ${o.length + 1}`] : o));

  const tool = toolBySlug("spinning-wheel", tools);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="grid gap-8 md:grid-cols-[auto,1fr] items-start">
        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
          <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} className="rounded-full shadow-2xl" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-[var(--cyan-brand)] drop-shadow" />
          <div className="mt-6 flex justify-center">
            <Button onClick={spin} disabled={spinning || options.length < 2} size="lg" className="px-10 text-base">
              <RotateCw className={`w-4 h-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning…" : "Spin"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Options ({options.length})</h2>
            <Button variant="outline" size="sm" onClick={addOption} disabled={options.length >= 16}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                <Button variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={options.length <= 2}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!winner} onOpenChange={(o) => !o && setWinner(null)}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wide text-muted-foreground">The wheel landed on</DialogTitle>
          </DialogHeader>
          <p className="font-display text-4xl font-bold py-4" style={{ color: "var(--cyan-brand)" }}>{winner}</p>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setWinner(null)}>Close</Button>
            <Button onClick={() => { setWinner(null); setTimeout(spin, 100); }}>Spin again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HowToUse steps={[
        "Enter your options in the list",
        "Click Spin to rotate the wheel",
        "The winning option is highlighted when it stops",
      ]} />

      <ToolSeoContent
        title="Free Spinning Wheel — Random Decision Maker"
        description="A customizable spinning wheel to help you make fair, random decisions. Add your own options and let chance decide."
        body={[
          "Skycally's Spinning Wheel is a free online random picker that helps you make decisions when you can't make up your mind. Whether you're choosing where to eat, picking a name from a list, or running a classroom giveaway, the wheel provides a fun, transparent way to leave the choice to chance.",
          "Add as many entries as you need — names, tasks, restaurants, prizes — and watch the wheel spin smoothly to a random pick. Each segment is automatically colored, the result is unbiased, and the entire tool runs locally in your browser. Nothing is uploaded, nothing is tracked, and you can spin again as many times as you like.",
          "Use it for team standups, raffles, classroom activities, content ideas, kids' chores, or anytime you want to add a bit of suspense to a simple decision. It works on desktop and mobile and requires no signup.",
        ]}
        faqs={[
          { question: "Is the spin truly random?", answer: "Yes. The winner is selected with the browser's Math.random() before the animation starts, so the result is fair and not influenced by where the wheel happens to stop visually." },
          { question: "How many options can I add?", answer: "You can add between 2 and 16 options. For best readability we recommend keeping it under 12." },
          { question: "Are my entries saved?", answer: "No. Everything stays in your browser tab and is cleared when you close the page. We never send your options to a server." },
          { question: "Can I use it on mobile?", answer: "Yes. The wheel and controls are responsive and work on phones, tablets, and desktops." },
        ]}
      />

      <RelatedTools currentSlug="spinning-wheel" />
    </ToolPageShell>
  );
}
