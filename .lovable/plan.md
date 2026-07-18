
# Insurance Estimator — Life & Car

New flagship finance tool at `/tools/insurance-estimator` with a Life / Car mode toggle, mirroring Paycheck Calculator's structure and transparency style. Runs 100% client-side, no email, no signup, no server calls.

## Files

**New**
- `src/lib/insurance/constants.ts` — all base-rate tables and adjustment factors, with a top-of-file "VERIFY BEFORE LAUNCH" block naming each published source + year (same pattern as `paycheck/constants.ts`).
  - Life: term-life average annual rates by (age bracket, sex, health class, smoker, term length, coverage tier) — sourced from Policygenius / Term4Sale published average-rate tables (year flagged in comments).
  - Car: state-average annual base premium for **full coverage** (all 50 states + DC) sourced from NAIC / Insurance Information Institute / Bankrate published state averages (year flagged); plus relative adjustment factors for driver age bracket, vehicle age bracket, coverage level (minimum / standard / full), deductible ($250/$500/$1000/$1500), and driving record (clean / one minor / at-fault or DUI).
  - Every table entry that is derived rather than directly cited is marked with an inline `// UNVERIFIED — confirm` comment.
- `src/lib/insurance/calc.ts` — pure functions:
  - `computeLifeNeed(input)` → returns `{ dime: { debt, income, mortgage, education, total }, incomeMultiplier: { low, high } }` where low/high = 10× and 15× annual income.
  - `computeLifePremium(input)` → returns `{ monthlyLow, monthlyHigh, annualLow, annualHigh, factorsApplied: {...} }` — looks up base rate, applies smoker + health-class multipliers, interpolates coverage amount, produces a low/high range (not a single false-precision number).
  - `computeCarPremium(input)` → returns `{ stateBase, byLevel: { minimum, standard, full }, breakdown: [{label, factor, runningTotal}], deductibleAdjustment }` — starts from state full-coverage base, applies each factor in order and records the running total for the transparency panel.
- `src/routes/tools.insurance-estimator.tsx` — main route. Local state `mode: "life" | "car"`, toggle styled exactly like Paycheck's W-2/Self-Employed segmented control.

**Edited**
- `src/lib/tools.ts` — register `insurance-estimator` in the Finance category, `ShieldCheck` (lucide) icon, tagline "Estimate life insurance coverage needs and car insurance premiums — no signup, no email."
- `src/lib/related-tools.ts` — `"insurance-estimator": ["paycheck-calculator", "debt-payoff-calculator", "mortgage-calculator", "rent-vs-buy-calculator", "loan-calculator"]`, plus add `insurance-estimator` to the reverse lists of those five.
- `public/sitemap.xml`, `public/llms.txt` — new URL under Finance.

## UI

Order inside `ToolPageShell`:

1. **Ballpark banner** (always visible, not dismissable) — amber-accent card at the very top of the tool body, plain-language: "This is a ballpark estimate built from published industry-average data — not a real quote. Real premiums depend on underwriting factors no calculator can see. Nothing here requires an email or signup."
2. **Mode toggle** — segmented "Life Insurance / Car Insurance" pill, same visual as Paycheck's toggle.
3. **Mode panel** (Life or Car — see below).
4. `AdZone id="insurance-estimator-mid" size="728x90"`.
5. `HowToUse` (3 steps).
6. `ToolSeoContent` (4 body paragraphs + 8 FAQs — copy per spec).
7. `RelatedTools` (last).

### Life mode

Two-column layout on desktop, stacked on mobile.

- **Inputs (left)**: age, sex, smoker (toggle), health class (Preferred Plus / Preferred / Standard), coverage amount (slider + numeric, $100k–$3M), term length (10 / 20 / 30 year segmented), annual income, years dependents need support (default 10), total non-mortgage debt, remaining mortgage balance, future education costs.
- **Results (right)**:
  - **DIME needs card**: itemized rows — Debt, Income replacement (income × years), Mortgage, Education — each with its input value echoed, summed to **DIME recommended coverage** (large number).
  - **Income-multiplier card**: shows `10× income` and `15× income` side by side, small explanatory line: "A simpler rule of thumb; DIME is usually more accurate because it looks at your actual obligations."
  - **Premium range card**: "Estimated ballpark premium for [$coverage] of [term]-year term life: **$X–$Y / month** (**$A–$B / year**)". Shows which factors were applied (age, sex, smoker, health class) as read-only chips.
  - Contextual internal links inline: "Confirm your exact remaining mortgage balance in the [Mortgage Calculator]" and "See how a monthly premium fits into your real take-home pay with the [Paycheck Calculator]" and "If the DIME debt total looks high, see how fast you could pay it down with the [Debt Payoff Calculator]".

