import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/margin-calculator")({
  head: () => buildToolMeta(toolBySlug("margin-calculator", tools)),
  component: MarginCalculator,
});

function fmt(n: number) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number) {
  if (!isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function MarginCalculator() {
  const tool = toolBySlug("margin-calculator", tools);
  const [cost, setCost] = useState<string>("100");
  const [revenue, setRevenue] = useState<string>("150");

  const c = Math.max(0, parseFloat(cost) || 0);
  const r = Math.max(0, parseFloat(revenue) || 0);
  const profit = r - c;
  const margin = r > 0 ? (profit / r) * 100 : NaN;
  const markup = c > 0 ? (profit / c) * 100 : NaN;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div>
            <label htmlFor="cost" className="block text-sm font-medium mb-2">
              Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="pl-7 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">What the item costs you to produce or buy.</p>
          </div>
          <div>
            <label htmlFor="revenue" className="block text-sm font-medium mb-2">
              Revenue (selling price)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="revenue"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="pl-7 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">What you sell the item for.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_15%,transparent)] to-card p-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
            <span className="text-sm text-muted-foreground">Profit</span>
            <span className="font-display text-2xl font-bold">${fmt(profit)}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
            <span className="text-sm text-muted-foreground">Markup</span>
            <span className="font-display text-2xl font-bold">{pct(markup)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <div>
              <div className="text-sm text-muted-foreground">Gross margin</div>
              <div className="text-xs text-muted-foreground/70">profit ÷ revenue</div>
            </div>
            <span className="font-display text-4xl font-extrabold text-[var(--green-brand)]">{pct(margin)}</span>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-3">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The Margin Calculator uses two simple formulas. Enter your cost (what you paid to make or buy the product) and
          your revenue (what you sell it for) — the calculator instantly returns profit, gross margin, and markup.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Profit</div>
            <div className="font-mono text-sm">profit = revenue − cost</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Gross margin
            </div>
            <div className="font-mono text-sm">margin % = (profit ÷ revenue) × 100</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Markup</div>
            <div className="font-mono text-sm">markup % = (profit ÷ cost) × 100</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Example: an item costs $100 and sells for $150. Profit is $50, gross margin is 33.33% (50 ÷ 150), and markup
          is 50% (50 ÷ 100). Margin and markup are related but not the same — margin measures profit against the selling
          price, markup measures it against the cost.
        </p>
      </section>

      <HowToUse
        steps={[
          "Enter the cost — what the item costs you.",
          "Enter the revenue — what you sell it for.",
          "See profit, gross margin percentage and markup percentage update instantly.",
        ]}
      />

      <ToolSeoContent
        title="Margin Calculator — Gross Margin, Markup & Profit"
        description="Free online margin calculator. Enter cost and revenue to instantly get profit, gross profit margin percentage, and markup percentage. No signup, works in your browser."
        body={[
          "Skycally's Margin Calculator is a free tool for business owners, e-commerce sellers, freelancers and accountants who need to price products correctly. Enter what an item costs you and what you sell it for, and the calculator instantly returns three numbers: the raw profit in dollars, the gross profit margin as a percentage of revenue, and the markup as a percentage of cost. Results update as you type.",
          "Margin and markup are the two ways to express the same profit relationship, and mixing them up is one of the most common pricing mistakes. Margin is profit divided by revenue — it tells you what percentage of every dollar of sales you keep. Markup is profit divided by cost — it tells you how much you added on top of what you paid. A 50% markup only translates to a 33.33% margin. The calculator shows both so you can price consistently across suppliers, marketplaces and quote sheets.",
          "The tool runs entirely in your browser: no uploads, no signup, no data saved. Use it for Shopify or Amazon product pricing, wholesale-to-retail markup, service quotes, restaurant menu pricing, or a quick sanity check before sending an invoice.",
          "A quick way to keep the two straight: if you're working backward from a desired margin to figure out what price to charge, remember that markup will always need to be a larger percentage than the margin you're targeting — the formulas aren't interchangeable, and using one where the other belongs is a common way businesses accidentally underprice their products.",
        ]}
        faqs={[
          {
            question: "What is the difference between margin and markup?",
            answer:
              "Both measure profit but use a different base. Gross margin = profit ÷ revenue × 100 (how much of each sale is profit). Markup = profit ÷ cost × 100 (how much you added to your cost). Example: cost $100, sell $150. Margin = 33.33%, markup = 50%. Same profit, different percentages.",
          },
          {
            question: "How do I calculate gross profit margin?",
            answer:
              "Gross profit margin = (revenue − cost) ÷ revenue × 100. If revenue is $200 and cost is $120, gross margin is (200 − 120) ÷ 200 × 100 = 40%.",
          },
          {
            question: "What is a good profit margin?",
            answer:
              "It depends on the industry. Retail: 20–50% gross margin is common. Restaurants: 30–70% on food. Software / SaaS: often 70–90%. Wholesale and grocery: single-digit to low-double-digit. Compare against your own history and competitors in the same category.",
          },
          {
            question: "Does this calculator include taxes or fees?",
            answer:
              "No. It calculates gross margin — revenue minus cost of goods, before shipping, marketplace fees, payment processing, taxes or overhead. Subtract those from revenue first if you want net margin.",
          },
          {
            question: "How do I price a product to hit a target margin?",
            answer:
              "Divide your cost by (1 − target margin as a decimal). For example, to hit a 40% margin on a $60 cost item: $60 ÷ (1 − 0.40) = $60 ÷ 0.60 = $100 selling price.",
          },
          {
            question: "Why is markup always higher than margin for the same profit?",
            answer:
              "Because markup divides profit by the smaller number (cost), while margin divides it by the larger number (revenue, which already includes the profit). The two will only be equal at 0% profit.",
          },
          {
            question: "Should I use margin or markup for pricing decisions?",
            answer:
              "Margin is generally more useful for pricing strategy since it directly tells you what share of revenue is profit — useful for comparing profitability across products. Markup is more common in purchasing and wholesale contexts, where you're calculating from a known cost upward.",
          },
          {
            question: "Is my pricing data stored anywhere?",
            answer:
              "No. All calculations happen locally in your browser. Nothing you enter is saved, logged, or sent to a server.",
          },
        ]}
      />

      <RelatedTools currentSlug="margin-calculator" />
    </ToolPageShell>
  );
}
