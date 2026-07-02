import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { Utensils, Timer, Volume2, VolumeX, Sparkles, RefreshCw } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/intermittent-fasting-calculator")({
  head: () => buildToolMeta(toolBySlug("intermittent-fasting-calculator", tools)),
  component: IntermittentFastingCalculator,
});

// ---- Types & constants ----

type Goal = "weight-loss" | "metabolic" | "longevity" | "muscle";
type Lifestyle = "early" | "night" | "shift" | "flexible";
type Experience = "beginner" | "intermediate" | "advanced";
type ExerciseTiming = "morning" | "midday" | "evening" | "none";

type ProtocolId = "12-12" | "14-10" | "16-8" | "18-6" | "20-4" | "23-1";

interface Protocol {
  id: ProtocolId;
  name: string;
  fastHours: number;
  eatHours: number;
  tagline: string;
}

const PROTOCOLS: Protocol[] = [
  { id: "12-12", name: "12:12", fastHours: 12, eatHours: 12, tagline: "Gentle circadian reset" },
  { id: "14-10", name: "14:10", fastHours: 14, eatHours: 10, tagline: "Beginner-friendly" },
  { id: "16-8", name: "16:8", fastHours: 16, eatHours: 8, tagline: "The classic" },
  { id: "18-6", name: "18:6", fastHours: 18, eatHours: 6, tagline: "Deeper fat adaptation" },
  { id: "20-4", name: "20:4 Warrior", fastHours: 20, eatHours: 4, tagline: "One large window" },
  { id: "23-1", name: "OMAD 23:1", fastHours: 23, eatHours: 1, tagline: "Advanced only" },
];

const STORAGE_KEY = "if-calc-state-v1";
const SOUND_KEY = "if-calc-sound";

const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;
const MS_PER_SEC = 1_000;

interface QuizState {
  goal: Goal | null;
  lifestyle: Lifestyle | null;
  experience: Experience | null;
  exercise: ExerciseTiming | null;
}

interface PersistedState {
  quiz: QuizState;
  protocol: ProtocolId | null;
  wakeTime: string;
}

const DEFAULT_STATE: PersistedState = {
  quiz: { goal: null, lifestyle: null, experience: null, exercise: null },
  protocol: null,
  wakeTime: "07:00",
};

// ---- Recommendation engine (pure) ----

function recommendProtocol(quiz: QuizState): { protocol: Protocol; rationale: string } {
  // Score each protocol
  const scores: Record<ProtocolId, number> = {
    "12-12": 0,
    "14-10": 0,
    "16-8": 0,
    "18-6": 0,
    "20-4": 0,
    "23-1": 0,
  };

  // Experience is the strongest gate
  if (quiz.experience === "beginner") {
    scores["12-12"] += 3;
    scores["14-10"] += 3;
    scores["16-8"] += 1;
  } else if (quiz.experience === "intermediate") {
    scores["14-10"] += 1;
    scores["16-8"] += 3;
    scores["18-6"] += 2;
  } else if (quiz.experience === "advanced") {
    scores["16-8"] += 1;
    scores["18-6"] += 3;
    scores["20-4"] += 3;
    scores["23-1"] += 2;
  }

  // Goal
  if (quiz.goal === "weight-loss") {
    scores["16-8"] += 2;
    scores["18-6"] += 2;
    scores["20-4"] += 1;
  } else if (quiz.goal === "metabolic") {
    scores["14-10"] += 2;
    scores["16-8"] += 2;
  } else if (quiz.goal === "longevity") {
    scores["16-8"] += 1;
    scores["18-6"] += 2;
    scores["20-4"] += 1;
  } else if (quiz.goal === "muscle") {
    scores["14-10"] += 2;
    scores["16-8"] += 1;
    // penalize very long fasts
    scores["20-4"] -= 2;
    scores["23-1"] -= 3;
  }

  // Lifestyle
  if (quiz.lifestyle === "shift") {
    scores["12-12"] += 2;
    scores["14-10"] += 1;
  } else if (quiz.lifestyle === "early") {
    scores["16-8"] += 1;
    scores["18-6"] += 1;
  } else if (quiz.lifestyle === "night") {
    scores["14-10"] += 1;
    scores["16-8"] += 1;
  }

  // Exercise timing — very long fasts are hard with morning training
  if (quiz.exercise === "morning") {
    scores["20-4"] -= 1;
    scores["23-1"] -= 2;
    scores["14-10"] += 1;
  } else if (quiz.exercise === "evening") {
    scores["16-8"] += 1;
    scores["18-6"] += 1;
  }

  let best: ProtocolId = "16-8";
  let bestScore = -Infinity;
  for (const p of PROTOCOLS) {
    if (scores[p.id] > bestScore) {
      bestScore = scores[p.id];
      best = p.id;
    }
  }
  const protocol = PROTOCOLS.find((p) => p.id === best)!;

  const parts: string[] = [];
  if (quiz.experience === "beginner") parts.push("you're new to fasting");
  else if (quiz.experience === "advanced") parts.push("you have advanced fasting experience");
  if (quiz.goal === "weight-loss") parts.push("your goal is weight loss");
  else if (quiz.goal === "muscle") parts.push("preserving muscle matters to you");
  else if (quiz.goal === "longevity") parts.push("longevity is a priority");
  else if (quiz.goal === "metabolic") parts.push("metabolic health is the focus");
  if (quiz.exercise === "morning") parts.push("you train in the morning");

  const rationale =
    parts.length > 0
      ? `Because ${parts.join(", ")}, ${protocol.name} strikes the right balance for you.`
      : `${protocol.name} is a solid, sustainable starting point.`;

  return { protocol, rationale };
}

