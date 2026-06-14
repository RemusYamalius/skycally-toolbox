import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/tools/currency-converter")({
  head: () => buildToolMeta(toolBySlug("currency-converter", tools)),
  component: CurrencyConverter,
});

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  MXN: "Mexican Peso",
  BRL: "Brazilian Real",
  KRW: "South Korean Won",
  SAR: "Saudi Riyal",
  AED: "UAE Dirham",
  EGP: "Egyptian Pound",
  MAD: "Moroccan Dirham",
  DZD: "Algerian Dinar",
  TND: "Tunisian Dinar",
  TRY: "Turkish Lira",
  RUB: "Russian Ruble",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  NOK: "Norwegian Krone",
  SEK: "Swedish Krona",
  DKK: "Danish Krone",
  PLN: "Polish Zloty",
  ZAR: "South African Rand",
  NGN: "Nigerian Naira",
  KES: "Kenyan Shilling",
  GHS: "Ghanaian Cedi",
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  CHF: "🇨🇭",
  CNY: "🇨🇳",
  INR: "🇮🇳",
  MXN: "🇲🇽",
  BRL: "🇧🇷",
  KRW: "🇰🇷",
  SAR: "🇸🇦",
  AED: "🇦🇪",
  EGP: "🇪🇬",
  MAD: "🇲🇦",
  DZD: "🇩🇿",
  TND: "🇹🇳",
  TRY: "🇹🇷",
  RUB: "🇷🇺",
  SGD: "🇸🇬",
  HKD: "🇭🇰",
  NOK: "🇳🇴",
  SEK: "🇸🇪",
  DKK: "🇩🇰",
  PLN: "🇵🇱",
  ZAR: "🇿🇦",
  NGN: "🇳🇬",
  KES: "🇰🇪",
  GHS: "🇬🇭",
};

function flagFor(code: string) {
  return CURRENCY_FLAGS[code] ?? "💱";
}

function nameFor(code: string) {
  return CURRENCY_NAMES[code] ?? code;
}

const QUICK_PAIRS: Array<[string, string]> = [
  ["USD", "EUR"],
  ["USD", "GBP"],
  ["USD", "MAD"],
  ["EUR", "USD"],
  ["GBP", "USD"],
  ["USD", "JPY"],
];

interface RatesResponse {
  result?: string;
  base_code?: string;
  conversion_rates?: Record<string, number>;
  time_last_update_utc?: string;
}

const ratesCache = new Map<string, RatesResponse>();

