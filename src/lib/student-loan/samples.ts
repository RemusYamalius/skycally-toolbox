import type { LoanInput, RepaymentPlan } from "./calc";

// A realistic default: the median federal undergraduate balance at a typical
// 2026 Direct Loan rate on the 10-year standard term. The income and family
// size are only used when the visitor switches to the IDR (SAVE) plan, but
// they are seeded here so the plan comparison is meaningful on first load.
export const SAMPLE_LOAN: LoanInput = {
  balance: 30000,
  rate: 5.5,
  termYears: 10,
  plan: "standard",
  grossIncome: 45000,
  familySize: 1,
};

export const TERM_OPTIONS = [10, 20, 25, 30];

export const PLAN_COLORS: Record<RepaymentPlan, string> = {
  standard: "#06b6d4",
  graduated: "#8b5cf6",
  idr: "#10b981",
};

export const PRINCIPAL_COLOR = "#10b981";
export const INTEREST_COLOR = "#f59e0b";
