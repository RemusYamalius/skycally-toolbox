import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PenLine,
  CheckCircle2,
  RefreshCw,
  FileText,
  Copy,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { runWritingAssistant } from "@/lib/ai-writing-assistant.functions";

export const Route = createFileRoute("/tools/ai-writing-assistant")({
  head: () => buildToolMeta(toolBySlug("ai-writing-assistant", tools)),
  component: AiWritingAssistantPage,
});

const STORAGE_KEY = "ai-writing-assistant-state";
const DEBOUNCE_MS = 500;

type TabKey = "grammar" | "paraphrase" | "summarize";
type ParaphraseMode = "standard" | "fluency" | "formal" | "simple" | "creative" | "concise";
type SummaryLength = "short" | "medium" | "detailed";
type SummaryStyle = "paragraph" | "bullets" | "takeaways";

interface PersistedState {
  activeTab: TabKey;
  grammarInput: string;
  paraphraseInput: string;
  paraphraseMode: ParaphraseMode;
  summarizeInput: string;
  summaryLength: SummaryLength;
  summaryStyle: SummaryStyle;
}

const DEFAULTS: PersistedState = {
  activeTab: "grammar",
  grammarInput: "",
  paraphraseInput: "",
  paraphraseMode: "standard",
  summarizeInput: "",
  summaryLength: "medium",
  summaryStyle: "paragraph",
};

const PARAPHRASE_MODES: { id: ParaphraseMode; label: string; desc: string }[] = [
  { id: "standard", label: "Standard", desc: "Balanced rewrite" },
  { id: "fluency", label: "Fluency", desc: "Improve flow" },
  { id: "formal", label: "Formal", desc: "Professional tone" },
  { id: "simple", label: "Simple", desc: "Plain language" },
  { id: "creative", label: "Creative", desc: "Expressive & varied" },
  { id: "concise", label: "Concise", desc: "Shorter, tighter" },
];

const SUMMARY_STYLES: { id: SummaryStyle; label: string }[] = [
  { id: "paragraph", label: "Paragraph" },
  { id: "bullets", label: "Bullet points" },
  { id: "takeaways", label: "Key takeaways" },
];

function errorToMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMITED") return "Too many requests — please wait a moment and try again.";
  if (msg === "CREDITS_EXHAUSTED") return "AI credits exhausted — please try again later.";
  return "Something went wrong — please try again.";
}

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function splitGrammarOutput(raw: string): { corrected: string; changes: string[] } {
  const marker = /---\s*Changes\s*---/i;
  const m = raw.match(marker);
  if (!m || m.index === undefined) return { corrected: raw.trim(), changes: [] };
  const corrected = raw.slice(0, m.index).trim();
  const rest = raw.slice(m.index + m[0].length).trim();
  const changes = rest
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•\-\*\d\.\)\s]+/, "").trim())
    .filter((l) => l.length > 0);
  return { corrected, changes };
}

const SEO_BODY = [
  "Skycally's AI Writing Assistant combines three essential writing tools in one place: a grammar and spell checker that fixes errors and explains every change, a paraphraser with six distinct rewriting modes, and a text summarizer that condenses long documents into the length and format you need. Unlike Grammarly ($12/month) and QuillBot ($10/month) which limit free users to a handful of daily checks, every feature here is completely free with no daily generation limits and no account required.",
  "The grammar checker goes beyond simple spell-checking — it analyses sentence structure, punctuation, word choice, and style, then returns the corrected text alongside a clear list of every change made and why. This makes it a learning tool as much as a correction tool: seeing exactly what was changed helps writers understand and avoid the same mistakes in future drafts. Paste anything from a single sentence to a 5,000-character document and get a full correction in seconds.",
  "The paraphraser offers six rewriting modes to match every context: Standard for a balanced rewrite, Fluency to smooth out awkward phrasing, Formal for academic and professional writing, Simple to make complex text accessible, Creative for more expressive language, and Concise to tighten verbose drafts. Each mode produces a genuinely different rewrite — not just a synonym swap — making this tool useful for avoiding plagiarism, adapting tone, and improving clarity. Pair this with our AI Email Writer for complete professional communication.",
  "The summarizer handles texts up to 8,000 characters and produces summaries in three lengths (short, medium, or detailed) and three formats (flowing paragraphs, bullet points, or numbered key takeaways). Whether you are condensing a research paper, a news article, a meeting transcript, or a long email thread, the summary preserves the core meaning and structure of the original. Use it alongside our AI Resume Builder and AI Cover Letter Generator to build a complete AI-powered writing toolkit.",
];

