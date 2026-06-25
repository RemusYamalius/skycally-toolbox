## Unit Converter — Implementation Plan

Build a premium, SEO-optimized Unit Converter at `/tools/unit-converter` covering 10 categories and 100+ units, with deep linking, recent history, and instant bidirectional conversion.

### Files to change

1. **`src/lib/tools.ts`** — register entry:
   - `{ slug: "unit-converter", name: "Unit Converter", description: "Convert length, weight, temperature, area, volume, speed, time, data, pressure and energy units instantly.", category: "utility", icon: Ruler, path: "/tools/unit-converter" }`
2. **`src/lib/related-tools.ts`** — map `unit-converter` → `["currency-converter", "satoshi-converter", "color-picker", "qr-generator", "json-formatter"]` (subject to what exists)
3. **`src/routes/tools.unit-converter.tsx`** — new route (single file)
4. `src/routeTree.gen.ts` regenerates automatically.

### Route file structure

```tsx
createFileRoute("/tools/unit-converter")({
  head: buildToolMeta(toolBySlug("unit-converter")!),
  component: UnitConverterPage,
})
```

Inside `<ToolPageShell title description>`:
1. Converter card (category tabs → FROM/TO panel → quick chips → recent → formula)
2. `<AdZone id="unit-converter-mid" size="728x90" />`
3. `<HowToUse steps={...} />`
4. `<ToolSeoContent ... 8 FAQs />` (exact copy from spec)
5. `<RelatedTools currentSlug="unit-converter" />`

### Data model

```ts
type CategoryId = "length" | "weight" | "temperature" | "area" | "volume"
  | "speed" | "time" | "data" | "pressure" | "energy";

interface Unit { id: string; label: string; symbol?: string; toBase?: number; }
interface Category { id: CategoryId; label: string; icon: string; units: Unit[]; base?: string; quick: [string,string,number][]; formula?: string; }
```

All categories use `value * toBase[from] / toBase[to]` except **temperature**, which routes through a dedicated `convertTemperature(value, from, to)` using formulas via Celsius pivot (C↔F, C↔K, C↔R derived).

Static `CATEGORIES: Category[]` constant with all units listed in spec, plus 6–8 `quick` pairs per category (e.g. Length: `1 km → mi`, `1 mi → km`, `1 inch → cm`, `1 ft → cm`, `1 m → ft`, `1 yard → m`).

### State (useState)

- `categoryId: CategoryId`
- `fromUnit: string`, `toUnit: string`
- `fromValue: string`, `toValue: string` (strings to allow `""`, `-`, etc.)
- `lastEdited: "from" | "to"` — drives which side recomputes
- `copied: boolean`
- `recent: RecentEntry[]` (from localStorage `unit-converter-history`)
- `formulaOpen: boolean`

Effect: whenever `categoryId`/`fromUnit`/`toUnit`/edited value changes, recompute the opposite side. URL sync via `window.history.replaceState` with `?cat=&from=&to=&val=`.

On initial mount, parse `window.location.search` to restore state (fallback defaults: length / meter / kilometer / 1).

### Formatting

`formatResult(n)`:
- If `!isFinite(n)` → "—"
- If `abs(n) !== 0 && (abs(n) >= 1e10 || abs(n) < 1e-6)` → `n.toExponential(6)` trimmed
- Else `Number(n.toPrecision(8)).toString()` (strips trailing zeros naturally)

### Visuals (dark premium, matches Skycally)

- Outer card: `bg-card border border-border rounded-2xl p-6`
- **Category tabs**: `flex gap-2 overflow-x-auto sm:flex-wrap` — each pill `px-3 py-2 rounded-full border text-sm`; selected `bg-[color:var(--cyan-brand)]/15 border-[color:var(--cyan-brand)] text-foreground shadow-[0_0_20px_rgba(0,212,255,0.25)]`
- **FROM/TO panels**: two grid cells (`grid sm:grid-cols-2 gap-4`) with shadcn `Select` (unit) and large `Input` (`text-3xl font-mono h-14`, `inputMode="decimal"`)
- **Swap button** between panels: `rounded-full border w-12 h-12`, framer-motion `rotate: 180` on click toggle
- **Result side**: cyan-tinted text + Copy button (`Check` icon for 1.5s after copy)
- **Quick chips**: grid `grid-cols-2 sm:grid-cols-4 gap-2`; click fills FROM unit/value and TO unit
- **Formula**: shadcn `Collapsible` "Show formula" — shows multiplier or temperature formula string
- **Recent**: horizontal list, click to restore

### Controls

- Both FROM and TO `Input` fields editable; typing in either updates the other
- Swap button: exchanges units AND values, sets `lastEdited` accordingly
- Tab order: from-unit → from-value → swap → to-unit → to-value → Copy
- Copy button writes `"<val> <fromSymbol> = <result> <toSymbol>"`

### URL deep linking

```
/tools/unit-converter?cat=length&from=kilometer&to=mile&val=5
```

`useEffect` syncs current state into URL via `replaceState` (no history pollution). Initial mount restores from `URLSearchParams`. Invalid params → fall back to defaults silently.

### localStorage

- `unit-converter-history` → JSON array of last 5 `{cat, from, to, val, result}` entries. Push on each value change with 600ms debounce; dedupe consecutive identical entries.

### Mobile considerations

- Min 48px tap targets; numeric keyboard via `inputMode="decimal"`
- Category tabs horizontal scroll with `-mx-4 px-4` bleed
- Quick chips wrap to 2 columns; FROM/TO panels stack vertically

### SEO content

Use exact `title`, `description`, `body` (4 paragraphs), and 8 FAQs from spec.

### Dependencies

None new. Uses existing shadcn `Select`, `Input`, `Button`, `Collapsible`, framer-motion, lucide-react (`Ruler`, `ArrowDownUp`, `Copy`, `Check`, `ChevronDown`), `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`, `AdZone`, `buildToolMeta`, `toolBySlug`.

### Verification

After build: visit `/tools/unit-converter`, type in FROM, confirm TO updates; swap; switch category; click quick chip; verify URL params update; reload — state restored; verify copy; check mobile viewport.
