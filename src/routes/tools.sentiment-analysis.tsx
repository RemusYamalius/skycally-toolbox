import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdZone } from "@/components/ad-zone";
import { PoweredBy, BrowserOnlyBadge } from "@/components/ai-badges";
import { Loader2, Sparkles } from "lucide-react";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/sentiment-analysis")({
  head: () => buildToolMeta(toolBySlug("sentiment-analysis", tools)),)}
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
          <ToolSeoContent
        title={"AI Sentiment Analysis — Analyze Text Emotion Free Online"}
        description={"Detect positive, negative or neutral sentiment in any text using AI. Powered by Transformers.js. Shows confidence score. Works entirely in your browser."}
        body={[
        "Enter any text — a product review, social media post, customer feedback or any written content — and the AI will analyze its emotional tone. Results show the sentiment label (Positive, Negative or Neutral) along with a confidence percentage.",
        "The sentiment analysis model runs locally in your browser using Transformers.js and a DistilBERT model fine-tuned for sentiment classification. The first analysis takes 15-30 seconds to load the model — subsequent analyses are instant.",
      ]}
        faqs={[
        { question: "What languages does sentiment analysis support?", answer: "The current model is optimized for English text. Results for other languages may be less accurate as the model was trained primarily on English data." },
        { question: "How is the confidence score calculated?", answer: "The model outputs a probability score for each sentiment class. The displayed percentage represents how confident the AI is in its classification." },
        { question: "Can I analyze multiple texts at once?", answer: "Yes. Use batch mode by entering multiple texts separated by new lines. Each text is analyzed independently." },
        { question: "Is sentiment analysis useful for businesses?", answer: "Yes. Common uses include analyzing customer reviews, monitoring brand mentions, evaluating survey responses and understanding audience reactions to content." },
      ]}
      />
      </ToolPageShell>
  );
}
