## Time Zone Converter — Build Plan

Create a new client-side tool at `/tools/time-zone-converter` with a live world clock, city-to-city converter, and meeting planner. All time math uses the built-in `Intl` API — no libraries added.

### Files to create

1. **`src/lib/time-zone/cities.ts`** — the ~90-city database (name, IANA timezone, country, countryCode, emoji, continent, popular flag) as typed in the spec.
2. **`src/lib/time-zone/utils.ts`** — pure helpers:
   - `getUTCOffset(tz)` → `"UTC±HH:MM"`
   - `getTzAbbr(tz)` → e.g. `"EDT"`, `"BST"` (from `Intl.DateTimeFormat` with `timeZoneName: "short"`)
   - `getPartsInTz(date, tz)` → hour/minute/second/day/date/weekday
   - `getDayOfDiff(fromTz, toTz, date)` → `-1 | 0 | +1` for "yesterday/tomorrow" badges
   - `getTimeOfDay(hour)` → `dawn|morning|afternoon|evening|night` with emoji + tint token
   - `getTimeQuality(hour)` → `ideal|acceptable|poor|bad`
   - `convertSpecificTime(hh, mm, fromTz, toTz, date)` → parts in the destination TZ
3. **`src/components/time-zone/city-select.tsx`** — searchable combobox (Popover + Command from shadcn) showing flag + city + country + live time; recents from localStorage (`tz-recent-cities`, last 5); popular cities first.
4. **`src/components/time-zone/live-clock.tsx`** — 1 Hz `setInterval` display (HH:MM:SS + 12h variant + weekday/date + UTC offset + abbr), with `aria-live="polite"` on the seconds region and a blinking colon.
5. **`src/components/time-zone/world-clock.tsx`** — grid of city cards (2 cols mobile / 4 desktop), add/remove (edit mode), max 12, persisted under `tz-world-clock-cities`, day/night tint using `color-mix` in inline style.
6. **`src/components/time-zone/meeting-planner.tsx`** — up to 5 cities, 24-row × N-col table (rows = each hour of the anchor city's day), color-coded per `getTimeQuality`, computes and highlights the best overlap window; horizontal scroll on mobile; persisted under `tz-meeting-cities`.
7. **`src/components/time-zone/converter-panel.tsx`** — the two-city converter with swap button (300ms 180° rotation), difference badge ("London is 5 hours ahead of New York"), and the specific-time input (HH:MM + AM/PM toggle + optional date, defaults to today) with "+1 day/-1 day" note when the calendar day changes.
8. **`src/routes/tools.time-zone-converter.tsx`** — the route: `ToolPageShell` → `ConverterPanel` → `WorldClock` → `MeetingPlanner` → `AdZone id="time-zone-converter-mid" size="728x90"` → internal-links block (Holiday Checker, Country Info, Currency Converter, Age Calculator, Weather Checker, Sleep Calculator) → `ToolSeoContent` (4 body paragraphs + 8 FAQs from spec) → `HowToUse` → `RelatedTools`. `head()` via `buildToolMeta` + a `WebApplication` JSON-LD script.

### Files to modify

- **`src/lib/tools.ts`** — register `time-zone-converter` in the Utility category (icon: `Globe`).
- **`src/lib/related-tools.ts`** — add entry: `["currency-converter","country-info","holiday-checker","weather-checker","age-calculator","unit-converter"]`.
- **`public/sitemap.xml`** — add the new URL.
- **`public/llms.txt`** — add a one-line entry.

### Technical notes

- All components client-only; no `createServerFn`. Single shared 1 Hz tick via a small `useNow()` hook (one interval, all clocks re-render from the same `Date`) to keep the page cheap.
- Cross-midnight detection compares the `en-CA` date string (YYYY-MM-DD) in both zones.
- Meeting-planner "best overlap" = the contiguous run of rows where every column is `ideal` or `acceptable`, longest run wins; if none, fall back to longest run with fewest `bad` cells.
- Design tokens only — day tint `color-mix(in oklab, #f59e0b 8%, var(--card))`, night tint `color-mix(in oklab, #3b82f6 8%, var(--card))`, ideal/bad cells with the green/red `color-mix` values from the spec. No hardcoded `text-white`/`bg-*` hex utilities.
- `Globe` icon animation: slow CSS rotation on the header icon only (not the button, per accessibility).
- Strict TS, no `any`. English-only strings.
