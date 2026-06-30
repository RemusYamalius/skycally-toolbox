import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileSignature, Loader2, Copy, FileDown, FileText, RefreshCw, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { generateCoverLetter } from "@/server/ai-cover-letter.functions";

export const Route = createFileRoute("/tools/ai-cover-letter-generator")({
  head: () => buildToolMeta(toolBySlug("ai-cover-letter-generator", tools)),
  component: AiCoverLetterGenerator,
});

type Tone = "professional" | "friendly" | "enthusiastic" | "formal";
type LengthOpt = "short" | "medium" | "long";
type LanguageOpt = "english" | "spanish" | "french" | "german" | "arabic";

interface FormState {
  fullName: string;
  jobTitle: string;
  companyName: string;
  hiringManager: string;
  yearsExperience: string;
  skills: string;
  achievements: string;
  tone: Tone;
  length: LengthOpt;
  language: LanguageOpt;
  jobDescription: string;
}

const DEFAULTS: FormState = {
  fullName: "",
  jobTitle: "",
  companyName: "",
  hiringManager: "",
  yearsExperience: "",
  skills: "",
  achievements: "",
  tone: "professional",
  length: "medium",
  language: "english",
  jobDescription: "",
};

const STORAGE_KEY = "ai-cover-letter-inputs";
const DEBOUNCE_MS = 500;

const InternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
    {children}
  </a>
);

function errorToMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMITED") return "Too many requests — please wait a moment and try again.";
  if (msg === "CREDITS_EXHAUSTED") return "AI credits exhausted — please try again later.";
  return "Something went wrong — please try again.";
}

