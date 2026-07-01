import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Loader2,
  Copy,
  FileDown,
  RefreshCw,
  AlertCircle,
  User,
  Briefcase,
  Wrench,
  Settings2,
} from "lucide-react";
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

// ⚠️ No createServerFn, no @/server/* imports — direct client fetch only
// (same pattern as ai-cover-letter-generator to avoid parseAst build errors)

export const Route = createFileRoute("/tools/ai-resume-builder")({
  head: () => buildToolMeta(toolBySlug("ai-resume-builder", tools)),
  component: AiResumeBuilder,
});

type Tone = "professional" | "creative" | "executive" | "technical";
type LengthOpt = "concise" | "standard" | "detailed";
type LanguageOpt = "english" | "french" | "spanish" | "german" | "arabic";

interface FormState {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  yearsExperience: string;
  industry: string;
  skills: string;
  experience: string;
  education: string;
  certifications: string;
  languages: string;
  jobDescription: string;
  tone: Tone;
  length: LengthOpt;
  language: LanguageOpt;
}

const DEFAULTS: FormState = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  website: "",
  summary: "",
  yearsExperience: "",
  industry: "",
  skills: "",
  experience: "",
  education: "",
  certifications: "",
  languages: "",
  jobDescription: "",
  tone: "professional",
  length: "standard",
  language: "english",
};

const STORAGE_KEY = "ai-resume-builder-inputs";
const DEBOUNCE_MS = 500;

const LENGTH_LABEL: Record<LengthOpt, string> = {
  concise: "concise one-page",
  standard: "standard one-to-two-page",
  detailed: "detailed two-page",
};

const LANGUAGE_LABEL: Record<LanguageOpt, string> = {
  english: "English",
  french: "French",
  spanish: "Spanish",
  german: "German",
  arabic: "Arabic",
};

const SYSTEM_PROMPT = `You are an expert resume writer and career coach with 15 years of experience helping candidates land jobs at top companies. You write resumes that:
- Pass ATS (Applicant Tracking Systems) by naturally incorporating keywords from the job description
- Open with a powerful professional summary that immediately communicates value
- Use strong action verbs (Led, Built, Increased, Reduced, Shipped, Managed, Designed, Implemented)
- Quantify achievements wherever possible (%, $, numbers, scale)
- Are tailored to the specific role and industry
- Follow a clean, scannable structure: Summary -> Experience -> Skills -> Education -> Certifications
- Sound human and specific, never generic or templated
- Never invent credentials, companies, or achievements not provided by the user
Output the resume as clean plain text with clear section headers (use === or --- separators), ready to copy or save. No markdown, no asterisks, no bullet symbols other than simple dashes.`;

function buildPrompt(form: FormState): string {
  const lines: string[] = [
    `Write a ${LENGTH_LABEL[form.length]} resume in ${LANGUAGE_LABEL[form.language]} with a ${form.tone} tone.`,
    `Full name: ${form.fullName}`,
    `Target role: ${form.jobTitle}`,
    `Email: ${form.email}`,
  ];
  if (form.phone) lines.push(`Phone: ${form.phone}`);
  if (form.location) lines.push(`Location: ${form.location}`);
  if (form.linkedin) lines.push(`LinkedIn: ${form.linkedin}`);
  if (form.website) lines.push(`Website/Portfolio: ${form.website}`);
  if (form.yearsExperience) lines.push(`Years of experience: ${form.yearsExperience}`);
  if (form.industry) lines.push(`Industry/Field: ${form.industry}`);
  if (form.summary) lines.push(`Professional summary (refine this): ${form.summary}`);
  lines.push(`Key skills: ${form.skills}`);
  lines.push(`Work experience:\n${form.experience}`);
  if (form.education) lines.push(`Education: ${form.education}`);
  if (form.certifications) lines.push(`Certifications: ${form.certifications}`);
  if (form.languages) lines.push(`Languages: ${form.languages}`);
  if (form.jobDescription) lines.push(`Target job description (optimize for ATS):\n${form.jobDescription}`);
  lines.push("Output only the resume content. No preamble, no commentary.");
  return lines.join("\n");
}

