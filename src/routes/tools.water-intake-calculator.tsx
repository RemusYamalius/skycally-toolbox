import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Volume2, VolumeX, RotateCcw, Minus, Plus } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/tools/water-intake-calculator")({
  head: () => buildToolMeta(toolBySlug("water-intake-calculator", tools)),
  component: WaterIntakeCalculator,
});

type Sex = "male" | "female";
type Unit = "kg" | "lbs";
type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";
type Climate = "cold" | "temperate" | "hot";

const ACTIVITY: Record<Activity, { emoji: string; label: string; desc: string; bonus: number }> = {
  sedentary: { emoji: "🛋️", label: "Sedentary", desc: "Desk job, no exercise", bonus: 0 },
  light: { emoji: "🚶", label: "Lightly Active", desc: "Walk/light exercise 1–3×/week", bonus: 350 },
  moderate: { emoji: "🏃", label: "Moderately Active", desc: "Exercise 3–5×/week", bonus: 600 },
  very: { emoji: "💪", label: "Very Active", desc: "Hard exercise 6–7×/week", bonus: 900 },
  extra: { emoji: "🔥", label: "Extra Active", desc: "Physical job + daily training", bonus: 1200 },
};

const CLIMATE: Record<Climate, { emoji: string; label: string; bonus: number }> = {
  cold: { emoji: "❄️", label: "Cold", bonus: -200 },
  temperate: { emoji: "🌤️", label: "Temperate", bonus: 0 },
  hot: { emoji: "☀️", label: "Hot", bonus: 500 },
};

