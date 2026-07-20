import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Info,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
  AlertTriangle,
  Plus,
  X,
  Gift,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  simulate,
  benchmarkStatus,
  fmtUSD,
  fmtUSDCompact,
  type RetirementInputs,
  type MatchTier,
} from "@/lib/retirement/calc";

const SLUG = "retirement-calculator";

export const Route = createFileRoute("/tools/retirement-calculator")({
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
            name: "Retirement Calculator",
            description:
              "Free retirement / 401(k) calculator. Projects a conservative and optimistic balance range at retirement, shows both nominal and inflation-adjusted values, models real tiered employer match, and estimates monthly retirement income under the 4% rule. No account linking, no signup.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/retirement-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Year-by-year 401(k) growth projection to retirement age",
              "Conservative and optimistic return range shown side-by-side, not a single false-precision number",
              "Both nominal and inflation-adjusted (today's dollars) final balances",
              "Real tiered employer match formula (e.g. 100% up to 3%, 50% on next 2%) — not a flat multiplier",
              "Optional annual contribution escalation with a configurable cap",
              "Salary growth, inflation, and dual return assumptions all editable",
              "Monthly retirement income estimated using the 4% safe-withdrawal rule",
              "Age-based benchmark comparison (behind pace / on pace / ahead of pace)",
              "Balance growth chart with both conservative and optimistic trajectories",
              "Plain-language Traditional vs Roth explainer",
              "100% client-side — no account linking, no signup, nothing sent to a server",
            ],
          }),
        },
      ],
    };
  },
  component: RetirementCalculatorPage,
});

// -------- Defaults --------
const DEFAULT_TIER1: MatchTier = { matchPct: 100, capPct: 3 };
const DEFAULT_TIER2: MatchTier = { matchPct: 50, capPct: 2 };

const DEFAULTS: RetirementInputs = {
  currentAge: 30,
  retirementAge: 65,
  currentBalance: 10000,
  annualSalary: 75000,
  employeeContribPct: 6,
  tier1: DEFAULT_TIER1,
  tier2: DEFAULT_TIER2,
  contribEscalationPct: 0,
  maxContribPct: 15,
  salaryGrowthPct: 3,
  inflationPct: 2.5,
  conservativeReturnPct: 5,
  optimisticReturnPct: 8,
};

