# Plan

Two independent fixes. No design changes.

---

## Part 1 — Currency Converter: always-visible 7-Day Rate History

**File:** `src/routes/tools.currency-converter.tsx`

The chart is already wired to `[from, to]` but only renders when `history.length >= 2`. On mount with `USD → EUR` it should fetch immediately and show a skeleton while loading, never disappearing on user interaction.

Changes:
1. **State model**: replace `history: Points[] | null` with `history: Points[] | null` + `historyLoading: boolean`. Initial state: `history = null`, `historyLoading = true` (so skeleton shows on first paint).
2. **Fetch trigger**: keep the existing `useEffect` keyed on `[from, to]` (currency changes already trigger it). Add a **debounced effect on `amount`** (500ms) that re-runs the same fetch — even though Frankfurter doesn't depend on amount, the brief requires re-fetching on amount change. Implementation: a single shared `fetchHistory(from, to)` function called by both effects; the amount effect uses `setTimeout` + cleanup for the 500ms debounce.
3. **On mount**: the `[from, to]` effect already fires on mount with defaults `USD → EUR`, satisfying "fetch immediately on mount."
4. **Loading skeleton**: while `historyLoading` is true and `history` is null, render the section with a `<Skeleton className="h-[220px] w-full rounded-xl" />` (already-imported `src/components/ui/skeleton.tsx`) in place of the chart. Title "7-Day Rate History" + Frankfurter caption still visible.
5. **Always visible after first successful load**: section only unmounts if the very first fetch fails AND we have no data. To match the brief ("hide silently if API fails"): if fetch fails and `history` is still null, unmount the section. If a previous fetch succeeded, keep showing the last chart (don't flash to empty on a transient error).
6. **Same-currency case** (`from === to`): keep current behavior — set history to null, no skeleton, section hidden (a flat line at 1.0 is not useful).
7. **Placement**: section already sits between Quick Conversions and `HowToUse`/SEO — unchanged.
8. **Convert button**: stays as-is (manual re-fetch of rates); chart no longer depends on it.

No new dependencies. Recharts and Skeleton already imported elsewhere in the project.

---

## Part 2 — Country Info: bundled local dataset, zero external API

**Goal:** remove every network call (REST Countries + the `country-proxy.skycally-tools.workers.dev` Worker) so the page renders instantly from a static JSON file.

### 2a. Generate `src/data/countries.json`

Source: **mledoze/countries** (public-domain, MIT, ~250 entries) — the same dataset REST Countries is built on. I'll download `countries.json` from the upstream repo via a one-off `code--exec` step during build mode and post-process it into the exact shape the tool needs, so we don't ship unused fields. Output schema per entry:

```ts
{
  cca2: string;          // "MA"
  cca3: string;          // "MAR" (kept for border-code lookups)
  name: { common: string; official: string };
  flagEmoji: string;     // "🇲🇦"
  flagSvg: string;       // "https://flagcdn.com/w320/ma.png" (lowercase cca2)
  capital: string[];
  region: string;
  subregion: string;
  population: number;
  area: number;          // km²
  currencies: Record<string, { name: string; symbol?: string }>;
  languages: Record<string, string>;
  tld: string[];
  callingCode: string;   // pre-joined "+212"
  drivingSide: "left" | "right" | "";
  timezones: string[];
  borders: string[];     // array of cca3 codes (mledoze native format)
}
```

All 250 entries. File committed to the repo, ~300–400 KB JSON.

### 2b. Rewrite `src/routes/tools.country-info.tsx`

- Remove `PROXY_BASE`, `COUNTRIES_URL`, `loadByName`, the mount fetch, the `loading` spinner, and the `error` state's API-related branches.
- Import the JSON statically: `import COUNTRIES from "@/data/countries.json";`
- Build `allCountries` once with `useMemo` from `COUNTRIES`, sorted by `name.common`.
- Default selection: still "Morocco" on first render — instant, no async.
- Search (`onSubmit`) and dropdown click: pure local filter/lookup, set `country` state synchronously. No spinner.
- Borders: lookup by `cca3` against the in-memory map (this already works in the current code; I'll keep that logic, just sourced from local data).
- Flag rendering: use `flagSvg` for the big flag and border chips. Emoji available as a fallback.
- Error state: only shown if user searches a string that matches no country (purely local "not found"). Wording: "Country not found. Please try another name."
- Remove the `Loader2` spinner from the Search button — the lookup is synchronous.
- UI, layout, SEO copy, FAQs, `RelatedTools`, `HowToUse`: unchanged.

### 2c. Cleanup

- Confirm no other file references `country-proxy.skycally-tools.workers.dev` or `restcountries.com` (quick `rg`). Remove any stragglers.
- `src/lib/tools.ts` entry for `country-info`: unchanged.

---

## Out of scope

- No router changes, no `tools.ts` changes, no related-tools list changes.
- No new npm dependencies.
- Currency Converter UI (inputs, swap, Convert button, Quick Conversions, SEO): untouched aside from the chart-section swap described above.