async function fetchRates(base: string): Promise<RatesResponse> {
  const cached = ratesCache.get(base);
  if (cached) return cached;
  const res = await fetch(`https://currency-proxy.skycally-tools.workers.dev?base=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error("rates");
  const data = (await res.json()) as RatesResponse;
  if (!data.conversion_rates) throw new Error("rates");
  ratesCache.set(base, data);
  return data;
}

function formatNumber(n: number) {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

function CurrencyConverter() {
  const [amount, setAmount] = useState<string>("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [quickRates, setQuickRates] = useState<Record<string, RatesResponse>>({});
  const [history, setHistory] = useState<{ date: string; rate: number }[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);

  async function loadRates(base: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRates(base);
      setRates(data);
    } catch {
      setError("Could not fetch exchange rates, please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRates(from);
  }, [from]);

  // Load quick conversion pairs
  useEffect(() => {
    const bases = Array.from(new Set(QUICK_PAIRS.map(([b]) => b)));
    (async () => {
      const out: Record<string, RatesResponse> = {};
      await Promise.all(
        bases.map(async (b) => {
          try {
            out[b] = await fetchRates(b);
          } catch {
            /* ignore */
          }
        }),
      );
      setQuickRates(out);
    })();
  }, []);

  // 7-day rate history — fetch on currency change AND on debounced amount change
  useEffect(() => {
    if (from === to) {
      setHistory(null);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setHistoryLoading(true);
      const today = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const url = `https://api.frankfurter.dev/${iso(past)}..${iso(today)}?from=${from}&to=${to}`;
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: { rates?: Record<string, Record<string, number>> }) => {
          if (cancelled) return;
          if (!data.rates) {
            setHistory((prev) => prev);
            setHistoryLoading(false);
            return;
          }
          const points = Object.entries(data.rates)
            .map(([date, obj]) => ({ date, rate: obj?.[to] }))
            .filter((p): p is { date: string; rate: number } => typeof p.rate === "number")
            .sort((a, b) => a.date.localeCompare(b.date));
          setHistory(points.length >= 2 ? points : null);
          setHistoryLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          // Keep previous data if any; otherwise leave null so section hides silently.
          setHistoryLoading(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [from, to, amount]);

  const allCodes = useMemo(() => {
    if (!rates?.conversion_rates) return [] as string[];
    return Object.keys(rates.conversion_rates).sort();
  }, [rates]);

  const numAmount = Number(amount);
  const validAmount = isFinite(numAmount) && numAmount > 0;
  const rate = rates?.conversion_rates?.[to];
  const result = rate && validAmount ? numAmount * rate : null;
  const inverseRate = rate ? 1 / rate : null;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <ToolPageShell title="Currency Converter" description="Convert between 170+ currencies with live exchange rates.">
      <div className="grid gap-4">
        {/* Amount */}
        <div className="grid gap-1.5">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Amount</label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
          />
        </div>

        {/* From / Swap / To */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-end">
          <div className="grid gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">From</label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fromOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="flex items-center gap-2">
                    <span>{flagFor(from)}</span>
                    <span>
                      {from} — {nameFor(from)}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search currency…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No currencies found</CommandEmpty>
                    {allCodes.map((c) => (
                      <CommandItem
                        key={c}
                        value={`${c} ${nameFor(c)}`}
                        onSelect={() => {
                          setFrom(c);
                          setFromOpen(false);
                        }}
                      >
                        <span className="mr-2">{flagFor(c)}</span>
                        {c} — {nameFor(c)}
                        <Check className={cn("ml-auto h-4 w-4", from === c ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex sm:flex-col items-center justify-center pb-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swap}
              aria-label="Swap currencies"
              className="rounded-full"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">To</label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={toOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="flex items-center gap-2">
                    <span>{flagFor(to)}</span>
                    <span>
                      {to} — {nameFor(to)}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search currency…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No currencies found</CommandEmpty>
                    {allCodes.map((c) => (
                      <CommandItem
                        key={c}
                        value={`${c} ${nameFor(c)}`}
                        onSelect={() => {
                          setTo(c);
                          setToOpen(false);
                        }}
                      >
                        <span className="mr-2">{flagFor(c)}</span>
                        {c} — {nameFor(c)}
                        <Check className={cn("ml-auto h-4 w-4", to === c ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void loadRates(from)}
          disabled={loading}
          className="gap-2 w-full sm:w-auto sm:justify-self-start"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
          Convert
        </Button>

        {error && (
          <p className="text-sm" style={{ color: "var(--orange-brand)" }}>
            {error}
          </p>
        )}

        {/* Result */}
        {rates && rate && result !== null && (
          <motion.div
            key={`${from}-${to}-${amount}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border p-6"
            style={{
              background: "color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
              borderColor: "color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
            }}
          >
            <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--cyan-brand)" }}>
              Result
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold break-words">
              <span className="mr-2">{flagFor(from)}</span>
              {formatNumber(numAmount)} {from} = <span className="mr-2">{flagFor(to)}</span>
              {formatNumber(result)} {to}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              1 {from} = {formatNumber(rate)} {to}
              {inverseRate !== null && (
                <>
                  {" "}
                  · 1 {to} = {formatNumber(inverseRate)} {from}
                </>
              )}
            </div>
            {rates.time_last_update_utc && (
              <div className="mt-2 text-xs text-muted-foreground">Last updated: {rates.time_last_update_utc}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              Rates updated daily. For real-time trading rates, consult your bank or broker directly.
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick conversions */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-bold mb-3">Quick Conversions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_PAIRS.map(([b, q]) => {
            const r = quickRates[b]?.conversion_rates?.[q];
            const ts = quickRates[b]?.time_last_update_utc;
            return (
              <div key={`${b}-${q}`} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    <span className="mr-1">{flagFor(b)}</span>
                    {b} <span className="text-muted-foreground">→</span> <span className="mr-1">{flagFor(q)}</span>
                    {q}
                  </div>
                </div>
                <div className="mt-2 font-display text-xl font-bold">
                  {r ? `1 ${b} = ${formatNumber(r)} ${q}` : "—"}
                </div>
                {ts && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Updated {ts}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7-Day Rate History */}
      {from !== to && (historyLoading || (history && history.length >= 2)) && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold mb-3">7-Day Rate History</h2>
          <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
            {history && history.length >= 2 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => v.toFixed(4)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                    labelFormatter={(d: string) =>
                      new Date(d).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(v: number) => [`${v.toPrecision(6)} ${to}`, `1 ${from}`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#00D4FF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            )}
            <div className="mt-2 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              Powered by Frankfurter API
            </div>
          </div>
        </section>
      )}

      <HowToUse
        steps={[
          "Enter an amount and pick the currency you're converting from.",
          "Pick the currency you want to convert to — use the swap button to flip them.",
          "Read the live exchange rate and result, updated daily from financial data providers.",
        ]}
      />

      <ToolSeoContent
        title="Currency Converter — Free Live Exchange Rate Tool"
        description="Convert any amount between 170+ world currencies using live exchange rates. Free, instant, no signup required."
        body={[
          "Convert any amount between 170+ world currencies using live exchange rates — free, instant, no signup required. Type the amount, select your currencies, and get the converted value along with the mid-market rate and its inverse in one click. Rates are updated every 24 hours from trusted financial data providers, making this tool ideal for quick reference checks throughout your day.",
          "The 7-day rate history chart lets you see how a currency pair has moved over the past week, giving you useful context before making decisions. Whether you are tracking USD to MAD, EUR to GBP, or any of 170+ pairs, the chart updates automatically with every conversion. Note that rates shown are mid-market reference rates — actual transfer rates from banks or services may include fees and spreads.",
          "From travellers checking hotel prices abroad to freelancers invoicing international clients and finance professionals monitoring currency exposure, the Currency Converter serves a wide range of daily needs. Everything runs in your browser — no data is logged, no account is needed, and no tracking occurs. Just clean, reliable numbers whenever you need them.",
        ]}
        faqs={[
          {
            question: "How often are the exchange rates updated?",
            answer:
              "Rates are updated every 24 hours. For real-time trading rates, always consult your bank or broker directly.",
          },
          {
            question: "What is the 7-day rate history chart?",
            answer:
              "It shows how the selected currency pair has moved over the past 7 days, powered by the Frankfurter API. It updates automatically with each conversion.",
          },
          {
            question: "How many currencies are supported?",
            answer:
              "Over 170 world currencies are supported, including major, emerging market, and regional currencies.",
          },
          {
            question: "Are the rates accurate?",
            answer:
              "Rates reflect mid-market values from ExchangeRate-API — accurate for reference but may differ from bank transaction rates due to fees and spreads.",
          },
          {
            question: "Do you store my conversion history?",
            answer: "No. All calculations happen in your browser. Nothing is logged or stored on our servers.",
          },
        ]}
      />

      <RelatedTools currentSlug="currency-converter" />
    </ToolPageShell>
  );
}
