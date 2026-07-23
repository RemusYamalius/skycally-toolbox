import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitySelect } from "./city-select";
import { CITIES, cityKey, findCity, type City } from "@/lib/time-zone/cities";
import {
  convertSpecificTime,
  getPartsInTz,
  getTimeQuality,
  pad2,
  to12h,
  type TimeQuality,
} from "@/lib/time-zone/utils";

const STORAGE_KEY = "tz-meeting-cities";
const MAX_PARTICIPANTS = 5;
const DEFAULT_NAMES = ["New York", "London", "Tokyo"];

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
    return cities.slice(0, MAX_PARTICIPANTS);
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

const QUALITY_STYLE: Record<TimeQuality, { bg: string; label: string }> = {
  ideal: { bg: "color-mix(in oklab, #22c55e 20%, var(--card))", label: "Ideal" },
  acceptable: { bg: "color-mix(in oklab, #f59e0b 18%, var(--card))", label: "OK" },
  poor: { bg: "color-mix(in oklab, #f97316 22%, var(--card))", label: "Poor" },
  bad: { bg: "color-mix(in oklab, #ef4444 22%, var(--card))", label: "Bad" },
};

interface OverlapResult {
  startHour: number;
  endHour: number; // inclusive
  length: number;
}

function findBestOverlap(qualitiesByRow: TimeQuality[][]): OverlapResult | null {
  const rowOk = qualitiesByRow.map((row) => row.every((q) => q === "ideal" || q === "acceptable"));
  let best: OverlapResult | null = null;
  let runStart = -1;
  for (let i = 0; i < rowOk.length; i++) {
    if (rowOk[i]) {
      if (runStart === -1) runStart = i;
      const runEnd = i;
      const length = runEnd - runStart + 1;
      if (!best || length > best.length) {
        best = { startHour: runStart, endHour: runEnd, length };
      }
    } else {
      runStart = -1;
    }
  }
  return best;
}

