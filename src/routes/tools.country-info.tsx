import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, MapPin } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/country-info")({
  head: () => buildToolMeta(toolBySlug("country-info", tools)),
  component: CountryInfo,
});

interface CountryListItem {
  name: string;
  cca2: string;
  cca3: string;
  flag: string;
}

interface CountryDetail {
  name: { common: string; official: string };
  flags: { svg: string; png: string; alt?: string };
  cca2: string;
  cca3: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  currencies?: Record<string, { name: string; symbol?: string }>;
  languages?: Record<string, string>;
  tld?: string[];
  idd?: { root?: string; suffixes?: string[] };
  car?: { side?: string };
  timezones?: string[];
  maps?: { googleMaps?: string };
  borders?: string[];
}

const PROXY_BASE = "https://country-proxy.skycally-tools.workers.dev/";
const COUNTRIES_URL = `${PROXY_BASE}?type=all`;

function formatNumber(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

function callingCode(c: CountryDetail) {
  const root = c.idd?.root ?? "";
  const suffix = c.idd?.suffixes?.[0] ?? "";
  return root + suffix || "—";
}

function CountryInfo() {
  const [allCountries, setAllCountries] = useState<CountryListItem[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryDetail | null>(null);
  const [borderNames, setBorderNames] = useState<
    { cca3: string; common: string; flag: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_URL)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (cancelled) return;
        const list: CountryListItem[] = data
          .map((c) => ({
            name: c.name?.common ?? "",
            cca2: c.cca2 ?? "",
            cca3: c.cca3 ?? "",
            flag: c.flags?.svg ?? c.flags?.png ?? "",
          }))
          .filter((c) => c.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setAllCountries(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadByName(name: string) {
    const q = name.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fullText=false`,
      );
      if (!res.ok) {
        setCountry(null);
        setBorderNames([]);
        setError("Country not found. Please try another name.");
        return;
      }
      const data: CountryDetail[] = await res.json();
      const c =
        data.find(
          (d) => d.name.common.toLowerCase() === q.toLowerCase(),
        ) ?? data[0];
      setCountry(c);
      await loadBorders(c.borders ?? []);
    } catch {
      setError("Country not found. Please try another name.");
    } finally {
      setLoading(false);
    }
  }

  async function loadByCode(cca3: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://restcountries.com/v3.1/alpha/${encodeURIComponent(cca3)}`,
      );
      if (!res.ok) throw new Error();
      const data: CountryDetail[] = await res.json();
      const c = data[0];
      setCountry(c);
      await loadBorders(c.borders ?? []);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Could not load that country, please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBorders(codes: string[]) {
    if (codes.length === 0) {
      setBorderNames([]);
      return;
    }
    try {
      const res = await fetch(
        `https://restcountries.com/v3.1/alpha?codes=${codes.join(",")}&fields=name,cca3,flags`,
      );
      if (!res.ok) {
        setBorderNames([]);
        return;
      }
      const data: any[] = await res.json();
      setBorderNames(
        data
          .map((d) => ({
            cca3: d.cca3,
            common: d.name?.common ?? d.cca3,
            flag: d.flags?.svg ?? d.flags?.png ?? "",
          }))
          .sort((a, b) => a.common.localeCompare(b.common)),
      );
    } catch {
      setBorderNames([]);
    }
  }

  // Load a default on mount when list is ready
  useEffect(() => {
    if (allCountries.length > 0 && !country && !loading) {
      void loadByName("Morocco");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCountries.length]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadByName(search);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCountries.slice(0, 50);
    return allCountries
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allCountries, query]);

  const currencies = country?.currencies
    ? Object.entries(country.currencies)
        .map(([code, v]) => `${v.name} (${code})${v.symbol ? ` ${v.symbol}` : ""}`)
        .join(", ")
    : "—";

  const languages = country?.languages
    ? Object.values(country.languages).join(", ")
    : "—";

  return (
    <ToolPageShell
      title="Country Info"
      description="Explore facts, flags, and data for every country in the world."
    >
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a country name, e.g. Morocco"
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </Button>
      </form>

      <div className="mt-4 rounded-2xl border border-border bg-card/40 p-4">
        <label className="text-xs text-muted-foreground mb-2 block">
          Or pick from the full list
        </label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter countries…"
          className="mb-3"
        />
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background/40 divide-y divide-border">
          {filtered.map((c) => (
            <button
              key={c.cca3}
              type="button"
              onClick={() => void loadByCode(c.cca3)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors"
            >
              {c.flag && (
                <img
                  src={c.flag}
                  alt=""
                  className="w-6 h-4 object-cover rounded-sm border border-border"
                />
              )}
              <span>{c.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matches.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          className="mt-4 text-sm"
          style={{ color: "var(--orange-brand)" }}
        >
          {error}
        </p>
      )}

      {country && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 rounded-2xl border border-border bg-card/50 p-6"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={country.flags.svg}
              alt={country.flags.alt ?? `Flag of ${country.name.common}`}
              className="w-40 h-auto rounded-lg border border-border shadow-sm"
            />
            <div className="flex-1">
              <h2 className="font-display text-3xl font-bold tracking-tight">
                {country.name.common}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {country.name.official}
              </p>
              {(country.region || country.subregion) && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {country.region}
                  {country.subregion ? ` · ${country.subregion}` : ""}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoTile
              icon="🏛️"
              label="Capital"
              value={country.capital?.join(", ") || "—"}
            />
            <InfoTile
              icon="👥"
              label="Population"
              value={formatNumber(country.population)}
            />
            <InfoTile
              icon="📐"
              label="Area"
              value={country.area ? `${formatNumber(country.area)} km²` : "—"}
            />
            <InfoTile icon="💰" label="Currency" value={currencies} />
            <InfoTile icon="🗣️" label="Languages" value={languages} />
            <InfoTile
              icon="🌐"
              label="Top-Level Domain"
              value={country.tld?.join(", ") || "—"}
            />
            <InfoTile icon="📞" label="Calling Code" value={callingCode(country)} />
            <InfoTile
              icon="🚗"
              label="Driving Side"
              value={
                country.car?.side
                  ? country.car.side.charAt(0).toUpperCase() +
                    country.car.side.slice(1)
                  : "—"
              }
            />
            <InfoTile
              icon="⏰"
              label="Timezones"
              value={country.timezones?.join(", ") || "—"}
            />
            <InfoTile
              icon="🗺️"
              label="Google Maps"
              value={
                country.maps?.googleMaps ? (
                  <a
                    href={country.maps.googleMaps}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "var(--cyan-brand)" }}
                  >
                    View on Maps
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <div className="mt-6">
            <h3 className="font-display text-base font-bold mb-3">
              Bordering Countries
            </h3>
            {borderNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bordering countries
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {borderNames.map((b) => (
                  <button
                    key={b.cca3}
                    type="button"
                    onClick={() => void loadByCode(b.cca3)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs hover:bg-secondary/60 transition-colors"
                  >
                    {b.flag && (
                      <img
                        src={b.flag}
                        alt=""
                        className="w-4 h-3 object-cover rounded-sm"
                      />
                    )}
                    {b.common}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <HowToUse
        steps={[
          "Type a country name in the search box, or pick one from the dropdown list.",
          "Click Search to load the country's full profile — flag, capital, population, currency and more.",
          "Click any bordering country chip to instantly explore its neighbors.",
        ]}
      />

      <ToolSeoContent
        title="Country Info — Free Country Facts and Data Lookup"
        description="Instant facts, flags, and data for every country in the world. Free, no signup, runs in your browser."
        body={[
          "Country Info gives you instant access to facts about any of the 250 countries and territories recognized in the world. Type a country name or pick from the list and you immediately see the flag, capital, official name, population, area, currency, official languages, calling code, top-level domain, driving side, timezones, and a direct link to Google Maps — all on one clean card. Nothing is uploaded, nothing is stored, and no signup is required.",
          "The tool is powered by the REST Countries API, a community-maintained dataset that aggregates official country information from the World Bank, the United Nations, and other public sources. The dataset is updated regularly so figures like population, currency, and capital reflect the latest published values. Every lookup goes directly from your browser to the API, so results appear in under a second.",
          "Country Info is useful for students researching world geography, travelers planning a trip, trivia and quiz players checking answers, language learners exploring official languages, and anyone simply curious about the world. The bordering-country chips also make it easy to hop between neighbors — pick one and you instantly land on its profile, perfect for exploring an entire region in just a few clicks.",
        ]}
        faqs={[
          {
            question: "How many countries are available?",
            answer:
              "All 250 countries and territories recognized internationally are available, including small island nations and territories.",
          },
          {
            question: "Where does the data come from?",
            answer:
              "Data is sourced from the REST Countries API, which aggregates information from the World Bank, UN, and other official sources.",
          },
          {
            question: "Can I search in languages other than English?",
            answer:
              "Currently search works best with English country names. Type the common English name for best results (e.g. \"Morocco\" not \"Maroc\").",
          },
          {
            question: "Is the population data up to date?",
            answer:
              "Population figures are based on the latest available data in the REST Countries API, typically updated annually.",
          },
        ]}
      />

      <RelatedTools currentSlug="country-info" />
    </ToolPageShell>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}
