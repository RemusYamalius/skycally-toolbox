## Calorie Calculator — Implementation Plan

Build a premium TDEE + macro calculator at `/tools/calorie-calculator` with live calculations, unit toggles, and full nutrition breakdown.

### Files

1. **`src/routes/tools.calorie-calculator.tsx`** (new) — single-file route
2. **`src/lib/tools.ts`** — register: `{ slug: "calorie-calculator", name: "Calorie Calculator", description: "Calculate your daily calorie needs and macros based on your age, weight, height, and activity level.", category: "utility", icon: Flame, path: "/tools/calorie-calculator" }`
3. **`src/lib/related-tools.ts`** — map to `["bmi-calculator", "sleep-calculator", "age-calculator", "tip-calculator", "unit-converter"]`
4. `src/routeTree.gen.ts` regenerates automatically

### Route shell

```tsx
createFileRoute("/tools/calorie-calculator")({
  head: () => buildToolMeta(toolBySlug("calorie-calculator", tools)),
  component: CalorieCalculator,
})
```

Inside `<ToolPageShell showFileDisclaimer={false}>`:
1. Calculator card
2. `<AdZone id="calorie-calculator-mid" size="728x90" />`
3. `<HowToUse steps={[3 steps from spec]} />`
4. `<ToolSeoContent ... 8 FAQs />` (exact copy from spec)
5. `<RelatedTools currentSlug="calorie-calculator" />`

### State

```ts
const [age, setAge] = useState("30");
const [sex, setSex] = useState<"male" | "female">("male");
const [units, setUnits] = useState<"metric" | "imperial">("metric");
const [cm, setCm] = useState("175");
const [ft, setFt] = useState("5"); const [inch, setInch] = useState("9");
const [kg, setKg] = useState("70");
const [lb, setLb] = useState("154");
const [activity, setActivity] = useState<ActivityKey>("moderate");
const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("maintain");
```

Unit toggle converts values in place (kg↔lb at 2.20462; cm↔ft/in via 2.54). localStorage keys: `calorie-calculator-units`, `calorie-calculator-inputs`.

### Calculations (useMemo)

```ts
const weightKg = units === "metric" ? +kg : +lb / 2.20462;
const heightCm = units === "metric" ? +cm : ((+ft * 12) + +inch) * 2.54;
const bmr = sex === "male"
  ? 10*weightKg + 6.25*heightCm - 5*+age + 5
  : 10*weightKg + 6.25*heightCm - 5*+age - 161;
const tdee = bmr * ACTIVITY[activity];

const calorieMin = sex === "female" ? 1200 : 1500;
const targets = {
  maintain: tdee,
  loseMild: Math.max(tdee - 250, calorieMin),
  loseModerate: Math.max(tdee - 500, calorieMin),
  loseAggressive: Math.max(tdee - 1000, calorieMin),
  gainMild: tdee + 250,
  gainModerate: tdee + 500,
};

const bmi = weightKg / (heightCm / 100) ** 2;
```

Macros computed from each displayed target (protein 1g/lb body weight → grams; fat = cal × 0.30 / 9; carbs = remainder / 4).

Weeks-to-goal: `(deficitPerDay × 7) / 7716` kg/week → user enters no target weight, so show "≈ X kg/month" projection per option.

### Visuals (dark Skycally)

- **Form panel** (left, `lg:col-span-2`): age input, sex segmented toggle, units segmented toggle, height/weight inputs (auto-swap UI based on units), activity 5-card grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2`), goal 3-card row.
- **Results panel** (right or below):
  - Hero calorie card with cyan glow: big number, "kcal/day" subtitle, three sub-rows for selected goal variants (when lose/gain, show all sub-options as comparable mini-cards).
  - Macros: 3-column grid (protein/carbs/fat) with animated horizontal progress bars filling to their % share.
  - BMI card: value + colored badge + horizontal gradient scale with marker positioned by BMI.
  - Projection line: "At a 500 kcal deficit you'll lose ≈ 0.45 kg / week".
- Animation: results wrap in `motion.div` with `initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}`.
- Show results only when age/height/weight are valid numbers and BMR > 800; otherwise show inline warning.

### Validation

- Age 1–100 (warn <15 or >80, inline text)
- Weight 20–300 kg / 44–660 lb
- Height 50–250 cm
- Invalid → grey out results card with message
- BMR < 800 → "Values seem unusual, please check your inputs."

### Dependencies

None new. Uses shadcn `Input`, `Button`, framer-motion, lucide (`Flame`, `Beef`, `Wheat`, `Droplet`, plus emoji), `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`, `AdZone`, `buildToolMeta`, `toolBySlug`.

### Reminders after build

1. Tool registered in `src/lib/tools.ts` with icon `Flame`, category `utility`.
2. Add `/tools/calorie-calculator` to sitemap and request indexing in Google Search Console.
