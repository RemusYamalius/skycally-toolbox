import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { CountrySelect } from "@/components/seo/country-select";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import {
  runKeywordResearch,
  type KeywordResearchResult,
} from "@/lib/keyword-research.functions";

export const Route = createFileRoute("/tools/keyword-research")({
  head: () => buildToolMeta(toolBySlug("keyword-research", tools)),
  component: KeywordResearchPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function KeywordResearchPage() {
  const runFn = useServerFn(runKeywordResearch);
  const [keyword, setKeyword] = useState("");
  const [database, setDatabase] = useState("us");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResearchResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { keyword: keyword.trim(), database } });
      setResult(r);
      if (!r.main && r.related.length === 0 && r.questions.length === 0) {
        toast.info("No data found. Try a broader keyword.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Keyword Research Tool"
      description="Get real search volume, CPC, competition and related keywords from Semrush data. No signup, no credit card."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter a keyword (e.g. content marketing)"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <CountrySelect value={database} onChange={setDatabase} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-background transition disabled:opacity-50"
            style={{ background: "var(--cyan-brand)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Research
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-6">
          {result.main && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Volume /mo", value: fmt(result.main.volume) },
                { label: "CPC (USD)", value: `$${result.main.cpc.toFixed(2)}` },
                { label: "Competition", value: result.main.competition.toFixed(2) },
                { label: "Results", value: fmt(result.main.results) },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold font-mono" style={{ color: "var(--cyan-brand)" }}>
                    {m.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          {result.related.length > 0 && (
            <ResultTable
              title="Related keywords"
              rows={result.related.map((k) => ({
                keyword: k.keyword,
                volume: k.volume,
                cpc: k.cpc,
                competition: k.competition,
              }))}
            />
          )}

          {result.questions.length > 0 && (
            <ResultTable
              title="Question keywords"
              rows={result.questions.map((k) => ({
                keyword: k.keyword,
                volume: k.volume,
                cpc: k.cpc,
                competition: k.competition,
              }))}
            />
          )}
        </div>
      )}

      <HowToUse
        steps={[
          "Type any keyword or phrase you want to rank for and pick your target country.",
          "Click Research — you'll get real monthly search volume, CPC, competition and hundreds of related keywords in seconds.",
          "Use the related keywords and question ideas to plan content that captures long-tail traffic without competing on the hardest terms.",
        ]}
      />

      <ToolSeoContent
        title="Free Keyword Research Tool — Real Search Volume, CPC & Related Keywords"
        description="Discover what people actually search for. Get monthly search volume, cost-per-click, competition level, related keywords and question-form variations for any topic — powered by live Semrush data. Free, no signup, no credit card."
        body={[
          "Keyword research is the foundation of every successful SEO and content marketing strategy. Without it, you're guessing what your audience wants — and guessing rarely ranks. Skycally's free Keyword Research tool pulls live data directly from Semrush, one of the largest SEO databases in the world, so you can validate ideas with real numbers instead of hunches. Enter any keyword, pick your target country, and instantly see how many people search for it each month, how much advertisers pay per click, and how fierce the competition is.",
          "Beyond the headline metrics, the tool surfaces up to 25 related keywords and 15 question-style variations for every search. Related keywords help you build topic clusters — groups of semantically connected pages that Google rewards with better rankings. Question keywords (starting with what, how, why, when, can, does, etc.) are gold for featured snippets, voice-search results and long-form articles that answer real user intent. Together, they turn a single seed keyword into a full content roadmap.",
          "The country selector matters more than most people realise. Search behaviour, competition and CPC vary wildly between markets: a keyword that costs $8 per click in the United States might cost 40 cents in Brazil, and a topic that's saturated in the UK can be wide open in Australia. Choose the country that matches your audience — if you serve multiple markets, run the tool once per country to compare volumes and difficulty before deciding where to publish first.",
          "Everything runs server-side through our authenticated Semrush connection, so you never need a Semrush account, credit card or subscription. There are no daily lookup caps for individual visitors, no watermarks, and no email walls. The tool is designed for indie site owners, freelance SEOs, content marketers, students and anyone who wants professional keyword data without the $140/month enterprise price tag. Bookmark it and use it every time you plan a new post, page or product.",
        ]}
        faqs={[
          {
            question: "Is this keyword tool really free?",
            answer:
              "Yes — completely free with no signup, no email required and no credit card. The lookups are powered by our own Semrush subscription, so you get professional data at no cost.",
          },
          {
            question: "Where does the data come from?",
            answer:
              "All metrics (search volume, CPC, competition, related keywords, questions) come directly from Semrush's live API — the same source used by professional SEO agencies worldwide.",
          },
          {
            question: "How accurate is the monthly search volume?",
            answer:
              "Volumes are Semrush's estimates based on clickstream and Google data. They're the industry standard for SEO planning — very reliable for comparing keywords against each other, and typically within 10–30% of actual Google Search Console impressions.",
          },
          {
            question: "What does CPC mean?",
            answer:
              "CPC is the average cost-per-click advertisers pay in Google Ads to appear for that keyword. High CPC signals commercial intent (people ready to buy) and is a good indicator of a topic's monetary value, even for organic SEO.",
          },
          {
            question: "What is the competition score?",
            answer:
              "Competition is a 0–1 score representing paid-ad competition for the keyword (how many advertisers bid on it). This is different from SEO difficulty — for SEO difficulty, use our Keyword Difficulty Checker.",
          },
          {
            question: "Which country should I choose?",
            answer:
              "Pick the country you want to rank in. If your site serves the US, choose US. For a UK business, choose UK. For global content, start with US as it has the largest data set.",
          },
          {
            question: "Do you store my searches?",
            answer:
              "No. Search terms are sent to the Semrush API to fetch data and are not saved, logged, or shared with any third party. Your research is private.",
          },
          {
            question: "Are there any usage limits?",
            answer:
              "The tool is fair-use free for everyone. Very heavy automated usage may be temporarily throttled to protect our Semrush quota for other visitors, but normal manual research is unrestricted.",
          },
        ]}
      />

      <RelatedTools currentSlug="keyword-research" />
    </ToolPageShell>
  );
}

interface Row {
  keyword: string;
  volume: number;
  cpc: number;
  competition: number;
}

function ResultTable({ title, rows }: { title: string; rows: Row[] }) {
  const fmtNum = (n: number) => fmt(n);
  return (
    <section>
      <h2 className="font-display text-lg font-bold mb-3">{title}</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5">Keyword</th>
                <th className="text-right px-4 py-2.5">Volume</th>
                <th className="text-right px-4 py-2.5">CPC</th>
                <th className="text-right px-4 py-2.5">Comp.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2.5">{r.keyword}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmtNum(r.volume)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">${r.cpc.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{r.competition.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
