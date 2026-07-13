/**
 * PAYCHECK CALCULATOR — TAX CONSTANTS
 *
 * ⚠️ VERIFY BEFORE LAUNCH ⚠️
 * These figures are 2025 IRS-published values used as a stable baseline
 * for the 2026 tax year. The IRS typically publishes final 2026 numbers
 * (Rev. Proc.) in Oct–Nov 2025 and finalizes state brackets rolling into
 * January. Before shipping, cross-check every value below against:
 *   - IRS Rev. Proc. (federal brackets, standard deduction, wage base)
 *   - SSA Fact Sheet (Social Security wage base)
 *   - Each state's Department of Revenue for state brackets
 *
 * All calculations are estimates for informational purposes only.
 */

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "annual";

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
};

export const FILING_LABELS: Record<FilingStatus, string> = {
  single: "Single",
  mfj: "Married filing jointly",
  mfs: "Married filing separately",
  hoh: "Head of household",
};

export const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly (52/yr)",
  biweekly: "Biweekly (26/yr)",
  semimonthly: "Semi-monthly (24/yr)",
  monthly: "Monthly (12/yr)",
  annual: "Annual (1/yr)",
};

/** Federal standard deduction — 2025 baseline; verify for 2026. */
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15000,
  mfj: 30000,
  mfs: 15000,
  hoh: 22500,
};

export interface Bracket {
  rate: number; // decimal, e.g. 0.22 for 22%
  upTo: number; // upper bound of this bracket; Infinity for top bracket
}

/** 2025 federal income tax brackets — verify for 2026. */
export const FEDERAL_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { rate: 0.10, upTo: 11925 },
    { rate: 0.12, upTo: 48475 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250525 },
    { rate: 0.35, upTo: 626350 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.10, upTo: 23850 },
    { rate: 0.12, upTo: 96950 },
    { rate: 0.22, upTo: 206700 },
    { rate: 0.24, upTo: 394600 },
    { rate: 0.32, upTo: 501050 },
    { rate: 0.35, upTo: 751600 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfs: [
    { rate: 0.10, upTo: 11925 },
    { rate: 0.12, upTo: 48475 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250525 },
    { rate: 0.35, upTo: 375800 },
    { rate: 0.37, upTo: Infinity },
  ],
  hoh: [
    { rate: 0.10, upTo: 17000 },
    { rate: 0.12, upTo: 64850 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250500 },
    { rate: 0.35, upTo: 626350 },
    { rate: 0.37, upTo: Infinity },
  ],
};

/** FICA constants — 2025 baseline; SSA typically raises wage base each year. */
export const SS_RATE = 0.062;
export const SS_WAGE_BASE = 176100; // 2025 SSA wage base — verify for 2026
export const MEDICARE_RATE = 0.0145;
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
  single: 200000,
  mfj: 250000,
  mfs: 125000,
  hoh: 200000,
};

/** IRS supplemental wage flat rate — 22% federal on amounts up to $1M. */
export const SUPPLEMENTAL_FED_RATE = 0.22;

/** Self-employment tax: 15.3% total on 92.35% of net SE earnings, SS portion capped. */
export const SE_INCOME_ADJUSTMENT = 0.9235;
export const SE_SS_RATE = 0.124; // employer + employee
export const SE_MEDICARE_RATE = 0.029;

/* -------------------------------------------------------------------------- */
/*  STATE INCOME TAX                                                          */
/* -------------------------------------------------------------------------- */

export type StateTax =
  | { kind: "none" }
  | { kind: "flat"; rate: number }
  | { kind: "brackets"; brackets: Record<FilingStatus, Bracket[]>; stdDeduction?: Record<FilingStatus, number> };

export interface StateInfo {
  code: string;
  name: string;
  tax: StateTax;
}

/**
 * Ten highest-population income-tax states with progressive/flat data +
 * the nine no-income-tax states. State brackets are simplified: some
 * states use their own AGI / std deduction rules that we approximate
 * against federal taxable income for a ballpark estimate. Verify each
 * state's DOR page before launch.
 */