const SEO_FAQS = [
  {
    question: "Is this grammar checker and paraphraser really free with no limits?",
    answer:
      "Yes. Unlike Grammarly which limits free users to basic grammar checks, and QuillBot which caps free paraphrases at 5 per day, Skycally's AI Writing Assistant is completely free with no daily generation limits and no account required. Use it as many times as you need.",
  },
  {
    question: "How does the grammar checker work?",
    answer:
      "Paste your text and click Check Grammar. The AI analyses grammar, spelling, punctuation, word choice, and style errors, then returns the fully corrected text alongside a list of every change made. Each change shows the original phrasing and the corrected version so you can learn from the corrections.",
  },
  {
    question: "What is the difference between the 6 paraphrasing modes?",
    answer:
      "Standard produces a balanced rewrite that preserves the original tone and length. Fluency improves readability and natural flow. Formal shifts the text to a professional or academic register. Simple uses plain language accessible to any reader. Creative produces more expressive and varied phrasing. Concise removes redundancy and tightens the text into a shorter version.",
  },
  {
    question: "Can I use this to avoid plagiarism?",
    answer:
      "Yes. The Paraphraser rewrites text in genuinely different phrasing rather than simple synonym substitution, which is effective for expressing ideas in your own words. However, always cite original sources in academic work — paraphrasing does not replace attribution.",
  },
  {
    question: "How long can the text be for each tool?",
    answer:
      "The grammar checker accepts up to 5,000 characters per submission. The paraphraser handles up to 3,000 characters. The summarizer accepts the longest input at up to 8,000 characters — suitable for full articles, long emails, and multi-section documents.",
  },
  {
    question: "What summary formats are available?",
    answer:
      "Three formats: Paragraph produces flowing prose that reads like a condensed version of the original. Bullet Points extracts the main ideas as a scannable list. Key Takeaways numbers the most important insights in a structured format — useful for meeting notes, research summaries, and executive briefings.",
  },
  {
    question: "Is my text stored or shared?",
    answer:
      "No. Your text is sent to the AI model to process your request and is not stored on our servers. Nothing you paste into this tool is logged, saved, or used for training. The results exist only in your browser session.",
  },
  {
    question: "Can I use this for academic writing?",
    answer:
      "Yes — with care. The grammar checker and paraphraser are widely used by students and researchers to improve clarity and expression. Always ensure paraphrased content represents your own understanding of the source material, and follow your institution's guidelines on AI tool usage in academic submissions.",
  },
];

const InternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
  >
    {children}
  </a>
);

