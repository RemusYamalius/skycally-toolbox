## Satoshi Converter — Implementation Plan

Create a new utility tool at `/tools/satoshi-converter` for converting between Bitcoin units (Satoshi, BTC, mBTC, Bits) and fiat currencies (USD, EUR, MAD) with live CoinGecko pricing.

### 1. Register the tool — `src/lib/tools.ts`
- Add `Bitcoin` to the `lucide-react` import.
- Append entry after the existing utility tools:
  ```ts
  { slug: "satoshi-converter", name: "Satoshi Converter", description: "Convert between Bitcoin, Satoshi, mBTC, bits, USD, EUR and MAD instantly. Live BTC price updated every 60 seconds.", category: "utility", icon: Bitcoin, path: "/tools/satoshi-converter" }
  ```

### 2. Related tools — `src/lib/related-tools.ts`
- Add `satoshi-converter` mapping to: `currency-converter`, `compound-interest`, `loan-calculator`, `tip-calculator`, `qr-generator`.

### 3. New route — `src/routes/tools.satoshi-converter.tsx`

Single file using `createFileRoute("/tools/satoshi-converter")`, wrapped in `ToolPageShell`, ending with `HowToUse` → `ToolSeoContent` → `RelatedTools`.

**State**
- `prices: { usd, eur, mad, change24h } | null`
- `sparklineData: { t, p }[]`
- `lastUpdated: number`, `secondsAgo` (1s tick), `loading`, `error`
- `satoshi: string` as single source of truth; all 7 fields derived via `useMemo`.

**Live price**
- `fetchPrice()` calls `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,mad&include_24hr_change=true`.
- `useEffect` on mount + `setInterval` every 60s; separate 1s interval for "X seconds ago" countdown.
- Loading skeleton (using `Skeleton`), error state with Retry button.

**Sparkline**
- `fetchSparkline()` calls `/coins/bitcoin/market_chart?vs_currency=usd&days=7`.
- Recharts `AreaChart`, 120px tall, no axes, orange `#f7931a` gradient fill, single tooltip.

**Converter (7 fields)**
- Each field controlled; `onChange` parses to BTC then sets `satoshi`.
- Field config array: `{ key, label, badge, decimals, color, value, fromInput }`.
- Color groups: orange (`#f7931a`) for Satoshi/BTC, yellow (`#eab308`) for mBTC/bits, green (`var(--green-brand)`) for USD/EUR/MAD.
- Copy button per field — `navigator.clipboard.writeText`, ✓ icon for 1.5s.
- Fiat fields disabled with hint when `prices` unavailable.

**Quick amounts**
- Row of buttons: 1 sat, 100 sat, 1k sat, 1 bit (100 sat), 1 mBTC (100k sat), 0.001 BTC, 0.01 BTC, 0.1 BTC, 1 BTC. Each sets `satoshi`.

**Reset button** clears `satoshi` to `""`.

**Reference card** — static grid of 6 conversion facts.

**Disclaimer** — small muted text under chart.

### 4. SEO block
- `HowToUse` with 3 provided steps.
- `ToolSeoContent` with the exact title/description, 4 body paragraphs (~150–200 words total) and 8 FAQs as specified.
- `<RelatedTools currentSlug="satoshi-converter" />`.

### Technical notes
- No new dependencies — `recharts`, `lucide-react`, shadcn `Input`/`Button`/`Skeleton` already present.
- All math in browser; only outbound calls are the two CoinGecko endpoints (public, no key).
- `routeTree.gen.ts` regenerates automatically via the Vite plugin.
- English-only copy, dark theme tokens, mobile responsive grid (1 col on mobile, 2 col ≥sm for fields).
