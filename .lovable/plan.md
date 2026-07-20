## Retirement / 401(k) Calculator

Add a new client-side finance tool at `/tools/retirement-calculator` matching the existing conventions from Paycheck, Debt Payoff, Rent vs. Buy, and Insurance Estimator.

### Files to create

**`src/lib/retirement/calc.ts`** — pure calculation module
- Types: `MatchTier { matchPct, capPct }`, `RetirementInputs`, `YearRow { age, salary, employeeContribution, employerMatch, endBalanceConservative, endBalanceOptimistic, realBalanceConservative, realBalanceOptimistic }`, `RetirementResult`.
- `computeEmployerMatch(salary, employeeContribPct, tier1, tier2?)` — tiered match: match applies only up to each tier's salary cap, second tier only kicks in after tier 1's cap.
- `simulate(inputs)` — year-by-year loop from `currentAge` → `retirementAge`, twin-projection loop for conservative and optimistic return rates. Each year: salary grows by salaryGrowthPct; contribution rate escalates by `contribEscalationPct` capped at `maxContribPct` (default 15%); recompute match against new salary; add employee + match to both balances; grow each balance by its respective return rate; store both nominal and inflation-adjusted (deflate by `(1+inflation)^yearsElapsed`) values.
- `applyFourPercentRule(balance)` → `{ annual, monthly }`.
- `benchmarkStatus(currentAge, currentBalance, salary)` — compare current balance to age-based salary multiples (30→1×, 40→3×, 50→6×, 60→8×, 67→10×), interpolate between anchors, return `{ targetMultiple, actualMultiple, status: "behind" | "on-track" | "ahead", targetBalance }`.
- Formatters: `fmtUSD`, `fmtUSDCompact` (for chart Y-axis: $1.2M).

**`src/routes/tools.retirement-calculator.tsx`** — the route
- `createFileRoute("/tools/retirement-calculator")` with `head()` returning `buildToolMeta(...)` plus JSON-LD `WebApplication` schema (featureList mentions tiered match modeling, conservative/optimistic range, inflation-adjusted values, 4% rule income estimate, benchmark comparison, no signup / no account linking).
- Component uses `ToolPageShell` with title "Retirement Calculator" and description mentioning "401(k) projection, no signup, no account linking".
- Input panel — three grouped cards matching the site's calculator layout:
  1. **You** — current age, retirement age, annual salary, current balance.
  2. **Contributions & match** — employee contribution %, tier 1 (match % + salary cap %), optional tier 2 (add/remove button), optional annual escalation %.
  3. **Growth assumptions** — salary growth %, inflation %, conservative return %, optimistic return %.
- Sensible defaults (age 30 → 65, $75k salary, $10k balance, 6% employee, 100% match up to 3% + 50% match on next 2%, 3% salary growth, 2.5% inflation, 5% conservative / 8% optimistic returns).
- Results section, in order:
  1. Side-by-side conservative vs. optimistic cards (nominal balance + "in today's dollars" underneath, 4% rule monthly income for each). Same visual pattern as Insurance Estimator's two-method cards.
  2. Benchmark on-track card — "behind pace / on pace / ahead of pace" with target multiple and target balance, framed as a rough rule of thumb.
  3. Employer match breakdown card — first-year itemized "your contribution $X + employer match $Y = $Z going in" with "that's $Y/yr in free money" callout.
  4. Balance growth chart — recharts `AreaChart` with two series (conservative + optimistic) shaded, x-axis = age, y-axis = compact USD, same styling as Rent vs. Buy chart.
  5. Traditional vs. Roth explainer — plain-language two-column info box, clearly separated from the numeric projection, labelled informational.
  6. Disclaimer note — projections not guarantees, not financial advice.
- `AdZone` placed once between the input panel and results (matching existing tools).
- Section order after results: `HowToUse` → `ToolSeoContent` → `RelatedTools`.

### Files to edit

- **`src/lib/tools.ts`** — register `retirement-calculator` under the utility/finance category with a suitable lucide icon (e.g. `PiggyBank`), title, description, keywords ("retirement calculator", "401k calculator", "retirement savings calculator").
- **`src/lib/related-tools.ts`** — add `"retirement-calculator": ["compound-interest", "paycheck-calculator", "debt-payoff-calculator", "rent-vs-buy-calculator", "mortgage-calculator", "insurance-estimator"]` and add `retirement-calculator` into the existing finance tools' related arrays.
- **`public/sitemap.xml`** — add `<url>` entry.
- **`public/llms.txt`** — add tool line under finance/utility section.

### SEO content

- Meta title/description target "retirement calculator", "401(k) calculator", "retirement savings calculator" and mention "no account linking, no signup".
- `ToolSeoContent` with 4 body paragraphs (range vs. false precision, how employer match actually works, why inflation-adjusted dollars matter, how it fits with the site's other finance tools with inline `<Link>`s to Compound Interest, Paycheck, and Debt Payoff calculators).
- 8 FAQs covering: age-based savings benchmarks, how 401(k) match works, Traditional vs. Roth, projected retirement income, the 4% rule, what return rate to assume, debt payoff vs. 401(k) trade-off, inflation adjustment.

### Non-negotiables honored

- 100% client-side, no signup, no account linking (called out in copy).
- Always a conservative/optimistic range, never a single headline number.
- Nominal + inflation-adjusted values always shown together.
- Reuses `ToolPageShell`, `HowToUse`, `AdZone`, `ToolSeoContent`, `RelatedTools`.
