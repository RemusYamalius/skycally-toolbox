import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HeartPulse, Volume2, VolumeX, Share2, AlertTriangle, AlertCircle, Info } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import {
  MHR_FORMULAS,
  ZONES,
  AGE_MIN_WARN,
  AGE_MAX_WARN,
  AGE_MIN_INPUT,
  AGE_MAX_INPUT,
  MHR_MIN_WARN,
  MHR_MIN_INPUT,
  MHR_MAX_INPUT,
  RHR_MIN_INPUT,
  RHR_MAX_INPUT,
  DEBOUNCE_MS,
  TONE_DURATION_S,
  TONE_PEAK_GAIN,
  STORAGE_INPUTS,
  STORAGE_MUTED,
  type MhrFormulaId,
} from "@/lib/heart-rate/constants";

export const Route = createFileRoute("/tools/heart-rate-zone-calculator")({
  head: () => buildToolMeta(toolBySlug("heart-rate-zone-calculator", tools)),
  component: HeartRateZoneCalculator,
});

type Sex = "male" | "female";
type Method = "mhr" | "karvonen";

// ---------- Web Audio (singleton) ----------
let _ctx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
  }
  return _ctx;
};

const playTone = (hz: number): void => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, ctx.currentTime);
    g.gain.setValueAtTime(TONE_PEAK_GAIN, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + TONE_DURATION_S);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + TONE_DURATION_S + 0.02);
  } catch {
    /* silent */
  }
};

// ---------- Debounce hook ----------
function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface SavedInputs {
  age: string;
  sex: Sex;
  formulaId: MhrFormulaId;
  manualMhr: string;
  rhr: string;
  method: Method;
}

// ─── Inline link helper ───────────────────────────────────────────────────────
// ToolSeoContent accepts ReactNode in body/faq answers, so we can embed <a> tags
// directly inside the strings using JSX fragments. The helper keeps things DRY.
const InternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
    {children}
  </a>
);
// ─────────────────────────────────────────────────────────────────────────────

