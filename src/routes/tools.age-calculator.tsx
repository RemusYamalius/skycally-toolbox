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
  const defaultDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
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
        <Input type="date" value={birthday} max={today.toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} className="text-lg" />
      </div>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_15%,transparent)] to-card p-6 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">You are</div>
            <div className="font-display text-5xl sm:text-6xl font-extrabold mt-2">
              {result.years} <span className="text-2xl font-bold text-muted-foreground">years</span>{" "}
              {result.months} <span className="text-2xl font-bold text-muted-foreground">months</span>{" "}
              {result.days} <span className="text-2xl font-bold text-muted-foreground">days</span>
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
                {result.nextBirthday.date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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

      <HowToUse steps={[
        "Pick your date of birth using the date picker",
        "See your exact age in years, months and days",
        "Check total days lived and how long until your next birthday",
      ]} />

      <ToolSeoContent
        title="Age Calculator — Calculate Exact Age in Years, Months & Days"
        description="Free online age calculator. Enter your date of birth and instantly see your exact age, total days lived and a countdown to your next birthday."
        body={[
          "Skycally's Age Calculator gives you a precise breakdown of your age the moment you enter your date of birth. Instead of just a year count, you get years, months and days — the same way a doctor or official document would describe an age — plus useful totals like the number of days, weeks, hours and minutes you've been alive.",
          "It also tells you exactly when your next birthday falls and how many days are left until then, which makes it handy for planning, gifts, paperwork, or just a bit of fun. The calculation accounts for varying month lengths and leap years, so the result is always accurate.",
          "Everything is computed in your browser. Your date of birth is never sent to a server, never stored and never logged. Use it for yourself, your kids, friends or any historical figure whose birth date you're curious about.",
        ]}
        faqs={[
          { question: "How is the exact age calculated?", answer: "We compare year, month and day separately, borrowing from the next-larger unit when needed. This matches how official documents and doctors describe a person's age." },
          { question: "Does it handle leap years?", answer: "Yes. The calculation uses real calendar dates, so leap years and varying month lengths are accounted for automatically." },
          { question: "Can I calculate someone else's age?", answer: "Yes. Just enter their date of birth — the tool works for anyone, living or historical." },
          { question: "Is my data saved?", answer: "No. The date of birth stays in your browser and is cleared when you close the tab." },
        ]}
      />

      <RelatedTools currentSlug="age-calculator" />
    </ToolPageShell>
  );
}
