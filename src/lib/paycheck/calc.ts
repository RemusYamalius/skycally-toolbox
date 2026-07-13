import {
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD,
  FEDERAL_BRACKETS,
  MEDICARE_RATE,
  PERIODS_PER_YEAR,
  SE_INCOME_ADJUSTMENT,
  SE_MEDICARE_RATE,
  SE_SS_RATE,
  SS_RATE,
  SS_WAGE_BASE,
  STANDARD_DEDUCTION,
  SUPPLEMENTAL_FED_RATE,
  findState,
  type Bracket,
  type FilingStatus,
  type PayFrequency,
} from "./constants";

export interface PaycheckInput {
  grossPerPeriod: number;
  frequency: PayFrequency;
  filing: FilingStatus;
  stateCode: string;
  contrib401kPct: number; // 0-100 of gross
  hsaAnnual: number;
  healthPremiumPerPeriod: number;
  postTaxPerPeriod: number;
  bonus: number; // one-time this period
  selfEmployed: boolean;
}

export interface PaycheckResult {
  annualGross: number;
  annualBonus: number;
  preTaxAnnual: {
    contrib401k: number;
    hsa: number;
    health: number;
    total: number;
  };
  federalTax: number; // regular
  federalBonusTax: number; // supplemental flat
  stateTax: number;
  stateBonusTax: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  seTax: number;
  postTaxAnnual: number;
  totalTaxAnnual: number;
  netAnnual: number;
  netPerPeriod: number;
  grossPerPeriod: number;
  periods: number;
  marginalRate: number; // 0-1
  effectiveRate: number; // 0-1
  taxableIncomeFederal: number;
}

function progressive(taxable: number, brackets: Bracket[]): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    if (taxable <= b.upTo) {
      tax += (taxable - lower) * b.rate;
      return tax;
    }
    tax += (b.upTo - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}

function topRate(taxable: number, brackets: Bracket[]): number {
  if (taxable <= 0) return brackets[0]?.rate ?? 0;
  let lower = 0;
  for (const b of brackets) {
    if (taxable <= b.upTo) return b.rate;
    lower = b.upTo;
  }
  return brackets[brackets.length - 1].rate;
  void lower;
}

export function computeFederal(taxable: number, filing: FilingStatus): number {
  return progressive(Math.max(0, taxable), FEDERAL_BRACKETS[filing]);
}

export function computeState(taxable: number, stateCode: string, filing: FilingStatus): number {
  const s = findState(stateCode);
  if (s.tax.kind === "none") return 0;
  if (s.tax.kind === "flat") return Math.max(0, taxable) * s.tax.rate;
  const stdDed = s.tax.stdDeduction?.[filing] ?? 0;
  const stateTaxable = Math.max(0, taxable - stdDed);
  // taxable here is already federal taxable (post fed std deduction). Add fed std deduction back
  // for a closer approximation to state AGI, then subtract state std deduction.
  // We keep it simple: use taxable + fedStdDeduction - stateStdDeduction as state taxable.
  const base = Math.max(0, taxable + STANDARD_DEDUCTION[filing] - stdDed);
  return progressive(base, s.tax.brackets[filing]);
  void stateTaxable;
}

export function stateMarginalRate(taxable: number, stateCode: string, filing: FilingStatus): number {
  const s = findState(stateCode);
  if (s.tax.kind === "none") return 0;
  if (s.tax.kind === "flat") return s.tax.rate;
  const base = Math.max(0, taxable + STANDARD_DEDUCTION[filing] - (s.tax.stdDeduction?.[filing] ?? 0));
  return topRate(base, s.tax.brackets[filing]);
}

export function computeFICA(annualGross: number, filing: FilingStatus) {
  const ss = Math.min(annualGross, SS_WAGE_BASE) * SS_RATE;
  const medBase = annualGross * MEDICARE_RATE;
  const addlBase = Math.max(0, annualGross - ADDITIONAL_MEDICARE_THRESHOLD[filing]) * ADDITIONAL_MEDICARE_RATE;
  return { socialSecurity: ss, medicare: medBase, additionalMedicare: addlBase };
}

export function computeSE(netEarnings: number) {
  const base = Math.max(0, netEarnings) * SE_INCOME_ADJUSTMENT;
  const ss = Math.min(base, SS_WAGE_BASE) * SE_SS_RATE;
  const med = base * SE_MEDICARE_RATE;
  return ss + med;
}

