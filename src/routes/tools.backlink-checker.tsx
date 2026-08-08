import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { runBacklinkChecker, type BacklinkCheckerResult } from "@/lib/backlink-checker.functions";

export const Route = createFileRoute("/tools/backlink-checker")({
  head: () => buildToolMeta(toolBySlug("backlink-checker", tools)),
  component: BacklinkCheckerPage,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function BacklinkCheckerPage() {
  const runFn = useServerFn(runBacklinkChecker);
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<"root_domain" | "domain" | "url">("root_domain");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacklinkCheckerResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runFn({ data: { target: target.trim(), targetType } });
      setResult(r);
      if (r.totalBacklinks === 0) {
        toast.info("No backlinks found. Check the domain spelling.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Free Backlink Checker"
      description="Check any domain's backlink profile — authority score, total links, referring domains and top referrers. No signup."
      showFileDisclaimer={false}
    >
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={targetType === "url" ? "https://example.com/page" : "example.com"}
              aria-label="Domain or URL to check backlinks for"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
              maxLength={255}
            />
          </div>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as typeof targetType)}
            disabled={loading}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            aria-label="Target type"
          >
            <option value="root_domain">Root domain</option>
            <option value="domain">Subdomain</option>
            <option value="url">Exact URL</option>
          </select>
          <button
            type="submit"
            disabled={loading || !target.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-background transition disabled:opacity-50"
            style={{ background: "var(--cyan-brand)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Check
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Authority Score", value: result.authorityScore.toString() },
              { label: "Total Backlinks", value: fmt(result.totalBacklinks) },
              { label: "Ref. Domains", value: fmt(result.referringDomains) },
              { label: "Ref. IPs", value: fmt(result.referringIps) },
              { label: "Follow Links", value: fmt(result.follows) },
              { label: "Nofollow", value: fmt(result.nofollows) },
              { label: "Text Links", value: fmt(result.texts) },
              { label: "Image Links", value: fmt(result.images) },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold font-mono" style={{ color: "var(--cyan-brand)" }}>
                  {m.value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {result.topReferrers.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold mb-3">Top referring domains</h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2.5">Domain</th>
                        <th className="text-right px-4 py-2.5">Authority</th>
                        <th className="text-right px-4 py-2.5">Backlinks</th>
                        <th className="text-left px-4 py-2.5">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.topReferrers.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5">{r.domain}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{r.authorityScore}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(r.backlinks)}</td>
                          <td className="px-4 py-2.5 uppercase">{r.country || "—"}</td>
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
          "Enter the domain or exact URL you want to analyze — this can be your own site or any competitor.",
          "Choose the scope: root domain (whole site + subdomains), subdomain only, or an exact URL.",
          "Instantly see the authority score, total backlink count, referring domain count and the top authoritative sites linking in.",
        ]}
      />

      <ToolSeoContent
        title="Free Backlink Checker — See Any Domain's Link Profile Instantly"
        description="Check any domain's backlink profile in seconds: authority score, total backlinks, referring domains, follow/nofollow ratio and top referring sites. Powered by live Semrush data. Free forever, no signup."
        body={[
          "Backlinks — links from other websites to yours — remain one of Google's top three ranking factors alongside content and user experience. The Skycally Backlink Checker gives you an instant snapshot of any site's link profile using Semrush's index of trillions of backlinks. Enter a domain and you'll see the total number of inbound links, the number of unique referring domains (a much better authority signal than raw link count), the follow/nofollow ratio, and Semrush's proprietary Authority Score on a 0–100 scale.",
          "The top referring domains table is where competitive intelligence happens. Sort by authority score and you'll see exactly which high-quality sites link to your competitor. Many of those sites — resource pages, roundups, industry blogs, journalist databases — will also link to you if you pitch them well. This is the classic 'link intersect' outreach tactic used by top SEO agencies: find the sites that link to three or more of your competitors but not to you, and you have a warm list of prospects who clearly write about your niche.",
          "The follow-vs-nofollow breakdown matters because only follow links pass full SEO 'link juice.' A profile that's 95% nofollow suggests low-quality directory submissions or paid links flagged as sponsored. A healthy profile is usually 70–90% follow links from a diverse mix of referring domains. If you see a site with 10 million backlinks from only 100 domains, that's a spam signal — real authority comes from breadth, not volume. Look for sites where the referring-domain count grows steadily over time, roughly proportionally to the backlink count.",
          "Use this tool at three moments: before publishing a new page (check what content earned links in your niche), during a link-building campaign (find which sites already link to competitors), and quarterly on your own domain (spot lost links, disavow toxic ones, and monitor overall authority growth). Because our subscription funds the Semrush data, you can run unlimited checks on any domain in the world without a paid account, credit card or email signup.",
        ]}
        faqs={[
          {
            question: "What is Authority Score?",
            answer:
              "Authority Score (AS) is Semrush's 0–100 domain rating based on backlink profile quality, traffic, and spam signals. Higher is better. New sites typically score 0–20, established sites 30–60, and top-tier sites (Wikipedia, NYT) score 85+.",
          },
          {
            question: "What's the difference between backlinks and referring domains?",
            answer:
              "One website can link to you many times (e.g. from its homepage, blog and footer). Backlinks = total link count. Referring domains = unique websites. Referring domains is a much stronger ranking signal because 100 links from 100 different sites means far more than 100 links from one site.",
          },
          {
            question: "Are these live real-time numbers?",
            answer:
              "Very close — Semrush's backlink crawler discovers new links within days and refreshes its index continuously. The metrics you see are typically 1–14 days old, which is the industry standard.",
          },
          {
            question: "Can I check my competitor's backlinks?",
            answer:
              "Yes — that's one of the most powerful uses of the tool. Find sites linking to competitors and pitch them your content. This is standard competitive SEO and doesn't require your competitor's permission.",
          },
          {
            question: "What's a follow vs nofollow link?",
            answer:
              "Follow links pass SEO authority from the linking site to yours. Nofollow links (with rel='nofollow' or rel='sponsored') don't officially pass authority, though Google treats them as hints. A healthy profile has both, weighted toward follow.",
          },
          {
            question: "Why does my brand-new site show zero backlinks?",
            answer:
              "New domains take weeks to appear in backlink crawlers, even if you already have inbound links. Wait 2–4 weeks and check again. Also verify you entered the correct root domain (without http:// or trailing slashes).",
          },
          {
            question: "Should I try to remove nofollow backlinks?",
            answer:
              "No. Nofollow links from real sites still send referral traffic and contribute to a natural-looking link profile. Only disavow links from proven spam or PBN networks that could trigger a manual penalty.",
          },
          {
            question: "Do you save the domains I check?",
            answer:
              "No. Queries are forwarded to the Semrush API and are not stored, logged or shared.",
          },
        ]}
      />

      <RelatedTools currentSlug="backlink-checker" />
    </ToolPageShell>
  );
}
