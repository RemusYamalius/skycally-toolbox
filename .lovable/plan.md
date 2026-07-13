## Paycheck / Take-Home Pay Calculator

New tool at `/tools/paycheck-calculator` under Finance category, matching the site's calculator architecture (ToolPageShell → results → AdZone → HowToUse → ToolSeoContent → RelatedTools).

### Files

**New**
- `src/routes/tools.paycheck-calculator.tsx` — page: two-column layout (inputs 2fr / results 3fr, mobile stacked). Inputs: gross pay, pay frequency (weekly / biweekly / semi-monthly / monthly / annual), filing status (single / MFJ / MFS / HoH), state (dropdown), 401(k) %, HSA $, health insurance premium $, post-tax deductions $, one-time bonus/overtime $, self-employed toggle. Results panel: gross → itemized (federal, state, SS, Medicare + Additional Medicare, SE tax if 1099, pre-tax, post-tax) → net, shown per-paycheck AND annualized side-by-side. Marginal vs effective rate cards. Donut breakdown chart (pure SVG/CSS, no lib — matches existing pattern). State-comparison section below main results (pick up to 3 states, side-by-side net pay bars). Disclaimer note styled like pregnancy calc's medical disclaimer. Contextual InternalLinks block (loan, mortgage, compound-interest, currency-converter) with full-sentence framing.
- `src/lib/paycheck/constants.ts` — 2026 federal brackets by filing status, standard deductions, SS wage base + rate, Medicare rate + Additional Medicare thresholds, supplemental wage flat rate (22%), SE tax rate (15.3%) with SS portion cap. State registry: no-tax states flagged $0; bracket/flat-rate data for CA, NY, PA, IL, OH, GA, NC, MI, NJ, VA. **Flagged as "verify before launch"** in a top-of-file comment — I will hardcode current best-known 2026 figures but explicitly call out in the response that exact bracket cutoffs need human verification against IRS Rev. Proc. and each state DOR before publishing.
- `src/lib/paycheck/calc.ts` — pure functions: `annualize(gross, frequency)`, `computeFederal(taxable, filing)` (progressive), `computeState(taxable, state, filing)`, `computeFICA(annualGross, filing)` (SS with cap, Medicare + 0.9% additional), `computeSE(netSE)` (15.3% with SS cap), `applySupplemental(bonus)` (22% flat + FICA), `computePaycheck(input)` returning full breakdown, `compareStates(input, stateList)`, `marginalRate/effectiveRate` helpers.

**Edited**
- `src/lib/tools.ts` — register `paycheck-calculator` under Finance category with `Wallet` icon from lucide-react.
- `src/lib/related-tools.ts` — add `paycheck-calculator`: `["loan-calculator", "mortgage-calculator", "compound-interest", "currency-converter", "tip-calculator"]`; also add it to reverse maps for those tools.
- `public/sitemap.xml`, `public/llms.txt` — add new URL.

### Calculation logic

- Annual taxable federal = `annualGross - standardDeduction(filing) - preTaxAnnual (401k% of gross + HSA + health premium)`.
- Federal tax = progressive across bracket table for filing status.
- State tax = per-state function; no-tax → 0; flat-rate states → rate × taxable; bracket states → progressive on state-specific taxable (state std deduction where it materially differs, otherwise federal AGI approximation with a code comment).
- FICA: SS = 6.2% × min(annualGross, wageBase); Medicare = 1.45% × annualGross + 0.9% × max(0, annualGross − filing-specific threshold).
- Self-employed mode: SE tax = 15.3% on 92.35% of net SE earnings (SS portion capped at wage base); half deductible for income-tax calc; framed as "quarterly estimate = annual/4".
- Bonus/overtime: IRS supplemental flat 22% federal + state supplemental (fallback to regular rate where undefined) + full FICA; add to totals separately so per-paycheck view shows a "this period includes bonus" note.
- Marginal rate = federal top bracket + state top bracket + FICA marginal. Effective = totalTax / annualGross.
- Per-paycheck = annualized / periodsPerYear (weekly 52, biweekly 26, semi-monthly 24, monthly 12, annual 1).

### UI

- Dark theme, gradient hero card (emerald→teal→cyan) with big "Net take-home" number, annual + per-paycheck side-by-side.
- Donut chart: 5 slices (Federal, State, FICA, Pre-tax, Net) via SVG stroke-dasharray, animated on mount.
- State-comparison: multiselect chips (max 3), horizontal bar chart of net pay.
- Marginal vs effective: two labeled cards with tooltip Info icon explaining the difference.
- Disclaimer: bordered note under hero — "Estimates only, not tax advice. Actual withholding depends on your W-4, employer processing, and local/city taxes not modeled here."
- Accessibility: labeled inputs, `aria-live="polite"` on results, semantic headings.

### SEO

- `head()` — title front-loads "Paycheck Calculator — Take-Home Pay After Taxes (2026) | Skycally"; description targets "paycheck calculator, take-home pay, salary after taxes". Canonical + og:*. WebApplication JSON-LD with accurate featureList (multi-frequency, 4 filing statuses, 2026 federal brackets, FICA + Additional Medicare, 10 state calculators + no-tax flags, 401k/HSA/health pre-tax, self-employed SE tax, supplemental bonus withholding, marginal vs effective, state-vs-state comparison, donut breakdown).
- `ToolSeoContent`: 4 body paragraphs (what the tool does / how US withholding works / state-by-state differences / using take-home for budgeting) + 8 FAQs matching the spec's PAA queries.

### Integration

- Category: Finance (`utility`/finance section per tools.ts convention — will match existing loan/mortgage grouping).
- AdZone `id="paycheck-calculator-mid" size="728x90"` between results and HowToUse.
- Section order enforced: HowToUse → ToolSeoContent → RelatedTools (last).
- English-only, no external APIs, no server functions, TypeScript strict, fully client-side.

### Out of scope

- Local/city taxes (NYC, SF, etc.) — noted in disclaimer, not modeled.
- Pre-2026 tax years, non-US payroll, W-4 line-by-line simulation, retirement catch-up contribution logic beyond flat %.
- No chart library; no save/account.

### Verification callout

After implementation I will explicitly list in the response every hardcoded 2026 figure (federal brackets per filing status, standard deductions, SS wage base, Additional Medicare thresholds, each state's brackets/flat rate) so you can verify against IRS Rev. Proc. and each state DOR before launch — competitors get these wrong every January and it's the one thing worth double-checking manually.
