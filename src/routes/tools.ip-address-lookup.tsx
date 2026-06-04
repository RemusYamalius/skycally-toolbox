import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Globe,
  Copy,
  Search,
  MapPin,
  Building2,
  Clock,
  Compass,
  Map,
  Flag,
  Loader2,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/ip-address-lookup")({
  head: () => buildToolMeta(toolBySlug("ip-address-lookup", tools)),
  component: IpAddressLookupPage,
});

interface IpDetails {
  ip: string;
  country_name?: string;
  country_code?: string;
  region?: string;
  city?: string;
  org?: string;
  asn?: string;
  timezone?: string;
  utc_offset?: string;
  latitude?: number;
  longitude?: number;
  error?: boolean;
  reason?: string;
}

const IP_REGEX =
  /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$|^([0-9a-fA-F:]+:+)+[0-9a-fA-F]+$/;

function flagEmoji(code?: string) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + (code.toUpperCase().charCodeAt(0) - a),
    A + (code.toUpperCase().charCodeAt(1) - a),
  );
}

async function fetchIpDetails(ip: string): Promise<IpDetails> {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const data: IpDetails = await res.json();
  if (data.error) throw new Error(data.reason || "Lookup failed");
  return data;
}

function InfoCard({
  label,
  value,
  icon: Icon,
  accent,
  action,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Globe;
  accent?: string;
  action?: React.ReactNode;
}) {
  const color = accent || "var(--cyan-brand)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className="w-4 h-4" style={{ color }} />
          {label}
        </div>
        {action}
      </div>
      <div className="mt-3 text-lg font-display font-semibold tabular-nums break-words text-foreground">
        {value}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="h-3 w-24 skeleton rounded" />
      <div className="mt-4 h-6 w-40 skeleton rounded" />
    </div>
  );
}

