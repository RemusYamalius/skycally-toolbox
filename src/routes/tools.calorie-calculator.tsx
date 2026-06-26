import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, AlertTriangle } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/tools/calorie-calculator")({
  head: () => buildToolMeta(toolBySlug("calorie-calculator", tools)),
  component: CalorieCalculator,
});

type Sex = "male" | "female";
type Units = "metric" | "imperial";
type ActivityKey = "sedentary" | "light" | "moderate" | "very" | "extra";
type Goal = "maintain" | "lose" | "gain";

const ACTIVITY: Record<ActivityKey, { mult: number; emoji: string; label: string; desc: string }> = {
  sedentary: { mult: 1.2, emoji: "🛋️", label: "Sedentary", desc: "Little or no exercise" },
  light: { mult: 1.375, emoji: "🚶", label: "Lightly Active", desc: "Light exercise 1–3 days/week" },
  moderate: { mult: 1.55, emoji: "🏃", label: "Moderately Active", desc: "Moderate exercise 3–5 days/week" },
  very: { mult: 1.725, emoji: "💪", label: "Very Active", desc: "Hard exercise 6–7 days/week" },
  extra: { mult: 1.9, emoji: "🔥", label: "Extra Active", desc: "Physical job + daily training" },
};

const STORAGE_KEY = "calorie-calculator-inputs";

const fmt = (n: number) => Math.round(n).toLocaleString();

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "#3b82f6" };
  if (bmi < 25) return { label: "Normal", color: "var(--green-brand)" };
  if (bmi < 30) return { label: "Overweight", color: "#f59e0b" };
  if (bmi < 35) return { label: "Obese I", color: "#ef4444" };
  if (bmi < 40) return { label: "Obese II", color: "#dc2626" };
  return { label: "Obese III", color: "#991b1b" };
}

