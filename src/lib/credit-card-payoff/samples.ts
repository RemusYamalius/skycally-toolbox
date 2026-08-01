import type { CardInput } from "./calc";

// A typical revolving US credit card balance at a mainstream 2026 APR, with the
// 2%-of-balance / $25 floor minimum most issuers use. The $200 fixed payment is
// seeded so the strategy comparison is meaningful on first load.
export const SAMPLE_CARD: CardInput = {
  balance: 5000,
  apr: 20.99,
  minPaymentRate: 2,
  minPaymentFloor: 25,
  fixedPayment: 200,
};

export const MINIMUM_COLOR = "#f59e0b";
export const FIXED_COLOR = "#10b981";
