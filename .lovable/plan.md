## Holiday Checker tool

### New files
- `src/routes/tools.holiday-checker.tsx` — new route mirroring `tools.weather-checker.tsx` structure: `createFileRoute` + `head()` (title, description, canonical, og tags), `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`.

### Tool registration
- `src/lib/tools.ts` — add `Calendar` to lucide import (if not present), append entry:
  - slug: `holiday-checker`, name: `Holiday Checker`, description: `Find public holidays for any country instantly.`, category: `utility`, icon: `Calendar`, path: `/tools/holiday-checker`, tags: `holidays, calendar, country, public holiday`.

### Implementation details

**State:** `countries` (list from API), `countryCode` (selected, default user locale or `US`), `year` (2025 | 2026, default current year clamped), `loading`, `error`, `holidays` (fetched list), `query` (country search filter).

**On mount:** fetch `https://date.nager.at/api/v3/AvailableCountries` once → store sorted alphabetically by name. Auto-fetch holidays for default country + current year.

**Search flow:**
1. `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}` → array of `{ date, localName, name, countryCode, types: string[], global, ... }`.
2. On network failure → "Could not fetch holidays, please try again."

**Helpers:**
- `flagEmoji(code)` — convert ISO-2 country code to regional indicator emoji (pure function).
- `formatLongDate(iso)` → `"Monday, 9 June 2026"` via `toLocaleDateString("en-GB", { weekday, day, month, year })`.
- `daysFromToday(iso)` → integer; label as "Today!" if 0, "in N days" if positive, past otherwise.
- `nextHoliday(list)` → first holiday with date ≥ today.

**UI (inside ToolPageShell):**
- Controls row (flex/grid): country combobox (Input filter + scrollable list rendering `{flag} {name}`), Year select (`Select` with 2025/2026), `Button` "Check Holidays" with spinner.
- Error message below controls when present.
- Results section (when holidays loaded):
  - Summary bar `Card`: country flag + name • total count • year.
  - Next Holiday banner: accent-tinted `Card` (`--cyan-brand` mix bg) — name, formatted date, "in X days" / "Today!".
  - Holidays list: rows with Date / Weekday / Name / Type badge (Public/Optional from `types[0]`). Next upcoming row gets accent bg; past holidays `opacity-50`.
  - Footer: `"X holidays in {Country} — {Year}"`.

**SEO content:** `ToolSeoContent` with H2 "Public Holiday Checker — National Holidays for Every Country", 3 paragraphs from spec, 4 FAQs verbatim.

**HowToUse steps:** "Pick a country from the dropdown.", "Choose a year (2025 or 2026).", "Click Check Holidays to see the full list and the next upcoming holiday."

**RelatedTools:** uses `currentSlug="holiday-checker"` — the existing `getRelatedTools` picks from same category. (Spec asks for Weather Checker, Age Calculator, World Radio — these are all utility tools so the default related component will work; no changes to related-tools logic.)

**No backend, no new dependencies, no env vars.** All direct browser fetches to Nager.Date (CORS-enabled, no key).

### Out of scope
No edits to other routes or shared components. `routeTree.gen.ts` regenerates automatically.