const INPUTS_KEY = "water-intake-inputs";
const PROGRESS_KEY = "water-intake-progress";
const MUTED_KEY = "water-intake-muted";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
};
const playGulp = () => {
  try {
    const ctx = getCtx(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch {}
};
const playFanfare = () => {
  try {
    const ctx = getCtx(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {}
};

interface ScheduleSlot { time: string; label: string; }
function buildSchedule(glasses: number): ScheduleSlot[] {
  if (glasses < 1) return [];
  if (glasses === 1) return [{ time: "07:00", label: "🌅 Wake up — first glass before coffee" }];
  const wake = 7, sleep = 22;
  const span = sleep - wake;
  const interval = span / (glasses - 1);
  const special: Record<number, string> = {
    7: "🌅 Wake up — first glass before coffee",
    13: "🍽️ With lunch",
    19: "🍽️ With dinner",
    22: "🌙 Last glass — 1h before sleep",
  };
  const slots: ScheduleSlot[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < glasses; i++) {
    const hour = Math.round(wake + i * interval);
    const time = `${String(hour).padStart(2, "0")}:00`;
    if (seen.has(time)) continue;
    seen.add(time);
    slots.push({ time, label: special[hour] || "💧 Drink a glass" });
  }
  return slots;
}

function WaterIntakeCalculator() {
  const tool = toolBySlug("water-intake-calculator", tools);

  const [unit, setUnit] = useState<Unit>("kg");
  const [weight, setWeight] = useState("70");
  const [age, setAge] = useState("25");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [climate, setClimate] = useState<Climate>("temperate");
  const [pregnant, setPregnant] = useState(false);
  const [breastfeeding, setBreastfeeding] = useState(false);
  const [coffees, setCoffees] = useState(0);
  const [drinks, setDrinks] = useState(0);
  const [filled, setFilled] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const lastCompleteRef = useRef(false);

  // Restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INPUTS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.unit) setUnit(s.unit);
        if (s.weight) setWeight(s.weight);
        if (s.age) setAge(s.age);
        if (s.sex) setSex(s.sex);
        if (s.activity) setActivity(s.activity);
        if (s.climate) setClimate(s.climate);
        if (typeof s.pregnant === "boolean") setPregnant(s.pregnant);
        if (typeof s.breastfeeding === "boolean") setBreastfeeding(s.breastfeeding);
        if (typeof s.coffees === "number") setCoffees(s.coffees);
        if (typeof s.drinks === "number") setDrinks(s.drinks);
      }
      const prog = localStorage.getItem(PROGRESS_KEY);
      if (prog) {
        const p = JSON.parse(prog);
        if (p.date === todayStr()) {
          setFilled(p.filled || 0);
          setChecked(p.checkedTimes || []);
        } else {
          localStorage.removeItem(PROGRESS_KEY);
        }
      }
      const m = localStorage.getItem(MUTED_KEY);
      if (m) setMuted(m === "1");
    } catch {}
  }, []);

  // Persist inputs
  useEffect(() => {
    try {
      localStorage.setItem(INPUTS_KEY, JSON.stringify({
        unit, weight, age, sex, activity, climate, pregnant, breastfeeding, coffees, drinks,
      }));
    } catch {}
  }, [unit, weight, age, sex, activity, climate, pregnant, breastfeeding, coffees, drinks]);

  // Persist progress
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        date: todayStr(), filled, checkedTimes: checked,
      }));
    } catch {}
  }, [filled, checked]);

  useEffect(() => { try { localStorage.setItem(MUTED_KEY, muted ? "1" : "0"); } catch {} }, [muted]);

  // Calculation
  const calc = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const baseMl = unit === "kg" ? w * 33 : w * 0.5 * 29.5735;
    const activityB = ACTIVITY[activity].bonus;
    const climateB = CLIMATE[climate].bonus;
    const pregB = pregnant ? 300 : 0;
    const bfB = breastfeeding ? 700 : 0;
    const coffeeD = coffees * 150;
    const alcoholD = drinks * 200;
    const raw = baseMl + activityB + climateB + pregB + bfB - coffeeD - alcoholD;
    const total = Math.max(1500, Math.min(5000, Math.round(raw)));
    const glasses = Math.ceil(total / 250);
    return {
      base: Math.round(baseMl),
      activityB, climateB, pregB, bfB, coffeeD, alcoholD,
      total,
      liters: total / 1000,
      glasses,
      flOz: total / 29.5735,
    };
  }, [unit, weight, activity, climate, pregnant, breastfeeding, coffees, drinks]);

  const schedule = useMemo(() => buildSchedule(calc.glasses), [calc.glasses]);

  // Reset filled if target shrinks below it
  useEffect(() => {
    if (filled > calc.glasses) setFilled(calc.glasses);
  }, [calc.glasses, filled]);

  // Completion celebration
  useEffect(() => {
    const complete = calc.glasses > 0 && filled >= calc.glasses;
    if (complete && !lastCompleteRef.current) {
      lastCompleteRef.current = true;
      setShowConfetti(true);
      if (!muted) playFanfare();
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
    if (!complete) lastCompleteRef.current = false;
  }, [filled, calc.glasses, muted]);

  const handleGlassClick = useCallback((idx: number) => {
    setFilled((cur) => {
      const next = idx + 1 <= cur ? idx : idx + 1;
      if (next > cur && !muted) playGulp();
      return next;
    });
  }, [muted]);

  const toggleCheck = (time: string) => {
    setChecked((c) => c.includes(time) ? c.filter((t) => t !== time) : [...c, time]);
  };

  const resetProgress = () => {
    setFilled(0); setChecked([]);
    lastCompleteRef.current = false;
  };

  const toggleUnit = () => {
    const w = parseFloat(weight) || 0;
    if (unit === "kg") {
      setUnit("lbs");
      setWeight(String(Math.round(w * 2.20462)));
    } else {
      setUnit("kg");
      setWeight(String(Math.round(w / 2.20462)));
    }
  };

  const chips = useMemo(() => {
    const arr: { label: string; value: string; tone: "good" | "bad" | "neutral" }[] = [];
    arr.push({ label: `Base (${weight}${unit})`, value: `+${calc.base.toLocaleString()} ml`, tone: "good" });
    if (calc.activityB) arr.push({ label: `${ACTIVITY[activity].emoji} ${ACTIVITY[activity].label}`, value: `+${calc.activityB} ml`, tone: "good" });
    if (calc.climateB !== 0) arr.push({ label: `${CLIMATE[climate].emoji} ${CLIMATE[climate].label} climate`, value: `${calc.climateB > 0 ? "+" : ""}${calc.climateB} ml`, tone: calc.climateB > 0 ? "good" : "neutral" });
    if (calc.pregB) arr.push({ label: `🤰 Pregnant`, value: `+${calc.pregB} ml`, tone: "good" });
    if (calc.bfB) arr.push({ label: `🤱 Breastfeeding`, value: `+${calc.bfB} ml`, tone: "good" });
    if (calc.coffeeD) arr.push({ label: `☕ Coffee ×${coffees}`, value: `−${calc.coffeeD} ml`, tone: "bad" });
    if (calc.alcoholD) arr.push({ label: `🍺 Alcohol ×${drinks}`, value: `−${calc.alcoholD} ml`, tone: "bad" });
    return arr;
  }, [calc, activity, climate, coffees, drinks, weight, unit]);

  const glassesShown = Math.min(calc.glasses, 16);
  const filledMl = filled * 250;
  const progressPct = calc.glasses > 0 ? Math.min(100, (filled / calc.glasses) * 100) : 0;

  // Confetti particles
  const confettiPieces = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.5 + Math.random() * 1.2,
      color: ["#22d3ee", "#3b82f6", "#06b6d4", "#0ea5e9", "#67e8f9"][i % 5],
      rot: Math.random() * 360,
    })), []);

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <style>{`
        @keyframes water-ripple { 0% { transform: translate(-50%, -50%) scale(0); opacity: .55; } 100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; } }
        .wi-ripple::before, .wi-ripple::after {
          content: ""; position: absolute; left: 50%; top: 50%;
          width: 220px; height: 220px; border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          animation: water-ripple 3.4s ease-out infinite;
          pointer-events: none;
        }
        .wi-ripple::after { animation-delay: 1.7s; }
        @keyframes wi-fill { from { transform: translateY(100%); } to { transform: translateY(var(--wi-fill, 0%)); } }
        .wi-glass-fill { transition: transform .5s cubic-bezier(.4,1.6,.5,1); }
        @keyframes wi-confetti { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(420px) rotate(720deg); opacity: 0; } }
      `}</style>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        {/* INPUTS */}
        <div className="space-y-5">
          {/* Weight + unit */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Weight</label>
            <div className="mt-2 flex gap-2">
              <Input type="number" min={20} max={500} inputMode="decimal"
                value={weight} onChange={(e) => setWeight(e.target.value)}
                className="text-lg font-semibold" />
              <button type="button" onClick={toggleUnit}
                className="shrink-0 rounded-md border border-border bg-secondary px-4 text-sm font-semibold hover:bg-secondary/70 transition-colors">
                {unit}
              </button>
            </div>
          </section>

          {/* Age + Sex */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Age</label>
              <Input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)}
                className="mt-2 text-lg font-semibold" />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sex</label>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-md bg-secondary p-1">
                {(["male", "female"] as Sex[]).map((s) => (
                  <button key={s} type="button" onClick={() => setSex(s)}
                    className={`rounded px-2 py-1.5 text-sm font-medium capitalize transition-colors ${sex === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Activity */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity Level</label>
            <div className="mt-3 grid gap-2">
              {(Object.keys(ACTIVITY) as Activity[]).map((k) => {
                const a = ACTIVITY[k];
                const on = activity === k;
                return (
                  <button key={k} type="button" onClick={() => setActivity(k)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${on ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)]" : "border-border hover:border-muted-foreground/40"}`}>
                    <span className="text-2xl" aria-hidden>{a.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{a.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">{a.desc}</span>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{a.bonus >= 0 ? "+" : ""}{a.bonus}ml</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Climate */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Climate</label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(Object.keys(CLIMATE) as Climate[]).map((k) => {
                const c = CLIMATE[k];
                const on = climate === k;
                return (
                  <button key={k} type="button" onClick={() => setClimate(k)}
                    className={`rounded-xl border p-3 text-center transition-all ${on ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)]" : "border-border hover:border-muted-foreground/40"}`}>
                    <div className="text-2xl" aria-hidden>{c.emoji}</div>
                    <div className="mt-1 text-xs font-semibold">{c.label}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{c.bonus >= 0 ? "+" : ""}{c.bonus}ml</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Special conditions (female only) */}
          {sex === "female" && (
            <section className="rounded-2xl border border-border bg-card/60 p-5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Special Conditions</label>
              <div className="mt-3 grid gap-2">
                <label className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-all ${pregnant ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)]" : "border-border"}`}>
                  <span className="flex items-center gap-2 text-sm font-medium"><span aria-hidden>🤰</span> Pregnant</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">+300ml</span>
                    <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="h-4 w-4" />
                  </span>
                </label>
                <label className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-all ${breastfeeding ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)]" : "border-border"}`}>
                  <span className="flex items-center gap-2 text-sm font-medium"><span aria-hidden>🤱</span> Breastfeeding</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">+700ml</span>
                    <input type="checkbox" checked={breastfeeding} onChange={(e) => setBreastfeeding(e.target.checked)} className="h-4 w-4" />
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Dehydrating */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dehydrating Factors</label>
            <Stepper icon="☕" label="Coffees / day" hint="−150 ml each" value={coffees} setValue={setCoffees} />
            <Stepper icon="🍺" label="Alcoholic drinks / day" hint="−200 ml each" value={drinks} setValue={setDrinks} />
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="wi-ripple relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl"
            style={{ background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)" }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                <Droplets className="h-4 w-4" /> Your Daily Water Target
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-6xl font-bold tabular-nums tracking-tight">{calc.total.toLocaleString()}</span>
                <span className="text-2xl font-semibold opacity-90">ml</span>
              </div>
              <div className="mt-2 text-sm opacity-90">
                {calc.liters.toFixed(2)} L · {calc.glasses} glasses · {calc.flOz.toFixed(1)} fl oz
              </div>
            </div>
          </motion.div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: c.tone === "good" ? "color-mix(in oklab, var(--green-brand) 40%, transparent)" : c.tone === "bad" ? "color-mix(in oklab, #ef4444 40%, transparent)" : "var(--border)",
                  background: c.tone === "good" ? "color-mix(in oklab, var(--green-brand) 12%, transparent)" : c.tone === "bad" ? "color-mix(in oklab, #ef4444 12%, transparent)" : "var(--secondary)",
                }}>
                <span>{c.label}</span>
                <span className="font-mono opacity-80">{c.value}</span>
              </span>
            ))}
          </div>

          {/* Glass tracker */}
          <section className="relative rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-lg font-bold">💧 Interactive Glass Tracker</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary hover:bg-secondary/70 transition-colors">
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button type="button" onClick={resetProgress}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 h-8 text-xs font-medium hover:bg-secondary/70 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: glassesShown }).map((_, i) => {
                const isFilled = i < filled;
                return (
                  <button key={i} type="button" onClick={() => handleGlassClick(i)}
                    aria-label={`Glass ${i + 1} ${isFilled ? "filled" : "empty"}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-b-xl rounded-t-md border-2 border-cyan-400/40 bg-white/5 hover:border-cyan-400 transition-all">
                    <div
                      className="wi-glass-fill absolute inset-0"
                      style={{
                        background: "linear-gradient(180deg, #67e8f9 0%, #0891b2 100%)",
                        transform: isFilled ? "translateY(0%)" : "translateY(100%)",
                      }}
                    />
                    <div className="absolute inset-x-0 top-1 mx-auto h-1 w-3/4 rounded-full bg-white/30" />
                  </button>
                );
              })}
            </div>
            {calc.glasses > 16 && (
              <p className="mt-3 text-xs text-muted-foreground">Showing 16 of {calc.glasses} glasses — click to fill.</p>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm font-medium mb-1.5">
                <span>{filled} / {calc.glasses} glasses</span>
                <span className="text-muted-foreground">{filledMl} / {calc.total} ml</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #06b6d4, #22d3ee)" }} />
              </div>
            </div>

            {/* Confetti */}
            <AnimatePresence>
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {confettiPieces.map((p) => (
                    <span key={p.id}
                      style={{
                        position: "absolute", top: 0, left: `${p.left}%`,
                        width: 8, height: 12, background: p.color,
                        borderRadius: 2,
                        animation: `wi-confetti ${p.duration}s ease-out ${p.delay}s forwards`,
                        transform: `rotate(${p.rot}deg)`,
                      }} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </section>

          {/* Schedule */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <h2 className="font-display text-lg font-bold mb-4">⏰ Hydration Schedule</h2>
            <ol className="relative space-y-1">
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" aria-hidden />
              {schedule.map((s) => {
                const on = checked.includes(s.time);
                return (
                  <li key={s.time} className="relative flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                    <input type="checkbox" checked={on} onChange={() => toggleCheck(s.time)}
                      className="relative z-10 h-4 w-4 accent-cyan-500" />
                    <span className="font-mono text-sm font-semibold w-14 tabular-nums">{s.time}</span>
                    <span className={`text-sm ${on ? "line-through text-muted-foreground" : ""}`}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Tips */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <h2 className="font-display text-lg font-bold mb-3">💡 Personalized Tips</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>🌅 Start every morning with a full glass of water before your first coffee.</li>
              {(activity === "moderate" || activity === "very" || activity === "extra") && (
                <li>
                  🏃 Drink 500 ml before your workout and 250 ml every 20 minutes during exercise.{" "}
                  <Link to="/tools/calorie-calculator" className="text-[var(--cyan-brand)] underline-offset-2 hover:underline">Also calculate your daily calorie needs →</Link>
                </li>
              )}
              {coffees >= 2 && (
                <li>☕ Each coffee dehydrates you by ~150 ml net. Add an extra glass per cup.</li>
              )}
              {(pregnant || breastfeeding) && (
                <li>🤰 Sip frequently in small amounts rather than large quantities at once.</li>
              )}
              <li>
                💤 Dehydration affects sleep quality.{" "}
                <Link to="/tools/sleep-calculator" className="text-[var(--cyan-brand)] underline-offset-2 hover:underline">Calculate your ideal sleep time →</Link>
              </li>
              <li>
                🥗 Pair hydration with a complete nutrition plan —{" "}
                <Link to="/tools/calorie-calculator" className="text-[var(--cyan-brand)] underline-offset-2 hover:underline">Calorie Calculator</Link>{" "}and{" "}
                <Link to="/tools/bmi-calculator" className="text-[var(--cyan-brand)] underline-offset-2 hover:underline">BMI Calculator</Link>.
              </li>
            </ul>
          </section>

          <p className="text-xs text-muted-foreground">
            ⚠️ This calculator provides general guidance only and is not a substitute for medical advice. Consult a healthcare professional for personalized hydration recommendations, especially during pregnancy, illness, or when taking medications.
          </p>
        </div>
      </div>

      <AdZone id="water-intake-calculator-mid" size="728x90" />

      <HowToUse steps={[
        "Enter your weight, age, sex, activity level, climate, and any special conditions like pregnancy or coffee intake.",
        "See your personalized daily water target in ml, liters, glasses, and fl oz — with a breakdown of every factor.",
        "Track your intake by clicking the glass icons (hear a satisfying gulp sound!). Follow the smart hydration schedule. Reach your goal for a celebration!",
      ]} />

      <ToolSeoContent
        title="Free Water Intake Calculator — How Much Water Should You Drink Per Day?"
        description="Calculate your personalized daily water intake based on weight, activity, climate, and special conditions. Interactive glass tracker, daily schedule, and sound effects. Free, no signup."
        body={[
          "Skycally's Water Intake Calculator gives you a precise, personalized daily hydration target based on your body weight, age, activity level, climate, and special conditions like pregnancy or breastfeeding. The international standard of 33ml per kilogram of body weight serves as the base, then real-world adjustments are applied for every factor — including dehydrating factors like coffee and alcohol that most calculators ignore.",
          "Unlike the generic '8 glasses a day' rule, this calculator adapts to you individually. A sedentary office worker in a cold climate needs far less water than an athlete training daily in hot weather. Coffee and alcohol are factored in as net dehydrating elements — each coffee costs approximately 150ml, each alcoholic drink approximately 200ml. Pair it with our Calorie Calculator for a complete daily nutrition plan.",
          "The interactive glass tracker turns your daily goal into a visual, satisfying habit. Click to fill a glass and hear a satisfying water gulp sound effect powered by the Web Audio API. When you complete your goal, a confetti animation and success fanfare celebrate your achievement — making hydration genuinely rewarding rather than a chore.",
          "The smart hydration schedule distributes your daily glasses across your waking hours — from a wake-up glass at 7:00 AM to a final glass before sleep — with contextual labels for meals and key hydration moments. No other free water calculator offers this feature. All data resets automatically at midnight. Dehydration affects energy, focus, skin health, and sleep quality — see our Sleep Calculator for more on optimizing your recovery.",
        ]}
        faqs={[
          { question: "How much water should I drink per day?", answer: "The standard formula is 33ml per kilogram of body weight as a baseline, adjusted for activity level (+350 to +1200 ml), climate (up to +500 ml in heat), and special conditions like pregnancy (+300 ml) or breastfeeding (+700 ml)." },
          { question: "Does coffee count toward my water intake?", answer: "Coffee has a mild diuretic effect. This calculator deducts approximately 150ml net hydration per cup of coffee, meaning you need extra water to compensate for each cup consumed." },
          { question: "How does climate affect water needs?", answer: "Hot weather increases sweating significantly. This calculator adds 500ml for hot climates and subtracts 200ml for cold climates where sweat loss is minimal." },
          { question: "Is the 8 glasses a day rule accurate?", answer: "No. The '8 glasses (2L) a day' rule ignores individual factors. A 50kg sedentary person needs far less than a 90kg athlete. This calculator uses weight-based formulas for a more accurate estimate." },
          { question: "What is the hydration schedule?", answer: "The smart schedule distributes your daily glass count across waking hours (7AM–10PM), with special labels for wake-up, meals, and bedtime. Checkboxes let you tick off each glass throughout the day." },
          { question: "How much extra water do I need during pregnancy?", answer: "During pregnancy, fluid needs increase by approximately 300ml per day. During breastfeeding, the increase is approximately 700ml per day to support milk production." },
          { question: "Does alcohol affect hydration?", answer: "Yes. Alcohol is a diuretic. Each alcoholic drink causes a net deficit of approximately 200ml, meaning you need extra water to compensate." },
          { question: "Is my data saved between visits?", answer: "Yes. Your inputs and daily glass count are saved in localStorage and reset automatically at midnight each day. Nothing is stored on any server." },
        ]}
      />

      <RelatedTools currentSlug="water-intake-calculator" />
    </ToolPageShell>
  );
}

interface StepperProps { icon: string; label: string; hint: string; value: number; setValue: (n: number) => void; }
function Stepper({ icon, label, hint, value, setValue }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium flex items-center gap-2"><span aria-hidden>{icon}</span> {label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Decrease"
          onClick={() => setValue(Math.max(0, value - 1))}
          className="h-8 w-8 rounded-md border border-border bg-secondary inline-flex items-center justify-center hover:bg-secondary/70 transition-colors">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-mono font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label="Increase"
          onClick={() => setValue(Math.min(10, value + 1))}
          className="h-8 w-8 rounded-md border border-border bg-secondary inline-flex items-center justify-center hover:bg-secondary/70 transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
