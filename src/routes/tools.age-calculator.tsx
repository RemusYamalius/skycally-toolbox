import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/age-calculator")({
  head: () => buildToolMeta(toolBySlug("age-calculator", tools)),
  component: AgeCalculator,
});

function diff(birth: Date, today: Date) {
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.floor((today.getTime() - birth.getTime()) / 86_400_000);
  return { years, months, days, totalDays };
}

function nextBirthday(birth: Date, today: Date) {
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  const days = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
  return { date: next, days };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="font-display text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function AgeCalculator() {
  const tool = toolBySlug("age-calculator", tools);
  const today = new Date();
  const defaultDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const [birthday, setBirthday] = useState<string>(defaultDate);

  const result = useMemo(() => {
    if (!birthday) return null;
    const b = new Date(birthday);
    if (isNaN(b.getTime()) || b > today) return null;
    const d = diff(b, today);
    const nb = nextBirthday(b, today);
    return { ...d, nextBirthday: nb };
  }, [birthday, today]);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="rounded-2xl border border-border bg-card p-5 max-w-md">
        <label className="block text-sm font-medium mb-2">Your date of birth</label>
        <Input
          type="date"
          value={birthday}
          max={today.toISOString().slice(0, 10)}
          onChange={(e) => setBirthday(e.target.value)}
          className="text-lg"
        />
      </div>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_15%,transparent)] to-card p-6 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">You are</div>
            <div className="font-display text-5xl sm:text-6xl font-extrabold mt-2">
              {result.years} <span className="text-2xl font-bold text-muted-foreground">years</span> {result.months}{" "}
              <span className="text-2xl font-bold text-muted-foreground">months</span> {result.days}{" "}
              <span className="text-2xl font-bold text-muted-foreground">days</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total days" value={result.totalDays.toLocaleString()} />
            <Stat label="Total weeks" value={Math.floor(result.totalDays / 7).toLocaleString()} />
            <Stat label="Total hours" value={(result.totalDays * 24).toLocaleString()} />
            <Stat label="Total minutes" value={(result.totalDays * 24 * 60).toLocaleString()} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Next birthday</div>
              <div className="font-display text-xl font-bold mt-1">
                {result.nextBirthday.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-extrabold text-[var(--green-brand)]">
                {result.nextBirthday.days} {result.nextBirthday.days === 1 ? "day" : "days"}
              </div>
              <div className="text-xs text-muted-foreground">to go</div>
            </div>
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Pick your date of birth using the date picker.",
          "See your exact age in years, months and days instantly.",
          "Check your total days, weeks, hours lived and countdown to your next birthday.",
        ]}
      />

      <ToolSeoContent
        title="Age Calculator — Exact Age in Years, Months & Days"
        description="Free online age calculator. Enter your date of birth and instantly see your exact age, total days and hours lived, and a countdown to your next birthday. No signup."
        body={[
          "Skycally's Age Calculator computes your precise age the moment you select your date of birth. Instead of just a year count, you get a complete breakdown: years, months, and days — the same level of precision used in medical records, legal documents, and official paperwork. The calculation correctly handles varying month lengths and leap years.",
          "Beyond your age, the tool shows total days, weeks, hours, and minutes you've been alive — figures that are surprisingly large and often put life into perspective. It also calculates your next birthday date and exactly how many days remain, which is useful for planning celebrations, gifts, or surprises.",
          "The calculator works for any date of birth — use it for yourself, your children, friends, historical figures, or even fictional characters. Everything runs locally in your browser with no data stored or transmitted.",
        ]}
        faqs={[
          {
            question: "How is the exact age calculated?",
            answer:
              "The calculator compares year, month, and day separately, borrowing from the next-larger unit when needed (similar to how subtraction works with carrying). For example, if today is March 5 and your birthday is April 20, the days and months are adjusted accordingly. This matches how doctors and official documents describe age.",
          },
          {
            question: "Does it handle leap years correctly?",
            answer:
              "Yes. The calculation uses actual calendar dates and JavaScript's Date object, which accounts for leap years (Feb 29 birthdays) and varying month lengths automatically. February 29 birthdays show the next birthday as March 1 in non-leap years.",
          },
          {
            question: "Can I calculate someone else's age?",
            answer:
              "Yes. Just enter any date of birth — the tool works for anyone: your children, parents, friends, historical figures, or anyone else whose birth date you know.",
          },
          {
            question: "How is the next birthday calculated?",
            answer:
              "The tool finds this year's occurrence of your birth month and day. If that date has already passed this year, it uses next year's date. The day count is the number of full days remaining from today.",
          },
          {
            question: "Why do the hours and minutes seem so large?",
            answer:
              "Hours = total days × 24, and minutes = total days × 1,440. For a 30-year-old, that's roughly 263,000 hours or 15.8 million minutes. These large numbers are accurate — we just rarely think about time at that scale.",
          },
          {
            question: "Can I use this for newborns?",
            answer:
              "Yes. For very young babies, the age shows as 0 years, 0 months, and the exact number of days since birth — which is how pediatricians track early development.",
          },
          {
            question: "Is my date of birth saved?",
            answer:
              "No. The date stays only in your browser tab and is cleared when you close it. Nothing is stored, logged, or transmitted to any server.",
          },
          {
            question: "What is the oldest date I can enter?",
            answer:
              "The calculator accepts any valid historical date. You can enter dates from the early 1900s or before, though very old dates may have calendar differences (the Gregorian calendar wasn't universally adopted until the 20th century in some countries).",
          },
        ]}
      />

      <RelatedTools currentSlug="age-calculator" />
    </ToolPageShell>
  );
}