function AiWritingAssistantPage() {
  const tool = toolBySlug("ai-writing-assistant", tools);

  const [state, setState] = useState<PersistedState>(DEFAULTS);
  const [grammarOutput, setGrammarOutput] = useState("");
  const [paraphraseOutput, setParaphraseOutput] = useState("");
  const [summaryOutput, setSummaryOutput] = useState("");

  const [loading, setLoading] = useState<TabKey | null>(null);
  const [error, setError] = useState<Record<TabKey, string | null>>({
    grammar: null,
    paraphrase: null,
    summarize: null,
  });
  const [copiedFlag, setCopiedFlag] = useState<TabKey | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const lastSubmitRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  function update<K extends keyof PersistedState>(k: K, v: PersistedState[K]) {
    setState((p) => ({ ...p, [k]: v }));
  }

  function setErr(tab: TabKey, msg: string | null) {
    setError((prev) => ({ ...prev, [tab]: msg }));
  }

  function debouncedOk(): boolean {
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return false;
    lastSubmitRef.current = now;
    return true;
  }

  function runGrammar() {
    const s = stateRef.current;
    const text = s.grammarInput.trim();
    if (!text || loading || !debouncedOk()) return;
    setLoading("grammar");
    setErr("grammar", null);
    runWritingAssistant({ data: { mode: "grammar", text } })
      .then((r) => {
        setGrammarOutput(r.result);
      })
      .catch((err) => {
        setErr("grammar", errorToMessage(err));
        setGrammarOutput("");
      })
      .finally(() => {
        setLoading(null);
      });
  }

  function runParaphrase() {
    const s = stateRef.current;
    const text = s.paraphraseInput.trim();
    if (!text || loading || !debouncedOk()) return;
    setLoading("paraphrase");
    setErr("paraphrase", null);
    runWritingAssistant({
      data: { mode: "paraphrase", text, paraphraseMode: s.paraphraseMode },
    })
      .then((r) => {
        setParaphraseOutput(r.result);
      })
      .catch((err) => {
        setErr("paraphrase", errorToMessage(err));
        setParaphraseOutput("");
      })
      .finally(() => {
        setLoading(null);
      });
  }

  function runSummarize() {
    const s = stateRef.current;
    const text = s.summarizeInput.trim();
    if (!text || loading || !debouncedOk()) return;
    setLoading("summarize");
    setErr("summarize", null);
    runWritingAssistant({
      data: {
        mode: "summarize",
        text,
        summaryLength: s.summaryLength,
        summaryStyle: s.summaryStyle,
      },
    })
      .then((r) => {
        setSummaryOutput(r.result);
      })
      .catch((err) => {
        setErr("summarize", errorToMessage(err));
        setSummaryOutput("");
      })
      .finally(() => {
        setLoading(null);
      });
  }

  function copy(text: string, tab: TabKey) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedFlag(tab);
        setTimeout(() => setCopiedFlag(null), 1500);
      })
      .catch(() => {
        /* ignore */
      });
  }

  const grammarParsed = grammarOutput ? splitGrammarOutput(grammarOutput) : null;

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <Tabs
        value={state.activeTab}
        onValueChange={(v) => update("activeTab", v as TabKey)}
        className="w-full"
      >
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="grammar" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Grammar Check
          </TabsTrigger>
          <TabsTrigger value="paraphrase" className="gap-1.5">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Paraphrase
          </TabsTrigger>
          <TabsTrigger value="summarize" className="gap-1.5">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Summarize
          </TabsTrigger>
        </TabsList>

        {/* ── Grammar tab ─────────────────────────────────────── */}
        <TabsContent value="grammar" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <InputPanel
              icon={<CheckCircle2 className="h-5 w-5" style={{ color: "var(--green-brand)" }} />}
              title="Your text"
              placeholder="Paste your text here — grammar, spelling, punctuation and style will be corrected."
              value={state.grammarInput}
              onChange={(v) => update("grammarInput", v)}
              maxChars={5000}
              disabled={loading !== null}
            />

            <OutputPanel
              title="Corrected text"
              busy={loading === "grammar"}
              error={error.grammar}
              hasContent={!!grammarParsed && !!grammarParsed.corrected}
              onCopy={() =>
                grammarParsed?.corrected && copy(grammarParsed.corrected, "grammar")
              }
              copied={copiedFlag === "grammar"}
              placeholder="Corrected text and a list of every change made will appear here."
            >
              {grammarParsed && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {grammarParsed.corrected}
                    </article>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground">
                      {countWords(grammarParsed.corrected)} words
                    </span>
                    <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground">
                      {grammarParsed.changes.length} change
                      {grammarParsed.changes.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {grammarParsed.changes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Changes</h3>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {grammarParsed.changes.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary shrink-0">•</span>
                            <span className="leading-relaxed">{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </OutputPanel>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={runGrammar}
              disabled={!state.grammarInput.trim() || loading !== null}
              className="min-w-[180px]"
            >
              {loading === "grammar" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Check Grammar
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ── Paraphrase tab ──────────────────────────────────── */}
        <TabsContent value="paraphrase" className="mt-6">
          <div className="mb-5">
            <Label className="text-sm font-medium mb-2 block">Rewrite mode</Label>
            <div className="flex flex-wrap gap-2">
              {PARAPHRASE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update("paraphraseMode", m.id)}
                  disabled={loading !== null}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50",
                    state.paraphraseMode === m.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-secondary/50",
                  )}
                  aria-pressed={state.paraphraseMode === m.id}
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InputPanel
              icon={<RefreshCw className="h-5 w-5" style={{ color: "var(--violet-brand)" }} />}
              title="Original text"
              placeholder="Paste text to paraphrase — up to 3,000 characters."
              value={state.paraphraseInput}
              onChange={(v) => update("paraphraseInput", v)}
              maxChars={3000}
              disabled={loading !== null}
            />

            <OutputPanel
              title="Paraphrased text"
              busy={loading === "paraphrase"}
              error={error.paraphrase}
              hasContent={!!paraphraseOutput}
              onCopy={() => copy(paraphraseOutput, "paraphrase")}
              copied={copiedFlag === "paraphrase"}
              placeholder="Your paraphrased text will appear here."
            >
              {paraphraseOutput && (
                <div className="space-y-4">
                  <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 rounded-lg border border-border bg-secondary/20 p-4">
                    {paraphraseOutput}
                  </article>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground">
                      Original: {countWords(state.paraphraseInput)} words → Paraphrased:{" "}
                      {countWords(paraphraseOutput)} words
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={runParaphrase}
                      disabled={loading !== null}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Regenerate
                    </Button>
                    <label className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showComparison}
                        onChange={(e) => setShowComparison(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      Show comparison
                    </label>
                  </div>
                </div>
              )}
            </OutputPanel>
          </div>

          {showComparison && paraphraseOutput && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Original
                </h4>
                <DiffText a={state.paraphraseInput} b={paraphraseOutput} side="original" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Paraphrased
                </h4>
                <DiffText a={state.paraphraseInput} b={paraphraseOutput} side="paraphrased" />
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={runParaphrase}
              disabled={!state.paraphraseInput.trim() || loading !== null}
              className="min-w-[180px]"
            >
              {loading === "paraphrase" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Paraphrase
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ── Summarize tab ───────────────────────────────────── */}
        <TabsContent value="summarize" className="mt-6">
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium mb-2 block">Summary length</Label>
              <RadioGroup
                value={state.summaryLength}
                onValueChange={(v) => update("summaryLength", v as SummaryLength)}
                className="flex flex-wrap gap-4"
              >
                {(
                  [
                    { id: "short", label: "Short (1-2 sentences)" },
                    { id: "medium", label: "Medium (1 paragraph)" },
                    { id: "detailed", label: "Detailed (3-4 paragraphs)" },
                  ] as { id: SummaryLength; label: string }[]
                ).map((o) => (
                  <label
                    key={o.id}
                    htmlFor={`sum-len-${o.id}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <RadioGroupItem id={`sum-len-${o.id}`} value={o.id} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Summary style</Label>
              <div className="flex flex-wrap gap-2">
                {SUMMARY_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => update("summaryStyle", s.id)}
                    disabled={loading !== null}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50",
                      state.summaryStyle === s.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary/50",
                    )}
                    aria-pressed={state.summaryStyle === s.id}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InputPanel
              icon={<FileText className="h-5 w-5" style={{ color: "var(--cyan-brand)" }} />}
              title="Long text"
              placeholder="Paste text to summarize — up to 8,000 characters."
              value={state.summarizeInput}
              onChange={(v) => update("summarizeInput", v)}
              maxChars={8000}
              disabled={loading !== null}
            />

            <OutputPanel
              title="Summary"
              busy={loading === "summarize"}
              error={error.summarize}
              hasContent={!!summaryOutput}
              onCopy={() => copy(summaryOutput, "summarize")}
              copied={copiedFlag === "summarize"}
              placeholder="Your summary will appear here."
            >
              {summaryOutput && (
                <div className="space-y-4">
                  <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 rounded-lg border border-border bg-secondary/20 p-4">
                    {summaryOutput}
                  </article>
                  <SummaryStats input={state.summarizeInput} output={summaryOutput} />
                </div>
              )}
            </OutputPanel>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={runSummarize}
              disabled={!state.summarizeInput.trim() || loading !== null}
              className="min-w-[180px]"
            >
              {loading === "summarize" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Summarize
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <AdZone id="ai-writing-assistant-mid" size="728x90" />

      <HowToUse
        steps={[
          "Choose your mode: Grammar Check to fix errors, Paraphrase to rewrite in a new style, or Summarize to condense long text.",
          "Paste your text into the input area — up to 5,000 characters for grammar, 3,000 for paraphrasing, and 8,000 for summarizing.",
          "Click the action button and copy your result instantly — no signup, no limits.",
        ]}
      />

      <ToolSeoContent
        title="Free AI Writing Assistant — Grammar Checker, Paraphraser & Summarizer"
        description="Fix grammar, paraphrase text in 6 styles, and summarize documents instantly — all free with no daily limits, no signup required."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <section className="mt-6 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          Pair the grammar checker with our{" "}
          <InternalLink href="/tools/ai-email-writer">AI Email Writer</InternalLink> to write and
          polish professional emails in one workflow.
        </p>
        <p>
          Building a job application? Use the paraphraser alongside our{" "}
          <InternalLink href="/tools/ai-cover-letter-generator">
            AI Cover Letter Generator
          </InternalLink>{" "}
          and <InternalLink href="/tools/ai-resume-builder">AI Resume Builder</InternalLink> for a
          complete application package.
        </p>
      </section>

      <RelatedTools currentSlug="ai-writing-assistant" />
    </ToolPageShell>
  );
}

// ── Reusable sub-components ────────────────────────────────────────────────

function InputPanel({
  icon,
  title,
  placeholder,
  value,
  onChange,
  maxChars,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in oklch, var(--violet-brand) 12%, transparent)" }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      <div className="relative flex-1 flex flex-col">
        <Textarea
          value={value}
          onChange={(e) => {
            const next = e.target.value.slice(0, maxChars);
            onChange(next);
          }}
          placeholder={placeholder}
          disabled={disabled}
          rows={10}
          className="min-h-[220px] resize-y pr-9"
          aria-label={title}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
            aria-label="Clear input"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 text-right text-xs text-muted-foreground tabular-nums">
        {value.length.toLocaleString()} / {maxChars.toLocaleString()}
      </div>
    </div>
  );
}

function OutputPanel({
  title,
  busy,
  error,
  hasContent,
  onCopy,
  copied,
  placeholder,
  children,
}: {
  title: string;
  busy: boolean;
  error: string | null;
  hasContent: boolean;
  onCopy: () => void;
  copied: boolean;
  placeholder: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-live="polite"
      aria-busy={busy}
      aria-label={title}
      className="rounded-2xl border border-border bg-card p-5 min-h-[320px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hasContent && !busy && (
          <Button type="button" size="sm" variant="outline" onClick={onCopy} aria-label="Copy result">
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Copied ✓" : "Copy"}
          </Button>
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

      {busy && (
        <div className="space-y-2 animate-pulse flex-1" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-3 rounded bg-muted ${
                i % 3 === 0 ? "w-9/12" : i % 2 === 0 ? "w-11/12" : "w-full"
              }`}
            />
          ))}
        </div>
      )}

      {!busy && hasContent && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          {children}
        </motion.div>
      )}

      {!busy && !hasContent && !error && (
        <p className="text-sm text-muted-foreground flex-1">{placeholder}</p>
      )}

      {hasContent && !busy && (
        <p className="mt-4 text-xs text-muted-foreground/60 text-right inline-flex items-center gap-1 justify-end">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Generated by AI
        </p>
      )}
    </section>
  );
}

