import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Info, AlertTriangle, TrendingUp, MapPin } from "lucide-react";

import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";

import {
  computePaycheck,
  compareStates,
  fmtUSD,
  fmtPct,
  type PaycheckInput,
  type PaycheckResult,
} from "@/lib/paycheck/calc";
import {
  FILING_LABELS,
  FREQUENCY_LABELS,
  STATES,
  type FilingStatus,
  type PayFrequency,
} from "@/lib/paycheck/constants";

const SLUG = "paycheck-calculator";

export const Route = createFileRoute("/tools/paycheck-calculator")({
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
            name: "Paycheck Calculator",
            description:
              "Free US paycheck calculator. Estimate take-home pay after federal tax, state tax, Social Security, Medicare and pre-tax deductions.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/paycheck-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Weekly, biweekly, semi-monthly, monthly and annual pay frequencies",
              "All four filing statuses (single, MFJ, MFS, head of household)",
              "2026 federal tax brackets and standard deduction",
              "Social Security with wage base cap and Additional Medicare tax",
              "State income tax for the 10 largest income-tax states plus no-tax state flags",
              "Pre-tax deductions: 401(k), HSA, health insurance premiums",
              "Self-employed / 1099 mode with SE tax and quarterly framing",
              "Bonus and overtime via IRS supplemental flat-rate method",
              "Marginal vs effective tax rate breakdown",
              "State-vs-state take-home comparison",
              "Gross-to-net donut chart",
              "Annual and per-paycheck view shown simultaneously",
            ],
          }),
        },
      ],
    };
  },
  component: PaycheckCalculatorPage,
});

