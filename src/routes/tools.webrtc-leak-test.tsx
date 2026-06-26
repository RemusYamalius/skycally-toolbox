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
      <div className="mt-3 text-lg font-display font-semibold tabular-nums break-words text-foreground">{children}</div>
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
            <div className="mt-2 text-xs font-normal text-muted-foreground">Local: {localIps.join(", ")}</div>
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

      <AdZone id="webrtc-leak-test-bottom" size="728x90" />

      <HowToUse
        steps={[
          "We automatically run the WebRTC leak test as soon as the page loads.",
          "Compare your public IP (from your VPN/proxy) with any IPs exposed via WebRTC.",
          "If a different real IP is detected, your browser is leaking — disable WebRTC or use a VPN that blocks it.",
        ]}
      />

      <ToolSeoContent
        title="Free WebRTC Leak Test — Check if Your VPN Leaks Your Real IP"
        description="Test if your VPN or browser is leaking your real IP address through WebRTC. Instant browser-based WebRTC leak detection. Free, no signup required."
        body={[
          "Skycally's WebRTC Leak Test checks whether your browser is revealing your real IP address through the WebRTC protocol — a common security vulnerability that can expose your true location even when using a VPN. The test detects both your public IP and any local network IPs that WebRTC may be leaking to websites.",
          "WebRTC (Web Real-Time Communication) is a browser technology used for video calls, voice chat, and peer-to-peer file sharing. It requires knowing the actual IP addresses of both parties to establish a direct connection. This means your browser may reveal your real IP to websites through WebRTC even when your VPN masks it at the network level.",
          "A WebRTC leak is particularly dangerous for VPN users who rely on location privacy. A website can use JavaScript to trigger a WebRTC connection attempt, which forces your browser to reveal all its network interfaces — including your real public IP and local network IPs. Many popular VPN apps fail to prevent this.",
          "If this test shows your real IP address while connected to a VPN, your VPN has a WebRTC leak. Solutions include using a VPN that blocks WebRTC leaks, disabling WebRTC in your browser settings, installing a browser extension that blocks WebRTC, or switching to a browser with better privacy defaults such as Firefox or Brave.",
        ]}
        faqs={[
          {
            question: "What is a WebRTC leak?",
            answer:
              "A WebRTC leak occurs when your browser reveals your real IP address through the WebRTC protocol, even when connected to a VPN. Websites can use JavaScript to detect these IPs without your knowledge.",
          },
          {
            question: "How do I fix a WebRTC leak?",
            answer:
              "Use a VPN that blocks WebRTC leaks, disable WebRTC in your browser settings, or install a browser extension like uBlock Origin with WebRTC blocking enabled. Firefox and Brave have stronger WebRTC privacy defaults.",
          },
          {
            question: "Does every VPN prevent WebRTC leaks?",
            answer:
              "No. Many VPNs fail to block WebRTC leaks. If this test shows your real IP while connected to a VPN, your VPN is not protecting you from WebRTC exposure.",
          },
          {
            question: "What is my local IP?",
            answer:
              "Your local IP (e.g. 192.168.1.x) is your address on your local network assigned by your router. WebRTC can reveal this alongside your public IP, which can help identify your network even when your public IP is masked.",
          },
          {
            question: "Is WebRTC dangerous?",
            answer:
              "WebRTC itself is not dangerous — it enables useful features like video calls. The privacy risk comes from websites using it to detect your real IP. The risk is highest for VPN users relying on location privacy.",
          },
          {
            question: "How do I disable WebRTC in Chrome?",
            answer:
              "Chrome does not have a built-in toggle to disable WebRTC. Use an extension like uBlock Origin with WebRTC blocking enabled, or switch to Firefox and set media.peerconnection.enabled to false in about:config.",
          },
          {
            question: "What browsers are safest against WebRTC leaks?",
            answer:
              "Brave blocks WebRTC leaks by default. Firefox can be configured to prevent leaks via about:config. Chrome and Edge require extensions for WebRTC leak protection.",
          },
          {
            question: "Does this test store my IP address?",
            answer:
              "No. The test runs entirely in your browser using WebRTC APIs. No data is sent to or stored on Skycally's servers.",
          },
        ]}
      />

      <RelatedTools currentSlug="webrtc-leak-test" />
    </ToolPageShell>
  );
}
