## Heart Rate Zone Calculator

Build `/tools/heart-rate-zone-calculator` as a single self-contained route, following the same shell + SEO pattern as other Skycally calculators (calorie, BMI, water-intake).

### Files

**Create** `src/routes/tools.heart-rate-zone-calculator.tsx`
- `createFileRoute("/tools/heart-rate-zone-calculator")` + `buildToolMeta(toolBySlug(...))`
- Wrapped in `<ToolPageShell showFileDisclaimer={false}>` → calculator UI → `<AdZone>` → `<HowToUse>` → `<ToolSeoContent>` → `<RelatedTools currentSlug="heart-rate-zone-calculator" />`
- All logic, constants, Web Audio helpers, and scoped CSS inline

**Create** `src/lib/heart-rate/constants.ts`
- All formula constants (MHR formulas, zone percentages, edge-case bounds) — no magic numbers in the route

**Edit** `src/lib/tools.ts` — register tool (slug `heart-rate-zone-calculator`, name "Heart Rate Zone Calculator", category `utility`, icon `HeartPulse`). Note: project has no `fitness` category; Skycally groups health calculators under **utility** (calorie, BMI, sleep, water-intake all live there).

**Edit** `src/lib/related-tools.ts` — cross-link with `calorie-calculator`, `bmi-calculator`, `sleep-calculator`, `water-intake-calculator`

**Edit** `public/sitemap.xml` — add `/tools/heart-rate-zone-calculator`

### Constants (`src/lib/heart-rate/constants.ts`)

```ts
export const MHR_FORMULAS = {
  tanaka:  { label: "Tanaka (recommended)", fn: (age:number) => 208 - 0.7 * age },
  fox:     { label: "Fox (220 - age)",      fn: (age:number) => 220 - age },
  gulati:  { label: "Gulati (women)",       fn: (age:number) => 206 - 0.88 * age },
  nes:     { label: "Nes",                  fn: (age:number) => 211 - 0.64 * age },
} as const;

export const ZONES = [
  { id: 1, name: "Very Light",  low: 0.50, high: 0.60, color: "#3b82f6", purpose: "Warm-up, recovery" },
  { id: 2, name: "Light",       low: 0.60, high: 0.70, color: "#22c55e", purpose: "Fat burn, base endurance" },
  { id: 3, name: "Moderate",    low: 0.70, high: 0.80, color: "#eab308", purpose: "Aerobic, stamina" },
  { id: 4, name: "Hard",        low: 0.80, high: 0.90, color: "#f97316", purpose: "Anaerobic threshold" },
  { id: 5, name: "Maximum",     low: 0.90, high: 1.00, color: "#ef4444", purpose: "VO2 max, sprints" },
] as const;

export const AGE_MIN_WARN = 10;
export const AGE_MAX_WARN = 100;
export const MHR_MIN_WARN = 100;
export const DEBOUNCE_MS  = 150;
```

### Calculation

Two methods:
- **% of MHR**: `target = MHR * pct`
- **Karvonen (HRR)**: `target = (MHR - RHR) * pct + RHR` — only enabled when RHR provided

Edge cases:
- `age < 10 || age > 100` → warning chip ("Formulas are validated for ages 10–100")
- `RHR >= MHR` → error state, block results
- `MHR < 100` → warning chip ("Unusually low max heart rate — double-check inputs")

### UI layout

Desktop `md:grid-cols-[2fr_3fr]`, mobile stacked.

```text
Left (inputs)
  Age (number)
  Sex (Male/Female toggle — drives Gulati availability)
  MHR formula select (Tanaka / Fox / Gulati / Nes / Manual override)
  Manual MHR (number, shown when "Manual")
  Resting HR (optional number, enables Karvonen)
  Calculation method toggle (% MHR / Karvonen)

Right
  Hero result card (red→orange gradient + animated pulse heart SVG)
    MHR primary, method label, RHR echo
  Zone table — 5 rows, each:
    color bar, name, BPM range (low–high), % range, purpose
    click row → plays soft tone at zone frequency
  Horizontal zone bar (stacked colored segments, full MHR scale)
  Warning/error chips
  Share button (uses existing share pattern)
```

### Sound (Web Audio API)

Singleton `AudioContext` lazily created on first interaction. Helpers:
- `playZoneTone(zoneId)` — sine wave, freq scales with zone (300–700 Hz), 0.15s
- `playHeartbeat()` — two-thump kick on hero card mount (optional)
- Mute toggle persisted to `localStorage`

### Performance

- `useMemo` for derived zone rows
- Inputs debounced 150ms via small `useDebouncedValue` hook inlined
- No third-party state libs

### Accessibility

- All inputs labeled with `<Label htmlFor>`
- Zone table is a real `<table>` with `<th scope>`
- Color is never the only signal — every zone has name + numeric range
- Warning/error chips use `role="status"` / `role="alert"`
- Keyboard: zone rows are `<button>` for tone playback, full focus-visible ring
- Mute toggle has `aria-pressed`

### localStorage

- `hr-zone-inputs` — form values
- `hr-zone-muted` — boolean

### SEO

- `HowToUse` 3 steps (enter age → pick formula → read zones)
- `ToolSeoContent` with target keyword "heart rate zone calculator", 2–3 paragraphs explaining MHR, HRR/Karvonen, zone training, plus 4 FAQs (Tanaka vs 220-age, why use RHR, training in zone 2, accuracy disclaimer)
- Medical disclaimer line at bottom

### Acceptance

- Live update on every input change (debounced 150ms)
- Switching formula or method updates zone table instantly
- Karvonen disabled until RHR entered; RHR ≥ MHR shows error
- Age out of 10–100 shows warning, MHR < 100 shows warning
- Clicking a zone row plays a tone (when unmuted)
- Mobile: stacked, no horizontal scroll
- Registered in tools.ts (utility category), related-tools.ts, sitemap.xml
- Breadcrumb already provided by ToolPageShell ("Back to all tools" link)

### Note on spec deviations

- **Category**: spec says "Fitness" but Skycally has no fitness category — using `utility` to match calorie/BMI/sleep/water-intake.
- **Shared components**: spec mentions `ToolCard, ToolHeader, ToolSection, Badge` — project uses `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `AdZone`, `RelatedTools`. Will use those (the actual Skycally pattern).
