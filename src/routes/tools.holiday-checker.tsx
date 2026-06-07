import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, Search, Sparkles } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/holiday-checker")({
  head: () => buildToolMeta(toolBySlug("holiday-checker", tools)),
  component: HolidayChecker,
});

interface Country {
  countryCode: string;
  name: string;
}

interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  types: string[];
  global: boolean;
}

function flagEmoji(code: string) {
  if (!code || code.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(A + (code.charCodeAt(0) - a)) + String.fromCodePoint(A + (code.charCodeAt(1) - a));
}

function formatLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function weekday(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysFromToday(iso: string) {
  const t = new Date(todayISO() + "T00:00:00").getTime();
  const d = new Date(iso + "T00:00:00").getTime();
  return Math.round((d - t) / 86400000);
}

function HolidayChecker() {
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear === 2025 || currentYear === 2026 ? currentYear : 2026;

  const [countries, setCountries] = useState<Country[]>([]);
  const [countryCode, setCountryCode] = useState<string>("US");
  const [year, setYear] = useState<number>(defaultYear);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [resultMeta, setResultMeta] = useState<{ code: string; name: string; year: number } | null>(null);

  // Load countries
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://date.nager.at/api/v3/AvailableCountries");
        if (!res.ok) throw new Error("countries");
        const data: Country[] = await res.json();
        if (cancelled) return;
        data.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(data);
      } catch {
        if (!cancelled) setError("Could not load country list, please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-fetch initial holidays once countries are loaded
  useEffect(() => {
    if (countries.length > 0 && !holidays && !loading) {
      void fetchHolidays(countryCode, year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  async function fetchHolidays(code: string, y: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${code}`);
      if (!res.ok) throw new Error("holidays");
      const data: Holiday[] = await res.json();
      data.sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(data);
      const name = countries.find((c) => c.countryCode === code)?.name ?? code;
      setResultMeta({ code, name, year: y });
    } catch {
      setError("Could not fetch holidays, please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void fetchHolidays(countryCode, year);
  }

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q),
    );
  }, [countries, query]);

  const today = todayISO();
  const nextHoliday = useMemo(() => {
    if (!holidays) return null;
    return holidays.find((h) => h.date >= today) ?? null;
  }, [holidays, today]);

  return (
    <ToolPageShell
      title="Holiday Checker"
      description="Find all public holidays for any country — instantly."
    >
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a country…"
          />
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredCountries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No countries match</div>
              ) : (
                filteredCountries.map((c) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    <span className="mr-2">{flagEmoji(c.countryCode)}</span>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" disabled={loading || countries.length === 0} className="gap-2 sm:self-start">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Check Holidays
        </Button>
      </form>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--orange-brand)" }}>
          {error}
        </p>
      )}

      {holidays && resultMeta && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 space-y-6"
        >
          {/* Summary */}
          <div className="rounded-2xl border border-border bg-card/50 p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none" aria-hidden>
                {flagEmoji(resultMeta.code)}
              </span>
              <div>
                <div className="font-display text-xl font-bold">{resultMeta.name}</div>
                <div className="text-xs text-muted-foreground">
                  {holidays.length} {holidays.length === 1 ? "holiday" : "holidays"} · {resultMeta.year}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" /> Year {resultMeta.year}
            </div>
          </div>

          {/* Next holiday */}
          {nextHoliday && (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "color-mix(in oklab, var(--cyan-brand) 14%, transparent)",
                borderColor: "color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
              }}
            >
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--cyan-brand)" }}>
                <Sparkles className="w-3.5 h-3.5" /> Next holiday
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{nextHoliday.localName}</div>
              <div className="text-sm text-muted-foreground">{formatLongDate(nextHoliday.date)}</div>
              <div className="mt-2 text-sm font-medium" style={{ color: "var(--cyan-brand)" }}>
                {(() => {
                  const d = daysFromToday(nextHoliday.date);
                  if (d === 0) return "Today!";
                  if (d === 1) return "Tomorrow";
                  return `in ${d} days`;
                })()}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
            <div className="grid grid-cols-[110px_120px_1fr_100px] gap-3 px-4 py-2.5 text-xs uppercase tracking-wide text-muted-foreground border-b border-border bg-background/30">
              <div>Date</div>
              <div className="hidden sm:block">Day</div>
              <div>Holiday</div>
              <div className="text-right">Type</div>
            </div>
            <ul className="divide-y divide-border">
              {holidays.map((h) => {
                const isPast = h.date < today;
                const isNext = nextHoliday && h.date === nextHoliday.date;
                return (
                  <li
                    key={h.date + h.name}
                    className={`grid grid-cols-[110px_120px_1fr_100px] gap-3 px-4 py-3 text-sm items-center ${isPast ? "opacity-50" : ""}`}
                    style={
                      isNext
                        ? { background: "color-mix(in oklab, var(--cyan-brand) 10%, transparent)" }
                        : undefined
                    }
                  >
                    <div className="font-mono text-xs">{h.date}</div>
                    <div className="hidden sm:block text-muted-foreground">{weekday(h.date)}</div>
                    <div className="font-medium">
                      {h.localName}
                      {h.localName !== h.name && (
                        <span className="ml-2 text-xs text-muted-foreground">({h.name})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-muted-foreground">
                        {h.types?.[0] ?? "Public"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-background/30">
              {holidays.length} holidays in {resultMeta.name} — {resultMeta.year}
            </div>
          </div>
        </motion.div>
      )}

      <HowToUse
        steps={[
          "Pick a country from the dropdown (use the search box to filter).",
          "Choose a year — 2025 or 2026.",
          "Click Check Holidays to see the full list and the next upcoming holiday.",
        ]}
      />

      <ToolSeoContent
        title="Public Holiday Checker — National Holidays for Every Country"
        description="Find official public holidays for any country in 2025 and 2026. Free, instant, and runs entirely in your browser."
        body={[
          "Holiday Checker is a free online tool that lets you look up every official public holiday for any country, so you can plan trips, schedule meetings, organise events, or simply know when the next long weekend is coming. Just pick a country and a year and you instantly get the full list of national observances with dates, weekdays, and the next upcoming holiday highlighted.",
          "The data is powered by the Nager.Date API, an open project that aggregates official holiday information for more than 100 countries — including all major nations in Europe, the Americas, Asia, Africa, and Oceania. Holiday lists are sourced from each country's official government calendars and refreshed every year, so you always see accurate, up-to-date national and public holidays.",
          "Privacy is built in. We do not store your country selection, your queries, or any other data. Every request goes directly from your browser to the Nager.Date API — there is no backend on our side and no API key required from you. It is a fully client-side tool that runs the moment you open the page.",
        ]}
        faqs={[
          {
            question: "How many countries are supported?",
            answer:
              "Over 100 countries are supported, including all major nations. The list is sourced directly from the Nager.Date API and updated regularly.",
          },
          {
            question: "Is the holiday data official?",
            answer:
              "Yes. Nager.Date aggregates data from official government sources for each country, covering national and public holidays.",
          },
          {
            question: "Can I check holidays for next year?",
            answer:
              "Yes. Use the year selector to switch between 2025 and 2026.",
          },
          {
            question: "Do you store my searches?",
            answer:
              "No. Every request goes directly from your browser to the Nager.Date API. Nothing is logged or stored on our servers.",
          },
        ]}
      />

      <RelatedTools currentSlug="holiday-checker" />
    </ToolPageShell>
  );
}
