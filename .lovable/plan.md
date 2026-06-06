# Weather Checker tool

## New files
- `src/routes/tools.weather-checker.tsx` — new route, mirrors `tools.network-speed-test.tsx` structure: `createFileRoute` with `head()` (title, description, canonical, og tags), `ToolPageShell` (title "Weather Checker", subtitle), `HowToUse` (3 steps), `ToolSeoContent` (H2, ~150-200 word body, 4 FAQs from spec), and `RelatedTools` showing IP Address Lookup, Network Speed Test, World Radio.

## Tool registration
- `src/lib/tools.ts` — add `CloudSun` to lucide import, append entry:
  - slug: `weather-checker`, name: `Weather Checker`, description: `Check live weather and 7-day forecast for any city.`, category: `utility`, icon: `CloudSun`, path: `/tools/weather-checker`.

## Implementation details

**State:** `city` (input), `loading`, `error`, `data` (current + 7-day forecast + resolved name/country).

**On mount:** try `navigator.geolocation.getCurrentPosition` (with timeout). If granted, reverse-search via Open-Meteo geocoding using lat/lon → city name; if denied/failed, default to `London`. Either way auto-fetch once.

**Search flow:**
1. `GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json` — if `results` empty → error "City not found. Please try another name."
2. `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`
3. On network failure → "Could not fetch weather, please try again."

**WMO mapping helper:** pure function `wmoInfo(code)` → `{ label, emoji }` per the spec table; fallback `{ "Unknown", "🌡️" }`.

**UI (inside ToolPageShell, English-only, semantic tokens):**
- Search row: `Input` (placeholder "Enter a city…", Enter submits) + `Button` "Check Weather" (shows spinner when loading).
- Error message under input when present.
- Current weather `Card`:
  - Header: `{name}, {country}` + large emoji.
  - Large temperature `{Math.round(temp)}°C` + condition label.
  - Grid of 4 stat tiles: Feels like, Humidity, Wind (km/h), Precip chance — each with a Lucide icon (`Thermometer`, `Droplets`, `Wind`, `CloudRain`).
- 7-day forecast: horizontal `overflow-x-auto` row of 7 small cards: weekday short name (from `daily.time[i]` in tz), emoji, `max° / min°`, rain `%`.

**SEO content:** ToolSeoContent body and FAQs taken verbatim from the spec.

**No backend, no new dependencies, no env vars.** All requests are direct browser fetches to Open-Meteo (CORS-enabled, no key).

## Out of scope
No edits to other routes or shared components. `routeTree.gen.ts` regenerates automatically.
