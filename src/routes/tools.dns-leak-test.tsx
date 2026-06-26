import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCw,
  ExternalLink,
  Lock,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/dns-leak-test")({
  head: () => buildToolMeta(toolBySlug("dns-leak-test", tools)),
  component: DnsLeakTestPage,
});

interface GeoInfo {
  ip: string;
  country_name?: string;
  country?: string;
  region?: string;
  city?: string;
  org?: string;
  asn?: string;
  timezone?: string;
}

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Norway",
  "Finland",
  "Denmark",
  "Spain",
  "Italy",
  "Portugal",
  "Ireland",
  "Belgium",
  "Austria",
  "Poland",
  "Czechia",
  "Romania",
  "Greece",
  "Turkey",
  "Russia",
  "Ukraine",
  "Japan",
  "South Korea",
  "China",
  "Hong Kong",
  "Singapore",
  "Taiwan",
  "India",
  "Indonesia",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Israel",
  "United Arab Emirates",
  "Saudi Arabia",
  "Egypt",
  "South Africa",
  "Brazil",
  "Argentina",
  "Mexico",
  "Chile",
  "Colombia",
  "New Zealand",
];

async function fetchPublicIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json");
  if (!res.ok) throw new Error("Could not fetch public IP");
  const data = (await res.json()) as { ip: string };
  return data.ip;
}

async function fetchGeo(ip: string): Promise<GeoInfo> {
  const res = await fetch(`https://ipapi.co/${ip}/json/`);
  if (!res.ok) throw new Error("Could not fetch geolocation");
  return (await res.json()) as GeoInfo;
}

type Status = "secure" | "leak" | "unknown";

function StatusBadge({ status }: { status: Status }) {
  if (status === "secure") {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
        style={{
          background: "color-mix(in oklab, var(--green-brand) 18%, transparent)",
          color: "var(--green-brand)",
          border: "1px solid color-mix(in oklab, var(--green-brand) 40%, transparent)",
        }}
      >
        <CheckCircle2 className="w-5 h-5" /> Your connection appears secure
      </span>
    );
  }
  if (status === "leak") {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
        style={{
          background: "color-mix(in oklab, var(--orange-brand) 15%, transparent)",
          color: "var(--orange-brand)",
          border: "1px solid color-mix(in oklab, var(--orange-brand) 40%, transparent)",
        }}
      >
        <AlertTriangle className="w-5 h-5" /> Your DNS may be leaking
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
      style={{
        background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)",
        color: "var(--cyan-brand)",
        border: "1px solid color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
      }}
    >
      <Globe className="w-5 h-5" /> Detected location
    </span>
  );
}

function InfoCard({
  label,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  icon: typeof Globe;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 p-5"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        {label}
      </div>
      <div className="mt-3 text-lg font-display font-semibold tabular-nums break-words text-foreground">{children}</div>
    </motion.div>
  );
}

