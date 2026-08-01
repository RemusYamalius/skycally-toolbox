import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, Info, TrendingDown } from "lucide-react";
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
  fmtMonths,
  fmtUSD,
  simulate,
  type CardInput,
  type PayoffResult,
  type PayoffStrategy,
} from "@/lib/credit-card-payoff/calc";
import { FIXED_COLOR, MINIMUM_COLOR, SAMPLE_CARD } from "@/lib/credit-card-payoff/samples";

const SLUG = "credit-card-payoff-calculator";

export const Route = createFileRoute("/tools/credit-card-payoff-calculator")({
  head: () => buildToolMeta(toolBySlug(SLUG, tools)),
  component: CreditCardPayoffPage,
});

function num(v: string): number {
  // Normalise decimal separator: some keyboards/locales produce "20,99"
  // instead of "20.99". parseFloat("20,99") silently returns 20, which
  // would cause a completely wrong interest calculation with no warning.
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type MinMode = "percent" | "flat";

function CreditCardPayoffPage() {
  const tool = toolBySlug(SLUG, tools);

  const [balance, setBalance] = useState(String(SAMPLE_CARD.balance));
  const [apr, setApr] = useState(String(SAMPLE_CARD.apr));
  const [minMode, setMinMode] = useState<MinMode>("percent");
  const [minRate, setMinRate] = useState(String(SAMPLE_CARD.minPaymentRate));
  const [minFloor, setMinFloor] = useState(String(SAMPLE_CARD.minPaymentFloor));
  const [flatMin, setFlatMin] = useState("100");
  const [fixedPayment, setFixedPayment] = useState(String(SAMPLE_CARD.fixedPayment ?? 200));
  const [tab, setTab] = useState<PayoffStrategy>("minimum");

  const input: CardInput = useMemo(
    () => ({
      balance: num(balance),
      apr: num(apr),
      minPaymentRate: minMode === "percent" ? num(minRate) : 0,
      minPaymentFloor: minMode === "percent" ? num(minFloor) : num(flatMin),
      fixedPayment: num(fixedPayment),
    }),
    [balance, apr, minMode, minRate, minFloor, flatMin, fixedPayment],
  );

  const { minimum, fixed } = useMemo(() => simulate(input), [input]);
  const hasBalance = input.balance > 0;

  const chartData = useMemo(() => {
    const maxMonths = Math.max(minimum.schedule.length, fixed?.schedule.length ?? 0);
    const step = Math.max(1, Math.ceil(maxMonths / 180));
    const rows: Array<Record<string, number>> = [];
    for (let m = 0; m < maxMonths; m += step) {
      rows.push({
        month: m + 1,
        minimum: Math.round(minimum.schedule[m]?.balance ?? 0),
        fixed: Math.round(fixed?.schedule[m]?.balance ?? 0),
      });
    }
    return rows;
  }, [minimum, fixed]);

  const activeResult: PayoffResult = tab === "fixed" && fixed ? fixed : minimum;
  const PAGE_SIZE = 24;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(activeResult.schedule.length / PAGE_SIZE);
  const visibleRows = activeResult.schedule.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fixedUsable = !!fixed && !fixed.error && fixed.months > 0;
  const interestSaved = fixedUsable ? Math.max(0, minimum.totalInterest - fixed!.totalInterest) : 0;
  const showLongWarning = hasBalance && (minimum.neverPaidOff || minimum.months > 120);

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Inputs */}
        <div className="min-w-0 rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
            Your credit card
          </h2>

          <div>
            <label htmlFor="cc-balance" className="block text-sm font-medium mb-2">
              Current balance ($)
            </label>
            <Input
              id="cc-balance"
              type="number"
              min={0}
              step={100}
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="cc-apr" className="block text-sm font-medium mb-2">
              Annual interest rate / APR (%)
            </label>
            <Input
              id="cc-apr"
              type="number"
              min={0}
              max={60}
              step={0.01}
              inputMode="decimal"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Check your card statement or app.</p>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Minimum payment type</span>
            <Tabs value={minMode} onValueChange={(v) => setMinMode(v as MinMode)}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="percent" className="text-xs sm:text-sm">
                  % of balance
                </TabsTrigger>
                <TabsTrigger value="flat" className="text-xs sm:text-sm">
                  Fixed minimum
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {minMode === "percent" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cc-min-rate" className="block text-sm font-medium mb-2">
                  Minimum (% of balance)
                </label>
                <Input
                  id="cc-min-rate"
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  inputMode="decimal"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cc-min-floor" className="block text-sm font-medium mb-2">
                  Floor amount ($)
                </label>
                <Input
                  id="cc-min-floor"
                  type="number"
                  min={0}
                  step={5}
                  inputMode="decimal"
                  value={minFloor}
                  onChange={(e) => setMinFloor(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="cc-flat-min" className="block text-sm font-medium mb-2">
                Fixed minimum amount ($)
              </label>
              <Input
                id="cc-flat-min"
                type="number"
                min={0}
                step={5}
                inputMode="decimal"
                value={flatMin}
                onChange={(e) => setFlatMin(e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor="cc-fixed" className="block text-sm font-medium mb-2">
              Fixed monthly payment ($) — optional
            </label>
            <Input
              id="cc-fixed"
              type="number"
              min={0}
              step={25}
              inputMode="decimal"
              placeholder="e.g. 200"
              value={fixedPayment}
              onChange={(e) => setFixedPayment(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Pay this same amount every month instead of the minimum, and compare the two.
            </p>
          </div>

          {/* What-if slider */}
          {hasBalance &&
            input.balance > 0 &&
            (() => {
              const minMonthlyInterest = input.balance * (input.apr / 100 / 12);
              const suggested = Math.ceil(Math.max(minMonthlyInterest * 1.5, 50) / 25) * 25;
              const sliderMax = Math.ceil((input.balance * 0.1) / 25) * 25;
              const sliderVal = num(fixedPayment) || suggested;
              return (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    💡 What if I pay…
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono w-16 shrink-0 text-foreground">
                      {fmtUSD(sliderVal, { decimals: 0 })}/mo
                    </span>
                    <input
                      type="range"
                      min={Math.ceil(minMonthlyInterest + 1)}
                      max={sliderMax || 500}
                      step={25}
                      value={sliderVal}
                      onChange={(e) => setFixedPayment(e.target.value)}
                      className="flex-1 accent-[var(--cyan-brand)]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drag to explore — updates the Fixed strategy instantly.
                  </p>
                </div>
              );
            })()}

          <p className="text-xs text-muted-foreground flex items-start gap-2 pt-2 border-t border-border">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            Interest is compounded monthly at APR ÷ 12 on the remaining balance.
          </p>
        </div>

        {/* Results */}
        <section className="min-w-0 space-y-5" aria-live="polite">
          {!hasBalance ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Enter your card balance to see how long payoff will take.
            </div>
          ) : (
            <>
              {/* Strategy comparison */}
              <div className="grid gap-4 sm:grid-cols-2">
                <StrategyCard
                  title="Minimum payment"
                  accent={MINIMUM_COLOR}
                  rows={[
                    ["Time to payoff", minimum.neverPaidOff ? "50+ years" : fmtMonths(minimum.months)],
                    ["Total interest", fmtUSD(minimum.totalInterest)],
                    ["Total paid", fmtUSD(minimum.totalPaid)],
                    ["Interest saved", "—"],
                  ]}
                />
                <StrategyCard
                  title={fixedUsable ? `Fixed ${fmtUSD(input.fixedPayment ?? 0)}/month` : "Fixed payment"}
                  accent={FIXED_COLOR}
                  rows={
                    fixedUsable
                      ? [
                          ["Time to payoff", fmtMonths(fixed!.months)],
                          ["Total interest", fmtUSD(fixed!.totalInterest)],
                          ["Total paid", fmtUSD(fixed!.totalPaid)],
                          ["Interest saved", `${fmtUSD(interestSaved)} saved ✅`],
                        ]
                      : undefined
                  }
                  empty={
                    fixed?.error === "payment-below-interest"
                      ? "That payment is smaller than this card's monthly interest, so the balance would never go down. Increase the fixed monthly payment."
                      : "Enter a fixed monthly payment to compare a second strategy."
                  }
                />
              </div>

              {showLongWarning && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <p className="text-red-700 dark:text-red-200">
                    At minimum payments only, this balance will take{" "}
                    <strong>{minimum.neverPaidOff ? "more than 50 years" : fmtMonths(minimum.months)}</strong> to pay
                    off. You&apos;ll pay <strong>{fmtUSD(minimum.totalInterest)}</strong> in interest alone
                    {minimum.neverPaidOff ? " over the first 50 years" : ""}.
                  </p>
                </div>
              )}

              {/* Chart */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-display text-lg font-bold mb-1 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" style={{ color: FIXED_COLOR }} aria-hidden="true" />
                  Balance remaining over time
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  How fast each strategy clears the balance, month by month.
                </p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ccMinFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MINIMUM_COLOR} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={MINIMUM_COLOR} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="ccFixedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={FIXED_COLOR} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={FIXED_COLOR} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        opacity={0.5}
                        tickFormatter={(v: number) => `${Math.round(v / 12)}y`}
                        label={{ value: "Years", position: "insideBottom", offset: -2, fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        opacity={0.5}
                        width={64}
                        tickFormatter={(v: number) => fmtUSD(v)}
                      />
                      <RTooltip
                        formatter={(v: number, name: string) => [fmtUSD(v), name]}
                        labelFormatter={(l: number) => `Month ${l.toLocaleString("en-US")}`}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="minimum"
                        name="Minimum payment"
                        stroke={MINIMUM_COLOR}
                        fill="url(#ccMinFill)"
                        strokeWidth={2}
                      />
                      {fixedUsable && (
                        <Area
                          type="monotone"
                          dataKey="fixed"
                          name="Fixed payment"
                          stroke={FIXED_COLOR}
                          fill="url(#ccFixedFill)"
                          strokeWidth={2}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Schedule */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="font-display text-lg font-bold">Payment schedule</h2>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="h-7 px-2"
                      >
                        ←
                      </Button>
                      <span>
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, activeResult.schedule.length)} of{" "}
                        {activeResult.schedule.length.toLocaleString("en-US")} months
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="h-7 px-2"
                      >
                        →
                      </Button>
                    </div>
                  )}
                </div>

                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    setTab(v as PayoffStrategy);
                    setPage(0);
                  }}
                >
                  <TabsList className="grid grid-cols-2 w-full max-w-xs mb-3">
                    <TabsTrigger value="minimum" className="text-xs sm:text-sm">
                      Minimum
                    </TabsTrigger>
                    <TabsTrigger value="fixed" className="text-xs sm:text-sm" disabled={!fixedUsable}>
                      Fixed
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Month</th>
                        <th className="py-2 pr-3 font-medium text-right">Payment</th>
                        <th className="py-2 pr-3 font-medium text-right">Interest</th>
                        <th className="py-2 pr-3 font-medium text-right">Principal</th>
                        <th className="py-2 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => (
                        <tr key={r.month} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 tabular-nums">{r.month.toLocaleString("en-US")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.payment, { decimals: 2 })}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.interest, { decimals: 2 })}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(r.principal, { decimals: 2 })}</td>
                          <td className="py-2 text-right tabular-nums">{fmtUSD(r.balance, { decimals: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
                <p className="text-amber-800 dark:text-amber-200">
                  Estimates only. Actual payments may vary based on your card&apos;s billing cycle, fees, and any new
                  purchases. Not financial advice.
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Carrying balances across multiple cards? The{" "}
        <Link to="/tools/debt-payoff-calculator" className="text-foreground underline underline-offset-4">
          Debt Payoff Calculator
        </Link>{" "}
        helps you prioritize them with the Snowball or Avalanche strategy. For your full financial picture, see the{" "}
        <Link to="/tools/income-tax-calculator" className="text-foreground underline underline-offset-4">
          Income Tax Calculator
        </Link>{" "}
        and the{" "}
        <Link to="/tools/student-loan-calculator" className="text-foreground underline underline-offset-4">
          Student Loan Calculator
        </Link>
        .
      </p>

      <AdZone id="credit-card-payoff-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter your current credit card balance and the APR printed on your statement or shown in your card's app.",
          "Set how your issuer calculates the minimum payment — a percentage of the balance with a dollar floor, or one fixed minimum amount.",
          "Add a fixed monthly payment you could realistically afford, then compare payoff time, total interest and interest saved side by side.",
        ]}
      />

      <ToolSeoContent
        title="Credit Card Payoff Calculator — See How Long & How Much Interest"
        description="Find out how long it takes to pay off your credit card, how much interest you'll pay at the minimum, and how much you save by paying a fixed amount every month instead."
        body={[
          "A credit card payoff calculator answers the one question a statement never makes obvious: if you keep paying what you are paying, when does this balance actually reach zero? Enter your balance, your APR and the way your issuer works out the minimum payment, and this tool amortizes the card month by month — interest first, then whatever is left toward principal — until the balance clears. Everything runs in your browser as you type; no balance, rate or payment is ever sent to a server.",
          "Credit card interest is calculated monthly, not yearly. The monthly rate is your APR divided by twelve, applied to the balance you carry. On a $5,000 balance at 20% APR, the first month costs $83.33 in interest. If your minimum payment that month is $100, only $16.67 goes to principal — which is precisely why minimum payments feel like they never move the number. The schedule in this calculator shows that split for every single month.",
          "The strategy comparison is the point of the tool. Minimum payments shrink as the balance shrinks, so the payoff stretches out for decades and interest can end up costing more than the original purchase. A fixed monthly payment does the opposite: the payment stays flat while the interest portion falls, so principal accelerates every month. On a typical card, committing to a couple of hundred dollars a month instead of the minimum turns a multi-decade payoff into a couple of years and saves thousands in interest.",
          "Two guardrails are built in. If a fixed payment is smaller than the card's monthly interest, the calculator tells you instead of pretending the balance falls — mathematically, that balance grows forever. And if minimum payments alone would take more than fifty years, the simulation stops and flags it rather than spinning. If you are juggling more than one card, use the Debt Payoff Calculator to order them by snowball or avalanche, then come back here to stress-test a single card's payoff plan.",
        ]}
        faqs={[
          {
            question: "How long does it take to pay off $5,000 in credit card debt?",
            answer:
              "It depends almost entirely on what you pay. At a typical 20% APR with a 2%-of-balance minimum, $5,000 takes decades and costs more in interest than the original balance. Paying a flat $200 a month clears the same $5,000 in roughly 33 months with about $1,500 in interest — enter your own numbers above to see both timelines side by side.",
          },
          {
            question: "What happens if I only pay the minimum?",
            answer:
              "The minimum is calculated as a small percentage of the balance, so it shrinks every month as the balance falls. Most of each payment goes to interest, principal barely moves, and the payoff date stretches out for years or decades. Paying only the minimum is not a default risk, but it is the most expensive way to carry a balance.",
          },
          {
            question: "How is credit card interest calculated?",
            answer:
              "Take your APR, divide it by 12 to get a monthly rate, and multiply it by the balance you carry into the month. A 20.99% APR is about 1.749% per month, so a $3,000 balance accrues roughly $52 in interest. Interest is charged before your payment is applied, so only the amount above the interest reduces what you owe.",
          },
          {
            question: "Should I pay more than the minimum payment?",
            answer:
              "Almost always, yes. Every dollar above the month's interest goes straight to principal, which lowers next month's interest too — the effect compounds in your favor. Even an extra $50 a month typically cuts years off the payoff and saves hundreds of dollars, which you can verify by adjusting the fixed monthly payment field above.",
          },
          {
            question: "Does this calculator include new purchases or fees?",
            answer:
              "No. It models the balance you enter with no new spending, no annual fee and no late fees. Adding purchases while paying down a card pushes the real payoff date later, so treat these results as a best case for the balance you have today.",
          },
          {
            question: "What is a typical credit card minimum payment?",
            answer:
              'Most US issuers use 1% to 3% of the statement balance plus accrued interest, with a dollar floor of about $25 to $35 — whichever is greater. If your statement shows a fixed minimum instead, switch the minimum payment type to "Fixed minimum" and enter that amount.',
          },
          {
            question: "Will a balance transfer pay off my card faster?",
            answer:
              "A 0% introductory balance transfer can help a lot, because during the promotional window every dollar goes to principal. Factor in the transfer fee, usually 3% to 5%, and make sure you can clear the balance before the promo rate expires — otherwise the regular APR applies to whatever is left.",
          },
          {
            question: "Is my data saved anywhere?",
            answer:
              "No. The entire calculation runs client-side in your browser. Nothing you type is uploaded, stored or shared, and there is no signup, so you can model real balances safely.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

function StrategyCard({
  title,
  accent,
  rows,
  empty,
}: {
  title: string;
  accent: string;
  rows?: Array<[string, string]>;
  empty?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold" style={{ color: accent }}>
        {title}
      </p>
      {rows ? (
        <dl className="mt-3 space-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="font-display text-base font-bold tabular-nums text-right break-words">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
