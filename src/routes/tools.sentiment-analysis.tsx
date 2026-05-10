import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge } from "@/components/ai-badges";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/tools/sentiment-analysis")({
  head: () => ({
    meta: [
      { title: "AI Sentiment Analysis — Analyze Text Emotion Free | Skycally" },
      { name: "description", content: "Analyze the sentiment of any text with AI. Detect positive, negative or neutral emotions instantly. Powered by Transformers.js, runs in your browser." },
      { property: "og:title", content: "AI Sentiment Analysis | Skycally" },
      { property: "og:description", content: "Browser-based sentiment analysis powered by Transformers.js." },
      { property: "og:url", content: "https://skycally.com/tools/sentiment-analysis" },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/tools/sentiment-analysis" }],
  }),
  component: SentimentTool,
});

interface SentimentResult { label: string; score: number; }

let pipelinePromise: Promise<any> | null = null;

async function getPipeline(onProgress: (msg: string) => void): Promise<any> {
  if (pipelinePromise) return pipelinePromise;
  onProgress("Loading AI model (~60MB, first time only)...");
  pipelinePromise = (async () => {
    const url = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js";
    const mod: any = await import(/* @vite-ignore */ url);
    return await mod.pipeline("sentiment-analysis", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
  })();
  return pipelinePromise;
}

function styleFor(label: string) {
  if (label === "POSITIVE") return { emoji: "😊", color: "var(--green-brand)", label: "POSITIVE" };
  if (label === "NEGATIVE") return { emoji: "😔", color: "#ef4444", label: "NEGATIVE" };
  return { emoji: "😐", color: "var(--muted-foreground)", label: "NEUTRAL" };
}

const MAX = 1000;

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
      setStatus("Analyzing...");
      const out = await pipe(text);
      const r: SentimentResult = { label: out[0].label, score: out[0].score };
      setResult(r);
      setHistory((h) => [{ text, r }, ...h].slice(0, 5));
      setStatus("");
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const analyzeBatch = async () => {
    const lines = batch.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    setBatchResults([]);
    try {
      const pipe = await getPipeline(setStatus);
      setStatus(`Analyzing ${lines.length} items...`);
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

  return (
    <ToolPageShell title="AI Sentiment Analysis" description="Detect positive, negative or neutral sentiment in any text — runs locally in your browser.">
      <div className="rounded-xl border border-border bg-secondary/40 p-3 mb-6 text-sm flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--violet-brand)" }} />
        <p>First analysis takes ~15 seconds to load the AI model. Subsequent analyses are instant.</p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single text</TabsTrigger>
          <TabsTrigger value="batch">Batch (one per line)</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Enter text to analyze..."
            className="min-h-[140px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length} / {MAX}</span>
            <button onClick={analyze} disabled={busy || !text.trim()} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5 disabled:opacity-50 inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Working..." : "Analyze"}
            </button>
          </div>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}

          {result && (() => {
            const s = styleFor(result.label);
            return (
              <div className="rounded-2xl border p-6" style={{ borderColor: s.color, background: `color-mix(in oklab, ${s.color} 10%, transparent)` }}>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-5xl">{s.emoji}</span>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-sm text-muted-foreground">Confidence {(result.score * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${result.score * 100}%`, background: s.color }} />
                </div>
              </div>
            );
          })()}

          {history.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Recent analyses</h3>
              <ul className="space-y-2">
                {history.map((h, i) => {
                  const s = styleFor(h.r.label);
                  return (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-xl">{s.emoji}</span>
                      <span className="truncate flex-1">{h.text}</span>
                      <span className="text-xs font-semibold" style={{ color: s.color }}>{(h.r.score * 100).toFixed(0)}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="batch" className="mt-6 space-y-4">
          <Textarea
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder={"One sentence per line...\nI loved the movie!\nWaste of time."}
            className="min-h-[160px]"
          />
          <button onClick={analyzeBatch} disabled={busy || !batch.trim()} className="rounded-lg bg-foreground text-background font-medium px-5 py-2.5 disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Working..." : "Analyze batch"}
          </button>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
          {batchResults.length > 0 && (
            <ul className="space-y-2">
              {batchResults.map((b, i) => {
                const s = styleFor(b.r.label);
                return (
                  <li key={i} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="flex-1 text-sm truncate">{b.text}</span>
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label} · {(b.r.score * 100).toFixed(0)}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <div>
        <PoweredBy name="Transformers.js (DistilBERT SST-2)" />
        <BrowserOnlyBadge />
      </div>

      {/* ADSENSE_ZONE: ai-tool-below-result 300x250 */}
      <AdZone id="ai-tool-below-result" size="300x250" />

      <HowToUse steps={[
        "Type or paste text (or one sentence per line for batch).",
        "Click Analyze and wait for the result.",
        "Read the sentiment label and confidence score.",
      ]} />
    </ToolPageShell>
  );
}