// ─── Direct client-side AI call — no server function needed ─────────────────
async function callAI(form: FormState): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": (import.meta as any).env?.VITE_LOVABLE_API_KEY ?? "",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(form) },
      ],
    }),
  });
  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!res.ok) throw new Error("GENERATION_FAILED");
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const result = json.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("GENERATION_FAILED");
  return result;
}

function errorToMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMITED") return "Too many requests — please wait a moment and try again.";
  if (msg === "CREDITS_EXHAUSTED") return "AI credits exhausted — please try again later.";
  return "Something went wrong — please try again.";
}

const InternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
    {children}
  </a>
);

const SEO_BODY = [
  "Your resume is the single most important document in your job search — yet most people either use a generic template that looks identical to thousands of others, or spend hours trying to format one from scratch. Skycally's AI Resume Builder solves both problems instantly. Enter your experience, skills, and target role, and the AI writes a polished, ATS-friendly resume tailored to the specific job in seconds. No signup, no daily limits, no paywalls — unlimited generations, free forever.",
  "ATS (Applicant Tracking Systems) reject up to 75% of resumes before a human ever reads them — not because the candidate is unqualified, but because the resume lacks the right keywords and structure. Our AI reads the job description you paste and naturally weaves in the exact language recruiters and ATS systems look for, from specific technical skills to industry terminology. The result is a resume that clears the filter and lands on a recruiter's desk.",
  "A great resume is built on strong action verbs and quantified achievements. Instead of 'responsible for managing a team', the AI writes 'Led a cross-functional team of 8 engineers to deliver a platform handling 2M monthly active users'. It transforms the raw material you provide — your roles, responsibilities, and results — into compelling, specific language that communicates real value. The more detail you give, the stronger the output.",
  "Once generated, copy the resume to clipboard, download it as a plain .txt file for easy editing, or export directly to a formatted PDF ready to attach to any application. Hit Regenerate to get a fresh version from the same inputs — useful when applying to different roles with slightly different emphasis. Everything runs through the AI gateway in real time; your inputs are not stored on our servers.",
];

const SEO_FAQS = [
  {
    question: "Is this AI resume builder really free with no limits?",
    answer:
      "Yes. Unlike paid tools like Resume.io ($24/month), Rezi ($29/month), and Kickresume ($19/month), Skycally's AI Resume Builder is completely free with no daily generation limits and no account required. Generate as many versions as you need.",
  },
  {
    question: "Will this resume pass ATS screening?",
    answer:
      "Yes. The AI is specifically prompted to incorporate keywords and phrases from the job description you paste, which is exactly what ATS systems scan for. Paste the full job posting into the Target Job Description field for the most optimized result.",
  },
  {
    question: "How is this different from a resume template?",
    answer:
      "Templates give you a blank structure to fill in. This AI reads your actual experience, skills, and the job description, then writes tailored content — including a professional summary, achievement-focused bullet points, and ATS-optimized language — all specific to you and the role you're targeting.",
  },
  {
    question: "Can I use this for any industry or job level?",
    answer:
      "Yes. The AI adapts to the industry and seniority level you specify. Use the Tone selector to switch between Professional (most roles), Technical (engineering and data roles), Executive (senior leadership), or Creative (design, marketing, and media positions).",
  },
  {
    question: "Can I generate a resume in French, Spanish, Arabic, or German?",
    answer:
      "Yes. Select your target language from the Output Language dropdown and the entire resume — including section headers, action verbs, and phrasing — is written natively in that language, not translated after the fact.",
  },
  {
    question: "How do I make the output as strong as possible?",
    answer:
      "Provide as much detail as possible in the Work Experience field — include company names, your title, dates, team size, and specific results with numbers. The AI turns this raw material into polished bullet points. Paste the full job description for ATS optimization, and add certifications and languages to maximise completeness.",
  },
  {
    question: "Is my data stored or shared?",
    answer:
      "No. Your inputs are sent to the AI model to generate the resume and are not persisted on our servers. Form values are cached only in your own browser (localStorage) so you can return to them in the same session. Clear your browser data to remove them entirely.",
  },
  {
    question: "Can I edit the generated resume?",
    answer:
      "Absolutely. Download it as a .txt file and edit it in any text editor or word processor, or copy it directly into Google Docs or Microsoft Word for formatting. The AI provides the content and structure — you can then adjust wording, reorder sections, or add details before submitting.",
  },
];