// ---- Time math ----

function parseHHMM(v: string): { h: number; m: number } | null {
  if (!v) return null;
  const [hs, ms] = v.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function formatHM(totalMs: number): string {
  const s = Math.max(0, Math.floor(totalMs / MS_PER_SEC));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Eating window starts at wake + 1h (typical "break-fast" delay for tools like this)
// but for simplicity we set eating window to start at wake time.
function computeWindows(wakeTime: string, protocol: Protocol): { eatStart: Date; eatEnd: Date } {
  const parsed = parseHHMM(wakeTime) ?? { h: 7, m: 0 };
  const now = new Date();
  const eatStart = new Date(now);
  eatStart.setHours(parsed.h, parsed.m, 0, 0);
  const eatEnd = new Date(eatStart.getTime() + protocol.eatHours * MS_PER_HOUR);
  return { eatStart, eatEnd };
}

interface Phase {
  phase: "eating" | "fasting";
  msRemaining: number;
  progress: number; // 0..1 in current phase
  nextBoundary: Date;
}

function computePhase(now: Date, wakeTime: string, protocol: Protocol): Phase {
  const parsed = parseHHMM(wakeTime) ?? { h: 7, m: 0 };
  // Anchor eatStart to today
  const anchor = new Date(now);
  anchor.setHours(parsed.h, parsed.m, 0, 0);

  // We need the most recent eatStart <= now
  let eatStart = anchor;
  if (eatStart.getTime() > now.getTime()) {
    eatStart = new Date(eatStart.getTime() - 24 * MS_PER_HOUR);
  }
  const eatEnd = new Date(eatStart.getTime() + protocol.eatHours * MS_PER_HOUR);
  const nextEatStart = new Date(eatStart.getTime() + 24 * MS_PER_HOUR);

  if (now.getTime() < eatEnd.getTime()) {
    const total = protocol.eatHours * MS_PER_HOUR;
    const elapsed = now.getTime() - eatStart.getTime();
    return {
      phase: "eating",
      msRemaining: eatEnd.getTime() - now.getTime(),
      progress: Math.min(1, Math.max(0, elapsed / total)),
      nextBoundary: eatEnd,
    };
  }
  const total = protocol.fastHours * MS_PER_HOUR;
  const elapsed = now.getTime() - eatEnd.getTime();
  return {
    phase: "fasting",
    msRemaining: nextEatStart.getTime() - now.getTime(),
    progress: Math.min(1, Math.max(0, elapsed / total)),
    nextBoundary: nextEatStart,
  };
}

// ---- Sound (Web Audio) ----

function playBeep(enabled: boolean, ctxRef: { current: AudioContext | null }) {
  if (!enabled) return;
  try {
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctxRef.current = new Ctor();
    }
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore
  }
}

// ---- Component ----

const GOAL_OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: "weight-loss", label: "Weight loss", desc: "Reduce body fat" },
  { value: "metabolic", label: "Metabolic health", desc: "Better insulin sensitivity" },
  { value: "longevity", label: "Longevity", desc: "Cellular autophagy" },
  { value: "muscle", label: "Muscle retention", desc: "Keep lean mass" },
];

