import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Bitcoin, Check, Copy, RefreshCw, RotateCcw, TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

// SEO NOTE: Search Console shows demand for "satoshi calculator" (31
// impressions, position ~25) alongside "satoshi converter" — the JSON-LD
// alternateName below adds "Calculator" as a recognized alternate name.
export const Route = createFileRoute("/tools/satoshi-converter")({
  head: () => {
    const tool = toolBySlug("satoshi-converter", tools);
    const title = "Satoshi Converter & Calculator — Bitcoin Unit Converter, Live Price | Skycally";
    const description =
      "Free Satoshi converter and calculator. Convert between Bitcoin, Satoshi, mBTC, bits, USD, EUR and MAD instantly — live BTC price, no signup.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Satoshi Converter",
            alternateName: ["Satoshi Calculator", "Bitcoin Unit Converter"],
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: tool.featureList ?? [],
          }),
        },
      ],
    };
  },
  component: SatoshiConverterPage,
});

const BITCOIN_ORANGE = "#f7931a";
const YELLOW = "#eab308";

type Prices = {
  usd: number;
  eur: number;
  mad: number;
  change24h: number; // % in USD
};

type FieldKey = "satoshi" | "btc" | "mbtc" | "bits" | "usd" | "eur" | "mad";

interface FieldDef {
  key: FieldKey;
  label: string;
  badge: string;
  decimals: number;
  color: string;
  integer?: boolean;
  fiat?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "satoshi", label: "Satoshi", badge: "sat", decimals: 0, color: BITCOIN_ORANGE, integer: true },
  { key: "btc", label: "Bitcoin", badge: "BTC", decimals: 8, color: BITCOIN_ORANGE },
  { key: "mbtc", label: "Millibitcoin", badge: "mBTC", decimals: 5, color: YELLOW },
  { key: "bits", label: "Bits", badge: "μBTC", decimals: 2, color: YELLOW },
  { key: "usd", label: "US Dollar", badge: "USD", decimals: 2, color: "#10b981", fiat: true },
  { key: "eur", label: "Euro", badge: "EUR", decimals: 2, color: "#10b981", fiat: true },
  { key: "mad", label: "Moroccan Dirham", badge: "MAD", decimals: 2, color: "#10b981", fiat: true },
];

const SATS_PER_BTC = 100_000_000;

