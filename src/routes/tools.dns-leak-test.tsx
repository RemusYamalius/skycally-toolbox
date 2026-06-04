import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Globe, MapPin, CheckCircle2, AlertTriangle, Loader2, RotateCw, ExternalLink, Lock } from "lucide-react";

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
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Netherlands", "Switzerland", "Sweden", "Norway", "Finland", "Denmark",
  "Spain", "Italy", "Portugal", "Ireland", "Belgium", "Austria", "Poland",
  "Czechia", "Romania", "Greece", "Turkey", "Russia", "Ukraine",
  "Japan", "South Korea", "China", "Hong Kong", "Singapore", "Taiwan",
  "India", "Indonesia", "Malaysia", "Thailand", "Vietnam", "Philippines",
  "Israel", "United Arab Emirates", "Saudi Arabia", "Egypt", "South Africa",
  "Brazil", "Argentina", "Mexico", "Chile", "Colombia", "New Zealand",
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
      <div className="mt-3 text-lg font-display font-semibold tabular-nums break-words text-foreground">
        {children}
      </div>
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
    status =
      (geo.country_name || "").trim().toLowerCase() === expectedCountry.trim().toLowerCase()
        ? "secure"
        : "leak";
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
              {geo.org && (
                <div className="text-sm font-normal text-muted-foreground">ISP: {geo.org}</div>
              )}
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
            <span className="text-muted-foreground text-base font-normal">
              Select your expected country.
            </span>
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

      <HowToUse
        steps={[
          "We automatically detect your public IP and look up its country, ISP and timezone.",
          "Toggle 'Are you using a VPN?' and select the country your VPN should be exiting from.",
          "If the detected country matches your expected one, your connection looks secure. If not, it may indicate a leak.",
        ]}
      />

      <ToolSeoContent
        title="Free DNS & IP Leak Check — Verify Your VPN Location Online"
        description="Quickly check your public IP, geolocation and ISP, and compare them against your expected VPN exit country. Free and runs entirely in your browser."
        body={[
          "When you connect through a VPN or proxy, the rest of the internet should only see the VPN's IP address and location — not your real one. Our DNS & IP Leak Check fetches your visible public IP and looks up its country, region, ISP and timezone so you can confirm at a glance whether your traffic appears to be exiting from the expected location.",
          "Toggle the 'Are you using a VPN?' option and pick the country your VPN should be routing through. We compare it against the country detected from your public IP: if they match, your connection looks secure; if they differ, your DNS or IP may be leaking your real location to the websites you visit.",
          "Everything runs entirely in your browser using public APIs (ipify and ipapi.co). No IPs, locations, or results are sent to or stored on our servers. For a deeper analysis that inspects which DNS resolvers your device is actually using, we recommend pairing this tool with dnsleaktest.com.",
        ]}
        faqs={[
          {
            question: "What is a DNS leak?",
            answer:
              "A DNS leak happens when your DNS queries are sent outside your VPN tunnel — typically to your ISP — so they can see which websites you visit even though your traffic looks encrypted.",
          },
          {
            question: "Does this tool detect every kind of DNS leak?",
            answer:
              "No. This tool compares your public IP's country with your expected VPN country. A full DNS leak test requires probing your actual DNS resolvers, which can't be done reliably from the browser — for that, use dnsleaktest.com.",
          },
          {
            question: "Is this tool private?",
            answer:
              "Yes. Lookups run directly from your browser via public APIs (ipify and ipapi.co). We don't log, store, or share your IP or location on our servers.",
          },
          {
            question: "Why does my detected country differ from my VPN's country?",
            answer:
              "It could mean your VPN disconnected, you're connected to a different exit server than expected, or your traffic is being routed outside the VPN tunnel — all signs you should investigate.",
          },
        ]}
      />

      <RelatedTools currentSlug="dns-leak-test" />
    </ToolPageShell>
  );
}
