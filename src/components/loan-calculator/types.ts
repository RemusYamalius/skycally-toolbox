export type LoanTab = "personal" | "emi" | "mortgage" | "car";

export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "MAD"
  | "SAR"
  | "AED"
  | "INR"
  | "BRL"
  | "CAD"
  | "AUD";

export interface Currency {
  code: CurrencyCode;
  label: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", label: "USD $", symbol: "$" },
  { code: "EUR", label: "EUR €", symbol: "€" },
  { code: "GBP", label: "GBP £", symbol: "£" },
  { code: "MAD", label: "MAD د.م.", symbol: "د.م." },
  { code: "SAR", label: "SAR ر.س", symbol: "ر.س" },
  { code: "AED", label: "AED د.إ", symbol: "د.إ" },
  { code: "INR", label: "INR ₹", symbol: "₹" },
  { code: "BRL", label: "BRL R$", symbol: "R$" },
  { code: "CAD", label: "CAD C$", symbol: "C$" },
  { code: "AUD", label: "AUD A$", symbol: "A$" },
];

export const RTL_CURRENCIES: CurrencyCode[] = ["MAD", "SAR", "AED"];

export interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
}

export interface LoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  schedule: AmortRow[];
  principal: number;
}

export interface MortgageInputs {
  principal: number;
  annualRatePct: number;
  months: number;
  downPayment: number; // already a $ value, subtracted from principal upstream? Here principal is loan amount (post-down).
  propertyTaxYearly: number;
  insuranceYearly: number;
  pmiRatePct: number; // annual percent of loan
  applyPmi: boolean;
}

export interface MortgageResult extends LoanResult {
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPmi: number;
  totalMonthly: number; // PITI
}

export interface CarInputs {
  vehiclePrice: number;
  annualRatePct: number;
  months: number;
  downPayment: number;
  tradeIn: number;
  salesTaxPct: number;
}

export interface CarResult extends LoanResult {
  taxedPrice: number;
  financed: number;
}
