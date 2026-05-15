import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/bmi-calculator")({
  head: () => buildToolMeta(toolBySlug("bmi-calculator", tools)),
  component: BmiCalculator,
});

function categorize(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "#3b82f6" };
  if (bmi < 25) return { label: "Normal", color: "var(--green-brand)" };
  if (bmi < 30) return { label: "Overweight", color: "#f59e0b" };
  return { label: "Obese", color: "#ef4444" };
}

function ScaleBar({ bmi }: { bmi: number }) {
  // Map BMI 10..40 to 0..100%
  const pct = Math.max(0, Math.min(100, ((bmi - 10) / 30) * 100));
  return (
    <div className="mt-5">
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #3b82f6 0%, #3b82f6 28%, var(--green-brand) 28%, var(--green-brand) 50%, #f59e0b 50%, #f59e0b 67%, #ef4444 67%, #ef4444 100%)" }}>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-medium">
        <span>10</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40+</span>
      </div>
    </div>
  );
}

function Result({ bmi }: { bmi: number | null }) {
  if (bmi === null) {
    return <p className="text-sm text-muted-foreground">Enter your details to see your BMI.</p>;
  }
  const cat = categorize(bmi);
  return (
    <>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Your BMI</div>
          <div className="font-display text-5xl font-extrabold mt-1">{bmi.toFixed(1)}</div>
        </div>
        <span
          className="px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: `color-mix(in oklab, ${cat.color} 18%, transparent)`, color: cat.color }}
        >
          {cat.label}
        </span>
      </div>
      <ScaleBar bmi={bmi} />
    </>
  );
}

function BmiCalculator() {
  const tool = toolBySlug("bmi-calculator", tools);
  const [kg, setKg] = useState("70");
  const [cm, setCm] = useState("175");
  const [lb, setLb] = useState("154");
  const [ft, setFt] = useState("5");
  const [inch, setInch] = useState("9");

  const metricBmi = (() => {
    const w = parseFloat(kg);
    const h = parseFloat(cm) / 100;
    if (!w || !h) return null;
    return w / (h * h);
  })();

  const imperialBmi = (() => {
    const w = parseFloat(lb);
    const totalInches = (parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0);
    if (!w || !totalInches) return null;
    return (w / (totalInches * totalInches)) * 703;
  })();

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <Tabs defaultValue="metric">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="metric">Metric</TabsTrigger>
          <TabsTrigger value="imperial">Imperial</TabsTrigger>
        </TabsList>

        <TabsContent value="metric" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                <Input type="number" min="0" value={kg} onChange={(e) => setKg(e.target.value)} className="text-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Height (cm)</label>
                <Input type="number" min="0" value={cm} onChange={(e) => setCm(e.target.value)} className="text-lg" />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <Result bmi={metricBmi} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="imperial" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Weight (lb)</label>
                <Input type="number" min="0" value={lb} onChange={(e) => setLb(e.target.value)} className="text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Height (ft)</label>
                  <Input type="number" min="0" value={ft} onChange={(e) => setFt(e.target.value)} className="text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Height (in)</label>
                  <Input type="number" min="0" max="11" value={inch} onChange={(e) => setInch(e.target.value)} className="text-lg" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <Result bmi={imperialBmi} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <HowToUse steps={[
        "Choose Metric (kg/cm) or Imperial (lb/ft+in)",
        "Enter your weight and height",
        "Read your BMI value, category and where you sit on the scale",
      ]} />

      <ToolSeoContent
        title="BMI Calculator — Body Mass Index in Metric & Imperial"
        description="Free BMI calculator that instantly tells you your Body Mass Index, category and where you fall on the healthy weight scale."
        body={[
          "Skycally's BMI Calculator computes your Body Mass Index from your weight and height in either metric or imperial units. BMI is a quick screening tool used by health professionals to estimate whether someone is underweight, at a healthy weight, overweight or obese, based on the relationship between mass and height.",
          "After you enter your numbers, the calculator shows your BMI to one decimal, classifies it using the standard WHO categories (Underweight <18.5, Normal 18.5–24.9, Overweight 25–29.9, Obese ≥30), and plots your position on a color-coded scale so you can see at a glance how close you are to neighboring categories.",
          "BMI is a useful starting point, but it doesn't account for muscle mass, bone density, age or body composition. Athletes and very muscular people often score 'overweight' despite being healthy. Treat the result as a guideline and talk to a healthcare professional for a complete assessment.",
        ]}
        faqs={[
          { question: "What is a healthy BMI?", answer: "The WHO considers a BMI of 18.5 to 24.9 as the normal/healthy range for most adults." },
          { question: "Is BMI accurate for athletes?", answer: "Not always. Muscle weighs more than fat, so very muscular people can have a high BMI without excess body fat." },
          { question: "Does BMI work for children?", answer: "No. Children and teens use age- and sex-specific BMI percentiles instead of the adult categories." },
          { question: "Is my data saved?", answer: "No. Everything is calculated in your browser and never sent anywhere." },
        ]}
      />

      <RelatedTools currentSlug="bmi-calculator" />
    </ToolPageShell>
  );
}
