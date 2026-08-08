import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, RotateCw, History, X, Volume2, VolumeX, UserMinus } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/spinning-wheel")({
  head: () => buildToolMeta(toolBySlug("spinning-wheel", tools)),
  component: SpinningWheel,
});

const PALETTE = [
  "#06b6d4",
  "#a855f7",
  "#f97316",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#f43f5e",
  "#8b5cf6",
  "#84cc16",
];

// Web Audio sound effect
function playWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
  } catch {
    /* noop */
  }
}

function playTickSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 800;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.05);
  } catch {
    /* noop */
  }
}

function SpinningWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(420);
  const [options, setOptions] = useState<string[]>(["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [removeWinner, setRemoveWinner] = useState(false);
  const lastSegRef = useRef<number>(-1);
  const rotRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(Math.min(420, Math.floor(entry.contentRect.width) - 2));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2,
      cy = size / 2,
      r = size / 2 - 8;
    const n = Math.max(options.length, 1);
    const seg = (Math.PI * 2) / n;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      const start = i * seg - Math.PI / 2;
      // Segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Glossy sheen
      ctx.save();
      ctx.clip();
      const grad = ctx.createLinearGradient(0, -r, 0, 0);
      grad.addColorStop(0, "rgba(255,255,255,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0.05)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      // Label
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.font = `bold ${Math.max(11, Math.min(16, Math.floor(r * 0.18)))}px ui-sans-serif,system-ui,sans-serif`;
      const label = options[i] ?? "";
      const max = r - 18;
      let txt = label;
      while (ctx.measureText(txt).width > max && txt.length > 3) txt = txt.slice(0, -1);
      if (txt !== label) txt = txt.slice(0, -1) + "…";
      ctx.fillText(txt, r - 14, 5);
      ctx.restore();
    }
    ctx.restore();
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 22);
    hubGrad.addColorStop(0, "#444");
    hubGrad.addColorStop(1, "#111");
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [options, rotation, size]);

  const spin = () => {
    if (spinning || options.length < 2) return;
    setSpinning(true);
    setWinner(null);
    const n = options.length;
    const target = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenterDeg = target * seg + seg / 2;
    const turns = 6 + Math.floor(Math.random() * 4);
    const finalRotation = rotation + turns * 360 + (360 - targetCenterDeg) - (rotation % 360);
    const start = performance.now();
    const duration = 4500;
    const from = rotation;
    const delta = finalRotation - from;
    rotRef.current = from;
    lastSegRef.current = -1;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + delta * eased;
      setRotation(cur);
      rotRef.current = cur;
      // Tick sound at each segment crossing
      if (!mutedRef.current) {
        const normDeg = ((cur % 360) + 360) % 360;
        const curSeg = Math.floor(normDeg / seg);
        if (curSeg !== lastSegRef.current) {
          lastSegRef.current = curSeg;
          if (p < 0.95) playTickSound();
        }
      }
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setSpinning(false);
        setWinner(options[target]);
        setHistory((prev) => [options[target], ...prev].slice(0, 10));
        if (!mutedRef.current) playWinSound();
      }
    };
    requestAnimationFrame(tick);
  };

  const updateOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  const removeOption = (i: number) => setOptions((o) => (o.length > 2 ? o.filter((_, idx) => idx !== i) : o));
  const addOption = () => setOptions((o) => (o.length < 20 ? [...o, `Option ${o.length + 1}`] : o));

  const handleWinnerClose = (open: boolean) => {
    if (!open) {
      if (removeWinner && winner) {
        setOptions((o) => (o.length > 2 ? o.filter((x) => x !== winner) : o));
      }
      setWinner(null);
    }
  };

  return (
    <ToolPageShell
      title="Spinning Wheel"
      description="A customizable spinning wheel to make fair, random decisions. Add names or options and spin!"
      showFileDisclaimer={false}
    >
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[auto,1fr] items-start">
        {/* Wheel */}
        <div ref={containerRef} className="w-full min-w-0 max-w-full">
          <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
            {/* Pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-3 z-10 w-0 h-0"
              style={{
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: "28px solid var(--cyan-brand)",
                filter: "drop-shadow(0 2px 4px rgba(0,212,255,0.5))",
              }}
            />
            <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-full" />
          </div>
          {/* Controls */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={spin} disabled={spinning || options.length < 2} size="lg" className="px-10 text-base">
              <RotateCw className={`w-4 h-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning…" : "Spin!"}
            </Button>
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Options panel */}
        <div className="space-y-4 w-full">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Options ({options.length}/20)</h2>
              <Button variant="outline" size="sm" onClick={addOption} disabled={options.length >= 20}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-8 text-sm"
                  />
                  <button aria-label="Remove option"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {/* Remove winner toggle */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setRemoveWinner((v) => !v)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${removeWinner ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-border text-muted-foreground hover:bg-secondary"}`}
              >
                <UserMinus className="w-3.5 h-3.5" />
                Remove winner after spin
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
                <button
                  onClick={() => setHistory([])}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border bg-background/50"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: PALETTE[options.indexOf(h) % PALETTE.length] || "#888" }}
                    />
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Winner dialog */}
      <Dialog open={!!winner} onOpenChange={handleWinnerClose}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              🎉 The wheel landed on
            </DialogTitle>
          </DialogHeader>
          <p className="font-display text-4xl font-bold py-4" style={{ color: "var(--cyan-brand)" }}>
            {winner}
          </p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => setRemoveWinner((v) => !v)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${removeWinner ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-border text-muted-foreground"}`}
            >
              <UserMinus className="w-3.5 h-3.5" />
              Remove from wheel
            </button>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => handleWinnerClose(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                handleWinnerClose(false);
                setTimeout(spin, 150);
              }}
            >
              Spin again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdZone id="spinning-wheel-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Add your options — names, choices, tasks — up to 20 entries. Edit or remove any option at any time.",
          "Click Spin! and watch the wheel animate to a random result with sound effects.",
          "See the winner in a popup, optionally remove them from the wheel, and check the history panel for all past results.",
        ]}
      />

      <ToolSeoContent
        title="Spinning Wheel — Free Online Random Picker & Decision Maker"
        description="Customizable spinning wheel for random decisions. Add names, choices, or prizes — spin and get an instant unbiased result. Free, no signup, works on mobile."
        body={[
          "Skycally's Spinning Wheel is a free online random picker that makes decisions fun and fair. Add up to 20 options — names, choices, restaurants, prizes, tasks — and spin the wheel for an instant, unbiased result. Each spin is accompanied by satisfying tick sounds and a celebratory animation when the wheel stops.",
          "The wheel is fully customizable: add or remove options at any time, toggle the 'Remove winner after spin' mode to automatically eliminate each winner from future spins (perfect for raffles, drawing names, or sequential picks), and track all results in the history panel. The mute button lets you spin silently when needed.",
          "Common uses include classroom name pickers, raffle draws, team assignments, deciding where to eat, assigning chores, content brainstorming, party games, and any situation where you need a transparent, random choice that everyone can see. The large animated wheel makes the process visually engaging and removes any appearance of favoritism.",
          "Everything runs locally in your browser — your options are never sent to any server. The wheel uses a cryptographically fair random number generator to select the winner before the animation begins, so the spin result cannot be influenced by where the animation happens to stop.",
        ]}
        faqs={[
          {
            question: "Is the spin truly random?",
            answer:
              "Yes. The winner is selected using Math.random() before the animation starts, so the result is determined before the wheel begins moving. The animation is purely visual.",
          },
          {
            question: "How many options can I add?",
            answer: "Up to 20 options. For best readability on the wheel, we recommend keeping it under 12 options.",
          },
          {
            question: "What does Remove winner after spin do?",
            answer:
              "When enabled, the winning option is automatically removed from the wheel after each spin — ideal for raffles, drawing names, or any situation where you don't want the same option to win twice.",
          },
          {
            question: "Can I see past results?",
            answer:
              "Yes. The history panel below the options list shows the last 10 winners with their color indicator. Click Clear to reset the history.",
          },
          {
            question: "Can I mute the sound effects?",
            answer:
              "Yes. Click the speaker icon next to the Spin button to toggle sound on or off. The preference is applied immediately.",
          },
          {
            question: "Are my entries saved?",
            answer:
              "No. Options stay in your browser tab and are cleared when you close the page. Nothing is uploaded or stored on any server.",
          },
          {
            question: "Can I use it on mobile?",
            answer: "Yes. The wheel and controls are fully responsive and work on smartphones, tablets, and desktops.",
          },
          {
            question: "Can I spin the wheel for a class raffle?",
            answer:
              "Yes — it's one of the most popular uses. Add student names, enable Remove winner after spin, and pick winners one by one with a transparent animated draw that the whole class can see.",
          },
        ]}
      />

      <RelatedTools currentSlug="spinning-wheel" />
    </ToolPageShell>
  );
}
