// Retirement / 401(k) projection — year-by-year simulation with a
// conservative/optimistic return range, inflation-adjusted values, and
// tiered employer match.

export interface MatchTier {
  matchPct: number; // e.g. 100 = 100% match
  capPct: number; // employer matches employee contributions only up to this % of salary
}

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  annualSalary: number;

  employeeContribPct: number; // % of salary
  tier1: MatchTier;
  tier2?: MatchTier; // optional second match tier (applies to the portion of contribution above tier1.capPct)

  contribEscalationPct: number; // add this many percentage points each year to employeeContribPct
  maxContribPct: number; // cap on the escalated employee contribution %

  salaryGrowthPct: number;
  inflationPct: number;
  conservativeReturnPct: number;
  optimisticReturnPct: number;
}

export interface YearRow {
  age: number;
  salary: number;
  employeeContribution: number;
  employerMatch: number;
  totalContribution: number;
  endBalanceConservative: number;
  endBalanceOptimistic: number;
  realBalanceConservative: number;
  realBalanceOptimistic: number;
}

export interface FourPct {
  annual: number;
  monthly: number;
}

export interface RetirementResult {
  rows: YearRow[];
  finalNominalConservative: number;
  finalNominalOptimistic: number;
  finalRealConservative: number;
  finalRealOptimistic: number;
  incomeNominalConservative: FourPct;
  incomeNominalOptimistic: FourPct;
  incomeRealConservative: FourPct;
  incomeRealOptimistic: FourPct;
  firstYear: {
    employeeContribution: number;
    employerMatch: number;
    total: number;
  };
  years: number;
}

/**
 * Tiered employer match — the way real 401(k) matches work.
 * Tier 1 applies to the employee's contribution up to tier1.capPct of salary.
 * Tier 2 applies to the portion of the employee's contribution ABOVE
 * tier1.capPct, capped by tier2.capPct.
 */
export function computeEmployerMatch(
  salary: number,
  employeeContribPct: number,
  tier1: MatchTier,
  tier2?: MatchTier,
): number {
  const empPct = Math.max(0, employeeContribPct);
  const tier1Contrib = Math.min(empPct, Math.max(0, tier1.capPct));
  const tier1Match = (tier1Contrib / 100) * salary * (Math.max(0, tier1.matchPct) / 100);

  let tier2Match = 0;
  if (tier2 && tier2.capPct > 0 && empPct > tier1.capPct) {
    const tier2Contrib = Math.min(empPct - tier1.capPct, Math.max(0, tier2.capPct));
    tier2Match = (tier2Contrib / 100) * salary * (Math.max(0, tier2.matchPct) / 100);
  }
  return tier1Match + tier2Match;
}

