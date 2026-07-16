import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Home, Info, ShieldCheck, TrendingUp, TrendingDown, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ReferenceLine,
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  simulate,
  fmtUSD,
  type BuyInputs,
  type RentInputs,
  type Assumptions,
} from "@/lib/rent-vs-buy/calc";

const SLUG = "rent-vs-buy-calculator";

export const Route = createFileRoute("/tools/rent-vs-buy-calculator")({
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
            name: "Rent vs Buy Calculator",
            description:
              "Free rent vs buy calculator. Finds your breakeven year with the full cost of ownership and the opportunity cost of your down payment. Interactive appreciation, rent-growth and investment-return sliders. No signup.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/rent-vs-buy-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Breakeven year computed across a 1–30 year horizon",
              "Down payment and closing costs modeled as opportunity-cost capital",
              "Full cost of ownership: mortgage interest, property tax, insurance, HOA, maintenance, closing and selling costs",
              "Interactive sliders for home appreciation, rent growth and investment return",
              "Cumulative net-position line chart with crossover point marked",
              "At-horizon comparison based on how long you actually plan to stay",
              "Every default assumption is visible and editable — no hidden constants",
              "Runs entirely in your browser — no account, no signup, nothing sent to a server",
            ],
          }),
        },
      ],
    };
  },
  component: RentVsBuyPage,
});

// --- Defaults ---
const DEFAULT_BUY: BuyInputs = {
  homePrice: 450000,
  downPaymentPct: 20,
  mortgageRatePct: 6.5,
  termYears: 30,
  propertyTaxPct: 1.1,
  insuranceAnnual: 1500,
  hoaMonthly: 0,
  maintenancePct: 1,
  buyingClosingPct: 3,
  sellingCostPct: 7,
};

const DEFAULT_RENT: RentInputs = {
  monthlyRent: 2400,
  rentGrowthPct: 3,
  rentersInsMonthly: 15,
};

const DEFAULT_ASSUMPTIONS: Assumptions = {
  appreciationPct: 3,
  investmentReturnPct: 6,
  plannedYears: 10,
};

