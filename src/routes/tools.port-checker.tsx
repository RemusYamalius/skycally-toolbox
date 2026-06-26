import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Network, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/port-checker")({
  head: () => buildToolMeta(toolBySlug("port-checker", tools)),
  component: PortCheckerPage,
});

type PortMeta = { port: number; label: string; description: string; testable: boolean };

const COMMON_PORTS: PortMeta[] = [
  { port: 80, label: "HTTP", description: "Standard unencrypted web traffic.", testable: true },
  { port: 443, label: "HTTPS", description: "Secure encrypted web traffic (TLS).", testable: true },
  {
    port: 8080,
    label: "HTTP-Alt",
    description: "Alternative HTTP port, often used by proxies and dev servers.",
    testable: true,
  },
  { port: 22, label: "SSH", description: "Secure remote shell access to servers.", testable: false },
  {
    port: 21,
    label: "FTP",
    description: "File Transfer Protocol for uploading and downloading files.",
    testable: false,
  },
  { port: 3306, label: "MySQL", description: "MySQL / MariaDB database server connections.", testable: false },
  { port: 3389, label: "RDP", description: "Microsoft Remote Desktop Protocol.", testable: false },
];

const PORT_MAP = new Map(COMMON_PORTS.map((p) => [p.port, p]));
const HOST_REGEX =
  /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$|^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

type Status = "open" | "closed" | "unknown";
type Result = { status: Status; ms: number; host: string; port: number };

