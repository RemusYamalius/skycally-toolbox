import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, CloudRain, Loader2, Search } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/weather-checker")({
  head: () => buildToolMeta(toolBySlug("weather-checker", tools)),
  component: WeatherChecker,
});

interface DailyEntry {
  date: string;
  code: number;
  max: number;
  min: number;
  precip: number;
}

interface WeatherData {
  name: string;
  country: string;
  current: {
    temp: number;
    feels: number;
    humidity: number;
    wind: number;
    precip: number;
    code: number;
  };
  daily: DailyEntry[];
}

function wmoInfo(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear sky", emoji: "☀️" };
  if ([1, 2, 3].includes(code)) return { label: "Partly cloudy", emoji: "🌤️" };
  if ([45, 48].includes(code)) return { label: "Foggy", emoji: "🌫️" };
  if ([51, 53, 55].includes(code)) return { label: "Drizzle", emoji: "🌦️" };
  if ([61, 63, 65].includes(code)) return { label: "Rain", emoji: "🌧️" };
  if ([71, 73, 75].includes(code)) return { label: "Snow", emoji: "❄️" };
  if ([80, 81, 82].includes(code)) return { label: "Rain showers", emoji: "🌨️" };
  if (code === 95) return { label: "Thunderstorm", emoji: "⛈️" };
  if ([96, 99].includes(code)) return { label: "Heavy thunderstorm", emoji: "🌩️" };
  return { label: "Unknown", emoji: "🌡️" };
}

async function geocode(city: string): Promise<{ lat: number; lon: number; name: string; country: string } | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );
  if (!res.ok) throw new Error("geocode failed");
  const json = await res.json();
  const r = json?.results?.[0];
  if (!r) return null;
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country ?? "" };
}

async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; country: string }> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`,
    );
    const json = await res.json();
    const r = json?.results?.[0];
    if (r) return { name: r.name, country: r.country ?? "" };
  } catch {
    // ignore
  }
  return { name: "Your location", country: "" };
}

async function fetchForecast(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("forecast failed");
  return res.json();
}

function weekday(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function WeatherChecker() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);

  async function loadByCoords(lat: number, lon: number, label?: { name: string; country: string }) {
    setLoading(true);
    setError(null);
    try {
      const place = label ?? (await reverseGeocode(lat, lon));
      const f = await fetchForecast(lat, lon);
      const daily: DailyEntry[] = f.daily.time.map((t: string, i: number) => ({
        date: t,
        code: f.daily.weather_code[i],
        max: f.daily.temperature_2m_max[i],
        min: f.daily.temperature_2m_min[i],
        precip: f.daily.precipitation_probability_max[i] ?? 0,
      }));
      setData({
        name: place.name,
        country: place.country,
        current: {
          temp: f.current.temperature_2m,
          feels: f.current.apparent_temperature,
          humidity: f.current.relative_humidity_2m,
          wind: f.current.wind_speed_10m,
          precip: f.current.precipitation_probability ?? 0,
          code: f.current.weather_code,
        },
        daily,
      });
    } catch {
      setError("Could not fetch weather, please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function search(name: string) {
    const q = name.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const g = await geocode(q);
      if (!g) {
        setError("City not found. Please try another name.");
        setLoading(false);
        return;
      }
      await loadByCoords(g.lat, g.lon, { name: g.name, country: g.country });
    } catch {
      setError("Could not fetch weather, please try again.");
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const fallback = () => {
      if (!cancelled) void search("London");
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const timer = setTimeout(fallback, 5000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          if (!cancelled) void loadByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          clearTimeout(timer);
          fallback();
        },
        { timeout: 4000 },
      );
    } else {
      fallback();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void search(city);
  }

  const cur = data ? wmoInfo(data.current.code) : null;

  return (
    <ToolPageShell
      title="Weather Checker"
      description="Get the current weather and 7-day forecast for any city in the world."
    >
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter a city, e.g. Tokyo"
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Check Weather
        </Button>
      </form>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--orange-brand)" }}>
          {error}
        </p>
      )}

      {data && cur && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 rounded-2xl border border-border bg-card/50 p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-bold">
                {data.name}
                {data.country ? `, ${data.country}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{cur.label}</p>
            </div>
            <div className="text-6xl leading-none" aria-hidden>
              {cur.emoji}
            </div>
          </div>

          <div className="mt-4 text-5xl sm:text-6xl font-display font-bold tracking-tight">
            {Math.round(data.current.temp)}°C
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<Thermometer className="w-4 h-4" />} label="Feels like" value={`${Math.round(data.current.feels)}°C`} />
            <StatTile icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${data.current.humidity}%`} />
            <StatTile icon={<Wind className="w-4 h-4" />} label="Wind" value={`${Math.round(data.current.wind)} km/h`} />
            <StatTile icon={<CloudRain className="w-4 h-4" />} label="Precip" value={`${data.current.precip}%`} />
          </div>
        </motion.div>
      )}

      {data && (
        <section className="mt-8">
          <h3 className="font-display text-lg font-bold mb-3">7-Day Forecast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {data.daily.map((d, i) => {
              const info = wmoInfo(d.code);
              return (
                <div
                  key={d.date}
                  className="shrink-0 w-32 rounded-xl border border-border bg-card/40 p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground">{i === 0 ? "Today" : weekday(d.date)}</div>
                  <div className="text-3xl my-2" aria-hidden>{info.emoji}</div>
                  <div className="text-sm font-medium">
                    {Math.round(d.max)}° / <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <CloudRain className="w-3 h-3" /> {d.precip}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <HowToUse
        steps={[
          "Type any city name in the search box (or allow location access for your area).",
          "Click Check Weather to fetch the current conditions and 7-day forecast.",
          "Review temperature, feels-like, humidity, wind, and daily outlook instantly.",
        ]}
      />

      <ToolSeoContent
        title="Weather Checker — Free Live Forecast for Any City"
        description="Check the current weather and a 7-day forecast for any city on Earth. Free, instant, and runs entirely in your browser."
        body={[
          "Weather Checker is a free online forecast tool powered by the Open-Meteo API. There is no signup, no API key, and no app to install — just type a city name and you instantly see live weather and the week ahead. Everything runs directly in your browser, so results appear in under a second.",
          "For each city you get the current temperature, the feels-like temperature, humidity, wind speed, precipitation probability, and a clear weather condition label. Below that, a 7-day strip shows the daily high and low, the rain chance, and an at-a-glance icon so you can plan your week, your commute, or your next trip with confidence.",
          "Privacy is built in. We do not store your searches, your IP, or your location. If you grant geolocation permission, your coordinates are used only once to fetch the forecast and are never sent to our servers. All calls go directly from your browser to Open-Meteo, which aggregates data from NOAA, ECMWF, and other national weather services.",
        ]}
        faqs={[
          {
            question: "How accurate is the weather data?",
            answer:
              "Data comes from Open-Meteo, which aggregates models from NOAA, ECMWF, and 15+ national weather services. Accuracy is comparable to major weather apps.",
          },
          {
            question: "Which cities are supported?",
            answer:
              "Any city or town worldwide with a population above a few thousand. Simply type the city name and the tool will find it automatically.",
          },
          {
            question: "Is the forecast updated in real time?",
            answer:
              "Yes. Every time you search, a fresh request is sent to Open-Meteo, which updates its models hourly.",
          },
          {
            question: "Do you store my location or search data?",
            answer:
              "No. Your city search and location (if you grant permission) are only used to fetch weather data. Nothing is stored or logged.",
          },
        ]}
      />

      <RelatedTools currentSlug="weather-checker" />
    </ToolPageShell>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
