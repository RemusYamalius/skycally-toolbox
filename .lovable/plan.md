# Debt Payoff Calculator — Snowball vs Avalanche

New tool at `/tools/debt-payoff-calculator` under the Finance grouping, matching the existing calculator architecture (ToolPageShell → results → AdZone → HowToUse → ToolSeoContent → RelatedTools).

## Files

**New**
- `src/lib/debt-payoff/calc.ts` — pure simulation engine. Types: `Debt { id, name, balance, apr, minPayment }`, `Strategy = "snowball" | "avalanche"`, `LumpSum { month, amount }`, `SimInput`, `MonthSnapshot`, `SimResult { months, totalInterest, totalPaid, payoffDate, timeline: MonthSnapshot[], perDebt: { id, monthsToPayoff, interestPaid }[], warning?: "underwater" }`. Functions: `simulate(input, strategy)` runs month-by-month amortization (accrue interest = balance × apr/12, apply minimum to each debt, roll leftover budget + freed minimums into priority debt per strategy, apply lump sum on its month), cap at 600 months and return `warning: "underwater"` when a debt's minimum can't cover monthly interest. Tie-break: snowball = smallest balance, then highest APR; avalanche = highest APR, then highest balance. `compare(input)` returns `{ snowball, avalanche, interestSavedVsAvalanche, monthsSavedVsAvalanche, interestSavedByExtra }` where the last is `simulate({...input, extraMonthly:0, lumpSum:undefined}, chosenStrategy).totalInterest - result.totalInterest`.
- `src/lib/debt-payoff/samples.ts` — 3 pre-filled default debts (Credit Card $4,800 @ 22.9% min $120; Car Loan $8,500 @ 6.9% min $220; Store Card $1,200 @ 26.9% min $40).
- `src/routes/tools.debt-payoff-calculator.tsx` — full page. Layout: inputs column (debt list as stacked cards on all breakpoints — name / balance / APR / min payment inputs per card, add + remove buttons; extra monthly payment input; optional lump-sum amount + month picker; strategy toggle for the timeline chart's active view) and results column with two side-by-side cards (Snowball / Avalanche) each showing debt-free date, total months, total interest, with the winning-on-interest card badged "Lowest total interest" and even-handed helper text noting snowball's motivational value. A prominent "Interest saved with your extra payment" callout compares chosen-strategy totals against a $0-extra baseline. Balance timeline uses recharts `AreaChart` (stacked per-debt areas declining to zero, one chart per strategy tab). Disclaimer note styled like the pregnancy calc medical disclaimer. Underwater warning banner when `warning === "underwater"`. Contextual InternalLinks block with full-sentence framing (paycheck, compound-interest, loan). Section order: results → AdZone (`id="debt-payoff-calculator-mid" size="728x90"`) → HowToUse → ToolSeoContent → RelatedTools.

**Edited**
- `src/lib/tools.ts` — register `debt-payoff-calculator` with `TrendingDown` (lucide) icon under the same finance grouping as loan/paycheck.
- `src/lib/related-tools.ts` — add `"debt-payoff-calculator": ["paycheck-calculator", "loan-calculator", "compound-interest", "mortgage-calculator", "currency-converter"]` and add it to the reverse maps for paycheck, loan, compound-interest.
- `public/sitemap.xml`, `public/llms.txt` — add the new URL.

## Calculation logic

- Monthly interest: `interest = balance * (apr / 100) / 12`; balance grows by interest, then payment applied, floor at 0.
- Budget each month: `sum(minPayments of unpaid debts) + extraMonthly + (lumpSum if month matches)`. Minimums applied to every unpaid debt first; remainder + any minimums freed by cleared debts stack onto the priority debt.
- Snowball priority: smallest current balance among unpaid; tie → highest APR. Avalanche: highest APR; tie → highest balance.
- Underwater detection: at start of any month, if a debt's `minPayment < interest` AND total remaining budget for that debt (after other minimums) is also `< interest`, mark `warning: "underwater"` and stop at 600 months.
- Payoff date: `addMonths(startOfCurrentMonth, months)` via `date-fns`.
- Interest saved by extra = baseline (extra=0, no lump) total interest − current total interest, per active strategy.

## UI

- Reuse existing shadcn primitives (`Input`, `Button`, `Label`, `Select`, `Tabs`) and the dark gradient hero style used by paycheck/pregnancy calculators.
- Two result cards side-by-side desktop, stacked mobile; winning card gets a subtle emerald ring + badge.
- Timeline: `Tabs` for Snowball / Avalanche, each rendering a stacked `AreaChart` from recharts with one series per debt using the site's semantic color tokens.
- Debt entry: stacked cards at every breakpoint (no horizontal table), each card 2×2 grid of labeled inputs plus a trash button; "Add debt" button below.
- Prominent "Interest saved with your extra payment" callout above the two result cards.
- Disclaimer: bordered note — "Estimates for informational and planning purposes only. Not financial advice. Actual payoff depends on your lender's exact compounding, fees, and any new debt added during payoff." Copy also states: "Runs entirely in your browser. No account, no signup, nothing sent to a server."
- Accessibility: labeled inputs, `aria-live="polite"` on the results/callout, semantic headings, keyboard-friendly add/remove.

## SEO

- `head()` — title front-loads "Debt Payoff Calculator — Snowball vs Avalanche (Free, No Signup) | Skycally"; description targets "debt payoff calculator, debt snowball calculator, debt avalanche calculator". Canonical + og:*. WebApplication JSON-LD with accurate featureList (unlimited debts, snowball + avalanche side-by-side, extra monthly payment, one-time lump-sum with month picker, per-debt balance timeline chart, interest-saved highlight, underwater-debt warning, fully client-side, no signup).
- `ToolSeoContent`: 4 body paragraphs (what the tool does / snowball vs avalanche and when each makes sense / how extra + lump-sum payments change the math / how debt payoff fits a broader budget plan) + 8 FAQs matching the spec.

## Integration

- Category: finance section per tools.ts convention.
- Related tools mapping described above.
- English only, no external APIs, no server functions, TypeScript strict, fully client-side.

## Out of scope

- Debt consolidation loan modeling (linked out to loan calculator instead).
- Credit-score impact modeling, promotional/intro APR windows, variable-rate schedules.
- Saving/loading debt lists (no account, no persistence beyond the session).
- Non-USD locales (numbers formatted as USD; disclaimer notes this).
