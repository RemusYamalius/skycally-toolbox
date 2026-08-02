import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/gpa-calculator")({
  head: () => buildToolMeta(toolBySlug("gpa-calculator", tools)),
  component: GpaCalculator,
});

const GRADES: { label: string; points: number }[] = [
  { label: "A+", points: 4.0 },
  { label: "A", points: 4.0 },
  { label: "A-", points: 3.7 },
  { label: "B+", points: 3.3 },
  { label: "B", points: 3.0 },
  { label: "B-", points: 2.7 },
  { label: "C+", points: 2.3 },
  { label: "C", points: 2.0 },
  { label: "C-", points: 1.7 },
  { label: "D+", points: 1.3 },
  { label: "D", points: 1.0 },
  { label: "D-", points: 0.7 },
  { label: "F", points: 0.0 },
];

function num(v: string): number | null {
  const cleaned = v.replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmtGpa(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function letterFor(gpa: number): string {
  const found = GRADES.find((g) => gpa >= g.points - 0.001 && g.label !== "A+");
  return found ? found.label : "F";
}

function band(gpa: number): { label: string; color: string } {
  if (gpa >= 3.7) return { label: "Dean's List", color: "var(--green-brand)" };
  if (gpa >= 3.0) return { label: "Good Standing", color: "var(--cyan-brand)" };
  if (gpa >= 2.0) return { label: "Satisfactory", color: "#f59e0b" };
  return { label: "Academic Probation Risk", color: "#ef4444" };
}

interface Course {
  id: number;
  name: string;
  grade: string;
  credits: string;
}

let nextId = 100;

function GpaCalculator() {
  const tool = toolBySlug("gpa-calculator", tools);

  const [courses, setCourses] = useState<Course[]>([
    { id: 1, name: "", grade: "A", credits: "3" },
    { id: 2, name: "", grade: "B+", credits: "3" },
    { id: 3, name: "", grade: "B-", credits: "3" },
  ]);

  function update(id: number, patch: Partial<Course>) {
    setCourses((prev: Course[]) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addCourse() {
    setCourses((prev: Course[]) => [...prev, { id: nextId++, name: "", grade: "A", credits: "3" }]);
  }
  function removeCourse(id: number) {
    setCourses((prev: Course[]) => (prev.length > 2 ? prev.filter((c) => c.id !== id) : prev));
  }

  const rows = courses
    .map((c) => {
      const cr = num(c.credits);
      const g = GRADES.find((x) => x.label === c.grade);
      return cr !== null && cr > 0 && g ? { points: g.points, credits: cr } : null;
    })
    .filter((r): r is { points: number; credits: number } => r !== null);

  const totalCredits = rows.reduce((s, r) => s + r.credits, 0);
  const gpa = rows.length >= 2 && totalCredits > 0 ? rows.reduce((s, r) => s + r.points * r.credits, 0) / totalCredits : null;
  const tier = band(gpa ?? 0);
  const barPct = gpa !== null ? Math.max(0, Math.min(100, (gpa / 4) * 100)) : 0;

  // Target GPA mode
  const [curGpa, setCurGpa] = useState("3.0");
  const [doneCr, setDoneCr] = useState("60");
  const [targetGpa, setTargetGpa] = useState("3.5");
  const [remCr, setRemCr] = useState("30");
  const cg = num(curGpa);
  const dc = num(doneCr);
  const tg = num(targetGpa);
  const rc = num(remCr);
  const alreadyThere = cg !== null && tg !== null && cg >= tg;
  const required =
    cg !== null && dc !== null && tg !== null && rc !== null && rc > 0
      ? (tg * (dc + rc) - cg * dc) / rc
      : null;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <Tabs defaultValue="calc">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="calc" className="text-xs sm:text-sm py-2">
            Calculate GPA
          </TabsTrigger>
          <TabsTrigger value="target" className="text-xs sm:text-sm py-2">
            Target GPA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calc" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 min-w-0">
              <h2 className="font-display text-lg font-bold mb-4">Your courses</h2>
              <div className="space-y-2">
                {courses.map((c, i) => (
                  <div
                    key={c.id}
                    className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-end gap-3 min-w-0 ${
                      i % 2 === 0 ? "bg-secondary/40" : "bg-secondary/10"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`name-${c.id}`} className="block text-xs font-medium mb-1.5 text-muted-foreground">
                        Course name
                      </label>
                      <Input
                        id={`name-${c.id}`}
                        value={c.name}
                        placeholder="e.g. Math 101"
                        onChange={(e) => update(c.id, { name: e.target.value })}
                        className="font-medium"
                      />
                    </div>
                    <div className="flex gap-3 items-end min-w-0">
                      <div className="w-[92px] shrink-0">
                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Grade</label>
                        <Select value={c.grade} onValueChange={(v) => update(c.id, { grade: v })}>
                          <SelectTrigger aria-label="Grade">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADES.map((g) => (
                              <SelectItem key={g.label} value={g.label}>
                                {g.label} ({g.points.toLocaleString("en-US", { minimumFractionDigits: 1 })})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-[86px] shrink-0">
                        <label htmlFor={`cr-${c.id}`} className="block text-xs font-medium mb-1.5 text-muted-foreground">
                          Credits
                        </label>
                        <Input
                          id={`cr-${c.id}`}
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={c.credits}
                          onChange={(e) => update(c.id, { credits: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove course ${i + 1}`}
                        onClick={() => removeCourse(c.id)}
                        disabled={courses.length <= 2}
                        className="mb-1 shrink-0 rounded-md p-2 text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addCourse} className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" aria-hidden="true" /> Add course
              </Button>
              {courses.length < 2 && (
                <p className="mt-3 text-sm text-muted-foreground">Add at least two courses to calculate a GPA.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--cyan-brand)_10%,transparent)] to-card p-5 flex flex-col justify-center min-w-0">
              <div className="text-sm text-muted-foreground">Your GPA</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-5xl font-extrabold break-all" style={{ color: gpa === null ? undefined : tier.color }}>
                  {fmtGpa(gpa)}
                </span>
                {gpa !== null && (
                  <span className="text-xl font-bold text-muted-foreground">{letterFor(gpa)}</span>
                )}
              </div>
              {gpa !== null && (
                <>
                  <div className="mt-4 h-3 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: "linear-gradient(90deg,#ef4444,#f59e0b,var(--cyan-brand),var(--green-brand))",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>0.00</span>
                    <span>4.00</span>
                  </div>
                  <div className="mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ background: `color-mix(in oklab, ${tier.color} 18%, transparent)`, color: tier.color }}>
                    {tier.label}
                  </div>
                </>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                Total credits: <span className="font-semibold text-foreground">{fmtNum(totalCredits)}</span>
              </div>
              <div className="mt-3 font-mono text-xs text-muted-foreground/80">
                GPA = Σ(grade points × credits) ÷ Σ(credits)
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="target" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 min-w-0">
              <h2 className="font-display text-lg font-bold">What GPA do I need?</h2>
              <div>
                <label htmlFor="cur-gpa" className="block text-sm font-medium mb-2">Current GPA</label>
                <Input id="cur-gpa" type="number" inputMode="decimal" step="any" value={curGpa} onChange={(e) => setCurGpa(e.target.value)} className="text-lg" />
              </div>
              <div>
                <label htmlFor="done-cr" className="block text-sm font-medium mb-2">Credits completed</label>
                <Input id="done-cr" type="number" inputMode="decimal" step="any" value={doneCr} onChange={(e) => setDoneCr(e.target.value)} className="text-lg" />
              </div>
              <div>
                <label htmlFor="target-gpa" className="block text-sm font-medium mb-2">Target GPA</label>
                <Input id="target-gpa" type="number" inputMode="decimal" step="any" value={targetGpa} onChange={(e) => setTargetGpa(e.target.value)} className="text-lg" />
              </div>
              <div>
                <label htmlFor="rem-cr" className="block text-sm font-medium mb-2">Credits remaining</label>
                <Input id="rem-cr" type="number" inputMode="decimal" step="any" value={remCr} onChange={(e) => setRemCr(e.target.value)} className="text-lg" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--cyan-brand)_10%,transparent)] to-card p-5 flex flex-col justify-center min-w-0">
              <div className="text-sm text-muted-foreground">Required GPA in your remaining credits</div>
              <div className="mt-2">
                <span
                  className="font-display text-5xl font-extrabold break-all"
                  style={{
                    color:
                      required === null
                        ? undefined
                        : required > 4
                          ? "#ef4444"
                          : required <= 0 || alreadyThere
                            ? "var(--green-brand)"
                            : "var(--cyan-brand)",
                  }}
                >
                  {required !== null && required > 0 ? fmtGpa(required) : required !== null ? "0.00" : "—"}
                </span>
              </div>

              {required !== null && required > 4 && (
                <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" style={{ color: "#ef4444" }}>
                  This target is not achievable with the remaining credits — {fmtGpa(required)} GPA required exceeds the
                  maximum 4.0. Try lowering the target or adding more credits.
                </p>
              )}
              {required !== null && (required <= 0 || alreadyThere) && (
                <p className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-sm" style={{ color: "var(--green-brand)" }}>
                  Your current GPA already exceeds your target — you&apos;re on track!
                </p>
              )}
              {required !== null && !alreadyThere && required > 0 && required <= 4 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Average {fmtGpa(required)} across your remaining {fmtNum(rc)} credits to finish with a{" "}
                  {fmtGpa(tg)} cumulative GPA.
                </p>
              )}

              <div className="mt-4 font-mono text-xs text-muted-foreground/80">
                required = (target × total credits − current × completed credits) ÷ remaining credits
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
        Planning to finance your degree? The{" "}
        <Link to="/tools/student-loan-calculator" className="underline underline-offset-4 hover:text-foreground">
          Student Loan Calculator
        </Link>{" "}
        shows your monthly payment and total interest across Standard, Graduated and IDR plans. Once you graduate, use
        the{" "}
        <Link to="/tools/paycheck-calculator" className="underline underline-offset-4 hover:text-foreground">
          Paycheck Calculator
        </Link>{" "}
        to estimate your take-home pay after taxes.
      </p>

      <AdZone id="gpa-calculator-mid" size="728x90" />

      <HowToUse
        steps={[
          "On the Calculate GPA tab, add a row for each course, pick its letter grade and enter the credit hours.",
          "Your GPA, letter equivalent, performance band and total credits update instantly — remove a course with the × button.",
          "Switch to Target GPA to enter your current GPA, credits done, target and credits left to see the average you need.",
        ]}
      />

      <ToolSeoContent
        title="GPA Calculator — Calculate GPA from Letter Grades & Find Your Target GPA"
        description="Free GPA calculator on a 4.0 scale. Convert letter grades to GPA with credit weighting, see your letter equivalent and academic standing, and use the target GPA calculator to find out what GPA you need in your remaining credits."
        body={[
          "Skycally's GPA Calculator turns a list of courses into a weighted grade point average on the standard American 4.0 scale. Add one row per class, choose the letter grade from A+ down to F, enter the credit hours, and the result recalculates as you type. Because the average is credit-weighted, a four-credit course counts more than a one-credit elective — which is exactly how registrars compute a cumulative GPA and why simply averaging letter grades gives the wrong number.",
          "The grade points used are the ones almost every US college publishes: A and A+ are 4.0, A- is 3.7, B+ is 3.3, B is 3.0, B- is 2.7, and so on down in 0.3 and 0.4 steps to D- at 0.7 and F at 0.0. Multiply each course's grade points by its credits, add those products together, and divide by the total credits attempted. Three three-credit courses graded A, B+ and B- give (4.0×3 + 3.3×3 + 2.7×3) ÷ 9 = 3.33.",
          "The Target GPA tab answers the question students actually search for: what GPA do I need to get to a 3.5? Enter your current cumulative GPA, the credits behind you, the GPA you want and the credits still ahead, and the tool solves for the average you must earn in those remaining credits. When that number lands above 4.0 the calculator says plainly that the target is not achievable with the credits left, and when your current GPA is already above the target it tells you that you are on track.",
          "Everything runs locally in your browser with plain arithmetic — nothing you type is uploaded, stored or logged, and there is no signup. Numbers are formatted in US English so results look identical on every device. If your school uses a weighted scale with extra points for honors or AP classes, add the bonus to the grade points yourself; this calculator uses the unweighted 4.0 scale that most colleges report on a transcript.",
        ]}
        faqs={[
          {
            question: "How do I calculate my GPA?",
            answer:
              "Multiply each course's grade points by its credit hours, add all those products, then divide by the total credits. For example (4.0×3 + 3.3×3 + 2.7×3) ÷ 9 = 3.33. The Calculate GPA tab does this automatically as you type.",
          },
          {
            question: "What GPA is an A?",
            answer:
              "An A is 4.0 on the standard unweighted scale, and A+ is also counted as 4.0 at most US colleges. An A- is 3.7. Straight A grades in every course give a perfect 4.00 GPA.",
          },
          {
            question: "What GPA do I need to get a 3.5?",
            answer:
              "Use the formula required = (target × total credits − current GPA × completed credits) ÷ remaining credits. With a 3.0 over 60 credits and 30 credits left, reaching a 3.5 needs (3.5×90 − 3.0×60) ÷ 30 = 4.5 — impossible, which is why the tool flags it as not achievable.",
          },
          {
            question: "Is a 3.0 GPA good?",
            answer:
              "A 3.0 is a solid B average and meets the minimum requirement for most graduate programs, scholarships and internships. This calculator labels 3.0-3.69 as Good Standing, 3.7 and above as Dean's List territory, and below 2.0 as academic probation risk.",
          },
          {
            question: "How many credits do I need to raise my GPA?",
            answer:
              "It depends on the gap. The more credits you have already completed, the more new credits it takes to move the average. Increase the credits remaining in the Target GPA tab until the required GPA drops to 4.0 or below to see the minimum workload that makes your goal possible.",
          },
          {
            question: "How do I convert a letter grade to GPA?",
            answer:
              "Use the standard mapping: A+/A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, D- = 0.7, F = 0.0. Each grade is shown with its points inside the grade dropdown.",
          },
          {
            question: "Does this calculator handle weighted or AP GPA?",
            answer:
              "It uses the unweighted 4.0 scale that colleges report on a transcript. If your high school adds a point for honors or AP courses, calculate that bonus separately — the credit weighting here still applies to any scale you feed it.",
          },
          {
            question: "Is this college GPA calculator free and private?",
            answer:
              "Yes. It is completely free with no signup, and every calculation runs in your browser. Nothing you enter is sent to a server, stored or logged.",
          },
        ]}
      />

      <RelatedTools currentSlug="gpa-calculator" />
    </ToolPageShell>
  );
}
