import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { CountrySelect } from "@/components/seo/country-select";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { runDomainAnalysis, type DomainAnalysisResult } from "@/lib/domain-analysis.functions";

export const Route = createFileRoute("/tools/domain-analysis")({
  head: () => buildToolMeta(toolBySlug("domain-analysis", tools)),
  component: DomainAnalysisPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function DomainAnalysisPage() {
  const runFn = useServerFn(runDomainAnalysis);
  const [domain, setDomain] = useState("");
  const [database, setDatabase] = useState("us");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainAnalysisResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { domain: domain.trim(), database } });
      setResult(r);
      if (r.organicKeywords === 0 && r.topKeywords.length === 0) {
        toast.info("No data found. Check the domain spelling and country.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Website Traffic & SEO Checker"
      description="Estimate any site's organic traffic, keyword count and top ranking pages using live Semrush data. No signup."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter a domain (e.g. example.com)"
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Organic Keywords", value: fmt(result.organicKeywords) },
              { label: "Est. Traffic /mo", value: fmt(result.organicTraffic) },
              { label: "Traffic Cost", value: `$${fmt(result.organicCost)}` },
              { label: "Paid Keywords", value: fmt(result.adwordsKeywords) },
              { label: "Paid Traffic", value: fmt(result.adwordsTraffic) },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold font-mono" style={{ color: "var(--cyan-brand)" }}>
                  {m.value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {result.topKeywords.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold mb-3">Top ranking keywords</h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2.5">Keyword</th>
                        <th className="text-right px-4 py-2.5">Pos.</th>
                        <th className="text-right px-4 py-2.5">Volume</th>
                        <th className="text-right px-4 py-2.5">Traffic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.topKeywords.map((k, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 max-w-xs truncate">{k.keyword}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{k.position}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(k.volume)}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(k.traffic)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      <HowToUse
        steps={[
          "Enter any website's domain (e.g. wikipedia.org, your competitor, or your own site).",
          "Choose the country whose search results you want to analyze — different markets show wildly different numbers.",
          "Instantly see estimated organic traffic, total ranking keywords, paid-ad footprint and the exact keywords driving the most visitors.",
        ]}
      />

      <ToolSeoContent
        title="Website Traffic Checker — Estimate Any Domain's SEO in Seconds"
        description="See how much organic traffic any website gets, how many keywords it ranks for, and which pages drive the most visitors. Powered by live Semrush data. Free forever, no signup."
        body={[
          "Whether you're sizing up a competitor, evaluating a site you want to buy, or just curious about how a favourite blog is doing, a domain traffic checker gives you the answer in seconds. Skycally's tool pulls real ranking data from Semrush's index of billions of keywords across 140+ countries. Enter any domain, choose the market you care about, and you'll see estimated monthly organic traffic, the total number of keywords the site ranks for on Google, and the equivalent Google Ads value of that traffic.",
          "The keyword breakdown is where the real intelligence lives. Instead of just a traffic number, you see the exact search terms that bring visitors to the site, their Google ranking position, and the estimated share of traffic each one drives. This tells you what topics work in your niche, which content formats rank, and which long-tail keywords your competitors are winning — invaluable when you're planning your own content roadmap. If a rival ranks position 3 for a high-volume keyword, that's a page you should study and beat.",
          "The paid-search columns (paid keywords, paid traffic) reveal advertising strategy. A site that ranks organically but also runs ads on the same keywords sees those terms as high-value. A site with zero paid presence but strong organic rankings has often achieved authority the slow, sustainable way. Combining both metrics with the traffic-cost estimate ('how much would this traffic cost to buy on Google Ads?') gives you a dollar figure for a site's SEO value — perfect for M&A due diligence or client reporting.",
          "The tool doesn't need Google Analytics access to any site — Semrush's estimates are based on a mix of clickstream data, SERP position tracking and modelled click-through rates. That means you can analyse any domain in the world, including ones you don't own. Numbers are estimates, so expect a 20–40% margin versus the site's real GA data, but the direction (growing, stable, declining) and relative comparisons between sites are highly reliable.",
        ]}
        faqs={[
          {
            question: "How accurate is the traffic estimate?",
            answer:
              "Semrush estimates are based on click-through rate models applied to ranking positions and search volumes. They're typically within 20–40% of a site's actual Google Analytics organic traffic. They're excellent for comparing sites and tracking trends, but not a substitute for GA on your own site.",
          },
          {
            question: "Can I check my own website?",
            answer:
              "Yes — and it's the fastest way to spot which of your keywords are close to page-one rankings (positions 4–15) so you know where a small content update could deliver a big traffic bump.",
          },
          {
            question: "Why do different countries show different numbers?",
            answer:
              "Google shows different search results in each country, and users search for different things. A .com site might rank #1 in the US but not appear at all in the UK for the same keyword. Always pick the country that matches your target audience.",
          },
          {
            question: "What does 'Traffic Cost' mean?",
            answer:
              "It's Semrush's estimate of what you'd pay in Google Ads to buy the same amount of traffic the site gets from organic search — essentially the dollar value of its SEO. Great for calculating ROI on SEO investments.",
          },
          {
            question: "Does this include subdomains?",
            answer:
              "By default it analyses the root domain (example.com) and includes traffic to all its pages. Subdomains like blog.example.com are analysed separately.",
          },
          {
            question: "Why does a domain show zero traffic?",
            answer:
              "Either the site is very new, has no Google rankings in that country, is blocked by robots.txt, or the domain is misspelt. Double-check the domain and try the US database — it has the widest coverage.",
          },
          {
            question: "Is this the same data professional SEO agencies use?",
            answer:
              "Yes. The lookups hit the same Semrush API used by agencies paying $140–$450 per month. We fund the subscription so you don't have to.",
          },
          {
            question: "Do you store the domains I look up?",
            answer:
              "No. Domain queries are proxied to the Semrush API and not logged or saved.",
          },
        ]}
      />

      <RelatedTools currentSlug="domain-analysis" />
    </ToolPageShell>
  );
}
