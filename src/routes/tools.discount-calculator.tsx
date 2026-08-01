import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/discount-calculator")({
  head: () => buildToolMeta(toolBySlug("discount-calculator", tools)),
  component: DiscountCalculator,
});

function num(v: string): number | null {
  const cleaned = v.replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function usd(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function pct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function Field({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`text-lg ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SaveBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
      style={{
        background: "color-mix(in oklab, var(--orange-brand, #f97316) 20%, transparent)",
        color: "var(--orange-brand, #f97316)",
      }}
    >
      {children}
    </span>
  );
}

function DiscountCalculator() {
  const tool = toolBySlug("discount-calculator", tools);

  // a) Sale price
  const [aPrice, setAPrice] = useState("100");
  const [aDisc, setADisc] = useState("20");
  const aP = num(aPrice);
  const aD = num(aDisc);
  const aSale = aP !== null && aD !== null ? aP * (1 - aD / 100) : null;
  const aSaved = aP !== null && aSale !== null ? aP - aSale : null;

  // b) Discount %
  const [bOrig, setBOrig] = useState("120");
  const [bSale, setBSale] = useState("90");
  const bO = num(bOrig);
  const bS = num(bSale);
  const bDisc = bO !== null && bS !== null && bO !== 0 ? ((bO - bS) / bO) * 100 : null;
  const bSaved = bO !== null && bS !== null ? bO - bS : null;

  // c) Stacked
  const [cPrice, setCPrice] = useState("100");
  const [cD1, setCD1] = useState("20");
  const [cD2, setCD2] = useState("15");
  const cP = num(cPrice);
  const c1 = num(cD1);
  const c2 = num(cD2);
  const cAfter1 = cP !== null && c1 !== null ? cP * (1 - c1 / 100) : null;
  const cFinal = cAfter1 !== null && c2 !== null ? cAfter1 * (1 - c2 / 100) : null;
  const cEffective = c1 !== null && c2 !== null ? (1 - (1 - c1 / 100) * (1 - c2 / 100)) * 100 : null;
  const cSaved = cP !== null && cFinal !== null ? cP - cFinal : null;
  const cNaive = c1 !== null && c2 !== null ? c1 + c2 : null;
  const cNaivePrice = cP !== null && cNaive !== null ? cP * (1 - cNaive / 100) : null;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <Tabs defaultValue="sale">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="sale" className="text-xs sm:text-sm py-2">
            Sale price
          </TabsTrigger>
          <TabsTrigger value="percent" className="text-xs sm:text-sm py-2">
            Discount %
          </TabsTrigger>
          <TabsTrigger value="stacked" className="text-xs sm:text-sm py-2">
            Stacked
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sale" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 min-w-0">
              <h2 className="font-display text-lg font-bold">What is the sale price?</h2>
              <Field
                id="a-price"
                label="Original price"
                value={aPrice}
                onChange={setAPrice}
                prefix="$"
                hint="The price before any discount."
              />
              <Field id="a-disc" label="Discount" value={aDisc} onChange={setADisc} suffix="%" hint="Percent off." />
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_12%,transparent)] to-card p-5 flex flex-col justify-center min-w-0">
              <div className="text-sm text-muted-foreground">Sale price</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-xl text-muted-foreground line-through">{usd(aP)}</span>
                <span
                  className="font-display text-4xl font-extrabold break-all"
                  style={{ color: "var(--green-brand)" }}
                >
                  {usd(aSale)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SaveBadge>You save {pct(aD)}</SaveBadge>
                <span className="text-sm font-semibold" style={{ color: "var(--green-brand)" }}>
                  −{usd(aSaved)}
                </span>
              </div>
              <div className="mt-3 font-mono text-xs text-muted-foreground/80">
                sale = original × (1 − discount ÷ 100)
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="percent" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 min-w-0">
              <h2 className="font-display text-lg font-bold">What percent off is this?</h2>
              <Field
                id="b-orig"
                label="Original price"
                value={bOrig}
                onChange={setBOrig}
                prefix="$"
                hint="The list price. Cannot be zero."
              />
              <Field id="b-sale" label="Sale price" value={bSale} onChange={setBSale} prefix="$" hint="What you pay." />
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_12%,transparent)] to-card p-5 flex flex-col justify-center min-w-0">
              <div className="text-sm text-muted-foreground">Discount</div>
              <div className="mt-2">
                <span
                  className="font-display text-4xl font-extrabold break-all"
                  style={{ color: "var(--green-brand)" }}
                >
                  {pct(bDisc)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SaveBadge>You save</SaveBadge>
                <span className="text-sm font-semibold" style={{ color: "var(--green-brand)" }}>
                  −{usd(bSaved)}
                </span>
              </div>
              <div className="mt-3 font-mono text-xs text-muted-foreground/80">
                discount % = ((original − sale) ÷ original) × 100
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stacked" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 min-w-0">
              <h2 className="font-display text-lg font-bold">Two discounts, one after the other</h2>
              <Field id="c-price" label="Original price" value={cPrice} onChange={setCPrice} prefix="$" />
              <Field id="c-d1" label="Discount 1" value={cD1} onChange={setCD1} suffix="%" hint="Applied first." />
              <Field
                id="c-d2"
                label="Discount 2"
                value={cD2}
                onChange={setCD2}
                suffix="%"
                hint="Applied to the already-discounted price."
              />
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_12%,transparent)] to-card p-5 flex flex-col justify-center min-w-0">
              <div className="text-sm text-muted-foreground">Final price</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-xl text-muted-foreground line-through">{usd(cP)}</span>
                <span
                  className="font-display text-4xl font-extrabold break-all"
                  style={{ color: "var(--green-brand)" }}
                >
                  {usd(cFinal)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SaveBadge>Effective {pct(cEffective)} off</SaveBadge>
                <span className="text-sm font-semibold" style={{ color: "var(--green-brand)" }}>
                  −{usd(cSaved)}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-mono">
                <span>{usd(cP)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">(−{pct(c1)})</span>
                <span className="text-muted-foreground">→</span>
                <span>{usd(cAfter1)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">(−{pct(c2)})</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-bold" style={{ color: "var(--green-brand)" }}>
                  {usd(cFinal)}
                </span>
              </div>

              <div className="mt-3 font-mono text-xs text-muted-foreground/80">
                effective % = (1 − (1 − D1 ÷ 100) × (1 − D2 ÷ 100)) × 100
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
            <h3 className="font-display text-base font-bold mb-2">
              Stacked discounts don&apos;t add up — {pct(c1)} off then {pct(c2)} off ≠ {pct(cNaive)} off
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The second discount only applies to what is left after the first one. On {usd(cP)}, taking {pct(c1)} off
              and then {pct(c2)} off leaves {usd(cFinal)} — an effective {pct(cEffective)} off. Simply adding the two
              percentages would give {pct(cNaive)} off, or {usd(cNaivePrice)}, which is{" "}
              {usd(cFinal !== null && cNaivePrice !== null ? Math.abs(cFinal - cNaivePrice) : null)} lower than what you
              actually pay.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
        Need the math behind the discount? The{" "}
        <Link to="/tools/percentage-calculator" className="underline underline-offset-4 hover:text-foreground">
          Percentage Calculator
        </Link>{" "}
        covers percentage change and X% of Y. Selling a product? The{" "}
        <Link to="/tools/margin-calculator" className="underline underline-offset-4 hover:text-foreground">
          Margin Calculator
        </Link>{" "}
        turns cost and revenue into gross margin. And for budgeting what you save, try the{" "}
        <Link to="/tools/debt-payoff-calculator" className="underline underline-offset-4 hover:text-foreground">
          Debt Payoff Calculator
        </Link>
        .
      </p>

      <AdZone id="discount-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick a tab: sale price from a percent off, the discount percentage from two prices, or two stacked discounts.",
          "Type your numbers — results update instantly as you type, with no calculate button.",
          "Read the sale price, the amount you save and the effective discount, plus the formula used underneath.",
        ]}
      />

      <ToolSeoContent
        title="Discount Calculator — Sale Price, Discount % & Stacked Discounts"
        description="Free discount calculator and sale price calculator. Work out the price after a percent off, find the discount percentage from two prices, or stack two discounts and see the true effective discount instantly."
        body={[
          "Skycally's Discount Calculator answers the three questions shoppers actually type into search: what a percent off calculator gives you, what percentage a sale represents, and what happens when two discounts are applied one after the other. Each mode lives on its own tab and recalculates as you type, so there is no calculate button and nothing to submit. The sale price tab shows the original price struck through next to the new price, with a badge for the percentage saved, exactly the way a shop tag would.",
          "The sale price mode is the classic percent off calculator: enter the original price and the discount, and the tool multiplies by one minus the discount as a fraction. Twenty percent off $100 is $100 × 0.80 = $80, with $20 saved. The reverse mode goes the other way — enter what an item used to cost and what it costs now and the calculator tells you the discount percentage, which is useful for checking whether an advertised sale really is as deep as the sign claims.",
          "The stacked discount calculator is the mode most tools skip. When a store takes 20% off and then applies an extra 15% coupon at checkout, the second discount is calculated on the already reduced price, not on the original. Twenty percent off $100 leaves $80, and 15% off $80 leaves $68 — an effective discount of 32%, not 35%. The tool shows the full chain of prices step by step so you can see exactly where each reduction lands, and spells out the difference against the naive sum in dollars.",
          "Everything runs locally in your browser with plain arithmetic. Nothing you type is uploaded, stored or logged, there is no signup, and every number is formatted in US English so the results look the same on any device. If you need the underlying math in a more general form, the Percentage Calculator handles percentage change and percentage increase, while the Margin Calculator works out what a discount does to your gross margin if you are the one selling.",
        ]}
        faqs={[
          {
            question: "How do I calculate 20% off $50?",
            answer:
              "Multiply by 0.80. $50 × 0.80 = $40, so you save $10. In the sale price tab, enter 50 as the original price and 20 as the discount and the result appears instantly.",
          },
          {
            question: "What is the formula for discount percentage?",
            answer:
              "Discount % = ((original price − sale price) ÷ original price) × 100. An item that dropped from $120 to $90 is ((120 − 90) ÷ 120) × 100 = 25% off. Use the 'Discount %' tab.",
          },
          {
            question: "How do stacked discounts work?",
            answer:
              "The second discount is applied to the price after the first discount, not to the original. So $100 with 20% off becomes $80, and a further 15% off $80 becomes $68. The stacked tab shows each step of the chain.",
          },
          {
            question: "Is 20% off then 15% off the same as 35% off?",
            answer:
              "No. Stacked discounts multiply rather than add. 20% then 15% gives an effective 32% off ($68 on a $100 item), while a straight 35% off would be $65. The stacked tab shows both figures side by side.",
          },
          {
            question: "How do I find the original price from a sale price?",
            answer:
              "Divide the sale price by one minus the discount as a fraction. An item at $80 after 20% off was $80 ÷ 0.80 = $100. You can also enter both prices in the 'Discount %' tab to confirm the percentage matches the advertised sale.",
          },
          {
            question: "How do I calculate the effective discount of two coupons?",
            answer:
              "Effective % = (1 − (1 − D1 ÷ 100) × (1 − D2 ÷ 100)) × 100. For 30% and 10%, that is (1 − 0.70 × 0.90) × 100 = 37% off, not 40%.",
          },
          {
            question: "Does this discount calculator include sales tax?",
            answer:
              "No — it works on the pre-tax price. Apply your local sales tax to the final discounted price afterwards; the Percentage Calculator's increase mode can add a tax percentage for you.",
          },
          {
            question: "Is this sale price calculator free and private?",
            answer:
              "Yes. It is completely free with no signup, and every calculation runs in your browser. Nothing you enter is sent to a server, stored or logged.",
          },
        ]}
      />

      <RelatedTools currentSlug="discount-calculator" />
    </ToolPageShell>
  );
}
