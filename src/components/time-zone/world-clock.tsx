import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitySelect } from "./city-select";
import { CITIES, cityKey, findCity, type City } from "@/lib/time-zone/cities";
import {
  getPartsInTz,
  getTimeOfDay,
  getUTCOffset,
  isDaytime,
  pad2,
} from "@/lib/time-zone/utils";

const STORAGE_KEY = "tz-world-clock-cities";
const MAX_CITIES = 12;

const DEFAULT_NAMES = ["New York", "London", "Berlin", "Dubai", "Mumbai", "Singapore", "Tokyo", "Sydney"];

function loadStored(): City[] {
  if (typeof window === "undefined") return DEFAULT_NAMES.map((n) => CITIES.find((c) => c.name === n)!).filter(Boolean);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) throw new Error("bad");
    const cities = arr
      .filter((x): x is string => typeof x === "string")
      .map((k) => findCity(k))
      .filter((c): c is City => !!c);
    if (cities.length === 0) throw new Error("none");
    return cities.slice(0, MAX_CITIES);
  } catch {
    return DEFAULT_NAMES.map((n) => CITIES.find((c) => c.name === n)).filter((c): c is City => !!c);
  }
}

function save(cities: City[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cities.map(cityKey)));
  } catch {
    /* ignore */
  }
}

export function WorldClock({ now }: { now: Date }) {
  const [cities, setCities] = useState<City[]>(() => loadStored());
  const [editMode, setEditMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<City>(() => CITIES.find((c) => c.name === "Paris") ?? CITIES[0]);

  useEffect(() => {
    save(cities);
  }, [cities]);

  const excludeKeys = useMemo(() => cities.map(cityKey), [cities]);

  function removeAt(idx: number) {
    setCities((c) => c.filter((_, i) => i !== idx));
  }
  function addCity() {
    if (cities.length >= MAX_CITIES) return;
    if (excludeKeys.includes(cityKey(pending))) return;
    setCities((c) => [...c, pending]);
    setAdding(false);
  }

  return (
    <section className="mt-12">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">World Clock</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live time across your cities — up to {MAX_CITIES}. Saved to your browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cities.length < MAX_CITIES && !adding && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add city
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((v) => !v)}
            className="gap-1.5"
          >
            {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? "Done" : "Edit"}
          </Button>
        </div>
      </header>

      {adding && (
        <div className="mb-5 rounded-2xl border border-border bg-card/40 p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
          <CitySelect value={pending} onChange={setPending} now={now} label="City to add" excludeKeys={excludeKeys} />
          <Button type="button" onClick={addCity} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cities.map((c, i) => (
          <WorldClockCard
            key={`${cityKey(c)}-${i}`}
            city={c}
            now={now}
            editMode={editMode}
            onRemove={() => removeAt(i)}
          />
        ))}
      </div>
    </section>
  );
}

function WorldClockCard({
  city,
  now,
  editMode,
  onRemove,
}: {
  city: City;
  now: Date;
  editMode: boolean;
  onRemove: () => void;
}) {
  const parts = getPartsInTz(now, city.timezone);
  const day = isDaytime(parts.hour);
  const tod = getTimeOfDay(parts.hour);
  const offset = getUTCOffset(city.timezone, now);
  const tint = day
    ? "color-mix(in oklab, #f59e0b 8%, var(--card))"
    : "color-mix(in oklab, #3b82f6 8%, var(--card))";
  const accent = day ? "#f59e0b" : "#60a5fa";

  // Detect ±1 day vs viewer's local date
  const localIso = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const cityIso = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const dayBadge = cityIso === localIso ? null : cityIso > localIso ? "+1" : "−1";

  return (
    <div
      className="relative rounded-xl border border-border p-4 transition-colors"
      style={{ background: tint }}
    >
      {editMode && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${city.name}`}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{city.emoji}</span>
            <span className="font-semibold text-sm truncate">{city.name}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
            {parts.weekday.slice(0, 3)}
            {dayBadge && (
              <span className="ml-1" style={{ color: accent }}>
                ({dayBadge})
              </span>
            )}
          </div>
        </div>
        <span className="text-base leading-none" title={tod.label} aria-label={tod.label}>
          {tod.emoji}
        </span>
      </div>
      <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tabular-nums leading-none" style={{ color: accent }}>
        {pad2(parts.hour)}
        <span className="opacity-60 animate-pulse">:</span>
        {pad2(parts.minute)}
      </div>
      <div className="mt-2 text-[10px] font-mono text-muted-foreground">{offset}</div>
    </div>
  );
}
