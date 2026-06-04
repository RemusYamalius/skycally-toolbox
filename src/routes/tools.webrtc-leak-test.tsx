import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Globe, Wifi, CheckCircle2, XCircle, Loader2, RotateCw, AlertTriangle } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/webrtc-leak-test")({
  head: () => buildToolMeta(toolBySlug("webrtc-leak-test", tools)),
  component: WebrtcLeakTestPage,
});

const IP_REGEX = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})|([a-f0-9]{1,4}(?::[a-f0-9]{0,4}){2,})/i;

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6 link-local / unique-local
    const lower = ip.toLowerCase();
    return lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd") || lower === "::1";
  }
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function detectWebRtcIps(timeoutMs = 4000): Promise<string[]> {
  const ips = new Set<string>();
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  pc.createDataChannel("");

  return await new Promise<string[]>((resolve) => {
    const done = () => {
      try {
        pc.close();
      } catch {
        /* noop */
      }
      resolve(Array.from(ips));
    };
    const timer = setTimeout(done, timeoutMs);

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        clearTimeout(timer);
        done();
        return;
      }
      const m = event.candidate.candidate.match(IP_REGEX);
      if (m && m[0]) ips.add(m[0]);
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {
        clearTimeout(timer);
        done();
      });
  });
}

async function fetchPublicIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json");
  if (!res.ok) throw new Error("Could not fetch public IP");
  const data = (await res.json()) as { ip: string };
  return data.ip;
}

type LeakStatus = "safe" | "leak" | "unknown";

