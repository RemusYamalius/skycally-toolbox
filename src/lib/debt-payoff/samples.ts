import type { Debt } from "./calc";

// Deliberately designed so Snowball and Avalanche pick a fully reversed
// order: smallest balance (Car Loan) has the lowest APR, largest balance
// (Credit Card) has the highest APR. This makes the two strategies produce
// genuinely different results on first load, instead of coincidentally
// tying — which is the whole point of this tool's side-by-side comparison.
export const SAMPLE_DEBTS: Debt[] = [
  { id: "d1", name: "Car Loan", balance: 2500, apr: 6.9, minPayment: 130 },
  { id: "d2", name: "Store Card", balance: 4800, apr: 18.9, minPayment: 150 },
  { id: "d3", name: "Credit Card", balance: 9000, apr: 24.9, minPayment: 220 },
];

export const DEBT_COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#eab308"];