function RetirementCalculatorPage() {
  const tool = toolBySlug(SLUG, tools);
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULTS);
  const [tier2Enabled, setTier2Enabled] = useState(true);

  const effectiveInputs = useMemo<RetirementInputs>(
    () => ({ ...inputs, tier2: tier2Enabled ? inputs.tier2 : undefined }),
    [inputs, tier2Enabled],
  );

  const result = useMemo(() => simulate(effectiveInputs), [effectiveInputs]);
  const bench = useMemo(
    () => benchmarkStatus(inputs.currentAge, inputs.currentBalance, inputs.annualSalary),
    [inputs.currentAge, inputs.currentBalance, inputs.annualSalary],
  );

  const set = <K extends keyof RetirementInputs>(k: K, v: RetirementInputs[K]) =>
    setInputs((s) => ({ ...s, [k]: v }));

  const setTier1 = (patch: Partial<MatchTier>) =>
    setInputs((s) => ({ ...s, tier1: { ...s.tier1, ...patch } }));
  const setTier2 = (patch: Partial<MatchTier>) =>
    setInputs((s) => ({
      ...s,
      tier2: { ...(s.tier2 ?? DEFAULT_TIER2), ...patch },
    }));

  const chartData = useMemo(
    () =>
      result.rows.map((r) => ({
        age: r.age,
        conservative: Math.round(r.endBalanceConservative),
        optimistic: Math.round(r.endBalanceOptimistic),
      })),
    [result.rows],
  );

  const invalidAges = inputs.retirementAge <= inputs.currentAge;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      {/* Hero result */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8 mb-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--green-brand) 12%, transparent), color-mix(in oklab, var(--cyan-brand) 10%, transparent))",
        }}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
          <PiggyBank className="w-3.5 h-3.5" aria-hidden="true" /> Projected at age {inputs.retirementAge}
        </div>
        {invalidAges ? (
          <p className="font-display text-xl font-semibold text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--violet-brand)" }} aria-hidden="true" />
            Retirement age must be greater than your current age.
          </p>
        ) : (
          <>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">
              A realistic range, not one false-precision number
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mb-6">
              Over {result.years} year{result.years === 1 ? "" : "s"}, here's what your balance could look like
              across a conservative and an optimistic return assumption — with the
              <span className="text-foreground font-medium"> today's-dollars </span>
              value shown alongside so inflation doesn't distort the headline.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProjectionCard
                label="Conservative"
                accent="var(--cyan-brand)"
                icon={<TrendingDown className="w-4 h-4" aria-hidden="true" />}
                rate={inputs.conservativeReturnPct}
                nominal={result.finalNominalConservative}
                real={result.finalRealConservative}
                monthlyIncome={result.incomeRealConservative.monthly}
              />
              <ProjectionCard
                label="Optimistic"
                accent="var(--green-brand)"
                icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
                rate={inputs.optimisticReturnPct}
                nominal={result.finalNominalOptimistic}
                real={result.finalRealOptimistic}
                monthlyIncome={result.incomeRealOptimistic.monthly}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              Monthly income shown is under the <span className="text-foreground">4% safe-withdrawal rule</span>{" "}
              applied to the <span className="text-foreground">today's-dollars</span> balance — the honest number
              for what your savings would actually buy.
            </p>
          </>
        )}
      </motion.section>

      {/* Controls + Chart */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <aside className="lg:col-span-2 space-y-4">
          {/* You */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">You</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current age" htmlFor="age">
                <NumberInput id="age" value={inputs.currentAge} onChange={(v) => set("currentAge", v)} step={1} />
              </Field>
              <Field label="Retirement age" htmlFor="rage">
                <NumberInput
                  id="rage"
                  value={inputs.retirementAge}
                  onChange={(v) => set("retirementAge", v)}
                  step={1}
                />
              </Field>
            </div>
            <Field label="Annual salary" htmlFor="salary">
              <MoneyInput id="salary" value={inputs.annualSalary} onChange={(v) => set("annualSalary", v)} />
            </Field>
            <Field label="Current retirement balance" htmlFor="bal">
              <MoneyInput id="bal" value={inputs.currentBalance} onChange={(v) => set("currentBalance", v)} />
            </Field>
          </div>

          {/* Contributions & match */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Contributions &amp; match
            </h3>
            <Field label="Your contribution (% of salary)" htmlFor="emp">
              <NumberInput
                id="emp"
                value={inputs.employeeContribPct}
                onChange={(v) => set("employeeContribPct", v)}
                step={0.5}
                suffix="%"
              />
            </Field>

            <div className="rounded-xl border border-border/70 p-3 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Employer match — tier 1</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Match %" htmlFor="t1m">
                  <NumberInput
                    id="t1m"
                    value={inputs.tier1.matchPct}
                    onChange={(v) => setTier1({ matchPct: v })}
                    step={5}
                    suffix="%"
                  />
                </Field>
                <Field label="Up to (% of salary)" htmlFor="t1c">
                  <NumberInput
                    id="t1c"
                    value={inputs.tier1.capPct}
                    onChange={(v) => setTier1({ capPct: v })}
                    step={0.5}
                    suffix="%"
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                e.g. <span className="text-foreground">100% up to 3%</span> means for every $1 you put in up to 3% of
                salary, they add $1.
              </p>
            </div>

            {tier2Enabled ? (
              <div className="rounded-xl border border-border/70 p-3 space-y-2 relative">
                <button
                  type="button"
                  onClick={() => setTier2Enabled(false)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  aria-label="Remove tier 2 match"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Employer match — tier 2</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Match %" htmlFor="t2m">
                    <NumberInput
                      id="t2m"
                      value={inputs.tier2?.matchPct ?? DEFAULT_TIER2.matchPct}
                      onChange={(v) => setTier2({ matchPct: v })}
                      step={5}
                      suffix="%"
                    />
                  </Field>
                  <Field label="On next (% of salary)" htmlFor="t2c">
                    <NumberInput
                      id="t2c"
                      value={inputs.tier2?.capPct ?? DEFAULT_TIER2.capPct}
                      onChange={(v) => setTier2({ capPct: v })}
                      step={0.5}
                      suffix="%"
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Applies to the portion of your contribution above tier 1's cap.
                </p>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTier2Enabled(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add second match tier
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Field label="Annual escalation (%)" htmlFor="esc">
                <NumberInput
                  id="esc"
                  value={inputs.contribEscalationPct}
                  onChange={(v) => set("contribEscalationPct", v)}
                  step={0.5}
                  suffix="%"
                />
              </Field>
              <Field label="Contribution cap (%)" htmlFor="maxc">
                <NumberInput
                  id="maxc"
                  value={inputs.maxContribPct}
                  onChange={(v) => set("maxContribPct", v)}
                  step={1}
                  suffix="%"
                />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Set escalation to 1% to automatically bump your contribution 1 point every year, up to the cap.
            </p>
          </div>

          {/* Growth assumptions */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Growth assumptions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salary growth (%/yr)" htmlFor="sg">
                <NumberInput
                  id="sg"
                  value={inputs.salaryGrowthPct}
                  onChange={(v) => set("salaryGrowthPct", v)}
                  step={0.25}
                  suffix="%"
                />
              </Field>
              <Field label="Inflation (%/yr)" htmlFor="inf">
                <NumberInput
                  id="inf"
                  value={inputs.inflationPct}
                  onChange={(v) => set("inflationPct", v)}
                  step={0.25}
                  suffix="%"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Conservative return (%/yr)" htmlFor="rc">
                <NumberInput
                  id="rc"
                  value={inputs.conservativeReturnPct}
                  onChange={(v) => set("conservativeReturnPct", v)}
                  step={0.25}
                  suffix="%"
                />
              </Field>
              <Field label="Optimistic return (%/yr)" htmlFor="ro">
                <NumberInput
                  id="ro"
                  value={inputs.optimisticReturnPct}
                  onChange={(v) => set("optimisticReturnPct", v)}
                  step={0.25}
                  suffix="%"
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-2 pt-1 border-t border-border">
              <ShieldCheck
                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                style={{ color: "var(--green-brand)" }}
                aria-hidden="true"
              />
              No account linking. No signup. Every number stays in your browser.
            </p>
          </div>
        </aside>

        {/* Right: chart + match breakdown + benchmark */}
        <section className="lg:col-span-3 space-y-4">
          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Balance projection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nominal balance from age {inputs.currentAge} to {inputs.retirementAge}. The shaded gap is your
                  honest range of outcomes.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <LegendDot color="var(--cyan-brand)" label="Conservative" />
                <LegendDot color="var(--green-brand)" label="Optimistic" />
              </div>
            </div>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--green-brand)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--green-brand)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradCon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--cyan-brand)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--cyan-brand)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="age"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -2,
                      fill: "var(--muted-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => fmtUSDCompact(v)}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [fmtUSD(v), name]}
                    labelFormatter={(l) => `Age ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="optimistic"
                    name="Optimistic"
                    stroke="var(--green-brand)"
                    strokeWidth={2.5}
                    fill="url(#gradOpt)"
                  />
                  <Area
                    type="monotone"
                    dataKey="conservative"
                    name="Conservative"
                    stroke="var(--cyan-brand)"
                    strokeWidth={2.5}
                    fill="url(#gradCon)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Benchmark */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy
                    className="w-4 h-4"
                    style={{
                      color:
                        bench.status === "ahead"
                          ? "var(--green-brand)"
                          : bench.status === "on-track"
                            ? "var(--cyan-brand)"
                            : "var(--violet-brand)",
                    }}
                    aria-hidden="true"
                  />
                  Age-based benchmark
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Common rule of thumb, not a personalized recommendation.
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background:
                    bench.status === "ahead"
                      ? "color-mix(in oklab, var(--green-brand) 18%, transparent)"
                      : bench.status === "on-track"
                        ? "color-mix(in oklab, var(--cyan-brand) 18%, transparent)"
                        : "color-mix(in oklab, var(--violet-brand) 18%, transparent)",
                  color:
                    bench.status === "ahead"
                      ? "var(--green-brand)"
                      : bench.status === "on-track"
                        ? "var(--cyan-brand)"
                        : "var(--violet-brand)",
                }}
              >
                {bench.status === "ahead"
                  ? "Ahead of pace"
                  : bench.status === "on-track"
                    ? "On pace"
                    : "Behind pace"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Stat
                label="You have"
                value={`${bench.actualMultiple.toFixed(1)}× salary`}
                sub={fmtUSD(inputs.currentBalance)}
              />
              <Stat
                label={`Target at age ${inputs.currentAge}`}
                value={`${bench.targetMultiple.toFixed(1)}× salary`}
                sub={fmtUSD(bench.targetBalance)}
              />
              <Stat
                label="Ratio to target"
                value={`${Math.round(bench.ratio * 100)}%`}
                sub={
                  bench.ratio >= 1
                    ? "at or above the anchor"
                    : `${fmtUSD(Math.max(0, bench.targetBalance - inputs.currentBalance))} to catch up`
                }
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Anchors: 1× salary saved by 30, 3× by 40, 6× by 50, 8× by 60, 10× by 67. Widely cited industry rule of
              thumb (Fidelity), not a guarantee or advice.
            </p>
          </div>

          {/* Employer match breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="w-4 h-4" style={{ color: "var(--green-brand)" }} aria-hidden="true" /> Employer
              match — what actually goes in
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              First-year breakdown. Match recomputes against your current-year salary every year in the projection.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BreakdownCell
                label="Your contribution"
                value={result.firstYear.employeeContribution}
                accent="var(--cyan-brand)"
              />
              <BreakdownCell
                label="+ Employer match"
                value={result.firstYear.employerMatch}
                accent="var(--green-brand)"
              />
              <BreakdownCell
                label="= Total going in / yr"
                value={result.firstYear.total}
                accent="var(--foreground)"
                bold
              />
            </div>
            {result.firstYear.employerMatch > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                <Sparkles
                  className="inline w-3.5 h-3.5 mr-1 -mt-0.5"
                  style={{ color: "var(--green-brand)" }}
                  aria-hidden="true"
                />
                That's{" "}
                <span className="text-foreground font-semibold">{fmtUSD(result.firstYear.employerMatch)}</span> of
                free money each year — over {result.years} years that alone is roughly{" "}
                <span className="text-foreground font-semibold">
                  {fmtUSD(result.firstYear.employerMatch * result.years)}
                </span>{" "}
                of contributions before any market growth.
              </p>
            )}
            {inputs.employeeContribPct < inputs.tier1.capPct + (tier2Enabled ? inputs.tier1.capPct * 0 + (inputs.tier2?.capPct ?? 0) : 0) && (
              <p className="mt-3 rounded-lg border border-border p-3 text-xs flex items-start gap-2" style={{ background: "color-mix(in oklab, var(--violet-brand) 8%, transparent)" }}>
                <AlertTriangle
                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--violet-brand)" }}
                  aria-hidden="true"
                />
                <span>
                  You're contributing <span className="text-foreground font-medium">{inputs.employeeContribPct}%</span>
                  , which is below the full-match threshold — you're leaving employer money on the table. Raise your
                  contribution to at least{" "}
                  <span className="text-foreground font-medium">
                    {inputs.tier1.capPct + (tier2Enabled ? inputs.tier2?.capPct ?? 0 : 0)}%
                  </span>{" "}
                  to capture the full match.
                </span>
              </p>
            )}
          </div>
        </section>
      </div>

      <AdZone id="retirement-calculator-mid" size="728x90" />

      {/* Traditional vs Roth explainer */}
      <section className="mt-8 rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-bold mb-2">Traditional vs. Roth 401(k) — the honest one-liner</h2>
        <p className="text-xs text-muted-foreground mb-4">
          This is an informational explainer, not a second calculation mode. Both options grow tax-free while
          invested — the difference is <em>when</em> the tax hits.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p
              className="text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: "var(--cyan-brand)" }}
            >
              Traditional 401(k)
            </p>
            <p className="text-sm text-muted-foreground">
              Contributions come out of your paycheck <span className="text-foreground">before</span> federal income
              tax — you get the tax break today, which lowers your taxable income now. In retirement, every dollar
              you withdraw is taxed as ordinary income at whatever bracket you're in then.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Often better if you expect to be in a <span className="text-foreground">lower</span> tax bracket in
              retirement than you are today.
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p
              className="text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: "var(--green-brand)" }}
            >
              Roth 401(k)
            </p>
            <p className="text-sm text-muted-foreground">
              Contributions are made with <span className="text-foreground">after-tax</span> dollars — no tax break
              today. In retirement, qualified withdrawals (both contributions and all the market growth) come out{" "}
              <span className="text-foreground">completely tax-free</span>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Often better if you expect to be in the <span className="text-foreground">same or higher</span> tax
              bracket in retirement, or if you're early in your career with decades of growth ahead.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          Employer match dollars are always deposited on a traditional (pre-tax) basis, even in a Roth plan. The
          projection above intentionally doesn't model the tax bill either way — the balance shown is the
          pre-withdrawal number for both.
        </p>
      </section>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle
          className="w-3.5 h-3.5 mt-0.5 shrink-0"
          style={{ color: "var(--violet-brand)" }}
          aria-hidden="true"
        />
        Projections are illustrative, based on the assumptions you set — not guarantees. Real market returns are
        volatile and unpredictable. This tool is not a substitute for a licensed financial advisor.
      </p>

      <InternalLinks />

      <HowToUse
        steps={[
          "Enter your age, retirement age, salary, and current retirement account balance — every field has a sensible default you can edit.",
          "Set your contribution percentage and configure your real employer match tiers (add a second tier if your plan has one, e.g. 100% up to 3% then 50% on the next 2%).",
          "Compare the conservative and optimistic projections — nominal AND today's-dollars — and check the benchmark card to see whether your current balance is on pace for your age.",
        ]}
      />

      <ToolSeoContent
        title="Retirement Calculator — 401(k) Projection with an Honest Range, No Account Linking"
        description="Free retirement and 401(k) calculator that projects your balance at retirement age as a conservative-to-optimistic range, models a real tiered employer match, shows both nominal and inflation-adjusted values, and estimates monthly retirement income under the 4% rule. No account linking, no signup."
        body={[
          "Skycally's Retirement Calculator answers the question every 401(k) or IRA calculator is trying to answer — 'how much will I have?' — but does it honestly. Most retirement calculators, including the ones from big personal-finance sites, show a single confident number like '$1,842,391 at retirement!' as if the market's next 30 years were already decided. Nobody knows what returns will look like over 20 to 40 years, so this tool projects your balance across two return assumptions side by side — a conservative one and an optimistic one — and shows both. That's the same 'range, not false precision' honesty principle we apply everywhere else on the site. The number that matters isn't a single point estimate; it's how wide the range is and whether the low end still gets you where you need to be.",
          "The other honesty problem in these calculators is how they model your employer's 401(k) match. Almost every competitor models it as a flat 'add X%' — which is wrong. Real matches are tiered, structured like 'we'll match 100% of the first 3% of salary you contribute, plus 50% of the next 2%.' That formula means the match amount changes with your contribution rate and your salary, and it caps out at a threshold most people don't realize is a threshold. This calculator models the match the way it actually works: two configurable tiers (matchPct + salary-cap%), recomputed against your current-year salary every year of the projection, with a first-year breakdown showing exactly how much 'free money' the match adds. If you're contributing below the match cap, we call it out — that gap is one of the highest-leverage fixes in personal finance.",
          "The third honesty problem is inflation. A 'you'll have $2M at 65!' headline over a 35-year horizon can be almost entirely inflation illusion — at 2.5% inflation, $2M in 35 years buys roughly what $842K buys today. That's why every projection here shows both the nominal (future-dollar) balance and its inflation-adjusted value in today's dollars, clearly labeled. The monthly-income estimate under the classic 4% safe-withdrawal rule is computed on the today's-dollars number, because that's the figure that actually reflects what your savings would buy at the grocery store, not what the printed statement will say. If your projection halves after inflation, that's not a bug in the tool — it's the number every other calculator is quietly hiding from you.",
          "This calculator fits alongside Skycally's other financial planning tools. Use the <Link to=\"/tools/compound-interest\">Compound Interest Calculator</Link> to model a separate taxable investment account alongside your 401(k) projection. Use the <Link to=\"/tools/paycheck-calculator\">Paycheck Calculator</Link> to see exactly how a higher contribution percentage changes your real take-home pay after federal, state, and FICA. And if you're weighing 401(k) contributions against paying down high-interest debt, the <Link to=\"/tools/debt-payoff-calculator\">Debt Payoff Calculator</Link> compares the classic trade-off: paying down debt faster versus contributing more to retirement, month by month. Every tool runs 100% in your browser — no account linking, no signup, no data sent anywhere.",
        ]}
        faqs={[
          {
            question: "How much should I have saved for retirement by my age?",
            answer:
              "The widely cited Fidelity rule of thumb is roughly 1× your salary saved by age 30, 3× by 40, 6× by 50, 8× by 60, and 10× by age 67. So at age 40 earning $75,000, the benchmark would be about $225,000 saved. These are rules of thumb — not personalized recommendations — but they're useful for a quick 'behind pace / on pace / ahead of pace' gut check, which is exactly what the benchmark card on this calculator shows.",
          },
          {
            question: "How does a 401(k) employer match actually work?",
            answer:
              "It's tiered, almost never a flat percentage. A very common formula is '100% match on the first 3% of your salary you contribute, plus 50% match on the next 2%.' If you make $75,000 and contribute 5%, that's $2,250 (100% match on the first 3% = $2,250) + $750 (50% match on the next 2% = $750) = $3,000 in employer money on your $3,750 contribution. If you only contribute 2%, you get $1,500 match and completely miss the second tier. This calculator lets you enter your plan's actual formula (two tiers) instead of forcing you to guess a single blended percentage.",
          },
          {
            question: "What's the difference between a Traditional and a Roth 401(k)?",
            answer:
              "Traditional 401(k): contributions come out of your paycheck pre-tax (you get the tax break today), and every dollar you withdraw in retirement is taxed as ordinary income. Roth 401(k): contributions are after-tax (no tax break today), but qualified withdrawals in retirement — including all the market growth — are completely tax-free. Rough rule: Traditional is often better if you expect to be in a lower tax bracket in retirement than you are today; Roth is often better if you expect to be in the same or higher bracket. Employer match dollars are always deposited pre-tax, even into a Roth plan.",
          },
          {
            question: "How much retirement income will my savings actually provide?",
            answer:
              "The classic guideline is the 4% rule: you can safely withdraw roughly 4% of your portfolio in the first year of retirement, adjust for inflation each year after, and have a high probability of the money lasting 30 years. So a $1 million balance would generate about $40,000 in the first year, or roughly $3,333/month. This calculator applies the 4% rule to the today's-dollars balance (not the nominal one), because that's the honest estimate of purchasing power at retirement.",
          },
          {
            question: "What is the 4% rule?",
            answer:
              "The 4% rule is a widely used retirement withdrawal guideline from the 'Trinity Study' (a 1998 analysis of historical US market returns). It says a retiree who withdraws 4% of their portfolio in year one and adjusts that dollar amount for inflation each year after has historically had a high probability of the money lasting at least 30 years. It's a rule of thumb, not a guarantee — sequence-of-returns risk, unusually long retirements, and future market conditions can all change the safe withdrawal rate. Some analysts now argue for 3.5% or even a variable withdrawal strategy.",
          },
          {
            question: "What investment return should I assume for retirement projections?",
            answer:
              "There's no right single answer, which is why this calculator uses two. A commonly used long-term nominal return assumption for a diversified stock-heavy portfolio is around 7–10%, and around 4–6% for a more bond-heavy or conservative allocation. Real (inflation-adjusted) returns are historically about 3 percentage points lower. Sensible defaults for someone in accumulation phase are roughly 5% conservative and 8% optimistic — but the whole point of showing a range is that reasonable people disagree. If the conservative projection still gets you where you need to be, your plan is robust.",
          },
          {
            question: "Should I pay off debt or contribute more to my 401(k)?",
            answer:
              "The math-only answer: capture at least the full employer match before doing anything else — that's an instant guaranteed 50–100% return. After that, compare the interest rate on your debt to your expected investment return. Debt at 15%+ (like credit cards) almost always wins over stock returns; debt at 4% (like an old mortgage) almost always loses to long-run market returns. In the messy middle (student loans at 6–8%), it's closer to a coin flip and psychology matters. See the Debt Payoff Calculator to model the debt side of that trade-off explicitly.",
          },
          {
            question: "Are these projections adjusted for inflation?",
            answer:
              "Yes — both. Every projection card shows the nominal (future-dollar) balance and, right beside it, the inflation-adjusted value in today's dollars. The monthly retirement income estimate under the 4% rule is applied to the today's-dollars balance, because that's the honest number for what your savings would buy at the grocery store in retirement. A nominal-only headline number is the single most common way retirement calculators mislead people about a 20–40 year projection — inflation quietly eats a huge share of the 'wow' figure.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

// ---------- UI helpers ----------

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground mb-1 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        $
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="pl-6"
        inputMode="decimal"
      />
    </div>
  );
}

function NumberInput({
  id,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={suffix ? "pr-8" : ""}
        inputMode="decimal"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function ProjectionCard({
  label,
  accent,
  icon,
  rate,
  nominal,
  real,
  monthlyIncome,
}: {
  label: string;
  accent: string;
  icon: React.ReactNode;
  rate: number;
  nominal: number;
  real: number;
  monthlyIncome: number;
}) {
  return (
    <div
      className="rounded-2xl border border-border p-4 sm:p-5 bg-background/40"
      style={{ borderColor: `color-mix(in oklab, ${accent} 40%, var(--border))` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider" style={{ color: accent }}>
          {icon}
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">@ {rate}% / yr</span>
      </div>
      <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: accent }}>
        {fmtUSD(nominal)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">nominal balance at retirement</p>
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-sm">
          <span className="font-semibold tabular-nums text-foreground">{fmtUSD(real)}</span>
          <span className="text-muted-foreground"> in today's dollars</span>
        </p>
        <p className="text-sm mt-1">
          <span className="font-semibold tabular-nums text-foreground">{fmtUSD(monthlyIncome)}</span>
          <span className="text-muted-foreground"> / month at 4% rule</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function BreakdownCell({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: number;
  accent: string;
  bold?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ background: "color-mix(in oklab, " + accent + " 6%, transparent)" }}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`tabular-nums ${bold ? "text-xl font-bold" : "text-lg font-semibold"}`}
        style={{ color: accent }}
      >
        {fmtUSD(value)}
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function InternalLinks() {
  const items: Array<{ to: string; title: string; body: string }> = [
    {
      to: "/tools/compound-interest",
      title: "Compound Interest Calculator",
      body: "Model a separate taxable brokerage account alongside your 401(k) projection to see combined wealth growth.",
    },
    {
      to: "/tools/paycheck-calculator",
      title: "Paycheck Calculator",
      body: "See exactly how a higher contribution percentage changes your real take-home pay after federal, state and FICA.",
    },
    {
      to: "/tools/debt-payoff-calculator",
      title: "Debt Payoff Calculator",
      body: "Compare the classic trade-off: paying down high-interest debt faster vs contributing more to retirement.",
    },
  ];
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
      <h2 className="font-display text-lg font-bold mb-4">Plan the rest of the picture</h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className="group block rounded-xl border border-border p-4 hover:border-foreground/40 transition h-full"
            >
              <p className="font-semibold group-hover:underline flex items-center gap-1">
                <TrendingUp
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground"
                  aria-hidden="true"
                />
                {it.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{it.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
