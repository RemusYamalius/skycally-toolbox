# Percentage Calculator — new tool at /tools/percentage-calculator

A four-in-one percentage calculator built with the project's standard tool-page structure, matching the Margin Calculator template exactly in file shape, imports, and metadata handling.

## What gets built

**Four sub-calculators as tabs**, all live-updating as you type (no "Calculate" button):

1. What is X% of Y? → (X ÷ 100) × Y
2. X is what percent of Y? → (X ÷ Y) × 100
3. Percentage change from X to Y → ((Y − X) ÷ X) × 100, with green up-arrow for increase and red down-arrow for decrease
4. Y increased/decreased by X% → toggle between increase and decrease, Y × (1 ± X ÷ 100)

Edge cases handled cleanly: division by zero and empty inputs show an em dash instead of NaN or Infinity.

## Page order (exactly as specified)

1. Calculator UI with the four tabs
2. Contextual internal links — natural sentence linking to Margin Calculator, Tip Calculator, Currency Converter and Unit Converter, all via `<Link to="...">` from TanStack Router (never `<a href>`)
3. "How it works" section — the four formulas in `font-mono`, styled like Margin Calculator's
4. `<AdZone id="percentage-calculator-mid" size="728x90" />`
5. `<HowToUse steps={[...]} />`
6. `<ToolSeoContent ... faqs={...} />` (FAQPage JSON-LD is emitted automatically by that component — no hand-written schema)
7. `<RelatedTools currentSlug="percentage-calculator" />` — always last

## SEO approach

Long-tail first, not the generic high-competition head term. Title and description target "percentage increase calculator", "percentage of a number calculator" and "percentage change calculator". FAQ questions are phrased as real Google queries: "How do I calculate percentage increase?", "What is X percent of Y?", "How do I calculate percentage change between two numbers?", "How do I add 20% to a number?", and similar.

## Technical notes

- Registry entry added to `src/lib/tools.ts` with slug `percentage-calculator`, category `utility`, the already-imported `Percent` icon, and `schemaCategory: "UtilitiesApplication"`. `featureList` lists only capabilities the code actually ships (four calculation modes, live results, increase/decrease direction indicator, no signup, browser-based, free).
- Route file `src/routes/tools.percentage-calculator.tsx` uses `buildToolMeta(toolBySlug("percentage-calculator", tools))` in `head()`, same as `tools.margin-calculator.tsx`.
- Tabs: `src/components/ui/tabs.tsx` already exists and is used by other tools (bmi-calculator, sleep-calculator), so shadcn Tabs is used — no new dependency.
- No new packages; plain arithmetic and existing UI components only.
- Registration also added to `src/lib/related-tools.ts` (entry for the new slug plus adding it to `margin-calculator` and `tip-calculator` lists), `public/sitemap.xml`, and `public/llms.txt` — matching how every other tool is registered.

## Verification before delivery

- Hand-check 3 numeric examples per sub-calculator (12 total) against manual arithmetic.
- TypeScript check.
- Browser test: tool appears on the All Tools page, the four tabs compute correctly, and it shows up in RelatedTools on the Margin Calculator and Tip Calculator pages.
