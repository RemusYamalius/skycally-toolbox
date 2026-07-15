import type { Debt } from "./calc";

export const SAMPLE_DEBTS: Debt[] = [
  { id: "d1", name: "Credit Card", balance: 4800, apr: 22.9, minPayment: 120 },
  { id: "d2", name: "Car Loan", balance: 8500, apr: 6.9, minPayment: 220 },
  { id: "d3", name: "Store Card", balance: 1200, apr: 26.9, minPayment: 40 },
];

export const DEBT_COLORS = [
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];
