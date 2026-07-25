import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Shield, BarChart3, Loader2, ClipboardList, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

// SEO NOTE: Search Console shows real demand for "sentiment analysis online"
// (188 impressions, position ~29, zero clicks — page 3-4). The title below
// leads with the exact proven phrase instead of "AI Sentiment Analysis"
// (which pushed "online" further from the start of the title tag), since
// the tool clearly already works — this is a ranking/relevance problem,
// not a functionality problem.

const SLUG = "sentiment-analysis";

export const Route = createFileRoute("/tools/sentiment-analysis")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const title = "Sentiment Analysis Online — Free AI Text Sentiment Tool | Skycally";
    const description =
      "Free sentiment analysis online. Detect positive, negative or neutral sentiment in any text instantly with AI — no signup, 100% private, runs in your browser.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Sentiment Analysis Online",
            alternateName: ["AI Sentiment Analysis", "Text Sentiment Checker"],
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: [
              "Analyzes text sentiment as positive, negative or neutral",
              "Instant results as you type or paste",
              "Batch mode analyzes up to 50 texts at once",
              "Powered by DistilBERT, runs locally via WebAssembly",
              "No signup required",
              "100% private — text never leaves your device",
              "Free forever",
            ],
          }),
        },
      ],
    };
  },
  component: SentimentTool,
});

interface SentimentResult {
  label: string;
  score: number;
}

let pipelinePromise: Promise<any> | null = null;

async function getPipeline(onProgress: (msg: string) => void): Promise<any> {
  if (pipelinePromise) return pipelinePromise;
  onProgress("Loading AI model (~60MB, first time only)…");
  pipelinePromise = (async () => {
    const url = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js";
    const mod: any = await import(/* @vite-ignore */ url);
    return await mod.pipeline("sentiment-analysis", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
  })();
  return pipelinePromise;
}

function styleFor(label: string) {
  if (label === "POSITIVE")
    return {
      emoji: "😊",
      color: "var(--green-brand)",
      label: "Positive",
      bg: "rgba(34,197,94,0.1)",
      border: "rgba(34,197,94,0.3)",
    };
  if (label === "NEGATIVE")
    return {
      emoji: "😔",
      color: "#ef4444",
      label: "Negative",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.3)",
    };
  return {
    emoji: "😐",
    color: "var(--muted-foreground)",
    label: "Neutral",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.3)",
  };
}

const MAX = 1000;

const EXAMPLES = [
  "I absolutely loved this product — it exceeded all my expectations!",
  "Terrible experience. The service was slow and the staff were rude.",
  "The package arrived on time. It was okay, nothing special.",
  "Best movie I've seen this year. Highly recommend it to everyone!",
];