function HeartRateZoneCalculator() {
  const tool = toolBySlug("heart-rate-zone-calculator", tools);

  const [age, setAge] = useState("30");
  const [sex, setSex] = useState<Sex>("male");
  const [formulaId, setFormulaId] = useState<MhrFormulaId>("tanaka");
  const [manualMhr, setManualMhr] = useState("");
  const [rhr, setRhr] = useState("");
  const [method, setMethod] = useState<Method>("mhr");
  const [muted, setMuted] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  // Restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_INPUTS);
      if (raw) {
        const s = JSON.parse(raw) as Partial<SavedInputs>;
        if (s.age) setAge(s.age);
        if (s.sex === "male" || s.sex === "female") setSex(s.sex);
        if (s.formulaId && (s.formulaId in MHR_FORMULAS || s.formulaId === "manual")) setFormulaId(s.formulaId);
        if (typeof s.manualMhr === "string") setManualMhr(s.manualMhr);
        if (typeof s.rhr === "string") setRhr(s.rhr);
        if (s.method === "mhr" || s.method === "karvonen") setMethod(s.method);
      }
      const m = localStorage.getItem(STORAGE_MUTED);
      if (m) setMuted(m === "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      const payload: SavedInputs = { age, sex, formulaId, manualMhr, rhr, method };
      localStorage.setItem(STORAGE_INPUTS, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [age, sex, formulaId, manualMhr, rhr, method]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MUTED, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  // Debounced source values
  const dAge = useDebouncedValue(age, DEBOUNCE_MS);
  const dFormula = useDebouncedValue(formulaId, DEBOUNCE_MS);
  const dManual = useDebouncedValue(manualMhr, DEBOUNCE_MS);
  const dRhr = useDebouncedValue(rhr, DEBOUNCE_MS);
  const dMethod = useDebouncedValue(method, DEBOUNCE_MS);

  // Derived numbers
  const ageNum = useMemo(() => {
    const n = parseFloat(dAge);
    return Number.isFinite(n) ? n : NaN;
  }, [dAge]);

  const rhrNum = useMemo(() => {
    if (dRhr.trim() === "") return NaN;
    const n = parseFloat(dRhr);
    return Number.isFinite(n) ? n : NaN;
  }, [dRhr]);

  const mhr = useMemo(() => {
    if (dFormula === "manual") {
      const n = parseFloat(dManual);
      return Number.isFinite(n) ? n : NaN;
    }
    if (!Number.isFinite(ageNum)) return NaN;
    return MHR_FORMULAS[dFormula].fn(ageNum);
  }, [dFormula, dManual, ageNum]);

  const hasRhr = Number.isFinite(rhrNum);
  const karvonenAvailable = hasRhr && Number.isFinite(mhr) && rhrNum < mhr;
  const effectiveMethod: Method = dMethod === "karvonen" && karvonenAvailable ? "karvonen" : "mhr";

  // Warnings / errors
  const warnings: string[] = [];
  const errors: string[] = [];

  if (dFormula !== "manual" && Number.isFinite(ageNum) && (ageNum < AGE_MIN_WARN || ageNum > AGE_MAX_WARN)) {
    warnings.push(`Formulas are validated for ages ${AGE_MIN_WARN}–${AGE_MAX_WARN}. Your result may be less accurate.`);
  }
  if (Number.isFinite(mhr) && mhr < MHR_MIN_WARN) {
    warnings.push("Unusually low maximum heart rate — double-check your inputs.");
  }
  if (hasRhr && Number.isFinite(mhr) && rhrNum >= mhr) {
    errors.push("Resting heart rate must be lower than maximum heart rate.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Zone rows
  // pctLow / pctHigh preserve the original ZONES fractions (e.g. 0.50, 0.60)
  // so the "% Intensity" column always shows correct values like "50–60%",
  // regardless of the BPM values computed for the chosen method.
  // ─────────────────────────────────────────────────────────────────────────
  const zoneRows = useMemo(() => {
    if (!Number.isFinite(mhr)) return [];
    return ZONES.map((z) => {
      const pctLow = z.low;
      const pctHigh = z.high;

      let bpmLow: number;
      let bpmHigh: number;

      if (effectiveMethod === "karvonen" && hasRhr) {
        const hrr = mhr - rhrNum;
        bpmLow = Math.round(hrr * pctLow + rhrNum);
        bpmHigh = Math.round(hrr * pctHigh + rhrNum);
      } else {
        bpmLow = Math.round(mhr * pctLow);
        bpmHigh = Math.round(mhr * pctHigh);
      }

      return { ...z, low: bpmLow, high: bpmHigh, pctLow, pctHigh };
    });
  }, [mhr, effectiveMethod, hasRhr, rhrNum]);

  const handleZoneActivate = useCallback(
    (toneHz: number) => {
      if (!muted) playTone(toneHz);
    },
    [muted],
  );

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = "Heart Rate Zone Calculator — Skycally";
    const text = Number.isFinite(mhr)
      ? `My max heart rate is ${Math.round(mhr)} BPM. Calculate yours:`
      : "Calculate your training heart-rate zones:";
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, text, url });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(null), 1800);
    } catch {
      setShareMsg("Copy failed");
      setTimeout(() => setShareMsg(null), 1800);
    }
  };

  const mhrDisplay = Number.isFinite(mhr) ? Math.round(mhr) : "—";
  const rhrDisplay = hasRhr ? Math.round(rhrNum) : null;
  const methodLabel = effectiveMethod === "karvonen" ? "Karvonen (HRR)" : "% of MHR";

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <style>{`
        @keyframes hr-pulse {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.18); }
          30% { transform: scale(1); }
          45% { transform: scale(1.12); }
          60% { transform: scale(1); }
        }
        .hr-heart { animation: hr-pulse 1.2s ease-in-out infinite; transform-origin: center; }
        .hr-zone-row:focus-visible {
          outline: 2px solid var(--ring, #94a3b8);
          outline-offset: 2px;
        }
      `}</style>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        {/* ============ INPUTS ============ */}
        <div className="space-y-5">
          {/* Age + Sex */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <label htmlFor="hr-age" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Age
              </label>
              <Input
                id="hr-age"
                type="number"
                inputMode="numeric"
                min={AGE_MIN_INPUT}
                max={AGE_MAX_INPUT}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-2 text-lg font-semibold"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sex</span>
              <div
                role="radiogroup"
                aria-label="Sex"
                className="mt-2 grid grid-cols-2 gap-1.5 rounded-md bg-secondary p-1"
              >
                {(["male", "female"] as Sex[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={sex === s}
                    onClick={() => setSex(s)}
                    className={`rounded px-2 py-1.5 text-sm font-medium capitalize transition-colors ${
                      sex === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Formula */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <label htmlFor="hr-formula" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Maximum Heart Rate Formula
            </label>
            <select
              id="hr-formula"
              value={formulaId}
              onChange={(e) => setFormulaId(e.target.value as MhrFormulaId)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.values(MHR_FORMULAS).map((f) => (
                <option key={f.id} value={f.id} disabled={f.id === "gulati" && sex === "male"}>
                  {f.label} — {f.short}
                </option>
              ))}
              <option value="manual">Manual override (I know my MHR)</option>
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {formulaId === "manual"
                ? "Enter your measured or lab-tested MHR below."
                : MHR_FORMULAS[formulaId].description}
            </p>
            {formulaId === "manual" && (
              <div className="mt-3">
                <label
                  htmlFor="hr-manual"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Your max HR (BPM)
                </label>
                <Input
                  id="hr-manual"
                  type="number"
                  inputMode="numeric"
                  min={MHR_MIN_INPUT}
                  max={MHR_MAX_INPUT}
                  value={manualMhr}
                  onChange={(e) => setManualMhr(e.target.value)}
                  placeholder="e.g. 188"
                  className="mt-2 text-lg font-semibold"
                />
              </div>
            )}
          </section>

          {/* Resting HR */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <label htmlFor="hr-rhr" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resting Heart Rate{" "}
              <span className="text-muted-foreground/70 normal-case">(optional — enables Karvonen)</span>
            </label>
            <Input
              id="hr-rhr"
              type="number"
              inputMode="numeric"
              min={RHR_MIN_INPUT}
              max={RHR_MAX_INPUT}
              value={rhr}
              onChange={(e) => setRhr(e.target.value)}
              placeholder="e.g. 60"
              className="mt-2 text-lg font-semibold"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Measure first thing in the morning before getting out of bed for the most accurate reading.
            </p>
          </section>

          {/* Method */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Calculation Method
            </span>
            <div
              role="radiogroup"
              aria-label="Calculation method"
              className="mt-2 grid grid-cols-2 gap-1.5 rounded-md bg-secondary p-1"
            >
              {(
                [
                  { id: "mhr", label: "% of MHR" },
                  { id: "karvonen", label: "Karvonen (HRR)" },
                ] as { id: Method; label: string }[]
              ).map((m) => {
                const disabled = m.id === "karvonen" && !karvonenAvailable;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={method === m.id}
                    aria-disabled={disabled}
                    disabled={disabled}
                    onClick={() => setMethod(m.id)}
                    title={disabled ? "Enter a valid Resting HR to enable Karvonen" : undefined}
                    className={`rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                      method === m.id && !disabled
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground inline-flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Karvonen uses Heart Rate Reserve (MHR − RHR) and is generally more accurate when you know your resting
                heart rate.
              </span>
            </p>
          </section>
        </div>

        {/* ============ RESULTS ============ */}
        <div className="space-y-5">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Maximum Heart Rate</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-5xl sm:text-6xl font-bold tabular-nums">{mhrDisplay}</span>
                  <span className="text-xl font-medium opacity-90">BPM</span>
                </div>
                <div className="mt-2 text-sm opacity-90">
                  Method: <span className="font-semibold">{methodLabel}</span>
                  {formulaId !== "manual" && Number.isFinite(mhr) && (
                    <> · {MHR_FORMULAS[formulaId as Exclude<MhrFormulaId, "manual">].short}</>
                  )}
                  {rhrDisplay !== null && <> · RHR {rhrDisplay} BPM</>}
                </div>
              </div>
              <HeartPulse className="hr-heart w-14 h-14 shrink-0 opacity-90" aria-hidden="true" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold transition-colors backdrop-blur-sm"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                Share this tool
              </button>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={muted}
                aria-label={muted ? "Unmute zone tones" : "Mute zone tones"}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold transition-colors backdrop-blur-sm"
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {muted ? "Muted" : "Sound on"}
              </button>
              {shareMsg && <span className="text-xs font-medium opacity-95">{shareMsg}</span>}
            </div>
          </motion.section>

          {/* Warnings / errors */}
          {(warnings.length > 0 || errors.length > 0) && (
            <div className="space-y-2">
              {errors.map((e, i) => (
                <div
                  key={`err-${i}`}
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{e}</span>
                </div>
              ))}
              {warnings.map((w, i) => (
                <div
                  key={`warn-${i}`}
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stacked bar */}
          {zoneRows.length > 0 && errors.length === 0 && (
            <section aria-label="Zone scale" className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {zoneRows.map((z) => (
                  <div
                    key={z.id}
                    className="h-full"
                    style={{ background: z.color, width: `${(z.pctHigh - z.pctLow) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>50%</span>
                <span>60%</span>
                <span>70%</span>
                <span>80%</span>
                <span>90%</span>
                <span>100%</span>
              </div>
            </section>
          )}

          {/* Zone table */}
          {zoneRows.length > 0 && errors.length === 0 && (
            <section className="rounded-2xl border border-border bg-card/60 p-2 sm:p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Training heart-rate zones</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-2 py-2">
                      Zone
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Range (BPM)
                    </th>
                    <th scope="col" className="px-2 py-2 hidden sm:table-cell">
                      % Intensity
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map((z) => (
                    <tr key={z.id} className="border-t border-border/60">
                      <td className="p-1">
                        <button
                          type="button"
                          onClick={() => handleZoneActivate(z.toneHz)}
                          className="hr-zone-row w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-secondary/60 transition-colors"
                          aria-label={`Play tone for zone ${z.id}: ${z.name}`}
                        >
                          <span
                            className="inline-block w-3 h-3 rounded-sm shrink-0"
                            style={{ background: z.color }}
                            aria-hidden="true"
                          />
                          <span className="font-semibold">Z{z.id}</span>
                          <span className="text-muted-foreground hidden sm:inline">· {z.name}</span>
                        </button>
                      </td>
                      <td className="px-2 py-2 font-mono tabular-nums">
                        {z.low}–{z.high}
                      </td>
                      {/*
                       * % Intensity — always from the original zone fractions
                       * (pctLow/pctHigh), never from the computed BPM values.
                       */}
                      <td className="px-2 py-2 font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                        {Math.round(z.pctLow * 100)}–{Math.round(z.pctHigh * 100)}%
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{z.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>Medical disclaimer:</strong> These calculations are estimates for general fitness reference only and
            are not medical advice. Consult a qualified physician before starting any new exercise program, especially
            if you have a heart condition or take medication that affects heart rate.
          </p>
        </div>
      </div>

      {/* ── Ad slot (mid-page) ── */}
      <AdZone id="heart-rate-zone-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter your age, then pick a maximum heart rate formula (Tanaka is recommended for most adults).",
          "Optionally add your resting heart rate to unlock the more accurate Karvonen (HRR) method.",
          "Read your five training zones and tap any row to hear its reference tone.",
        ]}
      />

      <ToolSeoContent
        title="Free Heart Rate Zone Calculator — MHR, HRR & 5-Zone Training"
        description="Calculate your maximum heart rate and the five training zones using Tanaka, Fox, Gulati, Nes or the Karvonen (HRR) formula. Free, private, and runs entirely in your browser."
        body={[
          // ── Paragraph 1 ──────────────────────────────────────────────────
          <>
            Heart-rate zone training is the most reliable way to make sure every workout is doing what you want it to do
            — burn fat, build base endurance, push your aerobic ceiling or recover. This calculator estimates your
            maximum heart rate (MHR) using your age and one of four validated formulas: Tanaka (208 − 0.7 × age) for
            adults of all ages, the classic Fox (220 − age), Gulati for women, and Nes for healthy adults. You can also
            enter your own measured MHR for the most accurate result. Pair your zones with a full nutrition plan using
            our <InternalLink href="/tools/calorie-calculator">Calorie Calculator</InternalLink> to align your fuelling
            strategy with each training intensity.
          </>,

          // ── Paragraph 2 ──────────────────────────────────────────────────
          <>
            When you add your resting heart rate (RHR), the calculator unlocks the Karvonen method, which uses Heart
            Rate Reserve — the gap between your maximum and resting heart rates — to personalise each zone. Karvonen is
            generally more accurate than the plain percentage-of-MHR method, especially for fit athletes whose resting
            heart rate sits well below the population average. Staying well-hydrated also directly affects your heart
            rate at any given effort — use our{" "}
            <InternalLink href="/tools/water-intake-calculator">Water Intake Calculator</InternalLink> to set a precise
            daily fluid target before your next session.
          </>,

          // ── Paragraph 3 ──────────────────────────────────────────────────
          <>
            All five zones are shown with their BPM range, intensity percentage and training purpose, from Zone 1
            (warm-up &amp; recovery) through Zone 5 (VO₂ max). Tap any row to play a short reference tone so you can
            memorise how each effort level feels. Everything runs locally — your inputs never leave your device. For a
            complete picture of your body composition alongside your training zones, check the{" "}
            <InternalLink href="/tools/bmi-calculator">BMI Calculator</InternalLink>.
          </>,

          // ── Paragraph 4 ──────────────────────────────────────────────────
          <>
            Heart-rate zones are not static — they shift as your cardiovascular fitness improves. A beginner runner may
            find Zone 2 feels genuinely comfortable at 120 BPM, while a trained athlete's Zone 2 ceiling can sit 20–30
            BPM higher for the same physiological output. Re-run this calculator every 8–12 weeks, or after any
            significant change in your training volume or intensity, to keep your zones calibrated. Recovery is just as
            important as training — see our <InternalLink href="/tools/sleep-calculator">Sleep Calculator</InternalLink>{" "}
            to optimise the rest that makes your hard sessions count.
          </>,
        ]}
        faqs={[
          // ── Original 4 ──────────────────────────────────────────────────
          {
            question: "Tanaka vs 220 − age — which formula should I use?",
            answer:
              "Tanaka (208 − 0.7 × age) is the modern recommendation. The classic 220 − age (Fox) is easy to remember but tends to overestimate MHR for younger adults and underestimate it for older adults. For women specifically, the Gulati formula (206 − 0.88 × age) has been shown to fit better.",
          },
          {
            question: "Why does entering my resting heart rate matter?",
            answer:
              "It enables the Karvonen (Heart Rate Reserve) method. Karvonen scales each zone against the range between your resting and maximum heart rate rather than just your max, which produces more personalised targets — especially helpful if your RHR is much lower or higher than average.",
          },
          {
            question: "Which zone should I train in to lose fat or build endurance?",
            answer: (
              <>
                Zone 2 (about 60–70% of MHR) is the classic fat-burn and base-endurance zone. Most endurance coaches
                recommend spending 70–80% of your weekly training time in Zones 1–2, with shorter, harder sessions in
                Zones 4–5 to raise your ceiling. Combine Zone 2 work with a calorie-aware nutrition plan — our{" "}
                <InternalLink href="/tools/calorie-calculator">Calorie Calculator</InternalLink> can help you dial in
                your daily energy needs.
              </>
            ),
          },
          {
            question: "How accurate is a calculated maximum heart rate?",
            answer:
              "Formulas have a standard deviation of roughly ±10–12 BPM, so two people the same age can have genuinely different true max heart rates. For the best accuracy, measure yours during a supervised graded exercise test or use a heart-rate monitor during an all-out effort, then enter the result using the Manual override.",
          },

          // ── 4 new FAQs ──────────────────────────────────────────────────
          {
            question: "What is Zone 2 training and why is it so popular right now?",
            answer:
              "Zone 2 (60–70% of MHR) has surged in popularity following research into mitochondrial health and metabolic efficiency. Training at this intensity for extended periods — typically 45–90 minutes per session — improves the body's ability to oxidise fat as fuel, builds a larger aerobic base, and produces far less metabolic stress than higher zones. This means faster recovery and the ability to train more frequently without accumulating fatigue. Many elite endurance coaches now recommend that 75–80% of total weekly training volume be completed in Zone 2.",
          },
          {
            question: "What is the difference between % of MHR and the Karvonen (HRR) method?",
            answer: (
              <>
                The percentage-of-MHR method calculates each zone as a simple fraction of your maximum heart rate. The
                Karvonen method uses Heart Rate Reserve (HRR = MHR − RHR) and derives zones relative to that range, then
                adds your resting heart rate back to produce the final BPM targets. Because it accounts for your
                individual resting heart rate, Karvonen tends to assign higher BPM targets for the same effort level —
                making it noticeably more accurate for athletes with a low resting heart rate (below 55 BPM).
                Dehydration can artificially elevate your resting heart rate, so make sure you're well-hydrated before
                measuring — use our{" "}
                <InternalLink href="/tools/water-intake-calculator">Water Intake Calculator</InternalLink> to check your
                daily fluid target.
              </>
            ),
          },
          {
            question: "Can I use this calculator if I have a heart condition or take medication?",
            answer:
              "This tool is designed for general fitness reference only and is not a medical device. If you have a diagnosed heart condition, take medication that affects heart rate — such as beta-blockers, which suppress the heart's natural rate response and make age-based formulas unreliable — or have been advised by a doctor to limit exercise intensity, please consult your physician before using heart-rate zones for training. In those cases, a medically supervised exercise test is the safest way to establish your true training zones.",
          },
          {
            question: "How do I find my true maximum heart rate?",
            answer:
              "The most reliable method is a maximal exercise test supervised by a sports medicine professional or cardiologist. A practical field alternative is a structured all-out effort test: after a thorough warm-up, perform three intervals of 3 minutes at maximum sustainable effort on a treadmill, track, or stationary bike, and note the highest BPM recorded by your heart-rate monitor. Enter that value into this calculator using the 'Manual override' option to get the most personalised zone results possible.",
          },
        ]}
      />

      <RelatedTools currentSlug="heart-rate-zone-calculator" />
    </ToolPageShell>
  );
}
