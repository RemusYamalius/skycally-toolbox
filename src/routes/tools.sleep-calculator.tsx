import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Moon, Sun, Clock } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
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
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 mt-5">
      {items.map((it) => {
        const isRec = recommended.has(it.cycles);
        return (
          <div
            key={it.cycles}
            className={`rounded-xl border p-4 transition-all ${
              isRec
                ? "border-[var(--green-brand)] bg-[color-mix(in_oklab,var(--green-brand)_10%,transparent)] shadow-sm"
                : "border-border bg-card hover:border-foreground/20"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <div className="font-display text-2xl font-bold">{fmt(it.time)}</div>
              {isRec && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--green-brand)" }}
                >
                  ✓ Best
                </span>
              )}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {it.cycles} {it.cycles === 1 ? "cycle" : "cycles"} · {it.hours}h sleep
            </div>
            <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(it.cycles / 6) * 100}%`,
                  background: isRec ? "var(--green-brand)" : "var(--cyan-brand)",
                  opacity: isRec ? 1 : 0.5,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SleepCalculator() {
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");

  const wakeBase = parseTime(wakeTime);
  const sleepBase = parseTime(sleepTime);

  return (
    <ToolPageShell
      title="Sleep Calculator"
      description="Find the best bedtime or wake-up time based on 90-minute sleep cycles. Wake up refreshed every morning."
      showFileDisclaimer={false}
    >
      {/* Info banner */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 flex gap-3 mb-6">
        <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How it works: </span>
          Sleep happens in 90-minute cycles. Waking at the end of a cycle feels much better than waking mid-cycle. We
          add a 14-minute fall-asleep buffer and calculate the ideal times for you.
        </div>
      </div>

      <Tabs defaultValue="wake" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="wake">
            <Sun className="w-4 h-4 mr-2" aria-hidden="true" /> Wake up at
          </TabsTrigger>
          <TabsTrigger value="sleep">
            <Moon className="w-4 h-4 mr-2" aria-hidden="true" /> Going to sleep at
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wake" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-medium mb-2" htmlFor="wake-input">
              I need to wake up at
            </label>
            <Input
              id="wake-input"
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="max-w-[180px] text-lg"
            />
            {wakeBase && (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  To wake up refreshed at <strong className="text-foreground">{fmt(wakeBase)}</strong>, fall asleep at
                  one of these times:
                </p>
                <ResultGrid base={wakeBase} mode="wake" />
                <p className="mt-4 text-xs text-muted-foreground">
                  ✓ Best = 5–6 cycles (7.5–9 hours) · 4 cycles minimum recommended
                </p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sleep" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-medium mb-2" htmlFor="sleep-input">
              I'm going to sleep at
            </label>
            <Input
              id="sleep-input"
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className="max-w-[180px] text-lg"
            />
            {sleepBase && (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  If you sleep at <strong className="text-foreground">{fmt(sleepBase)}</strong>, these wake times align
                  with the end of a sleep cycle:
                </p>
                <ResultGrid base={sleepBase} mode="sleep" />
                <p className="mt-4 text-xs text-muted-foreground">
                  ✓ Best = 5–6 cycles (7.5–9 hours) · 4 cycles minimum recommended
                </p>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AdZone id="sleep-calculator-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose whether to set a wake-up time or a bedtime using the tabs.",
          "Enter your time — results appear instantly showing all 6 cycle options.",
          "Pick a time marked 'Best' (5–6 cycles) for the most restorative sleep.",
        ]}
      />

      <ToolSeoContent
        title="Sleep Calculator — Find the Best Bedtime & Wake-Up Time"
        description="Calculate the best time to sleep or wake up based on 90-minute sleep cycles. Free sleep cycle calculator — wake up refreshed every morning. No signup required."
        body={[
          "Skycally's Sleep Calculator finds the optimal bedtime or wake-up time based on your body's natural 90-minute sleep cycles. Enter the time you need to wake up or the time you plan to go to bed, and the calculator instantly shows all six possible cycle-aligned times — with the best options (5–6 complete cycles) clearly highlighted.",
          "Sleep is not a continuous state — it moves through repeating cycles of light sleep, deep sleep, and REM (rapid eye movement) stages. Each full cycle takes approximately 90 minutes for most adults. When your alarm interrupts a cycle in the middle of deep sleep, you experience sleep inertia — the groggy, disoriented feeling that makes mornings difficult. Timing your wake-up to the end of a cycle eliminates this effect.",
          "The calculator adds a 14-minute fall-asleep buffer — the average time it takes a rested adult to transition from wakefulness to sleep — before counting 90-minute intervals. This makes the suggested times accurate to real-world conditions rather than the theoretical moment you close your eyes. Six times are shown per mode, from a minimal 1.5 hours to a full 9 hours of sleep.",
          "Most adults perform best with 5 to 6 complete cycles per night — approximately 7.5 to 9 hours of sleep. Four cycles (6 hours) can work occasionally but leads to cumulative sleep debt over time. The calculator works for any schedule: standard routines, early flights, night shifts, nap planning, or helping children and teenagers establish consistent sleep patterns.",
        ]}
        faqs={[
          {
            question: "How does the sleep cycle calculation work?",
            answer:
              "Each sleep cycle lasts about 90 minutes. We add a 14-minute fall-asleep buffer to your input time and count complete cycles forward or backward to find times that align with the natural end of a cycle.",
          },
          {
            question: "How many sleep cycles should I aim for?",
            answer:
              "Most adults feel best with 5–6 full cycles (7.5–9 hours). Four cycles (6 hours) can work occasionally but isn't ideal long term. Less than 4 cycles leads to significant impairment.",
          },
          {
            question: "Why do I feel groggy even after 8 hours of sleep?",
            answer:
              "You may have woken up in the middle of deep sleep (N3 stage). Using this calculator to align your alarm with the end of a cycle typically eliminates morning grogginess.",
          },
          {
            question: "Is the 90-minute cycle the same for everyone?",
            answer:
              "Sleep cycles vary from approximately 80 to 110 minutes between individuals and even between nights for the same person. 90 minutes is a well-established average that works well for most adults.",
          },
          {
            question: "Can I use this for nap planning?",
            answer:
              "Yes. For a power nap, aim for 1 cycle (90 minutes) to wake up refreshed. Avoid 45–80 minute naps as these end mid-cycle and cause grogginess.",
          },
          {
            question: "What is sleep inertia?",
            answer:
              "Sleep inertia is the groggy, disoriented feeling caused by waking up mid-cycle during deep sleep. It can last 15–60 minutes and impairs cognitive function. Waking at the end of a cycle dramatically reduces or eliminates it.",
          },
          {
            question: "Does this work for children and teenagers?",
            answer:
              "The 90-minute cycle applies to all ages, though children and teenagers need more total sleep (9–11 hours for children, 8–10 hours for teens). Use the calculator with their target wake time to find an appropriate bedtime.",
          },
          {
            question: "What is the 14-minute fall-asleep buffer?",
            answer:
              "Research shows that the average healthy adult takes about 14 minutes to fall asleep (sleep onset latency). The calculator adds this buffer so that suggested times reflect when you should get into bed, not when you actually fall asleep.",
          },
        ]}
      />

      <RelatedTools currentSlug="sleep-calculator" />
    </ToolPageShell>
  );
}
