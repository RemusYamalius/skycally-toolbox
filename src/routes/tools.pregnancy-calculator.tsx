import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CalendarDays, Sparkles, AlertTriangle, Info } from "lucide-react";

import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";

import {
  computeFromLMP,
  computeFromDueDate,
  computeFromConception,
  buildKeyDates,
  isPregnancyError,
  type Method,
  type PregnancyOutput,
  type PregnancyResult,
} from "@/lib/pregnancy/calc";
import { BABY_SIZES, WEEKLY_DATA, nearestDataWeek } from "@/lib/pregnancy/data";

const SLUG = "pregnancy-calculator";

export const Route = createFileRoute("/tools/pregnancy-calculator")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const base = buildToolMeta(tool);
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Pregnancy Week Calculator",
            description:
              "Free pregnancy week calculator with due date estimation, baby size comparisons, week-by-week development guide, and key milestone tracking.",
            applicationCategory: "HealthApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/pregnancy-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Gestational age calculation",
              "Due date calculator",
              "Baby size by week (fruit comparisons)",
              "Week-by-week development guide",
              "Trimester tracker",
              "Key pregnancy dates",
              "Milestone alerts",
            ],
          }),
        },
      ],
    };
  },
  component: PregnancyCalculatorPage,
});

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const defaultLMP = () => {
  const d = new Date();
  d.setDate(d.getDate() - 24 * 7 - 3); // ~24w+3d
  return d.toISOString().slice(0, 10);
};

const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 16 * 7); // ~16w to go
  return d.toISOString().slice(0, 10);
};

const defaultConception = () => {
  const d = new Date();
  d.setDate(d.getDate() - 22 * 7); // ~24w gestational
  return d.toISOString().slice(0, 10);
};