function SummaryStats({ input, output }: { input: string; output: string }) {
  const inW = countWords(input);
  const outW = countWords(output);
  const pct = inW > 0 ? Math.max(0, Math.round(((inW - outW) / inW) * 100)) : 0;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground">
        Reduced from {inW.toLocaleString()} words to {outW.toLocaleString()} words ({pct}% shorter)
      </span>
    </div>
  );
}

function DiffText({
  a,
  b,
  side,
}: {
  a: string;
  b: string;
  side: "original" | "paraphrased";
}) {
  const aWords = a.split(/(\s+)/);
  const bWords = b.split(/(\s+)/);
  const setA = new Set(aWords.map((w) => w.toLowerCase()));
  const setB = new Set(bWords.map((w) => w.toLowerCase()));

  const source = side === "original" ? aWords : bWords;
  const other = side === "original" ? setB : setA;

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {source.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        const inOther = other.has(token.toLowerCase());
        if (inOther) return <span key={i}>{token}</span>;
        if (side === "original") {
          return (
            <span
              key={i}
              className="line-through decoration-2 text-red-500/80 bg-red-500/10 rounded px-0.5"
            >
              {token}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="text-emerald-600 bg-emerald-500/10 rounded px-0.5 font-medium"
          >
            {token}
          </span>
        );
      })}
    </p>
  );
}
