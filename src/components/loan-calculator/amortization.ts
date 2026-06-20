import type { AmortRow, CarInputs, CarResult, LoanResult, MortgageInputs, MortgageResult } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcMonthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

export function calcAmortization(principal: number, annualRatePct: number, months: number): AmortRow[] {
  if (principal <= 0 || months <= 0) return [];
  const r = annualRatePct / 100 / 12;
  const payment = calcMonthlyPayment(principal, annualRatePct, months);
  const rows: AmortRow[] = [];
  let balance = principal;
  let cumulativeInterest = 0;
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    let principalPart = payment - interest;
    if (i === months) {
      principalPart = balance; // final correction
    }
    balance = Math.max(0, balance - principalPart);
    cumulativeInterest += interest;
    rows.push({
      month: i,
      payment: round2(principalPart + interest),
      principal: round2(principalPart),
      interest: round2(interest),
      balance: round2(balance),
      cumulativeInterest: round2(cumulativeInterest),
    });
  }
  return rows;
}

export function calcLoan(principal: number, annualRatePct: number, months: number): LoanResult {
  const schedule = calcAmortization(principal, annualRatePct, months);
  const monthlyPayment = calcMonthlyPayment(principal, annualRatePct, months);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  return {
    principal,
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
    totalCost: round2(principal + totalInterest),
    schedule,
  };
}

export function calcMortgage(inputs: MortgageInputs): MortgageResult {
  const base = calcLoan(inputs.principal, inputs.annualRatePct, inputs.months);
  const monthlyTax = inputs.propertyTaxYearly / 12;
  const monthlyInsurance = inputs.insuranceYearly / 12;
  const monthlyPmi = inputs.applyPmi ? (inputs.principal * (inputs.pmiRatePct / 100)) / 12 : 0;
  return {
    ...base,
    monthlyTax: round2(monthlyTax),
    monthlyInsurance: round2(monthlyInsurance),
    monthlyPmi: round2(monthlyPmi),
    totalMonthly: round2(base.monthlyPayment + monthlyTax + monthlyInsurance + monthlyPmi),
  };
}

export function calcCarLoan(inputs: CarInputs): CarResult {
  const taxedPrice = inputs.vehiclePrice * (1 + inputs.salesTaxPct / 100);
  const financed = Math.max(0, taxedPrice - inputs.downPayment - inputs.tradeIn);
  const base = calcLoan(financed, inputs.annualRatePct, inputs.months);
  return {
    ...base,
    taxedPrice: round2(taxedPrice),
    financed: round2(financed),
  };
}

export interface ExtraPaymentSavings {
  monthsSaved: number;
  interestSaved: number;
  newTotalInterest: number;
  newMonths: number;
}

export function calcExtraPaymentSavings(
  principal: number,
  annualRatePct: number,
  months: number,
  extra: number,
): ExtraPaymentSavings {
  const baseline = calcLoan(principal, annualRatePct, months);
  if (extra <= 0 || principal <= 0 || months <= 0) {
    return {
      monthsSaved: 0,
      interestSaved: 0,
      newTotalInterest: baseline.totalInterest,
      newMonths: months,
    };
  }
  const r = annualRatePct / 100 / 12;
  const payment = calcMonthlyPayment(principal, annualRatePct, months);
  let balance = principal;
  let totalInterest = 0;
  let m = 0;
  const cap = months + 1; // never exceed original
  while (balance > 0.01 && m < cap) {
    m++;
    const interest = balance * r;
    let principalPart = payment - interest + extra;
    if (principalPart >= balance) {
      principalPart = balance;
    }
    balance -= principalPart;
    totalInterest += interest;
  }
  return {
    monthsSaved: Math.max(0, months - m),
    interestSaved: Math.max(0, round2(baseline.totalInterest - totalInterest)),
    newTotalInterest: round2(totalInterest),
    newMonths: m,
  };
}

export function formatCurrency(value: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(isFinite(value) ? value : 0);
  } catch {
    const sym =
      { USD: "$", EUR: "€", GBP: "£", MAD: "د.م.", SAR: "ر.س", AED: "د.إ", INR: "₹", BRL: "R$", CAD: "C$", AUD: "A$" }[
        code
      ] ?? code;
    return `${sym}${value.toFixed(2)}`;
  }
}

export function rowsToCsv(rows: AmortRow[]): string {
  const header = "Month,Payment,Principal,Interest,Balance,Cumulative Interest";
  const body = rows
    .map(
      (r) =>
        `${r.month},${r.payment.toFixed(2)},${r.principal.toFixed(2)},${r.interest.toFixed(2)},${r.balance.toFixed(2)},${r.cumulativeInterest.toFixed(2)}`,
    )
    .join("\n");
  return `${header}\n${body}\n`;
}
