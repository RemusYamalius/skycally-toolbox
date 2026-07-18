import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, HeartPulse, Car, Info } from "lucide-react";

import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";

import { computeLifeNeed, computeLifePremium, computeCarPremium, fmtUSD0 } from "@/lib/insurance/calc";
import {
  HEALTH_LABELS,
  TERM_OPTIONS,
  AUTO_STATES,
  COVERAGE_LABELS,
  RECORD_LABELS,
  AGE_LABELS,
  VEHICLE_AGE_LABELS,
  type Sex,
  type HealthClass,
  type TermYears,
  type CoverageLevel,
  type DrivingRecord,
  type AgeBracket,
  type VehicleAge,
  type Deductible,
} from "@/lib/insurance/constants";

const SLUG = "insurance-estimator";

export const Route = createFileRoute("/tools/insurance-estimator")({
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
            name: "Insurance Estimator — Life & Car",
            description:
              "Free ballpark estimator for term-life insurance coverage needs and US car insurance premiums. No email, no signup.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/insurance-estimator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "DIME method life insurance needs calculator",
              "Income-multiplier comparison (10× and 15×)",
              "Term-life premium range by age, sex, smoker status, health class, term length",
              "Car insurance ballpark at three coverage tiers side by side",
              "State-average base premium for all 50 states plus DC",
              "Factor-by-factor breakdown: age, vehicle age, record, coverage, deductible",
              "No email required, no signup, no lead-gen — runs fully in your browser",
            ],
          }),
        },
      ],
    };
  },
  component: InsuranceEstimatorPage,
});

/* -------------------------------------------------------------------------- */

