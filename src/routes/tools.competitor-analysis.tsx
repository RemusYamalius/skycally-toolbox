import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
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
  runCompetitorAnalysis,
  type CompetitorAnalysisResult,
} from "@/lib/competitor-analysis.functions";

export const Route = createFileRoute("/tools/competitor-analysis")({
  head: () => buildToolMeta(toolBySlug("competitor-analysis", tools)),
  component: CompetitorAnalysisPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function CompetitorAnalysisPage() {
  const runFn = useServerFn(runCompetitorAnalysis);
  const [domain, setDomain] = useState("");
  const [database, setDatabase] = useState("us");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompetitorAnalysisResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { domain: domain.trim(), database } });
      setResult(r);
      if (r.competitors.length === 0) toast.info("No competitors found. Try a bigger domain.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Competitor Analysis Tool"
      description="Discover your organic search competitors in seconds. See who competes with you for Google traffic, their keyword count and estimated visits."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter your domain (e.g. yoursite.com)"
              aria-label="Your domain"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
              maxLength={255}
            />
          </div>
          <CountrySelect value={database} onChange={setDatabase} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-background transition disabled:opacity-50"
            style={{ background: "var(--cyan-brand)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Find Competitors
          </button>
        </div>
      </form>

      {result && result.competitors.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold mb-3">Top organic competitors</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5">Domain</th>
                    <th className="text-right px-4 py-2.5">Overlap</th>
                    <th className="text-right px-4 py-2.5">Common KWs</th>
                    <th className="text-right px-4 py-2.5">Total KWs</th>
                    <th className="text-right px-4 py-2.5">Traffic /mo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.competitors.map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2.5">{c.domain}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{c.competitionLevel.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(c.commonKeywords)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(c.organicKeywords)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(c.organicTraffic)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <HowToUse
        steps={[
          "Enter your own domain (or the domain whose competitors you want to discover).",
          "Choose the country you compete in — the tool finds domains ranking for the same keywords as you in that market.",
          "Get up to 25 organic competitors, sorted by keyword overlap. Study their content and links to identify gap opportunities.",
        ]}
      />

      <ToolSeoContent
        title="Free Competitor Analysis Tool — Auto-Discover Your SEO Rivals"
        description="Find out who really competes with you for Google traffic. See competitor domains, keyword overlap, total keywords ranked and estimated organic traffic — powered by live Semrush data. Free, no signup."
        body={[
          "Most site owners think they know their competitors, but SEO competitors are almost never the same as business competitors. A local coffee shop's business rival is the shop across the street; its SEO rival is Wikipedia's article on espresso, a coffee-brewing subreddit, and a national coffee-review blog. Ranking on Google means beating the pages that currently rank — not the businesses you think of as competition. Skycally's Competitor Analysis Tool identifies your real Google rivals in seconds by comparing your keyword set against every indexed domain in Semrush.",
          "The 'overlap' score (0–1) tells you how much of your keyword universe overlaps with each competitor's. A high overlap (0.5+) means you're fighting for the same searches — those are your primary rivals and the ones whose content and backlinks are worth studying most. A moderate overlap (0.2–0.4) reveals adjacent niches — often untapped topic clusters where you could expand. Low overlap competitors (<0.2) still rank for keywords you also rank for, and those long-tail rivals often reveal specific pages worth outranking with a focused update.",
          "For each competitor you also see their total organic keyword count and monthly traffic estimate. Rank competitors by traffic and you have your 'north stars' — the sites that have already achieved what you're aiming for. Rank them by common keywords and you have your 'direct combat' list. From there, open each competitor in a new tab, run them through our Domain Analysis tool to see which of their pages drive the most traffic, and use those top pages as your content-creation brief. This is exactly the workflow professional SEO agencies charge $500+ per audit for.",
          "Because our subscription funds the Semrush API calls, the tool is free and unlimited for individual users. There's no signup, no email required, no watermarks, and no upsell. You can run competitor discovery every few weeks to spot new entrants in your niche — new sites climbing the rankings are often the ones with fresh tactics worth studying. Combine this tool with our Backlink Checker to find which sites link to multiple competitors and would likely link to you too.",
        ]}
        faqs={[
          {
            question: "How does the tool find competitors?",
            answer:
              "It analyses every domain in Semrush's index and finds the ones that rank for the most keywords in common with yours. This is Google's own definition of a search competitor — no manual list needed.",
          },
          {
            question: "What is the overlap / competition score?",
            answer:
              "A 0–1 value showing how much of the keyword universe you share. 1.0 would mean identical keyword sets (impossible in practice). 0.3+ is a significant SEO competitor worth studying.",
          },
          {
            question: "Why aren't my direct business competitors in the list?",
            answer:
              "Because SEO competitors are keyword-based, not industry-based. If your business rival doesn't rank on Google for your keywords, they aren't your SEO rival. Aggregators, blogs and Wikipedia often outrank you before your direct competitor does.",
          },
          {
            question: "How many competitors can I see?",
            answer:
              "Up to 25 per query, sorted by keyword overlap. The top 5–10 are usually enough for a competitive audit.",
          },
          {
            question: "What should I do with this list?",
            answer:
              "For each top competitor, run them through our Domain Analysis tool to see which pages drive their traffic. Model your content on those page structures, then use our Backlink Checker to find who links to them and pitch those sites your version.",
          },
          {
            question: "Does the country choice matter?",
            answer:
              "Yes. A .com site in the US market has completely different competitors than the same site in the UK or German market. Always run the tool per target country.",
          },
          {
            question: "Is this the same data as paid Semrush?",
            answer:
              "Yes — same API, same numbers. We fund the account so you get the professional data free.",
          },
          {
            question: "Can I check a competitor's site instead of my own?",
            answer:
              "Absolutely. Analysing a competitor's competitors is a fast way to discover niche sites you'd never find otherwise.",
          },
        ]}
      />

      <RelatedTools currentSlug="competitor-analysis" />
    </ToolPageShell>
  );
}