### Car mode

- **Inputs (left)**: state (dropdown), driver age (bracket dropdown: 16–19 / 20–24 / 25–29 / 30–49 / 50–64 / 65+), vehicle age bracket (0–3 yrs / 4–7 / 8–12 / 13+), driving record (Clean / One minor incident / At-fault or DUI), deductible ($250 / $500 / $1000 / $1500).
- **Results (right)**:
  - **Three-tier comparison card**: side-by-side columns for **State-minimum liability**, **Standard**, **Full coverage** — each shows annual and monthly figures, with the coverage-level gap highlighted so the user sees the real cost of moving from minimum to full.
  - **Transparency breakdown panel** (for the currently highlighted tier, default Full): ordered rows — "State average base (SOURCE, YEAR)" → age factor → vehicle-age factor → driving record factor → coverage-level factor → deductible adjustment → **Estimated annual premium** — each row shows the multiplier and running total. Same visual language as Paycheck's tax breakdown.
  - Contextual internal link: "See how this monthly premium fits your take-home pay with the [Paycheck Calculator]".

## SEO

- `head()`: title "Insurance Estimator — Free Life & Car Premium Calculator (No Signup) | Skycally"; description explicitly includes "no email required, no signup, ballpark estimate from published industry averages" and the target keywords: life insurance calculator, how much life insurance do I need, car insurance estimator, car insurance cost calculator.
- Inline `WebApplication` JSON-LD with accurate `featureList` covering: DIME method, income-multiplier comparison, term-life premium range by age/health/smoker/term, car premium at three coverage tiers, factor-by-factor breakdown, no signup / no email, runs fully in browser.
- `ToolSeoContent` body — 4 paragraphs exactly as spec'd: (1) what the tool does + honest ballpark framing; (2) DIME method explained + why coverage amount matters; (3) what actually moves a car premium + why coverage level is the biggest lever; (4) how this differs from lead-gen "calculators" that gate the number behind a signup form.
- 8 FAQs verbatim from the spec: "How much life insurance do I actually need?" / "What is the DIME method?" / "Is 10 times my salary enough life insurance?" / "Why do car insurance quotes vary so much between companies?" / "What's the difference between liability and full coverage?" / "Does my credit score really affect my car insurance rate?" / "Is this a real quote?" / "Why don't you ask for my email to show results?"

## HowToUse (3 steps)

1. Pick Life Insurance or Car Insurance at the top.
2. Enter your numbers — everything happens in your browser, we never ask for an email.
3. See a ballpark estimate with a full breakdown of the factors we applied — take these numbers to a licensed insurer for a real quote.

## Non-negotiables checklist

- No email/phone/signup gate anywhere — banner text itself calls this out as the differentiator.
- Prominent, non-dismissable ballpark banner at the top of the tool body, not in a footer.
- Life output shown as a **range** (low–high monthly + annual), never a single false-precision number.
- Car output shown at **all three coverage tiers side by side**, plus a factor-by-factor breakdown for the selected tier.
- Every base-rate table in `constants.ts` cites its published source + year in comments; anything derived is marked `// UNVERIFIED — confirm`. I'll flag the exact set of unverified numbers in the response so they can be checked before launch (same pattern as the Paycheck Calculator ship).
- Reuses `ToolPageShell`, `HowToUse`, `AdZone`, `ToolSeoContent`, `RelatedTools` — no custom equivalents. `RelatedTools` is last.

## Out of scope

- Whole/universal/variable life (term life only).
- Motorcycle / RV / commercial auto.
- Home, renters, health, or pet insurance.
- Real-time quote-API integration with any carrier.
- Credit-based insurance score modeling (mentioned in FAQ but not an input, since users don't know their insurance score).
