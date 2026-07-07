import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { CountrySelect } from "@/components/seo/country-select";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { runPageSeoAnalyzer, type PageSeoAnalyzerResult } from "@/lib/page-seo-analyzer.functions";

export const Route = createFileRoute("/tools/page-seo-analyzer")({
  head: () => buildToolMeta(toolBySlug("page-seo-analyzer", tools)),
  component: PageSeoAnalyzerPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function PageSeoAnalyzerPage() {
  const runFn = useServerFn(runPageSeoAnalyzer);
  const [url, setUrl] = useState("");
  const [database, setDatabase] = useState("us");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageSeoAnalyzerResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { url: url.trim(), database } });
      setResult(r);
      if (r.organicKeywords === 0 && r.keywords.length === 0) {
        toast.info("No ranking data for this URL. Try a top-level page.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Page SEO Analyzer"
      description="Analyze any URL's Google rankings — see which keywords it ranks for, positions, volumes and traffic. Powered by live Semrush data."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FileSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page-to-analyze"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
              maxLength={500}
            />
          </div>
          <CountrySelect value={database} onChange={setDatabase} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-background transition disabled:opacity-50"
            style={{ background: "var(--cyan-brand)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Ranking Keywords", value: fmt(result.organicKeywords) },
              { label: "Est. Traffic /mo", value: fmt(result.organicTraffic) },
              { label: "Traffic Value", value: `$${fmt(result.organicCost)}` },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold font-mono" style={{ color: "var(--cyan-brand)" }}>
                  {m.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {result.keywords.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold mb-3">Keywords this page ranks for</h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2.5">Keyword</th>
                        <th className="text-right px-4 py-2.5">Pos.</th>
                        <th className="text-right px-4 py-2.5">Volume</th>
                        <th className="text-right px-4 py-2.5">CPC</th>
                        <th className="text-right px-4 py-2.5">Traffic %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.keywords.map((k, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 max-w-xs truncate">{k.keyword}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{k.position}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(k.volume)}</td>
                          <td className="px-4 py-2.5 text-right font-mono">${k.cpc.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{k.traffic.toFixed(1)}%</td>
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
          "Paste the full URL of any page you want to analyze (yours or a competitor's).",
          "Choose the target country whose Google index you want to check against.",
          "See exactly which keywords the page ranks for, each keyword's position, monthly volume, CPC, and share of the page's total traffic.",
        ]}
      />

      <ToolSeoContent
        title="Free Page SEO Analyzer — See What Any URL Ranks For"
        description="Paste any URL and instantly see which Google keywords it ranks for, in what position, and how much traffic each keyword drives. Perfect for competitor content analysis and page-level SEO audits. Free, no signup."
        body={[
          "Domain-level SEO tools tell you a site's total traffic, but they hide the page-level story. Ninety percent of a website's traffic usually comes from ten to twenty individual pages — and those pages rank for very specific keywords. The Page SEO Analyzer zooms in on a single URL and shows you every keyword it currently ranks for on Google, its exact position, monthly search volume, and how much of the page's total traffic each keyword contributes. This is the level of detail you need to reverse-engineer why a page succeeds and reproduce it on your own site.",
          "For competitive research, this tool is a shortcut to editorial gold. Find a competitor's top-performing article via our Domain Analysis tool, then paste its URL here. In seconds you'll see the exact keywords it ranks for, including long-tail terms you'd never have guessed. Those are the terms your version of the article needs to include, ideally in headings and the first 100 words. This on-page keyword mapping is the difference between an article that ranks for one keyword and one that captures 200 long-tail variations.",
          "For your own site, run every important page through the tool once a quarter. You'll spot 'accidental rankings' — keywords Google decided your page is relevant to that you never targeted. These are gift-wrapped opportunities: a small content update to explicitly address that keyword (add it to the H1 or intro, expand the relevant section) often bumps you from position 15 to position 5. Similarly, keywords in positions 8–15 are close-to-first-page and typically only need a link boost or a content refresh to reach the top 10.",
          "The traffic percentage column shows which keywords actually drive visits (position × volume × click-through-rate). A keyword with 100,000 monthly searches in position 47 drives essentially zero traffic. A keyword with 500 searches in position 2 drives more. Focus your optimisation on the high-volume-close-to-page-one terms, and don't waste time on rankings below position 30 unless you're willing to invest heavily in that page. Everything runs on our Semrush subscription — free for you, unlimited, and no signup required.",
        ]}
        faqs={[
          {
            question: "What URL format should I use?",
            answer:
              "Paste the full URL including https:// (or without — we'll add it). For best results, use the exact URL Google indexes, including trailing slashes or www. as they appear in the browser bar.",
          },
          {
            question: "Why does my page show zero keywords?",
            answer:
              "Either the page is very new and Google hasn't indexed it, the URL doesn't match Google's canonical version, or it truly doesn't rank in the top 100 for any tracked keyword. Give new pages 3–6 weeks to appear in the index.",
          },
          {
            question: "What does the 'Position' column mean?",
            answer:
              "It's Google's ranking position (1 = top of page 1, 10 = bottom of page 1, 11+ = page 2 and beyond). Positions 1–3 get 50–70% of clicks; positions 8+ get less than 3%.",
          },
          {
            question: "What is Traffic % for each keyword?",
            answer:
              "It shows what share of the page's total organic traffic that specific keyword drives. If one keyword accounts for 40% of traffic, protecting its ranking is critical.",
          },
          {
            question: "Can I analyze any page on any site?",
            answer:
              "Yes — including competitor URLs, Wikipedia articles, or reference pages you admire. The tool works on any publicly indexed URL.",
          },
          {
            question: "Are these live rankings?",
            answer:
              "Semrush refreshes rankings frequently (typically weekly for most keywords, daily for high-volume ones). Numbers you see are typically 1–7 days old.",
          },
          {
            question: "Should I analyze my homepage or interior pages?",
            answer:
              "Both. Homepages rank for brand terms and a few high-volume topics; interior pages (blog posts, category pages, product pages) usually rank for the long-tail keywords that drive most search traffic.",
          },
          {
            question: "Is my URL data stored?",
            answer:
              "No. URLs are proxied to the Semrush API for the lookup and are not saved or logged.",
          },
        ]}
      />

      <RelatedTools currentSlug="page-seo-analyzer" />
    </ToolPageShell>
  );
}
