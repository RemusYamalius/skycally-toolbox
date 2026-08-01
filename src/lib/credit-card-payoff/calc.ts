export type PayoffStrategy = "minimum" | "fixed";

export interface CardInput {
  balance: number; // current balance ($)
  apr: number; // annual percentage rate (%)
  minPaymentRate: number; // minimum payment as % of balance
  minPaymentFloor: number; // dollar floor for the minimum payment
  fixedPayment?: number; // optional fixed monthly payment for comparison
}

export interface MonthlySnapshot {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface PayoffResult {
  strategy: PayoffStrategy;
  months: number;
  totalPaid: number;
  totalInterest: number;
  schedule: MonthlySnapshot[];
  /** Set when the loop hit the 50-year safety cap. */
  neverPaidOff?: boolean;
  /** Set when a fixed payment does not even cover the first month's interest. */
  error?: "payment-below-interest";
}

export const MAX_MONTHS = 600;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Minimum payment: % of balance, with a dollar floor, never below interest + $1. */
export function minimumPaymentFor(balance: number, interest: number, input: CardInput): number {
  if (balance <= input.minPaymentFloor) return balance + interest;
  const pct = balance * (Math.max(0, input.minPaymentRate) / 100);
  return Math.max(pct, Math.max(0, input.minPaymentFloor), interest + 1);
}

function run(input: CardInput, strategy: PayoffStrategy): PayoffResult {
  const start = Math.max(0, input.balance || 0);
  const monthlyRate = Math.max(0, input.apr || 0) / 100 / 12;
  const schedule: MonthlySnapshot[] = [];

  const empty: PayoffResult = {
    strategy,
    months: 0,
    totalPaid: 0,
    totalInterest: 0,
    schedule: [],
  };
  if (start <= 0) return empty;

  if (strategy === "fixed") {
    const fixed = Math.max(0, input.fixedPayment || 0);
    const firstInterest = start * monthlyRate;
    if (fixed <= firstInterest + 0.005) {
      return { ...empty, error: "payment-below-interest" };
    }
  }

  let balance = start;
  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;

  while (balance > 0.005 && month < MAX_MONTHS) {
    month += 1;
    const interest = balance * monthlyRate;
    let payment =
      strategy === "minimum"
        ? minimumPaymentFor(balance, interest, input)
        : Math.max(0, input.fixedPayment || 0);

    // Final settlement month: never overpay.
    if (payment > balance + interest) payment = balance + interest;

    let principal = payment - interest;
    if (principal <= 0) {
      // Safety net: cannot happen with the guards above, but never loop forever.
      return {
        strategy,
        months: month - 1,
        totalPaid: round2(totalPaid),
        totalInterest: round2(totalInterest),
        schedule,
        error: "payment-below-interest",
      };
    }
    if (principal > balance) principal = balance;

    balance -= principal;
    totalPaid += payment;
    totalInterest += interest;

    schedule.push({
      month,
      payment: round2(payment),
      principal: round2(principal),
      interest: round2(interest),
      balance: round2(Math.max(0, balance)),
    });
  }

  return {
    strategy,
    months: month,
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalInterest),
    schedule,
    neverPaidOff: balance > 0.005 ? true : undefined,
  };
}

export function simulate(input: CardInput): { minimum: PayoffResult; fixed?: PayoffResult } {
  const minimum = run(input, "minimum");
  const fixed =
    input.fixedPayment && input.fixedPayment > 0 ? run(input, "fixed") : undefined;
  return { minimum, fixed };
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