function InsuranceEstimatorPage() {
  const tool = toolBySlug(SLUG, tools);
  const [mode, setMode] = useState<"life" | "car">("life");

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      {/* Ballpark banner */}
      <div
        role="note"
        aria-label="Ballpark estimate disclaimer"
        className="mb-6 flex items-start gap-3 rounded-2xl border p-4"
        style={{
          borderColor: "color-mix(in oklab, #f59e0b 45%, transparent)",
          background: "color-mix(in oklab, #f59e0b 8%, transparent)",
        }}
      >
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} aria-hidden="true" />
        <p className="text-sm text-foreground">
          <strong>Ballpark estimate — not a real quote.</strong> These numbers come from published industry-average
          data. Real premiums depend on underwriting factors (medical exam, motor-vehicle report, credit-based insurance
          score, carrier appetite) that no calculator can see.{" "}
          <strong>We never ask for your email or phone number.</strong> Take these figures to a licensed agent for an
          actual quote.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex gap-2 rounded-2xl border border-border bg-card p-1.5 max-w-md">
        <ModeToggle
          active={mode === "life"}
          onClick={() => setMode("life")}
          icon={<HeartPulse className="w-4 h-4" aria-hidden="true" />}
          label="Life Insurance"
        />
        <ModeToggle
          active={mode === "car"}
          onClick={() => setMode("car")}
          icon={<Car className="w-4 h-4" aria-hidden="true" />}
          label="Car Insurance"
        />
      </div>

      {mode === "life" ? <LifeMode /> : <CarMode />}

      <AdZone id="insurance-estimator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick Life Insurance or Car Insurance at the top.",
          "Enter your numbers — everything runs in your browser and we never ask for an email.",
          "See a ballpark estimate with a full breakdown of the factors we applied — take it to a licensed insurer for a real quote.",
        ]}
      />

      <ToolSeoContent
        title="Insurance Estimator — Life & Car Premium Calculator (No Signup)"
        description="Free ballpark estimator for term-life coverage needs and US car insurance premiums. Built on published industry-average data. No email required, no signup, no lead-gen."
        body={[
          "Skycally's Insurance Estimator gives you an honest ballpark of what life insurance you actually need and what car insurance typically costs — in seconds, with no email gate. The Life Insurance mode uses the DIME method (Debt, Income replacement, Mortgage, Education) alongside the classic 10-to-15-times-income rule so you can sanity-check both against each other. The Car Insurance mode starts from your state's published average full-coverage premium and applies transparent multipliers for driver age, vehicle age, driving record, coverage level, and deductible — so you see exactly where the number came from.",
          "The DIME method beats the income-multiplier rule for most families because it adds up the actual dollar obligations your family would have to cover. Debt covers credit cards, personal loans, and auto loans. Income replaces your paycheck for the number of years dependents need support (5–15 years is typical). Mortgage pays off what's left on the house. Education budgets for future college costs per child. The sum is the amount of term-life coverage that would let your survivors keep their standard of living without financial pressure. Because term life is dramatically cheaper than most people expect, buying enough coverage is usually more important than buying the cheapest policy.",
          "Car insurance premiums vary enormously — Florida drivers pay roughly 3× what Vermont drivers pay for the same coverage — but the drivers of that difference are consistent. State-level litigation and repair costs set the base. Coverage level is the single biggest lever a driver can pull: dropping from full coverage to state-minimum liability cuts most premiums by 55–60%, at the cost of losing collision and comprehensive protection. Age matters enormously in the teens and eases off after 25. A single at-fault accident adds roughly 20–25% for three years; a DUI can nearly double your rate. Raising your deductible from $500 to $1000 typically shaves 8–10% off the comp/collision portion. One more thing worth knowing: national full-coverage premiums rose roughly 17% in 2024 and another 7–8% in 2025, so whatever base figure you start from — ours included — is likely lower than what you'd actually be quoted today.",
          "Skycally is different from most 'free insurance calculators' online because we don't sell your data. Every calculation runs in your browser — nothing is transmitted, nothing is stored on our servers, and there is no email or phone field anywhere. Compare us to the typical lead-gen calculator that gates the actual number behind a form and then sells your info to a dozen agents who will call you for weeks. Use this tool to walk into a real quote conversation already knowing what a fair number looks like — and if you want to see how a monthly premium fits your budget, run it through our Paycheck Calculator or Debt Payoff Calculator.",
        ]}
        faqs={[
          {
            question: "How much life insurance do I actually need?",
            answer:
              "For most working parents, the DIME total (Debt + Income replacement × years of support + Mortgage + Education) is the most defensible number. If you have young kids and a mortgage, that usually lands somewhere between 8× and 15× your annual income. A single earner with no dependents and no debt may need much less — or none.",
          },
          {
            question: "What is the DIME method?",
            answer:
              "DIME stands for Debt, Income, Mortgage, Education. You add up all outstanding non-mortgage debts, your annual income times the number of years dependents need support, your remaining mortgage balance, and expected future education costs. The sum is the amount of term-life coverage that would let your family stay financially whole without your paycheck.",
          },
          {
            question: "Is 10 times my salary enough life insurance?",
            answer:
              "The 10×-salary rule is a fast rough cut, but it often understates coverage for people with a mortgage or young children and overstates it for people with no dependents. Use DIME as the primary number and 10× (and 15×) as a sanity check. If DIME comes in much higher than 15× income, revisit the years-of-support assumption; if it comes in much lower than 10×, you may be underinsured.",
          },
          {
            question: "Why do car insurance quotes vary so much between companies?",
            answer:
              "Every carrier uses its own proprietary rating model with different weights on age, ZIP code, credit-based insurance score, vehicle model, and prior claims. Two carriers looking at the same driver can produce quotes that differ by 40–60%. That's why the industry standard advice is to get at least three quotes and reshop every 1–2 years.",
          },
          {
            question: "What's the difference between liability and full coverage?",
            answer:
              "State-minimum liability only pays for damage you cause to other people and their property — it pays nothing for your own car. Full coverage adds collision (damage to your car in an accident) and comprehensive (theft, fire, weather, animals). If your car is worth less than about $4,000 or you could easily replace it out of pocket, dropping to liability-only is often a rational choice.",
          },
          {
            question: "Does my credit score really affect my car insurance rate?",
            answer:
              "Yes — in most states, carriers use a credit-based insurance score as a rating factor, separate from your regular FICO. The industry position is that it predicts claim likelihood; consumer advocates argue it disproportionately penalizes lower-income drivers. California, Hawaii, Massachusetts, and Michigan restrict or ban its use. This calculator does not model it directly because most drivers don't know their insurance score.",
          },
          {
            question: "Is this a real quote?",
            answer:
              "No. It's a ballpark estimate built from published industry averages. A real quote comes from a licensed insurer after they pull your motor-vehicle report, medical records (for life), and insurance score, and apply their own rating model. Use this number to know what's fair before you talk to an agent, not as a substitute for one.",
          },
          {
            question: "Why don't you ask for my email to show results?",
            answer:
              "Because we don't sell leads. Every calculation runs entirely in your browser — no server call, no logging, no email field. Most 'free insurance calculators' online exist to capture your contact info and resell it to agents. Skycally's model is different: we make money from ads on the page, not from your data.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Life mode                                                                   */
/* -------------------------------------------------------------------------- */

function LifeMode() {
  const [age, setAge] = useState("35");
  const [sex, setSex] = useState<Sex>("male");
  const [smoker, setSmoker] = useState(false);
  const [health, setHealth] = useState<HealthClass>("preferred");
  const [coverage, setCoverage] = useState(500_000);
  const [term, setTerm] = useState<TermYears>(20);

  const [income, setIncome] = useState("80000");
  const [years, setYears] = useState("10");
  const [debt, setDebt] = useState("20000");
  const [mortgage, setMortgage] = useState("250000");
  const [education, setEducation] = useState("100000");

  const need = useMemo(
    () =>
      computeLifeNeed({
        annualIncome: parseFloat(income) || 0,
        yearsOfSupport: parseFloat(years) || 0,
        debtNonMortgage: parseFloat(debt) || 0,
        mortgageBalance: parseFloat(mortgage) || 0,
        educationCosts: parseFloat(education) || 0,
      }),
    [income, years, debt, mortgage, education],
  );

  const prem = useMemo(
    () =>
      computeLifePremium({
        age: parseInt(age) || 35,
        sex,
        smoker,
        healthClass: health,
        coverage,
        term,
      }),
    [age, sex, smoker, health, coverage, term],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <aside className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your situation</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <Input type="number" min={18} max={75} value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Sex">
              <Select value={sex} onChange={(v) => setSex(v as Sex)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Smoker">
              <div className="flex gap-2">
                <PillToggle active={!smoker} onClick={() => setSmoker(false)} label="No" />
                <PillToggle active={smoker} onClick={() => setSmoker(true)} label="Yes" />
              </div>
            </Field>
            <Field label="Health class">
              <Select value={health} onChange={(v) => setHealth(v as HealthClass)}>
                {Object.entries(HEALTH_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={`Coverage amount: ${fmtUSD0(coverage)}`}>
            <input
              type="range"
              min={100_000}
              max={3_000_000}
              step={50_000}
              value={coverage}
              onChange={(e) => setCoverage(parseInt(e.target.value))}
              className="w-full"
              aria-label="Coverage amount"
            />
          </Field>

          <Field label="Term length">
            <div className="flex gap-2">
              {TERM_OPTIONS.map((t) => (
                <PillToggle key={t} active={term === t} onClick={() => setTerm(t)} label={`${t} yr`} />
              ))}
            </div>
          </Field>

          <div className="pt-3 border-t border-border space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">DIME inputs</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual income">
                <Input type="number" min={0} step={1000} value={income} onChange={(e) => setIncome(e.target.value)} />
              </Field>
              <Field label="Years of support">
                <Input type="number" min={0} max={30} value={years} onChange={(e) => setYears(e.target.value)} />
              </Field>
            </div>
            <Field label="Non-mortgage debt">
              <Input type="number" min={0} step={500} value={debt} onChange={(e) => setDebt(e.target.value)} />
            </Field>
            <Field label="Remaining mortgage balance">
              <Input type="number" min={0} step={1000} value={mortgage} onChange={(e) => setMortgage(e.target.value)} />
            </Field>
            <Field label="Future education costs">
              <Input
                type="number"
                min={0}
                step={1000}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </aside>

      {/* Results */}
      <section className="lg:col-span-3 space-y-5" aria-live="polite">
        {/* DIME card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">DIME recommended coverage</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Debt (non-mortgage)" value={fmtUSD0(need.dime.debt)} />
            <Row label={`Income × ${years || 0} years`} value={fmtUSD0(need.dime.income)} />
            <Row label="Mortgage balance" value={fmtUSD0(need.dime.mortgage)} />
            <Row label="Education costs" value={fmtUSD0(need.dime.education)} />
          </dl>
          <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total DIME coverage need</span>
            <span className="font-display text-3xl font-bold" style={{ color: "var(--cyan-brand)" }}>
              {fmtUSD0(need.dime.total)}
            </span>
          </div>
        </div>

        {/* Income multiplier */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Income-multiplier check</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">10× annual income</div>
              <div className="font-display text-xl font-semibold">{fmtUSD0(need.incomeMultiplier.low)}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">15× annual income</div>
              <div className="font-display text-xl font-semibold">{fmtUSD0(need.incomeMultiplier.high)}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A simpler rule of thumb; DIME is usually more accurate because it looks at your actual obligations.
          </p>
        </div>

        {/* Premium range */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-1">Estimated ballpark premium</h3>
          <p className="text-xs text-muted-foreground mb-4">
            For {fmtUSD0(coverage)} of {term}-year term life
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Monthly</div>
              <div className="font-display text-2xl font-bold" style={{ color: "var(--green-brand)" }}>
                {fmtUSD0(prem.monthlyLow)}–{fmtUSD0(prem.monthlyHigh)}
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Annual</div>
              <div className="font-display text-2xl font-bold">
                {fmtUSD0(prem.annualLow)}–{fmtUSD0(prem.annualHigh)}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Chip>Age {prem.factorsApplied.age}</Chip>
            <Chip>{sex === "male" ? "Male" : "Female"}</Chip>
            <Chip>{smoker ? "Smoker" : "Non-smoker"}</Chip>
            <Chip>{HEALTH_LABELS[health]}</Chip>
            <Chip>{term}-year term</Chip>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            Based on Policygenius/Term4Sale 2024 published average rates. Individual quotes depend on your actual
            medical exam and insurer.
          </p>
        </div>

        {/* Contextual links */}
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 space-y-2 text-sm text-muted-foreground">
          <p>
            Confirm your exact remaining mortgage balance in the{" "}
            <Link to="/tools/mortgage-calculator" className="underline text-foreground hover:text-primary">
              Mortgage Calculator
            </Link>
            .
          </p>
          <p>
            See how a monthly premium fits into your real take-home pay with the{" "}
            <Link to="/tools/paycheck-calculator" className="underline text-foreground hover:text-primary">
              Paycheck Calculator
            </Link>
            .
          </p>
          <p>
            If the DIME debt total looks high, see how fast you could pay it down with the{" "}
            <Link to="/tools/debt-payoff-calculator" className="underline text-foreground hover:text-primary">
              Debt Payoff Calculator
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Car mode                                                                    */
/* -------------------------------------------------------------------------- */

function CarMode() {
  const [stateCode, setStateCode] = useState("CA");
  const [ageBracket, setAgeBracket] = useState<AgeBracket>("30_49");
  const [vehicleAge, setVehicleAge] = useState<VehicleAge>("4_7");
  const [record, setRecord] = useState<DrivingRecord>("clean");
  const [deductible, setDeductible] = useState<Deductible>(500);
  const [focus, setFocus] = useState<CoverageLevel>("full");

  const result = useMemo(
    () =>
      computeCarPremium({
        stateCode,
        ageBracket,
        vehicleAge,
        record,
        deductible,
        coverage: focus,
      }),
    [stateCode, ageBracket, vehicleAge, record, deductible, focus],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <aside className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <Field label="State">
            <Select value={stateCode} onChange={setStateCode}>
              {AUTO_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Driver age">
            <Select value={ageBracket} onChange={(v) => setAgeBracket(v as AgeBracket)}>
              {Object.entries(AGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vehicle age">
            <Select value={vehicleAge} onChange={(v) => setVehicleAge(v as VehicleAge)}>
              {Object.entries(VEHICLE_AGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Driving record">
            <Select value={record} onChange={(v) => setRecord(v as DrivingRecord)}>
              {Object.entries(RECORD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Deductible">
            <div className="grid grid-cols-4 gap-2">
              {([250, 500, 1000, 1500] as Deductible[]).map((d) => (
                <PillToggle key={d} active={deductible === d} onClick={() => setDeductible(d)} label={`$${d}`} />
              ))}
            </div>
          </Field>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            Base premium sourced from Bankrate's 2024 state-average full-coverage data. Adjustment factors reflect
            industry norms. National full-coverage rates rose roughly 17% in 2024 and another 7–8% in 2025, so actual
            current costs are likely meaningfully higher than the figures shown here — your real quote will vary.
          </p>
        </div>
      </aside>

      {/* Results */}
      <section className="lg:col-span-3 space-y-5" aria-live="polite">
        {/* Three-tier comparison */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Ballpark annual premium — three coverage tiers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["minimum", "standard", "full"] as CoverageLevel[]).map((lvl) => {
              const annual = result.byLevel[lvl];
              const isFocus = focus === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setFocus(lvl)}
                  aria-pressed={isFocus}
                  className={`text-left rounded-xl border p-4 transition ${
                    isFocus ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">{COVERAGE_LABELS[lvl]}</div>
                  <div className="font-display text-2xl font-bold">{fmtUSD0(annual)}</div>
                  <div className="text-xs text-muted-foreground">{fmtUSD0(annual / 12)}/mo</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Tap a tier to see how the number was built.</p>
        </div>

        {/* Transparency breakdown */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-1">How we got there — {COVERAGE_LABELS[focus]}</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Each row shows the factor applied and the running annual premium.
          </p>
          <ol className="space-y-2 text-sm">
            {result.breakdown.map((row, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                <span className="flex-1">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {row.label}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {row.factor === 1 ? "base" : `× ${row.factor.toFixed(2)}`}
                </span>
                <span className="font-mono text-sm w-24 text-right shrink-0">{fmtUSD0(row.runningTotal)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Estimated annual premium</span>
            <span className="font-display text-3xl font-bold" style={{ color: "var(--green-brand)" }}>
              {fmtUSD0(result.byLevel[focus])}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
          See how this monthly premium fits your take-home pay with the{" "}
          <Link to="/tools/paycheck-calculator" className="underline text-foreground hover:text-primary">
            Paycheck Calculator
          </Link>
          .
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                   */
/* -------------------------------------------------------------------------- */

function ModeToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "text-white shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)" } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

function PillToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition border ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
      }`}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}
