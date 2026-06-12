import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, CloudRain, Loader2, Search, Sun, Sunrise, Sunset, Wind as WindIcon } from "lucide-react";

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

interface HourlyEntry {
  time: string;
  code: number;
  temp: number;
  precip: number;
}

interface WeatherData {
  name: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  current: {
    temp: number;
    feels: number;
    humidity: number;
    wind: number;
    precip: number;
    code: number;
    uvMax: number;
    sunrise: string;
    sunset: string;
  };
  daily: DailyEntry[];
  hourly: HourlyEntry[];
  aqi: number | null;
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

function uvInfo(uv: number): { emoji: string; label: string } {
  if (uv <= 2) return { emoji: "🟢", label: "Low" };
  if (uv <= 5) return { emoji: "🟡", label: "Moderate" };
  if (uv <= 7) return { emoji: "🟠", label: "High" };
  if (uv <= 10) return { emoji: "🔴", label: "Very High" };
  return { emoji: "🟣", label: "Extreme" };
}

function aqiInfo(aqi: number): { emoji: string; label: string } {
  if (aqi <= 20) return { emoji: "🟢", label: "Good" };
  if (aqi <= 40) return { emoji: "🟡", label: "Fair" };
  if (aqi <= 60) return { emoji: "🟠", label: "Moderate" };
  if (aqi <= 80) return { emoji: "🔴", label: "Poor" };
  if (aqi <= 100) return { emoji: "🟣", label: "Very Poor" };
  return { emoji: "⚫", label: "Extremely Poor" };
}

function formatTimeInTz(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  } catch {
    return iso.slice(11, 16);
  }
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("forecast failed");
  return res.json();
}

