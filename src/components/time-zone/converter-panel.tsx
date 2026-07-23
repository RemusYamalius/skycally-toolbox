import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CitySelect } from "./city-select";
import { LiveClock } from "./live-clock";
import type { City } from "@/lib/time-zone/cities";
import { CITIES, cityKey } from "@/lib/time-zone/cities";
import {
  convertSpecificTime,
  formatWeekdayDate,
  getHourDiff,
  getPartsInTz,
  pad2,
  to12h,
} from "@/lib/time-zone/utils";

function findByName(name: string): City {
  const c = CITIES.find((x) => x.name === name);
  if (!c) throw new Error(`City not found: ${name}`);
  return c;
}

export function ConverterPanel({ now }: { now: Date }) {
  const [from, setFrom] = useState<City>(() => findByName("New York"));
  const [to, setTo] = useState<City>(() => findByName("London"));
  const [swapKey, setSwapKey] = useState(0);

  // Specific time inputs
  const [inputTime, setInputTime] = useState<string>(() => {
    const p = getPartsInTz(new Date(), "America/New_York");
    return `${pad2(p.hour)}:${pad2(p.minute)}`;
  });

  useEffect(() => {
    // When "from" changes, refresh the default input to that city's current time
    const p = getPartsInTz(new Date(), from.timezone);
    setInputTime(`${pad2(p.hour)}:${pad2(p.minute)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.timezone]);

  const diff = useMemo(() => getHourDiff(from.timezone, to.timezone, now), [from.timezone, to.timezone, now]);
  const diffAbs = Math.abs(diff);
  const diffH = Math.floor(diffAbs);
  const diffM = Math.round((diffAbs - diffH) * 60);
  const diffLabel = `${diff >= 0 ? "+" : "-"}${diffH}${diffM ? `:${pad2(diffM)}` : "h"}`;
  const diffSentence =
    diff === 0
      ? `${to.name} is in the same time zone as ${from.name}`
      : diff > 0
        ? `${to.name} is ${diffH}${diffM ? `h ${diffM}m` : " hour" + (diffH === 1 ? "" : "s")} ahead of ${from.name}`
        : `${to.name} is ${diffH}${diffM ? `h ${diffM}m` : " hour" + (diffH === 1 ? "" : "s")} behind ${from.name}`;

  function swap() {
    setFrom(to);
    setTo(from);
    setSwapKey((k) => k + 1);
  }

  // Specific time conversion
  const parsed = /^(\d{1,2}):(\d{2})$/.exec(inputTime.trim());
  const specific = parsed
    ? (() => {
        const hh = Math.max(0, Math.min(23, Number(parsed[1])));
        const mm = Math.max(0, Math.min(59, Number(parsed[2])));
        const srcParts = getPartsInTz(now, from.timezone);
        const anchor = new Date(now);
        const destParts = convertSpecificTime(hh, mm, from.timezone, to.timezone, anchor);
        // Determine day diff
        const srcIso = `${srcParts.year}-${pad2(srcParts.month)}-${pad2(srcParts.day)}`;
        const destIso = `${destParts.year}-${pad2(destParts.month)}-${pad2(destParts.day)}`;
        const dayDiff = srcIso === destIso ? 0 : srcIso < destIso ? 1 : -1;
        return { hh, mm, destParts, dayDiff };
      })()
    : null;

  return (
    <section className="grid gap-6">
      {/* Two-city clocks */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="grid gap-3">
          <CitySelect value={from} onChange={setFrom} now={now} label="From" excludeKeys={[cityKey(to)]} />
          <LiveClock city={from} now={now} />
        </div>

        <div className="flex md:flex-col items-center justify-center gap-3 md:gap-4">
          <motion.div
            key={swapKey}
            initial={{ rotate: 0 }}
            animate={{ rotate: 180 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swap}
              aria-label="Swap origin and destination cities"
              className="rounded-full h-11 w-11"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </motion.div>
          <span
            className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-mono tabular-nums"
            style={{ background: "var(--card)" }}
            aria-label={diffSentence}
          >
            {diffLabel}
          </span>
        </div>

        <div className="grid gap-3">
          <CitySelect value={to} onChange={setTo} now={now} label="To" excludeKeys={[cityKey(from)]} />
          <LiveClock city={to} now={now} />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">{diffSentence}</p>

      {/* Specific time converter */}
      <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
        <h3 className="font-display text-base font-bold">Convert a specific time</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a time in {from.name} to see what it will be in {to.name}.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="grid gap-1.5">
            <label htmlFor="tz-time-input" className="text-xs uppercase tracking-wide text-muted-foreground">
              Time in {from.name}
            </label>
            <Input
              id="tz-time-input"
              type="time"
              value={inputTime}
              onChange={(e) => setInputTime(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>

          <div className="hidden sm:flex items-center justify-center pb-2 text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Time in {to.name}</span>
            {specific ? (
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <div className="font-display text-2xl font-bold tabular-nums" style={{ color: "var(--cyan-brand)" }}>
                  {pad2(specific.destParts.hour)}:{pad2(specific.destParts.minute)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {(() => {
                    const t = to12h(specific.destParts.hour);
                    return `${t.h}:${pad2(specific.destParts.minute)} ${t.suffix}`;
                  })()}
                  {" · "}
                  {formatWeekdayDate(specific.destParts)}
                  {specific.dayDiff !== 0 && (
                    <span
                      className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        color: specific.dayDiff > 0 ? "#22c55e" : "#f59e0b",
                        background: `color-mix(in oklab, ${specific.dayDiff > 0 ? "#22c55e" : "#f59e0b"} 15%, transparent)`,
                      }}
                    >
                      {specific.dayDiff > 0 ? "+1 day" : "−1 day"}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
                Enter a valid time
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
