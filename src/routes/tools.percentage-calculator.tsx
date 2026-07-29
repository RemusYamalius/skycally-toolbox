import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/percentage-calculator")({
  head: () => buildToolMeta(toolBySlug("percentage-calculator", tools)),
  component: PercentageCalculator,
});

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function pct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;
}

function Field({
  id,
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-8 text-lg" : "text-lg"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResultCard({
  label,
  value,
  formula,
  accent = "var(--cyan-brand)",
  icon,
}: {
  label: string;
  value: string;
  formula: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)] to-card p-5 flex flex-col justify-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <span className="font-display text-4xl font-extrabold break-all" style={{ color: accent }}>
          {value}
        </span>
      </div>
      <div className="mt-3 font-mono text-xs text-muted-foreground/80">{formula}</div>
    </div>
  );
}

function PercentageCalculator() {
  const tool = toolBySlug("percentage-calculator", tools);

  // a) What is X% of Y?
  const [aX, setAX] = useState("15");
  const [aY, setAY] = useState("200");
  const aXn = num(aX);
  const aYn = num(aY);
  const aResult = aXn !== null && aYn !== null ? (aXn / 100) * aYn : null;

  // b) X is what percent of Y?
  const [bX, setBX] = useState("25");
  const [bY, setBY] = useState("200");
  const bXn = num(bX);
  const bYn = num(bY);
  const bResult = bXn !== null && bYn !== null && bYn !== 0 ? (bXn / bYn) * 100 : null;

  // c) Percentage change from X to Y
  const [cX, setCX] = useState("80");
  const [cY, setCY] = useState("100");
  const cXn = num(cX);
  const cYn = num(cY);
  const cResult = cXn !== null && cYn !== null && cXn !== 0 ? ((cYn - cXn) / cXn) * 100 : null;
  const cUp = cResult !== null && cResult > 0;
  const cDown = cResult !== null && cResult < 0;

  // d) Y increased / decreased by X%
  const [dMode, setDMode] = useState<"increase" | "decrease">("increase");
  const [dY, setDY] = useState("250");
  const [dX, setDX] = useState("20");
  const dYn = num(dY);
  const dXn = num(dX);
  const dResult =
    dYn !== null && dXn !== null ? dYn * (dMode === "increase" ? 1 + dXn / 100 : 1 - dXn / 100) : null;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <Tabs defaultValue="of">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="of" className="text-xs sm:text-sm py-2">
            X% of Y
          </TabsTrigger>
          <TabsTrigger value="what" className="text-xs sm:text-sm py-2">
            X is what % of Y
          </TabsTrigger>
          <TabsTrigger value="change" className="text-xs sm:text-sm py-2">
            % change
          </TabsTrigger>
          <TabsTrigger value="inc" className="text-xs sm:text-sm py-2">
            Increase / decrease
          </TabsTrigger>
        </TabsList>

        <TabsContent value="of" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h2 className="font-display text-lg font-bold">What is X% of Y?</h2>
              <Field id="a-x" label="Percentage (X)" value={aX} onChange={setAX} suffix="%" hint="The percentage you want to take." />
              <Field id="a-y" label="Of the number (Y)" value={aY} onChange={setAY} hint="The base number." />
            </div>
            <ResultCard
              label={`${fmt(aXn)}% of ${fmt(aYn)} is`}
              value={fmt(aResult)}
              formula="result = (X ÷ 100) × Y"
            />
          </div>
        </TabsContent>

        <TabsContent value="what" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h2 className="font-display text-lg font-bold">X is what percent of Y?</h2>
              <Field id="b-x" label="The part (X)" value={bX} onChange={setBX} hint="The smaller value you are measuring." />
              <Field id="b-y" label="The whole (Y)" value={bY} onChange={setBY} hint="The total. Cannot be zero." />
            </div>
            <ResultCard
              label={`${fmt(bXn)} out of ${fmt(bYn)} is`}
              value={pct(bResult)}
              formula="result % = (X ÷ Y) × 100"
            />
          </div>
        </TabsContent>

        <TabsContent value="change" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h2 className="font-display text-lg font-bold">Percentage change from X to Y</h2>
              <Field id="c-x" label="Original value (X)" value={cX} onChange={setCX} hint="The starting number. Cannot be zero." />
              <Field id="c-y" label="New value (Y)" value={cY} onChange={setCY} hint="The number you ended up with." />
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--cyan-brand)_12%,transparent)] to-card p-5 flex flex-col justify-center">
              <div className="text-sm text-muted-foreground">
                {cUp ? "Percentage increase" : cDown ? "Percentage decrease" : "Percentage change"}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {cUp && <ArrowUpRight className="w-8 h-8" style={{ color: "var(--green-brand)" }} aria-hidden="true" />}
                {cDown && <ArrowDownRight className="w-8 h-8 text-destructive" aria-hidden="true" />}
                <span
                  className="font-display text-4xl font-extrabold break-all"
                  style={{ color: cUp ? "var(--green-brand)" : cDown ? "hsl(var(--destructive))" : undefined }}
                >
                  {cResult === null ? "—" : pct(Math.abs(cResult))}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {cUp ? "increase" : cDown ? "decrease" : cResult === 0 ? "no change" : ""}
              </div>
              <div className="mt-3 font-mono text-xs text-muted-foreground/80">change % = ((Y − X) ÷ X) × 100</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inc" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h2 className="font-display text-lg font-bold">Increase or decrease a number by a percentage</h2>
              <div className="inline-flex rounded-xl border border-border p-1 bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setDMode("increase")}
                  aria-pressed={dMode === "increase"}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${dMode === "increase" ? "bg-card font-semibold" : "text-muted-foreground"}`}
                >
                  Increase
                </button>
                <button
                  type="button"
                  onClick={() => setDMode("decrease")}
                  aria-pressed={dMode === "decrease"}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${dMode === "decrease" ? "bg-card font-semibold" : "text-muted-foreground"}`}
                >
                  Decrease
                </button>
              </div>
              <Field id="d-y" label="Starting number (Y)" value={dY} onChange={setDY} hint="The value to adjust." />
              <Field id="d-x" label="Percentage (X)" value={dX} onChange={setDX} suffix="%" hint={`How much to ${dMode} it by.`} />
            </div>
            <ResultCard
              label={`${fmt(dYn)} ${dMode === "increase" ? "increased" : "decreased"} by ${fmt(dXn)}% is`}
              value={fmt(dResult)}
              formula={dMode === "increase" ? "result = Y × (1 + X ÷ 100)" : "result = Y × (1 − X ÷ 100)"}
              accent={dMode === "increase" ? "var(--green-brand)" : undefined}
            />
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
        Percentages show up everywhere else on Skycally too. If you are pricing a product, the{" "}
        <Link to="/tools/margin-calculator" className="underline underline-offset-4 hover:text-foreground">
          Margin Calculator
        </Link>{" "}
        turns cost and revenue into margin and markup percentages. For a restaurant bill, the{" "}
        <Link to="/tools/tip-calculator" className="underline underline-offset-4 hover:text-foreground">
          Tip Calculator
        </Link>{" "}
        applies a tip percentage and splits the total. When the numbers are in different currencies, run them through the{" "}
        <Link to="/tools/currency-converter" className="underline underline-offset-4 hover:text-foreground">
          Currency Converter
        </Link>{" "}
        first, and for weights, lengths or temperatures the{" "}
        <Link to="/tools/unit-converter" className="underline underline-offset-4 hover:text-foreground">
          Unit Converter
        </Link>{" "}
        gets everything onto the same scale before you compare.
      </p>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-3">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Each tab uses one formula. A percentage is just a fraction out of 100, so every calculation below is either
          multiplying by a fraction or dividing to find one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              X% of Y
            </div>
            <div className="font-mono text-sm">result = (X ÷ 100) × Y</div>
            <p className="mt-2 text-xs text-muted-foreground">15% of 200 = 0.15 × 200 = 30</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              X is what percent of Y
            </div>
            <div className="font-mono text-sm">result % = (X ÷ Y) × 100</div>
            <p className="mt-2 text-xs text-muted-foreground">25 out of 200 = 25 ÷ 200 × 100 = 12.5%</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Percentage change
            </div>
            <div className="font-mono text-sm">change % = ((Y − X) ÷ X) × 100</div>
            <p className="mt-2 text-xs text-muted-foreground">80 → 100 = (20 ÷ 80) × 100 = 25% increase</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Increase / decrease by X%
            </div>
            <div className="font-mono text-sm">result = Y × (1 ± X ÷ 100)</div>
            <p className="mt-2 text-xs text-muted-foreground">250 increased by 20% = 250 × 1.20 = 300</p>
          </div>
        </div>
      </section>

      <AdZone id="percentage-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Pick the tab that matches your question — X% of Y, X is what percent of Y, percentage change, or increase/decrease.",
          "Type your two numbers into the fields. Results update instantly as you type.",
          "Read the highlighted result, plus the formula used underneath it.",
        ]}
      />

      <ToolSeoContent
        title="Percentage Calculator — Percentage Increase, Percentage Change & Percent of a Number"
        description="Free online percentage calculator with four modes: percentage of a number calculator, X is what percent of Y, percentage change calculator, and percentage increase or decrease calculator. Instant results, no signup."
        body={[
          "Skycally's Percentage Calculator answers the four percentage questions people actually search for, each on its own tab. Use the percentage of a number calculator to find what 15% of 200 is, the reverse mode to find what percent 25 is of 200, the percentage change calculator to measure the difference between an old and a new value, and the percentage increase calculator to add or subtract a percentage from any number. Every result recalculates as you type — there is no calculate button and nothing to submit.",
          "The percentage change tab is the one most people are looking for when they search for a percentage increase calculator. Enter the original value and the new value and the tool shows the change as a percentage, colour-coded green with an up arrow for an increase and red with a down arrow for a decrease, so you never have to work out the sign yourself. This is the calculation behind price rises, salary bumps, exam score improvements, weight loss, traffic growth and year-over-year revenue comparisons.",
          "The increase and decrease tab works the other way round: you already know the percentage and want the resulting number. Toggle between increase and decrease and the tool multiplies your starting number by 1 plus or minus the percentage — useful for adding VAT or sales tax, applying a discount, marking up a wholesale price, or projecting next year's budget after a fixed percentage raise.",
          "Everything runs in your browser using plain arithmetic. Nothing you type is uploaded, saved or logged, there is no signup, and the tool works the same on a phone as it does on a desktop. If you need related maths, the Margin Calculator handles pricing margins and markup, and the Tip Calculator handles bills and splitting.",
        ]}
        faqs={[
          {
            question: "How do I calculate percentage increase?",
            answer:
              "Subtract the original value from the new value, divide by the original value, then multiply by 100. Going from 80 to 100: (100 − 80) ÷ 80 × 100 = 25% increase. Use the 'percentage change' tab and it does this for you, showing a green up arrow for an increase.",
          },
          {
            question: "What is X percent of Y?",
            answer:
              "Divide the percentage by 100 and multiply by the number. 15% of 200 is 0.15 × 200 = 30. The first tab of the calculator does exactly this as you type.",
          },
          {
            question: "How do I calculate what percent one number is of another?",
            answer:
              "Divide the part by the whole and multiply by 100. 25 out of 200 is 25 ÷ 200 × 100 = 12.5%. Use the 'X is what percent of Y' tab.",
          },
          {
            question: "How do I calculate percentage decrease?",
            answer:
              "Use the same formula as percentage increase: ((new − original) ÷ original) × 100. A negative answer means a decrease. Going from 200 to 150: (150 − 200) ÷ 200 × 100 = −25%, shown as a 25% decrease with a red down arrow.",
          },
          {
            question: "How do I add 20% to a number?",
            answer:
              "Multiply by 1.20. 250 increased by 20% is 250 × 1.20 = 300. Use the 'increase / decrease' tab with Increase selected — handy for adding tax or a markup.",
          },
          {
            question: "How do I take 30% off a price?",
            answer:
              "Multiply by 0.70 (that is 1 − 30 ÷ 100). A $80 item with 30% off costs 80 × 0.70 = $56. Select Decrease on the 'increase / decrease' tab.",
          },
          {
            question: "Why does the percentage change calculator need a non-zero original value?",
            answer:
              "Percentage change divides by the original value, and dividing by zero is undefined. If your starting value is 0 there is no meaningful percentage change — any increase from zero is mathematically infinite.",
          },
          {
            question: "Is this percentage calculator free and private?",
            answer:
              "Yes. It is free with no signup, and all the maths runs locally in your browser. Nothing you enter is sent to a server, stored or logged.",
          },
        ]}
      />

      <RelatedTools currentSlug="percentage-calculator" />
    </ToolPageShell>
  );
}
