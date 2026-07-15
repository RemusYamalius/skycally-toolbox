import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Info, AlertTriangle, Plus, Trash2, Sparkles, Trophy, ShieldCheck } from "lucide-react";
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
import { Button } from "@/components/ui/button";

import { compare, fmtUSD, fmtMonths, type Debt, type SimInput, type SimResult, type Strategy } from "@/lib/debt-payoff/calc";
import { SAMPLE_DEBTS, DEBT_COLORS } from "@/lib/debt-payoff/samples";

const SLUG = "debt-payoff-calculator";

export const Route = createFileRoute("/tools/debt-payoff-calculator")({
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
            name: "Debt Payoff Calculator",
            description:
              "Free debt payoff calculator comparing snowball and avalanche methods side by side. Timeline chart, extra-payment and lump-sum modeling — fully client-side, no signup.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/debt-payoff-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Unlimited debts with name, balance, APR and minimum payment",
              "Debt snowball method (smallest balance first)",
              "Debt avalanche method (highest interest rate first)",
              "Snowball vs avalanche side-by-side comparison on the same inputs",
              "Extra monthly payment modeling",
              "One-time lump-sum payment with month picker",
              "Per-debt balance timeline chart (stacked area)",
              "Highlighted interest saved by your extra payment",
              "Underwater-debt warning when minimums can't cover interest",
              "Runs entirely in your browser — no account, no signup, no data sent to a server",
            ],
          }),
        },
      ],
    };
  },
  component: DebtPayoffCalculatorPage,
});