function RentVsBuyPage() {
  const tool = toolBySlug(SLUG, tools);

  const [buy, setBuy] = useState<BuyInputs>(DEFAULT_BUY);
  const [rent, setRent] = useState<RentInputs>(DEFAULT_RENT);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  const result = useMemo(() => simulate(buy, rent, assumptions), [buy, rent, assumptions]);

  const downPaymentDollars = Math.round(buy.homePrice * (buy.downPaymentPct / 100));
  const setDownFromDollars = (d: number) => {
    if (buy.homePrice <= 0) return;
    const pct = Math.max(0, Math.min(100, (d / buy.homePrice) * 100));
    setBuy({ ...buy, downPaymentPct: pct });
  };

  const heroLine = (() => {
    if (result.edge === "buy-always") return "Buying wins immediately";
    if (result.edge === "rent-always") return "Renting wins at every horizon within 30 years";
    return `You break even after ${result.breakevenYear} year${result.breakevenYear === 1 ? "" : "s"}`;
  })();

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
            "linear-gradient(135deg, color-mix(in oklab, var(--cyan-brand) 12%, transparent), color-mix(in oklab, var(--violet-brand) 10%, transparent))",
        }}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
          <Home className="w-3.5 h-3.5" aria-hidden="true" /> Breakeven analysis
        </div>
        <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
          {result.edge === "crossover" ? (
            <>
              You break even after{" "}
              <span style={{ color: "var(--cyan-brand)" }}>
                {result.breakevenYear} year{result.breakevenYear === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span style={{ color: result.edge === "buy-always" ? "var(--green-brand)" : "var(--violet-brand)" }}>
              {heroLine}
            </span>
          )}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">
          Below the breakeven year, renting and investing the down payment leaves you ahead. Above it, buying wins
          once appreciation and equity outweigh what your capital could have earned elsewhere.
        </p>

        {/* At-horizon secondary answer */}
        <div className="mt-6 rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            At your planned {result.atHorizon.year} year{result.atHorizon.year === 1 ? "" : "s"}
          </p>
          <p className="font-display text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-2">
            {result.atHorizon.winner === "buy" ? (
              <>
                <Trophy className="w-5 h-5" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
                <span style={{ color: "var(--green-brand)" }}>Buying wins</span>
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5" style={{ color: "var(--violet-brand)" }} aria-hidden="true" />
                <span style={{ color: "var(--violet-brand)" }}>Renting wins</span>
              </>
            )}
            <span className="text-muted-foreground text-base font-normal">
              by <span className="text-foreground font-semibold">{fmtUSD(result.atHorizon.diff)}</span>
            </span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <NetChip label="Buy net position" value={result.atHorizon.buyNet} accent="var(--green-brand)" />
            <NetChip label="Rent net position" value={result.atHorizon.rentNet} accent="var(--violet-brand)" />
          </div>
        </div>
      </motion.section>

      {/* Controls + Chart */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs column */}
        <aside className="lg:col-span-2 space-y-4">
          {/* Buying */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" aria-hidden="true" /> If you buy
            </h3>
            <Field label="Home price" htmlFor="homePrice">
              <MoneyInput id="homePrice" value={buy.homePrice} onChange={(v) => setBuy({ ...buy, homePrice: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Down payment (%)" htmlFor="downPct">
                <NumberInput
                  id="downPct"
                  value={buy.downPaymentPct}
                  onChange={(v) => setBuy({ ...buy, downPaymentPct: v })}
                  step={1}
                  suffix="%"
                />
              </Field>
              <Field label="Down payment ($)" htmlFor="downDollar">
                <MoneyInput
                  id="downDollar"
                  value={downPaymentDollars}
                  onChange={(v) => setDownFromDollars(v)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mortgage rate (%/yr)" htmlFor="rate">
                <NumberInput
                  id="rate"
                  value={buy.mortgageRatePct}
                  onChange={(v) => setBuy({ ...buy, mortgageRatePct: v })}
                  step={0.125}
                  suffix="%"
                />
              </Field>
              <Field label="Term" htmlFor="term">
                <Select
                  value={String(buy.termYears)}
                  onValueChange={(v) => setBuy({ ...buy, termYears: (Number(v) as 15 | 30) })}
                >
                  <SelectTrigger id="term"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30-year fixed</SelectItem>
                    <SelectItem value="15">15-year fixed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Property tax (%/yr)" htmlFor="ptax">
                <NumberInput id="ptax" value={buy.propertyTaxPct} onChange={(v) => setBuy({ ...buy, propertyTaxPct: v })} step={0.05} suffix="%" />
              </Field>
              <Field label="Insurance ($/yr)" htmlFor="ins">
                <MoneyInput id="ins" value={buy.insuranceAnnual} onChange={(v) => setBuy({ ...buy, insuranceAnnual: v })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="HOA ($/mo)" htmlFor="hoa">
                <MoneyInput id="hoa" value={buy.hoaMonthly} onChange={(v) => setBuy({ ...buy, hoaMonthly: v })} />
              </Field>
              <Field label="Maintenance (%/yr)" htmlFor="maint">
                <NumberInput id="maint" value={buy.maintenancePct} onChange={(v) => setBuy({ ...buy, maintenancePct: v })} step={0.1} suffix="%" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Closing costs (%)" htmlFor="close">
                <NumberInput id="close" value={buy.buyingClosingPct} onChange={(v) => setBuy({ ...buy, buyingClosingPct: v })} step={0.25} suffix="%" />
              </Field>
              <Field label="Selling costs (%)" htmlFor="sell">
                <NumberInput id="sell" value={buy.sellingCostPct} onChange={(v) => setBuy({ ...buy, sellingCostPct: v })} step={0.25} suffix="%" />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Monthly cost year 1: <span className="text-foreground font-medium">{fmtUSD(result.monthlyBuyerYear1)}</span> · P&amp;I only: {fmtUSD(result.monthlyPI)}
            </p>
          </div>

          {/* Renting */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" aria-hidden="true" /> If you rent
            </h3>
            <Field label="Monthly rent" htmlFor="mrent">
              <MoneyInput id="mrent" value={rent.monthlyRent} onChange={(v) => setRent({ ...rent, monthlyRent: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rent growth (%/yr)" htmlFor="rgrow">
                <NumberInput id="rgrow" value={rent.rentGrowthPct} onChange={(v) => setRent({ ...rent, rentGrowthPct: v })} step={0.25} suffix="%" />
              </Field>
              <Field label="Renter's insurance ($/mo)" htmlFor="rins">
                <MoneyInput id="rins" value={rent.rentersInsMonthly} onChange={(v) => setRent({ ...rent, rentersInsMonthly: v })} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Monthly cost year 1: <span className="text-foreground font-medium">{fmtUSD(result.monthlyRentYear1)}</span>
            </p>
          </div>

          {/* Assumptions with sliders */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Live assumptions
            </h3>
            <SliderRow
              label="Home appreciation"
              value={assumptions.appreciationPct}
              min={-2} max={10} step={0.1}
              onChange={(v) => setAssumptions({ ...assumptions, appreciationPct: v })}
              suffix="% / yr"
            />
            <SliderRow
              label="Rent growth"
              value={rent.rentGrowthPct}
              min={0} max={10} step={0.1}
              onChange={(v) => setRent({ ...rent, rentGrowthPct: v })}
              suffix="% / yr"
            />
            <SliderRow
              label="Investment return"
              value={assumptions.investmentReturnPct}
              min={0} max={12} step={0.1}
              onChange={(v) => setAssumptions({ ...assumptions, investmentReturnPct: v })}
              suffix="% / yr"
            />
            <SliderRow
              label="Years I plan to stay"
              value={assumptions.plannedYears}
              min={1} max={30} step={1}
              onChange={(v) => setAssumptions({ ...assumptions, plannedYears: v })}
              suffix=" yrs"
              integer
            />
            <p className="text-xs text-muted-foreground pt-2 border-t border-border flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
              No hidden constants — every assumption above is editable. Runs entirely in your browser.
            </p>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              Estimates for planning purposes only. Not financial or real estate advice. Actual outcomes depend on real
              market conditions, actual tax treatment, and costs not modeled here (mortgage points, PMI, local transfer
              taxes).
            </p>
          </div>
        </aside>

        {/* Chart */}
        <section className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Net position over 30 years</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Home equity minus total cash paid vs invested portfolio minus total rent paid.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <LegendDot color="var(--green-brand)" label="Buy" />
                <LegendDot color="var(--violet-brand)" label="Rent" />
              </div>
            </div>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} label={{ value: "Years", position: "insideBottom", offset: -2, fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(v) => compactUSD(v)} />
                  <RTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [fmtUSD(v), name]}
                    labelFormatter={(l) => `Year ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    x={result.atHorizon.year}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{ value: "Your plan", position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  {result.breakevenYear && (
                    <ReferenceDot
                      x={result.breakevenYear}
                      y={result.rows[result.breakevenYear - 1].buyNet}
                      r={6}
                      fill="var(--cyan-brand)"
                      stroke="var(--background)"
                      strokeWidth={2}
                      label={{ value: `Breakeven · yr ${result.breakevenYear}`, position: "top", fill: "var(--cyan-brand)", fontSize: 11 }}
                    />
                  )}
                  <Line type="monotone" dataKey="buyNet" name="Buy" stroke="var(--green-brand)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="rentNet" name="Rent" stroke="var(--violet-brand)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assumptions panel */}
          <details className="rounded-2xl border border-border bg-card/40 p-5">
            <summary className="cursor-pointer font-semibold text-sm">What's baked into these numbers?</summary>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <li>Property tax: <span className="text-foreground">{buy.propertyTaxPct}% / yr</span> of home value</li>
              <li>Maintenance: <span className="text-foreground">{buy.maintenancePct}% / yr</span> of home value</li>
              <li>Buying closing costs: <span className="text-foreground">{buy.buyingClosingPct}%</span> of price</li>
              <li>Selling costs at exit: <span className="text-foreground">{buy.sellingCostPct}%</span> of sale price</li>
              <li>Home appreciation: <span className="text-foreground">{assumptions.appreciationPct}% / yr</span></li>
              <li>Rent growth: <span className="text-foreground">{rent.rentGrowthPct}% / yr</span></li>
              <li>Investment return on down payment: <span className="text-foreground">{assumptions.investmentReturnPct}% / yr</span></li>
              <li>Years modeled: <span className="text-foreground">1–30</span></li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Every one of these is editable in the inputs above — none is a hidden constant. Federal itemized tax
              benefits of mortgage interest and SALT are intentionally not modeled; if you itemize, real outcomes may be
              slightly better for buying.
            </p>
          </details>
        </section>
      </div>

      <AdZone id="rent-vs-buy-calculator-mid" size="728x90" />

      <InternalLinks />

      <HowToUse
        steps={[
          "Enter the home price, down payment, mortgage rate, and your current monthly rent — everything else has a sensible US default you can still edit.",
          "Drag the appreciation, rent-growth, and investment-return sliders to reflect your view of the market — the breakeven year and chart update live.",
          "Compare the automatic breakeven year against how long you actually plan to stay — the second answer is the one that matters for your decision.",
        ]}
      />

      <ToolSeoContent
        title="Rent vs Buy Calculator — Find Your Breakeven Year"
        description="Free rent vs buy calculator that models the full cost of homeownership and the opportunity cost of your down payment, then tells you the exact number of years you'd need to stay before buying beats renting."
        body={[
          "Skycally's Rent vs Buy Calculator answers the one question that actually matters when you're weighing a home purchase against staying a renter: how many years would you need to live in the home before buying beats renting once every real cost is included? A simple 'mortgage vs rent' monthly-payment comparison — the one most quick calculators show — hides the answer, because a buyer's monthly payment ignores the down payment sitting in the home instead of earning market returns, the yearly drip of maintenance and property tax, and the 6–8% of the sale price that goes to agent commissions and closing on the way out. This tool works the way serious analyses like the New York Times' rent-vs-buy calculator do: it tracks a buyer's net position (home value minus mortgage balance minus selling costs minus total cash paid in) against a renter's net position (invested portfolio minus total rent paid), across every year from 1 to 30, and surfaces the exact year they cross.",
          "The biggest reason simpler calculators mislead is the opportunity cost of the down payment. A $90,000 down payment plus $13,500 of closing costs isn't just a one-time expense — it's roughly $103,500 that a renter could have kept in a low-cost index fund. At a 6% long-term return, that seed alone grows to nearly $186,000 in ten years without contributing another dollar. Any honest comparison has to credit the renter with that growth (and with the difference each month when buying costs more than renting), and any honest comparison has to charge the buyer for maintenance (roughly 1% of home value every year), for buying closing costs (2–4% of price), and for selling costs at exit (6–8% of sale price combined agent commission and closing). Skip any of these and buying looks artificially good; include them and the crossover shifts by years, sometimes decades.",
          "Home appreciation, rent growth, and investment return are the three assumptions that swing the answer the most, and unlike some calculators we refuse to bury them as fixed constants. Move the appreciation slider from 3% to 5% and buying pulls ahead by years; drop it to 1% and the crossover often disappears entirely inside a 30-year window. Rent growth works the other way — the faster rent rises, the sooner buying wins, because a fixed-rate mortgage payment doesn't inflate the way rent does. And investment return sets the bar the buyer's equity has to clear: at 4%, buying looks great; at 8%, the invested down payment is a genuinely tough opponent. Because the future values of these three inputs are honestly unknowable, the point isn't to guess them exactly — it's to see how sensitive your specific breakeven year is to reasonable ranges, and to make the decision knowing which assumption it hangs on.",
          "This calculator fits alongside Skycally's other financial planning tools. Once you've settled on a home price and rate here, the Mortgage Calculator will show you the exact monthly payment and full amortization schedule for that scenario. If the invested-down-payment side of the comparison keeps winning, the Compound Interest Calculator lets you model what that same capital could grow to over 20 or 30 years at different return rates. And before you commit to any monthly housing cost the model implies, the Paycheck Calculator will show you what your actual take-home pay looks like after federal tax, state tax, and FICA — the real number that has to comfortably absorb the payment, taxes, insurance, and maintenance on top.",
        ]}
        faqs={[
          {
            question: "What is the rent vs buy breakeven point?",
            answer:
              "The breakeven point is the number of years you'd need to live in a home before buying becomes cheaper — in total lifetime dollars, after selling — than renting the same place and investing the money you would have spent on a down payment and closing costs. Below the breakeven year, renting leaves you with more net wealth once the invested down payment is credited. Above it, the equity built plus home appreciation outrun what the renter's portfolio earned. This calculator computes that crossover year for the specific numbers you enter and highlights it directly on the chart.",
          },
          {
            question: "Is buying always better if I stay long enough?",
            answer:
              "Usually, but not always. With a strong appreciation assumption, rising rent, and a modest investment return, buying wins after a handful of years and pulls further ahead every year after that. But in a scenario with flat home prices, low rent growth, and strong market returns on the down payment — the model can show renting winning across the entire 30-year horizon. This is why we surface both the automatic breakeven year and a direct at-horizon comparison at how long you actually plan to stay: the honest answer depends on your specific numbers, not a universal rule.",
          },
          {
            question: "What costs do people forget when comparing renting to buying?",
            answer:
              "The three big ones are ongoing maintenance (typically ~1% of home value per year — a $500,000 home realistically eats $5,000/year in repairs, roof, HVAC, and appliances over its life), selling costs at exit (6–8% combined agent commission and closing, so a $500,000 sale costs $30,000–$40,000 to walk away from), and the opportunity cost of the down payment (money that could otherwise be invested and compounding for decades). Simple 'mortgage vs rent' calculators skip all three and consistently overstate how good buying looks.",
          },
          {
            question: "How does the down payment's opportunity cost factor into the math?",
            answer:
              "The calculator credits a renter's scenario with an investment portfolio seeded with the buyer's upfront capital (down payment plus closing costs) that then grows at your chosen investment-return rate. Each month, if buying costs more than renting, the difference also gets invested. This is the standard approach used by the NYT calculator and academic rent-vs-buy analyses: it's the only way to compare the two scenarios fairly, because a buyer's $100,000 down payment isn't free — it's $100,000 that isn't earning market returns.",
          },
          {
            question: "What's a quick rule of thumb for rent vs buy?",
            answer:
              "The old '5% rule' says renting is roughly break-even with buying when annual rent is about 5% of the home price (1% property tax + 1% maintenance + 3% opportunity cost of equity). If rent is less than 5%, renting probably wins. If rent is more than 5%, buying probably wins — assuming you stay long enough to amortize the buying and selling costs. But rules of thumb hide the sensitivity to assumptions, which is why this calculator lets you actually see the breakeven year move as you drag each slider.",
          },
          {
            question: "Does this account for the tax benefits of owning a home?",
            answer:
              "Not by default. Federal itemized deductions for mortgage interest and property tax (SALT-capped) can meaningfully reduce the effective cost of owning — but only for taxpayers who itemize, and after the 2017 tax reform raised the standard deduction, most households don't itemize any more. Because the benefit is highly personal (depends on filing status, other deductions, state tax, and whether the SALT cap binds), we leave it out of the base model and note in the disclaimer that if you do itemize, real outcomes may be a bit better for buying than shown.",
          },
          {
            question: "How accurate are home appreciation assumptions?",
            answer:
              "Nobody knows what a specific home will do over 10–30 years. The long-term US average has been roughly 3–4% nominal home price appreciation, but individual metros have varied from near-zero to 6%+ real growth over long stretches, and real prices can fall for a decade after a bubble. That's exactly why appreciation is a slider here, not a hidden constant: pick a range you think is defensible (say 2–4% for most markets), and see how sensitive your breakeven year is. If the answer holds across your whole range, you have a robust decision. If it flips within it, the decision depends on a genuine guess and you should weight non-financial factors more.",
          },
          {
            question: "Should I buy if I might move again in a few years?",
            answer:
              "Usually no. Buying and selling combined typically cost 8–11% of a home's value (buying closing ~2–4%, selling ~6–8%). If your breakeven year is 7 and you're likely to move in 3, buying almost certainly loses money — the transaction costs alone eat any appreciation and equity you built. This is where the calculator's at-horizon comparison matters most: your planned stay is a stronger signal about which choice fits your life than the auto-computed breakeven year. Even if buying is theoretically 'better after 8 years,' it's not better for you if you'll leave in 4.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}

// ---------------------------- UI helpers ----------------------------

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground mb-1 block">{label}</Label>
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
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
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  integer = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  integer?: boolean;
}) {
  const display = integer ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, "");
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-sm font-semibold tabular-nums">
          {display}
          <span className="text-muted-foreground font-normal">{suffix}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function NetChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: accent }}>
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

function compactUSD(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? "-" : ""}$${(abs / 1_000).toFixed(0)}k`;
  return `${v < 0 ? "-" : ""}$${abs.toFixed(0)}`;
}

function InternalLinks() {
  const items: Array<{ to: string; title: string; body: string }> = [
    {
      to: "/tools/mortgage-calculator",
      title: "Mortgage Calculator",
      body: "See the exact monthly payment and full amortization schedule for the home price and rate you're modeling here.",
    },
    {
      to: "/tools/compound-interest",
      title: "Compound Interest Calculator",
      body: "See what your down payment could grow to over the years if invested instead of put into a home.",
    },
    {
      to: "/tools/paycheck-calculator",
      title: "Paycheck Calculator",
      body: "Make sure the monthly payment this scenario implies actually fits your real take-home pay after federal, state, and FICA.",
    },
  ];
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
      <h2 className="font-display text-lg font-bold mb-4">Round out your decision</h2>
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