function PaycheckCalculatorPage() {
  const tool = toolBySlug(SLUG, tools);

  const [grossPerPeriod, setGross] = useState("2500");
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly");
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [stateCode, setStateCode] = useState("CA");
  const [contrib401kPct, set401k] = useState("6");
  const [hsaAnnual, setHsa] = useState("0");
  const [healthPremium, setHealth] = useState("0");
  const [postTax, setPostTax] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [selfEmployed, setSelfEmployed] = useState(false);

  const [compareCodes, setCompareCodes] = useState<string[]>(["TX", "NY", "FL"]);

  const input: PaycheckInput = useMemo(
    () => ({
      grossPerPeriod: parseFloat(grossPerPeriod) || 0,
      frequency,
      filing,
      stateCode,
      contrib401kPct: parseFloat(contrib401kPct) || 0,
      hsaAnnual: parseFloat(hsaAnnual) || 0,
      healthPremiumPerPeriod: parseFloat(healthPremium) || 0,
      postTaxPerPeriod: parseFloat(postTax) || 0,
      bonus: parseFloat(bonus) || 0,
      selfEmployed,
    }),
    [
      grossPerPeriod,
      frequency,
      filing,
      stateCode,
      contrib401kPct,
      hsaAnnual,
      healthPremium,
      postTax,
      bonus,
      selfEmployed,
    ],
  );

  const result = useMemo(() => computePaycheck(input), [input]);
  const comparison = useMemo(() => compareStates(input, compareCodes), [input, compareCodes]);

  const hasInput = input.grossPerPeriod > 0;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <aside className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex gap-2">
              <ModeToggle active={!selfEmployed} onClick={() => setSelfEmployed(false)} label="W-2 Employee" />
              <ModeToggle active={selfEmployed} onClick={() => setSelfEmployed(true)} label="Self-Employed" />
            </div>

            <Field label="Gross pay (per period)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={grossPerPeriod}
                  onChange={(e) => setGross(e.target.value)}
                  className="pl-7 text-lg"
                  aria-label="Gross pay per period"
                />
              </div>
            </Field>

            <Field label="Pay frequency">
              <Select value={frequency} onChange={(v) => setFrequency(v as PayFrequency)}>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Filing status">
              <Select value={filing} onChange={(v) => setFiling(v as FilingStatus)}>
                {Object.entries(FILING_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="State">
              <Select value={stateCode} onChange={setStateCode}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} {s.tax.kind === "none" ? "(no income tax)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="401(k) %">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={contrib401kPct}
                  onChange={(e) => set401k(e.target.value)}
                />
              </Field>
              <Field label="HSA (annual)">
                <Input type="number" min={0} step={100} value={hsaAnnual} onChange={(e) => setHsa(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Health premium (per period)">
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={healthPremium}
                  onChange={(e) => setHealth(e.target.value)}
                />
              </Field>
              <Field label="Post-tax (per period)">
                <Input type="number" min={0} step={10} value={postTax} onChange={(e) => setPostTax(e.target.value)} />
              </Field>
            </div>

            <Field label="Bonus / overtime this period">
              <Input type="number" min={0} step={100} value={bonus} onChange={(e) => setBonus(e.target.value)} />
            </Field>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
              Estimates only. Not tax advice. Actual withholding depends on your W-4, employer processing, and any local
              or city taxes not modeled here.
            </p>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-3" aria-live="polite">
          {!hasInput ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Enter your gross pay to see your take-home.
            </div>
          ) : (
            <Results r={result} frequency={frequency} />
          )}
        </section>
      </div>

      {hasInput && (
        <StateCompare codes={compareCodes} onChange={setCompareCodes} rows={comparison} currentState={stateCode} />
      )}

      <AdZone id="paycheck-calculator-mid" size="728x90" />

      <InternalLinks />

      <HowToUse
        steps={[
          "Enter your gross pay and choose your pay frequency, filing status, and state — the calculator handles the rest.",
          "Add pre-tax deductions like 401(k) contributions, HSA, and health insurance to see the real impact on your take-home.",
          "Compare your net pay across up to three states side-by-side to see what a move would mean for your paycheck.",
        ]}
      />

      <ToolSeoContent
        title="Paycheck Calculator — Take-Home Pay After Taxes (2026)"
        description="Free US paycheck calculator. Estimate net take-home pay after federal tax, state tax, Social Security, Medicare, and pre-tax deductions — for W-2 employees and 1099 self-employed."
        body={[
          "Skycally's Paycheck Calculator estimates your true take-home pay in seconds. Enter your gross wages and pay frequency, pick your filing status and state, and the tool applies current-year federal tax brackets, the correct FICA rates (Social Security up to the annual wage base, Medicare, and the 0.9% Additional Medicare Tax where it applies), plus your state's income tax logic — flat rate, progressive brackets, or none at all. Pre-tax deductions for your 401(k), HSA, and traditional health insurance premium are subtracted the right way so your effective and marginal tax rates reflect what actually lands in your bank account, not a rough guess.",
          "In the United States, paycheck tax withholding is a layered system. The federal government uses progressive brackets so only the dollars above each threshold are taxed at the higher rate — that's why your marginal rate (the rate on your next dollar) is almost always higher than your effective rate (your total tax divided by your gross). On top of federal income tax, employers withhold 6.2% for Social Security up to the annual wage base cap and 1.45% for Medicare with no cap, plus a 0.9% Additional Medicare surcharge above $200,000 single / $250,000 joint. If you're self-employed, both halves of FICA land on you as a 15.3% self-employment tax, calculated on 92.35% of your net earnings — this calculator switches into that mode automatically when you toggle Self-Employed.",
          "State income tax is where paychecks really diverge. Nine states — Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, and Wyoming — collect no wage tax at all, so your state line reads $0. States like Pennsylvania, Illinois, North Carolina, Michigan, and Georgia use a single flat rate. California, New York, New Jersey, Ohio, and Virginia layer progressive brackets similar to the federal system, and their top rates can be significantly higher. Use the state-vs-state comparison below the main results to see exactly what the same gross salary would net you in up to three states — a useful sanity check before accepting a job offer or planning a relocation.",
          "Once you know your real take-home, use it to make better decisions. Budget from net pay, not gross — that's the number that actually shows up in your account. If you're weighing a mortgage, plug your net into our Mortgage Calculator to see the loan size that keeps housing under roughly 28% of your take-home. If you're deciding whether to bump up your 401(k) contribution, the Compound Interest Calculator can show what an extra 2% today grows into over 30 years. And if you're comparing an offer paid in a different currency, our Currency Converter gives you a like-for-like number to plug back in here.",
        ]}
        faqs={[
          {
            question: "How much tax is taken out of my paycheck?",
            answer:
              "For a typical W-2 employee, expect roughly 7.65% for FICA (Social Security 6.2% plus Medicare 1.45%), plus federal income tax that averages 10–24% depending on income and filing status, plus 0–13% state income tax depending on where you live. Total withholding for a middle-income single filer is commonly in the 20–30% range of gross pay.",
          },
          {
            question: "What's the difference between gross pay and net pay?",
            answer:
              "Gross pay is your salary or hourly wages before any deductions. Net pay — also called take-home pay — is what you actually receive after federal income tax, state income tax, Social Security, Medicare, and any pre-tax or post-tax deductions like 401(k), health insurance, and HSA are subtracted.",
          },
          {
            question: "Do I pay less tax if I max out my 401(k)?",
            answer:
              "Yes — traditional 401(k) contributions come out of your paycheck before federal and state income tax are calculated, so every dollar you contribute reduces your taxable income by a dollar. FICA (Social Security and Medicare) still applies to 401(k) contributions, but income tax savings can be substantial, especially in higher brackets.",
          },
          {
            question: "Which states have no income tax?",
            answer:
              "Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, and Wyoming don't tax wage income. New Hampshire historically taxed interest and dividends but that tax has been repealed. Note that no-income-tax states often make up revenue with higher sales tax, property tax, or fees.",
          },
          {
            question: "How is overtime taxed differently?",
            answer:
              "Overtime pay is not taxed at a higher rate — it's taxed at your regular marginal income tax rate. It can feel higher because overtime dollars stack on top of your regular income and may push you into a higher bracket for that pay period. Employer bonus withholding, however, often uses the IRS supplemental flat rate of 22% federal, which this calculator applies when you enter a one-time bonus.",
          },
          {
            question: "What is the Social Security wage base cap?",
            answer:
              "Social Security tax (6.2%) only applies to earnings up to an annual wage base — $176,100 for 2025, adjusted upward each year. Wages above that cap are not subject to Social Security tax. Medicare, on the other hand, has no cap, and an Additional 0.9% Medicare tax applies to wages above $200,000 for single filers and $250,000 for married filing jointly.",
          },
          {
            question: "How often should I update my W-4?",
            answer:
              "Update your W-4 anytime a major life change affects your tax situation — getting married, having a child, buying a home, starting a side business, or when your spouse's income changes significantly. Reviewing it annually is a good habit, especially if you owed money or got a large refund the previous year.",
          },
          {
            question: "How accurate is this calculator?",
            answer:
              "This calculator provides a solid estimate using current federal tax brackets, FICA rates, and simplified state tax logic. Real paychecks can differ because of employer-specific W-4 handling, local or city taxes (like NYC or SF), pre-tax benefit variations, and mid-year income changes. Use this as a planning tool, not a substitute for professional tax advice.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

/* -------------------------------------------------------------------------- */

function ModeToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "text-white shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)" } : undefined}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

function Results({ r, frequency }: { r: PaycheckResult; frequency: PayFrequency }) {
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: "Federal income tax", value: r.federalTax + r.federalBonusTax, color: "#ef4444" },
    { label: "State income tax", value: r.stateTax + r.stateBonusTax, color: "#f59e0b" },
    {
      label: r.seTax > 0 ? "Self-employment tax" : "Social Security + Medicare",
      value: r.seTax > 0 ? r.seTax : r.socialSecurity + r.medicare + r.additionalMedicare,
      color: "#8b5cf6",
    },
    { label: "Pre-tax deductions", value: r.preTaxAnnual.total, color: "#0ea5e9" },
    { label: "Post-tax deductions", value: r.postTaxAnnual, color: "#64748b" },
  ];

  const netSlice = { label: "Net take-home", value: Math.max(0, r.netAnnual), color: "#10b981" };
  const donutData = [...rows.filter((r) => r.value > 0), netSlice];

  return (
    <div className="space-y-5">
      <HeroCard r={r} frequency={frequency} />

      <div className="grid gap-4 sm:grid-cols-2">
        <RateCard
          title="Effective tax rate"
          value={fmtPct(r.effectiveRate)}
          hint="Your total tax divided by gross income. What you actually pay overall."
        />
        <RateCard
          title="Marginal tax rate"
          value={fmtPct(r.marginalRate)}
          hint="The rate on your next dollar earned — federal + state + FICA at your current income."
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" aria-hidden="true" /> Where your money goes
        </h3>
        <div className="grid gap-6 sm:grid-cols-[180px,1fr] items-center">
          <Donut segments={donutData} />
          <ul className="space-y-2 text-sm">
            {donutData.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                  <span className="text-muted-foreground">{s.label}</span>
                </span>
                <span className="font-medium tabular-nums">{fmtUSD(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Full breakdown (annual)</h3>
        <BreakdownTable r={r} />
        {r.annualBonus > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            This period includes a bonus — federal supplemental withholding (22% flat) has been applied to the bonus
            portion.
          </p>
        )}
        {r.seTax > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            Self-employed mode active. Set aside about {fmtUSD(r.seTax / 4)} each quarter for estimated SE tax payments.
          </p>
        )}
      </div>
    </div>
  );
}

function HeroCard({ r, frequency }: { r: PaycheckResult; frequency: PayFrequency }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl p-6 text-white overflow-hidden"
      style={{ background: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <Wallet className="w-6 h-6" aria-hidden="true" />
        <div>
          <p className="text-xs uppercase tracking-wide opacity-90">Estimated take-home pay</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase opacity-80">Per {periodWord(frequency)}</p>
          <p className="font-display text-3xl sm:text-4xl font-bold tabular-nums">
            {fmtUSD(r.netAnnual / r.periods, { decimals: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase opacity-80">Per year</p>
          <p className="font-display text-3xl sm:text-4xl font-bold tabular-nums">{fmtUSD(r.netAnnual)}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="opacity-80">Annual gross</p>
          <p className="font-semibold tabular-nums">{fmtUSD(r.annualGross)}</p>
        </div>
        <div>
          <p className="opacity-80">Total taxes withheld</p>
          <p className="font-semibold tabular-nums">{fmtUSD(r.totalTaxAnnual)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function periodWord(f: PayFrequency): string {
  return f === "weekly"
    ? "week"
    : f === "biweekly"
      ? "2 weeks"
      : f === "semimonthly"
        ? "half-month"
        : f === "monthly"
          ? "month"
          : "year";
}

function RateCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        {title}
        <span title={hint}>
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Donut({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px] mx-auto -rotate-90">
      <circle cx="90" cy="90" r={R} fill="none" stroke="var(--border)" strokeWidth="18" />
      {segments.map((s) => {
        const frac = s.value / total;
        const dash = C * frac;
        const el = (
          <circle
            key={s.label}
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

function BreakdownTable({ r }: { r: PaycheckResult }) {
  const per = (n: number) => fmtUSD(n / r.periods, { decimals: 2 });
  const rows: Array<[string, number, boolean?]> = [
    ["Gross pay", r.annualGross],
    ["  401(k) contribution", -r.preTaxAnnual.contrib401k],
    ["  HSA", -r.preTaxAnnual.hsa],
    ["  Health insurance", -r.preTaxAnnual.health],
    ["Federal income tax", -(r.federalTax + r.federalBonusTax)],
    ["State income tax", -(r.stateTax + r.stateBonusTax)],
  ];
  if (r.seTax > 0) rows.push(["Self-employment tax", -r.seTax]);
  else {
    rows.push(["Social Security", -r.socialSecurity]);
    rows.push(["Medicare", -r.medicare]);
    if (r.additionalMedicare > 0) rows.push(["Additional Medicare (0.9%)", -r.additionalMedicare]);
  }
  if (r.postTaxAnnual > 0) rows.push(["Post-tax deductions", -r.postTaxAnnual]);
  rows.push(["Net take-home", r.netAnnual, true]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <th className="py-2 font-medium">Line item</th>
            <th className="py-2 font-medium text-right">Annual</th>
            <th className="py-2 font-medium text-right">Per paycheck</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, v, bold]) => (
            <tr key={label} className={`border-b border-border/50 ${bold ? "font-semibold text-foreground" : ""}`}>
              <td className="py-2">{label}</td>
              <td className="py-2 text-right tabular-nums">{fmtUSD(v)}</td>
              <td className="py-2 text-right tabular-nums">{per(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateCompare({
  codes,
  onChange,
  rows,
  currentState,
}: {
  codes: string[];
  onChange: (v: string[]) => void;
  rows: Array<{ code: string; name: string; net: number }>;
  currentState: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.net));

  const toggle = (code: string) => {
    if (codes.includes(code)) onChange(codes.filter((c) => c !== code));
    else if (codes.length < 3) onChange([...codes, code]);
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card/50 p-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">State-by-state comparison</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Pick up to three states to compare take-home on the same gross salary. Currently modelling{" "}
        <strong>{currentState}</strong> above.
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {STATES.map((s) => {
          const on = codes.includes(s.code);
          return (
            <button
              key={s.code}
              onClick={() => toggle(s.code)}
              aria-pressed={on}
              disabled={!on && codes.length >= 3}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background hover:border-foreground/30 disabled:opacity-40"
              }`}
            >
              {s.code}
            </button>
          );
        })}
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.code}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{r.name}</span>
              <span className="tabular-nums font-semibold">{fmtUSD(r.net)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.net / max) * 100}%`,
                  background: "linear-gradient(90deg, #10b981, #06b6d4)",
                }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">Select a state above to compare.</li>}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
        State tax logic is simplified — it uses the state's income tax brackets or flat rate against an approximation of
        state taxable income. Local city taxes are not included.
      </p>
    </section>
  );
}

function InternalLinks() {
  const items: Array<{ to: string; title: string; body: string }> = [
    {
      to: "/tools/loan-calculator",
      title: "Loan Calculator",
      body: "Now that you know your true take-home, see what monthly loan payment actually fits into your budget without overstretching.",
    },
    {
      to: "/tools/mortgage-calculator",
      title: "Mortgage Calculator",
      body: "Figure out how much house you can realistically afford — most lenders want your PITI under about 28% of your net income.",
    },
    {
      to: "/tools/compound-interest",
      title: "Compound Interest Calculator",
      body: "See how much bumping your 401(k) contribution by even 1–2% could grow into over 20 or 30 years of compounding.",
    },
    {
      to: "/tools/currency-converter",
      title: "Currency Converter",
      body: "Comparing a job offer paid in a different currency? Convert it to USD first, then plug the gross back in here.",
    },
    {
      to: "/blog/why-your-paycheck-isnt-what-you-expect",
      title: "Why Your Paycheck Isn't What You Expect",
      body: "The FICA wage base cap, why bonuses withhold at a flat 22%, and why pay frequency changes how big each check looks.",
    },
  ];
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
      <h2 className="font-display text-lg font-bold mb-4">Use your take-home to plan next</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className="group block rounded-xl border border-border p-4 hover:border-foreground/40 transition"
            >
              <p className="font-semibold group-hover:underline">{it.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{it.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
