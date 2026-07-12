import { addDays, differenceInDays, format, isValid } from "date-fns";

export type Method = "lmp" | "due" | "conception";

export interface PregnancyResult {
  lmp: Date;
  dueDate: Date;
  conception: Date;
  today: Date;
  gestDays: number; // days since LMP
  weeks: number;
  days: number; // 0-6 within current week
  trimester: 1 | 2 | 3;
  progressPct: number; // 0-100
  daysRemaining: number; // negative if overdue
  weeksRemaining: number;
  overdueDays: number; // >0 if past due
  status: "very-early" | "normal" | "overdue" | "very-overdue";
}

export interface PregnancyError {
  error: string;
}

export type PregnancyOutput = PregnancyResult | PregnancyError;

function normalizeDate(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function clampCycle(cycle: number): number {
  if (!Number.isFinite(cycle) || cycle <= 0) return 28;
  return Math.max(20, Math.min(45, Math.round(cycle)));
}

export function computeFromLMP(lmpInput: Date, cycleLen = 28, todayInput = new Date()): PregnancyOutput {
  if (!isValid(lmpInput)) return { error: "Please enter a valid date." };
  const today = normalizeDate(todayInput);
  const lmp = normalizeDate(lmpInput);
  const cycle = clampCycle(cycleLen);
  const adj = cycle - 28;

  if (lmp.getTime() > today.getTime()) {
    return { error: "The date can't be in the future. Please check and try again." };
  }

  const gestDays = differenceInDays(today, lmp);
  if (gestDays > 320) {
    return { error: "That date is more than 45 weeks ago — please double-check." };
  }
  const dueDate = addDays(lmp, 280 + adj);
  const conception = addDays(lmp, 14 + adj);

  const weeks = Math.floor(gestDays / 7);
  const days = gestDays % 7;
  const trimester: 1 | 2 | 3 = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  const progressPct = Math.max(0, Math.min(100, (gestDays / 280) * 100));
  const daysRemaining = differenceInDays(dueDate, today);
  const weeksRemaining = Math.floor(Math.max(0, daysRemaining) / 7);
  const overdueDays = Math.max(0, -daysRemaining);

  let status: PregnancyResult["status"] = "normal";
  if (weeks < 4) status = "very-early";
  else if (overdueDays > 14) status = "very-overdue";
  else if (overdueDays > 0) status = "overdue";

  return {
    lmp,
    dueDate,
    conception,
    today,
    gestDays,
    weeks,
    days,
    trimester,
    progressPct,
    daysRemaining,
    weeksRemaining,
    overdueDays,
    status,
  };
}

export function computeFromDueDate(dueInput: Date, todayInput = new Date()): PregnancyOutput {
  if (!isValid(dueInput)) return { error: "Please enter a valid date." };
  const lmp = addDays(normalizeDate(dueInput), -280);
  return computeFromLMP(lmp, 28, todayInput);
}

export function computeFromConception(conceptionInput: Date, todayInput = new Date()): PregnancyOutput {
  if (!isValid(conceptionInput)) return { error: "Please enter a valid date." };
  const today = normalizeDate(todayInput);
  if (normalizeDate(conceptionInput).getTime() > today.getTime()) {
    return { error: "The conception date can't be in the future." };
  }
  const lmp = addDays(normalizeDate(conceptionInput), -14);
  return computeFromLMP(lmp, 28, todayInput);
}

export interface KeyDate {
  label: string;
  week: number;
  date: string; // formatted
}

export function buildKeyDates(lmp: Date): KeyDate[] {
  const rows: Array<{ label: string; week: number }> = [
    { label: "First heartbeat detectable", week: 6 },
    { label: "End of first trimester", week: 13 },
    { label: "Anatomy scan window", week: 18 },
    { label: "Viability milestone", week: 24 },
    { label: "Third trimester begins", week: 28 },
    { label: "Full term", week: 39 },
    { label: "Due date", week: 40 },
  ];
  return rows.map((r) => ({
    label: r.label,
    week: r.week,
    date: format(addDays(lmp, r.week * 7), "MMM d, yyyy"),
  }));
}

export function isPregnancyError(o: PregnancyOutput): o is PregnancyError {
  return (o as PregnancyError).error !== undefined;
}