const LIFESTYLE_OPTIONS: { value: Lifestyle; label: string; desc: string }[] = [
  { value: "early", label: "Early riser", desc: "Up before 7am" },
  { value: "night", label: "Night owl", desc: "Late sleeper" },
  { value: "shift", label: "Shift worker", desc: "Irregular hours" },
  { value: "flexible", label: "Flexible", desc: "It varies" },
];

const EXPERIENCE_OPTIONS: { value: Experience; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "New to fasting" },
  { value: "intermediate", label: "Intermediate", desc: "Fasted 14–16h before" },
  { value: "advanced", label: "Advanced", desc: "Regular longer fasts" },
];

const EXERCISE_OPTIONS: { value: ExerciseTiming; label: string; desc: string }[] = [
  { value: "morning", label: "Morning", desc: "Before noon" },
  { value: "midday", label: "Midday", desc: "Around lunch" },
  { value: "evening", label: "Evening", desc: "After 5pm" },
  { value: "none", label: "None", desc: "Not currently" },
];

function loadState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as PersistedState;
    return { ...DEFAULT_STATE, ...parsed, quiz: { ...DEFAULT_STATE.quiz, ...parsed.quiz } };
  } catch {
    return DEFAULT_STATE;
  }
}

function loadSound(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_KEY) === "1";
}