function PregnancyCalculatorPage() {
  const tool = toolBySlug(SLUG, tools);

  const [method, setMethod] = useState<Method>("lmp");
  const [lmpStr, setLmpStr] = useState<string>(defaultLMP());
  const [cycleStr, setCycleStr] = useState<string>("28");
  const [dueStr, setDueStr] = useState<string>(defaultDue());
  const [conceptionStr, setConceptionStr] = useState<string>(defaultConception());

  const result: PregnancyOutput | null = useMemo(() => {
    if (method === "lmp") {
      if (!lmpStr) return null;
      const cycle = parseInt(cycleStr, 10);
      return computeFromLMP(new Date(lmpStr + "T00:00:00"), Number.isFinite(cycle) ? cycle : 28);
    }
    if (method === "due") {
      if (!dueStr) return null;
      return computeFromDueDate(new Date(dueStr + "T00:00:00"));
    }
    if (!conceptionStr) return null;
    return computeFromConception(new Date(conceptionStr + "T00:00:00"));
  }, [method, lmpStr, cycleStr, dueStr, conceptionStr]);

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <aside className="lg:col-span-2">
          <MethodToggle method={method} onChange={setMethod} />
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 space-y-4">
            {method === "lmp" && (
              <>
                <FieldDate
                  label="First day of last period"
                  value={lmpStr}
                  onChange={setLmpStr}
                  max={todayISO()}
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Average cycle length (days)</label>
                  <Input
                    type="number"
                    min={20}
                    max={45}
                    value={cycleStr}
                    onChange={(e) => setCycleStr(e.target.value)}
                    className="text-lg"
                    aria-label="Average cycle length in days"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Typical range is 20–45 days. Default 28.
                  </p>
                </div>
              </>
            )}
            {method === "due" && (
              <FieldDate label="Known due date" value={dueStr} onChange={setDueStr} />
            )}
            {method === "conception" && (
              <FieldDate
                label="Conception date"
                value={conceptionStr}
                onChange={setConceptionStr}
                max={todayISO()}
              />
            )}

            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
              This tool is for informational purposes only and is not a substitute for medical
              advice. Always consult your healthcare provider.
            </p>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-3" aria-live="polite">
          {result === null ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Enter a date to see your results.
            </div>
          ) : isPregnancyError(result) ? (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-destructive shrink-0" aria-hidden="true" />
              <p className="text-sm">{result.error}</p>
            </div>
          ) : (
            <Results r={result} />
          )}
        </section>
      </div>

      <AdZone id="pregnancy-calculator-mid" size="728x90" />

      <InternalLinks />

      <HowToUse
        steps={[
          "Enter the first day of your last menstrual period — or switch to Due Date or Conception Date if you know those instead.",
          "Instantly see how many weeks and days pregnant you are, your due date, and which trimester you are in.",
          "Scroll down to see your baby's current size, this week's development highlights, and all your key pregnancy dates.",
        ]}
      />

      <ToolSeoContent
        title="Pregnancy Week Calculator — How Far Along Am I?"
        description="Free pregnancy week calculator. Find out how many weeks pregnant you are, your due date, and what's happening with your baby this week. Week-by-week development guide."
        body={[
          "Skycally's Pregnancy Week Calculator tells you exactly how many weeks and days pregnant you are, estimates your due date, and shows you what is happening with your baby right now — all from a single date. Enter the first day of your last menstrual period (or your known due date or conception date) and the calculator instantly gives you your gestational age, trimester, days remaining, and a percentage-complete progress bar. No account required, no personal data stored.",
          "Each week of pregnancy brings remarkable changes. The week-by-week development guide describes what is happening with your baby — from the neural tube forming at week 4 to the lungs developing surfactant at week 24 to the baby settling into a head-down position at week 32. Alongside each developmental update, the guide notes what physical changes you might experience and includes a practical tip for that specific stage. The baby size card compares your baby's current size to a familiar fruit or vegetable — from a poppy seed at week 4 to a pumpkin at week 40.",
          "The trimester timeline provides a visual overview of your entire pregnancy journey, showing exactly where you are within the three trimesters and marking the key clinical milestones: first heartbeat detectable at week 6, anatomy scan window at weeks 18-22, viability milestone at week 24, and full term at week 39. The key dates card translates these milestones into actual calendar dates based on your specific due date, so you know exactly when each appointment window falls.",
          "Pregnancy nutrition and hydration are critical throughout all three trimesters. Use our Water Intake Calculator to set a precise daily fluid target — pregnant women typically need 300ml more per day than usual. Our Sleep Calculator can help you optimise rest during pregnancy, when quality sleep becomes increasingly important. For nutritional planning, the Calorie Calculator can estimate the additional calories needed during each trimester.",
        ]}
        faqs={[
          {
            question: "How is pregnancy measured in weeks?",
            answer:
              "Pregnancy is measured from the first day of your last menstrual period (LMP), not from conception. This means you are considered 2 weeks pregnant at the time of conception, since ovulation typically occurs around day 14 of a 28-day cycle. A full-term pregnancy is 40 weeks from the LMP, which is approximately 38 weeks from conception.",
          },
          {
            question: "How accurate is the due date calculation?",
            answer:
              "The due date is calculated using Naegele's rule: add 280 days (40 weeks) to the first day of your last period. This assumes a 28-day cycle with ovulation on day 14. For cycles longer or shorter than 28 days, the calculator adjusts accordingly. Only about 5% of babies are born on their exact due date — most arrive within 2 weeks either side.",
          },
          {
            question: "What are the three trimesters of pregnancy?",
            answer:
              "The first trimester covers weeks 1-12 and is when all major organs form. The second trimester covers weeks 13-26 — often called the 'golden trimester' as morning sickness typically eases and energy returns. The third trimester covers weeks 27-40, when the baby gains most of its weight and prepares for birth.",
          },
          {
            question: "When can I hear the baby's heartbeat?",
            answer:
              "A heartbeat can typically be detected by transvaginal ultrasound as early as week 6, and by abdominal ultrasound around week 10-12. At your first prenatal appointment (usually between weeks 8-12), your doctor will likely confirm the heartbeat via ultrasound.",
          },
          {
            question: "What is the viability milestone at week 24?",
            answer:
              "Week 24 is considered the threshold of viability — the point at which a baby born prematurely has a reasonable chance of survival with intensive neonatal care. Survival rates improve significantly with each additional week after 24. Babies born after 28 weeks have much higher survival rates, and after 32 weeks, outcomes are generally very good.",
          },
          {
            question: "When should I have my anatomy scan?",
            answer:
              "The anatomy scan (also called the 20-week scan or anomaly scan) is typically scheduled between weeks 18-22. It checks the baby's development, measures growth, and looks at the placenta and amniotic fluid. It is also the scan at which many parents find out the baby's sex, if they wish to know.",
          },
          {
            question: "How much weight should I gain during pregnancy?",
            answer:
              "Weight gain recommendations depend on your pre-pregnancy BMI. Women with a normal BMI (18.5-24.9) are typically advised to gain 11-16 kg. Underweight women may need to gain more; overweight women less. Your healthcare provider will give you personalised guidance. Use our BMI Calculator to check your pre-pregnancy BMI.",
          },
          {
            question: "What does it mean when the baby drops?",
            answer:
              "Baby dropping (also called lightening or engagement) happens when the baby moves lower into the pelvis in preparation for birth. It typically occurs in the last few weeks of pregnancy for first-time mothers, and sometimes not until labour begins for subsequent pregnancies. You may notice it becomes easier to breathe but you feel more pressure in your pelvis.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

function MethodToggle({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const items: Array<{ id: Method; label: string; icon: string }> = [
    { id: "lmp", label: "Last Period", icon: "📅" },
    { id: "due", label: "Due Date", icon: "🗓️" },
    { id: "conception", label: "Conception", icon: "💫" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Calculation method"
      className="grid grid-cols-3 gap-2 rounded-full border border-border bg-card p-1"
    >
      {items.map((it) => {
        const active = method === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`rounded-full px-3 py-2 text-xs sm:text-sm font-semibold transition ${
              active ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            style={
              active
                ? {
                    background:
                      "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
                  }
                : undefined
            }
          >
            <span className="mr-1" aria-hidden="true">
              {it.icon}
            </span>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldDate({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        className="text-lg"
      />
    </div>
  );
}

function Results({ r }: { r: PregnancyResult }) {
  const currentWeek = Math.max(0, Math.min(40, r.weeks));
  const sizeEntry = nearestDataWeek(BABY_SIZES, currentWeek);
  const weeklyEntry = nearestDataWeek(WEEKLY_DATA, currentWeek);
  const keyDates = buildKeyDates(r.lmp);

  return (
    <div className="space-y-5">
      <HeroCard r={r} />

      {r.status === "very-early" && (
        <InfoBanner tone="warn">
          Very early pregnancy — calculations may be less accurate before week 4. Consider taking a
          test or consulting your healthcare provider.
        </InfoBanner>
      )}
      {r.status === "overdue" && (
        <InfoBanner tone="warn">
          You are {r.overdueDays} {r.overdueDays === 1 ? "day" : "days"} past your estimated due
          date. Most babies arrive within 2 weeks either side of the due date.
        </InfoBanner>
      )}
      {r.status === "very-overdue" && (
        <InfoBanner tone="danger">
          You are {r.overdueDays} days past your due date (over 42 weeks). Please contact your
          healthcare provider.
        </InfoBanner>
      )}

      {weeklyEntry?.value.milestone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-4 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(168,85,247,0.15))",
            borderColor: "#ec4899",
          }}
        >
          <p className="text-2xl mb-1">{weeklyEntry.value.milestone}</p>
          <p className="text-sm text-muted-foreground">
            This is a special week in your pregnancy journey!
          </p>
        </motion.div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {sizeEntry && (
          <BabySizeCard week={sizeEntry.key} size={sizeEntry.value} />
        )}
        {weeklyEntry && (
          <WeeklyCard week={weeklyEntry.key} data={weeklyEntry.value} />
        )}
      </div>

      <TrimesterTimeline weeks={r.weeks} />

      <KeyDatesCard rows={keyDates} currentWeek={currentWeek} />
    </div>
  );
}

function HeroCard({ r }: { r: PregnancyResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
      style={{
        background: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.35), transparent 40%)",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-sm/6 font-medium opacity-90 flex items-center gap-2">
          <span aria-hidden="true">🤰</span> You are
        </p>
        <div className="mt-2 flex items-end gap-4 flex-wrap">
          <div>
            <div className="font-display text-6xl sm:text-7xl font-extrabold leading-none">
              {r.weeks}
              <span className="text-3xl sm:text-4xl font-semibold opacity-90 ml-1">w</span>
              <span className="mx-2 opacity-70">+</span>
              {r.days}
              <span className="text-3xl sm:text-4xl font-semibold opacity-90 ml-1">d</span>
            </div>
            <p className="text-sm opacity-90 mt-1">weeks & days pregnant</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <CalendarDays className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
            Due {format(r.dueDate, "MMM d, yyyy")}
          </span>
          <span className="opacity-90">·</span>
          <span>Trimester {r.trimester}</span>
          <span className="opacity-90">·</span>
          <span>
            {r.daysRemaining >= 0
              ? `${r.weeksRemaining}w ${r.daysRemaining % 7}d to go`
              : `${r.overdueDays} ${r.overdueDays === 1 ? "day" : "days"} overdue`}
          </span>
        </div>

        <div className="mt-5">
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${r.progressPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-white/90"
            />
          </div>
          <p className="mt-1.5 text-xs opacity-90">{Math.round(r.progressPct)}% complete</p>
        </div>
      </div>
    </motion.div>
  );
}

function BabySizeCard({
  week,
  size,
}: {
  week: number;
  size: { fruit: string; emoji: string; length: string; weight: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Baby size · week {week}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl"
          aria-hidden="true"
        >
          {size.emoji}
        </motion.div>
        <div>
          <p className="font-display text-xl font-bold">Size of a {size.fruit}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Length: {size.length} · Weight: ~{size.weight}
          </p>
        </div>
      </div>
      <p
        className="mt-4 text-sm italic px-3 py-2 rounded-lg"
        style={{ background: "rgba(236,72,153,0.08)", color: "var(--foreground)" }}
      >
        “Your baby is now about the size of a {size.fruit.toLowerCase()}!”
      </p>
    </div>
  );
}

function WeeklyCard({
  week,
  data,
}: {
  week: number;
  data: { babyDev: string; momChanges: string; tip: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        This week · week {week}
      </p>
      <div>
        <h3 className="text-sm font-semibold mb-1">Baby development</h3>
        <p className="text-sm text-muted-foreground">{data.babyDev}</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1">What you may feel</h3>
        <p className="text-sm text-muted-foreground">{data.momChanges}</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#ec4899" }} aria-hidden="true" /> Tip
        </p>
        <p className="text-sm text-muted-foreground">{data.tip}</p>
      </div>
    </div>
  );
}

function TrimesterTimeline({ weeks }: { weeks: number }) {
  const clamped = Math.max(0, Math.min(40, weeks));
  const pct = (clamped / 40) * 100;
  const segments = [
    { label: "T1", from: 1, to: 12, color: "#f43f5e" },
    { label: "T2", from: 13, to: 26, color: "#ec4899" },
    { label: "T3", from: 27, to: 40, color: "#a855f7" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Pregnancy timeline
      </p>
      <div className="relative">
        <div className="flex h-3 rounded-full overflow-hidden">
          {segments.map((s) => (
            <div
              key={s.label}
              style={{
                width: `${((s.to - s.from + 1) / 40) * 100}%`,
                background: `color-mix(in oklab, ${s.color} 35%, transparent)`,
              }}
              className="border-r border-background/40 last:border-r-0"
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-background shadow-md"
          style={{
            left: `${pct}%`,
            background: "linear-gradient(135deg, #f43f5e, #a855f7)",
          }}
          aria-label={`Currently at week ${clamped}`}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 text-xs text-muted-foreground">
        <span>T1 · Weeks 1–12</span>
        <span className="text-center">T2 · Weeks 13–26</span>
        <span className="text-right">T3 · Weeks 27–40</span>
      </div>
    </div>
  );
}

function KeyDatesCard({
  rows,
  currentWeek,
}: {
  rows: Array<{ label: string; week: number; date: string }>;
  currentWeek: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Important dates
      </p>
      <ul className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            const passed = currentWeek >= row.week;
            return (
              <motion.li
                key={row.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      passed ? "" : "opacity-40"
                    }`}
                    style={{ background: passed ? "#ec4899" : "var(--muted-foreground)" }}
                  />
                  <span className="text-sm truncate">{row.label}</span>
                </div>
                <div className="flex items-center gap-3 text-sm shrink-0">
                  <span className="text-muted-foreground">Week {row.week}</span>
                  <span className="font-medium tabular-nums">{row.date}</span>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function InfoBanner({
  tone,
  children,
}: {
  tone: "warn" | "danger";
  children: React.ReactNode;
}) {
  const color = tone === "danger" ? "#ef4444" : "#f59e0b";
  return (
    <div
      className="rounded-xl border p-3 flex items-start gap-2 text-sm"
      style={{
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 8%, transparent)`,
      }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function InternalLinks() {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
      <p>
        Pregnant women need about 300ml more water per day — use our{" "}
        <a
          href="/tools/water-intake-calculator"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          Water Intake Calculator
        </a>{" "}
        to set your daily hydration target, and the{" "}
        <a
          href="/tools/calorie-calculator"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          Calorie Calculator
        </a>{" "}
        to estimate your additional nutritional needs each trimester.
      </p>
      <p>
        Quality sleep is essential during pregnancy. Our{" "}
        <a
          href="/tools/sleep-calculator"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          Sleep Calculator
        </a>{" "}
        helps you optimise your rest, and the{" "}
        <a
          href="/tools/bmi-calculator"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          BMI Calculator
        </a>{" "}
        can help you track healthy weight gain throughout your pregnancy.
      </p>
    </section>
  );
}
