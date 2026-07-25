import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, AlertTriangle, Flame, Beef, Wheat, Droplet } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import {
  ACTIVITY_MULT,
  GOAL_META,
  computeCalories,
  computeMacros,
  foodEquivalence,
  katchMcArdle,
  mifflinStJeor,
  type ActivityKey,
  type Formula,
  type Goal,
  type Sex,
} from "@/lib/macro/calc";

export const Route = createFileRoute("/tools/macro-calculator")({
  head: () => buildToolMeta(toolBySlug("macro-calculator", tools)),
  component: MacroCalculator,
});

type WeightUnit = "kg" | "lb";

const PROTEIN_COLOR = "#22d3ee"; // cyan
const CARB_COLOR = "#f59e0b"; // amber
const FAT_COLOR = "#f472b6"; // rose

const fmt = (n: number) => Math.round(n).toLocaleString();

function MacroCalculator() {
  const tool = toolBySlug("macro-calculator", tools);

  // Primary
  const [calories, setCalories] = useState("2200");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [weight, setWeight] = useState("75");
  const [goal, setGoal] = useState<Goal>("maintenance");
  const [proteinPerKg, setProteinPerKg] = useState(GOAL_META.maintenance.proteinDefault);
  const [fatPerKg, setFatPerKg] = useState(0.9);
  const [meals, setMeals] = useState<3 | 4>(3);

  // Optional calorie calculator
  const [showCalc, setShowCalc] = useState(false);
  const [age, setAge] = useState("30");
  const [sex, setSex] = useState<Sex>("male");
  const [heightCm, setHeightCm] = useState("178");
  const [activity, setActivity] = useState<ActivityKey>("moderate");
  const [bodyFat, setBodyFat] = useState("");
  const [formula, setFormula] = useState<Formula>("mifflin");

  const weightKg = useMemo(() => {
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) return 0;
    return weightUnit === "kg" ? w : w / 2.20462;
  }, [weight, weightUnit]);

  const calorieNum = useMemo(() => {
    const c = parseFloat(calories);
    return Number.isFinite(c) && c > 0 ? c : 0;
  }, [calories]);

  const macros = useMemo(() => {
    if (!weightKg || !calorieNum) return null;
    return computeMacros({ calories: calorieNum, weightKg, proteinPerKg, fatPerKg });
  }, [calorieNum, weightKg, proteinPerKg, fatPerKg]);

  // Update protein default when goal changes
  const changeGoal = (g: Goal) => {
    setGoal(g);
    setProteinPerKg(GOAL_META[g].proteinDefault);
  };

  const fillFromCalculator = () => {
    const ageN = parseFloat(age);
    const hCm = parseFloat(heightCm);
    const bf = parseFloat(bodyFat);
    if (!weightKg || !Number.isFinite(hCm) || hCm <= 0) return;
    const bmr =
      formula === "katch" && Number.isFinite(bf) && bf > 0
        ? katchMcArdle({ weightKg, bodyFatPct: bf })
        : mifflinStJeor({ sex, age: Number.isFinite(ageN) ? ageN : 30, heightCm: hCm, weightKg });
    const target = computeCalories(bmr, activity, goal);
    setCalories(String(Math.round(target)));
  };

  const goalMeta = GOAL_META[goal];
  const goalCalorieDelta = calorieNum && weightKg ? Math.round(calorieNum * goalMeta.delta) : 0;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* INPUTS */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            {/* Calorie target */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Daily calorie target
              </label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="h-14 text-2xl font-bold pr-16 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  kcal
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Don't know your target? Use the calculator below.
              </p>
            </div>

            {/* Body weight */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Body weight
              </label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-12 text-lg flex-1"
                />
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-border bg-background w-28">
                  {(["kg", "lb"] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        if (u === weightUnit) return;
                        const w = parseFloat(weight);
                        if (Number.isFinite(w)) {
                          setWeight(u === "lb" ? (w * 2.20462).toFixed(1) : (w / 2.20462).toFixed(1));
                        }
                        setWeightUnit(u);
                      }}
                      className="rounded-md text-sm font-medium transition-colors"
                      style={
                        weightUnit === u
                          ? {
                              background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                              color: "var(--cyan-brand)",
                              boxShadow: "inset 0 0 0 1px var(--cyan-brand)",
                            }
                          : { color: "var(--muted-foreground)" }
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Goal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(GOAL_META) as Goal[]).map((g) => {
                  const selected = goal === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => changeGoal(g)}
                      className="rounded-lg border p-3 text-center transition-colors"
                      style={
                        selected
                          ? {
                              borderColor: "var(--cyan-brand)",
                              background: "color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
                            }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      <div className="text-sm font-semibold">{GOAL_META[g].label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {g === "cutting" ? "−20%" : g === "bulk" ? "+12%" : "0%"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{goalMeta.desc}</p>
            </div>

            {/* Protein slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Protein
                </label>
                <span className="text-sm font-semibold tabular-nums" style={{ color: PROTEIN_COLOR }}>
                  {proteinPerKg.toFixed(1)} g/kg{" "}
                  <span className="text-muted-foreground font-normal">
                    · {Math.round(proteinPerKg * weightKg)} g/day
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={1.2}
                max={2.6}
                step={0.05}
                value={proteinPerKg}
                onChange={(e) => setProteinPerKg(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
                style={{ accentColor: PROTEIN_COLOR }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1.2</span>
                <span>1.6</span>
                <span>2.0</span>
                <span>2.4</span>
              </div>
            </div>

            {/* Fat slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fat
                </label>
                <span className="text-sm font-semibold tabular-nums" style={{ color: FAT_COLOR }}>
                  {fatPerKg.toFixed(1)} g/kg{" "}
                  <span className="text-muted-foreground font-normal">
                    · {Math.round(fatPerKg * weightKg)} g/day
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={fatPerKg}
                onChange={(e) => setFatPerKg(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: FAT_COLOR }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                A hormonal-health floor (0.5 g/kg or 20% of calories) is applied automatically.
              </p>
            </div>
          </div>

          {/* Optional calorie calculator */}
          <div className="rounded-2xl border border-border bg-card/60">
            <button
              type="button"
              onClick={() => setShowCalc((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              aria-expanded={showCalc}
            >
              <span className="text-sm font-semibold">I don't know my calorie target yet</span>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ transform: showCalc ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {showCalc && (
              <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Age
                    </label>
                    <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className="h-11" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Sex
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-border bg-background h-11">
                      {(["male", "female"] as Sex[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSex(s)}
                          className="rounded-md text-xs font-medium capitalize"
                          style={
                            sex === s
                              ? {
                                  background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                                  color: "var(--cyan-brand)",
                                }
                              : { color: "var(--muted-foreground)" }
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Height (cm)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Activity level
                  </label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value as ActivityKey)}
                    className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {(Object.keys(ACTIVITY_MULT) as ActivityKey[]).map((k) => (
                      <option key={k} value={k}>
                        {ACTIVITY_MULT[k].label} — {ACTIVITY_MULT[k].desc} (×{ACTIVITY_MULT[k].mult})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Body fat % <span className="text-muted-foreground normal-case font-normal">(optional — unlocks Katch-McArdle)</span>
                  </label>
                  <Input
                    inputMode="decimal"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    placeholder="e.g. 18"
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Formula
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["mifflin", "katch"] as Formula[]).map((f) => {
                      const disabled = f === "katch" && !(parseFloat(bodyFat) > 0);
                      const selected = formula === f && !disabled;
                      return (
                        <button
                          key={f}
                          type="button"
                          disabled={disabled}
                          onClick={() => setFormula(f)}
                          className="rounded-lg border p-2.5 text-xs font-medium text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={
                            selected
                              ? {
                                  borderColor: "var(--cyan-brand)",
                                  background: "color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
                                }
                              : { borderColor: "var(--border)" }
                          }
                        >
                          {f === "mifflin" ? "Mifflin-St Jeor" : "Katch-McArdle"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fillFromCalculator}
                  className="w-full h-11 rounded-lg font-semibold text-sm transition-colors"
                  style={{
                    background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                    color: "var(--cyan-brand)",
                    boxShadow: "inset 0 0 0 1px var(--cyan-brand)",
                  }}
                >
                  Use this calorie number
                </button>
                <p className="text-[11px] text-muted-foreground">
                  You can still edit the calorie target above afterward.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-3 space-y-4">
          {!macros ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
              Enter a calorie target and body weight to see your macro breakdown.
            </div>
          ) : (
            <motion.div
              key={`${macros.calories}-${macros.protein.g}-${macros.fat.g}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Hero: donut + totals */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: "color-mix(in oklab, var(--cyan-brand) 40%, var(--border))",
                  background:
                    "linear-gradient(140deg, color-mix(in oklab, var(--cyan-brand) 10%, var(--card)) 0%, var(--card) 70%)",
                  boxShadow: "0 0 30px rgba(0,212,255,0.10)",
                }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <MacroDonut macros={macros} />
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Flame className="w-4 h-4" style={{ color: "var(--cyan-brand)" }} />
                      Daily target
                    </div>
                    <div className="mt-1 font-display text-5xl font-extrabold tabular-nums">
                      {fmt(macros.calories)}
                      <span className="text-lg font-medium text-muted-foreground ml-1">kcal</span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-xs rounded-full px-2.5 py-1 border border-border bg-background/50">
                      <span className="font-semibold">{goalMeta.label}</span>
                      {goalCalorieDelta !== 0 && (
                        <span className="text-muted-foreground tabular-nums">
                          {goalCalorieDelta > 0 ? "+" : ""}
                          {fmt(goalCalorieDelta)} kcal vs maintenance
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {macros.warning && (
                <div
                  className="flex items-start gap-2 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "color-mix(in oklab, #f59e0b 50%, transparent)",
                    background: "color-mix(in oklab, #f59e0b 10%, transparent)",
                    color: "#f59e0b",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{macros.warning}</span>
                </div>
              )}

              {/* Macro cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <MacroCard
                  color={PROTEIN_COLOR}
                  icon={<Beef className="w-4 h-4" />}
                  label="Protein"
                  grams={macros.protein.g}
                  cals={macros.protein.cal}
                  pct={macros.protein.pct}
                  food={foodEquivalence("protein", macros.protein.g)}
                />
                <MacroCard
                  color={CARB_COLOR}
                  icon={<Wheat className="w-4 h-4" />}
                  label="Carbs"
                  grams={macros.carbs.g}
                  cals={macros.carbs.cal}
                  pct={macros.carbs.pct}
                  food={foodEquivalence("carbs", macros.carbs.g)}
                />
                <MacroCard
                  color={FAT_COLOR}
                  icon={<Droplet className="w-4 h-4" />}
                  label="Fat"
                  grams={macros.fat.g}
                  cals={macros.fat.cal}
                  pct={macros.fat.pct}
                  food={foodEquivalence("fat", macros.fat.g)}
                />
              </div>

              {/* Per-meal breakdown */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Per-meal split</h3>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-border bg-background">
                    {([3, 4] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMeals(m)}
                        className="rounded-md px-3 py-1 text-xs font-medium"
                        style={
                          meals === m
                            ? {
                                background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                                color: "var(--cyan-brand)",
                              }
                            : { color: "var(--muted-foreground)" }
                        }
                      >
                        {m} meals
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-[11px] uppercase text-muted-foreground">Protein / meal</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: PROTEIN_COLOR }}>
                      {Math.round(macros.protein.g / meals)} g
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-[11px] uppercase text-muted-foreground">Carbs / meal</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: CARB_COLOR }}>
                      {Math.round(macros.carbs.g / meals)} g
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-[11px] uppercase text-muted-foreground">Fat / meal</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: FAT_COLOR }}>
                      {Math.round(macros.fat.g / meals)} g
                    </div>
                  </div>
                </div>
              </div>

              {/* Contextual internal links — placed BEFORE AdZone / HowToUse / SEO */}
              <div className="rounded-2xl border border-border bg-card/50 p-5">
                <h3 className="text-sm font-semibold mb-3">Related next steps</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    Don't have a calorie target yet? Get a fuller breakdown with the{" "}
                    <Link to="/tools/calorie-calculator" className="underline underline-offset-2 hover:text-foreground" style={{ color: "var(--cyan-brand)" }}>
                      Calorie Calculator
                    </Link>
                    .
                  </li>
                  <li>
                    Planning to hit these macros within a fasting window?{" "}
                    <Link to="/tools/intermittent-fasting-calculator" className="underline underline-offset-2 hover:text-foreground" style={{ color: "var(--cyan-brand)" }}>
                      Find your schedule
                    </Link>
                    .
                  </li>
                  <li>
                    Training toward a cut or bulk? Dial in your cardio zones with the{" "}
                    <Link to="/tools/heart-rate-zone-calculator" className="underline underline-offset-2 hover:text-foreground" style={{ color: "var(--cyan-brand)" }}>
                      Heart Rate Zone Calculator
                    </Link>
                    .
                  </li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground italic">
                These are estimates for general fitness planning — not medical or clinical nutrition advice. If you
                have a medical condition (diabetes, kidney disease, an eating disorder history, or you're pregnant or
                nursing), talk to a registered dietitian or your doctor before making significant changes.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <AdZone id="macro-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Type in your daily calorie target and body weight — or expand ‘I don't know my calorie target’ to compute one right here.",
          "Pick a goal (cutting, maintenance or lean bulk). Your protein target auto-adjusts to a research-backed g/kg default you can still fine-tune.",
          "Read the donut and macro cards for grams, calories, percentages and everyday food equivalences — no signup, no paywall.",
        ]}
      />

      <ToolSeoContent
        title="Free Macro Calculator — Protein, Carbs & Fat for Cutting, Maintenance and Lean Bulking"
        description="A protein-first macro calculator that turns any daily calorie target into a complete gram-and-percentage breakdown of protein, carbs and fat — no signup, no email, no paywall."
        body={[
          "Macros — short for macronutrients — are the three energy-providing nutrients in your diet: protein, carbohydrates and fat. Total calories tell you how much you're eating, but macros tell you what those calories are doing: protein preserves and builds muscle, fat supports hormone production and vitamin absorption, and carbs fuel training and recovery. Two people can eat the exact same calorie total and get very different physique and performance results depending on how those calories are split.",
          "Most macro calculators lock you into a fixed percentage split — often 40% carbs, 30% protein, 30% fat — no matter your body weight or goal. The evidence-based sports-nutrition approach is different: set protein first as grams per kilogram of body weight, because protein needs scale with your lean tissue, not with your energy intake. Typical targets are around 2.2–2.4 g/kg when cutting (higher, to preserve muscle in a deficit), 1.6–2.0 g/kg at maintenance and 1.6–2.2 g/kg on a lean bulk. Fat is set next with a hormonal-health floor (roughly 0.5 g/kg, or about 20% of calories, whichever is greater), and whatever calories remain go to carbs.",
          "This tool supports two BMR formulas. Mifflin-St Jeor is the modern default and tends to be the most accurate for the general population. Katch-McArdle uses your lean body mass instead of total weight, which makes it more accurate for lean or muscular individuals — so it's unlocked whenever you enter a body fat percentage. Being transparent about which formula you're using, and why, is a real trust and accuracy differentiator that most competitors quietly gloss over.",
          "Compared to popular macro calculators, this one shows the full protein / carb / fat breakdown immediately — no account required, no email capture, no premium tier. You get grams, calories and percentages side by side, a color-coded donut chart, everyday food equivalences so the numbers feel tangible, an optional per-meal split, and a clear warning when your calorie target is too low for a sensible protein and fat combination. Everything runs in your browser and nothing is stored on our servers.",
        ]}
        faqs={[
          {
            question: "What are macros?",
            answer:
              "Macros are the three macronutrients that provide calories: protein (4 kcal/g), carbohydrates (4 kcal/g) and fat (9 kcal/g). Tracking them tells you not just how much you're eating but what those calories are made of — which is what actually drives body-composition and performance changes.",
          },
          {
            question: "How much protein do I need per day?",
            answer:
              "For active adults, common evidence-based targets are around 1.6–2.0 g per kg of body weight at maintenance, 2.2–2.4 g/kg while cutting to preserve muscle in a calorie deficit, and 1.6–2.2 g/kg on a lean bulk. This tool sets a research-backed default based on your goal and lets you fine-tune it.",
          },
          {
            question: "What's the difference between Mifflin-St Jeor and Katch-McArdle?",
            answer:
              "Mifflin-St Jeor estimates your basal metabolic rate from age, sex, height and total weight. It's the modern default and works well for most people. Katch-McArdle uses your lean body mass instead of total weight (calculated from body fat percentage), which is more accurate for lean or muscular individuals whose fat mass isn't representative of their metabolic tissue.",
          },
          {
            question: "Should I eat more protein when cutting?",
            answer:
              "Yes. In a calorie deficit, higher protein intake (roughly 2.2–2.4 g/kg) helps preserve lean muscle and improves satiety, so you're more likely to keep the muscle you have and stick to your diet. That's why this tool bumps the protein default when you select the Cutting goal.",
          },
          {
            question: "What percentage of calories should come from fat?",
            answer:
              "There's no single right percentage, but roughly 20–30% of calories from fat is a sensible range for most people. Going below about 20% of calories or below ~0.5 g/kg of body weight can start to affect hormones (especially at low calorie targets), which is why this tool enforces a fat floor automatically.",
          },
          {
            question: "Do I need to hit my macros exactly every day?",
            answer:
              "No. Aim for consistency across the week rather than perfection each day. Being within roughly ±5–10 g of your protein target and ±10–20 g on carbs and fat is more than enough for the vast majority of goals. Stress-free consistency beats obsessive precision.",
          },
          {
            question: "Is this tool free with no signup?",
            answer:
              "Yes. The full protein / carb / fat breakdown, per-meal split, food equivalences and BMR calculator are all shown immediately, at no cost, with no account, email or credit card required. Everything runs in your browser.",
          },
          {
            question: "Should I consult a dietitian instead?",
            answer:
              "This tool is designed for general fitness planning. If you have a medical condition — diabetes, kidney disease, a history of disordered eating, or you're pregnant or nursing — a registered dietitian can build a plan tailored to your labs, medications and history in a way no calculator can.",
          },
        ]}
      />

      <RelatedTools currentSlug="macro-calculator" />
    </ToolPageShell>
  );
}

/* ---------- Presentational bits ---------- */

function MacroCard({
  color,
  icon,
  label,
  grams,
  cals,
  pct,
  food,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  grams: number;
  cals: number;
  pct: number;
  food: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${color} 35%, var(--border))`,
        background: `linear-gradient(150deg, color-mix(in oklab, ${color} 10%, var(--card)), var(--card) 75%)`,
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold" style={{ color }}>
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tabular-nums">{grams}</span>
        <span className="text-sm text-muted-foreground">g</span>
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {cals} kcal · {pct}%
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground leading-snug">{food}</div>
    </div>
  );
}

function MacroDonut({
  macros,
}: {
  macros: { protein: { cal: number }; carbs: { cal: number }; fat: { cal: number }; calories: number };
}) {
  const size = 176;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = macros.protein.cal + macros.carbs.cal + macros.fat.cal || 1;

  const pP = macros.protein.cal / total;
  const pC = macros.carbs.cal / total;
  const pF = macros.fat.cal / total;

  const segs = [
    { pct: pP, color: PROTEIN_COLOR },
    { pct: pC, color: CARB_COLOR },
    { pct: pF, color: FAT_COLOR },
  ];

  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklab, var(--foreground) 8%, transparent)"
          strokeWidth={stroke}
        />
        {segs.map((s, i) => {
          const len = s.pct * c;
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Split</span>
        <span className="text-sm font-semibold tabular-nums">
          {Math.round(pP * 100)}/{Math.round(pC * 100)}/{Math.round(pF * 100)}
        </span>
        <span className="text-[10px] text-muted-foreground">P · C · F</span>
      </div>
    </div>
  );
}
