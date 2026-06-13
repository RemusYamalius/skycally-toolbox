# Plan

Two independent, surgical updates. No design changes, no router changes, no new tools list edits.

---

## Part 1 — Country Info: switch to Cloudflare Worker proxy

**File:** `src/routes/tools.country-info.tsx`

Replace every direct `https://restcountries.com/...` fetch with the new Worker:

- `COUNTRIES_URL` (all countries for the dropdown):
  `https://country-proxy.skycally-tools.workers.dev/?type=all`
- `loadByName(name)`:
  `https://country-proxy.skycally-tools.workers.dev/?type=name&query={encodeURIComponent(name)}`
- `loadByCode(cca3)` — the Worker spec only documents `type=all` and `type=name`. To keep the "click a border / pick from list" flow working without restcountries.com, resolve the click by looking up the country name in the already-loaded `allCountries` list (we have `cca3 → name`) and call `loadByName(name)` instead of hitting `/alpha`.
- `loadBorders(codes)` — same pattern: map each border `cca3` to its `{ name, flag }` from `allCountries` locally. No network call. Border chips still show flag + name and still trigger `loadByCode` on click.

UI, layout, styles, copy, SEO content, FAQs: unchanged.

---

## Part 2 — Currency Converter: disclaimer, 7-day chart, SEO refresh

**File:** `src/routes/tools.currency-converter.tsx` only. Existing converter, swap, quick-conversions grid: untouched.

### 2a. Disclaimer line in the result card

Inside the result card, directly after the "Last updated" line, add:

```
Rates updated daily. For real-time trading rates, consult your bank or broker directly.
```

Rendered in `text-xs text-muted-foreground mt-1`.

### 2b. 7-Day Rate History chart

New section placed **after** the Quick Conversions grid and **before** `HowToUse`.

- Title: `7-Day Rate History` (same `font-display text-lg font-bold mb-3` styling as Quick Conversions).
- Data source: `https://api.frankfurter.app/{start}..{end}?from={FROM}&to={TO}` where `start = today − 7 days`, `end = today` (ISO `YYYY-MM-DD`, UTC).
- Fetch effect keyed on `[from, to]`. On success, store `{ date, rate }[]` sorted ascending. On any error or empty payload, set state to `null` so the whole section unmounts (no error UI).
- Render with **Recharts** (already in the project — verify; if missing, plan flips to a tiny inline SVG line chart to avoid adding deps). Components: `ResponsiveContainer` (height 220, width 100% — responsive on mobile), `LineChart`, `CartesianGrid` (subtle), `XAxis` formatted as `Mon, Tue, …` via `toLocaleDateString('en-US', { weekday:'short' })`, `YAxis` with auto domain and 4-decimal tick formatter, `Tooltip` showing exact rate (6 sig figs) + full date (`Mon, Jun 9`), and a single `<Line>` with `stroke="#00D4FF"`, `strokeWidth={2}`, `dot={false}`, `activeDot`.
- Card wrapper: `rounded-2xl border border-border bg-card/40 p-4 sm:p-6`. Tooltip uses inline styles matching dark theme (`background: var(--card)`, `border: 1px solid var(--border)`, `color: var(--foreground)`).
- Caption below chart: `Powered by Frankfurter API` — `text-[10px] uppercase tracking-wide text-muted-foreground mt-2 text-center`.
- Section visibility: only render when `history` state has ≥2 points. No loading spinner, no error toast.

### 2c. SEO content rewrite

Replace the `<ToolSeoContent>` props with the exact copy from the brief:

- `title`: `Currency Converter — Free Live Exchange Rate Tool`
- `description`: keep existing one-liner (covers the section subtitle) — the brief gives 3 body paragraphs, not a new description; keep current description text.
- `body`: the 3 paragraphs from the brief, verbatim.
- `faqs`: the 5 Q/A pairs from the brief, verbatim.

`src/lib/tools.ts` `currency-converter` entry: left unchanged (meta description already aligns; brief doesn't request a meta change).

---

## Out of scope

- No changes to `src/lib/tools.ts`, router, or related-tools list.
- No new dependencies unless Recharts is already absent — in which case I will confirm with you before adding it (fallback: minimal inline SVG line chart).
