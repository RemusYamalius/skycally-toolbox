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
  const pct = Math.max(0, Math.min(100, ((bmi - 10) / 30) * 100));
  return (
    <div className="mt-5">
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(to right, #3b82f6 0%, #3b82f6 28%, var(--green-brand) 28%, var(--green-brand) 50%, #f59e0b 50%, #f59e0b 67%, #ef4444 67%, #ef4444 100%)",
        }}
      >
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
  if (bmi === null) return <p className="text-sm text-muted-foreground">Enter your details to see your BMI.</p>;
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
                  <Input
                    type="number"
                    min="0"
                    max="11"
                    value={inch}
                    onChange={(e) => setInch(e.target.value)}
                    className="text-lg"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <Result bmi={imperialBmi} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <HowToUse
        steps={[
          "Choose Metric (kg/cm) or Imperial (lb/ft+in).",
          "Enter your weight and height.",
          "Read your BMI value, category and where you sit on the color scale.",
        ]}
      />

      <ToolSeoContent
        title="BMI Calculator — Body Mass Index, Metric & Imperial"
        description="Free BMI calculator. Enter your weight and height in metric or imperial units and instantly see your Body Mass Index, WHO category and color-coded scale position. No signup."
        body={[
          "BMI (Body Mass Index) is calculated by dividing your weight in kilograms by the square of your height in metres: BMI = kg ÷ m². In imperial units, the formula is BMI = (lb ÷ in²) × 703. The World Health Organization uses four standard categories: Underweight (below 18.5), Normal weight (18.5–24.9), Overweight (25–29.9), and Obese (30 and above).",
          "Skycally's BMI Calculator supports both metric and imperial inputs, shows your result to one decimal place, and plots your position on a color-coded scale so you can instantly see how close you are to the boundaries of each category. The calculation updates live as you type — no button to press.",
          "BMI is a useful screening tool but has important limitations. It does not measure body fat directly and does not account for muscle mass, bone density, age, sex, or ethnicity. Athletes and bodybuilders often score 'overweight' despite having very low body fat. Older adults may have a 'normal' BMI with high body fat. Always consult a healthcare professional for a complete assessment.",
          "BMI is best used as one data point alongside other measures rather than a standalone verdict on health. Waist circumference, body fat percentage, and overall fitness level often tell a more complete story than BMI alone. If you're tracking body composition as part of a broader health or fitness goal, pairing this calculator with our Calorie Calculator and Macro Calculator can help translate a BMI-based target into a practical daily eating plan.",
        ]}
        faqs={[
          {
            question: "What is a healthy BMI?",
            answer:
              "The WHO defines a healthy adult BMI as 18.5 to 24.9. Below 18.5 is underweight, 25–29.9 is overweight, and 30 or above is obese. These thresholds apply to most adults but may not be appropriate for all ethnicities — some health organizations use lower thresholds for South and East Asian populations.",
          },
          {
            question: "What is the BMI formula?",
            answer:
              "In metric: BMI = weight (kg) ÷ height (m)². In imperial: BMI = (weight (lb) ÷ height (in)²) × 703. For example, a person weighing 70 kg at 1.75 m has a BMI of 70 ÷ (1.75²) = 22.9.",
          },
          {
            question: "Is BMI accurate for athletes and muscular people?",
            answer:
              "No. Muscle is denser than fat, so heavily muscular people often score 'overweight' or even 'obese' on the BMI scale despite having very low body fat. For athletes, body composition measurements like DEXA scans or skinfold tests are more meaningful.",
          },
          {
            question: "Does BMI work for children and teens?",
            answer:
              "Standard BMI categories apply only to adults (20+). For children and teens, BMI is interpreted using age- and sex-specific percentile charts (BMI-for-age), since body composition changes significantly during development.",
          },
          {
            question: "Can I have a normal BMI but still be unhealthy?",
            answer:
              "Yes. 'Normal weight obesity' — a normal BMI with high body fat — is associated with metabolic risk. Conversely, some people with a slightly elevated BMI are metabolically healthy. BMI is a screening tool, not a diagnosis.",
          },
          {
            question: "How can I lower my BMI?",
            answer:
              "BMI decreases when you reduce weight (fat mass) relative to your height. A combination of caloric deficit diet and regular physical activity is the evidence-based approach. Consult a doctor or registered dietitian before making significant lifestyle changes.",
          },
          {
            question: "Is my data sent to a server?",
            answer:
              "No. All calculations run instantly in your browser. Your weight and height are never transmitted, stored, or logged anywhere.",
          },
          {
            question: "What is the difference between BMI and body fat percentage?",
            answer:
              "BMI is an indirect estimate based only on height and weight. Body fat percentage measures the actual proportion of fat in your body. A normal BMI person can have high body fat, and a high BMI person (like an athlete) can have low body fat. Body fat percentage requires measurements like DEXA, hydrostatic weighing, or skinfold calipers.",
          },
        ]}
      />

      <RelatedTools currentSlug="bmi-calculator" />
    </ToolPageShell>
  );
}
