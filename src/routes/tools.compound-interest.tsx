import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Copy, Check } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/compound-interest")({
  head: () => buildToolMeta(toolBySlug("compound-interest", tools)),
  component: CompoundInterestPage,
});

type Frequency = "annually" | "semiannually" | "quarterly" | "monthly" | "daily";

const FREQ_OPTIONS: { value: Frequency; label: string; n: number }[] = [
  { value: "annually",     label: "Annually",      n: 1   },
  { value: "semiannually", label: "Semi-annually",  n: 2   },
  { value: "quarterly",    label: "Quarterly",      n: 4   },
  { value: "monthly",      label: "Monthly",        n: 12  },
  { value: "daily",        label: "Daily",          n: 365 },
];

function calcCompound(
  principal: number,
  annualRate: number,
  years: number,
  n: number,
  monthlyContrib: number,
): { year: number; balance: number; principal: number; interest: number }[] {
  const r = annualRate / 100;
  const rows = [];

  for (let y = 1; y <= years; y++) {
    const compoundedPrincipal = principal * Math.pow(1 + r / n, n * y);

    let fvContrib = 0;
    if (monthlyContrib > 0 && r > 0) {
      const rn = r / n;
      const periods = n * y;
      fvContrib = (monthlyContrib * 12 / n) * ((Math.pow(1 + rn, periods) - 1) / rn);
    } else if (monthlyContrib > 0) {
      fvContrib = monthlyContrib * 12 * y;
    }

    const balance = compoundedPrincipal + fvContrib;
    const totalPrincipal = principal + monthlyContrib * 12 * y;
    const interest = balance - totalPrincipal;

    rows.push({
      year: y,
      balance: Math.round(balance * 100) / 100,
      principal: Math.round(totalPrincipal * 100) / 100,
      interest: Math.round(Math.max(0, interest) * 100) / 100,
    });
  }
  return rows;
}

