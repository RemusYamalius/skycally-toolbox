# Loan Calculator (Multi-Tab) — Implementation Plan

Build a single shared loan calculator component exposed at four routes, each pre-selecting one of four tabs (Personal, EMI, Mortgage, Car Loan). 100% client-side, dark/light compatible, recharts-based visualizations.

## Files to create

**Routes (4, thin wrappers)**
- `src/routes/tools.loan-calculator.tsx` → `<LoanCalculatorPage defaultTab="personal" />`
- `src/routes/tools.emi-calculator.tsx` → `defaultTab="emi"`
- `src/routes/tools.mortgage-calculator.tsx` → `defaultTab="mortgage"`
- `src/routes/tools.car-loan-calculator.tsx` → `defaultTab="car"`

Each uses `createFileRoute` with `head: () => buildToolMeta(toolBySlug("<slug>", tools))`, wraps content in `ToolPageShell` + `HowToUse` + `ToolSeoContent` + `RelatedTools`.

**Shared component**
- `src/components/loan-calculator/types.ts` — `LoanTab`, `Currency`, `AmortRow`, `MortgageInputs`, `CarInputs`, result types.
- `src/components/loan-calculator/amortization.ts` — pure math: `calcMonthlyPayment`, `calcAmortization`, `calcMortgage`, `calcCarLoan`, `calcExtraPaymentSavings`, `formatCurrency` helper.
- `src/components/loan-calculator/LoanCalculatorPage.tsx` — full UI: tabs, inputs, results hero, recharts pie + area, extra-payment insight, collapsible amortization table with virtualization + CSV download.

**Metadata updates**
- `src/lib/tools.ts` — add 4 entries (loan-calculator, emi-calculator, mortgage-calculator, car-loan-calculator), Finance category, emoji icons matching existing tool entries' shape.
- `src/lib/related-tools.ts` — add 4 mappings cross-linking the loan tools + compound-interest + currency-converter.

## Tabs & accents

| Tab | Accent | Example |
|---|---|---|
| Personal 💳 | cyan #06b6d4 | $10,000 / 8.5% / 36mo |
| EMI 📱 | violet #7c3aed | $5,000 / 12% / 24mo |
| Mortgage 🏠 | emerald #10b981 | $300,000 / 6.5% / 360mo + tax/ins/PMI |
| Car 🚗 | amber #f59e0b | $25,000 / 5.9% / 60mo + tax/down/trade-in |

## Inputs (shared core)
- Loan amount: number + slider ($500–$10,000,000) + currency selector (USD/EUR/GBP/MAD/SAR/AED/INR/BRL/CAD/AUD), persisted at `lc:currency`.
- Annual rate: 0.1–30%, step 0.1, slider with gradient hint.
- Term: months/years toggle, slider 1–360 months, human-readable label.
- Payment frequency (collapsed advanced): Monthly / Bi-weekly / Weekly.
- Mortgage extras: down payment ($/%), property tax, insurance, PMI.
- Car extras: down payment, trade-in, sales tax %.

State per tab persisted at `lc:state:<tab>`; active tab at `lc:tab`. URL-driven `defaultTab` from the route overrides the persisted tab on first load.

## Results UI

**Hero row (3 cards, 4 for mortgage with PITI):** Monthly Payment / Total Interest / Total Cost. Updates instantly (150ms debounce on text inputs). "Copy summary" button.

**Charts:**
- Pie (recharts `PieChart`): Principal vs Total Interest with legend.
- Area (recharts `AreaChart`): X-axis years (or months if <2y), stacked areas for Remaining Balance and Cumulative Interest, hover tooltip.
- Chart fill colors hardcoded (#06b6d4, #f97316, #7c3aed) per spec; all surrounding text/grid uses CSS variables.

**Extra-payment insight box:** editable `$X/month` field → recomputes savings ("save $X in interest, pay off Y months early").

**Amortization table:** collapsible (closed by default), zebra rows, sticky header. Render first 3 + last 3 by default with "Show all" button; when expanded, slice in pages of 60 or use simple windowing to avoid 360 DOM rows. Sticky first column on mobile via `position: sticky`. CSV download via Blob + `URL.createObjectURL`.

## Validation
- Empty/negative amount or term=0 → inline error + zero results, no crash.
- Rate >30% → yellow warning, still computes.
- Always retain last valid result on transient invalid input.

## i18n & formatting
- Single `STRINGS` const at top of `LoanCalculatorPage.tsx` (tabs, inputs, results, amortization, insight labels).
- `Intl.NumberFormat(undefined, { style: 'currency', currency })` for amounts.
- RTL: when currency ∈ {MAD, SAR, AED}, add `dir="rtl"` to results section and right-align numeric cells.

## SEO content
- Per-tab `SEO_CONTENT` object keyed by `LoanTab`, fed into `ToolSeoContent` with the title/description/body/faqs from the spec for personal, emi, mortgage, car.
- Small disclaimer line: "Results are estimates for informational purposes only. Consult a financial advisor for personalised advice."

## Math (amortization.ts)
```ts
calcMonthlyPayment(P, annualRatePct, n):
  r = annualRatePct/100/12
  return r === 0 ? P/n : P * r * (1+r)**n / ((1+r)**n - 1)

calcAmortization → AmortRow[] with running balance, principal/interest split, cumulative interest.
calcMortgage → adds monthly tax + insurance + PMI (PMI auto-applied if down < 20%).
calcCarLoan → financed = price*(1+tax) - down - tradeIn → calcMonthlyPayment.
calcExtraPaymentSavings → re-amortize with extra principal each month, return {monthsSaved, interestSaved}.
```
All currency values rounded to 2dp at output time only (keep full precision internally).

## Dark/light
Only CSS variables for surfaces/text/borders. Chart axis/text colors read at render via `getComputedStyle(...).getPropertyValue('--foreground')`.

## Out of scope
- No new npm packages (recharts already installed).
- No server functions, no APIs, no analytics calls.
