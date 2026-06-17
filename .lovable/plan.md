# Plan — Element Mixer (/tools/element-mixer)

A self-contained chemistry sandbox tool. All data hardcoded, no new dependencies, dark theme via CSS variables, fully responsive.

## Files to create

1. `src/data/elements.ts` — full 118-element dataset (symbol, atomic number, mass, name, category, group/period for grid placement, real-world examples).
2. `src/data/compounds.ts` — hardcoded compound database (all formulas from the spec: H2O, CO2, O2, H2, N2, NaCl, CaCO3, MgO, KCl, SiO2, Fe2O3, Al2O3, HCl, H2SO4, NaOH, NH3, HNO3, CH4, C2H5OH, C6H12O6, C12H22O11, C3H8, C8H18, H2O2, NO2, SO2, N2O, Fe3O4, TiO2, NaHCO3, CaF2, PbS, AgCl, ZnO, MnO2, Na2CO3, KNO3, C, Si, Au, Ag). Each entry: canonical formula key, name, description, fun fact, animation type, discovery category.
3. `src/routes/tools.element-mixer.tsx` — the page route.
4. `src/lib/element-mixer/formula.ts` — small helpers: build canonical formula from `{symbol: count}` map (Hill order for organics: C, H, then alphabetical; otherwise alphabetical by symbol), lookup against compounds DB, generate "unknown compound" description heuristics.

## Files to edit

- `src/lib/tools.ts` — add tool entry. Note: project doesn't have a "Science" category; map to `utility` (with `categories: ["utility","games"]` so it appears alongside fun tools). Icon: `FlaskConical` from lucide-react (already-installed pkg). Slug/name/description as specified.
- `src/lib/related-tools.ts` — add `"element-mixer": ["age-calculator", "bmi-calculator", "wordle", "sudoku"]` (max 3 used by component — keep first 3; current map uses 3, will match convention).

## Route structure (mirrors other tools)

```tsx
createFileRoute("/tools/element-mixer")({
  head: () => ({ meta: buildToolMeta(toolBySlug("element-mixer")!) }),
  component: ElementMixerPage,
});
```

Page body inside `<ToolPageShell title="Element Mixer" description="...">`:
1. Discovery progress bar (`X / N compounds discovered`, per-category breakdown w/ emoji chips).
2. Filter buttons (All | Metals | Non-Metals | Noble Gases | Lanthanides | Actinides).
3. Periodic table grid — CSS grid 18 cols × 9 rows + 2 rows for lanthanides/actinides. Mobile: horizontal scroll wrapper (`overflow-x-auto`) with min-width. Each cell = button (keyboard accessible) showing symbol, atomic #, mass; category color tint via inline `--cat-color` var; hover tooltip via title or popover with examples.
4. Mixer panel — list of selected element cards (max 6), each with +/- 1–10 counter; large glowing "MIX ⚗️" button; "Clear" button.
5. Result panel — formula (subscripts via `<sub>`); if known → name, description, uses, fun fact, animation; if unknown → heuristic-generated description + "Unknown Territory" badge; "NEW DISCOVERY!" if first time; Share button (copy to clipboard).
6. `<HowToUse />` with the 4 steps from spec.
7. `<ToolSeoContent />` with title/description/body/FAQs from spec.
8. `<RelatedTools currentSlug="element-mixer" />`.

## State & persistence

- `useState`: `selected: Record<symbol, count>`, `result: { formula, known, data } | null`, `activeFilter`.
- `localStorage` key `skycally.element-mixer.discovered` → `string[]` of formula keys ever found. Used to compute progress + first-time-discovery flag.

## Unknown-compound heuristic (in `formula.ts`)

Given the set of element categories present, pick the first matching rule:
- contains noble gas → "Highly unstable — noble gases rarely bond…"
- contains heavy metal (Z > 80, non-noble) → "Extremely dense and toxic…"
- only C + H (and ratio sane) → "Could be an unknown hydrocarbon…"
- metals + oxygen only → "An exotic oxide not yet synthesized…"
- default → "Theoretical compound — its properties would depend on the bond geometry…"
Prefix with: "🪐 Not found in nature... or is it?"

## Animations (CSS only, scoped via a `<style>` block in the route)

Eight keyframe animations matching the spec names (calm, bubble, explosion, crystal, glow, flame, sparkle, danger). Result panel renders a `<div class={`em-anim em-anim-${type}`}/>` overlay behind the compound text. Pure CSS — no libs.

## Visual identity

- Card surfaces `bg-card`, borders `border-border`, text `text-foreground`, primary actions `bg-primary`.
- Element category colors stored as CSS custom properties in the scoped style block: noble-gas purple, alkali-metal red, alkaline-earth orange, transition-metal cyan, post-transition slate, metalloid teal, nonmetal yellow, halogen green, lanthanide pink, actinide magenta. Each cell sets `style={{ "--cat": catColor }}` and uses `background: color-mix(in oklab, var(--cat) 14%, var(--card))` + hover glow `box-shadow: 0 0 18px var(--cat)`.
- Subtle grid background on the table container via repeating linear-gradient.

## Accessibility & responsiveness

- Each element cell is a `<button>` with `aria-label="Hydrogen, atomic number 1"`. Tab order follows DOM; arrow-key navigation handled by a single `onKeyDown` on the table that moves focus between cells (group/period math).
- Periodic table wrapper: `overflow-x-auto` with `min-width: 920px` on the grid so mobile gets horizontal scroll exactly as spec.
- Mixer + Result stack vertically under the table on `<lg` screens; side-by-side on `lg+`.

## Out of scope

- No real bond-geometry chemistry (mixing is name-lookup only).
- No new npm packages.
- No changes to other tools or shared components beyond the two registry files.
