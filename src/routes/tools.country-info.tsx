import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import COUNTRIES from "@/data/countries.json";

export const Route = createFileRoute("/tools/country-info")({
  head: () => buildToolMeta(toolBySlug("country-info", tools)),
  component: CountryInfo,
});

interface CountryRecord {
  cca2: string;
  cca3: string;
  name: { common: string; official: string };
  flagEmoji: string;
  flagSvg: string;
  capital: string[];
  region: string;
  subregion: string;
  population: number;
  area: number;
  currencies: Record<string, { name: string; symbol?: string }>;
  languages: Record<string, string>;
  tld: string[];
  callingCode: string;
  drivingSide: string;
  timezones: string[];
  borders: string[];
}

const ALL: CountryRecord[] = (COUNTRIES as unknown as CountryRecord[])
  .slice()
  .sort((a, b) => a.name.common.localeCompare(b.name.common));

const BY_CCA3 = new Map(ALL.map((c) => [c.cca3, c]));

function formatNumber(n?: number) {
  if (!n) return "—";
  return n.toLocaleString("en-US");
}

function googleMapsUrl(c: CountryRecord) {
  return `https://www.google.com/maps/place/${encodeURIComponent(c.name.common)}`;
}

function CountryInfo() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryRecord | null>(null);

  function selectByName(name: string) {
    const q = name.trim().toLowerCase();
    if (!q) return;
    const c =
      ALL.find((x) => x.name.common.toLowerCase() === q) ??
      ALL.find((x) => x.name.official.toLowerCase() === q) ??
      ALL.find((x) => x.name.common.toLowerCase().includes(q));
    if (!c) {
      setError("Country not found. Please try another name.");
      return;
    }
    setError(null);
    setCountry(c);
  }

  function selectByCode(cca3: string) {
    const c = BY_CCA3.get(cca3);
    if (!c) return;
    setError(null);
    setCountry(c);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    if (!country) selectByName("Morocco");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    selectByName(search);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL.slice(0, 50);
    return ALL.filter((c) => c.name.common.toLowerCase().includes(q)).slice(0, 50);
  }, [query]);

  const borderList = useMemo(() => {
    if (!country) return [];
    return country.borders
      .map((code) => BY_CCA3.get(code))
      .filter((c): c is CountryRecord => !!c)
      .sort((a, b) => a.name.common.localeCompare(b.name.common));
  }, [country]);

  const currencies = country?.currencies
    ? Object.entries(country.currencies)
        .map(([code, v]) => `${v.name} (${code})${v.symbol ? ` ${v.symbol}` : ""}`)
        .join(", ")
    : "—";

  const languages = country?.languages ? Object.values(country.languages).join(", ") : "—";

  return (
    <ToolPageShell
      title="Country Info"
      description="Explore facts, flags, and data for every country in the world."
      showFileDisclaimer={false}
    >
      {/* Search */}
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a country name, e.g. Morocco"
          className="flex-1"
          aria-label="Search country"
        />
        <Button type="submit" className="gap-2">
          <Search className="w-4 h-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--orange-brand)" }}>
          {error}
        </p>
      )}

      {/* Country result card */}
      {country && (
        <motion.div
          key={country.cca3}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 rounded-2xl border border-border bg-card/50 p-6"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={country.flagSvg}
              alt={`Flag of ${country.name.common}`}
              className="w-40 h-auto rounded-lg border border-border shadow-sm"
            />
            <div className="flex-1">
              <h2 className="font-display text-3xl font-bold tracking-tight">
                {country.flagEmoji} {country.name.common}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{country.name.official}</p>
              {(country.region || country.subregion) && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {country.region}
                  {country.subregion ? ` · ${country.subregion}` : ""}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoTile icon="🏛️" label="Capital" value={country.capital.join(", ") || "—"} />
            <InfoTile icon="👥" label="Population" value={formatNumber(country.population)} />
            <InfoTile icon="📐" label="Area" value={country.area ? `${formatNumber(country.area)} km²` : "—"} />
            <InfoTile icon="💰" label="Currency" value={currencies} />
            <InfoTile icon="🗣️" label="Languages" value={languages} />
            <InfoTile icon="🌐" label="Top-Level Domain" value={country.tld.join(", ") || "—"} />
            <InfoTile icon="📞" label="Calling Code" value={country.callingCode || "—"} />
            <InfoTile
              icon="🚗"
              label="Driving Side"
              value={
                country.drivingSide ? country.drivingSide.charAt(0).toUpperCase() + country.drivingSide.slice(1) : "—"
              }
            />
            <InfoTile icon="⏰" label="Timezones" value={country.timezones.join(", ") || "—"} />
            <InfoTile
              icon="🗺️"
              label="Google Maps"
              value={
                <a
                  href={googleMapsUrl(country)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ color: "var(--cyan-brand)" }}
                >
                  View on Maps
                </a>
              }
            />
          </div>

          <div className="mt-6">
            <h3 className="font-display text-base font-bold mb-3">Bordering Countries</h3>
            {borderList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bordering countries</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {borderList.map((b) => (
                  <button
                    key={b.cca3}
                    type="button"
                    onClick={() => selectByCode(b.cca3)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs hover:bg-secondary/60 transition-colors"
                  >
                    {b.flagSvg && (
                      <img src={b.flagSvg} alt={`Flag of ${b.name.common}`} loading="lazy" className="w-4 h-3 object-cover rounded-sm" />
                    )}
                    {b.name.common}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Or pick from the full list */}
      <div className="mt-8 rounded-2xl border border-border bg-card/40 p-4">
        <label className="text-xs text-muted-foreground mb-2 block">Or pick from the full list</label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter countries…"
          className="mb-3"
          aria-label="Filter countries"
        />
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background/40 divide-y divide-border">
          {filtered.map((c) => (
            <button
              key={c.cca3}
              type="button"
              onClick={() => selectByCode(c.cca3)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors"
            >
              {c.flagSvg && (
                <img
                  src={c.flagSvg}
                  alt={`Flag of ${c.name.common}`}
                  loading="lazy"
                  className="w-6 h-4 object-cover rounded-sm border border-border"
                />
              )}
              <span>{c.name.common}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No matches.</p>}
        </div>
      </div>

      <AdZone id="country-info-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Type a country name in the search box, or pick one from the full list below.",
          "The country's profile loads instantly — flag, capital, population, currency, languages, and more.",
          "Click any bordering country chip to jump to that country's profile instantly.",
        ]}
      />

      <ToolSeoContent
        title="Country Info — Free Country Facts, Flags & Data for Every Nation"
        description="Explore facts, flags, and data for all 250 countries and territories. Capital, population, currency, languages, calling code, timezones and more. Free, instant, no signup."
        body={[
          "Country Info gives you instant access to comprehensive facts about any of the 250 countries and territories in the world. Type a country name or pick from the alphabetically sorted full list, and you immediately see the flag, capital, official name, population, area, currency, official languages, calling code, top-level domain, driving side, timezones, and a direct link to Google Maps — all on one clean card.",
          "The entire dataset is bundled directly into the app, so every lookup is instant — no API calls, no loading spinners, and no risk of an outside service going down. The data is compiled from open public sources including the mledoze/countries project and other community-maintained references, covering every UN member state and dependent territory.",
          "Country Info is useful for students researching world geography, travelers planning a trip, trivia and quiz players checking answers, language learners exploring official languages, and anyone curious about the world. The bordering-country chips make it easy to hop between neighbors — click one and you instantly land on its profile, perfect for exploring an entire region in just a few clicks.",
          "The tool supports instant filtering of the full country list — type a few letters and the list narrows to matching countries in real time. Both common names (Morocco) and partial matches (Mor) work. The flag images are loaded as SVG files directly from the dataset for crisp, high-resolution display at any screen size.",
        ]}
        faqs={[
          {
            question: "How many countries are available?",
            answer:
              "All 250 countries and territories recognized internationally, including UN member states, dependent territories, and small island nations.",
          },
          {
            question: "Where does the data come from?",
            answer:
              "Data is compiled from open public datasets (including mledoze/countries) and bundled directly with the app — no external API is used, ensuring instant lookups with no downtime.",
          },
          {
            question: "Can I search in languages other than English?",
            answer:
              "Currently search works best with English country names. Type the common English name (e.g. 'Morocco' not 'Maroc') for best results.",
          },
          {
            question: "Is the population data up to date?",
            answer:
              "Population figures reflect the most recent values from the bundled dataset. For real-time census statistics, consult official national sources.",
          },
          {
            question: "How do I find neighboring countries?",
            answer:
              "After selecting a country, scroll down to the Bordering Countries section. Click any neighbor chip to instantly jump to that country's profile.",
          },
          {
            question: "Can I see the country on a map?",
            answer:
              "Yes. Each country profile includes a 'View on Maps' link that opens Google Maps centered on that country.",
          },
          {
            question: "What information is shown for each country?",
            answer:
              "Flag, official and common name, capital, region, population, area, currency (with symbol), official languages, top-level domain, calling code, driving side, timezones, and bordering countries.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The country list and profile cards are fully responsive and optimized for smartphone browsing.",
          },
        ]}
      />

      <RelatedTools currentSlug="country-info" />
    </ToolPageShell>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
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
