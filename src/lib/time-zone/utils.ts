export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night";
export type TimeQuality = "ideal" | "acceptable" | "poor" | "bad";

export interface TzParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: string;
  hour: number; // 0-23
  minute: number;
  second: number;
  isoDate: string; // YYYY-MM-DD
}

function partsRecord(date: Date, tz: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return out;
}

export function getPartsInTz(date: Date, tz: string): TzParts {
  const p = partsRecord(date, tz);
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  let hour = Number(p.hour);
  if (hour === 24) hour = 0; // Intl edge case at midnight
  return {
    year,
    month,
    day,
    weekday: p.weekday ?? "",
    hour,
    minute: Number(p.minute),
    second: Number(p.second),
    isoDate: `${p.year}-${p.month}-${p.day}`,
  };
}

export function getUTCOffset(tz: string, date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  });
  const part = fmt.formatToParts(date).find((p) => p.type === "timeZoneName");
  const raw = part?.value ?? "GMT+00:00";
  // Normalize "GMT" / "GMT+5:30" / "GMT-04:00" -> "UTC±HH:MM"
  const m = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return "UTC+00:00";
  const sign = m[1];
  const hh = m[2].padStart(2, "0");
  const mm = (m[3] ?? "00").padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

export function getTzAbbr(tz: string, date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  });
  const part = fmt.formatToParts(date).find((p) => p.type === "timeZoneName");
  return part?.value ?? "";
}

/** Signed hour difference: how many hours `toTz` is ahead of `fromTz`. */
export function getHourDiff(fromTz: string, toTz: string, date: Date = new Date()): number {
  const from = getOffsetMinutes(fromTz, date);
  const to = getOffsetMinutes(toTz, date);
  return (to - from) / 60;
}

function getOffsetMinutes(tz: string, date: Date): number {
  const off = getUTCOffset(tz, date);
  const m = off.match(/UTC([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/** -1, 0, or +1: whether toTz's calendar date is behind, same, or ahead of fromTz. */
export function getDayOfDiff(fromTz: string, toTz: string, date: Date = new Date()): -1 | 0 | 1 {
  const a = getPartsInTz(date, fromTz).isoDate;
  const b = getPartsInTz(date, toTz).isoDate;
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

export function getTimeOfDay(hour: number): { key: TimeOfDay; emoji: string; label: string } {
  if (hour >= 5 && hour < 8) return { key: "dawn", emoji: "🌄", label: "Dawn" };
  if (hour >= 8 && hour < 12) return { key: "morning", emoji: "🌅", label: "Morning" };
  if (hour >= 12 && hour < 17) return { key: "afternoon", emoji: "☀️", label: "Afternoon" };
  if (hour >= 17 && hour < 20) return { key: "evening", emoji: "🌇", label: "Evening" };
  return { key: "night", emoji: "🌙", label: "Night" };
}

export function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 19;
}

export function getTimeQuality(hour: number): TimeQuality {
  if (hour >= 9 && hour <= 18) return "ideal";
  if (hour >= 7 && hour <= 20) return "acceptable";
  if (hour >= 6 && hour <= 22) return "poor";
  return "bad";
}

export function formatWeekdayDate(parts: TzParts): string {
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function to12h(hour: number): { h: number; suffix: "AM" | "PM" } {
  const suffix: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return { h, suffix };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Convert a specific wall-clock time (hh:mm on `date`) from `fromTz` to `toTz`.
 * Returns the destination parts.
 */
export function convertSpecificTime(
  hh: number,
  mm: number,
  fromTz: string,
  toTz: string,
  date: Date,
): TzParts {
  // Anchor date parts in source tz
  const src = getPartsInTz(date, fromTz);
  // Build a UTC timestamp that, when interpreted in fromTz, yields (src.year, src.month, src.day, hh, mm).
  // Start with naive UTC, then correct by the fromTz offset at that moment.
  const naiveUtc = Date.UTC(src.year, src.month - 1, src.day, hh, mm, 0);
  const offsetMin = getOffsetMinutes(fromTz, new Date(naiveUtc));
  const realUtc = naiveUtc - offsetMin * 60 * 1000;
  return getPartsInTz(new Date(realUtc), toTz);
}
