# Water Intake Calculator

Build `/tools/water-intake-calculator` as a single self-contained route, following the same shell + SEO pattern as other Skycally calculators (calorie, BMI, sleep).

## Files

**Create** `src/routes/tools.water-intake-calculator.tsx`
- `createFileRoute("/tools/water-intake-calculator")` + `buildToolMeta(toolBySlug("water-intake-calculator", tools))`
- Wrapped in `<ToolPageShell showFileDisclaimer={false}>` → calculator UI → `<AdZone>` → `<HowToUse>` → `<ToolSeoContent>` → `<RelatedTools currentSlug="water-intake-calculator" />`
- All logic, state, schedule builder, Web Audio sound helpers, and scoped CSS (ripple + glass fill) inline

**Edit** `src/lib/tools.ts` — register tool (slug `water-intake-calculator`, name "Water Intake Calculator", category `utility`, icon `Droplets` from lucide-react)

**Edit** `src/lib/related-tools.ts` — cross-link with `calorie-calculator`, `bmi-calculator`, `sleep-calculator`, `age-calculator`

**Edit** `public/sitemap.xml` — add `/tools/water-intake-calculator` entry matching existing format

## UI layout

Desktop `md:grid-cols-[2fr_3fr]`, mobile stacked.

```text
Left (inputs)
  Weight (number + kg/lbs toggle)
  Age (number)
  Sex (Male/Female toggle)
  Activity (5 card selector w/ emoji)
  Climate (3 buttons)
  Special conditions (Pregnant, Breastfeeding toggles — only when Female)
  Coffees stepper (0-10)
  Alcoholic drinks stepper (0-10)

Right
  Hero result card (cyan gradient + animated water ripple)
    ml primary, then L · glasses · fl oz
  Breakdown chips (one pill per applied factor with sign + value)
  Interactive Glass Tracker
    grid of glass SVGs (cap at 16 visual, real count above)
    click → fill animation + gulp sound, progress bar
    completion → confetti + success fanfare
  Hydration Schedule
    vertical timeline with time, label, checkbox
  Contextual tips with internal <Link> to related tools
  Medical disclaimer
```

## Calculation

```ts
const base = unit === 'kg' ? weightKg * 33 : weightLbs * 0.5 * 29.5735;
const activity = {sedentary:0, light:350, moderate:600, very:900, extra:1200}[level];
const climateBonus = {cold:-200, temperate:0, hot:500}[climate];
const pregBonus = pregnant ? 300 : 0;
const bfBonus = breastfeeding ? 700 : 0;
const coffeeDeduct = coffees * 150;
const alcoholDeduct = drinks * 200;
let total = base + activity + climateBonus + pregBonus + bfBonus - coffeeDeduct - alcoholDeduct;
total = Math.max(1500, Math.min(5000, total));
// glasses = ceil(total/250); liters = total/1000; flOz = total/29.5735
```

## Schedule builder

Use the spec's `buildSchedule` (special labels at 7/13/19/22). Interval spread 7→22.

## Sound (Web Audio API)

Singleton `AudioContext` lazily created on first interaction. Two helpers: `playGulpSound` (sine 800→200Hz over 0.3s) and `playSuccessSound` (C-E-G-C arpeggio). Mute toggle button next to glass tracker, state persisted.

## Confetti

Pure CSS/JS — small set of absolutely-positioned divs with randomized transforms animated via Framer Motion (already in project) when `filled === glasses`. No new dependency.

## localStorage keys

- `water-intake-inputs` — all form fields + unit
- `water-intake-progress` — `{ date: 'YYYY-MM-DD', filled: number, checkedTimes: string[] }`
- `water-intake-muted` — boolean

On mount, if stored `date !== today` → reset progress (midnight auto-reset).

## Internal links (TanStack Link)

In tips section, use `<Link to="/tools/calorie-calculator">`, `<Link to="/tools/sleep-calculator">`, `<Link to="/tools/bmi-calculator">`. Activity-dependent and coffee-dependent tips per spec.

## SEO

Use exact `HowToUse` steps, `ToolSeoContent` title/description/body/faqs from the spec.

## Acceptance

- Result updates live as inputs change
- Glass clicks animate + play gulp; completion triggers confetti + fanfare
- Schedule reflects glass count, checkboxes persist
- Unit toggle preserves equivalent weight
- All progress wipes at midnight on reload
- Mobile: stacked, no horizontal scroll
- Registered in tools.ts, related-tools.ts, sitemap.xml