export function computePaycheck(input: PaycheckInput): PaycheckResult {
  const periods = PERIODS_PER_YEAR[input.frequency];
  const annualGrossRegular = Math.max(0, input.grossPerPeriod) * periods;
  const annualBonus = Math.max(0, input.bonus);
  const annualGross = annualGrossRegular + annualBonus;

  const contrib401k = annualGrossRegular * (Math.min(100, Math.max(0, input.contrib401kPct)) / 100);
  const hsa = Math.max(0, input.hsaAnnual);
  const health = Math.max(0, input.healthPremiumPerPeriod) * periods;
  const preTaxTotal = contrib401k + hsa + health;

  const stdDed = STANDARD_DEDUCTION[input.filing];
  const taxableFederalRegular = Math.max(0, annualGrossRegular - preTaxTotal - stdDed);

  // Regular federal tax on regular wages
  const federalTax = computeFederal(taxableFederalRegular, input.filing);
  // Supplemental (bonus) — flat 22% federal
  const federalBonusTax = annualBonus * SUPPLEMENTAL_FED_RATE;

  // State: use regular taxable + bonus (states generally tax bonuses at regular rates)
  const stateTaxableRegular = Math.max(0, annualGrossRegular - preTaxTotal - stdDed);
  const stateTax = computeState(stateTaxableRegular, input.stateCode, input.filing);
  const stateMarg = stateMarginalRate(stateTaxableRegular, input.stateCode, input.filing);
  const stateBonusTax = annualBonus * stateMarg;

  // FICA — applies to all wages, no pre-tax deduction adjustment for 401(k)
  // (401k IS subject to FICA; HSA via cafeteria plan and pre-tax health premiums are NOT).
  // Simplification: apply FICA to gross - hsa - health (approximates cafeteria plan).
  const ficaBase = Math.max(0, annualGross - hsa - health);
  const fica = computeFICA(ficaBase, input.filing);

  // Self-employment tax replaces FICA employee share
  let seTax = 0;
  let socialSecurity = fica.socialSecurity;
  let medicare = fica.medicare;
  let additionalMedicare = fica.additionalMedicare;
  if (input.selfEmployed) {
    seTax = computeSE(annualGross - hsa);
    socialSecurity = 0;
    medicare = 0;
    additionalMedicare = 0;
  }

  const postTaxAnnual = Math.max(0, input.postTaxPerPeriod) * periods;

  const totalTaxAnnual =
    federalTax + federalBonusTax + stateTax + stateBonusTax + socialSecurity + medicare + additionalMedicare + seTax;

  const netAnnual = annualGross - preTaxTotal - totalTaxAnnual - postTaxAnnual;
  const netPerPeriod = (netAnnual - annualBonus * (1 - SUPPLEMENTAL_FED_RATE - stateMarg)) / periods; // remove bonus net for per-period baseline
  const perPeriodBaseline = netAnnual / periods;

  const fedMarg = topRate(taxableFederalRegular, FEDERAL_BRACKETS[input.filing]);
  const medMarg = MEDICARE_RATE + (annualGross > ADDITIONAL_MEDICARE_THRESHOLD[input.filing] ? ADDITIONAL_MEDICARE_RATE : 0);
  const ssMarg = annualGross < SS_WAGE_BASE ? SS_RATE : 0;
  const marginalRate = fedMarg + stateMarg + medMarg + (input.selfEmployed ? 0 : ssMarg);

  const effectiveRate = annualGross > 0 ? totalTaxAnnual / annualGross : 0;

  return {
    annualGross,
    annualBonus,
    preTaxAnnual: { contrib401k, hsa, health, total: preTaxTotal },
    federalTax,
    federalBonusTax,
    stateTax,
    stateBonusTax,
    socialSecurity,
    medicare,
    additionalMedicare,
    seTax,
    postTaxAnnual,
    totalTaxAnnual,
    netAnnual,
    netPerPeriod: perPeriodBaseline,
    grossPerPeriod: annualGross / periods,
    periods,
    marginalRate,
    effectiveRate,
    taxableIncomeFederal: taxableFederalRegular,
  };
  void netPerPeriod;
}

export function compareStates(input: PaycheckInput, stateCodes: string[]): Array<{ code: string; name: string; net: number }> {
  return stateCodes.map((code) => {
    const r = computePaycheck({ ...input, stateCode: code });
    return { code, name: findState(code).name, net: r.netAnnual };
  });
}

export function fmtUSD(n: number, opts: { decimals?: 0 | 2 } = {}): string {
  const d = opts.decimals ?? 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}
