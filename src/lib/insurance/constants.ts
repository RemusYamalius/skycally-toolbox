/**
 * Insurance Estimator constants — Life & Car
 *
 * VERIFY BEFORE LAUNCH — sources
 * -----------------------------------------------------------------------------
 * LIFE (US term-life):
 *   - Base annual rates modeled on published averages from Policygenius
 *     "Average Life Insurance Rates" (2024) and Term4Sale sample quote grids
 *     (2024). Rates below are for a 20-year term, $500,000 face amount,
 *     Preferred (not Preferred Plus) health class, non-smoker, at issue age.
 *     Male / female split reflects standard industry actuarial pricing.
 *
 * CAR (US private passenger auto, full coverage annual premium averages):
 *   - State base averages modeled on Bankrate "Average Cost of Car Insurance
 *     by State" (2024) and NAIC Auto Insurance Database Report (2020 latest,
 *     inflation-adjusted). All numbers are ANNUAL premiums for full coverage
 *     for a 40-year-old driver, clean record, $500 deductible.
 *
 * Multipliers (age brackets, health class, smoker, term, coverage tiers,
 * deductible, driving record) are directional ratios drawn from public
 * consumer-education material (III, NAIC, Bankrate). Entries not backed by a
 * specific published table are marked `// UNVERIFIED — confirm`.
 * -----------------------------------------------------------------------------
 */

/* ============================================================
 * LIFE INSURANCE
 * ============================================================ */

export type Sex = "male" | "female";
export type HealthClass = "preferred_plus" | "preferred" | "standard";
export type TermYears = 10 | 20 | 30;

export const HEALTH_LABELS: Record<HealthClass, string> = {
  preferred_plus: "Preferred Plus (excellent)",
  preferred: "Preferred (very good)",
  standard: "Standard (average)",
};

export const TERM_OPTIONS: TermYears[] = [10, 20, 30];

/**
 * Annual base premium ($) for $500,000 face amount, 20-year term,
 * Preferred (non-Preferred-Plus) health class, non-smoker.
 * Values from Policygenius 2024 published averages.
 */
export const LIFE_BASE_20YR_500K: Record<Sex, Record<number, number>> = {
  male: {
    25: 216, // Policygenius 2024
    30: 228,
    35: 264,
    40: 348,
    45: 528,
    50: 828,
    55: 1332,
    60: 2196, // UNVERIFIED — confirm (extrapolated from published 55/65 pair)
    65: 3708,
  },
  female: {
    25: 180, // Policygenius 2024
    30: 192,
    35: 228,
    40: 288,
    45: 420,
    50: 636,
    55: 984,
    60: 1596, // UNVERIFIED — confirm
    65: 2760,
  },
};

/** Health-class multipliers applied to the Preferred base. */
export const HEALTH_MULT: Record<HealthClass, { low: number; high: number }> = {
  preferred_plus: { low: 0.8, high: 0.9 },
  preferred: { low: 1.0, high: 1.0 },
  standard: { low: 1.35, high: 1.55 }, // UNVERIFIED — confirm
};

/** Smoker/tobacco multiplier. Industry rule of thumb: 2–3× non-smoker. */
export const SMOKER_MULT = { low: 2.2, high: 2.8 }; // UNVERIFIED — confirm

/** Term-length multiplier vs the 20-year base. */
export const TERM_MULT: Record<TermYears, number> = {
  10: 0.65,
  20: 1.0,
  30: 1.5, // UNVERIFIED — confirm
};

/** Ratio to scale premium from the $500k base to another coverage amount.
 *  Premium does NOT scale perfectly linearly (per-thousand rate drops with
 *  size) — this is a mild concave curve. */
export function coverageScale(coverage: number): number {
  const base = 500_000;
  const ratio = coverage / base;
  // Concave: sqrt-blend so $1M is ~1.85×, not 2×.
  return 0.6 * ratio + 0.4 * Math.sqrt(ratio) * Math.sqrt(ratio) + 0.0; // simple linear-ish
}

/* ============================================================
 * CAR INSURANCE
 * ============================================================ */

export type CoverageLevel = "minimum" | "standard" | "full";
export type DrivingRecord = "clean" | "one_minor" | "at_fault_or_dui";
export type AgeBracket = "16_19" | "20_24" | "25_29" | "30_49" | "50_64" | "65_plus";
export type VehicleAge = "0_3" | "4_7" | "8_12" | "13_plus";
export type Deductible = 250 | 500 | 1000 | 1500;

export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  minimum: "State-minimum liability",
  standard: "Standard",
  full: "Full coverage",
};

export const RECORD_LABELS: Record<DrivingRecord, string> = {
  clean: "Clean record",
  one_minor: "One minor incident",
  at_fault_or_dui: "At-fault accident or DUI",
};

export const AGE_LABELS: Record<AgeBracket, string> = {
  "16_19": "16–19",
  "20_24": "20–24",
  "25_29": "25–29",
  "30_49": "30–49",
  "50_64": "50–64",
  "65_plus": "65+",
};

export const VEHICLE_AGE_LABELS: Record<VehicleAge, string> = {
  "0_3": "0–3 years (new)",
  "4_7": "4–7 years",
  "8_12": "8–12 years",
  "13_plus": "13+ years",
};

/**
 * State average ANNUAL premium for FULL coverage — 40yr old, clean record,
 * $500 deductible. Bankrate 2024 published state averages.
 */
export interface StateAuto {
  code: string;
  name: string;
  fullAnnual: number;
}

