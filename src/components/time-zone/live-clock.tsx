import { motion } from "framer-motion";
import type { City } from "@/lib/time-zone/cities";
import {
  formatWeekdayDate,
  getPartsInTz,
  getTimeOfDay,
  getTzAbbr,
  getUTCOffset,
  isDaytime,
  pad2,
  to12h,
} from "@/lib/time-zone/utils";

interface Props {
  city: City;
  now: Date;
  size?: "lg" | "md";
}

export function LiveClock({ city, now, size = "lg" }: Props) {
  const parts = getPartsInTz(now, city.timezone);
  const offset = getUTCOffset(city.timezone, now);
  const abbr = getTzAbbr(city.timezone, now);
  const tod = getTimeOfDay(parts.hour);
  const day = isDaytime(parts.hour);
  const twelve = to12h(parts.hour);
  const dateLabel = formatWeekdayDate(parts);

  const tint = day
    ? "color-mix(in oklab, #f59e0b 8%, var(--card))"
    : "color-mix(in oklab, #3b82f6 8%, var(--card))";
  const accent = day ? "#f59e0b" : "#60a5fa";

  const isLarge = size === "lg";

  return (
    <div
      className="rounded-2xl border border-border p-5 sm:p-6 transition-colors"
      style={{ background: tint }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{city.emoji}</span>
            <h3 className={isLarge ? "font-display text-xl font-bold truncate" : "font-display text-base font-bold truncate"}>
              {city.name}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{city.country}</p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[11px]"
          title={tod.label}
        >
          <span aria-hidden>{tod.emoji}</span>
          <span className="text-muted-foreground">{tod.label}</span>
        </span>
      </div>

      <div className="mt-4">
        <motion.div
          key={`${parts.hour}:${parts.minute}:${parts.second}`}
          initial={{ opacity: 0.6, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          aria-live="polite"
          aria-atomic="true"
          className={
            isLarge
              ? "font-display font-bold tabular-nums leading-none"
              : "font-display font-bold tabular-nums leading-none"
          }
          style={{ fontSize: isLarge ? "clamp(2.25rem, 6vw, 3.5rem)" : "1.75rem", color: accent }}
        >
          {pad2(parts.hour)}
          <span className="opacity-60 animate-pulse">:</span>
          {pad2(parts.minute)}
          <span className="opacity-60 animate-pulse">:</span>
          {pad2(parts.second)}
        </motion.div>
        <div className="mt-1.5 text-sm text-muted-foreground">
          {twelve.h}:{pad2(parts.minute)} {twelve.suffix}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{dateLabel}</span>
        <span className="opacity-40">•</span>
        <span className="font-mono">{offset}</span>
        {abbr && (
          <>
            <span className="opacity-40">•</span>
            <span className="font-medium" style={{ color: accent }}>{abbr}</span>
          </>
        )}
      </div>
    </div>
  );
}