function AiCoverLetterGenerator() {
  const tool = toolBySlug("ai-cover-letter-generator", tools);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [letter, setLetter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  // Restore inputs
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.fullName.trim().length > 0 &&
    form.jobTitle.trim().length > 0 &&
    form.companyName.trim().length > 0 &&
    !loading;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
    lastSubmitRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const yrs = form.yearsExperience.trim();
      const result = await generateCoverLetter({
        data: {
          fullName: form.fullName.trim(),
          jobTitle: form.jobTitle.trim(),
          companyName: form.companyName.trim(),
          hiringManager: form.hiringManager.trim(),
          yearsExperience: yrs ? Math.max(0, Math.min(60, Number(yrs) || 0)) : undefined,
          skills: form.skills.trim(),
          achievements: form.achievements.trim(),
          tone: form.tone,
          length: form.length,
          language: form.language,
          jobDescription: form.jobDescription.trim(),
        },
      });
      setLetter(result.letter);
    } catch (err) {
      setError(errorToMessage(err));
      setLetter("");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, form]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const copy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const downloadTxt = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${form.companyName.trim().toLowerCase().replace(/\s+/g, "-") || "draft"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!letter) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("Times", "Normal");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(letter, maxWidth);
    let y = margin;
    const lineHeight = 16;
    for (const line of lines as string[]) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    doc.save(`cover-letter-${form.companyName.trim().toLowerCase().replace(/\s+/g, "-") || "draft"}.pdf`);
  };

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
        {/* ── Form column ───────────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
          aria-busy={loading}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in oklch, var(--violet-brand) 18%, transparent)" }}
              aria-hidden="true"
            >
              <FileSignature className="h-5 w-5" style={{ color: "var(--violet-brand)" }} />
            </div>
            <h2 className="font-display text-lg font-semibold">Your details</h2>
          </div>

          <fieldset disabled={loading} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">
                  Job title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jobTitle"
                  required
                  value={form.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                  placeholder="Senior Product Designer"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">
                  Company name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  required
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  placeholder="Acme Inc."
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hiringManager">Hiring manager (optional)</Label>
                <Input
                  id="hiringManager"
                  value={form.hiringManager}
                  onChange={(e) => update("hiringManager", e.target.value)}
                  placeholder="Alex Johnson"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="yearsExperience">Years of experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  value={form.yearsExperience}
                  onChange={(e) => update("yearsExperience", e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value as Tone)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="length">Length</Label>
                <select
                  id="length"
                  value={form.length}
                  onChange={(e) => update("length", e.target.value as LengthOpt)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="short">Short (~150 words)</option>
                  <option value="medium">Medium (~250 words)</option>
                  <option value="long">Long (~400 words)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value as LanguageOpt)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="arabic">Arabic</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skills">Key skills</Label>
              <Textarea
                id="skills"
                rows={2}
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
                placeholder="React, design systems, user research, mentoring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="achievements">Notable achievements (optional)</Label>
              <Textarea
                id="achievements"
                rows={2}
                value={form.achievements}
                onChange={(e) => update("achievements", e.target.value)}
                placeholder="Shipped a redesign that lifted conversion 23%."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobDescription">Job description (optional)</Label>
              <Textarea
                id="jobDescription"
                rows={3}
                value={form.jobDescription}
                onChange={(e) => update("jobDescription", e.target.value)}
                placeholder="Paste the job posting for a more tailored letter."
              />
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={!canSubmit} className="min-h-11">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <FileSignature className="h-4 w-4" aria-hidden="true" />
                  Generate cover letter
                </>
              )}
            </Button>
            {letter && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void submit()}
                disabled={loading}
                className="min-h-11"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Regenerate
              </Button>
            )}
          </div>
        </motion.form>

        {/* ── Output column ─────────────────────────────────── */}
        <section
          aria-live="polite"
          aria-busy={loading}
          aria-label="Generated cover letter"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 min-h-[320px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Your cover letter</h2>
            {letter && !loading && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={copy} aria-label="Copy letter to clipboard">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={downloadTxt} aria-label="Download as .txt">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  .txt
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={downloadPdf} aria-label="Download as PDF">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  .pdf
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="space-y-2 animate-pulse" aria-hidden="true">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-11/12 rounded bg-muted" />
              <div className="h-3 w-10/12 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-9/12 rounded bg-muted" />
            </div>
          )}

          {!loading && letter && (
            <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 flex-1">
              {letter}
            </article>
          )}

          {!loading && !letter && !error && (
            <p className="text-sm text-muted-foreground">
              Fill in your details and click <strong>Generate cover letter</strong>. Your letter will appear here.
            </p>
          )}
        </section>
      </div>

      <AdZone id="ai-cover-letter-generator-mid" size="728x90" />

      <HowToUse
        steps={[
          "Enter your name, the role, and the company you're applying to.",
          "Pick a tone, length, and language — add skills or a job description for a tailored result.",
          "Generate, then copy or download the letter as .txt or PDF.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Cover Letter Generator — Personalised in Seconds"
        description="Generate a tailored, professional cover letter in seconds. Pick your tone, length, and language. Free, private, and ready to copy or download as PDF."
        body={[
          (
            <>
              A great cover letter still moves the needle in 2026 — recruiters scan it for fit, tone, and specifics that
              your résumé can't show on its own. This AI Cover Letter Generator turns a handful of structured fields
              (your name, the role, the company, your skills and achievements) into a polished, ready-to-send letter
              in your chosen language and tone. If you also need to polish the formatting or convert the final letter,
              you can paste it into our{" "}
              <InternalLink href="/tools/word-processor">Word Processor</InternalLink> or export to PDF with{" "}
              <InternalLink href="/tools/word-to-pdf">Word to PDF</InternalLink>.
            </>
          ) as unknown as string,
          (
            <>
              The best AI-written cover letters are still personalised. Paste the job description into the optional
              field to anchor the letter in the actual requirements, and list two or three concrete achievements with
              numbers — "lifted conversion 23%", "shipped to 40k users" — so the model has real material to work with.
              Generic outputs come from generic inputs.
            </>
          ) as unknown as string,
          (
            <>
              Interviews are a marathon, not a sprint. Once your application is out, keep the rest of your routine
              dialled in: our <InternalLink href="/tools/calorie-calculator">Calorie Calculator</InternalLink> helps you
              fuel for long study or interview-prep days, and the{" "}
              <InternalLink href="/tools/sleep-calculator">Sleep Calculator</InternalLink> makes sure you walk into the
              call rested.
            </>
          ) as unknown as string,
        ] as unknown as string[]}
        faqs={[
          {
            question: "Is this cover letter generator free?",
            answer:
              "Yes. The tool is free to use. Generation runs on Skycally's AI gateway and your inputs are only used to produce the letter — nothing is stored on our servers.",
          },
          {
            question: "Is my data stored or shared?",
            answer:
              "Your inputs are sent to the AI model to generate the letter and are not persisted on our servers. The form values you type are cached only in your own browser (localStorage) so you can come back later. Clear your browser data to remove them.",
          },
          {
            question: "How accurate or original is the output?",
            answer:
              "The model writes a unique letter for every request based on the fields you provide. Always read the letter before sending — verify names, dates, and any claims about your experience, and tweak phrasing so it sounds like you.",
          },
          {
            question: "Can I edit the result?",
            answer: ((
              <>
                Absolutely. Copy the letter, or download it as .txt or PDF, and edit freely. For richer formatting open
                it in our <InternalLink href="/tools/word-processor">Word Processor</InternalLink> and then export back
                to PDF.
              </>
            ) as unknown) as string,
          },
        ]}
      />

      <RelatedTools currentSlug="ai-cover-letter-generator" />
    </ToolPageShell>
  );
}