function cleanHost(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

async function checkPort(host: string, port: number, timeoutMs = 4000): Promise<Result> {
  const scheme = port === 443 ? "https" : "http";
  const url = `${scheme}://${host}:${port}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    await fetch(url, { mode: "no-cors", signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    return { status: "open", ms: Math.round(performance.now() - t0), host, port };
  } catch (err) {
    clearTimeout(timer);
    const ms = Math.round(performance.now() - t0);
    if ((err as Error).name === "AbortError") {
      return { status: "closed", ms: timeoutMs, host, port };
    }
    // A fast network-level failure means the connection couldn't be established.
    return { status: "closed", ms, host, port };
  }
}

function PortCheckerPage() {
  const tool = toolBySlug("port-checker", tools);
  const [host, setHost] = useState("");
  const [portStr, setPortStr] = useState("443");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const portNum = Number.parseInt(portStr, 10);
  const validPort = Number.isFinite(portNum) && portNum >= 1 && portNum <= 65535;
  const knownMeta = validPort ? PORT_MAP.get(portNum) : undefined;
  const isTestable = validPort && (knownMeta ? knownMeta.testable : [80, 443, 8080].includes(portNum));

  const portInfoText = useMemo(() => {
    if (!validPort) return "Enter a port number between 1 and 65535.";
    if (knownMeta) return `Port ${knownMeta.port} — ${knownMeta.label}: ${knownMeta.description}`;
    return `Port ${portNum} — custom port. Only HTTP-class ports (80, 443, 8080) can be tested from the browser.`;
  }, [validPort, knownMeta, portNum]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const h = cleanHost(host);
    if (!h || !HOST_REGEX.test(h)) {
      setError("Please enter a valid hostname or IPv4 address.");
      return;
    }
    if (!validPort) {
      setError("Please enter a valid port between 1 and 65535.");
      return;
    }
    if (!isTestable) return;
    setLoading(true);
    try {
      const r = await checkPort(h, portNum);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]"
      >
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Host</label>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com or 8.8.8.8"
            className="mt-1 h-11"
            autoComplete="off"
            inputMode="url"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Port</label>
          <Input
            value={portStr}
            onChange={(e) => setPortStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
            placeholder="443"
            className="mt-1 h-11 tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="lg" className="gap-2 w-full sm:w-auto" disabled={loading || !isTestable}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
            Check Port
          </Button>
        </div>
      </form>

      {/* Quick-select chips */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Common ports</div>
        <div className="flex flex-wrap gap-2">
          {COMMON_PORTS.map((p) => {
            const active = portNum === p.port;
            return (
              <button
                key={p.port}
                type="button"
                onClick={() => setPortStr(String(p.port))}
                title={p.testable ? `${p.label} — ${p.description}` : `${p.label} — cannot be tested from the browser`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card/60 text-foreground hover:bg-card"
                }`}
              >
                <span className="tabular-nums font-medium">{p.port}</span>
                <span className="text-xs opacity-80">{p.label}</span>
                {!p.testable && (
                  <AlertTriangle
                    className="w-3.5 h-3.5"
                    style={{ color: active ? "currentColor" : "var(--orange-brand)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{portInfoText}</p>
      </div>

      {/* Non-testable notice */}
      {validPort && !isTestable && (
        <div
          className="mt-4 rounded-2xl border p-4 sm:p-5 flex gap-3"
          style={{
            borderColor: "color-mix(in oklab, var(--orange-brand) 40%, transparent)",
            background: "color-mix(in oklab, var(--orange-brand) 10%, transparent)",
          }}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--orange-brand)" }} />
          <div className="text-sm text-foreground">
            <strong>This port cannot be tested directly from the browser</strong> due to security restrictions. Browsers
            only allow connections to HTTP-class ports (80, 443, 8080). Use a desktop tool like{" "}
            <span className="font-medium">Nmap</span> or an online service like{" "}
            <a
              href="https://portchecker.co"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--cyan-brand)" }}
            >
              portchecker.co
            </a>
            .
          </div>
        </div>
      )}

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

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              {result.status === "open" ? (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                  style={{
                    background: "color-mix(in oklab, var(--green-brand) 18%, transparent)",
                    color: "var(--green-brand)",
                    border: "1px solid color-mix(in oklab, var(--green-brand) 40%, transparent)",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> OPEN
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                  style={{
                    background: "color-mix(in oklab, var(--destructive) 15%, transparent)",
                    color: "var(--destructive)",
                    border: "1px solid color-mix(in oklab, var(--destructive) 40%, transparent)",
                  }}
                >
                  <XCircle className="w-4 h-4" /> CLOSED
                </span>
              )}
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{result.host}</span>
                <span className="opacity-60">:</span>
                <span className="tabular-nums text-foreground font-medium">{result.port}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="tabular-nums text-foreground font-medium">{result.ms} ms</span>
            </div>
          </div>
        </motion.div>
      )}

      <AdZone id="port-checker-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Enter a hostname or IPv4 address and the port you want to check.",
          "Use the common port chips to fill in well-known ports like 80, 443 or 8080.",
          "Click Check Port — the result and response time appear instantly. No data leaves your browser.",
        ]}
      />

      <ToolSeoContent
        title="Free Port Checker — Test if a TCP Port is Open Online"
        description="Check if any TCP port is open or closed on any host or IP address. Free online port scanner — test port connectivity instantly, no signup required."
        body={[
          "Skycally's Port Checker tests whether a specific TCP port is open or closed on any host or IP address. Enter a hostname or IP and a port number, and the tool checks connectivity in seconds — useful for debugging firewall rules, verifying server configurations, and troubleshooting network connectivity issues.",
          "Ports are logical endpoints for network communication. Each service runs on a standard port: web servers use port 80 (HTTP) and 443 (HTTPS), SSH uses port 22, FTP uses port 21, and databases like MySQL use port 3306. Checking whether a port is open confirms that the service is running and accessible from the internet, and that no firewall is blocking the connection.",
          "Common use cases include verifying that a web server is publicly accessible, checking if an SSH port has been changed for security, confirming that a game server or application port is reachable, troubleshooting why a service appears offline, and testing whether a firewall rule is correctly blocking unwanted ports.",
          "Note that this tool checks TCP connectivity from our servers to the target host — it cannot test UDP ports, and results reflect reachability from an external perspective. If a port appears closed, it may be blocked by a firewall, the service may not be running, or the host may be offline.",
        ]}
        faqs={[
          {
            question: "What does it mean if a port is open?",
            answer:
              "An open port means the host is actively listening for connections on that port — the service is running and reachable. A closed port means either the service is not running or a firewall is blocking access.",
          },
          {
            question: "Which ports should I check?",
            answer:
              "Common ports: 80 (HTTP), 443 (HTTPS), 22 (SSH), 21 (FTP), 25 (SMTP), 3306 (MySQL), 5432 (PostgreSQL), 27017 (MongoDB), 8080 (alternative HTTP), 3389 (RDP).",
          },
          {
            question: "Can I check UDP ports?",
            answer:
              "No. This tool checks TCP ports only. UDP is a connectionless protocol and cannot be tested with a simple connect check.",
          },
          {
            question: "Why does my port appear closed even though my service is running?",
            answer:
              "Common reasons: a firewall is blocking the port, the service is bound to localhost (127.0.0.1) instead of all interfaces (0.0.0.0), or a router/NAT is not forwarding the port correctly.",
          },
          {
            question: "Can I check ports on my local network?",
            answer:
              "No. This tool checks ports from external servers, so it cannot reach local/private IP addresses like 192.168.x.x or 10.x.x.x.",
          },
          {
            question: "What is a firewall?",
            answer:
              "A firewall is a network security system that controls incoming and outgoing traffic based on rules. It can block specific ports to prevent unauthorized access. Cloud providers like AWS and Google Cloud have firewalls called Security Groups.",
          },
          {
            question: "Is port scanning legal?",
            answer:
              "Scanning your own servers is always legal. Scanning servers you do not own without permission may be illegal in many jurisdictions. Only use this tool on hosts you own or have explicit permission to test.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. The port checker is fully responsive and works on smartphones and tablets.",
          },
        ]}
      />

      <RelatedTools currentSlug="port-checker" />
    </ToolPageShell>
  );
}