function IpAddressLookupPage() {
  const tool = toolBySlug("ip-address-lookup", tools);
  const [ownIp, setOwnIp] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<IpDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIp, setActiveIp] = useState<string | null>(null);

  const loadIp = useCallback(async (ip: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIpDetails(ip);
      setDetails(data);
      setActiveIp(data.ip || ip);
    } catch (e) {
      const err = e as Error;
      setDetails(null);
      setError(err.message || "Could not look up this IP address.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = (await res.json()) as { ip: string };
        if (cancelled) return;
        setOwnIp(data.ip);
        await loadIp(data.ip);
      } catch {
        if (!cancelled) setError("Could not detect your IP address.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIp]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ip = query.trim();
    if (!ip) return;
    if (!IP_REGEX.test(ip)) {
      setError("Please enter a valid IPv4 or IPv6 address.");
      return;
    }
    loadIp(ip);
  }

  function resetToOwn() {
    if (ownIp) {
      setQuery("");
      loadIp(ownIp);
    }
  }

  async function copyIp() {
    if (!details?.ip) return;
    try {
      await navigator.clipboard.writeText(details.ip);
      toast.success("IP address copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  const isOwn = ownIp && activeIp === ownIp;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* Search bar */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter any IPv4 or IPv6 address (e.g. 8.8.8.8)"
            className="pl-9 h-11"
            inputMode="text"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Lookup
          </Button>
          {ownIp && !isOwn && (
            <Button type="button" variant="secondary" size="lg" onClick={resetToOwn}>
              My IP
            </Button>
          )}
        </div>
      </form>

      {/* Status */}
      <div className="mt-4 text-sm text-muted-foreground">
        {loading && (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up details…
          </span>
        )}
        {!loading && isOwn && details && (
          <span>
            Showing details for <strong className="text-foreground">your IP address</strong>.
          </span>
        )}
        {!loading && !isOwn && details && (
          <span>
            Showing details for <strong className="text-foreground">{details.ip}</strong>.
          </span>
        )}
      </div>

      {error && (
        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: "color-mix(in oklab, var(--destructive) 40%, transparent)",
            background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !details ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : details ? (
          <>
            <InfoCard
              label="IP Address"
              icon={Globe}
              accent="var(--cyan-brand)"
              value={details.ip || "—"}
              action={
                <button
                  type="button"
                  onClick={copyIp}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition rounded-md px-2 py-1 border border-border"
                  aria-label="Copy IP"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              }
            />
            <InfoCard
              label="Country"
              icon={Flag}
              accent="var(--orange-brand)"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="text-2xl leading-none">
                    {flagEmoji(details.country_code)}
                  </span>
                  <span>
                    {details.country_name || "—"}
                    {details.country_code && (
                      <span className="ml-1 text-sm text-muted-foreground">
                        ({details.country_code})
                      </span>
                    )}
                  </span>
                </span>
              }
            />
            <InfoCard
              label="Region / State"
              icon={Map}
              accent="var(--violet-brand)"
              value={details.region || "—"}
            />
            <InfoCard
              label="City"
              icon={MapPin}
              accent="var(--cyan-brand)"
              value={details.city || "—"}
            />
            <InfoCard
              label="ISP / Organization"
              icon={Building2}
              accent="var(--green-brand)"
              value={details.org || details.asn || "—"}
            />
            <InfoCard
              label="Timezone"
              icon={Clock}
              accent="var(--violet-brand)"
              value={
                details.timezone
                  ? `${details.timezone}${details.utc_offset ? ` (UTC${details.utc_offset})` : ""}`
                  : "—"
              }
            />
            <InfoCard
              label="Coordinates"
              icon={Compass}
              accent="var(--orange-brand)"
              value={
                details.latitude !== undefined && details.longitude !== undefined
                  ? `${details.latitude.toFixed(4)}, ${details.longitude.toFixed(4)}`
                  : "—"
              }
              action={
                details.latitude !== undefined && details.longitude !== undefined ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${details.latitude}&mlon=${details.longitude}#map=10/${details.latitude}/${details.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition rounded-md px-2 py-1 border border-border"
                  >
                    View map
                  </a>
                ) : undefined
              }
            />
          </>
        ) : null}
      </div>

      <HowToUse
        steps={[
          "We automatically detect and display your public IP address on page load.",
          "Type any IPv4 or IPv6 address into the search box to look up another IP.",
          "Browse location, ISP, timezone and coordinates — and copy the IP with one click.",
        ]}
      />

      <ToolSeoContent
        title="Free IP Address Lookup — Find Location, ISP and Timezone"
        description="Instantly look up any IPv4 or IPv6 address to see country, region, city, ISP, timezone and GPS coordinates. Free, private, and runs entirely in your browser."
        body={[
          "An IP address lookup tells you where on the internet a given device is connecting from. Our free IP Address Lookup tool detects your own public IP automatically and lets you check any other IP in seconds — no signup, no installs, and no data stored on our servers.",
          "Every result includes the country with its flag, region or state, city, ISP or organization, timezone with UTC offset, and approximate latitude and longitude. This is useful for debugging network issues, verifying suspicious login locations, checking your VPN, or simply learning how the internet routes your traffic.",
          "All lookups run directly in your browser using public APIs (ipify for your own IP and ipapi.co for geolocation details). We never log, save, or share your IP address. Your privacy stays under your control while you get fast, accurate results.",
        ]}
        faqs={[
          {
            question: "What is an IP address lookup?",
            answer:
              "It's a way to translate an IP address into useful metadata: the country, region, city, ISP and approximate coordinates of the device that owns it.",
          },
          {
            question: "Is this tool free and private?",
            answer:
              "Yes. The tool is completely free and runs in your browser. No IP addresses are stored, logged, or shared on our servers.",
          },
          {
            question: "How accurate is IP geolocation?",
            answer:
              "Country-level data is highly accurate. City-level data is approximate — IP databases usually place you within the same metro area, not at your exact street address.",
          },
          {
            question: "Can I look up IPv6 addresses?",
            answer:
              "Yes. Both IPv4 (like 8.8.8.8) and IPv6 addresses are supported. Just paste the address into the search box and click Lookup.",
          },
        ]}
      />

      <RelatedTools currentSlug="ip-address-lookup" />
    </ToolPageShell>
  );
}
