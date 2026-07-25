import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Loader2,
  Copy,
  RefreshCw,
  AlertCircle,
  Send,
  UserPlus,
  HeartHandshake,
  TrendingUp,
  Briefcase,
  Star,
  Calendar,
  Sparkles,
} from "lucide-react";

import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
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
import { generateEmail } from "@/lib/ai-email-writer.functions";

const SLUG = "ai-email-writer";

export const Route = createFileRoute("/tools/ai-email-writer")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const base = buildToolMeta(tool);
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "AI Email Writer",
            description:
              "Free AI email writer. Professional emails in seconds across 8 categories — cold outreach, follow-ups, apologies, sales pitches, job applications and more. No signup, no daily limits.",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/ai-email-writer`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "8 email types: cold outreach, follow-up, apology, sales pitch, job application, thank-you, meeting request, complaint",
              "6 tone options and 3 length options",
              "5 languages: English, French, Spanish, Arabic, German",
              "Optional AI-generated subject line",
              "Copy to clipboard or open directly in your email client",
              "Free — no signup, no daily generation limits",
            ],
          }),
        },
      ],
    };
  },
  component: AiEmailWriter,
});

type EmailType =
  | "cold-outreach"
  | "follow-up"
  | "apology"
  | "sales-pitch"
  | "job-application"
  | "thank-you"
  | "meeting-request"
  | "complaint";

type Tone = "professional" | "friendly" | "formal" | "concise" | "persuasive" | "empathetic";

type LengthOpt = "short" | "standard" | "detailed";
type LanguageOpt = "english" | "french" | "spanish" | "arabic" | "german";

interface FormState {
  emailType: EmailType;
  yourName: string;
  yourRole: string;
  recipientName: string;
  recipientRole: string;
  keyPoints: string;
  context: string;
  tone: Tone;
  length: LengthOpt;
  language: LanguageOpt;
  includeSubject: boolean;
}

const DEFAULTS: FormState = {
  emailType: "cold-outreach",
  yourName: "",
  yourRole: "",
  recipientName: "",
  recipientRole: "",
  keyPoints: "",
  context: "",
  tone: "professional",
  length: "standard",
  language: "english",
  includeSubject: true,
};

const STORAGE_KEY = "ai-email-writer-inputs";
const DEBOUNCE_MS = 500;

const EMAIL_TYPES: Array<{
  id: EmailType;
  label: string;
  desc: string;
  Icon: typeof Mail;
}> = [
  { id: "cold-outreach", label: "Cold Outreach", desc: "First contact", Icon: UserPlus },
  { id: "follow-up", label: "Follow-Up", desc: "Nudge a reply", Icon: RefreshCw },
  { id: "apology", label: "Apology", desc: "Say sorry", Icon: HeartHandshake },
  { id: "sales-pitch", label: "Sales Pitch", desc: "Sell it", Icon: TrendingUp },
  { id: "job-application", label: "Job Application", desc: "Apply", Icon: Briefcase },
  { id: "thank-you", label: "Thank You", desc: "Say thanks", Icon: Star },
  { id: "meeting-request", label: "Meeting Request", desc: "Book time", Icon: Calendar },
  { id: "complaint", label: "Complaint", desc: "Raise an issue", Icon: AlertCircle },
];

function errorToMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMITED") return "Too many requests — please wait a moment and try again.";
  if (msg === "CREDITS_EXHAUSTED") return "AI credits exhausted — please try again later.";
  return "Something went wrong — please try again.";
}

function splitSubject(text: string): { subject: string; body: string } {
  const m = text.match(/^\s*Subject:\s*(.+?)\r?\n+([\s\S]*)$/i);
  if (m) return { subject: m[1].trim(), body: m[2].trim() };
  return { subject: "", body: text };
}

const SEO_BODY = [
  "Writing the perfect professional email is one of the most time-consuming tasks in any workday — especially when the stakes are high. Skycally's AI Email Writer generates polished, context-aware emails in seconds across 8 categories: cold outreach, follow-ups, apologies, sales pitches, job applications, thank-you notes, meeting requests, and professional complaints. Fill in who you are, who you're writing to, and what you need to say — the AI handles structure, tone, and wording. No signup, no daily limits, free forever.",
  "The tone selector is where this tool separates itself from generic email templates. A cold outreach email to a startup founder needs a completely different voice than a formal complaint to a vendor or an empathetic apology to a client. Choose from Professional, Friendly & Warm, Formal & Authoritative, Concise & Direct, Persuasive, or Empathetic — and the AI adjusts not just word choice but structure, opening hook, and call to action to match.",
  "Subject lines account for over 47% of email open rates according to email marketing research. Toggle on subject line generation and the AI produces a compelling subject alongside the body — one that avoids spam trigger words and matches the tone and context of the email. For cold outreach and sales pitches in particular, a great subject line is often the difference between a reply and a delete.",
  "Every email is generated in real time and never stored on our servers. Regenerate as many times as needed to get a version that feels right — each call produces a unique result from the same inputs. The Copy button captures both the subject line and body together, ready to paste directly into Gmail, Outlook, or any email client. For multilingual teams and international outreach, the tool supports English, French, Spanish, Arabic, and German.",
];

const SEO_FAQS = [
  {
    question: "Is this AI email writer really free with no limits?",
    answer:
      "Yes. Unlike tools like Jasper, Copy.ai, and Lavender that cap free users at 5–10 generations per day, Skycally's AI Email Writer is completely free with no daily generation limits and no account required. Generate as many emails as you need.",
  },
  {
    question: "What types of emails can I generate?",
    answer:
      "Eight email types are supported: cold outreach (first contact with a prospect), follow-up (chasing a previous email), apology (professional sorry), sales pitch (selling a product or service), job application (applying for a role), thank-you (expressing gratitude), meeting request (scheduling a call or meeting), and complaint (raising a professional issue).",
  },
  {
    question: "How do I write a good cold outreach email with AI?",
    answer:
      "Fill in your name and role, the recipient's name and company, and in the Key Points field explain specifically why you're reaching out and what value you offer them. The more specific and personal the context, the stronger the output. Avoid vague inputs like 'I want to introduce myself' — instead write 'I noticed they recently raised Series A and are hiring engineers — I want to offer UX audit services'.",
  },
  {
    question: "Can I generate emails in French, Spanish, Arabic, or German?",
    answer:
      "Yes. Select your target language from the Language dropdown and the entire email — including the subject line — is written natively in that language, not translated after the fact. This makes it suitable for international sales outreach and multilingual teams.",
  },
  {
    question: "Will the AI include a subject line?",
    answer:
      "Yes, if the Include Subject Line toggle is turned on (it is on by default). The subject line is generated alongside the body and is designed to match the tone and context of the email. You can copy both together with the Copy button.",
  },
  {
    question: "What tone should I choose for cold outreach?",
    answer:
      "For B2B cold outreach to senior professionals, Concise & Direct or Professional tend to get the best response rates — busy people appreciate brevity and clarity. Friendly & Warm works better for smaller companies and creative industries. Persuasive is effective for sales pitches where you need to overcome hesitation.",
  },
  {
    question: "How is this different from using ChatGPT to write emails?",
    answer:
      "This tool is purpose-built for professional emails — it has a structured input form that captures all the relevant context (sender, recipient, email type, tone, language, key points), a curated system prompt optimised specifically for email writing, and a streamlined output with one-click copy. No prompt engineering required.",
  },
  {
    question: "Is my email content stored or shared?",
    answer:
      "No. Your inputs are sent to the AI model to generate the email and are not persisted on our servers. Nothing you write in this tool is stored, logged, or used for training. The generated email exists only in your browser session.",
  },
];

function AiEmailWriter() {
  const tool = toolBySlug(SLUG, tools);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lastSubmitRef = useRef<number>(0);

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit = form.yourName.trim().length > 0 && form.keyPoints.trim().length > 0 && !loading;

  const canSubmitRef = useRef(canSubmit);
  canSubmitRef.current = canSubmit;
  const formRef = useRef(form);
  formRef.current = form;

  async function submit() {
    if (!canSubmitRef.current) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
    lastSubmitRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const f = formRef.current;
      const result = await generateEmail({
        data: {
          emailType: f.emailType,
          yourName: f.yourName.trim(),
          yourRole: f.yourRole.trim(),
          recipientName: f.recipientName.trim(),
          recipientRole: f.recipientRole.trim(),
          keyPoints: f.keyPoints.trim(),
          context: f.context.trim(),
          tone: f.tone,
          length: f.length,
          language: f.language,
          includeSubject: f.includeSubject,
        },
      });
      const { subject: s, body: b } = splitSubject(result.email);
      setSubject(s);
      setBody(b);
    } catch (err) {
      setError(errorToMessage(err));
      setSubject("");
      setBody("");
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  function copy() {
    if (!body) return;
    const text = subject ? `Subject: ${subject}\n\n${body}` : body;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* ignore */
      });
  }

  function openGmail() {
    if (!body) return;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  const wordCount = useMemo(() => (body ? body.trim().split(/\s+/).filter(Boolean).length : 0), [body]);

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      {/* Email type selector */}
      <div className="mb-6">
        <Label className="mb-3 block text-sm">Email type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EMAIL_TYPES.map(({ id, label, desc, Icon }) => {
            const active = form.emailType === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => update("emailType", id)}
                aria-pressed={active}
                aria-label={label}
                className={
                  "text-left rounded-xl border p-3 transition-colors " +
                  (active
                    ? "border-transparent bg-secondary/70 ring-2 ring-[color:var(--cyan-brand)]"
                    : "border-border bg-card hover:border-foreground/20")
                }
                style={
                  active
                    ? {
                        background: "color-mix(in oklch, var(--cyan-brand) 12%, var(--card))",
                      }
                    : undefined
                }
              >
                <Icon
                  className="h-5 w-5 mb-2"
                  style={{ color: active ? "var(--cyan-brand)" : undefined }}
                  aria-hidden="true"
                />
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
        {/* Form column */}
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
              style={{
                background: "color-mix(in oklch, var(--cyan-brand) 18%, transparent)",
              }}
              aria-hidden="true"
            >
              <Mail className="h-5 w-5" style={{ color: "var(--cyan-brand)" }} />
            </div>
            <h2 className="font-display text-lg font-semibold">Email details</h2>
          </div>

          <fieldset disabled={loading} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="yourName">
                  Your name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="yourName"
                  required
                  value={form.yourName}
                  onChange={(e) => update("yourName", e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yourRole">Your role / company</Label>
                <Input
                  id="yourRole"
                  value={form.yourRole}
                  onChange={(e) => update("yourRole", e.target.value)}
                  placeholder="Sales Manager at Acme"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">Recipient name</Label>
                <Input
                  id="recipientName"
                  value={form.recipientName}
                  onChange={(e) => update("recipientName", e.target.value)}
                  placeholder="Sarah"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientRole">Recipient role / company</Label>
                <Input
                  id="recipientRole"
                  value={form.recipientRole}
                  onChange={(e) => update("recipientRole", e.target.value)}
                  placeholder="CTO at Stripe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="keyPoints">
                Key points to include <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="keyPoints"
                required
                value={form.keyPoints}
                onChange={(e) => update("keyPoints", e.target.value)}
                placeholder="What do you want to say? Add bullet points or a few sentences."
                rows={4}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="context">Context / background</Label>
              <Textarea
                id="context"
                value={form.context}
                onChange={(e) => update("context", e.target.value)}
                placeholder="Any relevant context — previous interactions, shared connections, specific pain points"
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value as Tone)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly &amp; Warm</option>
                  <option value="formal">Formal &amp; Authoritative</option>
                  <option value="concise">Concise &amp; Direct</option>
                  <option value="persuasive">Persuasive</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value as LanguageOpt)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="english">English</option>
                  <option value="french">French</option>
                  <option value="spanish">Spanish</option>
                  <option value="arabic">Arabic</option>
                  <option value="german">German</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block">Length</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["short", "standard", "detailed"] as LengthOpt[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => update("length", opt)}
                    aria-pressed={form.length === opt}
                    className={
                      "rounded-md border px-3 py-2 text-xs capitalize transition-colors " +
                      (form.length === opt
                        ? "border-transparent bg-secondary ring-1 ring-[color:var(--cyan-brand)]"
                        : "border-border hover:border-foreground/20")
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.includeSubject}
                onChange={(e) => update("includeSubject", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Include subject line
            </label>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={!canSubmit} className="min-h-11">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Generate email
                </>
              )}
            </Button>
            {body && (
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

        {/* Output column */}
        <section
          aria-live="polite"
          aria-busy={loading}
          aria-label="Generated email"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 min-h-[320px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-lg font-semibold">Your email</h2>
            {body && !loading && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={copy} aria-label="Copy email to clipboard">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "Copied ✓" : "Copy"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={openGmail} aria-label="Open in email client">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Open in email
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
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className={`h-3 rounded bg-muted ${i % 3 === 0 ? "w-9/12" : i % 2 === 0 ? "w-11/12" : "w-full"}`}
                />
              ))}
            </div>
          )}

          {!loading && body && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {subject && (
                <div className="mb-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">Subject</span>
                  <span className="font-medium">{subject}</span>
                </div>
              )}
              <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{body}</article>
              <p className="mt-3 text-xs text-muted-foreground/70">{wordCount} words</p>
            </motion.div>
          )}

          {!loading && !body && !error && (
            <p className="text-sm text-muted-foreground">
              Pick an email type, fill in your details, and click <strong>Generate email</strong>. Your email will
              appear here — ready to copy or send.
            </p>
          )}

          {body && !loading && (
            <p className="mt-4 text-xs text-muted-foreground/60 text-right inline-flex items-center gap-1 justify-end">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Generated by AI
            </p>
          )}
        </section>
      </div>

      {/* Contextual internal links — moved here, right under the output */}
      {body && !loading && (
        <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
          <p>
            Writing a job application email? Pair it with our{" "}
            <Link
              to="/tools/ai-cover-letter-generator"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              AI Cover Letter Generator
            </Link>{" "}
            and{" "}
            <Link
              to="/tools/ai-resume-builder"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              AI Resume Builder
            </Link>{" "}
            for a complete application package.
          </p>
          <p>
            Sending invoices by email? Use our{" "}
            <Link
              to="/tools/invoice-generator"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Invoice Generator
            </Link>{" "}
            to create and send professional invoices directly to your clients.
          </p>
        </section>
      )}

      <AdZone id="ai-email-writer-mid" size="728x90" />

      <HowToUse
        steps={[
          "Select your email type — cold outreach, follow-up, sales pitch, apology, and more.",
          "Enter who you are, who you're writing to, and the key points you want to cover.",
          "Choose your tone and language, generate your email, then copy it directly to your email client.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Email Writer — Professional Emails in Seconds"
        description="Write professional emails instantly with AI. Cold outreach, follow-ups, apologies, sales pitches, job applications and more. No signup, no daily limits. Free forever."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}
