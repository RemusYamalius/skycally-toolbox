## Plan: Add "Utility Tools" category + 4 new calculators

### 1. `src/lib/tools.ts`
- Extend `ToolCategory` union with `"utility"`.
- Add `utility` entry to `categoryMeta` (label "Utility Tools", color `var(--green-brand)`, icon 🛠️).
- Add `Moon, Calculator, Activity, CalendarDays` to lucide-react imports.
- Change category from `"text"` to `"utility"` for: `spinning-wheel`, `free-time-fixer`, `link-shortener`, `password-generator`, `qr-generator`, `qr-reader`.
- Append 4 new tools (sleep-calculator, tip-calculator, bmi-calculator, age-calculator) under category `"utility"` exactly as specified.

### 2. `src/routes/index.tsx`
- Add `Wrench` to lucide-react imports.
- Add `{ icon: Wrench, label: "Utility Tools", cat: "utility", color: categoryMeta.utility.color }` to `quickAccess`.
- Add `utility: "Calculators, decision tools and everyday utilities."` to `categoryTaglines`.
- Add `"utility"` to the category iteration list in the "Browse All Tools" section so it renders.

### 3. Four new route files
Each follows the established pattern: `createFileRoute`, `buildToolMeta`, `ToolPageShell` wrapping the UI, `HowToUse` with exactly 3 steps, `ToolSeoContent` (title with keywords, 1-2 sentence description, 2-3 paragraph body ~150-200 words, 4 FAQs), and `RelatedTools`. All logic client-side, no external libraries, semantic design tokens only.

**`src/routes/tools.sleep-calculator.tsx`**
- Mode toggle: "I want to wake up at..." / "I'm going to sleep at..." (Tabs).
- Time input (`<input type="time">`).
- Compute 6 recommended times = base ± multiples of 90 min (plus 14 min fall-asleep buffer). Render as clickable badges showing time + cycle count + total sleep hours.

**`src/routes/tools.tip-calculator.tsx`**
- Inputs: bill amount (number), tip % preset buttons (10/15/18/20/25) + custom number, people count (stepper).
- Live computed: tip, total, per-person. Result cards using design tokens.

**`src/routes/tools.bmi-calculator.tsx`**
- Unit toggle (metric: kg/cm; imperial: lb + ft/in).
- Compute BMI, category (Underweight <18.5 / Normal 18.5–24.9 / Overweight 25–29.9 / Obese ≥30).
- Color-coded badge + horizontal gradient scale bar with marker at user's BMI position.

**`src/routes/tools.age-calculator.tsx`**
- Date input for birthdate.
- Outputs: years/months/days breakdown, total days lived, days until next birthday with countdown card.

### Out of scope
- No edits to `routeTree.gen.ts` (auto-generated).
- No changes to existing tool routes beyond their category field.
