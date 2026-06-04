import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Upload, Activity, Waves, Play, RotateCw, X } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";

import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/network-speed-test")({
  head: () => buildToolMeta(toolBySlug("network-speed-test", tools)),
  component: NetworkSpeedTest,
});

type Phase = "idle" | "latency" | "download" | "upload" | "done" | "error";

interface Results {
  ping: number;
  jitter: number;
  download: number;
  upload: number;
}

const CF_DOWN = "https://speed.cloudflare.com/__down?bytes=";

function fmtMbps(v: number) {
  if (!v || !isFinite(v)) return "—";
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
function fmtMs(v: number) {
  if (!v || !isFinite(v)) return "—";
  return v.toFixed(v >= 100 ? 0 : 1);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 800,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") throw err;
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Network request failed");
}

async function measureLatency(controller: AbortController, onProgress: (pct: number) => void) {
  const samples: number[] = [];
  const N = 12;
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    const res = await fetchWithRetry(CF_DOWN + "0&r=" + Math.random(), {
      cache: "no-store",
      signal: controller.signal,
    });
    await res.arrayBuffer();
    const dt = performance.now() - t0;
    samples.push(dt);
    onProgress(((i + 1) / N) * 100);
  }
  samples.sort((a, b) => a - b);
  const trimmed = samples.slice(1, -1);
  const ping = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  let jitterSum = 0;
  for (let i = 1; i < trimmed.length; i++) jitterSum += Math.abs(trimmed[i] - trimmed[i - 1]);
  const jitter = jitterSum / Math.max(1, trimmed.length - 1);
  return { ping, jitter };
}

async function measureDownload(
  controller: AbortController,
  onLive: (mbps: number, pct: number) => void,
) {
  const passes = [1, 10, 10, 25, 25];
  const totalBytesPlanned = passes.reduce((a, b) => a + b, 0) * 1024 * 1024;
  let bytesAcc = 0;
  const speeds: { bytes: number; seconds: number }[] = [];

  for (let i = 0; i < passes.length; i++) {
    const sizeBytes = passes[i] * 1024 * 1024;
    const t0 = performance.now();
    const res = await fetchWithRetry(CF_DOWN + sizeBytes + "&r=" + Math.random(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.body) {
      const buf = await res.arrayBuffer();
      const sec = (performance.now() - t0) / 1000;
      if (i > 0) speeds.push({ bytes: buf.byteLength, seconds: sec });
      bytesAcc += buf.byteLength;
      onLive((buf.byteLength * 8) / sec / 1e6, (bytesAcc / totalBytesPlanned) * 100);
      continue;
    }
    const reader = res.body.getReader();
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        bytesAcc += value.byteLength;
        const sec = (performance.now() - t0) / 1000;
        const mbps = (received * 8) / sec / 1e6;
        onLive(mbps, Math.min(100, (bytesAcc / totalBytesPlanned) * 100));
      }
    }
    const sec = (performance.now() - t0) / 1000;
    if (i > 0) speeds.push({ bytes: received, seconds: sec });
  }
  speeds.sort((a, b) => b.bytes / b.seconds - a.bytes / a.seconds);
  const keep = speeds.slice(0, Math.max(1, Math.ceil(speeds.length * 0.6)));
  const totalBytes = keep.reduce((a, b) => a + b.bytes, 0);
  const totalSec = keep.reduce((a, b) => a + b.seconds, 0);
  return (totalBytes * 8) / totalSec / 1e6;
}

async function measureUploadSpeed(
  controller: AbortController,
  onLive: (mbps: number) => void,
): Promise<number> {
  const CHUNK_MB = 1;
  const CHUNKS = 5;
  const chunkBytes = CHUNK_MB * 1024 * 1024;
  const buf = new Uint8Array(chunkBytes);
  for (let off = 0; off < chunkBytes; off += 65536) {
    crypto.getRandomValues(buf.subarray(off, Math.min(off + 65536, chunkBytes)));
  }
  const samples: { bytes: number; sec: number }[] = [];
  for (let i = 0; i < CHUNKS; i++) {
    const t0 = performance.now();
    await fetchWithRetry("https://speed-upload.skycally-tools.workers.dev", {
      method: "POST",
      body: buf,
      cache: "no-store",
      signal: controller.signal,
    });
    const sec = (performance.now() - t0) / 1000;
    samples.push({ bytes: chunkBytes, sec });
    const totalBytes = samples.reduce((a, s) => a + s.bytes, 0);
    const totalSec = samples.reduce((a, s) => a + s.sec, 0);
    onLive((totalBytes * 8) / totalSec / 1e6);
    if (i < CHUNKS - 1) await new Promise((r) => setTimeout(r, 150));
  }
  const totalBytes = samples.reduce((a, s) => a + s.bytes, 0);
  const totalSec = samples.reduce((a, s) => a + s.sec, 0);
  return (totalBytes * 8) / totalSec / 1e6;
}

