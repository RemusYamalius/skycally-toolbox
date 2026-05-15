import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/sleep-calculator")({
  head: () => buildToolMeta(toolBySlug("sleep-calculator", tools)),
  component: SleepCalculator,
});

const FALL_ASLEEP_MIN = 14;
const CYCLE_MIN = 90;

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseTime(value: string): Date | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function ResultGrid({ base, mode }: { base: Date; mode: "wake" | "sleep" }) {
  const items = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const cycles = i + 1;
      const offset = (mode === "wake" ? -1 : 1) * (cycles * CYCLE_MIN + FALL_ASLEEP_MIN);
      const d = new Date(base.getTime() + offset * 60_000);
      return { cycles, time: d, hours: (cycles * CYCLE_MIN) / 60 };
    });
  }, [base, mode]);

  const recommended = new Set([5, 6]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 mt-6">
      {items.map((it) => {
        const isRec = recommended.has(it.cycles);
        return (
          <div
            key={it.cycles}
            className={`rounded-xl border p-4 transition ${
              isRec ? "border-[var(--green-brand)] bg-[color-mix(in_oklab,var(--green-brand)_10%,transparent)]" : "border-border bg-card"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <div className="font-display text-2xl font-bold">{fmt(it.time)}</div>
              {isRec && <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--green-brand)]">Recommended</span>}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {it.cycles} {it.cycles === 1 ? "cycle" : "cycles"} · {it.hours}h sleep
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SleepCalculator() {
  const tool = toolBySlug("sleep-calculator", tools);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");

  const wakeBase = parseTime(wakeTime);
  const sleepBase = parseTime(sleepTime);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <Tabs defaultValue="wake" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="wake"><Sun className="w-4 h-4 mr-2" /> Wake up at</TabsTrigger>
          <TabsTrigger value="sleep"><Moon className="w-4 h-4 mr-2" /> Going to sleep at</TabsTrigger>
        </TabsList>

        <TabsContent value="wake" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-medium mb-2">I want to wake up at</label>
            <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="max-w-[180px] text-lg" />
            <p className="mt-3 text-xs text-muted-foreground">To wake up feeling refreshed at {fmt(wakeBase ?? new Date())}, you should try to fall asleep at one of these times:</p>
            {wakeBase && <ResultGrid base={wakeBase} mode="wake" />}
          </div>
        </TabsContent>

        <TabsContent value="sleep" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-medium mb-2">I'm going to sleep at</label>
            <Input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="max-w-[180px] text-lg" />
            <p className="mt-3 text-xs text-muted-foreground">If you head to bed at {fmt(sleepBase ?? new Date())}, you should try to wake up at one of these times:</p>
            {sleepBase && <ResultGrid base={sleepBase} mode="sleep" />}
          </div>
        </TabsContent>
      </Tabs>

      <HowToUse steps={[
        "Pick whether you want to set a wake-up time or a bedtime",
        "Enter the time using the time picker",
        "Choose one of the recommended times based on 90-minute sleep cycles",
      ]} />

      <ToolSeoContent
        title="Sleep Calculator — Find the Best Bedtime & Wake Time"
        description="Free sleep cycle calculator that recommends the best times to fall asleep or wake up based on 90-minute REM cycles."
        body={[
          "Skycally's Sleep Calculator helps you wake up feeling refreshed instead of groggy. Sleep happens in roughly 90-minute cycles, and waking at the end of a cycle leaves you feeling far more rested than waking in the middle of deep sleep. Just enter the time you need to wake up — or the time you plan to head to bed — and the tool will instantly suggest the best times to do the other.",
          "We add a 14-minute buffer for the average time it takes to fall asleep, then walk forward or backward in 90-minute steps. The result is a list of times that align with the natural end of a sleep cycle. Aim for 5 to 6 full cycles (about 7.5 to 9 hours) for the best results, though 4 cycles can work in a pinch.",
          "Everything runs in your browser — no signup, no data collected. Use it nightly to dial in a consistent schedule, plan around early flights, or help kids and shift workers get the most out of every hour of rest.",
        ]}
        faqs={[
          { question: "How does the sleep cycle calculation work?", answer: "Each sleep cycle lasts about 90 minutes. We add a 14-minute fall-asleep buffer to your input and then count complete cycles forward or backward to suggest times that align with the end of a cycle." },
          { question: "How many cycles should I aim for?", answer: "Most adults feel best with 5–6 cycles (7.5–9 hours). 4 cycles (6 hours) can work occasionally but isn't ideal long term." },
          { question: "Why do I feel groggy even after 8 hours?", answer: "You may have woken up in the middle of a deep sleep stage. Aligning your wake time to the end of a cycle usually helps reduce sleep inertia." },
          { question: "Is the 90-minute cycle exact for everyone?", answer: "No — cycles vary from 80 to 110 minutes between people. The 90-minute average is a useful approximation that works well for most adults." },
        ]}
      />

      <RelatedTools currentSlug="sleep-calculator" />
    </ToolPageShell>
  );
}