export function MeetingPlanner({ now }: { now: Date }) {
  const [cities, setCities] = useState<City[]>(() => loadStored());
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<City>(() => CITIES.find((c) => c.name === "Berlin") ?? CITIES[0]);

  useEffect(() => {
    save(cities);
  }, [cities]);

  const excludeKeys = useMemo(() => cities.map(cityKey), [cities]);
  const anchor = cities[0];

  const rows = useMemo(() => {
    if (!anchor) return [];
    const anchorParts = getPartsInTz(now, anchor.timezone);
    const anchorDate = new Date(now);
    return Array.from({ length: 24 }, (_, h) => {
      const cells = cities.map((c) => {
        const dest = convertSpecificTime(h, 0, anchor.timezone, c.timezone, anchorDate);
        const q = getTimeQuality(dest.hour);
        const anchorIso = `${anchorParts.year}-${pad2(anchorParts.month)}-${pad2(anchorParts.day)}`;
        const destIso = `${dest.year}-${pad2(dest.month)}-${pad2(dest.day)}`;
        const dayDiff = anchorIso === destIso ? 0 : anchorIso < destIso ? 1 : -1;
        return { hour: dest.hour, minute: dest.minute, quality: q, dayDiff };
      });
      return { anchorHour: h, cells };
    });
  }, [cities, now, anchor]);

  const overlap = useMemo(() => {
    if (rows.length === 0) return null;
    return findBestOverlap(rows.map((r) => r.cells.map((c) => c.quality)));
  }, [rows]);

  function addCity() {
    if (cities.length >= MAX_PARTICIPANTS) return;
    if (excludeKeys.includes(cityKey(pending))) return;
    setCities((c) => [...c, pending]);
    setAdding(false);
  }
  function removeAt(idx: number) {
    if (cities.length <= 1) return;
    setCities((c) => c.filter((_, i) => i !== idx));
  }

  return (
    <section className="mt-12">
      <header className="mb-5">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Meeting Planner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Find the best overlap window for a remote team across time zones.
        </p>
      </header>

      {/* Participants row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {cities.map((c, i) => (
          <span
            key={`p-${cityKey(c)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 pl-3 pr-1 py-1 text-sm"
          >
            <span className="leading-none">{c.emoji}</span>
            <span className="font-medium">{c.name}</span>
            {cities.length > 1 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${c.name}`}
                className="h-5 w-5 rounded-full hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {cities.length < MAX_PARTICIPANTS && !adding && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add participant
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-border bg-card/40 p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
          <CitySelect value={pending} onChange={setPending} now={now} label="Add participant" excludeKeys={excludeKeys} />
          <Button type="button" onClick={addCity} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Overlap summary */}
      {overlap && anchor && (
        <div
          className="mb-4 rounded-xl border border-border p-3 text-sm"
          style={{ background: "color-mix(in oklab, #22c55e 12%, var(--card))" }}
        >
          <span className="font-medium" style={{ color: "#22c55e" }}>
            ✓ Best overlap:
          </span>{" "}
          <span className="text-foreground">
            {formatHour(overlap.startHour)} – {formatHour(overlap.endHour + 1)} in {anchor.name} (
            {overlap.length} {overlap.length === 1 ? "hour" : "hours"} where everyone is in working hours)
          </span>
        </div>
      )}
      {!overlap && cities.length >= 2 && (
        <div
          className="mb-4 rounded-xl border border-border p-3 text-sm"
          style={{ background: "color-mix(in oklab, #ef4444 10%, var(--card))" }}
        >
          <span className="font-medium" style={{ color: "#ef4444" }}>
            No ideal overlap.
          </span>{" "}
          <span className="text-muted-foreground">
            Someone will need to meet outside 7 AM – 8 PM local time.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card/80 backdrop-blur px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {anchor?.name}
              </th>
              {cities.slice(1).map((c) => (
                <th key={`h-${cityKey(c)}`} className="px-3 py-2 text-left text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{c.emoji}</span>
                    <span className="font-semibold">{c.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const inOverlap =
                overlap && row.anchorHour >= overlap.startHour && row.anchorHour <= overlap.endHour;
              return (
                <tr key={`r-${row.anchorHour}`} className="border-b border-border/40 last:border-0">
                  <td
                    className="sticky left-0 z-10 bg-card/80 backdrop-blur px-3 py-1.5 font-mono tabular-nums text-xs"
                    style={
                      inOverlap
                        ? { background: "color-mix(in oklab, #22c55e 14%, var(--card))" }
                        : undefined
                    }
                  >
                    {pad2(row.anchorHour)}:00
                  </td>
                  {row.cells.slice(1).map((cell, i) => {
                    const style = QUALITY_STYLE[cell.quality];
                    const twelve = to12h(cell.hour);
                    return (
                      <td
                        key={`c-${row.anchorHour}-${i}`}
                        className="px-3 py-1.5"
                        style={{ background: style.bg }}
                        title={style.label}
                      >
                        <div className="font-mono tabular-nums text-xs">
                          {pad2(cell.hour)}:{pad2(cell.minute)}
                          <span className="ml-1.5 text-muted-foreground">
                            {twelve.h}
                            {twelve.suffix.toLowerCase()}
                          </span>
                          {cell.dayDiff !== 0 && (
                            <span className="ml-1 text-[10px] opacity-70">
                              {cell.dayDiff > 0 ? "+1d" : "−1d"}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(["ideal", "acceptable", "poor", "bad"] as TimeQuality[]).map((q) => (
          <span key={q} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded border border-border"
              style={{ background: QUALITY_STYLE[q].bg }}
            />
            {QUALITY_STYLE[q].label}
          </span>
        ))}
      </div>
    </section>
  );
}

function formatHour(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  const t = to12h(hour);
  return `${t.h} ${t.suffix}`;
}