function formatSats(sats: number, decimals: number, integer = false): string {
  if (!isFinite(sats) || sats === 0) return "";
  const btc = sats / SATS_PER_BTC;
  let value: number;
  switch (decimals) {
    case 0:
      value = sats;
      break;
    case 8:
      value = btc;
      break;
    case 5:
      value = btc * 1_000;
      break;
    case 2:
      value = btc * 1_000_000;
      break;
    default:
      value = btc;
  }
  if (integer) return Math.round(value).toString();
  // Trim trailing zeros but preserve at most `decimals` places.
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

function formatFiat(sats: number, rate: number): string {
  if (!isFinite(sats) || sats === 0 || !rate) return "";
  const v = (sats / SATS_PER_BTC) * rate;
  return v.toFixed(2);
}

const QUICK_AMOUNTS: { label: string; sats: number }[] = [
  { label: "1 sat", sats: 1 },
  { label: "100 sat", sats: 100 },
  { label: "1,000 sat", sats: 1_000 },
  { label: "1 bit", sats: 100 },
  { label: "1 mBTC", sats: 100_000 },
  { label: "0.001 BTC", sats: 100_000 },
  { label: "0.01 BTC", sats: 1_000_000 },
  { label: "0.1 BTC", sats: 10_000_000 },
  { label: "1 BTC", sats: SATS_PER_BTC },
];

function SatoshiConverterPage() {
  const [sats, setSats] = useState<number>(0);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [rawInputs, setRawInputs] = useState<Partial<Record<FieldKey, string>>>({});

  const [prices, setPrices] = useState<Prices | null>(null);
  const [spark, setSpark] = useState<{ t: number; p: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  const fetchPrices = useCallback(async () => {
    setError(null);
    try {
      const [priceRes, chartRes] = await Promise.all([
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,mad&include_24hr_change=true",
        ),
        spark.length === 0
          ? fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7")
          : Promise.resolve(null),
      ]);
      if (!priceRes.ok) throw new Error("Price fetch failed");
      const pData = await priceRes.json();
      const b = pData.bitcoin;
      setPrices({
        usd: b.usd ?? 0,
        eur: b.eur ?? 0,
        mad: b.mad ?? (b.usd ? b.usd * 9.9 : 0), // fallback: 1 USD ≈ 9.9 MAD
        change24h: b.usd_24h_change ?? 0,
      });
      if (chartRes && chartRes.ok) {
        const cData = await chartRes.json();
        const series = (cData.prices as [number, number][]).map(([t, p]) => ({ t, p }));
        setSpark(series);
      }
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load price");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPrices();
    const refresh = setInterval(fetchPrices, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [fetchPrices]);

  const secondsAgo = lastUpdated ? Math.max(0, Math.floor((now - lastUpdated) / 1000)) : 0;

  const handleChange = (key: FieldKey, raw: string) => {
    setActiveField(key);
    setRawInputs({ [key]: raw });
    const cleaned = raw.replace(/,/g, "").trim();
    if (cleaned === "" || cleaned === "-" || cleaned === ".") {
      setSats(0);
      return;
    }
    const num = Number(cleaned);
    if (!isFinite(num) || num < 0) return;
    let nextSats = 0;
    switch (key) {
      case "satoshi":
        nextSats = Math.round(num);
        break;
      case "btc":
        nextSats = num * SATS_PER_BTC;
        break;
      case "mbtc":
        nextSats = num * 100_000;
        break;
      case "bits":
        nextSats = num * 100;
        break;
      case "usd":
        if (prices?.usd) nextSats = (num / prices.usd) * SATS_PER_BTC;
        break;
      case "eur":
        if (prices?.eur) nextSats = (num / prices.eur) * SATS_PER_BTC;
        break;
      case "mad":
        if (prices?.mad) nextSats = (num / prices.mad) * SATS_PER_BTC;
        break;
    }
    setSats(nextSats);
  };

  const setQuick = (s: number) => {
    setActiveField(null);
    setRawInputs({});
    setSats(s);
  };

  const reset = () => {
    setActiveField(null);
    setRawInputs({});
    setSats(0);
  };

  const valueFor = (f: FieldDef): string => {
    if (activeField === f.key && rawInputs[f.key] !== undefined) return rawInputs[f.key] as string;
    if (f.fiat) {
      const rate = prices ? (prices as any)[f.key] : 0;
      return formatFiat(sats, rate);
    }
    return formatSats(sats, f.decimals, f.integer);
  };

  return (
    <ToolPageShell
      title="Satoshi Converter"
      description="Convert between Bitcoin, Satoshi, mBTC, bits, USD, EUR and MAD instantly. Live BTC price updated every 60 seconds."
    >
      {/* Live Price Header */}
      <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `${BITCOIN_ORANGE}1a` }}
            >
              <Bitcoin className="w-6 h-6" style={{ color: BITCOIN_ORANGE }} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Live BTC Price</div>
              {loading && !prices ? (
                <Skeleton className="h-7 w-40 mt-1" />
              ) : prices ? (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl font-bold" style={{ color: BITCOIN_ORANGE }}>
                    ${(prices.usd ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: prices.change24h >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    {prices.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {prices.change24h >= 0 ? "+" : ""}
                    {prices.change24h.toFixed(2)}% 24h
                  </span>
                </div>
              ) : (
                <div className="text-sm text-destructive">Price unavailable</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prices && (
              <>
                <div className="text-sm text-muted-foreground">
                  €{(prices.eur ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </div>
                <span className="text-muted-foreground/40">·</span>
                <div className="text-sm text-muted-foreground">
                  MAD {(prices.mad ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </div>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={fetchPrices} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <span>
            {lastUpdated
              ? `Last updated: ${secondsAgo}s ago · refreshes in ${Math.max(0, 60 - secondsAgo)}s`
              : "Fetching live price…"}
          </span>
          {error && (
            <Button variant="outline" size="sm" onClick={fetchPrices}>
              Retry
            </Button>
          )}
        </div>

        {/* Sparkline */}
        {spark.length > 0 && (
          <div className="mt-4 -mx-2" style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="btcSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BITCOIN_ORANGE} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={BITCOIN_ORANGE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(_label, payload) => {
                    const t = payload?.[0]?.payload?.t;
                    // Explicit locale, same reasoning as the price formatting
                    // above: `toLocaleString()` with no locale argument
                    // formats according to the visitor's own browser/OS
                    // locale, which could show a different date order or
                    // separator than the rest of this English-language site.
                    return t ? new Date(t).toLocaleString("en-US") : "";
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "BTC"]}
                />
                <Area type="monotone" dataKey="p" stroke={BITCOIN_ORANGE} strokeWidth={2} fill="url(#btcSpark)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground/70 text-center">7-day price trend (USD)</div>
      </section>

      {/* Converter */}
      <section
        className="mt-6 rounded-2xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h2 className="font-display text-lg font-bold">Convert</h2>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <ConverterField
              key={f.key}
              field={f}
              value={valueFor(f)}
              onChange={(v) => handleChange(f.key, v)}
              disabled={!!f.fiat && !prices}
            />
          ))}
        </div>

        {/* Quick amounts */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Quick amounts</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuick(q.sats)}
                className="px-3 py-1.5 rounded-md border text-xs font-medium transition-colors hover:bg-secondary"
                style={{ borderColor: "var(--border)" }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Reference */}
      <section
        className="mt-6 rounded-2xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <h2 className="font-display text-lg font-bold mb-4">Reference</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          {[
            ["1 BTC", "100,000,000 Satoshi"],
            ["1 BTC", "1,000 mBTC"],
            ["1 BTC", "1,000,000 Bits"],
            ["1 mBTC", "100,000 Satoshi"],
            ["1 Bit", "100 Satoshi"],
            ["1 Satoshi", "0.00000001 BTC"],
          ].map(([a, b], i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border px-3 py-2"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="font-medium" style={{ color: BITCOIN_ORANGE }}>
                {a}
              </span>
              <span className="text-muted-foreground">= {b}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Prices are for informational purposes only and do not constitute financial advice.
      </p>

      {/* Internal Link → Currency Converter */}
      <Link
        to="/tools/currency-converter"
        className="mt-4 flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors hover:bg-secondary/50"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#00D4FF1a" }}>
            <ArrowLeftRight className="w-4 h-4" style={{ color: "#00D4FF" }} />
          </div>
          <div>
            <div className="text-sm font-semibold">Currency Converter</div>
            <div className="text-xs text-muted-foreground">Convert BTC value between 170+ world currencies</div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">Try it →</span>
      </Link>

      <AdZone id="satoshi-converter-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter any amount in any field — Satoshi, BTC, mBTC, Bits, USD, EUR, or MAD — and all other values update instantly.",
          "Live Bitcoin price is fetched automatically from CoinGecko every 60 seconds. The 7-day price chart shows recent BTC trend.",
          "Use the Quick Amount buttons to instantly convert common values like 1000 Satoshi or 0.01 BTC without typing.",
        ]}
      />

      <ToolSeoContent
        title="Free Satoshi to BTC Converter — Bitcoin Unit Converter with Live Price"
        description="Convert between Satoshi, BTC, mBTC, Bits, USD, EUR, and MAD instantly with live Bitcoin price. 7-day price chart included. Free, no signup, updates every 60 seconds."
        body={[
          "The Satoshi Converter is an all-in-one Bitcoin unit calculator that converts seamlessly between seven different units: Satoshi (the smallest BTC unit), Bitcoin (BTC), millibitcoin (mBTC), bits (microbitcoin), and three fiat currencies — US Dollar (USD), Euro (EUR), and Moroccan Dirham (MAD). Type any value into any field and every other field updates instantly in your browser.",
          "A Satoshi is the smallest indivisible unit of Bitcoin, named after Bitcoin's pseudonymous creator Satoshi Nakamoto. One Bitcoin equals exactly 100,000,000 Satoshi. Because a single BTC can be worth tens of thousands of dollars, smaller denominations like mBTC (one-thousandth of a BTC) and bits (one-millionth of a BTC) make everyday amounts easier to read and discuss.",
          "Live Bitcoin prices come from the public CoinGecko API and refresh automatically every 60 seconds, with a visible countdown so you always know how fresh the data is. A 7-day price sparkline shows the recent BTC trend, and we include MAD support specifically for Moroccan users who rarely see their local currency in crypto tools.",
          "Whether you are a developer testing Lightning Network payloads, a trader sizing a position, a content creator pricing a tip jar, or simply curious how many Satoshi your morning coffee would cost, this converter handles every common Bitcoin conversion in a single screen. All calculations run locally in your browser — only the price fetch leaves your device.",
        ]}
        faqs={[
          {
            question: "What is a Satoshi?",
            answer:
              "A Satoshi (sat) is the smallest unit of Bitcoin, equal to 0.00000001 BTC. It is named after Satoshi Nakamoto, Bitcoin's pseudonymous creator. Satoshi are the unit used internally by the Bitcoin protocol.",
          },
          {
            question: "How many Satoshi are in 1 BTC?",
            answer: "Exactly 100,000,000 (one hundred million) Satoshi make up 1 Bitcoin.",
          },
          {
            question: "What are mBTC and Bits?",
            answer:
              "1 mBTC (millibitcoin) equals 0.001 BTC, or 100,000 Satoshi. 1 Bit (also called microbitcoin or μBTC) equals 0.000001 BTC, or 100 Satoshi. They make everyday amounts easier to read.",
          },
          {
            question: "Where does the live price come from?",
            answer:
              "Prices are fetched directly from the public CoinGecko API, which aggregates data from hundreds of cryptocurrency exchanges to provide a reliable global average price.",
          },
          {
            question: "Is the price real-time?",
            answer:
              "The price refreshes every 60 seconds automatically. You can also tap the refresh button for an instant update. A countdown shows how many seconds ago the last update happened.",
          },
          {
            question: "Why is MAD (Moroccan Dirham) included?",
            answer:
              "Most Bitcoin converters ignore North African currencies. We include MAD to give Moroccan users a first-class conversion experience without needing a second step through USD or EUR.",
          },
          {
            question: "Is this financial advice?",
            answer:
              "No. This tool is for informational and educational purposes only. Cryptocurrency prices are volatile — always do your own research before making any financial decision.",
          },
          {
            question: "Does this tool store my data?",
            answer:
              "No. All conversions happen instantly in your browser. The only outbound request is the CoinGecko price fetch. No values you type are sent to any server.",
          },
        ]}
      />

      <RelatedTools currentSlug="satoshi-converter" />
    </ToolPageShell>
  );
}

interface FieldProps {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function ConverterField({ field, value, onChange, disabled }: FieldProps) {
  const [copied, setCopied] = useState(false);
  const tRef = useRef<number | null>(null);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: field.color }}>
          {field.label}
        </label>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color: field.color,
            borderColor: `${field.color}55`,
            background: `${field.color}14`,
          }}
        >
          {field.badge}
        </span>
      </div>
      <div className="relative">
        <Input
          inputMode={field.integer ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={disabled ? "Waiting for price…" : "0"}
          disabled={disabled}
          className="pr-10 font-mono"
          style={{ borderColor: `${field.color}55` }}
        />
        <button
          onClick={copy}
          disabled={!value}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Copy"
        >
          {copied ? (
            <Check className="w-4 h-4" style={{ color: "#10b981" }} />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
