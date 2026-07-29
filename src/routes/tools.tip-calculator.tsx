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
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
              <div className="text-xs text-muted-foreground/70">
                {people} {people === 1 ? "person" : "people"}
              </div>
            </div>
            <span className="font-display text-4xl font-extrabold text-[var(--green-brand)]">${fmt(perPerson)}</span>
          </div>
        </div>
      </div>

      <HowToUse
        steps={[
          "Enter your total bill amount.",
          "Pick a tip percentage from the presets or type a custom value.",
          "Set the number of people splitting the bill to see each person's share.",
        ]}
      />

      <ToolSeoContent
        title="Tip Calculator — Split Bills & Calculate Tips Instantly"
        description="Free online tip calculator. Enter your bill, choose a tip percentage (10–25% presets or custom), split between any number of people. Instant results, no signup."
        body={[
          "Skycally's Tip Calculator takes the awkwardness out of splitting a restaurant bill. Enter the subtotal, pick a tip percentage — 15% for standard service, 18–20% for good service, 25% for exceptional — or enter any custom percentage. The calculator instantly shows the tip amount, the total bill including tip, and the exact amount each person owes when splitting.",
          "The split calculation is precise to the cent, so nobody underpays or overpays. Results update live as you type — no button to press. Five preset percentages (10%, 15%, 18%, 20%, 25%) are available for quick selection, covering the full range from minimal to generous tipping.",
          "Tipping customs vary significantly by country and service type. In the United States, 15–20% is standard at restaurants. In the UK, 10–12.5% is common. Many European countries include a service charge automatically. Some countries (Japan, South Korea) consider tipping unnecessary or even rude. The calculator works for any percentage worldwide.",
          "For group outings, splitting evenly is the fastest option, but it isn't always the fairest one if people ordered very differently. In that case, calculate each person's individual subtotal separately and run it through this tool one at a time, rather than dividing one combined total by the number of guests.",
        ]}
        faqs={[
          {
            question: "How much should I tip at a restaurant?",
            answer:
              "In the US: 15% for standard service, 18–20% for good service, 25%+ for exceptional. In the UK: 10–12.5%. In Canada: 15–20%. In Australia: tipping is optional, 10% is generous. Many European countries include service automatically — check your bill before tipping.",
          },
          {
            question: "Should I tip on the pre-tax or post-tax amount?",
            answer:
              "Technically, tipping on the pre-tax subtotal is the standard practice in the US. However, the difference is small (on a $50 meal with 10% tax, it's about $0.75) and most people tip on the post-tax total for simplicity. This calculator uses the bill amount you enter, so input whichever amount you prefer.",
          },
          {
            question: "How is the per-person amount calculated?",
            answer:
              "Per person = (bill + tip) ÷ number of people. For example, a $80 bill with 20% tip ($16) totals $96, split 4 ways = $24 per person. The calculation is to the cent.",
          },
          {
            question: "Can I split the bill unevenly?",
            answer:
              "This calculator splits the total evenly between all people. For uneven splits (where each person ordered different items), calculate each person's individual subtotal, apply the same tip percentage to each, and add their share of tax separately.",
          },
          {
            question: "What if service is included?",
            answer:
              "If the bill already includes a service charge (common in many European restaurants and some US restaurants for large groups), you don't need to add an additional tip. Set the tip percentage to 0% to see just the bill total and per-person split.",
          },
          {
            question: "Do I tip on takeout or delivery orders?",
            answer:
              "For takeout, tipping is optional — 10% is a nice gesture. For delivery, 15–20% is standard, especially in bad weather or for large orders. For food delivery apps (Uber Eats, DoorDash), 15–20% goes to the driver.",
          },
          {
            question: "Is my data saved?",
            answer: "No. All calculations run instantly in your browser. Nothing is stored or sent to any server.",
          },
          {
            question: "Can I use a custom tip percentage?",
            answer:
              "Yes. Below the preset buttons (10%, 15%, 18%, 20%, 25%), there is a text field where you can type any tip percentage from 0% to 100%.",
          },
        ]}
      />

      <RelatedTools currentSlug="tip-calculator" />
    </ToolPageShell>
  );
}
