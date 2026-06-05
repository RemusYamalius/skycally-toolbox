## Goal
Make sure every station in the list also appears on the map, by falling back to the country's capital coordinates when the Radio Browser API doesn't return GPS data, and by fetching more stations.

## Changes (single file: `src/routes/tools.world-radio.tsx`)

### 1. Capital-coordinates lookup
Add a module-level constant mapping ISO 3166-1 alpha-2 country codes → `[lat, lng]` for ~60 most common countries in the Radio Browser catalog (US, GB, DE, FR, ES, IT, NL, BE, PT, IE, PL, CZ, AT, CH, SE, NO, DK, FI, GR, RO, HU, RU, UA, TR, BR, AR, MX, CL, CO, PE, VE, CA, AU, NZ, JP, KR, CN, IN, ID, TH, VN, PH, MY, SG, PK, BD, SA, AE, IL, EG, MA, DZ, TN, ZA, NG, KE, GH, ET, etc.) — using each country's capital lat/lng.

```ts
const CAPITALS: Record<string, [number, number]> = {
  US: [38.9072, -77.0369], GB: [51.5074, -0.1278], DE: [52.52, 13.405], ...
};
```

### 2. Helper `getStationCoords(s)`
Returns `[lat, lng] | null`:
- If `geo_lat` and `geo_long` are valid non-zero numbers → use them.
- Else if `s.countrycode` is in `CAPITALS` → return capital coords (with tiny deterministic jitter based on `stationuuid` hash, ±0.4°, so multiple stations in the same country don't stack on one pixel).
- Else → `null` (omitted from map, still shown in list).

### 3. Marker effect
Replace the current `stations.filter(s => geo_lat && geo_long)` block with a loop using `getStationCoords(s)`; only stations returning `null` are skipped on the map. List rendering stays unchanged so all stations remain visible in the left panel.

### 4. Pulse effect
Update the "current station" pulse to also use `getStationCoords(current)` instead of reading `geo_lat`/`geo_long` directly, so the pulse + `flyTo` work for fallback-positioned stations too.

### 5. Fetch limits
- Initial load (no country selected): change `/stations/topvote/200` → `/stations/topvote/300`.
- New effect: when `country` changes to a non-empty value, fetch `/stations/bycountrycodeexact/{country}?limit=500&hidebroken=true&order=votes&reverse=true` and merge results into `stations` (dedupe by `stationuuid`). When cleared, no extra fetch — existing top list remains.

## Out of scope
- No styling, layout, player, favourites, SEO, or copy changes.
- No new dependencies.