function AiResumeBuilder() {
  const tool = toolBySlug("ai-resume-builder", tools);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [resume, setResume] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lastSubmitRef = useRef<number>(0);
  const formRef = useRef<FormState>(form);
  formRef.current = form;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setForm((p) => ({ ...p, ...(JSON.parse(raw) as Partial<FormState>) }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.fullName.trim().length > 0 &&
    form.jobTitle.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.skills.trim().length > 0 &&
    form.experience.trim().length > 0 &&
    !loading;

  const canSubmitRef = useRef(canSubmit);
  canSubmitRef.current = canSubmit;

  function runGenerate() {
    if (!canSubmitRef.current) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
    lastSubmitRef.current = now;
    setLoading(true);
    setError(null);
    callAI(formRef.current)
      .then((result) => {
        setResume(result);
      })
      .catch((err) => {
        setError(errorToMessage(err));
        setResume("");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runGenerate();
  }

  function handleCopy() {
    if (!resume) return;
    navigator.clipboard
      .writeText(resume)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* ignore */
      });
  }

  function fileSlug() {
    const name = form.fullName.trim().toLowerCase().replace(/\s+/g, "-") || "draft";
    const role = form.jobTitle.trim().toLowerCase().replace(/\s+/g, "-") || "resume";
    return `resume-${name}-${role}`;
  }

  function handleDownloadTxt() {
    if (!resume) return;
    const blob = new Blob([resume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSlug()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadPdf() {
    if (!resume) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("Times", "Normal");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(resume, maxWidth) as string[];
    let y = margin;
    const lineHeight = 16;
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    doc.save(`${fileSlug()}.pdf`);
  }

  const wordCount = resume ? resume.trim().split(/\s+/).length : 0;

  const SectionHeader = ({ icon: Icon, title }: { icon: typeof User; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ background: "color-mix(in oklch, var(--violet-brand) 18%, transparent)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--violet-brand)" }} />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
    </div>
  );

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
        {/* ── Form ── */}
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={handleSubmit}
          className="space-y-5"
          aria-busy={loading}
        >
          <fieldset disabled={loading} className="space-y-5">
            {/* Personal Info */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader icon={User} title="Personal Information" />
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
                    Target role <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="jobTitle"
                    required
                    value={form.jobTitle}
                    onChange={(e) => update("jobTitle", e.target.value)}
                    placeholder="Senior Frontend Developer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="jane@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+1 555 123 4567"
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="London, UK"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={form.linkedin}
                    onChange={(e) => update("linkedin", e.target.value)}
                    placeholder="linkedin.com/in/janedoe"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="website">Website / Portfolio</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="janedoe.dev"
                  />
                </div>
              </div>
            </div>

            {/* Professional Background */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader icon={Briefcase} title="Professional Background" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="summary">Professional summary</Label>
                  <Textarea
                    id="summary"
                    rows={3}
                    value={form.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    placeholder="A few sentences in your own words — the AI will refine it."
                  />
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
                    <Label htmlFor="industry">Industry / Field</Label>
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(e) => update("industry", e.target.value)}
                      placeholder="FinTech"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Skills & Experience */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader icon={Wrench} title="Skills & Experience" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="skills">
                    Key skills <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="skills"
                    required
                    rows={2}
                    value={form.skills}
                    onChange={(e) => update("skills", e.target.value)}
                    placeholder="React, TypeScript, design systems, user research, mentoring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="experience">
                    Work experience <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="experience"
                    required
                    rows={5}
                    value={form.experience}
                    onChange={(e) => update("experience", e.target.value)}
                    placeholder="Senior Developer at Acme (2021–present) — led team of 6, shipped platform to 2M users. Developer at Beta (2018–2021) — built billing system, cut churn 18%."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    rows={2}
                    value={form.education}
                    onChange={(e) => update("education", e.target.value)}
                    placeholder="BSc Computer Science, University of London, 2018"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="certifications">Certifications</Label>
                    <Textarea
                      id="certifications"
                      rows={2}
                      value={form.certifications}
                      onChange={(e) => update("certifications", e.target.value)}
                      placeholder="AWS Certified, Google Analytics"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="langs">Languages</Label>
                    <Textarea
                      id="langs"
                      rows={2}
                      value={form.languages}
                      onChange={(e) => update("languages", e.target.value)}
                      placeholder="English (native), French (B2)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader icon={Settings2} title="Preferences" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jobDescription">Target job description (for ATS optimization)</Label>
                  <Textarea
                    id="jobDescription"
                    rows={4}
                    value={form.jobDescription}
                    onChange={(e) => update("jobDescription", e.target.value)}
                    placeholder="Paste the full job posting here. The AI will mirror its keywords and requirements."
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tone">Tone</Label>
                    <select
                      id="tone"
                      value={form.tone}
                      onChange={(e) => update("tone", e.target.value as Tone)}
                      className={selectClass}
                    >
                      <option value="professional">Professional</option>
                      <option value="creative">Creative</option>
                      <option value="executive">Executive</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="length">Length</Label>
                    <select
                      id="length"
                      value={form.length}
                      onChange={(e) => update("length", e.target.value as LengthOpt)}
                      className={selectClass}
                    >
                      <option value="concise">Concise (1 page)</option>
                      <option value="standard">Standard (1–2 pages)</option>
                      <option value="detailed">Detailed (2 pages)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="language">Output language</Label>
                    <select
                      id="language"
                      value={form.language}
                      onChange={(e) => update("language", e.target.value as LanguageOpt)}
                      className={selectClass}
                    >
                      <option value="english">English</option>
                      <option value="french">French</option>
                      <option value="spanish">Spanish</option>
                      <option value="german">German</option>
                      <option value="arabic">Arabic</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={!canSubmit} className="min-h-11">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate resume
                </>
              )}
            </Button>
            {resume && (
              <Button type="button" variant="outline" onClick={runGenerate} disabled={loading} className="min-h-11">
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>
        </motion.form>

        {/* ── Output ── */}
        <section
          aria-live="polite"
          aria-busy={loading}
          aria-label="Generated resume"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 min-h-[320px] flex flex-col lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)]"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-lg font-semibold">Your resume</h2>
            {resume && !loading && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied ✓" : "Copy"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleDownloadTxt}>
                  <FileText className="h-4 w-4" />
                  .txt
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleDownloadPdf}>
                  <FileDown className="h-4 w-4" />
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
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className={`h-3 rounded bg-muted ${i % 3 === 0 ? "w-9/12" : i % 2 === 0 ? "w-11/12" : "w-full"}`}
                />
              ))}
            </div>
          )}

          {!loading && resume && (
            <motion.article
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed text-foreground/90 flex-1 overflow-auto"
            >
              {resume}
            </motion.article>
          )}

          {!loading && !resume && !error && (
            <p className="text-sm text-muted-foreground">
              Fill in your details and click <strong>Generate resume</strong>. Your personalised, ATS-optimized resume
              will appear here — ready to copy or download as PDF.
            </p>
          )}

          {resume && !loading && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground/70">
              <span>{wordCount} words</span>
              <span>✨ Generated by AI</span>
            </div>
          )}
        </section>
      </div>

      <AdZone id="ai-resume-builder-mid" size="728x90" />

      <HowToUse
        steps={[
          "Fill in your personal details, target role, and key skills — the more detail you provide, the stronger the output.",
          "Paste your work experience and optionally the job description for ATS keyword optimization.",
          "Generate your resume, then copy it or download as .txt or PDF — ready to submit.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Resume Builder — ATS-Optimized in Seconds"
        description="Build a professional, ATS-optimized resume for free using AI. No signup, no limits. Add your experience and skills, download as PDF. Supports 5 languages."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          Pair your resume with a tailored cover letter using our{" "}
          <InternalLink href="/tools/ai-cover-letter-generator">AI Cover Letter Generator</InternalLink> — create your
          complete application package in minutes.
        </p>
        <p>
          Stay energised through your job search with the{" "}
          <InternalLink href="/tools/calorie-calculator">Calorie Calculator</InternalLink> and make sure you walk into
          every interview rested using our <InternalLink href="/tools/sleep-calculator">Sleep Calculator</InternalLink>.
        </p>
      </section>

      <RelatedTools currentSlug="ai-resume-builder" />
    </ToolPageShell>
  );
}
