import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { CountrySelect } from "@/components/seo/country-select";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { runKeywordDifficulty, type KeywordDifficultyResult } from "@/lib/keyword-difficulty.functions";

export const Route = createFileRoute("/tools/keyword-difficulty")({
  head: () => buildToolMeta(toolBySlug("keyword-difficulty", tools)),
  component: KeywordDifficultyPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function kdColor(kd: number): { bg: string; label: string } {
  if (kd < 30) return { bg: "var(--green-brand)", label: "Easy" };
  if (kd < 50) return { bg: "#fbbf24", label: "Possible" };
  if (kd < 70) return { bg: "#fb923c", label: "Hard" };
  return { bg: "#ef4444", label: "Very Hard" };
}

function KeywordDifficultyPage() {
  const runFn = useServerFn(runKeywordDifficulty);
  const [keywords, setKeywords] = useState("");
  const [database, setDatabase] = useState("us");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordDifficultyResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { keywords: keywords.trim(), database } });
      setResult(r);
      if (r.entries.length === 0) toast.info("No data found.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Keyword Difficulty Checker"
      description="Check how hard it is to rank on Google for up to 10 keywords at once. Real Semrush difficulty scores. Free, no signup."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Enter up to 10 keywords, one per line (or comma-separated)&#10;e.g.&#10;content marketing&#10;seo tools&#10;keyword research"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] font-mono"
          disabled={loading}
          maxLength={1000}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <CountrySelect value={database} onChange={setDatabase} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !keywords.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-background transition disabled:opacity-50 sm:ml-auto"
            style={{ background: "var(--cyan-brand)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Check Difficulty
          </button>
        </div>
      </form>

      {result && result.entries.length > 0 && (
        <section className="mt-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Keyword</th>
                    <th className="text-left px-4 py-3">Difficulty</th>
                    <th className="text-right px-4 py-3">Volume</th>
                    <th className="text-right px-4 py-3">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {result.entries.map((k, i) => {
                    const c = kdColor(k.difficulty);
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3">{k.keyword}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, k.difficulty)}%`, background: c.bg }}
                              />
                            </div>
                            <span className="font-mono text-sm w-8">{k.difficulty}</span>
                            <span className="text-xs uppercase tracking-wider" style={{ color: c.bg }}>
                              {c.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(k.volume)}</td>
                        <td className="px-4 py-3 text-right font-mono">${k.cpc.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <HowToUse
        steps={[
          "Enter up to 10 keywords, one per line or separated by commas.",
          "Choose your target country — difficulty varies significantly by market.",
          "Get a 0–100 difficulty score for each keyword, colour-coded from Easy (green) to Very Hard (red), plus volume and CPC.",
        ]}
      />

      <ToolSeoContent
        title="Free Keyword Difficulty Checker — Bulk KD, Volume & CPC"
        description="Instantly check how hard it is to rank on Google for up to 10 keywords at once. Get Semrush's 0–100 difficulty score, monthly volume and CPC — free, no signup, no credit card."
        body={[
          "Keyword difficulty (KD) tells you, on a 0–100 scale, how hard it will be to break into Google's top 10 results for a given search term. Semrush calculates KD by analysing the domain-level authority, referring-domain profile and content quality of the sites currently ranking on page one. A KD of 20 means new sites can compete with focused, high-quality content. A KD of 80 means only large, established domains with strong backlink profiles will rank — and even then, only with exceptional pages.",
          "Choosing the wrong-difficulty keywords is the single biggest mistake new site owners make in SEO. Publishing five articles on KD-70 terms wastes months because you'll rank on page 5 for months (or forever). Publishing those same five articles on KD-20 terms with the same effort can put you on page 1 within weeks. Skycally's Keyword Difficulty Checker lets you triage a list of candidate keywords in bulk, so you can immediately spot the low-hanging fruit and deprioritise (or postpone) the impossible ones.",
          "Use the score in combination with search volume: a KD-25 keyword with 100 searches per month is worth an hour of effort; a KD-25 keyword with 10,000 searches per month is a homepage-changing opportunity. Look for the sweet spot where volume is 500+ and difficulty is 30 or under for a site under 12 months old. Established sites (Semrush Authority Score 40+) can target KD-50 to KD-65 with a good chance of ranking within a few months of publication and outreach.",
          "The tool accepts up to 10 keywords per query — enough for a full content-cluster or a product-category audit — and works in 15+ country databases. All lookups use Semrush's live API, funded by Skycally's subscription, so there's no lookup limit for individual visitors and no signup wall. Combine this tool with our Keyword Research Tool (for volume and related terms) and our Competitor Analysis tool (to see who currently ranks) for a complete, professional-grade keyword workflow.",
        ]}
        faqs={[
          {
            question: "How is keyword difficulty calculated?",
            answer:
              "Semrush's KD model weights the average domain authority, referring-domain count, and content quality of the top 10 ranking pages for that keyword. It's a snapshot of how competitive the SERP is right now.",
          },
          {
            question: "What KD should I target for a new site?",
            answer:
              "For a site under 12 months old with fewer than 100 referring domains, target KD 0–30. From KD 30 to 50, expect 3–6 months of consistent publishing and internal linking to rank. Above 50 is aspirational until your Authority Score climbs.",
          },
          {
            question: "Is a low-KD keyword always a good pick?",
            answer:
              "Not automatically. Check the volume too — a KD-15 keyword with 20 searches per month won't move the needle. Aim for keywords where volume is at least 100 and KD is comfortable for your current authority level.",
          },
          {
            question: "Why do the same keywords have different KD scores in different countries?",
            answer:
              "Different Google indexes have different competitors. A keyword may be dominated by 5 authoritative sites in the US market but wide open in Australia. Always check KD in the country you want to rank in.",
          },
          {
            question: "How many keywords can I check at once?",
            answer:
              "Up to 10 per query. This is the sweet spot for triaging a content cluster in one click. For larger keyword lists, run several batches back-to-back.",
          },
          {
            question: "How does KD differ from Competition score?",
            answer:
              "KD measures organic SEO difficulty (how hard to rank in Google's free results). Competition (0–1) is a paid-ads metric showing how many advertisers bid on the keyword. Different things — don't confuse them.",
          },
          {
            question: "Is the data live?",
            answer:
              "Yes. Every query hits Semrush's live API. Data is refreshed continuously and reflects the current state of Google's rankings.",
          },
          {
            question: "Do I need a Semrush account?",
            answer:
              "No. All lookups run through our own Semrush subscription. You get professional data with no account, no email, no card.",
          },
        ]}
      />

      <RelatedTools currentSlug="keyword-difficulty" />
    </ToolPageShell>
  );
}