function IntermittentFastingCalculator() {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPhaseRef = useRef<"eating" | "fasting" | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setState(loadState());
    setSoundOn(loadSound());
  }, []);

  // Persist state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    } catch {
      // ignore
    }
  }, [soundOn]);

  // Live tick every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), MS_PER_SEC);
    return () => window.clearInterval(id);
  }, []);

  const recommendation = useMemo(() => recommendProtocol(state.quiz), [state.quiz]);
  const activeProtocol = useMemo(() => {
    const id = state.protocol ?? recommendation.protocol.id;
    return PROTOCOLS.find((p) => p.id === id) ?? recommendation.protocol;
  }, [state.protocol, recommendation.protocol]);

  const phase = useMemo(
    () => computePhase(now, state.wakeTime, activeProtocol),
    [now, state.wakeTime, activeProtocol],
  );
  const windows = useMemo(
    () => computeWindows(state.wakeTime, activeProtocol),
    [state.wakeTime, activeProtocol],
  );

  // Beep on phase transition
  useEffect(() => {
    if (lastPhaseRef.current !== null && lastPhaseRef.current !== phase.phase) {
      playBeep(soundOn, audioCtxRef);
    }
    lastPhaseRef.current = phase.phase;
  }, [phase.phase, soundOn]);

  const quizComplete =
    state.quiz.goal && state.quiz.lifestyle && state.quiz.experience && state.quiz.exercise;

  function setQuiz<K extends keyof QuizState>(key: K, value: QuizState[K]) {
    setState((s) => ({ ...s, quiz: { ...s.quiz, [key]: value } }));
  }

  function resetAll() {
    setState(DEFAULT_STATE);
  }

  const brandCyan = "var(--cyan-brand)";
  const brandGreen = "var(--green-brand)";

  return (
    <ToolPageShell
      title="Intermittent Fasting Calculator"
      description="Find your ideal fasting schedule with a 4-question quiz. Live countdown timer, 6 proven protocols, and a personalized daily eating window."
      showFileDisclaimer={false}
    >
      {/* Quiz */}
      <section aria-labelledby="quiz-heading" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="quiz-heading" className="font-display text-2xl font-bold">
            Quick quiz
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            aria-label="Reset all answers"
            className="text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" /> Reset
          </Button>
        </div>

        <QuizQuestion
          legend="1. What's your main goal?"
          name="goal"
          value={state.quiz.goal}
          onChange={(v) => setQuiz("goal", v)}
          options={GOAL_OPTIONS}
        />
        <QuizQuestion
          legend="2. Which best describes your lifestyle?"
          name="lifestyle"
          value={state.quiz.lifestyle}
          onChange={(v) => setQuiz("lifestyle", v)}
          options={LIFESTYLE_OPTIONS}
        />
        <QuizQuestion
          legend="3. How much fasting experience do you have?"
          name="experience"
          value={state.quiz.experience}
          onChange={(v) => setQuiz("experience", v)}
          options={EXPERIENCE_OPTIONS}
        />
        <QuizQuestion
          legend="4. When do you usually exercise?"
          name="exercise"
          value={state.quiz.exercise}
          onChange={(v) => setQuiz("exercise", v)}
          options={EXERCISE_OPTIONS}
        />
      </section>

      {/* Recommendation */}
      <section
        aria-labelledby="rec-heading"
        className="mt-8 rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: "color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
          background: "color-mix(in oklab, var(--cyan-brand) 8%, transparent)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "color-mix(in oklab, var(--cyan-brand) 20%, transparent)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: brandCyan }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="rec-heading" className="font-display text-lg font-bold">
              {quizComplete ? "Your recommended protocol" : "Suggested starting point"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{recommendation.protocol.name}</span>{" "}
              — {recommendation.protocol.tagline}. {recommendation.rationale}
            </p>
            {!quizComplete && (
              <p className="mt-2 text-xs text-muted-foreground">
                Answer all 4 questions above for a personalized recommendation.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Protocol selector */}
      <section aria-labelledby="protocol-heading" className="mt-8">
        <h2 id="protocol-heading" className="font-display text-lg font-bold mb-3">
          Choose your schedule
        </h2>
        <div
          role="radiogroup"
          aria-label="Fasting protocol"
          className="flex flex-wrap gap-2"
        >
          {PROTOCOLS.map((p) => {
            const selected = activeProtocol.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setState((s) => ({ ...s, protocol: p.id }))}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  selected
                    ? "border-transparent text-background"
                    : "border-border bg-card hover:border-foreground/30 text-foreground"
                }`}
                style={
                  selected
                    ? { background: brandCyan, boxShadow: `0 0 0 1px ${brandCyan}` }
                    : undefined
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Schedule + Countdown */}
      <section aria-labelledby="schedule-heading" className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 id="schedule-heading" className="font-display text-lg font-bold flex items-center gap-2">
            <Utensils className="w-5 h-5" aria-hidden="true" /> Daily schedule
          </h2>
          <label htmlFor="wake-time" className="mt-4 block text-sm font-medium">
            Wake-up time
          </label>
          <Input
            id="wake-time"
            type="time"
            value={state.wakeTime}
            onChange={(e) => setState((s) => ({ ...s, wakeTime: e.target.value }))}
            className="mt-1.5 max-w-[180px] text-lg"
            aria-label="Wake-up time"
          />
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Eating window</span>
              <span className="font-medium text-foreground">
                {formatClock(windows.eatStart)} → {formatClock(windows.eatEnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fasting window</span>
              <span className="font-medium text-foreground">
                {formatClock(windows.eatEnd)} →{" "}
                {formatClock(new Date(windows.eatStart.getTime() + 24 * MS_PER_HOUR))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fast : Eat</span>
              <span className="font-medium text-foreground">
                {activeProtocol.fastHours}h : {activeProtocol.eatHours}h
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-5 -mx-1 overflow-x-auto pb-2">
            <div className="min-w-[560px] px-1">
              <Timeline eatHours={activeProtocol.eatHours} wakeTime={state.wakeTime} />
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Timer className="w-5 h-5" aria-hidden="true" /> Live countdown
            </h2>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Disable phase transition sound" : "Enable phase transition sound"}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {soundOn ? (
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              Sound {soundOn ? "on" : "off"}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <ProgressRing
              progress={phase.progress}
              color={phase.phase === "eating" ? brandGreen : brandCyan}
            />
            <div className="min-w-0">
              <div
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: phase.phase === "eating" ? brandGreen : brandCyan }}
              >
                {phase.phase === "eating" ? "Eating window" : "Fasting window"}
              </div>
              <div
                className="font-display text-3xl sm:text-4xl font-bold tabular-nums mt-0.5"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatHM(phase.msRemaining)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {phase.phase === "eating" ? "Until fast starts" : "Until eating window opens"} · at{" "}
                {formatClock(phase.nextBoundary)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AdZone id="intermittent-fasting-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Answer 4 quick questions about your goal, lifestyle, experience, and exercise timing.",
          "Get your personalized protocol recommendation — or choose any of the 6 fasting schedules.",
          "Set your wake-up time to build your daily eating window schedule and start the live countdown timer.",
        ]}
      />

      <ToolSeoContent
        title="Intermittent Fasting Calculator — Personalized Fasting Schedule"
        description="Free intermittent fasting calculator. Get a personalized protocol (12:12, 14:10, 16:8, 18:6, 20:4, OMAD) with live countdown timer and daily eating window. No signup, works in your browser."
        body={[
          "Skycally's Intermittent Fasting Calculator turns a short 4-question quiz into a personalized fasting schedule you can start today. Tell it your goal, lifestyle, experience level, and when you exercise, and it recommends one of six proven protocols — from a gentle 12:12 circadian reset to advanced OMAD (23:1) — with a clear rationale for why that window fits you.",
          "Once you pick a protocol and set your wake-up time, the calculator builds your daily eating and fasting windows and starts a live countdown timer. The timer updates every second, shows a progress ring for the current phase, and can optionally beep when you transition between eating and fasting. Every calculation runs 100% in your browser — no account, no data sent to a server, and your preferences persist locally between visits.",
          "Intermittent fasting is not one-size-fits-all. Beginners typically do best with 14:10 or 16:8, while advanced fasters may prefer 18:6 or 20:4. Morning exercisers usually need a shorter fasting window to fuel training; those chasing longevity and metabolic benefits often lean longer. The calculator weighs all these factors so you skip the guesswork and start with a schedule that fits your real life.",
        ]}
        faqs={[
          {
            question: "Which intermittent fasting schedule is best for beginners?",
            answer:
              "Most beginners do well with 14:10 or 16:8 — long enough to see metabolic benefits, short enough to fit real life. Start with 14:10 for the first 1–2 weeks, then extend to 16:8 if it feels sustainable.",
          },
          {
            question: "Can I exercise while fasting?",
            answer:
              "Yes. Low-to-moderate intensity training (walking, easy cycling, mobility) works well fasted. For heavy strength or high-intensity sessions, most people perform better training near the start or middle of their eating window.",
          },
          {
            question: "Does the timer keep running when the page is closed?",
            answer:
              "The countdown re-computes from your wake-up time and protocol every time you open the page, so you always see accurate remaining time — no background process needed.",
          },
          {
            question: "Is intermittent fasting safe for everyone?",
            answer:
              "Intermittent fasting is generally safe for healthy adults, but it is not recommended during pregnancy, breastfeeding, for people with a history of eating disorders, or those on medications that require food. Consult your doctor before starting.",
          },
        ]}
      />

      {/* Internal links */}
      <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          Combine your fasting schedule with precise nutrition using our{" "}
          <a
            href="/tools/calorie-calculator"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Calorie Calculator
          </a>{" "}
          — know exactly how much to eat during your window.
        </p>
        <p>
          Optimise your fasting hours by aligning them with your sleep schedule using the{" "}
          <a
            href="/tools/sleep-calculator"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Sleep Calculator
          </a>
          , and track your hydration during the fast with our{" "}
          <a
            href="/tools/water-intake-calculator"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Water Intake Calculator
          </a>
          .
        </p>
      </section>

      <RelatedTools currentSlug="intermittent-fasting-calculator" />
    </ToolPageShell>
  );
}

// ---- Sub-components ----

interface QuizOption<T extends string> {
  value: T;
  label: string;
  desc: string;
}

interface QuizQuestionProps<T extends string> {
  legend: string;
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: QuizOption<T>[];
}

function QuizQuestion<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: QuizQuestionProps<T>) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      <div
        role="radiogroup"
        aria-label={legend}
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          const id = `${name}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`cursor-pointer rounded-xl border p-3 transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background ${
                selected
                  ? "border-transparent"
                  : "border-border bg-card hover:border-foreground/30"
              }`}
              style={
                selected
                  ? {
                      background: "color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
                      borderColor: "var(--cyan-brand)",
                    }
                  : undefined
              }
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Timeline({ eatHours, wakeTime }: { eatHours: number; wakeTime: string }) {
  const parsed = parseHHMM(wakeTime) ?? { h: 7, m: 0 };
  const startHour = parsed.h + parsed.m / 60;
  // 24-hour bar starting at wake time
  const eatPct = (eatHours / 24) * 100;
  return (
    <div>
      <div
        className="relative h-8 w-full rounded-full overflow-hidden border border-border"
        style={{ background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)" }}
        aria-label={`Eating window is ${eatHours} hours out of 24`}
        role="img"
      >
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-background"
          style={{ width: `${eatPct}%`, background: "var(--green-brand)" }}
        >
          Eat {eatHours}h
        </div>
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider"
          style={{ width: `${100 - eatPct}%`, color: "var(--cyan-brand)" }}
        >
          Fast {24 - eatHours}h
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {[0, 6, 12, 18, 24].map((step) => {
          const hour = (startHour + step) % 24;
          const hh = Math.floor(hour);
          const mm = Math.round((hour - hh) * 60);
          const pad = (n: number) => String(n).padStart(2, "0");
          return <span key={step}>{`${pad(hh)}:${pad(mm)}`}</span>;
        })}
      </div>
    </div>
  );
}

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--border)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}