async function fetchAirQuality(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const v = json?.current?.european_aqi;
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
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
      const [place, f, aqi] = await Promise.all([
        label ? Promise.resolve(label) : reverseGeocode(lat, lon),
        fetchForecast(lat, lon),
        fetchAirQuality(lat, lon),
      ]);
      const daily: DailyEntry[] = f.daily.time.map((t: string, i: number) => ({
        date: t,
        code: f.daily.weather_code[i],
        max: f.daily.temperature_2m_max[i],
        min: f.daily.temperature_2m_min[i],
        precip: f.daily.precipitation_probability_max[i] ?? 0,
      }));
      const hourly: HourlyEntry[] = (f.hourly?.time ?? []).map((t: string, i: number) => ({
        time: t,
        code: f.hourly.weather_code[i],
        temp: f.hourly.temperature_2m[i],
        precip: f.hourly.precipitation_probability?.[i] ?? 0,
      }));
      setData({
        name: place.name,
        country: place.country,
        timezone: f.timezone ?? "UTC",
        lat,
        lon,
        current: {
          temp: f.current.temperature_2m,
          feels: f.current.apparent_temperature,
          humidity: f.current.relative_humidity_2m,
          wind: f.current.wind_speed_10m,
          precip: f.current.precipitation_probability ?? 0,
          code: f.current.weather_code,
          uvMax: f.daily.uv_index_max?.[0] ?? 0,
          sunrise: f.daily.sunrise?.[0] ?? "",
          sunset: f.daily.sunset?.[0] ?? "",
        },
        daily,
        hourly,
        aqi,
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
  const uv = data ? uvInfo(data.current.uvMax) : null;
  const aq = data && data.aqi !== null ? aqiInfo(data.aqi) : null;

  const mapSrc = data
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${data.lon - 0.1}%2C${data.lat - 0.1}%2C${data.lon + 0.1}%2C${data.lat + 0.1}&layer=mapnik&marker=${data.lat}%2C${data.lon}`
    : "";

  return (
    <ToolPageShell
      title="Weather Checker"
      description="Get the current weather, 24-hour forecast, 7-day outlook, UV index, air quality and sunrise/sunset times for any city."
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
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold">
              {data.name}
              {data.country ? `, ${data.country}` : ""}
            </h2>
            <div className="mt-4 text-6xl sm:text-7xl font-display font-bold tracking-tight">
              {Math.round(data.current.temp)}°C
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-4xl leading-none" aria-hidden>{cur.emoji}</span>
              <span className="text-base text-muted-foreground">{cur.label}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatTile icon={<Thermometer className="w-4 h-4" />} label="Feels Like" value={`${Math.round(data.current.feels)}°C`} />
            <StatTile icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${data.current.humidity}%`} />
            <StatTile icon={<Wind className="w-4 h-4" />} label="Wind Speed" value={`${Math.round(data.current.wind)} km/h`} />
            <StatTile icon={<CloudRain className="w-4 h-4" />} label="Precipitation" value={`${data.current.precip}%`} />
            <StatTile
              icon={<Sunrise className="w-4 h-4" />}
              label="Sunrise"
              value={data.current.sunrise ? `🌅 ${formatTimeInTz(data.current.sunrise, data.timezone)}` : "—"}
            />
            <StatTile
              icon={<Sunset className="w-4 h-4" />}
              label="Sunset"
              value={data.current.sunset ? `🌇 ${formatTimeInTz(data.current.sunset, data.timezone)}` : "—"}
            />
            {uv && (
              <StatTile
                icon={<Sun className="w-4 h-4" />}
                label="UV Index"
                value={`${Math.round(data.current.uvMax)} ${uv.emoji} ${uv.label}`}
              />
            )}
            <StatTile
              icon={<WindIcon className="w-4 h-4" />}
              label="Air Quality"
              value={aq && data.aqi !== null ? `${Math.round(data.aqi)} ${aq.emoji} ${aq.label}` : "—"}
            />
          </div>
        </motion.div>
      )}

      {data && data.hourly.length > 0 && (
        <section className="mt-8">
          <h3 className="font-display text-lg font-bold mb-3">24-Hour Forecast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {data.hourly.map((h, i) => {
              const info = wmoInfo(h.code);
              return (
                <div
                  key={h.time}
                  className="shrink-0 w-20 rounded-xl border border-border bg-card/40 p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground">
                    {i === 0 ? "Now" : formatTimeInTz(h.time, data.timezone)}
                  </div>
                  <div className="text-2xl my-1.5" aria-hidden>{info.emoji}</div>
                  <div className="text-sm font-medium">{Math.round(h.temp)}°</div>
                  <div className="mt-1 text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <CloudRain className="w-3 h-3" /> {h.precip}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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

      {data && (
        <section className="mt-8">
          <h3 className="font-display text-lg font-bold mb-3">📍 {data.name} on the map</h3>
          <iframe
            key={mapSrc}
            src={mapSrc}
            title={`${data.name} map`}
            loading="lazy"
            className="w-full h-[200px] rounded-xl border border-border bg-card/40"
          />
        </section>
      )}

      <HowToUse
        steps={[
          "Type any city name in the search box (or allow location access for your area).",
          "Click Check Weather to fetch current conditions, 24-hour and 7-day forecasts.",
          "Review temperature, UV index, air quality, sunrise/sunset and the city map instantly.",
        ]}
      />

      <ToolSeoContent
        title="Weather Checker — Free Live Forecast, UV Index & Air Quality"
        description="Check the current weather, 24-hour forecast, 7-day outlook, UV index, air quality and sunrise/sunset times for any city. Free, instant, runs entirely in your browser."
        body={[
          "Weather Checker is a free weather checker no signup tool powered by the Open-Meteo API. Type any city and you instantly see live conditions, an hourly weather forecast free for the next 24 hours, and a 7-day outlook. There is no API key, no app to install, and nothing to register — results appear in your browser in under a second.",
          "Beyond temperature and wind, the tool doubles as a uv index checker free of charge and an air quality index online dashboard. Each search returns today's max UV with a color-coded risk level (Low → Extreme) and the European AQI with a Good → Extremely Poor scale, so you can decide when to apply sunscreen, open the windows, or keep an N95 handy.",
          "Sunrise sunset times are shown in the city's local timezone, alongside humidity, precipitation probability, feels-like temperature and an OpenStreetMap map of the location. Privacy is built in: we do not store searches, IP addresses, or geolocation. If you grant location permission, your coordinates are used only once to fetch the forecast from Open-Meteo (which aggregates NOAA, ECMWF and 15+ national weather services).",
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
