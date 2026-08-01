import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, GraduationCap, Info } from "lucide-react";
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

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  compareAll,
  fmtMonths,
  fmtUSD,
  idrExemptIncome,
  payoffDateLabel,
  PLAN_LABELS,
  type LoanInput,
  type RepaymentPlan,
  type SimResult,
} from "@/lib/student-loan/calc";
import { INTEREST_COLOR, PLAN_COLORS, PRINCIPAL_COLOR, SAMPLE_LOAN, TERM_OPTIONS } from "@/lib/student-loan/samples";

const SLUG = "student-loan-calculator";

export const Route = createFileRoute("/tools/student-loan-calculator")({
  head: () => buildToolMeta(toolBySlug(SLUG, tools)),
  component: StudentLoanCalculatorPage,
});

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const PLANS: RepaymentPlan[] = ["standard", "graduated", "idr"];

function StudentLoanCalculatorPage() {
  const tool = toolBySlug(SLUG, tools);

  const [balance, setBalance] = useState(String(SAMPLE_LOAN.balance));
  const [rate, setRate] = useState(String(SAMPLE_LOAN.rate));
  const [termYears, setTermYears] = useState(String(SAMPLE_LOAN.termYears));
  const [plan, setPlan] = useState<RepaymentPlan>(SAMPLE_LOAN.plan);
  const [grossIncome, setGrossIncome] = useState(String(SAMPLE_LOAN.grossIncome ?? 45000));
  const [familySize, setFamilySize] = useState(String(SAMPLE_LOAN.familySize ?? 1));
  const [showAll, setShowAll] = useState(false);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const input: LoanInput = useMemo(
    () => ({
      balance: num(balance),
      rate: num(rate),
      termYears: num(termYears) || 10,
      plan,
      grossIncome: num(grossIncome),
      familySize: Math.max(1, parseInt(familySize, 10) || 1),
    }),
    [balance, rate, termYears, plan, grossIncome, familySize],
  );

  const results = useMemo(() => compareAll(input), [input]);
  const active: SimResult = results[plan];
  const hasLoan = input.balance > 0;

  const chartData = useMemo(() => {
    const rows: Array<Record<string, number>> = [];
    const maxMonths = Math.max(...PLANS.map((p) => results[p].schedule.length), 1);
    const running: Record<string, { p: number; i: number }> = {};
    for (const p of PLANS) running[p] = { p: 0, i: 0 };
    for (let m = 0; m < maxMonths; m++) {
      for (const p of PLANS) {
        const row = results[p].schedule[m];
        if (row) {
          running[p].p += row.principal;
          running[p].i += row.interest;
        }
      }
      if (m % 3 === 2 || m === maxMonths - 1) {
        const point: Record<string, number> = { year: Math.round(((m + 1) / 12) * 10) / 10 };
        for (const p of PLANS) {
          point[`${p}_principal`] = Math.round(running[p].p);
          point[`${p}_interest`] = Math.round(running[p].i);
        }
        rows.push(point);
      }
    }
    return rows;
  }, [results]);

  const visibleRows = showAll ? active.schedule : active.schedule.slice(0, 12);
  const exempt = idrExemptIncome(input.familySize ?? 1);

  const toggleSeries = (key: string) => setHidden((h) => ({ ...h, [key]: !h[key] }));

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
            Your student loan
          </h2>

          <div>
            <label htmlFor="sl-balance" className="block text-sm font-medium mb-2">
              Loan balance ($)
            </label>
            <Input
              id="sl-balance"
              type="number"
              min={0}
              step={500}
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sl-rate" className="block text-sm font-medium mb-2">
              Annual interest rate (%)
            </label>
            <Input
              id="sl-rate"
              type="number"
              min={0}
              max={20}
              step={0.1}
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sl-term" className="block text-sm font-medium mb-2">
              Repayment term
            </label>
            <select
              id="sl-term"
              value={termYears}
              onChange={(e) => setTermYears(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t} years
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Repayment plan</span>
            <Tabs value={plan} onValueChange={(v) => setPlan(v as RepaymentPlan)}>
              <TabsList className="w-full grid grid-cols-3">
                {PLANS.map((p) => (
                  <TabsTrigger key={p} value={p} className="text-xs sm:text-sm">
                    {PLAN_LABELS[p]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {plan === "idr" && (
            <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
              <div>
                <label htmlFor="sl-income" className="block text-sm font-medium mb-2">
                  Annual gross income ($)
                </label>
                <Input
                  id="sl-income"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="decimal"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="sl-family" className="block text-sm font-medium mb-2">
                  Family size
                </label>
                <Input
                  id="sl-family"
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={familySize}
                  onChange={(e) => setFamilySize(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                SAVE shelters 225% of the poverty guideline for your household — {fmtUSD(exempt)} of your income is
                protected, and you pay 5% of anything above it.
              </p>
            </div>
          )}

          {plan === "idr" && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-amber-100/90">
                SAVE plan is subject to ongoing legal challenges — verify current status at studentaid.gov
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-start gap-2 pt-2 border-t border-border">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            This calculator provides estimates only. Actual payments may vary based on servicer, capitalized interest,
            and plan eligibility. Not financial advice.
          </p>
        </div>

        {/* Results */}
        <section className="space-y-5" aria-live="polite">
          {!hasLoan ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Enter a loan balance to see your repayment estimate.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryCard
                  label={plan === "graduated" ? "Starting payment" : "Monthly payment"}
                  value={fmtUSD(active.monthlyPayment, { decimals: 2 })}
                  accent="var(--cyan-brand)"
                />
                <SummaryCard label="Total interest paid" value={fmtUSD(active.totalInterest)} accent={INTEREST_COLOR} />
                <SummaryCard label="Total amount paid" value={fmtUSD(active.totalPaid)} accent={PRINCIPAL_COLOR} />
                <SummaryCard
                  label={active.forgiven ? "Forgiveness date" : "Payoff date"}
                  value={payoffDateLabel(active.payoffMonths)}
                  sub={fmtMonths(active.payoffMonths)}
                />
                {active.forgiven ? (
                  <SummaryCard
                    label="Estimated forgiveness"
                    value={fmtUSD(active.forgiven)}
                    sub="Remaining balance written off after 20 years"
                    accent="#8b5cf6"
                    wide
                  />
                ) : null}
              </div>

              {/* Plan comparison */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-bold mb-1">Compare all three plans</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The same loan, run through Standard, Graduated and IDR (SAVE) side by side.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Plan</th>
                        <th className="py-2 pr-3 font-medium text-right">Monthly</th>
                        <th className="py-2 pr-3 font-medium text-right">Total paid</th>
                        <th className="py-2 pr-3 font-medium text-right">Interest</th>
                        <th className="py-2 font-medium text-right">Payoff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PLANS.map((p) => {
                        const r = results[p];
                        return (
                          <tr
                            key={p}
                            className={`border-b border-border/60 last:border-0 ${p === plan ? "bg-secondary/40" : ""}`}
                          >
                            <td className="py-2.5 pr-3 font-medium">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: PLAN_COLORS[p] }}
                                  aria-hidden="true"
                                />
                                {PLAN_LABELS[p]}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">
                              {fmtUSD(r.monthlyPayment, { decimals: 2 })}
                              {p === "graduated" && <span className="text-muted-foreground"> +</span>}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{fmtUSD(r.totalPaid)}</td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{fmtUSD(r.totalInterest)}</td>
                            <td className="py-2.5 text-right tabular-nums">
                              {fmtMonths(r.payoffMonths)}
                              {r.forgiven ? (
                                <span className="block text-xs text-muted-foreground">
                                  {fmtUSD(r.forgiven)} forgiven
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Graduated starts low and steps up every two years, so its "Monthly" figure is the first payment.
                </p>
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-bold mb-1">Principal vs interest over time</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Cumulative dollars paid, stacked. Click a legend item to hide or show a series.
                </p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="slPrincipal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PRINCIPAL_COLOR} stopOpacity={0.7} />
                          <stop offset="95%" stopColor={PRINCIPAL_COLOR} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="slInterest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={INTEREST_COLOR} stopOpacity={0.7} />
                          <stop offset="95%" stopColor={INTEREST_COLOR} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v: number) => `${Math.round(v)}y`}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        width={54}
                        tickFormatter={(v: number) => `$${(v / 1000).toLocaleString("en-US")}k`}
                      />
                      <RTooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [fmtUSD(Number(value)), name]}
                        labelFormatter={(l) => `Year ${l}`}
                      />
                      <Legend
                        onClick={(e) => toggleSeries(String((e as { dataKey?: string }).dataKey ?? ""))}
                        wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                      />
                      <Area
                        type="monotone"
                        dataKey={`${plan}_principal`}
                        name="Principal paid"
                        stackId="1"
                        stroke={PRINCIPAL_COLOR}
                        fill="url(#slPrincipal)"
                        hide={hidden[`${plan}_principal`]}
                      />
                      <Area
                        type="monotone"
                        dataKey={`${plan}_interest`}
                        name="Interest paid"
                        stackId="1"
                        stroke={INTEREST_COLOR}
                        fill="url(#slInterest)"
                        hide={hidden[`${plan}_interest`]}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Amortization */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h2 className="font-display text-lg font-bold">Amortization schedule</h2>
                  {active.schedule.length > 12 && (
                    <Button size="sm" variant="outline" onClick={() => setShowAll((s) => !s)}>
                      {showAll ? "Show first 12 months" : `Show all ${active.schedule.length} months`}
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm min-w-[460px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Month</th>
                        <th className="py-2 pr-3 font-medium text-right">Payment</th>
                        <th className="py-2 pr-3 font-medium text-right">Principal</th>
                        <th className="py-2 pr-3 font-medium text-right">Interest</th>
                        <th className="py-2 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => (
                        <tr key={r.month} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 tabular-nums">{r.month.toLocaleString("en-US")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.payment, { decimals: 2 })}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.principal, { decimals: 2 })}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.interest, { decimals: 2 })}</td>
                          <td className="py-2 text-right tabular-nums">{fmtUSD(r.balance, { decimals: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        For your total annual tax picture use the{" "}
        <Link to="/tools/income-tax-calculator" className="text-foreground underline underline-offset-4">
          Income Tax Calculator
        </Link>
        . Planning to pay off other debts at the same time? Try the{" "}
        <Link to="/tools/debt-payoff-calculator" className="text-foreground underline underline-offset-4">
          Debt Payoff Calculator
        </Link>
        . Already have a full paycheck breakdown? See the{" "}
        <Link to="/tools/paycheck-calculator" className="text-foreground underline underline-offset-4">
          Paycheck Calculator
        </Link>{" "}
        for take-home pay after deductions.
      </p>

      <AdZone id="student-loan-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter your total student loan balance and its annual interest rate, then pick a repayment term of 10, 20, 25 or 30 years.",
          "Choose Standard, Graduated or IDR (SAVE). For IDR, add your annual gross income and family size so the 5% discretionary-income formula can run.",
          "Read the summary cards, compare all three plans in the table, and scroll the month-by-month amortization schedule to see how interest shrinks over time.",
        ]}
      />

      <ToolSeoContent
        title="Student Loan Repayment Calculator — Standard, Graduated & IDR Plans"
        description="Estimate your monthly student loan payment, total interest, payoff date and possible forgiveness, and compare Standard, Graduated and Income-Driven (SAVE) repayment side by side."
        body={[
          "This student loan repayment calculator turns a balance, an interest rate and a term into the three numbers that actually matter: what you pay each month, what the loan costs you in total, and the month you finally clear it. Everything recalculates as you type, entirely in your browser — nothing about your balance or income is sent anywhere.",
          "The Standard plan uses the same fixed-payment amortization formula your servicer uses: payment = balance × r(1+r)^n ÷ ((1+r)^n − 1), where r is your monthly rate and n is the number of months. It is the cheapest federal option in total interest because the balance falls fastest. The Graduated plan starts at roughly half that payment and steps up every two years, sized so the loan still retires inside the same term — easier early on, more expensive overall.",
          "Income-Driven Repayment models the SAVE formula: 225% of the federal poverty guideline for your household is protected, and the monthly payment is 5% of whatever income sits above that, divided by twelve. Under SAVE, interest your payment does not cover is waived rather than added to the balance, so a low payment never makes the loan grow. Anything left after 20 years of undergraduate payments is treated as forgiven, and the calculator shows that amount explicitly.",
          "Use the side-by-side comparison to see the real trade-off. A borrower with a $30,000 balance at 5.5% pays about $326 a month on Standard and clears the loan in ten years; the same borrower on IDR with a modest income may pay a fraction of that but carry the loan for two decades and finish with a forgiven balance. Neither is automatically right — the answer depends on your cash flow now, your expected income growth, and whether you are pursuing Public Service Loan Forgiveness.",
        ]}
        faqs={[
          {
            question: "What is the SAVE plan?",
            answer:
              "SAVE (Saving on a Valuable Education) is a federal income-driven repayment plan that sets your monthly payment at 5% of discretionary income for undergraduate loans, protects 225% of the federal poverty guideline for your family size, and waives interest your payment does not cover so the balance never grows. SAVE is subject to ongoing legal challenges — verify its current status at studentaid.gov before relying on it.",
          },
          {
            question: "How is an IDR payment calculated?",
            answer:
              "Take your annual gross income, subtract 225% of the poverty guideline for your household (about $35,213 for a single person in 2026), multiply what remains by 5%, and divide by twelve. If your income is at or below the protected amount, your calculated payment is $0.",
          },
          {
            question: "Should I choose Standard or Graduated repayment?",
            answer:
              "Choose Standard if you can afford the fixed payment — it costs the least in total interest. Choose Graduated if your income is low now but expected to rise: the first payment is roughly half of Standard and steps up every two years, though you pay more interest across the full term.",
          },
          {
            question: "How long until my student loans are forgiven?",
            answer:
              "Under income-driven repayment, undergraduate loans are generally forgiven after 20 years (240 qualifying monthly payments) and graduate loans after 25 years. Public Service Loan Forgiveness can cut that to 10 years of qualifying payments while working full-time for a government or eligible nonprofit employer.",
          },
          {
            question: "What happens if I can't afford my student loan payment?",
            answer:
              "Contact your servicer before you miss a payment. Switching to an income-driven plan can drop the payment to as little as $0 without penalty, and deferment or forbearance can pause payments temporarily. Default — generally 270 days past due on federal loans — triggers wage garnishment and severe credit damage, so it is worth acting early.",
          },
          {
            question: "How much interest will I pay on a $30,000 student loan?",
            answer:
              "At 5.5% over the standard 10-year term, a $30,000 loan costs about $326 a month and roughly $9,000 in total interest. Stretching the same loan to 25 years lowers the monthly payment but more than doubles the interest, which is exactly what the plan comparison table in this calculator makes visible.",
          },
          {
            question: "Does paying extra each month help?",
            answer:
              "Yes. On Standard and Graduated plans, any amount above the scheduled payment goes straight to principal once the month's interest is covered, which shortens the term and cuts total interest. On income-driven plans, extra payments reduce the balance but do not reduce the number of months to forgiveness.",
          },
          {
            question: "Are private student loans eligible for IDR or SAVE?",
            answer:
              "No. Income-driven repayment, SAVE and federal forgiveness programs apply only to federal loans. Private loans follow the terms in your promissory note, so use the Standard tab of this calculator to model them and talk to your lender about hardship options.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums break-words" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