export function simulate(inputs: RetirementInputs): RetirementResult {
  const years = Math.max(0, Math.floor(inputs.retirementAge - inputs.currentAge));
  const rows: YearRow[] = [];

  let salary = Math.max(0, inputs.annualSalary);
  let empPct = Math.max(0, inputs.employeeContribPct);
  let balCon = Math.max(0, inputs.currentBalance);
  let balOpt = Math.max(0, inputs.currentBalance);

  const rCon = inputs.conservativeReturnPct / 100;
  const rOpt = inputs.optimisticReturnPct / 100;
  const infl = inputs.inflationPct / 100;
  const salG = inputs.salaryGrowthPct / 100;

  let firstYearEmp = 0;
  let firstYearMatch = 0;

  for (let i = 0; i < years; i++) {
    const age = inputs.currentAge + i + 1;
    const employeeContribution = (empPct / 100) * salary;
    const employerMatch = computeEmployerMatch(salary, empPct, inputs.tier1, inputs.tier2);
    const totalContribution = employeeContribution + employerMatch;

    if (i === 0) {
      firstYearEmp = employeeContribution;
      firstYearMatch = employerMatch;
    }

    // Assume contributions made mid-year (half-year growth) for a bit more
    // realism than pure end-of-year: grow balance by full rate, then add
    // contributions grown by half the rate.
    balCon = balCon * (1 + rCon) + totalContribution * (1 + rCon / 2);
    balOpt = balOpt * (1 + rOpt) + totalContribution * (1 + rOpt / 2);

    const deflator = Math.pow(1 + infl, i + 1);
    const realCon = balCon / deflator;
    const realOpt = balOpt / deflator;

    rows.push({
      age,
      salary,
      employeeContribution,
      employerMatch,
      totalContribution,
      endBalanceConservative: balCon,
      endBalanceOptimistic: balOpt,
      realBalanceConservative: realCon,
      realBalanceOptimistic: realOpt,
    });

    // step for next year
    salary = salary * (1 + salG);
    empPct = Math.min(inputs.maxContribPct, empPct + Math.max(0, inputs.contribEscalationPct));
  }

  const last = rows[rows.length - 1];
  const finalNominalConservative = last?.endBalanceConservative ?? balCon;
  const finalNominalOptimistic = last?.endBalanceOptimistic ?? balOpt;
  const finalRealConservative = last?.realBalanceConservative ?? balCon;
  const finalRealOptimistic = last?.realBalanceOptimistic ?? balOpt;

  return {
    rows,
    finalNominalConservative,
    finalNominalOptimistic,
    finalRealConservative,
    finalRealOptimistic,
    incomeNominalConservative: applyFourPercentRule(finalNominalConservative),
    incomeNominalOptimistic: applyFourPercentRule(finalNominalOptimistic),
    incomeRealConservative: applyFourPercentRule(finalRealConservative),
    incomeRealOptimistic: applyFourPercentRule(finalRealOptimistic),
    firstYear: {
      employeeContribution: firstYearEmp,
      employerMatch: firstYearMatch,
      total: firstYearEmp + firstYearMatch,
    },
    years,
  };
}

export function applyFourPercentRule(balance: number): FourPct {
  const annual = Math.max(0, balance) * 0.04;
  return { annual, monthly: annual / 12 };
}

// Commonly cited Fidelity-style age-based savings multiples (rules of thumb, not guarantees).
const BENCHMARK_ANCHORS: Array<{ age: number; multiple: number }> = [
  { age: 30, multiple: 1 },
  { age: 40, multiple: 3 },
  { age: 50, multiple: 6 },
  { age: 60, multiple: 8 },
  { age: 67, multiple: 10 },
];

export function targetMultipleForAge(age: number): number {
  if (age <= BENCHMARK_ANCHORS[0].age) {
    // scale linearly from 0× at age 20 up to the first anchor
    const first = BENCHMARK_ANCHORS[0];
    if (age <= 20) return 0;
    return (first.multiple * (age - 20)) / (first.age - 20);
  }
  const last = BENCHMARK_ANCHORS[BENCHMARK_ANCHORS.length - 1];
  if (age >= last.age) return last.multiple;
  for (let i = 0; i < BENCHMARK_ANCHORS.length - 1; i++) {
    const a = BENCHMARK_ANCHORS[i];
    const b = BENCHMARK_ANCHORS[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return a.multiple + t * (b.multiple - a.multiple);
    }
  }
  return last.multiple;
}

export type BenchmarkStatus = "behind" | "on-track" | "ahead";

export interface BenchmarkResult {
  targetMultiple: number;
  actualMultiple: number;
  targetBalance: number;
  status: BenchmarkStatus;
  ratio: number; // actual / target
}

export function benchmarkStatus(
  currentAge: number,
  currentBalance: number,
  salary: number,
): BenchmarkResult {
  const target = targetMultipleForAge(currentAge);
  const actual = salary > 0 ? currentBalance / salary : 0;
  const targetBalance = target * salary;
  const ratio = target > 0 ? actual / target : 1;
  let status: BenchmarkStatus = "on-track";
  if (ratio < 0.75) status = "behind";
  else if (ratio > 1.25) status = "ahead";
  return { targetMultiple: target, actualMultiple: actual, targetBalance, status, ratio };
}

export function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(n) ? n : 0));
}

export function fmtUSDCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
