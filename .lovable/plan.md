# Pregnancy Week Calculator

Build a fully client-side pregnancy calculator at `/tools/pregnancy-calculator` under Health & Fitness, matching the detailed spec.

## Files

**New**
- `src/routes/tools.pregnancy-calculator.tsx` — full page: `ToolPageShell`, 3-method input toggle (LMP / Due Date / Conception), hero card with weeks+days+due date+progress, baby size card, weekly development card, milestone banner, trimester timeline, key dates card, medical disclaimer, internal-links block, `AdZone`, `HowToUse`, `ToolSeoContent`, `RelatedTools`.
- `src/lib/pregnancy/data.ts` — `BABY_SIZES` (weeks 4–40) and `WEEKLY_DATA` (with milestone entries) exactly as specified.
- `src/lib/pregnancy/calc.ts` — pure functions using `date-fns`: `computeFromLMP`, `computeFromDueDate`, `computeFromConception`, cycle-length adjustment, trimester derivation, nearest-week lookup for baby size / weekly data, key-dates builder.

**Edited**
- `src/lib/tools.ts` — register `pregnancy-calculator` under Health & Fitness (`Baby` from lucide-react).
- `src/lib/related-tools.ts` — related list: Water Intake, Sleep, Calorie, BMI, Age.
- `public/sitemap.xml`, `public/llms.txt` — add new URL.

## Calculation logic

- LMP: `gestDays = differenceInDays(today, lmp) + (cycleLen - 28)` adjustment applied to due date (`addDays(lmp, 280 + (cycleLen - 28))`); weeks/days from gestDays.
- Due Date: derive LMP as `addDays(due, -280)`, then compute like LMP.
- Conception: `lmp = addDays(conception, -14)`, then LMP flow.
- Progress %: `clamp(gestDays / 280 * 100)`.
- Nearest week for `BABY_SIZES` / `WEEKLY_DATA`: floor to greatest defined key ≤ current week.

## Edge cases

- Future LMP / due / conception → inline validation error, no results.
- Week < 4 → early-pregnancy notice above hero.
- gestDays > 294 (>42w) → overdue notice suggesting medical contact.
- 280–294 days → "X days overdue" friendly message.
- Cycle length clamped 20–45, default 28.

## UI

- Two-column desktop (inputs 2fr / results 3fr), single column mobile.
- Method toggle: 3 pill buttons with icons.
- Hero card: rose→pink→violet gradient (`#f43f5e → #ec4899 → #a855f7`), fade+scale mount, animated progress bar fill.
- Baby size card: emoji with subtle bounce.
- Trimester timeline: horizontal 3-segment bar with current-position marker.
- Key dates: 7-row list mapping weeks to calendar dates via `addWeeks(lmp, N)` formatted `MMM d, yyyy`.
- Milestone banner: shown only when current week has a `milestone` field.
- Medical disclaimer: subtle bordered note under hero.
- Accessibility: labeled inputs, `aria-live="polite"` on results region, semantic headings.

## SEO

- `head()` with title, description, keywords, canonical, og:title/description/type=website, twitter card, WebApplication JSON-LD (spec verbatim).
- `ToolSeoContent` with the 4 spec paragraphs + 8 FAQs (FAQPage JSON-LD auto-emitted by the component).

## Integration

- Category: Health & Fitness, icon `Baby`.
- AdZone `id="pregnancy-calculator-mid" size="728x90"` between results and HowToUse.
- English-only strings, no external APIs, no server functions, TypeScript strict, no async component handlers.

## Out of scope

- No account/save, no push notifications, no charts library (timeline is CSS), no i18n.