export const STATES: StateInfo[] = [
  // No income tax
  { code: "AK", name: "Alaska", tax: { kind: "none" } },
  { code: "FL", name: "Florida", tax: { kind: "none" } },
  { code: "NH", name: "New Hampshire", tax: { kind: "none" } }, // wages exempt (interest/div tax repealed)
  { code: "NV", name: "Nevada", tax: { kind: "none" } },
  { code: "SD", name: "South Dakota", tax: { kind: "none" } },
  { code: "TN", name: "Tennessee", tax: { kind: "none" } },
  { code: "TX", name: "Texas", tax: { kind: "none" } },
  { code: "WA", name: "Washington", tax: { kind: "none" } },
  { code: "WY", name: "Wyoming", tax: { kind: "none" } },

  // Top-10 populous income-tax states — 2025 baseline
  {
    code: "CA",
    name: "California",
    tax: {
      kind: "brackets",
      stdDeduction: { single: 5540, mfj: 11080, mfs: 5540, hoh: 11080 },
      brackets: {
        single: [
          { rate: 0.01, upTo: 10756 },
          { rate: 0.02, upTo: 25499 },
          { rate: 0.04, upTo: 40245 },
          { rate: 0.06, upTo: 55866 },
          { rate: 0.08, upTo: 70606 },
          { rate: 0.093, upTo: 360659 },
          { rate: 0.103, upTo: 432787 },
          { rate: 0.113, upTo: 721314 },
          { rate: 0.123, upTo: Infinity },
        ],
        mfj: [
          { rate: 0.01, upTo: 21512 },
          { rate: 0.02, upTo: 50998 },
          { rate: 0.04, upTo: 80490 },
          { rate: 0.06, upTo: 111732 },
          { rate: 0.08, upTo: 141212 },
          { rate: 0.093, upTo: 721318 },
          { rate: 0.103, upTo: 865574 },
          { rate: 0.113, upTo: 1442628 },
          { rate: 0.123, upTo: Infinity },
        ],
        mfs: [
          { rate: 0.01, upTo: 10756 },
          { rate: 0.02, upTo: 25499 },
          { rate: 0.04, upTo: 40245 },
          { rate: 0.06, upTo: 55866 },
          { rate: 0.08, upTo: 70606 },
          { rate: 0.093, upTo: 360659 },
          { rate: 0.103, upTo: 432787 },
          { rate: 0.113, upTo: 721314 },
          { rate: 0.123, upTo: Infinity },
        ],
        hoh: [
          { rate: 0.01, upTo: 21527 },
          { rate: 0.02, upTo: 51000 },
          { rate: 0.04, upTo: 65744 },
          { rate: 0.06, upTo: 81364 },
          { rate: 0.08, upTo: 96107 },
          { rate: 0.093, upTo: 490493 },
          { rate: 0.103, upTo: 588593 },
          { rate: 0.113, upTo: 980987 },
          { rate: 0.123, upTo: Infinity },
        ],
      },
    },
  },
  {
    code: "NY",
    name: "New York",
    tax: {
      kind: "brackets",
      stdDeduction: { single: 8000, mfj: 16050, mfs: 8000, hoh: 11200 },
      brackets: {
        single: [
          { rate: 0.04, upTo: 8500 },
          { rate: 0.045, upTo: 11700 },
          { rate: 0.0525, upTo: 13900 },
          { rate: 0.055, upTo: 80650 },
          { rate: 0.06, upTo: 215400 },
          { rate: 0.0685, upTo: 1077550 },
          { rate: 0.0965, upTo: 5000000 },
          { rate: 0.103, upTo: 25000000 },
          { rate: 0.109, upTo: Infinity },
        ],
        mfj: [
          { rate: 0.04, upTo: 17150 },
          { rate: 0.045, upTo: 23600 },
          { rate: 0.0525, upTo: 27900 },
          { rate: 0.055, upTo: 161550 },
          { rate: 0.06, upTo: 323200 },
          { rate: 0.0685, upTo: 2155350 },
          { rate: 0.0965, upTo: 5000000 },
          { rate: 0.103, upTo: 25000000 },
          { rate: 0.109, upTo: Infinity },
        ],
        mfs: [
          { rate: 0.04, upTo: 8500 },
          { rate: 0.045, upTo: 11700 },
          { rate: 0.0525, upTo: 13900 },
          { rate: 0.055, upTo: 80650 },
          { rate: 0.06, upTo: 215400 },
          { rate: 0.0685, upTo: 1077550 },
          { rate: 0.0965, upTo: 5000000 },
          { rate: 0.103, upTo: 25000000 },
          { rate: 0.109, upTo: Infinity },
        ],
        hoh: [
          { rate: 0.04, upTo: 12800 },
          { rate: 0.045, upTo: 17650 },
          { rate: 0.0525, upTo: 20900 },
          { rate: 0.055, upTo: 107650 },
          { rate: 0.06, upTo: 269300 },
          { rate: 0.0685, upTo: 1616450 },
          { rate: 0.0965, upTo: 5000000 },
          { rate: 0.103, upTo: 25000000 },
          { rate: 0.109, upTo: Infinity },
        ],
      },
    },
  },
  { code: "PA", name: "Pennsylvania", tax: { kind: "flat", rate: 0.0307 } },
  { code: "IL", name: "Illinois", tax: { kind: "flat", rate: 0.0495 } },
  {
    code: "OH",
    name: "Ohio",
    tax: {
      kind: "brackets",
      brackets: {
        single: [
          { rate: 0, upTo: 26050 },
          { rate: 0.0275, upTo: 100000 },
          { rate: 0.035, upTo: Infinity },
        ],
        mfj: [
          { rate: 0, upTo: 26050 },
          { rate: 0.0275, upTo: 100000 },
          { rate: 0.035, upTo: Infinity },
        ],
        mfs: [
          { rate: 0, upTo: 26050 },
          { rate: 0.0275, upTo: 100000 },
          { rate: 0.035, upTo: Infinity },
        ],
        hoh: [
          { rate: 0, upTo: 26050 },
          { rate: 0.0275, upTo: 100000 },
          { rate: 0.035, upTo: Infinity },
        ],
      },
    },
  },
  {
    code: "GA",
    name: "Georgia",
    tax: { kind: "flat", rate: 0.0539 },
  },
  {
    code: "NC",
    name: "North Carolina",
    tax: { kind: "flat", rate: 0.0425 },
  },
  {
    code: "MI",
    name: "Michigan",
    tax: { kind: "flat", rate: 0.0425 },
  },
  {
    code: "NJ",
    name: "New Jersey",
    tax: {
      kind: "brackets",
      brackets: {
        single: [
          { rate: 0.014, upTo: 20000 },
          { rate: 0.0175, upTo: 35000 },
          { rate: 0.035, upTo: 40000 },
          { rate: 0.05525, upTo: 75000 },
          { rate: 0.0637, upTo: 500000 },
          { rate: 0.0897, upTo: 1000000 },
          { rate: 0.1075, upTo: Infinity },
        ],
        mfj: [
          { rate: 0.014, upTo: 20000 },
          { rate: 0.0175, upTo: 50000 },
          { rate: 0.0245, upTo: 70000 },
          { rate: 0.035, upTo: 80000 },
          { rate: 0.05525, upTo: 150000 },
          { rate: 0.0637, upTo: 500000 },
          { rate: 0.0897, upTo: 1000000 },
          { rate: 0.1075, upTo: Infinity },
        ],
        mfs: [
          { rate: 0.014, upTo: 20000 },
          { rate: 0.0175, upTo: 35000 },
          { rate: 0.035, upTo: 40000 },
          { rate: 0.05525, upTo: 75000 },
          { rate: 0.0637, upTo: 500000 },
          { rate: 0.0897, upTo: 1000000 },
          { rate: 0.1075, upTo: Infinity },
        ],
        hoh: [
          { rate: 0.014, upTo: 20000 },
          { rate: 0.0175, upTo: 50000 },
          { rate: 0.0245, upTo: 70000 },
          { rate: 0.035, upTo: 80000 },
          { rate: 0.05525, upTo: 150000 },
          { rate: 0.0637, upTo: 500000 },
          { rate: 0.0897, upTo: 1000000 },
          { rate: 0.1075, upTo: Infinity },
        ],
      },
    },
  },
  {
    code: "VA",
    name: "Virginia",
    tax: {
      kind: "brackets",
      brackets: {
        single: [
          { rate: 0.02, upTo: 3000 },
          { rate: 0.03, upTo: 5000 },
          { rate: 0.05, upTo: 17000 },
          { rate: 0.0575, upTo: Infinity },
        ],
        mfj: [
          { rate: 0.02, upTo: 3000 },
          { rate: 0.03, upTo: 5000 },
          { rate: 0.05, upTo: 17000 },
          { rate: 0.0575, upTo: Infinity },
        ],
        mfs: [
          { rate: 0.02, upTo: 3000 },
          { rate: 0.03, upTo: 5000 },
          { rate: 0.05, upTo: 17000 },
          { rate: 0.0575, upTo: Infinity },
        ],
        hoh: [
          { rate: 0.02, upTo: 3000 },
          { rate: 0.03, upTo: 5000 },
          { rate: 0.05, upTo: 17000 },
          { rate: 0.0575, upTo: Infinity },
        ],
      },
    },
  },
];

export function findState(code: string): StateInfo {
  return STATES.find((s) => s.code === code) ?? STATES[0];
}
