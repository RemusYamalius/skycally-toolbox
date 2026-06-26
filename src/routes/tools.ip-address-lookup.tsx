import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Globe, Copy, Search, MapPin, Building2, Clock, Compass, Map, Flag, Loader2 } from "lucide-react";

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

const IP_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$|^([0-9a-fA-F:]+:+)+[0-9a-fA-F]+$/;

function flagEmoji(code?: string) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(A + (code.toUpperCase().charCodeAt(0) - a), A + (code.toUpperCase().charCodeAt(1) - a));
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
      <div className="mt-3 text-lg font-display font-semibold tabular-nums break-words text-foreground">{value}</div>
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
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
                  <span className="text-2xl leading-none">{flagEmoji(details.country_code)}</span>
                  <span>
                    {details.country_name || "—"}
                    {details.country_code && (
                      <span className="ml-1 text-sm text-muted-foreground">({details.country_code})</span>
                    )}
                  </span>
                </span>
              }
            />
            <InfoCard label="Region / State" icon={Map} accent="var(--violet-brand)" value={details.region || "—"} />
            <InfoCard label="City" icon={MapPin} accent="var(--cyan-brand)" value={details.city || "—"} />
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
                details.timezone ? `${details.timezone}${details.utc_offset ? ` (UTC${details.utc_offset})` : ""}` : "—"
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

      <AdZone id="ip-address-lookup-bottom" size="728x90" />

      <HowToUse
        steps={[
          "We automatically detect and display your public IP address on page load.",
          "Type any IPv4 or IPv6 address into the search box to look up another IP.",
          "Browse location, ISP, timezone and coordinates — and copy the IP with one click.",
        ]}
      />

      <ToolSeoContent
        title="Free IP Address Lookup — Find Your IP, Location & ISP"
        description="Look up any IP address and find its location, ISP, timezone, and more. Check your own public IP instantly. Free, no signup, runs in your browser."
        body={[
          "Skycally's IP Address Lookup tool reveals detailed information about any IP address — including geographic location, ISP (Internet Service Provider), organization, timezone, and connection type. Type any IPv4 or IPv6 address and get results instantly, or leave the field empty to see your own public IP address.",
          "Your public IP address is the address your Internet Service Provider assigns to your connection — it's what websites, servers, and online services see when you browse the web. Unlike your local network IP (192.168.x.x), your public IP identifies your connection on the global internet and can reveal your approximate city and country.",
          "IP geolocation data is sourced from reputable GeoIP databases that map IP ranges to physical locations. Results include city, region, country, postal code, coordinates, timezone, and ASN. Note that geolocation accuracy varies — it's typically accurate to the country and city level, but not to the street or building.",
          "Common uses include checking whether your VPN is working, verifying that a website sees the correct location for localized content, investigating suspicious traffic, or simply satisfying curiosity about where a domain's servers are hosted.",
        ]}
        faqs={[
          {
            question: "What is my public IP address?",
            answer:
              "Your public IP is the address your ISP assigns to your internet connection. It's what websites and servers see when you browse. Use this tool with an empty field to see your current public IP instantly.",
          },
          {
            question: "How accurate is IP geolocation?",
            answer:
              "IP geolocation is typically accurate to the country and city level — usually within 50km of the actual location. It cannot pinpoint a street address. VPNs and proxies will show the server's location, not yours.",
          },
          {
            question: "Can I look up any IP address?",
            answer:
              "Yes. Enter any valid IPv4 (e.g. 8.8.8.8) or IPv6 address and get location and ISP data. Private ranges like 192.168.x.x will return no results as they are not on the public internet.",
          },
          {
            question: "Why does my IP show the wrong city?",
            answer:
              "ISPs route traffic through central hubs, so your IP may geolocate to your ISP's regional office rather than your exact city. VPN users will see the VPN server's location.",
          },
          {
            question: "What is an ISP?",
            answer:
              "ISP stands for Internet Service Provider — the company that provides your internet connection. Your ISP assigns your public IP address.",
          },
          {
            question: "What is an ASN?",
            answer:
              "ASN (Autonomous System Number) is a unique identifier for a network on the internet. Each ISP and major organization has one or more ASNs that group their IP ranges.",
          },
          {
            question: "Does this tool store my IP address?",
            answer:
              "No. Lookups are performed client-side via a third-party GeoIP API. Your IP is not logged or stored by Skycally.",
          },
          {
            question: "What is the difference between IPv4 and IPv6?",
            answer:
              "IPv4 uses 32-bit addresses (e.g. 8.8.8.8) with about 4 billion possible addresses. IPv6 uses 128-bit addresses with virtually unlimited addresses. Both are supported by this tool.",
          },
        ]}
      />

      <RelatedTools currentSlug="ip-address-lookup" />
    </ToolPageShell>
  );
}
