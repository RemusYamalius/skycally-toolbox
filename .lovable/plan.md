
# Rent vs. Buy Calculator — Breakeven Year

New tool at `/tools/rent-vs-buy-calculator` under the Finance grouping, matching the Paycheck / Debt Payoff / Pregnancy calculator architecture: ToolPageShell → hero result → interactive controls + chart → AdZone → HowToUse → ToolSeoContent → RelatedTools.

## Files

**New**
- `src/lib/rent-vs-buy/calc.ts` — pure simulation engine. Types:
  - `BuyInputs { homePrice, downPaymentPct, mortgageRatePct, termYears (15|30), propertyTaxPct, insuranceAnnual, hoaMonthly, maintenancePct, buyingClosingPct, sellingCostPct }`
  - `RentInputs { monthlyRent, rentGrowthPct, rentersInsMonthly }`
  - `Assumptions { appreciationPct, investmentReturnPct, plannedYears }`
  - `YearRow { year, buyNet, rentNet, buyCashOut, rentCashOut, mortgageBalance, homeValue, portfolio }`
  - `SimResult { rows: YearRow[30], breakevenYear: number | null, edge: "buy-always" | "rent-always" | "crossover", atHorizon: { winner: "buy"|"rent", diff, buyNet, rentNet } }`
  - Functions: `monthlyPayment(principal, ratePct, termYears)`; `simulate(buy, rent, assumptions)` runs a 30-year monthly amortization aggregated to yearly rows, tracks appreciating home value, mortgage balance, cumulative buyer cash out (upfront + P&I + tax + insurance + HOA + maintenance), rent paid (growing yearly), and an investment portfolio seeded with (down payment + closing costs) that each year receives the positive `(buyMonthlyCost − rentMonthlyCost)` cash-flow difference; portfolio compounds at investment return. Net position at year N: buy = `homeValue − mortgageBalance − sellingCosts − cumulativeBuyCash`; rent = `portfolio − cumulativeRentCash`. Breakeven = first year buyNet ≥ rentNet.

