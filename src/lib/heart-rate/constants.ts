// Heart Rate Zone Calculator — formula constants.
// All numeric formula constants live here so the route contains no magic numbers.

export type MhrFormulaId = "tanaka" | "fox" | "gulati" | "nes" | "manual";

export interface MhrFormula {
  id: Exclude<MhrFormulaId, "manual">;
  label: string;
  short: string;
  description: string;
  /** Returns predicted maximum heart rate in BPM for the given age (years). */
  fn: (age: number) => number;
}

export const MHR_FORMULAS: Record<Exclude<MhrFormulaId, "manual">, MhrFormula> = {
  tanaka: {
    id: "tanaka",
    label: "Tanaka (recommended)",
    short: "208 − 0.7 × age",
    description: "Tanaka, Monahan & Seals (2001) — most accurate for adults of all ages.",
    fn: (age) => 208 - 0.7 * age,
  },
  fox: {
    id: "fox",
    label: "Fox (220 − age)",
    short: "220 − age",
    description: "Classic Haskell & Fox formula. Widely used but tends to overestimate young and underestimate older adults.",
    fn: (age) => 220 - age,
  },
  gulati: {
    id: "gulati",
    label: "Gulati (women)",
    short: "206 − 0.88 × age",
    description: "Validated specifically for women (Gulati et al., 2010).",
    fn: (age) => 206 - 0.88 * age,
  },
  nes: {
    id: "nes",
    label: "Nes",
    short: "211 − 0.64 × age",
    description: "Nes et al. (2013) — derived from 3,000+ healthy adults.",
    fn: (age) => 211 - 0.64 * age,
  },
};

export interface Zone {
  id: 1 | 2 | 3 | 4 | 5;
  name: string;
  low: number;   // fraction of MHR (or HRR for Karvonen)
  high: number;
  color: string;
  purpose: string;
  /** Sine-wave tone frequency in Hz when this zone row is activated. */
  toneHz: number;
}

export const ZONES: readonly Zone[] = [
  { id: 1, name: "Very Light", low: 0.50, high: 0.60, color: "#3b82f6", purpose: "Warm-up, recovery, cool-down", toneHz: 300 },
  { id: 2, name: "Light",      low: 0.60, high: 0.70, color: "#22c55e", purpose: "Fat burn, base endurance",   toneHz: 380 },
  { id: 3, name: "Moderate",   low: 0.70, high: 0.80, color: "#eab308", purpose: "Aerobic capacity, stamina",  toneHz: 480 },
  { id: 4, name: "Hard",       low: 0.80, high: 0.90, color: "#f97316", purpose: "Anaerobic threshold, lactate", toneHz: 600 },
  { id: 5, name: "Maximum",    low: 0.90, high: 1.00, color: "#ef4444", purpose: "VO₂ max, short sprints",     toneHz: 740 },
] as const;

// Edge-case bounds
export const AGE_MIN_WARN = 10;
export const AGE_MAX_WARN = 100;
export const AGE_MIN_INPUT = 1;
export const AGE_MAX_INPUT = 120;
export const MHR_MIN_WARN = 100;
export const MHR_MIN_INPUT = 60;
export const MHR_MAX_INPUT = 240;
export const RHR_MIN_INPUT = 25;
export const RHR_MAX_INPUT = 130;

// UX
export const DEBOUNCE_MS = 150;
export const TONE_DURATION_S = 0.18;
export const TONE_PEAK_GAIN = 0.18;

// localStorage keys
export const STORAGE_INPUTS = "hr-zone-inputs";
export const STORAGE_MUTED = "hr-zone-muted";
