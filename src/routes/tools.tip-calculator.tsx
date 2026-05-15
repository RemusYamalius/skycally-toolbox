import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/tip-calculator")({
  head: () => buildToolMeta(toolBySlug("tip-calculator", tools)),
  component: TipCalculator,
});

const PRESETS = [10, 15, 18, 20, 25];

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TipCalculator() {
  const tool = toolBySlug("tip-calculator", tools);
  const [bill, setBill] = useState<string>("50");
  const [tipPct, setTipPct] = useState<number>(18);
  const [people, setPeople] = useState<number>(1);

  const billNum = Math.max(0, parseFloat(bill) || 0);
  const tip = (billNum * tipPct) / 100;
  const total = billNum + tip;
  const perPerson = people > 0 ? total / people : 0;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Bill amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                className="pl-7 text-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tip percentage</label>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant={tipPct === p ? "default" : "outline"}
                  onClick={() => setTipPct(p)}
                  className="h-10"
                >
                  {p}%
                </Button>
              ))}
            </div>
            <div className="mt-3">
              <Input
                type="number"
                min="0"
                max="100"
                value={tipPct}
                onChange={(e) => setTipPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                placeholder="Custom %"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Number of people</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPeople((p) => Math.max(1, p - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                min="1"
                value={people}
                onChange={(e) => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center"
              />
              <Button variant="outline" size="icon" onClick={() => setPeople((p) => p + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--green-brand)_15%,transparent)] to-card p-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
            <span className="text-sm text-muted-foreground">Tip amount</span>
            <span className="font-display text-2xl font-bold">${fmt(tip)}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
            <span className="text-sm text-muted-foreground">Total bill</span>
            <span className="font-display text-2xl font-bold">${fmt(total)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <div>
              <div className="text-sm text-muted-foreground">Per person</div>
              <div className="text-xs text-muted-foreground/70">{people} {people === 1 ? "person" : "people"}</div>
            </div>
            <span className="font-display text-4xl font-extrabold text-[var(--green-brand)]">${fmt(perPerson)}</span>
          </div>
        </div>
      </div>

      <HowToUse steps={[
        "Enter your total bill amount",
        "Pick a tip percentage or type a custom value",
        "Set the number of people to split the bill",
      ]} />

      <ToolSeoContent
        title="Tip Calculator — Split Bills & Calculate Tips Instantly"
        description="Free online tip calculator. Enter your bill, choose a tip percentage, and split the total fairly between any number of people."
        body={[
          "Skycally's Tip Calculator takes the awkwardness out of splitting a restaurant bill. Enter the subtotal, pick a tip — 15% for standard service, 18–20% for great service, or set your own percentage — and the calculator instantly shows the tip amount, the total bill, and the exact amount each person owes.",
          "It's perfect for dinners with friends, work lunches, group travel, or anytime you want a quick, fair split. The math updates live as you type, and there are no rounding tricks: each person's share is calculated to the cent, so nobody underpays or overpays.",
          "Everything runs locally in your browser — no signup, no tracking, no internet connection needed once the page is loaded. Bookmark it on your phone for instant access at the table.",
        ]}
        faqs={[
          { question: "How much should I tip?", answer: "In the US, 15% is standard, 18–20% is good service, and 25%+ is exceptional. Other countries have very different norms — some include service automatically." },
          { question: "Should the tip be calculated before or after tax?", answer: "Both are common. Tipping on the pre-tax subtotal is technically correct, but many people tip on the post-tax total for simplicity." },
          { question: "Can I split unevenly?", answer: "This calculator splits evenly. For uneven splits, calculate each person's subtotal separately and apply the same tip percentage to each." },
          { question: "Is my data saved?", answer: "No. Everything stays in your browser tab and is cleared when you close it." },
        ]}
      />

      <RelatedTools currentSlug="tip-calculator" />
    </ToolPageShell>
  );
}
