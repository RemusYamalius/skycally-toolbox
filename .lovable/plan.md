# Macro Calculator — `/tools/macro-calculator`

Protein-first macro breakdown tool, independent from the Calorie Calculator, matching Skycally's tool conventions.

## Files to create

1. **`src/lib/macro/calc.ts`** — pure calculation module:
   - `mifflinStJeor({ sex, age, heightCm, weightKg })` and `katchMcArdle({ weightKg, bodyFatPct })` BMR formulas.
   - Activity multipliers: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9.
   - `computeCalories(bmr, activity, goal)` where goal ∈ `cutting` (−20%), `maintenance` (0%), `bulk` (+12%).
   - `computeMacros({ calories, weightKg, proteinPerKg, goal, fatMode })`:
     - Protein grams = `weightKg * proteinPerKg` (defaults: cut 2.3, maint 1.8, bulk 1.9).
     - Fat floor = max(`weightKg * 0.8 g/kg`, `0.25 * calories / 9`), user-adjustable in a range.
     - Carbs = remainder / 4. If carbs < 0 → return `{ warning: "Calorie target too low for protein + fat floor" }` with the deficit surfaced.
   - Unit helper for lb↔kg, in↔cm.
   - `foodEquivalence(macro, grams)` returning short strings (e.g. protein → chicken breast ≈ 30 g each; carbs → cup cooked rice ≈ 45 g; fat → tbsp olive oil ≈ 14 g).

2. **`src/routes/tools.macro-calculator.tsx`** — route, mirrors calculator page patterns (Retirement / Rent-vs-Buy):
   - `ToolPageShell` with title/description, `showFileDisclaimer={false}`.
   - Left column input panel:
     - **Primary**: "Daily calorie target" number input + unit toggle (kcal).
     - **Body weight** input (needed for protein g/kg) with kg/lb toggle.
     - **Goal** segmented control: Cutting / Maintenance / Lean Bulk — adjusts default protein g/kg + shows resulting deficit/surplus badge.
     - **Protein slider** (1.2–2.6 g/kg) with live g and kcal readout.
     - **Fat slider** (0.5–1.5 g/kg, floor enforced) with live readout.
     - Collapsible **"I don't know my calorie target"** section (`<details>` styled): age, sex, height (cm/in), weight synced with above, activity level select, optional body-fat % (unlocks Katch-McArdle radio, otherwise Mifflin-St Jeor). "Use this calorie number" button fills the target field; user can still edit.
   - Right column results:
     - Donut chart (custom SVG, matching site's chart style — same approach as paycheck donut) showing protein/carbs/fat by kcal share.
     - Three macro cards color-coded (protein cyan, carbs amber, fat rose using existing tokens), each with grams, kcal, %, and food-equivalence line.
     - Total calories headline + goal delta.
     - Warning banner when carbs go negative.
     - Optional per-meal breakdown (3 or 4 meals toggle) — grams per meal per macro.
   - **Contextual internal links block directly under results** (before AdZone):
     - `<Link to="/tools/calorie-calculator">` — "Don't have a calorie target yet? Get a fuller breakdown with the Calorie Calculator."
     - `<Link to="/tools/intermittent-fasting-calculator">` — "Planning to hit these macros within a fasting window? Find your schedule."
     - `<Link to="/tools/heart-rate-zone-calculator">` — "Training toward a cut or bulk? Dial in your cardio zones too."
   - Disclaimer note (general fitness planning, not medical advice — see a dietitian for medical conditions).
   - Order: results + internal links → `AdZone` → `HowToUse` (3 steps) → `ToolSeoContent` (4 body paragraphs, 8 FAQs) → `RelatedTools`.
   - `head: () => buildToolMeta(toolBySlug("macro-calculator", tools))` — JSON-LD `WebApplication` schema comes from `buildToolMeta` (matches every other tool).

3. **Registrations:**
   - `src/lib/tools.ts` — add `macro-calculator` in the utility/health category with an appropriate lucide icon (e.g. `PieChart`), path `/tools/macro-calculator`, description targeting "macro calculator, protein carb fat calculator, macro calculator for cutting and bulking — free, complete breakdown, no signup".
   - `src/lib/related-tools.ts` — cross-link with calorie-calculator, intermittent-fasting-calculator, heart-rate-zone-calculator, bmi-calculator.
   - `public/sitemap.xml` — add URL entry.
   - `public/llms.txt` — add tool line under Utilities & Calculators.

## Checklist compliance
1. JSON-LD via `buildToolMeta` ✓
2. All internal links use `<Link to=...>` from `@tanstack/react-router` ✓
3. Contextual links immediately below results, above AdZone/HowToUse/ToolSeoContent ✓
4. `ToolSeoContent.body` = 4 plain strings, no JSX ✓
5. Order HowToUse → ToolSeoContent → RelatedTools ✓
6. No shared state with Calorie Calculator; only an optional `<Link>` ✓

## Non-goals
No signup, no persistence, no new dependencies (chart is inline SVG matching paycheck donut pattern).
