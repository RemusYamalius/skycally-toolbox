import { addMonths, format } from "date-fns";

export type RepaymentPlan = "standard" | "graduated" | "idr";
export type LoanType = "federal-subsidized" | "federal-unsubsidized" | "graduate-plus" | "private";

/** 2026 HHS poverty guidelines (48 contiguous states + DC). */
export const FPL_BASE = 15650;
export const FPL_PER_PERSON = 5380;
/** SAVE shelters 225% of the federal poverty level. */
export const IDR_EXEMPT_MULTIPLIER = 2.25;
/** Undergraduate SAVE rate on discretionary income. */
export const IDR_DISCRETIONARY_RATE = 0.05;
/** Undergraduate forgiveness horizon under SAVE (20 years). */
export const IDR_FORGIVENESS_MONTHS = 240;

export interface LoanInput {
  balance: number;
  rate: number;
  termYears: number;
  plan: RepaymentPlan;
  grossIncome?: number;
  familySize?: number;
}

export interface MonthlySnapshot {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface SimResult {
  plan: RepaymentPlan;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  payoffMonths: number;
  forgiven?: number;
  schedule: MonthlySnapshot[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function povertyLine(familySize: number): number {
  const size = Math.max(1, Math.floor(familySize || 1));
  return FPL_BASE + (size - 1) * FPL_PER_PERSON;
}

export function idrExemptIncome(familySize: number): number {
  return povertyLine(familySize) * IDR_EXEMPT_MULTIPLIER;
}

export function idrMonthlyPayment(grossIncome: number, familySize: number): number {
  const discretionary = Math.max(0, (grossIncome || 0) - idrExemptIncome(familySize));
  return (discretionary * IDR_DISCRETIONARY_RATE) / 12;
}

/** Standard PMT: balance × r(1+r)^n / ((1+r)^n − 1). */
export function standardPayment(balance: number, rate: number, termYears: number): number {
  const n = Math.max(1, Math.round(termYears * 12));
  if (balance <= 0) return 0;
  const r = rate / 100 / 12;
  if (r === 0) return balance / n;
  const pow = Math.pow(1 + r, n);
  return (balance * r * pow) / (pow - 1);
}

interface AmortOptions {
  /** payment(monthIndex1Based, currentBalance) → payment for that month */
  paymentFor: (month: number, balance: number) => number;
  maxMonths: number;
  /** SAVE: unpaid interest is waived instead of accruing. */
  waiveUnpaidInterest?: boolean;
}

function amortize(balance0: number, rate: number, opts: AmortOptions) {
  const r = rate / 100 / 12;
  let balance = balance0;
  let totalPaid = 0;
  let totalInterest = 0;
  const schedule: MonthlySnapshot[] = [];
  let month = 0;
  while (balance > 0.005 && month < opts.maxMonths) {
    month += 1;
    const interest = balance * r;
    let payment = Math.max(0, opts.paymentFor(month, balance));
    let principal = payment - interest;
    if (principal >= balance) {
      principal = balance;
      payment = principal + interest;
    }
    if (principal < 0) {
      // Payment doesn't cover interest.
      principal = 0;
      if (!opts.waiveUnpaidInterest) {
        balance += interest - payment;
      }
    } else {
      balance -= principal;
    }
    totalPaid += payment;
    totalInterest += Math.min(payment, interest);
    schedule.push({
      month,
      payment: round2(payment),
      principal: round2(principal),
      interest: round2(Math.min(payment, interest)),
      balance: round2(Math.max(0, balance)),
    });
  }
  return { balance: Math.max(0, balance), totalPaid, totalInterest, schedule, months: month };
}

function graduatedPaymentFactory(balance: number, rate: number, termYears: number) {
  const n = Math.max(1, Math.round(termYears * 12));
  const r = rate / 100 / 12;
  const std = standardPayment(balance, rate, termYears);
  const minFirst = Math.max(std * 0.5, balance * r * 1.0001);
  const steps = Math.max(1, Math.ceil(n / 24));

  // Present value of the graduated stream for a given step-up growth factor g.
  const pv = (g: number) => {
    let value = 0;
    let discount = 1;
    for (let m = 1; m <= n; m++) {
      discount /= 1 + r;
      const stepIndex = Math.min(steps - 1, Math.floor((m - 1) / 24));
      value += minFirst * Math.pow(g, stepIndex) * discount;
    }
    return value;
  };

  let lo = 1;
  let hi = 4;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) < balance) lo = mid;
    else hi = mid;
  }
  const growth = (lo + hi) / 2;
  return {
    growth,
    first: minFirst,
    paymentFor: (month: number) => {
      const stepIndex = Math.min(steps - 1, Math.floor((month - 1) / 24));
      return minFirst * Math.pow(growth, stepIndex);
    },
  };
}

export function simulate(input: LoanInput): SimResult {
  const balance = Math.max(0, input.balance || 0);
  const rate = Math.max(0, input.rate || 0);
  const termYears = Math.max(1, input.termYears || 10);
  const n = Math.round(termYears * 12);

  if (balance <= 0) {
    return {
      plan: input.plan,
      monthlyPayment: 0,
      totalPaid: 0,
      totalInterest: 0,
      payoffMonths: 0,
      schedule: [],
    };
  }

  if (input.plan === "standard") {
    const pmt = standardPayment(balance, rate, termYears);
    const a = amortize(balance, rate, { paymentFor: () => pmt, maxMonths: n });
    return {
      plan: "standard",
      monthlyPayment: round2(pmt),
      totalPaid: round2(a.totalPaid),
      totalInterest: round2(a.totalInterest),
      payoffMonths: a.months,
      schedule: a.schedule,
    };
  }

  if (input.plan === "graduated") {
    const g = graduatedPaymentFactory(balance, rate, termYears);
    const a = amortize(balance, rate, { paymentFor: (m) => g.paymentFor(m), maxMonths: n });
    return {
      plan: "graduated",
      monthlyPayment: round2(g.first),
      totalPaid: round2(a.totalPaid),
      totalInterest: round2(a.totalInterest),
      payoffMonths: a.months,
      schedule: a.schedule,
    };
  }

  // IDR (SAVE)
  const pmt = idrMonthlyPayment(input.grossIncome ?? 0, input.familySize ?? 1);
  const a = amortize(balance, rate, {
    paymentFor: () => pmt,
    maxMonths: IDR_FORGIVENESS_MONTHS,
    waiveUnpaidInterest: true,
  });
  return {
    plan: "idr",
    monthlyPayment: round2(pmt),
    totalPaid: round2(a.totalPaid),
    totalInterest: round2(a.totalInterest),
    payoffMonths: a.months,
    forgiven: a.balance > 0.005 ? round2(a.balance) : undefined,
    schedule: a.schedule,
  };
}

export function compareAll(input: LoanInput): Record<RepaymentPlan, SimResult> {
  return {
    standard: simulate({ ...input, plan: "standard" }),
    graduated: simulate({ ...input, plan: "graduated" }),
    idr: simulate({ ...input, plan: "idr" }),
  };
}

export function payoffDateLabel(months: number): string {
  return format(addMonths(new Date(), Math.max(0, months)), "MMM yyyy");
}

export function fmtUSD(n: number, opts: { decimals?: 0 | 2 } = {}): string {
  const decimals = opts.decimals ?? 0;
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtMonths(m: number): string {
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return rem === 0 ? `${y} yr` : `${y} yr ${rem} mo`;
}

export const PLAN_LABELS: Record<RepaymentPlan, string> = {
  standard: "Standard",
  graduated: "Graduated",
  idr: "IDR (SAVE)",
};