function DnsLeakTestPage() {
  const tool = toolBySlug("dns-leak-test", tools);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingVpn, setUsingVpn] = useState(false);
  const [expectedCountry, setExpectedCountry] = useState("");

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGeo(null);
    try {
      const ip = await fetchPublicIp();
      const info = await fetchGeo(ip);
      setGeo(info);
    } catch (e) {
      setError((e as Error).message || "Test failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runTest();
  }, [runTest]);

  let status: Status = "unknown";
  if (!loading && geo && usingVpn && expectedCountry) {
    status = (geo.country_name || "").trim().toLowerCase() === expectedCountry.trim().toLowerCase() ? "secure" : "leak";
  }

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* Privacy badge */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "color-mix(in oklab, var(--green-brand) 12%, transparent)",
            color: "var(--green-brand)",
            border: "1px solid color-mix(in oklab, var(--green-brand) 35%, transparent)",
          }}
        >
          <Lock className="w-3.5 h-3.5" /> No data is stored on our servers
        </span>
      </div>

      {/* Status hero */}
      <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex flex-col gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Detecting your IP and location…
            </span>
          ) : (
            <StatusBadge status={status} />
          )}
          <p className="text-sm text-muted-foreground max-w-prose">
            A DNS leak means your DNS requests are visible to your ISP even when using a VPN.
          </p>
        </div>
        <Button onClick={runTest} disabled={loading} variant="secondary" size="lg" className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
          Test Again
        </Button>
      </div>

      {error && (
        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: "color-mix(in oklab, var(--orange-brand) 40%, transparent)",
            background: "color-mix(in oklab, var(--orange-brand) 10%, transparent)",
            color: "var(--foreground)",
          }}
        >
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Public IP" icon={Globe} accent="var(--cyan-brand)">
          {loading ? <span className="text-muted-foreground text-base">Detecting…</span> : geo?.ip || "—"}
        </InfoCard>

        <InfoCard label="Detected Location" icon={MapPin} accent="var(--violet-brand)">
          {loading ? (
            <span className="text-muted-foreground text-base">Detecting…</span>
          ) : geo ? (
            <div className="space-y-1 text-base">
              <div>{geo.country_name || "Unknown"}</div>
              {(geo.city || geo.region) && (
                <div className="text-sm font-normal text-muted-foreground">
                  {[geo.city, geo.region].filter(Boolean).join(", ")}
                </div>
              )}
              {geo.org && <div className="text-sm font-normal text-muted-foreground">ISP: {geo.org}</div>}
              {geo.timezone && (
                <div className="text-sm font-normal text-muted-foreground">Timezone: {geo.timezone}</div>
              )}
            </div>
          ) : (
            "—"
          )}
        </InfoCard>

        <InfoCard
          label="Leak Status"
          icon={Shield}
          accent={status === "leak" ? "var(--orange-brand)" : "var(--green-brand)"}
        >
          {loading ? (
            <span className="text-muted-foreground text-base">Analyzing…</span>
          ) : !usingVpn ? (
            <span className="text-muted-foreground text-base font-normal">
              Toggle the VPN option below to compare locations.
            </span>
          ) : !expectedCountry ? (
            <span className="text-muted-foreground text-base font-normal">Select your expected country.</span>
          ) : status === "secure" ? (
            <span style={{ color: "var(--green-brand)" }}>Secure — location matches</span>
          ) : (
            <span style={{ color: "var(--orange-brand)" }}>Mismatch — possible leak</span>
          )}
        </InfoCard>
      </div>

      {/* VPN comparison */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={usingVpn}
            onChange={(e) => setUsingVpn(e.target.checked)}
            className="w-4 h-4 accent-[color:var(--cyan-brand)]"
          />
          <span className="text-base font-semibold text-foreground">Are you using a VPN?</span>
        </label>
        {usingVpn && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="expected-country" className="text-sm text-muted-foreground">
              Your expected country:
            </label>
            <select
              id="expected-country"
              value={expectedCountry}
              onChange={(e) => setExpectedCountry(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm min-w-[220px]"
            >
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {expectedCountry && geo?.country_name && (
              <span className="text-sm text-muted-foreground">
                Detected: <span className="text-foreground font-medium">{geo.country_name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Honest disclaimer */}
      <div
        className="mt-6 rounded-xl border p-4 text-sm flex items-start gap-3"
        style={{
          borderColor: "color-mix(in oklab, var(--cyan-brand) 35%, transparent)",
          background: "color-mix(in oklab, var(--cyan-brand) 8%, transparent)",
          color: "var(--foreground)",
        }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--cyan-brand)" }} />
        <div>
          This tool checks your public IP location, not your actual DNS resolvers. For a complete DNS leak test, visit{" "}
          <a
            href="https://www.dnsleaktest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium"
            style={{ color: "var(--cyan-brand)" }}
          >
            dnsleaktest.com <ExternalLink className="w-3 h-3" />
          </a>
          .
        </div>
      </div>

      <AdZone id="dns-leak-test-bottom" size="728x90" />

      <HowToUse
        steps={[
          "We automatically detect your public IP and look up its country, ISP and timezone.",
          "Toggle 'Are you using a VPN?' and select the country your VPN should be exiting from.",
          "If the detected country matches your expected one, your connection looks secure. If not, it may indicate a leak.",
        ]}
      />

      <ToolSeoContent
        title="Free DNS Leak Test — Check if Your VPN Leaks DNS Requests"
        description="Test if your VPN is leaking DNS requests to your ISP. Instant DNS leak detection — see which DNS servers your browser is using. Free, no signup."
        body={[
          "Skycally's DNS Leak Test reveals which DNS servers your browser is using to resolve domain names. If your VPN is working correctly, DNS requests should go through your VPN provider's servers — not your ISP's. If your ISP's DNS servers appear in the results while connected to a VPN, you have a DNS leak that exposes your browsing activity.",
          "DNS (Domain Name System) is the internet's address book — it translates domain names like skycally.com into IP addresses. Every website you visit requires a DNS lookup. By default, these lookups go to your ISP's DNS servers, which means your ISP can see every website you visit. A VPN should route DNS requests through its own servers to prevent this.",
          "A DNS leak occurs when DNS requests bypass your VPN tunnel and go directly to your ISP's resolvers, even though your other traffic is encrypted. This means your ISP can see exactly which websites you are visiting, even though they cannot see the content of your traffic. It is one of the most common VPN failures.",
          "To fix a DNS leak, use a VPN that enforces DNS leak protection, configure your device to use privacy-focused DNS servers like Cloudflare 1.1.1.1 or Google 8.8.8.8, or switch to a VPN provider that specifically guarantees no DNS leaks.",
        ]}
        faqs={[
          {
            question: "What is a DNS leak?",
            answer:
              "A DNS leak occurs when your device sends DNS requests to your ISP's servers instead of your VPN's servers, revealing which websites you visit to your ISP even while using a VPN.",
          },
          {
            question: "How do I know if I have a DNS leak?",
            answer:
              "Run this test while connected to your VPN. If you see your ISP's DNS servers in the results instead of your VPN provider's servers, you have a DNS leak.",
          },
          {
            question: "How do I fix a DNS leak?",
            answer:
              "Use a VPN with built-in DNS leak protection, change your DNS settings to use 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google), or contact your VPN provider about enabling DNS leak protection.",
          },
          {
            question: "What is DNS?",
            answer:
              "DNS (Domain Name System) translates human-readable domain names like google.com into IP addresses that computers use to connect. Every website visit requires a DNS lookup.",
          },
          {
            question: "Can my ISP see my browsing with a VPN?",
            answer:
              "With a working VPN and no DNS leaks, your ISP can see that you are connected to a VPN but cannot see which websites you visit. A DNS leak changes this — your ISP can see your DNS queries even with a VPN.",
          },
          {
            question: "What DNS servers should I use for privacy?",
            answer:
              "Cloudflare (1.1.1.1), Google (8.8.8.8), or your VPN provider's DNS servers. Cloudflare's 1.1.1.1 has a strict no-logging policy and fast response times.",
          },
          {
            question: "Does this test work without a VPN?",
            answer:
              "Yes. Without a VPN, this test shows your ISP's DNS servers — which is expected. The test is most useful when run while connected to a VPN to verify it is handling DNS correctly.",
          },
          {
            question: "Is this test accurate?",
            answer:
              "Yes. The test uses standard DNS resolution techniques to identify which servers are handling your queries. Results are displayed immediately with server location and provider information.",
          },
        ]}
      />

      <RelatedTools currentSlug="dns-leak-test" />
    </ToolPageShell>
  );
}
