import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Landmark } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  FEDERAL_BRACKETS,
  FILING_LABELS,
  STANDARD_DEDUCTION,
  type FilingStatus,
} from "@/lib/paycheck/constants";
import { computeFederal, fmtUSD } from "@/lib/paycheck/calc";

export const Route = createFileRoute("/tools/income-tax-calculator")({
  head: () => buildToolMeta(toolBySlug("income-tax-calculator", tools)),
  component: IncomeTaxCalculator,
});

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmtPct(n: number, decimals = 2): string {
  return `${(n * 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/** Same logic as the paycheck calculator's fedMarg/topRate, over the same FEDERAL_BRACKETS. */
function marginalRate(taxable: number, filing: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[filing];
  if (taxable <= 0) return brackets[0].rate;
  for (const b of brackets) {
    if (taxable <= b.upTo) return b.rate;
  }
  return brackets[brackets.length - 1].rate;
}

interface BracketRow {
  rate: number;
  label: string;
  from: number;
  to: number;
  amount: number;
  tax: number;
}

function bracketBreakdown(taxable: number, filing: FilingStatus): BracketRow[] {
  const rows: BracketRow[] = [];
  let lower = 0;
  for (const b of FEDERAL_BRACKETS[filing]) {
    const amount = Math.max(0, Math.min(taxable, b.upTo) - lower);
    rows.push({
      rate: b.rate,
      label: `${(b.rate * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`,
      from: lower,
      to: b.upTo,
      amount,
      tax: amount * b.rate,
    });
    lower = b.upTo;
    if (taxable <= b.upTo) break;
  }
  return rows;
}

const BAR_COLORS = ["var(--cyan-brand)", "var(--green-brand)"];

function IncomeTaxCalculator() {
  const tool = toolBySlug("income-tax-calculator", tools);

  const [filing, setFiling] = useState<FilingStatus>("single");
  const [income, setIncome] = useState("85000");
  const [mode, setMode] = useState<"standard" | "itemized">("standard");
  const [itemized, setItemized] = useState("");
  const [withheld, setWithheld] = useState("");

  const grossIncome = num(income);
  const standard = STANDARD_DEDUCTION[filing];
  const itemizedValue = mode === "itemized" ? num(itemized) : 0;
  const deductionUsed = Math.max(standard, itemizedValue);
  const usedItemized = mode === "itemized" && itemizedValue > standard;

  const taxable = Math.max(0, grossIncome - deductionUsed);
  const tax = computeFederal(taxable, filing);
  const effective = grossIncome > 0 ? tax / grossIncome : 0;
  const marginal = marginalRate(taxable, filing);

  const rows = useMemo(() => bracketBreakdown(taxable, filing), [taxable, filing]);
  const chartData = rows.filter((r) => r.amount > 0).map((r) => ({ ...r, name: r.label }));

  const withheldRaw = withheld.trim();
  const hasWithheld = withheldRaw !== "" && Number.isFinite(parseFloat(withheldRaw));
  const withheldValue = num(withheld);
  const balance = withheldValue - tax; // positive = refund

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Landmark className="w-5 h-5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
            Your 2026 federal return
          </h2>

          <div>
            <label htmlFor="filing" className="block text-sm font-medium mb-2">
              Filing status
            </label>
            <select
              id="filing"
              value={filing}
              onChange={(e) => setFiling(e.target.value as FilingStatus)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(FILING_LABELS) as FilingStatus[]).map((k) => (
                <option key={k} value={k}>
                  {FILING_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="income" className="block text-sm font-medium mb-2">
              Total annual gross income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="income"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="pl-7 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything you expect to earn this year, from all sources, before any deductions.
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Deduction</span>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "standard" | "itemized")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standard">Standard</TabsTrigger>
                <TabsTrigger value="itemized">Itemized</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "standard" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Standard deduction for {FILING_LABELS[filing]}: <strong>{fmtUSD(standard)}</strong>
              </p>
            ) : (
              <div className="mt-3">
                <label htmlFor="itemized" className="block text-sm font-medium mb-2">
                  Total itemized deductions
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="itemized"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={itemized}
                    onChange={(e) => setItemized(e.target.value)}
                    className="pl-7 text-lg"
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mortgage interest, state and local taxes, charitable gifts, and so on. The calculator always uses
                  whichever is larger — your itemized total or the {fmtUSD(standard)} standard deduction.
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="withheld" className="block text-sm font-medium mb-2">
              Federal tax already withheld or paid this year{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="withheld"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={withheld}
                onChange={(e) => setWithheld(e.target.value)}
                className="pl-7 text-lg"
                placeholder="Leave blank to skip"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From your pay stubs or estimated payments. Leave it blank and the refund estimate stays hidden. The
              refund figure is a simplified difference — it ignores tax credits entirely.
            </p>
          </div>

          <div
            role="note"
            className="flex gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
            <span>
              Estimates only. Federal tax only — no state tax, no tax credits (Child Tax Credit, EITC, etc.) included.
              Not tax advice.
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">Taxable income</div>
              <div className="mt-1 font-display text-3xl font-extrabold">{fmtUSD(taxable)}</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground/80">
                {fmtUSD(grossIncome)} − {fmtUSD(deductionUsed)}
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--green-brand)" }}>
                {usedItemized ? "Itemized deduction used — higher than standard" : "Standard deduction used"}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--cyan-brand)_14%,transparent)] to-card p-5">
              <div className="text-sm text-muted-foreground">Federal tax owed</div>
              <div className="mt-1 font-display text-3xl font-extrabold" style={{ color: "var(--cyan-brand)" }}>
                {fmtUSD(tax)}
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground/80">sum of each bracket</div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">Effective tax rate</div>
              <div className="mt-1 font-display text-3xl font-extrabold">{fmtPct(effective)}</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground/80">tax ÷ gross income</div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">Marginal tax rate</div>
              <div className="mt-1 font-display text-3xl font-extrabold">{fmtPct(marginal, 0)}</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground/80">rate on your last taxable dollar</div>
            </div>
          </div>

          {hasWithheld && (
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: balance >= 0 ? "color-mix(in oklab, var(--green-brand) 45%, transparent)" : undefined,
              }}
            >
              <div className="text-sm text-muted-foreground">
                {balance >= 0 ? "Estimated refund" : "Estimated amount owed"}
              </div>
              <div
                className="mt-1 font-display text-4xl font-extrabold"
                style={{ color: balance >= 0 ? "var(--green-brand)" : "hsl(var(--destructive))" }}
              >
                {fmtUSD(Math.abs(balance))}
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground/80">
                {fmtUSD(withheldValue)} withheld − {fmtUSD(tax)} tax
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Simplified estimate — tax credits could increase a refund or reduce what you owe.
              </p>
            </div>
          )}

          {/* Bracket breakdown — the headline feature */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Bracket breakdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only the income inside each band is taxed at that band's rate — moving into a higher bracket never taxes
              your whole income at the higher rate.
            </p>

            {chartData.length > 0 ? (
              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => fmtUSD(v)}
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      opacity={0.6}
                    />
                    <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 12 }} stroke="currentColor" opacity={0.6} />
                    <RTooltip
                      formatter={(v: number, key: string) => [fmtUSD(v), key === "amount" ? "Income in bracket" : "Tax"]}
                      labelFormatter={(l: string) => `${l} bracket`}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                    />
                    <Bar dataKey="amount" name="Income in bracket" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                With this income and deduction, no taxable income remains — no federal income tax is due.
              </p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Rate</th>
                    <th className="py-2 pr-3 font-medium">Taxable income range</th>
                    <th className="py-2 pr-3 font-medium text-right">Taxed here</th>
                    <th className="py-2 font-medium text-right">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rate} className="border-t border-border/60">
                      <td className="py-2 pr-3 font-semibold">{r.label}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {fmtUSD(r.from)} – {r.to === Infinity ? "and up" : fmtUSD(r.to)}
                      </td>
                      <td className="py-2 pr-3 text-right">{fmtUSD(r.amount)}</td>
                      <td className="py-2 text-right font-medium">{fmtUSD(r.tax)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="py-2 pr-3 font-bold" colSpan={3}>
                      Total federal tax
                    </td>
                    <td className="py-2 text-right font-bold" style={{ color: "var(--cyan-brand)" }}>
                      {fmtUSD(tax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
        For a per-paycheck breakdown instead of your total annual tax, use the{" "}
        <Link to="/tools/paycheck-calculator" className="underline underline-offset-4 hover:text-foreground">
          Paycheck Calculator
        </Link>
        , which also adds state tax and FICA. Because 401(k) contributions come out before federal income tax and lower
        your taxable income, the{" "}
        <Link to="/tools/retirement-calculator" className="underline underline-offset-4 hover:text-foreground">
          Retirement Calculator
        </Link>{" "}
        is a useful companion when you are deciding how much to contribute. And if you are itemizing, mortgage interest
        is usually the largest single line — the{" "}
        <Link to="/tools/mortgage-calculator" className="underline underline-offset-4 hover:text-foreground">
          Mortgage Calculator
        </Link>{" "}
        shows how much of each year's payments is interest rather than principal.
      </p>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-3">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          US federal income tax is progressive: your income is sliced into bands and each slice is taxed at its own
          rate. The calculator uses the same 2026 bracket and standard deduction data as every other Skycally tax tool.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Deduction used
            </div>
            <div className="font-mono text-sm">deduction = max(standard, itemized)</div>
            <p className="mt-2 text-xs text-muted-foreground">Itemizing only helps if it beats the standard amount.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Taxable income
            </div>
            <div className="font-mono text-sm">taxable = max(0, gross − deduction)</div>
            <p className="mt-2 text-xs text-muted-foreground">$85,000 − $16,100 standard (single) = $68,900.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Federal tax</div>
            <div className="font-mono text-sm">tax = Σ (income in band × band rate)</div>
            <p className="mt-2 text-xs text-muted-foreground">
              10% on the first slice, 12% on the next, and so on up your bracket ladder.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rates</div>
            <div className="font-mono text-sm">effective = tax ÷ gross</div>
            <div className="font-mono text-sm">marginal = rate on last taxable dollar</div>
            <p className="mt-2 text-xs text-muted-foreground">Effective is always lower than marginal.</p>
          </div>
        </div>
      </section>

      <AdZone id="income-tax-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick your filing status and enter your total annual gross income from all sources.",
          "Choose Standard or Itemized. The calculator automatically applies whichever deduction is larger and tells you which one it used.",
          "Optionally enter the federal tax already withheld this year to see an estimated refund or amount owed, then read the bracket breakdown to see exactly where each dollar was taxed.",
        ]}
      />

      <ToolSeoContent
        title="Federal Income Tax Calculator — Estimate Your 2026 Tax, Refund & Effective Rate"
        description="Free federal income tax calculator: enter your annual income and filing status to see your taxable income, federal income tax owed, effective and marginal rates, a bracket-by-bracket breakdown, and an income tax refund estimate."
        body={[
          "This federal income tax calculator answers the question most people are really asking: how much income tax will I pay this year? Enter your total annual gross income and your filing status and it applies the 2026 federal brackets and standard deduction to work out your taxable income, the federal income tax owed, your effective tax rate and your marginal tax rate. Everything recalculates as you type and nothing you enter leaves your browser.",
          "The standout feature is the bracket breakdown. Instead of a single number, the chart and table show exactly how much of your income landed in each band — 10%, 12%, 22% and up — and how much tax each band produced. That makes it obvious why a raise that pushes you into a higher bracket does not tax all of your income at the new rate: only the dollars above the threshold are taxed there. It is the clearest way to see the difference between your marginal rate and the much lower effective rate you actually pay.",
          "The tool doubles as a standard vs itemized deduction calculator. Switch to the Itemized tab, add up mortgage interest, state and local taxes and charitable giving, and the calculator automatically uses whichever figure is higher, labelling the result so you know which one applied. Add the federal tax already withheld from your pay stubs and it becomes an income tax refund calculator, showing the estimated refund or the amount you would owe.",
          "This is deliberately a simple estimator. It covers federal income tax only — no state income tax, no payroll or self-employment tax, and no tax credits such as the Child Tax Credit or the Earned Income Tax Credit, all of which can change the final figure substantially. Treat the result as a planning ballpark, not a filed return, and speak to a tax professional for anything binding.",
        ]}
        faqs={[
          {
            question: "What's the difference between this and the Paycheck Calculator?",
            answer:
              "This Income Tax Calculator works on your whole year at once and covers federal income tax only — total tax owed, effective rate, bracket breakdown and refund or balance due. The Paycheck Calculator works per pay period and models take-home pay, so it also subtracts state income tax, Social Security and Medicare, 401(k) and health premiums. Use this one for your annual return, the Paycheck Calculator to see what actually hits your bank account each payday.",
          },
          {
            question: "How much income tax will I pay?",
            answer:
              "It depends on your filing status and taxable income, not your gross income. Subtract your deduction (standard or itemized, whichever is larger) from your gross income, then tax each slice of what remains at its bracket rate. Enter your numbers above and the calculator shows the total plus the amount taxed at each rate.",
          },
          {
            question: "What is the difference between the effective and marginal tax rate?",
            answer:
              "Your marginal rate is the rate applied to your last taxable dollar — the bracket you are 'in'. Your effective rate is the total tax divided by your gross income, which is always lower because your first dollars are taxed at 10% and 12%. This calculator divides by gross income (not taxable income) so the effective rate reflects what you actually pay on everything you earned.",
          },
          {
            question: "Should I take the standard deduction or itemize?",
            answer:
              "Take whichever is larger. Most filers do better with the standard deduction; itemizing usually only wins if you have significant mortgage interest, state and local taxes or charitable contributions. Switch to the Itemized tab, enter your total, and the calculator applies the larger figure automatically and tells you which one it used.",
          },
          {
            question: "How do I estimate my tax refund?",
            answer:
              "Enter the federal tax already withheld or paid this year in the optional field. If it is more than the calculated tax you get an estimated refund; if it is less, you owe the difference. This is a simplified estimate — tax credits are not included and can move the number significantly in your favour.",
          },
          {
            question: "Does this include state income tax?",
            answer:
              "No. This is a federal-only calculator, which is deliberate. If you need state income tax modelled alongside FICA, use the Paycheck Calculator, which supports state-level rates.",
          },
          {
            question: "Are tax credits included?",
            answer:
              "No. Credits such as the Child Tax Credit, the Earned Income Tax Credit and education credits are excluded on purpose, because guessing at eligibility would produce misleading numbers. Credits reduce tax dollar for dollar, so your real tax is likely to be lower than shown if you qualify for any.",
          },
          {
            question: "Which tax year does this use?",
            answer:
              "The 2026 federal brackets and standard deduction amounts. The figures come from a single shared dataset used across all Skycally tax tools, so every calculator stays consistent.",
          },
        ]}
      />

      <RelatedTools currentSlug="income-tax-calculator" />
    </ToolPageShell>
  );
}