- `src/routes/tools.rent-vs-buy-calculator.tsx` — full page.
  - **Hero result card** (top, aria-live=polite): huge headline "You break even after **X years**" — or "Buying wins immediately" (breakeven ≤ 1) — or "Renting wins at every horizon within 30 years" (no crossover). Sub-line: at-horizon verdict — "At your planned N years, **buying/renting** wins by **$X**" with the two net positions.
  - **Two-column form** (mobile stacks): left = Buying inputs (price, down payment $ + % linked, rate, term Select 15/30, property tax %, insurance $/yr, HOA $/mo, maintenance %, buying closing %, selling cost %). Right = Renting inputs (monthly rent, rent growth %, renter's insurance $/mo) + Assumptions (appreciation %, investment return %, planned years) rendered as shadcn `Slider` components with the numeric value shown beside each label so dragging redraws the chart live.
  - **Crossover chart** (recharts `LineChart`): x = years 1–30, two series (Buy net, Rent net) using site semantic tokens; ReferenceDot on breakeven year with label; ReferenceLine at the planned-years horizon; formatted USD tooltips.
  - **Assumptions panel** — collapsible details showing every default (property tax %, maintenance %, closing/selling %, appreciation, rent growth, investment return) with a note that every one is editable above; wording "No hidden constants — every assumption above is editable."
  - Disclaimer note: "Estimates for planning purposes only. Not financial or real estate advice. Actual outcomes depend on real market conditions, actual tax treatment, and costs not modeled here (mortgage points, PMI, local transfer taxes). Runs entirely in your browser. No account, no signup, nothing sent to a server."
  - Section order: hero → controls + chart → AdZone (`id="rent-vs-buy-calculator-mid" size="728x90"`) → HowToUse → ToolSeoContent → RelatedTools.
  - `head()` builds meta with `buildPageMeta_with_schema` including WebApplication JSON-LD with accurate featureList (breakeven year, opportunity-cost modeled, interactive sliders, 30-year net-position chart, at-horizon comparison, editable assumptions, fully client-side).

**Edited**
- `src/lib/tools.ts` — register `rent-vs-buy-calculator` with `Home` (lucide) icon in the utility/finance grouping (same category used by loan/paycheck/debt-payoff).
- `src/lib/related-tools.ts` — add `"rent-vs-buy-calculator": ["mortgage-calculator", "compound-interest", "paycheck-calculator", "loan-calculator", "debt-payoff-calculator"]`; add it to the reverse maps for mortgage, compound-interest, paycheck.
- `public/sitemap.xml`, `public/llms.txt` — add the new URL under Utilities & Calculators.

## Calculation logic (concise)

- Monthly P&I: standard fixed-rate amortization on `homePrice × (1 − downPct)`.
- Each month: interest = balance × r/12; principal = payment − interest; balance -= principal. Aggregate to yearly.
- Buyer monthly cost year Y: P&I + (propertyTaxPct × homeValueY / 12) + insuranceAnnual/12 + hoaMonthly + (maintenancePct × homeValueY / 12).
- Renter monthly cost year Y: rent × (1 + rentGrowth)^(Y−1) + rentersInsMonthly.
- Portfolio: seed = down payment + closingCostsPct × price. Each month, if buyerCost > renterCost, add the difference; portfolio grows at monthlyReturn = (1 + annualReturn)^(1/12) − 1.
- Home value: price × (1 + appreciation)^Y.
- Buy net Y: homeValueY − mortgageBalanceY − sellingCostPct × homeValueY − cumulativeBuyCashOut.
- Rent net Y: portfolioY − cumulativeRentCashOut.
- Breakeven: first Y in 1..30 where buyNet ≥ rentNet. Edge cases: `buyNet[1] ≥ rentNet[1]` → "buy-always"; no crossover → "rent-always".

## UI / accessibility

- Reuse shadcn `Input`, `Label`, `Select`, `Slider`, `Button`, existing dark gradient hero style.
- Down payment $ and % stay in sync (edit either).
- Sliders show live numeric value; keyboard-accessible; chart re-renders in `useMemo` on any input change (fully client, no debouncing needed for 30 yearly points).
- Hero + at-horizon block have `aria-live="polite"`; every input has a real `<Label htmlFor>`.
- USD formatting throughout via `Intl.NumberFormat`.

## Defaults

Home price $450,000; 20% down; 6.5% rate; 30-year term; 1.1% property tax; $1,500/yr insurance; $0 HOA; 1% maintenance; 3% buying closing; 7% selling; monthly rent $2,400; 3% rent growth; $15/mo renter's ins; 3% appreciation; 6% investment return; 10 years planned.

## SEO

- `head()` — title "Rent vs Buy Calculator — Find Your Breakeven Year (Free) | Skycally"; description targets "rent vs buy calculator, should I rent or buy, buy vs rent breakeven". Canonical + og:*. WebApplication JSON-LD with featureList: breakeven year across 30 years, opportunity-cost modeled on down payment, live sliders for appreciation/rent growth/investment return, net-position crossover chart, at-horizon comparison, every assumption editable, fully client-side no signup.
- `ToolSeoContent` — 4 body paragraphs (why breakeven year beats a monthly-payment comparison; hidden ownership costs — maintenance, selling costs, opportunity cost of the down payment; why appreciation and rent-growth assumptions are sliders not constants; how this fits with mortgage/compound-interest/paycheck tools).
- 8 FAQs as spec'd.
- Contextual internal-links block above RelatedTools with full-sentence framing for Mortgage Calculator, Compound Interest, Paycheck Calculator.

## HowToUse (3 steps)

1. Enter the home price, down payment, mortgage rate, and your current monthly rent — everything else has a sensible US default you can still edit.
2. Drag the appreciation, rent-growth, and investment-return sliders to reflect your view of the market — the breakeven year and chart update live.
3. Compare the automatic breakeven year against how long you actually plan to stay — the second answer is the one that matters for your decision.

## Out of scope

- Mortgage points, PMI, ARM/variable-rate mortgages, itemized federal tax benefit of mortgage interest / SALT (called out in disclaimer).
- Local transfer taxes, jumbo loan rules, non-USD locales.
- Saving/loading scenarios.