function CalorieCalculator() {
  const tool = toolBySlug("calorie-calculator", tools);

  const [age, setAge] = useState("30");
  const [sex, setSex] = useState<Sex>("male");
  const [units, setUnits] = useState<Units>("metric");
  const [cm, setCm] = useState("175");
  const [ft, setFt] = useState("5");
  const [inch, setInch] = useState("9");
  const [kg, setKg] = useState("70");
  const [lb, setLb] = useState("154");
  const [activity, setActivity] = useState<ActivityKey>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");

  // Restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.age) setAge(s.age);
      if (s.sex) setSex(s.sex);
      if (s.units) setUnits(s.units);
      if (s.cm) setCm(s.cm);
      if (s.ft) setFt(s.ft);
      if (s.inch) setInch(s.inch);
      if (s.kg) setKg(s.kg);
      if (s.lb) setLb(s.lb);
      if (s.activity) setActivity(s.activity);
      if (s.goal) setGoal(s.goal);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ age, sex, units, cm, ft, inch, kg, lb, activity, goal }),
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [age, sex, units, cm, ft, inch, kg, lb, activity, goal]);

  // Unit switch — convert values in place
  const switchUnits = (next: Units) => {
    if (next === units) return;
    if (next === "imperial") {
      const k = parseFloat(kg);
      if (!Number.isNaN(k)) setLb((k * 2.20462).toFixed(1));
      const c = parseFloat(cm);
      if (!Number.isNaN(c)) {
        const totalIn = c / 2.54;
        const f = Math.floor(totalIn / 12);
        const i = Math.round(totalIn - f * 12);
        setFt(String(f));
        setInch(String(i));
      }
    } else {
      const p = parseFloat(lb);
      if (!Number.isNaN(p)) setKg((p / 2.20462).toFixed(1));
      const f = parseFloat(ft);
      const i = parseFloat(inch);
      if (!Number.isNaN(f) || !Number.isNaN(i)) {
        const totalIn = (Number.isNaN(f) ? 0 : f) * 12 + (Number.isNaN(i) ? 0 : i);
        setCm(Math.round(totalIn * 2.54).toString());
      }
    }
    setUnits(next);
  };

  const calc = useMemo(() => {
    const a = parseFloat(age);
    const weightKg = units === "metric" ? parseFloat(kg) : parseFloat(lb) / 2.20462;
    const heightCm =
      units === "metric"
        ? parseFloat(cm)
        : ((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54;

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(weightKg) ||
      !Number.isFinite(heightCm) ||
      a <= 0 ||
      weightKg <= 0 ||
      heightCm <= 0
    ) {
      return null;
    }

    const bmr =
      sex === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * a + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * a - 161;

    const tdee = bmr * ACTIVITY[activity].mult;
    const calorieMin = sex === "female" ? 1200 : 1500;

    const targets = {
      maintain: tdee,
      loseMild: Math.max(tdee - 250, calorieMin),
      loseModerate: Math.max(tdee - 500, calorieMin),
      loseAggressive: Math.max(tdee - 1000, calorieMin),
      gainMild: tdee + 250,
      gainModerate: tdee + 500,
    };

    const bmi = weightKg / (heightCm / 100) ** 2;
    const weightLb = weightKg * 2.20462;

    // Macros computed from a specific calorie target
    const macrosFor = (cal: number, leanMode = false) => {
      const proteinPerLb = leanMode ? 1.2 : 1.0;
      const proteinG = Math.round(weightLb * proteinPerLb);
      const proteinCal = proteinG * 4;
      const fatCal = cal * 0.3;
      const fatG = Math.round(fatCal / 9);
      const carbCal = Math.max(0, cal - proteinCal - fatCal);
      const carbG = Math.round(carbCal / 4);
      const total = proteinCal + fatG * 9 + carbG * 4 || 1;
      return {
        protein: { g: proteinG, cal: proteinCal, pct: Math.round((proteinCal / total) * 100) },
        fat: { g: fatG, cal: fatG * 9, pct: Math.round(((fatG * 9) / total) * 100) },
        carbs: { g: carbG, cal: carbG * 4, pct: Math.round(((carbG * 4) / total) * 100) },
      };
    };

    return {
      bmr,
      tdee,
      bmi,
      targets,
      macrosFor,
      weightKg,
      warning:
        bmr < 800
          ? "Values seem unusual, please check your inputs."
          : a < 15 || a > 80
            ? "Mifflin-St Jeor is calibrated for adults 15–80. Treat the result as a rough estimate."
            : null,
    };
  }, [age, sex, units, cm, ft, inch, kg, lb, activity]);

  const bmiPct = calc ? Math.max(0, Math.min(100, ((calc.bmi - 10) / 30) * 100)) : 0;
  const bmiCat = calc ? bmiCategory(calc.bmi) : null;

  // Goal-driven primary target
  const primary = useMemo(() => {
    if (!calc) return null;
    if (goal === "maintain") return { cal: calc.targets.maintain, label: "Maintenance" };
    if (goal === "lose") return { cal: calc.targets.loseModerate, label: "Moderate weight loss" };
    return { cal: calc.targets.gainMild, label: "Mild weight gain" };
  }, [calc, goal]);

  const macros = useMemo(
    () => (calc && primary ? calc.macrosFor(primary.cal, goal === "gain") : null),
    [calc, primary, goal],
  );

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* FORM */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-5">
          {/* Age + Sex */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Age
              </label>
              <Input
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Sex
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-border bg-background h-12">
                {(["male", "female"] as Sex[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className="rounded-md text-sm font-medium transition-colors capitalize"
                    style={
                      sex === s
                        ? {
                            background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                            color: "var(--cyan-brand)",
                            boxShadow: "inset 0 0 0 1px var(--cyan-brand)",
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

          {/* Units */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Units
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-border bg-background">
              {(["metric", "imperial"] as Units[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => switchUnits(u)}
                  className="rounded-md py-2 text-sm font-medium transition-colors capitalize"
                  style={
                    units === u
                      ? {
                          background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)",
                          color: "var(--cyan-brand)",
                          boxShadow: "inset 0 0 0 1px var(--cyan-brand)",
                        }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {u === "metric" ? "Metric (kg/cm)" : "Imperial (lb/ft)"}
                </button>
              ))}
            </div>
          </div>

          {/* Height + Weight */}
          <div className="grid grid-cols-2 gap-3">
            {units === "metric" ? (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Height (cm)
                </label>
                <Input
                  inputMode="decimal"
                  value={cm}
                  onChange={(e) => setCm(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Height (ft / in)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    inputMode="numeric"
                    value={ft}
                    onChange={(e) => setFt(e.target.value)}
                    className="h-12 text-lg"
                    placeholder="ft"
                  />
                  <Input
                    inputMode="numeric"
                    value={inch}
                    onChange={(e) => setInch(e.target.value)}
                    className="h-12 text-lg"
                    placeholder="in"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Weight ({units === "metric" ? "kg" : "lb"})
              </label>
              <Input
                inputMode="decimal"
                value={units === "metric" ? kg : lb}
                onChange={(e) => (units === "metric" ? setKg(e.target.value) : setLb(e.target.value))}
                className="h-12 text-lg"
              />
            </div>
          </div>

          {/* Activity */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Activity level
            </label>
            <div className="grid gap-2">
              {(Object.keys(ACTIVITY) as ActivityKey[]).map((k) => {
                const a = ACTIVITY[k];
                const selected = activity === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActivity(k)}
                    className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                    style={
                      selected
                        ? {
                            borderColor: "var(--cyan-brand)",
                            background: "color-mix(in oklab, var(--cyan-brand) 10%, transparent)",
                            boxShadow: "0 0 18px rgba(0,212,255,0.15)",
                          }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    <span className="text-xl" aria-hidden>
                      {a.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">{a.desc}</span>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">×{a.mult}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Goal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { k: "maintain" as Goal, emoji: "⚖️", label: "Maintain" },
                { k: "lose" as Goal, emoji: "📉", label: "Lose" },
                { k: "gain" as Goal, emoji: "📈", label: "Gain" },
              ]).map((g) => {
                const selected = goal === g.k;
                return (
                  <button
                    key={g.k}
                    type="button"
                    onClick={() => setGoal(g.k)}
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
                    <div className="text-xl">{g.emoji}</div>
                    <div className="text-xs font-semibold mt-1">{g.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-3 space-y-4">
          {!calc || !primary || !macros ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
              Enter your age, height and weight to see your daily calorie target.
            </div>
          ) : (
            <motion.div
              key={`${primary.cal.toFixed(0)}-${goal}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {calc.warning && (
                <div
                  className="flex items-start gap-2 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "color-mix(in oklab, #f59e0b 50%, transparent)",
                    background: "color-mix(in oklab, #f59e0b 10%, transparent)",
                    color: "#f59e0b",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{calc.warning}</span>
                </div>
              )}

              {/* Hero target */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: "color-mix(in oklab, var(--cyan-brand) 40%, var(--border))",
                  background:
                    "linear-gradient(140deg, color-mix(in oklab, var(--cyan-brand) 10%, var(--card)) 0%, var(--card) 70%)",
                  boxShadow: "0 0 30px rgba(0,212,255,0.12)",
                }}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Flame className="w-4 h-4" style={{ color: "var(--cyan-brand)" }} />
                  Your Daily Calorie Target
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="font-display text-5xl sm:text-6xl font-extrabold tabular-nums"
                    style={{ color: "var(--cyan-brand)" }}
                  >
                    {fmt(primary.cal)}
                  </span>
                  <span className="text-base text-muted-foreground">kcal / day</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {primary.label} · TDEE {fmt(calc.tdee)} · BMR {fmt(calc.bmr)}
                </div>

                {/* Goal variants */}
                <div className="mt-5 grid gap-2">
                  {goal === "maintain" && (
                    <Row label="Maintenance" kcal={calc.targets.maintain} />
                  )}
                  {goal === "lose" && (
                    <>
                      <Row label="Mild loss (≈ 0.25 kg / wk)" kcal={calc.targets.loseMild} active />
                      <Row label="Moderate loss (≈ 0.5 kg / wk)" kcal={calc.targets.loseModerate} highlight />
                      <Row label="Aggressive loss (≈ 1 kg / wk)" kcal={calc.targets.loseAggressive} active />
                    </>
                  )}
                  {goal === "gain" && (
                    <>
                      <Row label="Mild gain (≈ 0.25 kg / wk)" kcal={calc.targets.gainMild} highlight />
                      <Row label="Moderate gain (≈ 0.5 kg / wk)" kcal={calc.targets.gainModerate} active />
                    </>
                  )}
                </div>

                {/* Projection */}
                {goal !== "maintain" && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {(() => {
                      const delta = primary.cal - calc.tdee;
                      const kgPerWeek = (Math.abs(delta) * 7) / 7716;
                      const verb = delta < 0 ? "lose" : "gain";
                      return `At this target you'll ${verb} about ${kgPerWeek.toFixed(2)} kg / week (${(kgPerWeek * 2.20462).toFixed(2)} lb).`;
                    })()}
                  </p>
                )}
              </div>

              {/* Macros */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Macros for {fmt(primary.cal)} kcal
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MacroCard emoji="🥩" name="Protein" g={macros.protein.g} cal={macros.protein.cal} pct={macros.protein.pct} color="#ef4444" />
                  <MacroCard emoji="🌾" name="Carbs" g={macros.carbs.g} cal={macros.carbs.cal} pct={macros.carbs.pct} color="#f59e0b" />
                  <MacroCard emoji="🥑" name="Fat" g={macros.fat.g} cal={macros.fat.cal} pct={macros.fat.pct} color="var(--green-brand)" />
                </div>
              </div>

              {/* BMI */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">BMI</div>
                    <div className="font-display text-4xl font-extrabold mt-1 tabular-nums">
                      {calc.bmi.toFixed(1)}
                    </div>
                  </div>
                  {bmiCat && (
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: `color-mix(in oklab, ${bmiCat.color} 18%, transparent)`,
                        color: bmiCat.color,
                      }}
                    >
                      {bmiCat.label}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div
                    className="relative h-3 rounded-full overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(to right, #3b82f6 0%, #3b82f6 28%, var(--green-brand) 28%, var(--green-brand) 50%, #f59e0b 50%, #f59e0b 67%, #ef4444 67%, #ef4444 100%)",
                    }}
                  >
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow transition-all"
                      style={{ left: `${bmiPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>Under</span>
                    <span>Normal</span>
                    <span>Over</span>
                    <span>Obese</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground px-1">
                This calculator provides estimates based on population averages. Consult a healthcare professional before making significant dietary changes.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <AdZone id="calorie-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter your age, sex, height, weight, and activity level.",
          "Select your goal: maintain, lose, or gain weight.",
          "Read your personalized daily calorie target, macro breakdown, and BMI instantly.",
        ]}
      />

      <ToolSeoContent
        title="Free Calorie Calculator — Daily Calorie Needs & Macro Calculator"
        description="Calculate your daily calorie needs (TDEE) and macros based on your age, weight, height, activity level, and goal. Free, instant, no signup."
        body={[
          "The Calorie Calculator uses the Mifflin-St Jeor equation — the most accurate formula for most adults — to calculate your Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE). Enter your details, pick your goal, and instantly see how many calories you need to maintain, lose, or gain weight.",
          "TDEE is the total number of calories your body burns in a day, accounting for your activity level. It's calculated by multiplying your BMR by an activity factor ranging from 1.2 (sedentary) to 1.9 (extra active). To lose weight, eat below your TDEE; to gain, eat above it — the calculator shows you exactly how much.",
          "The macro breakdown shows how to split your daily calories into protein, carbohydrates, and fat in grams. Protein is set at 1g per pound of body weight to support muscle maintenance and satiety. Fat covers 30% of total calories for hormone health, and carbohydrates fill the remaining balance for energy.",
          "BMI (Body Mass Index) is calculated alongside your calorie target, providing additional context for your health status. While BMI has limitations — it doesn't distinguish muscle from fat — it's a widely used screening tool that helps contextualize calorie and weight goals alongside your TDEE.",
        ]}
        faqs={[
          { question: "What is TDEE?", answer: "TDEE (Total Daily Energy Expenditure) is the total number of calories your body burns per day, including your basal metabolic rate plus calories burned through activity. Eating at your TDEE maintains your current weight." },
          { question: "Which calorie formula does this calculator use?", answer: "The Mifflin-St Jeor equation, which is considered the most accurate formula for most adults. It calculates BMR based on weight, height, age, and sex, then multiplies by an activity factor." },
          { question: "How many calories should I eat to lose weight?", answer: "A deficit of 500 calories per day produces approximately 0.5kg (1 lb) of weight loss per week. A 250 kcal deficit gives slower, more sustainable loss. A 1000 kcal deficit is aggressive and should only be used under medical supervision." },
          { question: "What are macros?", answer: "Macros (macronutrients) are protein, carbohydrates, and fat — the three nutrients that provide calories. Protein = 4 kcal/g, carbs = 4 kcal/g, fat = 9 kcal/g. Tracking macros gives more dietary control than tracking calories alone." },
          { question: "Is 1200 calories too low?", answer: "For most women, 1200 kcal/day is the minimum safe threshold. For men it's typically 1500 kcal/day. Below these levels, it's difficult to meet micronutrient needs. This calculator enforces these minimums automatically." },
          { question: "How accurate is this calculator?", answer: "The Mifflin-St Jeor formula is accurate within ±10% for most adults. Results are estimates based on population averages. Factors like body composition, hormones, and medications affect individual metabolic rates." },
          { question: "How much protein do I need per day?", answer: "This calculator sets protein at 1g per pound of body weight (2.2g/kg), which is appropriate for most active adults. For muscle gain or heavy strength training, 1.2g/lb may be more optimal." },
          { question: "What is BMI and is it reliable?", answer: "BMI (Body Mass Index) = weight(kg) ÷ height(m)². It's a simple screening tool with known limitations — it doesn't account for muscle mass, bone density, or fat distribution. Use it alongside other metrics for context." },
        ]}
      />

      <RelatedTools currentSlug="calorie-calculator" />
    </ToolPageShell>
  );
}

function Row({
  label,
  kcal,
  highlight,
  active,
}: {
  label: string;
  kcal: number;
  highlight?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
      style={{
        background: highlight
          ? "color-mix(in oklab, var(--cyan-brand) 14%, transparent)"
          : active
            ? "color-mix(in oklab, var(--foreground) 4%, transparent)"
            : "transparent",
        border: highlight ? "1px solid color-mix(in oklab, var(--cyan-brand) 45%, transparent)" : "1px solid var(--border)",
      }}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold tabular-nums">{fmt(kcal)} kcal</span>
    </div>
  );
}

function MacroCard({
  emoji,
  name,
  g,
  cal,
  pct,
  color,
}: {
  emoji: string;
  name: string;
  g: number;
  cal: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span aria-hidden>{emoji}</span>
          {name}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums">{g}g</div>
      <div className="text-[11px] text-muted-foreground">{fmt(cal)} kcal</div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-border/50">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