const MAX_MBPS = 500;
const ARC_START = 135; // degrees
const ARC_END = 405; // 270° sweep
const ARC_RANGE = ARC_END - ARC_START;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function SpeedGauge({
  mbps,
  phase,
  pingMs,
}: {
  mbps: number;
  phase: Phase;
  pingMs: number;
}) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 130;
  const clamped = Math.max(0, Math.min(MAX_MBPS, mbps));
  const progress = clamped / MAX_MBPS;
  const trackPath = arcPath(cx, cy, r, ARC_START, ARC_END);

  const ticks = Array.from({ length: 11 }, (_, i) => i * 50);

  return (
    <div className="relative" style={{ width: size, height: size * 0.85 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--cyan-brand)" />
            <stop offset="100%" stopColor="var(--violet-brand)" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="color-mix(in oklab, var(--border) 100%, transparent)"
          strokeWidth={16}
          strokeLinecap="round"
        />

        {/* Progress */}
        <motion.path
          d={trackPath}
          fill="none"
          stroke={phase === "upload" ? "var(--violet-brand)" : "url(#gaugeGrad)"}
          strokeWidth={16}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ type: "spring", stiffness: 60, damping: 20, mass: 0.6 }}
          style={{
            filter: `drop-shadow(0 0 8px color-mix(in oklab, ${phase === "upload" ? "var(--violet-brand)" : "var(--cyan-brand)"} 50%, transparent))`,
          }}
        />

        {/* Ticks */}
        {ticks.map((t, i) => {
          const deg = ARC_START + (t / MAX_MBPS) * ARC_RANGE;
          const inner = polar(cx, cy, r - 26, deg);
          const outer = polar(cx, cy, r - 14, deg);
          const label = polar(cx, cy, r - 42, deg);
          return (
            <g key={t}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--muted-foreground)"
                strokeWidth={i % 2 === 0 ? 2 : 1}
                opacity={i % 2 === 0 ? 0.7 : 0.4}
              />
              {i % 2 === 0 && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {t}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {phase === "latency" ? "Latency" : phase === "upload" ? "Upload" : "Download"}
        </div>
        <div
          className="font-display text-6xl font-bold tabular-nums leading-none mt-2"
          style={{ color: phase === "upload" ? "var(--violet-brand)" : "var(--cyan-brand)" }}
        >
          {phase === "latency" ? fmtMs(pingMs) : fmtMbps(clamped)}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {phase === "latency" ? "ms" : "Mbps"}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: typeof Download;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 transition ${
        highlight ? "border-transparent" : "border-border bg-card/60"
      }`}
      style={
        highlight
          ? {
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
              boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="w-4 h-4" style={{ color }} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </motion.div>
  );
}

function NetworkSpeedTest() {
  const tool = toolBySlug("network-speed-test", tools);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, setProgress] = useState(0);
  const [results, setResults] = useState<Results>({ ping: 0, jitter: 0, download: 0, upload: 0 });
  const [live, setLive] = useState({ download: 0, upload: 0 });
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const running = phase === "latency" || phase === "download" || phase === "upload";

  async function runTest() {
    setError(null);
    setResults({ ping: 0, jitter: 0, download: 0, upload: 0 });
    setLive({ download: 0, upload: 0 });
    setProgress(0);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setPhase("latency");
      const { ping, jitter } = await measureLatency(controller, (pct) => {
        setProgress(pct * 0.15);
      });
      setResults((r) => ({ ...r, ping, jitter }));

      setPhase("download");
      const download = await measureDownload(controller, (mbps, pct) => {
        setLive((l) => ({ ...l, download: mbps }));
        setProgress(15 + pct * 0.6);
      });
      setResults((r) => ({ ...r, download }));
      setLive((l) => ({ ...l, download }));

      setPhase("upload");
      const upload = await measureUploadSpeed(controller, (mbps) => {
        setLive((l) => ({ ...l, upload: mbps }));
      });
      setResults((r) => ({ ...r, upload }));

      setProgress(100);
      setPhase("done");
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "AbortError") {
        setPhase("idle");
        setProgress(0);
        return;
      }
      setError(err?.message || "Test failed. Check your connection and try again.");
      setPhase("error");
    } finally {
      controllerRef.current = null;
    }
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  const phaseLabel =
    phase === "latency"
      ? "Measuring latency…"
      : phase === "download"
        ? "Measuring download speed…"
        : phase === "upload"
          ? "Testing upload…"
          : phase === "done"
            ? "Test complete"
            : phase === "error"
              ? "Test failed"
              : "Ready to test";

  const displayDownload = phase === "download" ? live.download : results.download;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={
              phase === "done"
                ? "text-sm font-semibold uppercase tracking-wider"
                : "text-xs uppercase tracking-wider text-muted-foreground"
            }
            style={phase === "done" ? { color: "var(--green-brand)" } : undefined}
          >
            {phaseLabel}
          </div>

          <div className="mt-6 mb-2 relative">
            <SpeedGauge
              mbps={phase === "download" ? live.download : phase === "done" || phase === "upload" ? results.download : 0}
              phase={phase}
              pingMs={results.ping}
            />
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{
                  opacity: 1,
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    "0 0 0 0 color-mix(in oklab, var(--green-brand) 45%, transparent), 0 0 30px 6px color-mix(in oklab, var(--green-brand) 30%, transparent)",
                    "0 0 0 14px color-mix(in oklab, var(--green-brand) 0%, transparent), 0 0 45px 10px color-mix(in oklab, var(--green-brand) 40%, transparent)",
                    "0 0 0 0 color-mix(in oklab, var(--green-brand) 45%, transparent), 0 0 30px 6px color-mix(in oklab, var(--green-brand) 30%, transparent)",
                  ],
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }}
                className="absolute -top-1 right-0 w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl font-bold"
                style={{
                  background: "color-mix(in oklab, var(--green-brand) 22%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--green-brand) 60%, transparent)",
                  color: "var(--green-brand)",
                }}
              >
                ✓
              </motion.div>
            )}
            {phase === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center font-display text-xl font-bold"
                style={{
                  background: "color-mix(in oklab, var(--destructive) 20%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--destructive) 50%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                !
              </motion.div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex gap-3">
            {!running && (
              <Button onClick={runTest} size="lg" className="gap-2">
                {phase === "idle" || phase === "error" ? (
                  <>
                    <Play className="w-4 h-4" /> Run Test
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" /> Test Again
                  </>
                )}
              </Button>
            )}
            {running && (
              <Button onClick={cancel} size="lg" variant="secondary" className="gap-2">
                <X className="w-4 h-4" /> Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          <MetricCard
            label="Download"
            value={fmtMbps(displayDownload)}
            unit="Mbps"
            color="var(--cyan-brand)"
            icon={Download}
            highlight={phase === "download"}
          />
          <MetricCard
            label="Upload"
            value={fmtMbps(results.upload)}
            unit="Mbps"
            color="var(--cyan-brand)"
            icon={Upload}
            highlight={phase === "upload"}
          />
          <MetricCard
            label="Ping"
            value={fmtMs(results.ping)}
            unit="ms"
            color="var(--green-brand)"
            icon={Activity}
            highlight={phase === "latency"}
          />
          <MetricCard
            label="Jitter"
            value={fmtMs(results.jitter)}
            unit="ms"
            color="var(--orange-brand)"
            icon={Waves}
            highlight={phase === "latency"}
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by Cloudflare's global speed test network · runs entirely in your browser
        </p>
      </div>

      <HowToUse
        steps={[
          "Click Run Test to start measuring your connection",
          "Wait about 15 seconds while we test latency and download speed",
          "Review your download, ping and jitter results, or run the test again any time",
        ]}
      />

      <ToolSeoContent
        title="Network Speed Test — Free Internet Download, Ping & Jitter Test"
        description="Free in-browser internet speed test that measures download speed, ping and jitter against Cloudflare's global network in seconds."
        body={[
          "Skycally's Network Speed Test gives you a quick, accurate picture of your internet connection without installing anything. It runs entirely in your browser and uses Cloudflare's worldwide anycast endpoints to measure real download throughput, ping latency and jitter — three numbers that predict how a connection will feel when you stream, game or join a video call.",
          "Download is reported in megabits per second (Mbps). Ping is the round-trip time to the nearest Cloudflare edge, measured in milliseconds. Jitter is the variation between successive ping samples — low jitter matters more than raw bandwidth for video conferencing and online gaming. For most home connections, anything above 25 Mbps down handles 4K streaming, and ping under 50 ms with single-digit jitter feels snappy.",
          "Results vary based on Wi-Fi signal, the device you're using, time of day and other devices on your network. For the most accurate reading, close other tabs and apps, pause downloads, and run the test a couple of times. Nothing is uploaded, logged or stored — every test starts and ends in your browser.",
        ]}
        faqs={[
          {
            question: "How accurate is this speed test?",
            answer:
              "Very accurate for client-side conditions. We use Cloudflare's edge network — the same infrastructure powering speed.cloudflare.com — and measure the actual bytes transferred. Wi-Fi, VPNs, and background traffic on your network can lower the reading compared to a wired test directly from your router.",
          },
          {
            question: "What is a good internet speed?",
            answer:
              "For a single user: 25+ Mbps download covers 4K streaming, 100+ Mbps is comfortable for most households, and 300+ Mbps is solid for heavy multi-user homes. Aim for ping under 50 ms and jitter under 10 ms for smooth gaming and video calls.",
          },
          {
            question: "Why don't you measure upload speed?",
            answer:
              "Reliable in-browser upload measurement requires a dedicated server endpoint with the right CORS headers. To keep this tool fast and dependency-free we focus on download, ping and jitter, which are the metrics that most affect everyday browsing, streaming and video calls.",
          },
          {
            question: "Do you store my test results or IP address?",
            answer:
              "No. The test runs entirely in your browser. We don't log results, store data, or track your IP address. Refreshing the page clears everything.",
          },
        ]}
      />

      <RelatedTools currentSlug="network-speed-test" />
    </ToolPageShell>
  );
}
