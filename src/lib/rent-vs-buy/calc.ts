// Rent vs. Buy Calculator — opportunity-cost model matching NYT-style analysis.
// All math is standard and runs client-side.

export interface BuyInputs {
  homePrice: number;
  downPaymentPct: number; // 0..100
  mortgageRatePct: number; // annual, e.g. 6.5
  termYears: 15 | 30;
  propertyTaxPct: number; // annual % of home value
  insuranceAnnual: number; // $ / year
  hoaMonthly: number; // $ / month
  maintenancePct: number; // annual % of home value
  buyingClosingPct: number; // one-time % of price
  sellingCostPct: number; // % of sale price at exit
}

export interface RentInputs {
  monthlyRent: number;
  rentGrowthPct: number; // annual %
  rentersInsMonthly: number;
}

export interface Assumptions {
  appreciationPct: number; // annual %
  investmentReturnPct: number; // annual %
  plannedYears: number; // 1..30
}

export interface YearRow {
  year: number;
  buyNet: number;
  rentNet: number;
  homeValue: number;
  mortgageBalance: number;
  portfolio: number;
  cumulativeBuyCash: number;
  cumulativeRentCash: number;
}

export type Edge = "buy-always" | "rent-always" | "crossover";

export interface SimResult {
  rows: YearRow[]; // years 1..30
  breakevenYear: number | null;
  edge: Edge;
  atHorizon: {
    year: number;
    winner: "buy" | "rent";
    diff: number; // absolute $
    buyNet: number;
    rentNet: number;
  };
  monthlyPI: number;
  monthlyBuyerYear1: number; // full carrying cost month 1
  monthlyRentYear1: number;
}

export const HORIZON = 30;

/** Standard fixed-rate mortgage monthly P&I. */
export function monthlyPayment(principal: number, ratePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  const r = ratePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function simulate(buy: BuyInputs, rent: RentInputs, a: Assumptions): SimResult {
  const price = Math.max(0, buy.homePrice);
  const down = price * (buy.downPaymentPct / 100);
  const closingUpfront = price * (buy.buyingClosingPct / 100);
  const loan = Math.max(0, price - down);
  const pi = monthlyPayment(loan, buy.mortgageRatePct, buy.termYears);
  const rMonthly = buy.mortgageRatePct / 100 / 12;
  const invMonthly = Math.pow(1 + a.investmentReturnPct / 100, 1 / 12) - 1;

  // Buyer's upfront capital — this is the "opportunity cost" seed for renter's portfolio.
  const upfrontCapital = down + closingUpfront;

  let balance = loan;
  let cumulativeBuyCash = upfrontCapital; // count upfront as cash out immediately
  let cumulativeRentCash = 0;
  let portfolio = upfrontCapital; // renter starts with the same capital invested
  const termMonths = buy.termYears * 12;

  const rows: YearRow[] = [];
  let firstYearMonthlyBuyer = 0;
  let firstYearMonthlyRent = 0;

  for (let year = 1; year <= HORIZON; year++) {
    // Home value at end of year Y (compounded)
    const homeValueEnd = price * Math.pow(1 + a.appreciationPct / 100, year);
    // Rent growth: constant within a year, grows each year
    const rentThisYear = rent.monthlyRent * Math.pow(1 + rent.rentGrowthPct / 100, year - 1);
    const rentMonthly = rentThisYear + rent.rentersInsMonthly;

    for (let m = 0; m < 12; m++) {
      const monthIndex = (year - 1) * 12 + m + 1;
      // Home value used for tax/maintenance this month — approximate with linear interp between year start/end.
      const hvPrev = price * Math.pow(1 + a.appreciationPct / 100, year - 1);
      const hv = hvPrev + ((homeValueEnd - hvPrev) * (m + 1)) / 12;

      // Amortize mortgage (only while loan outstanding)
      let piThisMonth = 0;
      if (balance > 0 && monthIndex <= termMonths) {
        const interest = balance * rMonthly;
        let principal = pi - interest;
        if (principal > balance) principal = balance;
        balance = Math.max(0, balance - principal);
        piThisMonth = interest + principal;
      }

      const propertyTax = (buy.propertyTaxPct / 100) * hv / 12;
      const insurance = buy.insuranceAnnual / 12;
      const maintenance = (buy.maintenancePct / 100) * hv / 12;
      const buyerMonthly = piThisMonth + propertyTax + insurance + buy.hoaMonthly + maintenance;

      cumulativeBuyCash += buyerMonthly;
      cumulativeRentCash += rentMonthly;

      // Portfolio grows every month; renter invests the positive cash-flow gap.
      portfolio *= 1 + invMonthly;
      const gap = buyerMonthly - rentMonthly;
      if (gap > 0) portfolio += gap;

      if (year === 1 && m === 0) {
        firstYearMonthlyBuyer = buyerMonthly;
        firstYearMonthlyRent = rentMonthly;
      }
    }

    const sellingCosts = homeValueEnd * (buy.sellingCostPct / 100);
    const buyNet = homeValueEnd - balance - sellingCosts - cumulativeBuyCash;
    const rentNet = portfolio - cumulativeRentCash;

    rows.push({
      year,
      buyNet,
      rentNet,
      homeValue: homeValueEnd,
      mortgageBalance: balance,
      portfolio,
      cumulativeBuyCash,
      cumulativeRentCash,
    });
  }

  // Breakeven
  let breakevenYear: number | null = null;
  for (const r of rows) {
    if (r.buyNet >= r.rentNet) {
      breakevenYear = r.year;
      break;
    }
  }
  let edge: Edge = "crossover";
  if (breakevenYear === 1) edge = "buy-always";
  else if (breakevenYear === null) edge = "rent-always";

  const horizonYear = Math.min(HORIZON, Math.max(1, Math.round(a.plannedYears)));
  const h = rows[horizonYear - 1];
  const winner: "buy" | "rent" = h.buyNet >= h.rentNet ? "buy" : "rent";

  return {
    rows,
    breakevenYear,
    edge,
    atHorizon: {
      year: horizonYear,
      winner,
      diff: Math.abs(h.buyNet - h.rentNet),
      buyNet: h.buyNet,
      rentNet: h.rentNet,
    },
    monthlyPI: pi,
    monthlyBuyerYear1: firstYearMonthlyBuyer,
    monthlyRentYear1: firstYearMonthlyRent,
  };
}

export const fmtUSD = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

export const fmtUSDsigned = (n: number): string => (n >= 0 ? "+" : "−") + fmtUSD(Math.abs(n));