function StatusBadge({ status }: { status: LeakStatus }) {
  if (status === "safe") {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
        style={{
          background: "color-mix(in oklab, var(--green-brand) 18%, transparent)",
          color: "var(--green-brand)",
          border: "1px solid color-mix(in oklab, var(--green-brand) 40%, transparent)",
        }}
      >
        <CheckCircle2 className="w-5 h-5" /> No Leak Detected
      </span>
    );
  }
  if (status === "leak") {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
        style={{
          background: "color-mix(in oklab, var(--destructive) 15%, transparent)",
          color: "var(--destructive)",
          border: "1px solid color-mix(in oklab, var(--destructive) 40%, transparent)",
        }}
      >
        <XCircle className="w-5 h-5" /> WebRTC Leak Detected
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold"
      style={{
        background: "color-mix(in oklab, var(--orange-brand) 15%, transparent)",
        color: "var(--orange-brand)",
        border: "1px solid color-mix(in oklab, var(--orange-brand) 40%, transparent)",
      }}
    >
      <AlertTriangle className="w-5 h-5" /> Unknown
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

function WebrtcLeakTestPage() {
  const tool = toolBySlug("webrtc-leak-test", tools);
  const [loading, setLoading] = useState(true);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [webrtcIps, setWebrtcIps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPublicIp(null);
    setWebrtcIps([]);
    try {
      const [ip, rtcIps] = await Promise.all([fetchPublicIp().catch(() => null), detectWebRtcIps()]);
      if (!ip) setError("Could not fetch your public IP. Comparison may be incomplete.");
      setPublicIp(ip);
      setWebrtcIps(rtcIps);
    } catch (e) {
      setError((e as Error).message || "Test failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const publicWebrtcIps = webrtcIps.filter((ip) => !isPrivateIp(ip));
  const localIps = webrtcIps.filter((ip) => isPrivateIp(ip));

  let status: LeakStatus = "unknown";
  if (!loading && publicIp) {
    if (publicWebrtcIps.length === 0) status = "safe";
    else if (publicWebrtcIps.every((ip) => ip === publicIp)) status = "safe";
    else status = "leak";
  }

  const realIp = publicWebrtcIps.find((ip) => ip !== publicIp);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* Status hero */}
      <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex flex-col gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Running WebRTC leak test…
            </span>
          ) : (
            <StatusBadge status={status} />
          )}
          {!loading && status === "leak" && realIp && (
            <div className="text-sm text-foreground">
              Your real IP appears to be{" "}
              <span className="font-semibold" style={{ color: "var(--destructive)" }}>
                {realIp}
              </span>
              .
            </div>
          )}
          <p className="text-sm text-muted-foreground max-w-prose">
            WebRTC can reveal your real IP address even when using a VPN.
          </p>
        </div>
        <Button onClick={runTest} disabled={loading} variant="secondary" size="lg" className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
          Run Test Again
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

      {/* Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Public IP (VPN/Proxy)" icon={Globe} accent="var(--cyan-brand)">
          {loading ? <span className="text-muted-foreground text-base">Detecting…</span> : publicIp || "—"}
        </InfoCard>

        <InfoCard label="WebRTC Detected IP(s)" icon={Wifi} accent="var(--violet-brand)">
          {loading ? (
            <span className="text-muted-foreground text-base">Detecting…</span>
          ) : publicWebrtcIps.length > 0 ? (
            <div className="space-y-1">
              {publicWebrtcIps.map((ip) => (
                <div key={ip}>{ip}</div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-base">None detected</span>
          )}
          {!loading && localIps.length > 0 && (
            <div className="mt-2 text-xs font-normal text-muted-foreground">
              Local: {localIps.join(", ")}
            </div>
          )}
        </InfoCard>

        <InfoCard
          label="Leak Status"
          icon={Shield}
          accent={status === "leak" ? "var(--destructive)" : "var(--green-brand)"}
        >
          {loading ? (
            <span className="text-muted-foreground text-base">Analyzing…</span>
          ) : status === "safe" ? (
            <span style={{ color: "var(--green-brand)" }}>Safe — IPs match</span>
          ) : status === "leak" ? (
            <span style={{ color: "var(--destructive)" }}>Leak — IPs differ</span>
          ) : (
            <span style={{ color: "var(--orange-brand)" }}>Unknown</span>
          )}
        </InfoCard>
      </div>

      <HowToUse
        steps={[
          "We automatically run the WebRTC leak test as soon as the page loads.",
          "Compare your public IP (from your VPN/proxy) with any IPs exposed via WebRTC.",
          "If a different real IP is detected, your browser is leaking — disable WebRTC or use a VPN that blocks it.",
        ]}
      />

      <ToolSeoContent
        title="Free WebRTC Leak Test — Check if Your VPN Is Leaking Your IP"
        description="Instantly check if WebRTC is exposing your real IP address behind a VPN or proxy. Free, private and runs entirely in your browser."
        body={[
          "A WebRTC leak happens when your browser's real-time communication APIs reveal your real public IP address — even when you're connected to a VPN or proxy. Because WebRTC uses STUN servers to discover network paths, it can bypass your VPN tunnel and expose the underlying IP that your VPN was meant to hide. Our free WebRTC Leak Test detects this in seconds.",
          "The tool fetches your visible public IP from ipify and then uses the browser's RTCPeerConnection API with a public STUN server to discover any IPs your browser would expose to a remote peer. It then compares the two: if they match, you're safe; if WebRTC reveals a different public IP, you have a leak and your real address is being exposed.",
          "Everything runs entirely in your browser. No IPs, results, or test data are sent to or stored on our servers. To fix a WebRTC leak you can disable WebRTC via a browser extension, use a VPN that explicitly blocks WebRTC, or switch to a browser that lets you turn it off in settings.",
        ]}
        faqs={[
          {
            question: "What is a WebRTC leak?",
            answer:
              "It's when your browser's WebRTC APIs expose your real public IP address to websites, even though you're connected to a VPN or proxy that should hide it.",
          },
          {
            question: "How do you detect a WebRTC leak?",
            answer:
              "We use the browser's RTCPeerConnection API with a public STUN server to discover IP candidates, then compare them against your visible public IP from ipify. If they differ, WebRTC is leaking.",
          },
          {
            question: "Is this WebRTC leak test private?",
            answer:
              "Yes. The test runs entirely in your browser. We do not log, store, or share your IP address or test results on our servers.",
          },
          {
            question: "How do I fix a WebRTC leak?",
            answer:
              "Use a VPN that blocks WebRTC, install a browser extension that disables WebRTC, or switch to a browser like Brave or Firefox where WebRTC can be disabled in settings.",
          },
        ]}
      />

      <RelatedTools currentSlug="webrtc-leak-test" />
    </ToolPageShell>
  );
}
