import {
  LIFE_BASE_20YR_500K,
  HEALTH_MULT,
  SMOKER_MULT,
  TERM_MULT,
  AUTO_STATES,
  COVERAGE_MULT,
  AGE_MULT,
  VEHICLE_AGE_MULT,
  RECORD_MULT,
  DEDUCTIBLE_ADJ,
  type Sex,
  type HealthClass,
  type TermYears,
  type CoverageLevel,
  type DrivingRecord,
  type AgeBracket,
  type VehicleAge,
  type Deductible,
} from "./constants";

export const fmtUSD0 = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );

/* ============================================================
 * LIFE — Needs (DIME + Income multiplier)
 * ============================================================ */

export interface LifeNeedInput {
  annualIncome: number;
  yearsOfSupport: number;
  debtNonMortgage: number;
  mortgageBalance: number;
  educationCosts: number;
}

export interface LifeNeedResult {
  dime: { debt: number; income: number; mortgage: number; education: number; total: number };
  incomeMultiplier: { low: number; high: number };
}

export function computeLifeNeed(i: LifeNeedInput): LifeNeedResult {
  const debt = Math.max(0, i.debtNonMortgage);
  const income = Math.max(0, i.annualIncome) * Math.max(0, i.yearsOfSupport);
  const mortgage = Math.max(0, i.mortgageBalance);
  const education = Math.max(0, i.educationCosts);
  return {
    dime: { debt, income, mortgage, education, total: debt + income + mortgage + education },
    incomeMultiplier: {
      low: Math.max(0, i.annualIncome) * 10,
      high: Math.max(0, i.annualIncome) * 15,
    },
  };
}

/* ============================================================
 * LIFE — Premium range
 * ============================================================ */

export interface LifePremiumInput {
  age: number;
  sex: Sex;
  smoker: boolean;
  healthClass: HealthClass;
  coverage: number; // face amount
  term: TermYears;
}

export interface LifePremiumResult {
  monthlyLow: number;
  monthlyHigh: number;
  annualLow: number;
  annualHigh: number;
  factorsApplied: {
    age: number;
    sex: Sex;
    smoker: boolean;
    healthClass: HealthClass;
    coverage: number;
    term: TermYears;
  };
}

function lookupBase(sex: Sex, age: number): number {
  const table = LIFE_BASE_20YR_500K[sex];
  const ages = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const clamped = Math.max(ages[0], Math.min(ages[ages.length - 1], age));
  // Linear interp between nearest anchor ages
  let lo = ages[0];
  let hi = ages[ages.length - 1];
  for (let i = 0; i < ages.length - 1; i++) {
    if (clamped >= ages[i] && clamped <= ages[i + 1]) {
      lo = ages[i];
      hi = ages[i + 1];
      break;
    }
  }
  if (lo === hi) return table[lo];
  const t = (clamped - lo) / (hi - lo);
  return table[lo] * (1 - t) + table[hi] * t;
}

export function computeLifePremium(i: LifePremiumInput): LifePremiumResult {
  const base = lookupBase(i.sex, i.age); // 20-yr, $500k, Preferred, non-smoker
  const health = HEALTH_MULT[i.healthClass];
  const smokerMult = i.smoker ? SMOKER_MULT : { low: 1, high: 1 };
  const termMult = TERM_MULT[i.term];
  const coverageRatio = Math.max(0.2, i.coverage / 500_000);
  // Concave scaling: sqrt component softens per-thousand rate at higher face amounts.
  const scale = 0.7 * coverageRatio + 0.3 * Math.sqrt(coverageRatio);

  const annualLow = base * health.low * smokerMult.low * termMult * scale;
  const annualHigh = base * health.high * smokerMult.high * termMult * scale * 1.15;

  return {
    annualLow,
    annualHigh,
    monthlyLow: annualLow / 12,
    monthlyHigh: annualHigh / 12,
    factorsApplied: {
      age: i.age,
      sex: i.sex,
      smoker: i.smoker,
      healthClass: i.healthClass,
      coverage: i.coverage,
      term: i.term,
    },
  };
}

/* ============================================================
 * CAR — Premium
 * ============================================================ */

export interface CarPremiumInput {
  stateCode: string;
  ageBracket: AgeBracket;
  vehicleAge: VehicleAge;
  record: DrivingRecord;
  deductible: Deductible;
  coverage: CoverageLevel; // for the transparency panel focus
}

export interface CarBreakdownRow {
  label: string;
  factor: number; // multiplicative factor applied at this step (1.0 = no change)
  runningTotal: number;
}

export interface CarPremiumResult {
  stateName: string;
  stateBaseFullAnnual: number;
  byLevel: { minimum: number; standard: number; full: number }; // annual
  focusLevel: CoverageLevel;
  breakdown: CarBreakdownRow[]; // for focusLevel
}

export function computeCarPremium(i: CarPremiumInput): CarPremiumResult {
  const st = AUTO_STATES.find((s) => s.code === i.stateCode) ?? AUTO_STATES[0];
  const stateBase = st.fullAnnual;

  const ageF = AGE_MULT[i.ageBracket];
  const vehF = VEHICLE_AGE_MULT[i.vehicleAge];
  const recF = RECORD_MULT[i.record];
  const dedF = DEDUCTIBLE_ADJ[i.deductible];

  const perLevel = (lvl: CoverageLevel) => stateBase * COVERAGE_MULT[lvl] * ageF * vehF * recF * dedF;

  const byLevel = {
    minimum: perLevel("minimum"),
    standard: perLevel("standard"),
    full: perLevel("full"),
  };

  // Build breakdown for focus level
  let running = stateBase;
  const breakdown: CarBreakdownRow[] = [
    { label: `${st.name} state avg (full coverage, Bankrate 2024)`, factor: 1, runningTotal: running },
  ];
  running *= COVERAGE_MULT[i.coverage];
  breakdown.push({
    label: `Coverage level: ${i.coverage}`,
    factor: COVERAGE_MULT[i.coverage],
    runningTotal: running,
  });
  running *= ageF;
  breakdown.push({ label: `Driver age bracket`, factor: ageF, runningTotal: running });
  running *= vehF;
  breakdown.push({ label: `Vehicle age bracket`, factor: vehF, runningTotal: running });
  running *= recF;
  breakdown.push({ label: `Driving record`, factor: recF, runningTotal: running });
  running *= dedF;
  breakdown.push({ label: `Deductible ($${i.deductible})`, factor: dedF, runningTotal: running });

  return {
    stateName: st.name,
    stateBaseFullAnnual: stateBase,
    byLevel,
    focusLevel: i.coverage,
    breakdown,
  };
}
