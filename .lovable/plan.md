# Intermittent Fasting Calculator

New client-side tool at `/tools/intermittent-fasting-calculator` — a quiz-based fasting protocol recommender with live countdown timer, following Skycally conventions.

## Files

**New:** `src/routes/tools.intermittent-fasting-calculator.tsx`

**Edited:**
- `src/lib/tools.ts` — register tool (Utility category, matching neighbor color)
- `src/lib/related-tools.ts` — add mapping
- `public/sitemap.xml` — add URL

## Structure (top-to-bottom)

1. `ToolPageShell` wrapper (title + description, `showFileDisclaimer={false}`)
2. **4-question quiz** (cards, keyboard-navigable radios):
   - Goal: weight loss / metabolic health / longevity / muscle retention
   - Lifestyle: early riser / night owl / shift worker / flexible
   - Experience: beginner / intermediate / advanced
   - Exercise timing: morning / midday / evening / none
3. **Recommendation card** — picks one of 6 protocols with rationale:
   - 12:12, 14:10, 16:8, 18:6, 20:4 (Warrior), OMAD (23:1)
4. **Protocol selector** — user can override recommendation (6 chips)
5. **Schedule builder** — user picks wake-up time; renders eating window + fasting window timeline (horizontal scroll on mobile)
6. **Live countdown timer** — `useEffect` + `setInterval(1000)`, cleared on unmount; shows time remaining in current fast/eat phase with progress ring
7. **Sound toggle** — Web Audio API beep on phase transition; default OFF, persisted in `localStorage` key `if-calc-sound`
8. `AdZone id="intermittent-fasting-calculator-mid" size="728x90"`
9. `HowToUse` (3 steps from spec)
10. `ToolSeoContent` — SEO title, description, 3-paragraph body (~150-200 words), 4 FAQs
11. **Internal Links section** (exact JSX from spec — links to Calorie, Sleep, Water Intake)
12. `RelatedTools currentSlug="intermittent-fasting-calculator"`

## Technical rules

- No `createServerFn`, no AI calls — fully client-side
- Plain `function` declarations only inside the component; no `async` arrow functions, no `useCallback(async...)`
- Recommendation logic = pure sync function scoring quiz answers against protocol profiles
- Countdown: compute next boundary from wake time + protocol; recompute on tick
- Sound: single `AudioContext` created lazily on first user interaction; oscillator beep on phase change (only when enabled)
- LocalStorage: quiz answers, chosen protocol, wake time, sound pref
- Accessibility: `aria-label` on all controls, radio groups with proper labelling, focus-visible rings, WCAG AA contrast via design tokens
- Mobile-first: quiz cards stack, timeline is `overflow-x-auto` on small screens
- Design system: use `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `var(--cyan-brand)` / `var(--green-brand)` — no hardcoded colors

## Registration

- `tools.ts`: category `utility`, matching color of neighbors (calorie/water/heart-rate use the same purple token — verify and match)
- `related-tools.ts`: `"intermittent-fasting-calculator": ["calorie-calculator", "sleep-calculator", "water-intake-calculator", "bmi-calculator", "heart-rate-zone-calculator"]`
- Sitemap entry added

## Out of scope

No backend, no persistence beyond localStorage, no notifications API, no meal planning.
