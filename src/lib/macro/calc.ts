// Macro Calculator — pure calculation utilities.
// Protein-first, evidence-based approach (grams per kg of body weight),
// not a fixed generic percentage split.

export type Sex = "male" | "female";
export type ActivityKey = "sedentary" | "light" | "moderate" | "active" | "very";
export type Goal = "cutting" | "maintenance" | "bulk";
export type Formula = "mifflin" | "katch";

export const ACTIVITY_MULT: Record<ActivityKey, { mult: number; label: string; desc: string }> = {
  sedentary: { mult: 1.2, label: "Sedentary", desc: "Little or no exercise" },
  light: { mult: 1.375, label: "Lightly Active", desc: "Light exercise 1–3 days/week" },
  moderate: { mult: 1.55, label: "Moderately Active", desc: "Moderate exercise 3–5 days/week" },
  active: { mult: 1.725, label: "Very Active", desc: "Hard exercise 6–7 days/week" },
  very: { mult: 1.9, label: "Extra Active", desc: "Physical job + daily training" },
};

export const GOAL_META: Record<Goal, { label: string; delta: number; proteinDefault: number; desc: string }> = {
  cutting: { label: "Cutting", delta: -0.20, proteinDefault: 2.3, desc: "~20% calorie deficit — protein bumped to preserve muscle" },
  maintenance: { label: "Maintenance", delta: 0, proteinDefault: 1.8, desc: "Eat at maintenance — body-composition focused protein" },
  bulk: { label: "Lean Bulk", delta: 0.12, proteinDefault: 1.9, desc: "~12% calorie surplus — supports slow muscle gain" },
};

// --- BMR formulas ---

export function mifflinStJeor(opts: { sex: Sex; age: number; heightCm: number; weightKg: number }): number {
  const { sex, age, heightCm, weightKg } = opts;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function katchMcArdle(opts: { weightKg: number; bodyFatPct: number }): number {
  const lbm = opts.weightKg * (1 - opts.bodyFatPct / 100);
  return 370 + 21.6 * lbm;
}

// --- Calorie target ---

export function computeCalories(bmr: number, activity: ActivityKey, goal: Goal): number {
  const tdee = bmr * ACTIVITY_MULT[activity].mult;
  return tdee * (1 + GOAL_META[goal].delta);
}

// --- Macros ---

export interface MacroInput {
  calories: number;
  weightKg: number;
  proteinPerKg: number;
  fatPerKg: number;
}

export interface MacroBreakdown {
  protein: { g: number; cal: number; pct: number };
  carbs: { g: number; cal: number; pct: number };
  fat: { g: number; cal: number; pct: number };
  calories: number;
  warning: string | null;
}

export function computeMacros({ calories, weightKg, proteinPerKg, fatPerKg }: MacroInput): MacroBreakdown {
  const cals = Math.max(0, calories);
  const proteinG = Math.max(0, weightKg * proteinPerKg);
  const proteinCal = proteinG * 4;

  // Enforce a hormonal-health fat floor: at least 0.5 g/kg, or 20% of calories, whichever is greater.
  const fatFloorG = Math.max(weightKg * 0.5, (cals * 0.2) / 9);
  const fatG = Math.max(fatPerKg * weightKg, fatFloorG);
  const fatCal = fatG * 9;

  const carbCal = cals - proteinCal - fatCal;
  let warning: string | null = null;
  let carbG = carbCal / 4;

  if (carbG < 0) {
    warning = `Calorie target is too low for this protein + fat combination — short by about ${Math.round(-carbCal)} kcal. Lower protein or fat, or raise your calorie target.`;
    carbG = 0;
  }

  const total = proteinCal + fatCal + Math.max(0, carbCal) || 1;
  return {
    protein: { g: Math.round(proteinG), cal: Math.round(proteinCal), pct: Math.round((proteinCal / total) * 100) },
    fat: { g: Math.round(fatG), cal: Math.round(fatCal), pct: Math.round((fatCal / total) * 100) },
    carbs: { g: Math.round(Math.max(0, carbG)), cal: Math.round(Math.max(0, carbCal)), pct: Math.round((Math.max(0, carbCal) / total) * 100) },
    calories: Math.round(cals),
    warning,
  };
}

// --- Unit helpers ---
export const lbToKg = (lb: number) => lb / 2.20462;
export const kgToLb = (kg: number) => kg * 2.20462;
export const inToCm = (inches: number) => inches * 2.54;
export const cmToIn = (cm: number) => cm / 2.54;

// --- Food equivalence ---
export function foodEquivalence(macro: "protein" | "carbs" | "fat", grams: number): string {
  if (grams <= 0) return "—";
  if (macro === "protein") {
    // ~30 g protein per medium chicken breast (~120 g cooked)
    const breasts = grams / 30;
    return `≈ ${breasts.toFixed(1)} chicken breasts, or ${(grams / 6).toFixed(0)} large eggs`;
  }
  if (macro === "carbs") {
    // ~45 g carbs per cup of cooked white rice
    const rice = grams / 45;
    return `≈ ${rice.toFixed(1)} cups cooked rice, or ${(grams / 27).toFixed(1)} slices of bread`;
  }
  // fat
  const tbsp = grams / 14;
  return `≈ ${tbsp.toFixed(1)} tbsp olive oil, or ${(grams / 9).toFixed(1)} tbsp peanut butter`;
}
