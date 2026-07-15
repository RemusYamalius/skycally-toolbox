import { addMonths, format } from "date-fns";

export interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number; // annual %, e.g. 22.9
  minPayment: number;
}

export type Strategy = "snowball" | "avalanche";

export interface LumpSum {
  month: number; // 1-indexed month from now
  amount: number;
}

export interface SimInput {
  debts: Debt[];
  extraMonthly: number;
  lumpSum?: LumpSum;
}

export interface MonthSnapshot {
  month: number;
  balances: Record<string, number>;
  totalBalance: number;
}

export interface PerDebtStat {
  id: string;
  name: string;
  monthsToPayoff: number;
  interestPaid: number;
}

export interface SimResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: string; // formatted "MMM yyyy"
  timeline: MonthSnapshot[];
  perDebt: PerDebtStat[];
  warning?: "underwater" | "no-debts";
}

const MAX_MONTHS = 600;

function priorityId(debts: Debt[], balances: Record<string, number>, strategy: Strategy): string | null {
  const active = debts.filter((d) => balances[d.id] > 0.005);
  if (active.length === 0) return null;
  const sorted = [...active].sort((a, b) => {
    if (strategy === "snowball") {
      const ba = balances[a.id];
      const bb = balances[b.id];
      if (ba !== bb) return ba - bb;
      return b.apr - a.apr;
    } else {
      if (a.apr !== b.apr) return b.apr - a.apr;
      return balances[b.id] - balances[a.id];
    }
  });
  return sorted[0].id;
}

export function simulate(input: SimInput, strategy: Strategy): SimResult {
  const debts = input.debts.filter((d) => d.balance > 0);
  if (debts.length === 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      payoffDate: format(new Date(), "MMM yyyy"),
      timeline: [{ month: 0, balances: {}, totalBalance: 0 }],
      perDebt: [],
      warning: "no-debts",
    };
  }

  const balances: Record<string, number> = {};
  const interestPaid: Record<string, number> = {};
  const monthsToPayoff: Record<string, number> = {};
  for (const d of debts) {
    balances[d.id] = d.balance;
    interestPaid[d.id] = 0;
    monthsToPayoff[d.id] = 0;
  }

  const timeline: MonthSnapshot[] = [];
  // Month 0 snapshot (starting balances)
  timeline.push({
    month: 0,
    balances: { ...balances },
    totalBalance: sum(Object.values(balances)),
  });

  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  let warning: SimResult["warning"] | undefined;

  while (month < MAX_MONTHS) {
    month += 1;

    // 1. Accrue interest for each active debt
    for (const d of debts) {
      if (balances[d.id] <= 0) continue;
      const interest = (balances[d.id] * (d.apr / 100)) / 12;
      balances[d.id] += interest;
      interestPaid[d.id] += interest;
      totalInterest += interest;
    }

    // 2. Compute budget for this month
    const activeDebts = debts.filter((d) => balances[d.id] > 0);
    const sumMinsAllDefined = debts.reduce((s, d) => s + d.minPayment, 0);
    const freedFromCleared = debts
      .filter((d) => balances[d.id] <= 0)
      .reduce((s, d) => s + d.minPayment, 0);
    let budget = sumMinsAllDefined + input.extraMonthly;
    if (input.lumpSum && input.lumpSum.month === month) {
      budget += Math.max(0, input.lumpSum.amount);
    }
    // freed mins already included in sumMinsAllDefined; keep freed logic clear:
    void freedFromCleared;

    // 3. Underwater check: if total budget can't cover total accrued interest, we'll never converge.
    const totalInterestThisMonth = activeDebts.reduce(
      (s, d) => s + (balances[d.id] * (d.apr / 100)) / 12 / (1 + d.apr / 100 / 12), // interest just accrued portion
      0,
    );
    // A cleaner underwater signal: after min payments, is the priority debt still growing?
    // We'll detect it below after applying payments.

    // 4. Apply minimums to each active debt (cap at balance)
    for (const d of activeDebts) {
      const pay = Math.min(d.minPayment, balances[d.id]);
      balances[d.id] -= pay;
      budget -= pay;
      totalPaid += pay;
    }

    // 5. Apply remaining budget to priority debt(s)
    let guard = 0;
    while (budget > 0.005 && guard < debts.length + 2) {
      const pid = priorityId(debts, balances, strategy);
      if (!pid) break;
      const pay = Math.min(budget, balances[pid]);
      balances[pid] -= pay;
      budget -= pay;
      totalPaid += pay;
      guard += 1;
    }

    // 6. Record monthsToPayoff for anything newly zeroed
    for (const d of debts) {
      if (balances[d.id] <= 0.005 && monthsToPayoff[d.id] === 0) {
        monthsToPayoff[d.id] = month;
        balances[d.id] = 0;
      }
    }

    // 7. Snapshot
    timeline.push({
      month,
      balances: { ...balances },
      totalBalance: sum(Object.values(balances)),
    });

    // 8. Done?
    if (Object.values(balances).every((b) => b <= 0.005)) break;

    // 9. Underwater detection: if totalBalance hasn't dropped meaningfully in the last 12 months
    if (month >= 24 && month % 12 === 0) {
      const past = timeline[timeline.length - 13];
      if (past && past.totalBalance - timeline[timeline.length - 1].totalBalance < 1) {
        warning = "underwater";
        break;
      }
    }

    void totalInterestThisMonth;
  }

  if (month >= MAX_MONTHS && Object.values(balances).some((b) => b > 0.005)) {
    warning = "underwater";
  }

  const perDebt: PerDebtStat[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    monthsToPayoff: monthsToPayoff[d.id] || month,
    interestPaid: interestPaid[d.id],
  }));

  return {
    months: month,
    totalInterest,
    totalPaid,
    payoffDate: format(addMonths(new Date(), month), "MMM yyyy"),
    timeline,
    perDebt,
    warning,
  };
}

export interface CompareResult {
  snowball: SimResult;
  avalanche: SimResult;
  interestDelta: number; // snowball - avalanche
  monthsDelta: number; // snowball - avalanche
  winner: "snowball" | "avalanche" | "tie";
  interestSavedByExtra: {
    snowball: number;
    avalanche: number;
  };
}

export function compare(input: SimInput): CompareResult {
  const snowball = simulate(input, "snowball");
  const avalanche = simulate(input, "avalanche");
  const baseline: SimInput = { ...input, extraMonthly: 0, lumpSum: undefined };
  const snowballBase = simulate(baseline, "snowball");
  const avalancheBase = simulate(baseline, "avalanche");
  const interestDelta = snowball.totalInterest - avalanche.totalInterest;
  const monthsDelta = snowball.months - avalanche.months;
  let winner: CompareResult["winner"] = "tie";
  if (avalanche.totalInterest < snowball.totalInterest - 0.5) winner = "avalanche";
  else if (snowball.totalInterest < avalanche.totalInterest - 0.5) winner = "snowball";
  return {
    snowball,
    avalanche,
    interestDelta,
    monthsDelta,
    winner,
    interestSavedByExtra: {
      snowball: Math.max(0, snowballBase.totalInterest - snowball.totalInterest),
      avalanche: Math.max(0, avalancheBase.totalInterest - avalanche.totalInterest),
    },
  };
}

function sum(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0);
}

export function fmtUSD(n: number, opts: { decimals?: 0 | 2 } = {}): string {
  const decimals = opts.decimals ?? 0;
  return n.toLocaleString("en-US", {
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