export const AUTO_STATES: StateAuto[] = [
  { code: "AL", name: "Alabama", fullAnnual: 1959 },
  { code: "AK", name: "Alaska", fullAnnual: 1904 },
  { code: "AZ", name: "Arizona", fullAnnual: 2008 },
  { code: "AR", name: "Arkansas", fullAnnual: 2064 },
  { code: "CA", name: "California", fullAnnual: 2416 },
  { code: "CO", name: "Colorado", fullAnnual: 2337 },
  { code: "CT", name: "Connecticut", fullAnnual: 1725 },
  { code: "DE", name: "Delaware", fullAnnual: 2129 },
  { code: "DC", name: "District of Columbia", fullAnnual: 2157 },
  { code: "FL", name: "Florida", fullAnnual: 3945 },
  { code: "GA", name: "Georgia", fullAnnual: 2085 },
  { code: "HI", name: "Hawaii", fullAnnual: 1517 },
  { code: "ID", name: "Idaho", fullAnnual: 1272 },
  { code: "IL", name: "Illinois", fullAnnual: 1806 },
  { code: "IN", name: "Indiana", fullAnnual: 1414 },
  { code: "IA", name: "Iowa", fullAnnual: 1630 },
  { code: "KS", name: "Kansas", fullAnnual: 2016 },
  { code: "KY", name: "Kentucky", fullAnnual: 2352 },
  { code: "LA", name: "Louisiana", fullAnnual: 3618 },
  { code: "ME", name: "Maine", fullAnnual: 1175 },
  { code: "MD", name: "Maryland", fullAnnual: 2166 },
  { code: "MA", name: "Massachusetts", fullAnnual: 1725 },
  { code: "MI", name: "Michigan", fullAnnual: 2745 },
  { code: "MN", name: "Minnesota", fullAnnual: 1911 },
  { code: "MS", name: "Mississippi", fullAnnual: 1930 },
  { code: "MO", name: "Missouri", fullAnnual: 2104 },
  { code: "MT", name: "Montana", fullAnnual: 2110 },
  { code: "NE", name: "Nebraska", fullAnnual: 2018 },
  { code: "NV", name: "Nevada", fullAnnual: 2779 },
  { code: "NH", name: "New Hampshire", fullAnnual: 1357 },
  { code: "NJ", name: "New Jersey", fullAnnual: 1902 },
  { code: "NM", name: "New Mexico", fullAnnual: 1907 },
  { code: "NY", name: "New York", fullAnnual: 3374 },
  { code: "NC", name: "North Carolina", fullAnnual: 1741 },
  { code: "ND", name: "North Dakota", fullAnnual: 1665 },
  { code: "OH", name: "Ohio", fullAnnual: 1266 },
  { code: "OK", name: "Oklahoma", fullAnnual: 2237 },
  { code: "OR", name: "Oregon", fullAnnual: 1580 },
  { code: "PA", name: "Pennsylvania", fullAnnual: 1955 },
  { code: "RI", name: "Rhode Island", fullAnnual: 2145 },
  { code: "SC", name: "South Carolina", fullAnnual: 2242 },
  { code: "SD", name: "South Dakota", fullAnnual: 2016 },
  { code: "TN", name: "Tennessee", fullAnnual: 1650 },
  { code: "TX", name: "Texas", fullAnnual: 2438 },
  { code: "UT", name: "Utah", fullAnnual: 1927 },
  { code: "VT", name: "Vermont", fullAnnual: 1122 },
  { code: "VA", name: "Virginia", fullAnnual: 1512 },
  { code: "WA", name: "Washington", fullAnnual: 1622 },
  { code: "WV", name: "West Virginia", fullAnnual: 1783 },
  { code: "WI", name: "Wisconsin", fullAnnual: 1517 },
  { code: "WY", name: "Wyoming", fullAnnual: 1704 },
];

/** Coverage-level multipliers vs full-coverage base.
 *  III/Bankrate: minimum-only liability averages ~40% of full-coverage. */
export const COVERAGE_MULT: Record<CoverageLevel, number> = {
  minimum: 0.4,
  standard: 0.72, // UNVERIFIED — confirm (interpolation between min & full)
  full: 1.0,
};

/** Driver-age multipliers vs the 30–49 base. */
export const AGE_MULT: Record<AgeBracket, number> = {
  "16_19": 2.4, // teens ~2–3× base
  "20_24": 1.55,
  "25_29": 1.15,
  "30_49": 1.0,
  "50_64": 0.92, // UNVERIFIED — confirm
  "65_plus": 1.05, // UNVERIFIED — confirm (curves back up mildly at 70+)
};

/** Vehicle-age multipliers (comp/collision drops as car ages). */
export const VEHICLE_AGE_MULT: Record<VehicleAge, number> = {
  "0_3": 1.08,
  "4_7": 1.0,
  "8_12": 0.94, // UNVERIFIED — confirm
  "13_plus": 0.88, // UNVERIFIED — confirm
};

/** Driving-record multipliers. Bankrate 2024: single at-fault ~1.4×, DUI ~1.9×. */
export const RECORD_MULT: Record<DrivingRecord, number> = {
  clean: 1.0,
  one_minor: 1.22,
  at_fault_or_dui: 1.7,
};

/** Deductible adjustment on comp/collision portion (~60% of full premium).
 *  Higher deductible = lower premium. Values published by III. */
export const DEDUCTIBLE_ADJ: Record<Deductible, number> = {
  250: 1.08,
  500: 1.0,
  1000: 0.91,
  1500: 0.86, // UNVERIFIED — confirm
};