function DebtPayoffCalculatorPage() {
  const tool = toolBySlug(SLUG, tools);

  const [debts, setDebts] = useState<Debt[]>(SAMPLE_DEBTS);
  const [extraMonthly, setExtraMonthly] = useState("100");
  const [lumpAmount, setLumpAmount] = useState("0");
  const [lumpMonth, setLumpMonth] = useState("3");
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("avalanche");

  const input: SimInput = useMemo(() => {
    const lump = parseFloat(lumpAmount) || 0;
    const lm = Math.max(1, parseInt(lumpMonth, 10) || 1);
    return {
      debts: debts.map((d) => ({
        ...d,
        balance: Number(d.balance) || 0,
        apr: Number(d.apr) || 0,
        minPayment: Number(d.minPayment) || 0,
      })),
      extraMonthly: parseFloat(extraMonthly) || 0,
      lumpSum: lump > 0 ? { month: lm, amount: lump } : undefined,
    };
  }, [debts, extraMonthly, lumpAmount, lumpMonth]);

  const result = useMemo(() => compare(input), [input]);
  const hasDebts = input.debts.some((d) => d.balance > 0);
  const active = activeStrategy === "snowball" ? result.snowball : result.avalanche;

  const addDebt = () => {
    const id = "d" + Date.now();
    setDebts([...debts, { id, name: `Debt ${debts.length + 1}`, balance: 0, apr: 0, minPayment: 0 }]);
  };
  const removeDebt = (id: string) => setDebts(debts.filter((d) => d.id !== id));
  const updateDebt = (id: string, patch: Partial<Debt>) =>
    setDebts(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <aside className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your debts</h2>
              <Button size="sm" variant="outline" onClick={addDebt} className="h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add debt
              </Button>
            </div>

            <div className="space-y-3">
              {debts.map((d, i) => (
                <DebtRow
                  key={d.id}
                  debt={d}
                  color={DEBT_COLORS[i % DEBT_COLORS.length]}
                  canRemove={debts.length > 1}
                  onChange={(patch) => updateDebt(d.id, patch)}
                  onRemove={() => removeDebt(d.id)}
                />
              ))}
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <Field label="Extra monthly payment (above the combined minimums)">
                <MoneyInput value={extraMonthly} onChange={setExtraMonthly} step={25} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="One-time lump sum">
                  <MoneyInput value={lumpAmount} onChange={setLumpAmount} step={100} />
                </Field>
                <Field label="Applied in month">
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={lumpMonth}
                    onChange={(e) => setLumpMonth(e.target.value)}
                    aria-label="Month of lump-sum payment"
                  />
                </Field>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
              Runs entirely in your browser. No account, no signup, nothing sent to a server.
            </p>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              Estimates for informational and planning purposes only. Not financial advice. Actual payoff depends on your
              lender's exact compounding, fees, and any new debt added during payoff.
            </p>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-3 space-y-5" aria-live="polite">
          {!hasDebts ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Add at least one debt with a balance to see your payoff plan.
            </div>
          ) : (
            <>
              {(result.snowball.warning === "underwater" || result.avalanche.warning === "underwater") && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-amber-200">Your minimums may not cover interest</p>
                    <p className="text-amber-100/80 mt-1">
                      At the current rates and payments, at least one debt is growing faster than you're paying it down.
                      Increase your extra monthly payment or minimums, or consider debt consolidation.
                    </p>
                  </div>
                </div>
              )}

              <ExtraSavingsCallout
                interestSaved={result.interestSavedByExtra[activeStrategy]}
                extra={input.extraMonthly}
                strategyLabel={activeStrategy === "snowball" ? "Snowball" : "Avalanche"}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <StrategyCard
                  title="Debt Snowball"
                  subtitle="Smallest balance first"
                  result={result.snowball}
                  isWinner={result.winner === "snowball"}
                  isActive={activeStrategy === "snowball"}
                  onClick={() => setActiveStrategy("snowball")}
                />
                <StrategyCard
                  title="Debt Avalanche"
                  subtitle="Highest interest rate first"
                  result={result.avalanche}
                  isWinner={result.winner === "avalanche"}
                  isActive={activeStrategy === "avalanche"}
                  onClick={() => setActiveStrategy("avalanche")}
                />
              </div>

              <TradeoffNote
                winner={result.winner}
                interestDelta={Math.abs(result.interestDelta)}
                monthsDelta={Math.abs(result.monthsDelta)}
              />

              <TimelineChart
                debts={input.debts.filter((d) => d.balance > 0)}
                result={active}
                strategyLabel={activeStrategy === "snowball" ? "Snowball" : "Avalanche"}
                onToggle={() => setActiveStrategy(activeStrategy === "snowball" ? "avalanche" : "snowball")}
              />

              <PerDebtBreakdown result={active} debts={input.debts.filter((d) => d.balance > 0)} />
            </>
          )}
        </section>
      </div>

      <AdZone id="debt-payoff-calculator-mid" size="728x90" />

      <InternalLinks />

      <HowToUse
        steps={[
          "Add every debt you owe: credit cards, car loans, personal loans, student loans — with balance, APR and minimum monthly payment.",
          "Enter any extra amount you can put toward debt each month, and optionally a one-time lump sum like a tax refund or bonus.",
          "Compare snowball and avalanche side by side, then pick the strategy that fits how you actually stick to plans in real life.",
        ]}
      />

      <ToolSeoContent
        title="Debt Payoff Calculator — Snowball vs Avalanche"
        description="Free debt payoff calculator that compares the debt snowball and debt avalanche methods on the exact same inputs. See months to debt-free, total interest, and how much a little extra payment really saves."
        body={[
          "Skycally's Debt Payoff Calculator lets you enter every debt you owe — credit cards, car loans, personal loans, student loans — and simulates month-by-month what happens under two of the most-used payoff strategies: the debt snowball (smallest balance first) and the debt avalanche (highest interest rate first). Instead of running two separate calculators and comparing tabs, both plans are computed on the same inputs and shown side by side, with total interest paid, months to debt-free, and a clear payoff date for each. The whole thing runs in your browser: no signup, no account, no data leaves your device.",
          "The debt snowball method, popularized by Dave Ramsey, tells you to throw every extra dollar at your smallest balance first — regardless of interest rate — because clearing a debt entirely gives you a psychological win that keeps you on plan. The debt avalanche method attacks the highest APR first, which is mathematically optimal: you pay the least total interest and become debt-free the fastest. Avalanche wins on paper almost every time; snowball wins in the real world for people who need momentum to stick with a hard, multi-year plan. This calculator is deliberately even-handed — it labels whichever plan wins on interest, but doesn't pretend the other is wrong.",
          "Extra payments matter more than most people realize. Because credit-card interest compounds monthly, every dollar above the minimum reduces principal that would otherwise keep accruing at 20%+ APR for years. This tool shows the interest you save specifically by adding your extra monthly amount versus paying only the minimums — the single most motivating number when you're deciding whether to squeeze another $50 or $100 out of the budget. A one-time lump sum (a tax refund, a bonus, a stimulus check) applied early in the plan often cuts more time off the payoff than months of grinding extra payments later, so the calculator lets you model that too, with a month picker so you can see the exact timing effect.",
          "A payoff plan is only part of getting out of debt. Use our Paycheck Calculator to see how much of your take-home you can realistically redirect toward extra payments without breaking the rest of your budget. Before throwing every spare dollar at low-rate debt, consider that the same money invested might grow faster than the interest you're saving — our Compound Interest Calculator lets you compare that trade-off head to head. And if you're weighing a consolidation loan to combine several high-rate debts into one lower-rate payment, the Loan Calculator will show you what that single new payment would look like before you commit.",
        ]}
        faqs={[
          {
            question: "What is the debt snowball method?",
            answer:
              "The debt snowball is a payoff strategy where you order your debts by balance from smallest to largest, pay the minimum on all of them, and throw every extra dollar at the smallest balance until it's gone. Once that debt is cleared, its old minimum plus your extra amount rolls onto the next-smallest — like a snowball growing as it rolls. It ignores interest rate entirely; the point is fast, visible wins that keep you motivated.",
          },
          {
            question: "What is the debt avalanche method?",
            answer:
              "The debt avalanche orders your debts by APR from highest to lowest and directs every extra dollar to the highest-interest debt first, regardless of balance. Because you're always killing off the most expensive interest first, avalanche mathematically minimizes total interest paid and usually gets you debt-free the fastest. The tradeoff is you may not see a debt disappear entirely for months if your highest-APR balance is also your biggest.",
          },
          {
            question: "Which is better, snowball or avalanche?",
            answer:
              "Avalanche is mathematically better — it always pays equal or less total interest, and usually gets you debt-free sooner. But personal finance is 80% behavior. Studies have found that people using the snowball method are more likely to actually finish their payoff plan, because clearing a debt entirely is a huge motivator. If your interest rates are all similar, the math difference is small and snowball's momentum wins. If one of your debts is at 25% APR and another at 5%, the avalanche gap widens and the math starts to really matter.",
          },
          {
            question: "Does paying extra every month really save that much interest?",
            answer:
              "Yes — usually more than people expect. Credit-card interest compounds monthly, so every dollar of extra payment reduces the principal that would otherwise keep growing at 20%+ for years. On a $5,000 credit card at 22% APR with a $120 minimum, adding just $100/month extra can cut your payoff time roughly in half and save well over a thousand dollars in interest. The calculator's 'interest saved with your extra payment' number is computed from your specific debts.",
          },
          {
            question: "Should I pay off debt or invest extra money instead?",
            answer:
              "General rule: pay down anything above roughly 7–8% APR before investing extra (that's the long-term average stock market return, and paying off high-rate debt is a guaranteed return of that rate). For low-rate debt like some student loans and mortgages, investing may come out ahead over long horizons. Always capture any employer 401(k) match first — that's an instant 50–100% return no debt can beat. Our Compound Interest Calculator lets you model the investing side of that comparison.",
          },
          {
            question: "What if my minimum payments don't cover the interest?",
            answer:
              "If your minimums are less than the interest accruing each month, your balance grows even while you pay — a debt spiral. The calculator will show an amber underwater warning when this is happening. Options: increase your monthly payment enough to cover interest plus some principal, call your lenders and negotiate a lower rate, or look into debt consolidation to combine everything into one lower-rate loan. A nonprofit credit counselor (NFCC-affiliated) can help if you're stuck.",
          },
          {
            question: "Should I consolidate my debts instead of paying them off one by one?",
            answer:
              "Consolidation can help if you qualify for a rate meaningfully lower than what you're paying now — for example, moving $15,000 of credit card debt at 22% APR into a personal loan at 11%. But it only works if you don't rack up new debt on the freed-up cards. Balance-transfer cards with 0% promo APRs can be even better for smaller balances, as long as you can pay it off before the promo ends. Use our Loan Calculator to see what a consolidation loan payment would look like before applying.",
          },
          {
            question: "How is this different from a regular loan calculator?",
            answer:
              "A loan calculator handles one debt at a time — you plug in principal, rate, and term to see one monthly payment. A debt payoff calculator handles many debts at once and answers a different question: given a fixed budget across all of them, in what order should you attack them and how long will the whole plan take? It also rolls freed-up minimum payments from cleared debts onto the next priority debt, which a single-loan calculator can't model.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

/* -------------------------------------------------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function MoneyInput({ value, onChange, step = 100 }: { value: string; onChange: (v: string) => void; step?: number }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7"
      />
    </div>
  );
}

function DebtRow({
  debt,
  color,
  canRemove,
  onChange,
  onRemove,
}: {
  debt: Debt;
  color: string;
  canRemove: boolean;
  onChange: (patch: Partial<Debt>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
        <Input
          value={debt.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Debt name"
          className="h-8 text-sm"
          aria-label="Debt name"
        />
        <button
          onClick={onRemove}
          disabled={!canRemove}
          className="text-muted-foreground hover:text-destructive disabled:opacity-30 p-1"
          aria-label={`Remove ${debt.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Balance">
          <MoneyInput
            value={String(debt.balance)}
            onChange={(v) => onChange({ balance: parseFloat(v) || 0 })}
            step={100}
          />
        </Field>
        <Field label="APR %">
          <Input
            type="number"
            min={0}
            step={0.1}
            value={debt.apr}
            onChange={(e) => onChange({ apr: parseFloat(e.target.value) || 0 })}
            aria-label="APR percent"
          />
        </Field>
        <Field label="Min payment">
          <MoneyInput
            value={String(debt.minPayment)}
            onChange={(v) => onChange({ minPayment: parseFloat(v) || 0 })}
            step={10}
          />
        </Field>
        <Field label="Monthly interest">
          <div className="h-9 flex items-center px-3 text-sm text-muted-foreground tabular-nums rounded-md border border-input bg-background/60">
            {fmtUSD((debt.balance * (debt.apr / 100)) / 12, { decimals: 2 })}
          </div>
        </Field>
      </div>
    </div>
  );
}

function StrategyCard({
  title,
  subtitle,
  result,
  isWinner,
  isActive,
  onClick,
}: {
  title: string;
  subtitle: string;
  result: SimResult;
  isWinner: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-left rounded-2xl p-5 border transition relative overflow-hidden ${
        isActive ? "border-transparent" : "border-border hover:border-foreground/30"
      }`}
      style={
        isActive
          ? { background: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)", color: "white" }
          : undefined
      }
    >
      {isWinner && (
        <span
          className="absolute top-3 right-3 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: isActive ? "rgba(255,255,255,0.2)" : "color-mix(in oklab, var(--green-brand) 20%, transparent)", color: isActive ? "white" : "var(--green-brand)" }}
        >
          <Trophy className="w-3 h-3" aria-hidden="true" /> Lowest interest
        </span>
      )}
      <p className={`text-xs uppercase tracking-wide ${isActive ? "opacity-90" : "text-muted-foreground"}`}>{title}</p>
      <p className={`text-xs mb-4 ${isActive ? "opacity-80" : "text-muted-foreground"}`}>{subtitle}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{fmtUSD(result.totalInterest)}</p>
      <p className={`text-xs mb-4 ${isActive ? "opacity-80" : "text-muted-foreground"}`}>Total interest paid</p>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-xs">
        <div>
          <p className={isActive ? "opacity-80" : "text-muted-foreground"}>Debt-free in</p>
          <p className="font-semibold tabular-nums text-sm">{fmtMonths(result.months)}</p>
        </div>
        <div>
          <p className={isActive ? "opacity-80" : "text-muted-foreground"}>Payoff date</p>
          <p className="font-semibold tabular-nums text-sm">{result.payoffDate}</p>
        </div>
      </div>
    </motion.button>
  );
}

function TradeoffNote({ winner, interestDelta, monthsDelta }: { winner: "snowball" | "avalanche" | "tie"; interestDelta: number; monthsDelta: number }) {
  if (winner === "tie" || interestDelta < 1) {
    return (
      <p className="text-sm text-muted-foreground text-center px-4">
        Both strategies come out roughly the same on your inputs — pick whichever you'll actually stick with.
      </p>
    );
  }
  const winnerName = winner === "avalanche" ? "Avalanche" : "Snowball";
  const loserName = winner === "avalanche" ? "Snowball" : "Avalanche";
  return (
    <p className="text-sm text-muted-foreground text-center px-4">
      <strong className="text-foreground">{winnerName}</strong> saves {fmtUSD(interestDelta)} in interest
      {monthsDelta > 0 ? ` and ${monthsDelta} month${monthsDelta === 1 ? "" : "s"}` : ""} versus {loserName}.
      Snowball can still be the right choice if quick wins keep you motivated — the "best" plan is the one you'll actually finish.
    </p>
  );
}

function ExtraSavingsCallout({ interestSaved, extra, strategyLabel }: { interestSaved: number; extra: number; strategyLabel: string }) {
  if (extra <= 0 || interestSaved < 1) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-5 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          Try adding an extra monthly payment above to see how much interest you'd save.
        </div>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex items-start gap-3"
      style={{
        borderColor: "color-mix(in oklab, var(--green-brand) 40%, transparent)",
        background: "color-mix(in oklab, var(--green-brand) 10%, transparent)",
      }}
    >
      <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Interest saved with your extra payment ({strategyLabel})</p>
        <p className="font-display text-3xl font-bold tabular-nums" style={{ color: "var(--green-brand)" }}>
          {fmtUSD(interestSaved)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Compared with paying only the minimums. That's what your extra {fmtUSD(extra)}/month is buying you.
        </p>
      </div>
    </motion.div>
  );
}

function TimelineChart({
  debts,
  result,
  strategyLabel,
  onToggle,
}: {
  debts: Debt[];
  result: SimResult;
  strategyLabel: string;
  onToggle: () => void;
}) {
  const data = useMemo(() => {
    // Sample every N months to keep the chart light
    const step = Math.max(1, Math.floor(result.timeline.length / 60));
    const points = result.timeline.filter((_, i) => i % step === 0 || i === result.timeline.length - 1);
    return points.map((p) => {
      const row: Record<string, number | string> = { month: p.month };
      for (const d of debts) row[d.name] = Math.round(p.balances[d.id] ?? 0);
      return row;
    });
  }, [result, debts]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Balance timeline — {strategyLabel}</h3>
          <p className="text-xs text-muted-foreground">Every debt shrinking to zero, month by month.</p>
        </div>
        <button
          onClick={onToggle}
          className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-foreground/40 transition"
        >
          Switch to {strategyLabel === "Snowball" ? "Avalanche" : "Snowball"}
        </button>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <RTooltip
              formatter={(v: number) => fmtUSD(v)}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(m) => `Month ${m}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {debts.map((d, i) => (
              <Area
                key={d.id}
                type="monotone"
                dataKey={d.name}
                stackId="1"
                stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                fill={DEBT_COLORS[i % DEBT_COLORS.length]}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PerDebtBreakdown({ result, debts }: { result: SimResult; debts: Debt[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold mb-3">Per-debt breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
              <th className="py-2 font-medium">Debt</th>
              <th className="py-2 font-medium text-right">Starting balance</th>
              <th className="py-2 font-medium text-right">Interest paid</th>
              <th className="py-2 font-medium text-right">Payoff month</th>
            </tr>
          </thead>
          <tbody>
            {result.perDebt.map((pd, i) => {
              const debt = debts.find((d) => d.id === pd.id);
              return (
                <tr key={pd.id} className="border-b border-border/50">
                  <td className="py-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: DEBT_COLORS[i % DEBT_COLORS.length] }} aria-hidden="true" />
                    {pd.name}
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmtUSD(debt?.balance ?? 0)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUSD(pd.interestPaid)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMonths(pd.monthsToPayoff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InternalLinks() {
  const items: Array<{ to: string; title: string; body: string }> = [
    {
      to: "/tools/paycheck-calculator",
      title: "Paycheck Calculator",
      body: "See how much of your take-home pay you can realistically redirect toward extra debt payments without breaking the rest of your budget.",
    },
    {
      to: "/tools/compound-interest",
      title: "Compound Interest Calculator",
      body: "Compare what that same extra payment could earn if invested instead of used to pay down low-rate debt faster.",
    },
    {
      to: "/tools/loan-calculator",
      title: "Loan Calculator",
      body: "Modeling a debt consolidation loan instead? See what a single new loan payment would look like before you apply.",
    },
  ];
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
      <h2 className="font-display text-lg font-bold mb-4">Build the rest of your plan</h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className="group block rounded-xl border border-border p-4 hover:border-foreground/40 transition h-full">
              <p className="font-semibold group-hover:underline flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
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