function fmt(n: number, compact = false): string {
  if (compact && n >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (compact && n >= 1_000)
    return "$" + (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function StatCard({
  label, value, accent, sub,
}: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 min-w-0 overflow-hidden"
      style={accent ? {
        borderColor: accent,
        background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, transparent), var(--card))`,
      } : undefined}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className="font-display font-bold text-xl sm:text-2xl leading-none"
        style={{ color: accent || "var(--foreground)" }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function CompoundInterestPage() {
  const [principal, setPrincipal]     = useState(10000);
  const [rate, setRate]               = useState(7);
  const [years, setYears]             = useState(20);
  const [contrib, setContrib]         = useState(200);
  const [freq, setFreq]               = useState<Frequency>("monthly");
  const [copied, setCopied]           = useState(false);

  const n = FREQ_OPTIONS.find(f => f.value === freq)!.n;

  const rows = useMemo(
    () => calcCompound(principal, rate, years, n, contrib),
    [principal, rate, years, n, contrib],
  );

  const last = rows[rows.length - 1] ?? { balance: 0, principal: 0, interest: 0 };
  const totalContributions = principal + contrib * 12 * years;
  const totalInterest = last.balance - totalContributions;
  const returnPct = totalContributions > 0
    ? ((last.balance - totalContributions) / totalContributions) * 100
    : 0;

  const copySummary = async () => {
    const lines = [
      `Compound Interest Summary`,
      `Initial investment: ${fmt(principal)}`,
      `Annual rate: ${rate}%`,
      `Compounding: ${FREQ_OPTIONS.find(f => f.value === freq)!.label}`,
      `Monthly contribution: ${fmt(contrib)}`,
      `Time: ${years} years`,
      `──────────────────────`,
      `Final balance: ${fmt(last.balance)}`,
      `Total contributions: ${fmt(totalContributions)}`,
      `Total interest earned: ${fmt(totalInterest)}`,
      `Return on investment: ${returnPct.toFixed(1)}%`,
      `Calculated at skycally.com/tools/compound-interest`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = rows.filter((_, i) => years <= 30 || (i + 1) % Math.ceil(years / 30) === 0 || i === rows.length - 1);

  return (
    <ToolPageShell
      title="Compound Interest Calculator"
      description="See how your money grows over time with compound interest and regular contributions."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">

        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Initial Investment</label>
              <span className="text-sm font-mono text-muted-foreground">{fmt(principal)}</span>
            </div>
            <Input
              type="number" min={0} value={principal || ""}
              onChange={e => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
              className="text-lg"
            />
            <div className="mt-3">
              <Slider
                value={[Math.min(principal, 500000)]}
                min={0} max={500000} step={500}
                onValueChange={v => setPrincipal(v[0])}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Annual Interest Rate</label>
              <span className="text-sm font-mono">{rate.toFixed(1)}%</span>
            </div>
            <Input
              type="number" min={0} max={50} step={0.1} value={rate || ""}
              onChange={e => setRate(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
            />
            <div className="mt-3">
              <Slider
                value={[Math.min(rate, 30)]}
                min={0} max={30} step={0.1}
                onValueChange={v => setRate(v[0])}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Time Period</label>
              <span className="text-sm font-mono">{years} years</span>
            </div>
            <Input
              type="number" min={1} max={50} value={years || ""}
              onChange={e => setYears(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            />
            <div className="mt-3">
              <Slider
                value={[years]} min={1} max={50} step={1}
                onValueChange={v => setYears(v[0])}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Monthly Contribution</label>
              <span className="text-sm font-mono text-muted-foreground">{fmt(contrib)}/mo</span>
            </div>
            <Input
              type="number" min={0} value={contrib || ""}
              onChange={e => setContrib(Math.max(0, parseFloat(e.target.value) || 0))}
            />
            <div className="mt-3">
              <Slider
                value={[Math.min(contrib, 5000)]}
                min={0} max={5000} step={50}
                onValueChange={v => setContrib(v[0])}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Compounding Frequency</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FREQ_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFreq(f.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-medium transition"
                  style={{
                    borderColor: freq === f.value ? "#06b6d4" : "var(--border)",
                    background: freq === f.value ? "color-mix(in oklab, #06b6d4 15%, transparent)" : "transparent",
                    color: freq === f.value ? "#06b6d4" : "var(--muted-foreground)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Final Balance"
              value={fmt(last.balance)}
              accent="#06b6d4"
            />
            <StatCard
              label="Interest Earned"
              value={fmt(Math.max(0, totalInterest))}
              accent="#10b981"
              sub={`+${returnPct.toFixed(1)}% return`}
            />
            <StatCard
              label="Total Contributions"
              value={fmt(totalContributions)}
              accent="#7c3aed"
            />
            <StatCard
              label="Effective Yield"
              value={`${((last.balance / Math.max(1, principal) - 1) * 100).toFixed(1)}%`}
              sub={`on initial investment`}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={copySummary}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy summary"}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-4">Growth Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="prinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="year"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={v => `Y${v}`}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={v => fmt(v, true)}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmt(v), name]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="principal" name="Contributions" stroke="#7c3aed" fill="url(#prinGrad)" />
                  <Area type="monotone" dataKey="interest"  name="Interest Earned" stroke="#10b981" fill="url(#intGrad)" />
                  <Area type="monotone" dataKey="balance"   name="Total Balance"  stroke="#06b6d4" fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium">Year-by-Year Breakdown</h3>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-right">Contributions</th>
                    <th className="px-3 py-2 text-right text-emerald-400">Interest</th>
                    <th className="px-3 py-2 text-right text-cyan-400">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.year}
                      className="border-t border-border"
                      style={{
                        background: i % 2 === 0
                          ? "color-mix(in oklab, var(--muted) 30%, transparent)"
                          : "transparent",
                      }}
                    >
                      <td className="px-3 py-2 font-mono">{r.year}</td>
                      <td className="px-3 py-2 font-mono text-right">{fmt(r.principal)}</td>
                      <td className="px-3 py-2 font-mono text-right text-emerald-400">{fmt(r.interest)}</td>
                      <td className="px-3 py-2 font-mono text-right text-cyan-400 font-semibold">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <HowToUse
        steps={[
          "Enter your initial investment, annual interest rate, and time period using the sliders or input fields.",
          "Add a monthly contribution amount to see how regular saving accelerates growth.",
          "Choose your compounding frequency — monthly or daily compounding yields the most interest.",
        ]}
      />

      <ToolSeoContent
        title="Compound Interest Calculator — Free Online, With Monthly Contributions"
        description="Calculate compound interest with initial investment, annual rate, compounding frequency, and monthly contributions. See year-by-year growth chart and breakdown table. Free, instant, no signup."
        body={[
          "Compound interest is the process of earning interest on both your initial principal and the accumulated interest from previous periods. Albert Einstein reportedly called it the 'eighth wonder of the world' — and the numbers bear this out. A $10,000 investment at 7% annual return doubles in just over 10 years, quadruples in 20, and grows to nearly 15x in 40 years. Skycally's compound interest calculator shows you this growth year by year, including the effect of regular monthly contributions.",
          "The compound interest formula is A = P(1 + r/n)^(n×t), where P is the principal, r is the annual interest rate as a decimal, n is the number of times interest compounds per year, and t is the time in years. Compounding frequency matters: daily compounding produces slightly more interest than monthly, which produces more than annual. For a $10,000 investment at 5% over 20 years, daily compounding yields about $27 more than monthly compounding — the difference is small but grows with larger principals and longer time periods.",
          "The most powerful lever in the calculator is the monthly contribution. Adding even $200 per month to a $10,000 initial investment at 7% over 20 years grows the balance from $38,697 (no contributions) to $143,253 — nearly 4x more. This demonstrates why consistent, regular investing outperforms waiting to invest a large lump sum. The year-by-year table and chart make this growth curve easy to visualize and understand.",
          "This calculator is useful for planning retirement savings, education funds, investment portfolios, savings accounts, and any scenario where money grows over time. The results are mathematical projections — actual investment returns vary and are not guaranteed. Always consult a qualified financial advisor before making investment decisions.",
        ]}
        faqs={[
          {
            question: "What is the compound interest formula?",
            answer: "A = P(1 + r/n)^(n×t), where A is the final amount, P is the principal, r is the annual interest rate (as a decimal), n is the compounding frequency per year, and t is the time in years. For monthly contributions, the future value of an annuity formula is added: FV = C × [((1 + r/n)^(n×t) − 1) / (r/n)], where C is the periodic contribution.",
          },
          {
            question: "What is the difference between simple and compound interest?",
            answer: "Simple interest is calculated only on the principal: Interest = P × r × t. Compound interest is calculated on the principal plus all previously earned interest, causing exponential growth. On a $10,000 investment at 5% over 10 years, simple interest yields $5,000. Compound interest (annually) yields $6,289 — 26% more.",
          },
          {
            question: "Does compounding frequency matter?",
            answer: "Yes, but less than most people think. The difference between annual and monthly compounding is meaningful; the difference between monthly and daily is very small. For a $10,000 investment at 5% over 20 years: annual compounding → $26,533; monthly → $27,126; daily → $27,181. The bigger factor is always the interest rate and time period.",
          },
          {
            question: "What is the Rule of 72?",
            answer: "The Rule of 72 is a quick mental shortcut: divide 72 by the annual interest rate to estimate how many years it takes to double your money. At 6%, it takes roughly 72 ÷ 6 = 12 years to double. At 8%, it takes 9 years. At 4%, it takes 18 years. This calculator shows the exact figure.",
          },
          {
            question: "How much do monthly contributions affect the result?",
            answer: "Dramatically. A $10,000 investment at 7% for 20 years grows to about $38,700. Adding $200/month grows it to about $143,000. Adding $500/month grows it to about $260,000. Regular contributions are often more impactful than the initial lump sum, especially over long periods.",
          },
          {
            question: "What annual return should I use?",
            answer: "Historical averages: S&P 500 index funds have returned approximately 7–10% annually before inflation (4–7% after inflation) over the long term. High-yield savings accounts currently offer 4–5%. Bonds average 2–4%. CDs average 3–5%. For conservative projections, use 5–6%; for stock-market scenarios, 7–8% is commonly used.",
          },
          {
            question: "Is compound interest calculated on contributions too?",
            answer: "Yes. Each monthly contribution you make starts earning compound interest from the moment it's deposited. Earlier contributions benefit from more compounding periods than later ones. This is why financial advisors emphasize starting early — the first contributions you make compound the longest.",
          },
          {
            question: "Is my data stored anywhere?",
            answer: "No. All calculations run instantly in your browser using JavaScript. Your investment figures are never transmitted to any server.",
          },
        ]}
      />

      <RelatedTools currentSlug="compound-interest" />
    </ToolPageShell>
  );
}