function SentimentTool() {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [batchResults, setBatchResults] = useState<{ text: string; r: SentimentResult }[]>([]);
  const [history, setHistory] = useState<{ text: string; r: SentimentResult }[]>([]);

  const analyze = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const pipe = await getPipeline(setStatus);
      setStatus("Analyzing…");
      const out = await pipe(text);
      const r: SentimentResult = { label: out[0].label, score: out[0].score };
      setResult(r);
      setHistory((h) => [{ text, r }, ...h].slice(0, 6));
      setStatus("");
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const analyzeBatch = async () => {
    const lines = batch
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    setBatchResults([]);
    try {
      const pipe = await getPipeline(setStatus);
      setStatus(`Analyzing ${lines.length} texts…`);
      const results: { text: string; r: SentimentResult }[] = [];
      for (const line of lines) {
        const out = await pipe(line);
        results.push({ text: line, r: { label: out[0].label, score: out[0].score } });
        setBatchResults([...results]);
      }
      setStatus("");
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  // Batch summary
  const batchSummary =
    batchResults.length > 0
      ? {
          positive: batchResults.filter((b) => b.r.label === "POSITIVE").length,
          negative: batchResults.filter((b) => b.r.label === "NEGATIVE").length,
          neutral: batchResults.filter((b) => b.r.label !== "POSITIVE" && b.r.label !== "NEGATIVE").length,
        }
      : null;

  return (
    <ToolPageShell
      title="Sentiment Analysis Online"
      description="Free sentiment analysis online — detect positive, negative, or neutral tone in any text. Powered by DistilBERT, runs locally in your browser, completely private."
      showFileDisclaimer={false}
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cyan-brand)" }} aria-hidden="true" />
          Powered by DistilBERT (Transformers.js)
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
          100% private — text never leaves your device
        </div>
      </div>

      {/* Model loading notice */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 flex gap-3 mb-6">
        <Loader2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">First analysis takes ~15 seconds</span> to download the AI model
          (~60MB). All subsequent analyses are instant.
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="single">Single Text</TabsTrigger>
          <TabsTrigger value="batch">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Batch
          </TabsTrigger>
        </TabsList>

        {/* Single */}
        <TabsContent value="single" className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Your text
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                placeholder="Paste a review, tweet, feedback, or any text to analyze…"
                className="min-h-[120px] resize-none"
                aria-label="Text to analyze"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {text.length} / {MAX}
                </span>
                {text && (
                  <button
                    onClick={() => setText("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick examples */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Try an example
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background/40 hover:bg-secondary transition-colors truncate max-w-[200px]"
                    title={ex}
                  >
                    {ex.slice(0, 35)}…
                  </button>
                ))}
              </div>
            </div>

            {status && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {status}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={busy || !text.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
              )}
              {busy ? "Analyzing…" : "Analyze Sentiment"}
            </button>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result &&
              (() => {
                const s = styleFor(result.label);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border p-6"
                    style={{ borderColor: s.border, background: s.bg }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-5xl">{s.emoji}</span>
                      <div>
                        <p className="text-2xl font-extrabold" style={{ color: s.color }}>
                          {s.label}
                        </p>
                        <p className="text-sm text-muted-foreground">Confidence: {(result.score * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Confidence</span>
                        <span>{(result.score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${result.score * 100}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
          </AnimatePresence>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Analyses
                </h3>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {history.map((h, i) => {
                  const s = styleFor(h.r.label);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm rounded-lg px-3 py-2 bg-background/40 border border-border"
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span className="truncate flex-1 text-xs">
                        {h.text.slice(0, 60)}
                        {h.text.length > 60 ? "…" : ""}
                      </span>
                      <span className="text-xs font-bold shrink-0" style={{ color: s.color }}>
                        {s.label} {(h.r.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Batch */}
        <TabsContent value="batch" className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                One text per line (up to 50)
              </label>
              <Textarea
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder={
                  "I loved the movie!\nThe service was terrible.\nIt was okay, nothing special.\nAbsolutely fantastic experience!"
                }
                className="min-h-[180px] resize-none font-mono text-sm"
                aria-label="Batch texts to analyze"
              />
            </div>

            {status && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {status}
              </div>
            )}

            <button
              onClick={analyzeBatch}
              disabled={busy || !batch.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
              )}
              {busy ? "Analyzing…" : "Analyze All"}
            </button>
          </div>

          {/* Batch summary */}
          {batchSummary && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Positive 😊", count: batchSummary.positive, color: "var(--green-brand)" },
                { label: "Neutral 😐", count: batchSummary.neutral, color: "var(--muted-foreground)" },
                { label: "Negative 😔", count: batchSummary.negative, color: "#ef4444" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-extrabold" style={{ color: s.color }}>
                    {s.count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {batchResults.length > 0 && (
            <div className="space-y-2">
              {batchResults.map((b, i) => {
                const s = styleFor(b.r.label);
                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                    <span className="text-xl shrink-0">{s.emoji}</span>
                    <span className="flex-1 text-sm truncate">{b.text}</span>
                    <span className="text-xs font-bold shrink-0" style={{ color: s.color }}>
                      {s.label} {(b.r.score * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AdZone id="sentiment-analysis-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Type or paste any text — a review, tweet, feedback, or comment. Or click an example to try instantly.",
          "Click Analyze Sentiment — the AI loads once (~15 seconds), then all future analyses are instant.",
          "Read the sentiment (Positive, Negative, or Neutral) with a confidence score. Use Batch mode to analyze multiple texts at once.",
        ]}
      />

      <ToolSeoContent
        title="Sentiment Analysis Online — Free AI Text Sentiment Tool"
        description="Run sentiment analysis online, free, using AI. Detect positive, negative, or neutral tone with a confidence score. Batch mode for multiple texts. 100% private, runs in your browser."
        body={[
          "Skycally's sentiment analysis online tool detects the emotional tone of any text — positive, negative, or neutral — using a DistilBERT model fine-tuned on the Stanford Sentiment Treebank. Paste any text from a product review to a social media post and get an instant sentiment label with a confidence percentage, with nothing sent to a server.",
          "Unlike most sentiment analysis online services that send your text to a remote API, this AI model runs entirely in your browser using Transformers.js and WebAssembly. The first analysis downloads the model (~60MB) once; all subsequent analyses in the same session are instant, making it practical for analyzing multiple texts in succession without any usage cap.",
          "Batch mode lets you analyze up to 50 texts simultaneously — paste one per line, click Analyze All, and see sentiment results stream in with a live summary showing the overall positive/negative/neutral breakdown. This is ideal for analyzing customer reviews, survey responses, or comment threads in bulk without needing a paid sentiment analysis online subscription.",
          "Common use cases include brand monitoring, customer feedback analysis, market research, academic sentiment studies, content evaluation, and any situation where understanding the emotional tone of written text provides value. The confidence score shows how strongly the AI classifies each text, helping you identify borderline cases that might warrant manual review.",
        ]}
        faqs={[
          {
            question: "Is this sentiment analysis tool really free to use online?",
            answer:
              "Yes. Every feature — single text and batch mode — is free, with no signup, no account, and no usage limit. Unlike most sentiment analysis online APIs, there is no per-request cost.",
          },
          {
            question: "How accurate is the sentiment analysis?",
            answer:
              "The DistilBERT model achieves ~91% accuracy on the SST-2 benchmark for English text. Accuracy varies for informal language, sarcasm, and non-English text.",
          },
          {
            question: "What languages are supported?",
            answer:
              "The model is fine-tuned for English text. Results for other languages may be less accurate as the model was primarily trained on English data.",
          },
          {
            question: "How is the confidence score calculated?",
            answer:
              "The model outputs a probability score for each class. The displayed percentage shows how confident the AI is — above 90% is a strong signal, 70-90% is moderate.",
          },
          {
            question: "Can I analyze multiple texts at once?",
            answer:
              "Yes. Use Batch mode and enter one text per line. Each is analyzed independently and the summary shows the overall positive/negative/neutral breakdown.",
          },
          {
            question: "Is my text uploaded to a server?",
            answer:
              "No. The AI model runs locally in your browser using WebAssembly. Your text never leaves your device — this sentiment analysis runs fully offline once the model has loaded.",
          },
          {
            question: "What is DistilBERT?",
            answer:
              "DistilBERT is a lightweight version of BERT (Google's language model) fine-tuned for sentiment classification. It's 40% smaller than BERT while retaining 97% of its performance.",
          },
          {
            question: "Can it detect sarcasm?",
            answer:
              "Sarcasm is very difficult for any AI model. The tool focuses on surface-level sentiment signals — sarcastic text may be classified as positive when the true intent is negative.",
          },
          {
            question: "Is this useful for businesses?",
            answer:
              "Yes. Common uses include analyzing customer reviews, monitoring brand mentions, evaluating survey responses, and understanding audience reactions to content or campaigns.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}
