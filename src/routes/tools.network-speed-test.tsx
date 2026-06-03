import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Upload, Activity, Waves, Play, RotateCw, X } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
const CF_UP = "https://speed.cloudflare.com/__up";

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
  // Sizes in MB: warmup + measured passes
  const passes = [1, 10, 10, 25, 25];
  let totalBytesPlanned = passes.reduce((a, b) => a + b, 0) * 1024 * 1024;
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
  // Use best 60% of measured passes (drop slowest)
  speeds.sort((a, b) => b.bytes / b.seconds - a.bytes / a.seconds);
  const keep = speeds.slice(0, Math.max(1, Math.ceil(speeds.length * 0.6)));
  const totalBytes = keep.reduce((a, b) => a + b.bytes, 0);
  const totalSec = keep.reduce((a, b) => a + b.seconds, 0);
  return (totalBytes * 8) / totalSec / 1e6;
}

function uploadOnce(
  payload: Uint8Array,
  controller: AbortController,
  onProgress: (loaded: number, elapsedSec: number) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const t0 = performance.now();
    const onAbort = () => {
      xhr.abort();
      const err = new Error("Aborted");
      (err as Error & { name: string }).name = "AbortError";
      reject(err);
    };
    if (controller.signal.aborted) return onAbort();
    controller.signal.addEventListener("abort", onAbort);

    xhr.open("POST", CF_UP + "?r=" + Math.random(), true);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, (performance.now() - t0) / 1000);
    };
    xhr.onload = () => {
      controller.signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve((performance.now() - t0) / 1000);
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      controller.signal.removeEventListener("abort", onAbort);
      reject(new Error("Network error during upload"));
    };
    xhr.ontimeout = () => reject(new Error("Upload timeout"));
    // Send a Blob for broader compatibility
    xhr.send(new Blob([payload.buffer as ArrayBuffer], { type: "application/octet-stream" }));
  });
}

async function uploadOnceWithRetry(
  payload: Uint8Array,
  controller: AbortController,
  onProgress: (loaded: number, elapsedSec: number) => void,
  retries = 3,
): Promise<number> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadOnce(payload, controller, onProgress);
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") throw err;
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed");
}

async function measureUpload(
  controller: AbortController,
  onLive: (mbps: number, pct: number) => void,
) {
  const passes = [1, 8, 8, 8];
  const totalPlanned = passes.reduce((a, b) => a + b, 0) * 1024 * 1024;
  let bytesAccBefore = 0;
  const speeds: { bytes: number; seconds: number }[] = [];

  for (let i = 0; i < passes.length; i++) {
    const sizeBytes = passes[i] * 1024 * 1024;
    const payload = new Uint8Array(sizeBytes);
    // Fill with pseudo-random data to defeat compression
    for (let j = 0; j < sizeBytes; j += 1024) payload[j] = Math.floor(Math.random() * 256);

    const startBytes = bytesAccBefore;
    const sec = await uploadOnceWithRetry(payload, controller, (loaded, elapsed) => {
      if (elapsed > 0.05) {
        const mbps = (loaded * 8) / elapsed / 1e6;
        onLive(mbps, Math.min(100, ((startBytes + loaded) / totalPlanned) * 100));
      }
    });
    bytesAccBefore += sizeBytes;
    if (i > 0 && sec > 0) speeds.push({ bytes: sizeBytes, seconds: sec });
    onLive((sizeBytes * 8) / Math.max(sec, 0.001) / 1e6, Math.min(100, (bytesAccBefore / totalPlanned) * 100));
  }
  speeds.sort((a, b) => b.bytes / b.seconds - a.bytes / a.seconds);
  const keep = speeds.slice(0, Math.max(1, Math.ceil(speeds.length * 0.6)));
  const totalBytes = keep.reduce((a, b) => a + b.bytes, 0);
  const totalSec = keep.reduce((a, b) => a + b.seconds, 0);
  return (totalBytes * 8) / totalSec / 1e6;
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
  const [progress, setProgress] = useState(0);
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
        setProgress(15 + pct * 0.45);
      });
      setResults((r) => ({ ...r, download }));
      setLive((l) => ({ ...l, download }));

      setPhase("upload");
      const upload = await measureUpload(controller, (mbps, pct) => {
        setLive((l) => ({ ...l, upload: mbps }));
        setProgress(60 + pct * 0.4);
      });
      setResults((r) => ({ ...r, upload }));
      setLive((l) => ({ ...l, upload }));

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
          ? "Measuring upload speed…"
          : phase === "done"
            ? "Test complete"
            : phase === "error"
              ? "Test failed"
              : "Ready to test";

  const displayDownload =
    phase === "download" ? live.download : results.download;
  const displayUpload = phase === "upload" ? live.upload : results.upload;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{phaseLabel}</div>

          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 mb-2"
              >
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--cyan-brand) 25%, transparent), transparent 70%)",
                    border: "1px solid color-mix(in oklab, var(--cyan-brand) 40%, transparent)",
                  }}
                >
                  <Activity className="w-12 h-12" style={{ color: "var(--cyan-brand)" }} />
                </div>
              </motion.div>
            )}

            {running && (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 mb-2"
              >
                <div className="font-display text-6xl font-bold tabular-nums" style={{ color: "var(--cyan-brand)" }}>
                  {phase === "latency"
                    ? fmtMs(results.ping || 0)
                    : phase === "download"
                      ? fmtMbps(live.download)
                      : fmtMbps(live.upload)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {phase === "latency" ? "ms" : "Mbps"}
                </div>
              </motion.div>
            )}

            {(phase === "done" || phase === "error") && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 mb-2"
              >
                <div className="font-display text-5xl font-bold" style={{ color: "var(--green-brand)" }}>
                  {phase === "done" ? "✓" : "!"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(running || phase === "done") && (
            <div className="w-full max-w-md mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
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
            value={fmtMbps(displayUpload)}
            unit="Mbps"
            color="var(--violet-brand)"
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
          "Wait about 20 seconds while we test latency, download and upload",
          "Review your speed in the cards or run the test again any time",
        ]}
      />

      <ToolSeoContent
        title="Network Speed Test — Free Internet Speed & Bandwidth Test"
        description="Free in-browser internet speed test that measures download, upload, ping and jitter against Cloudflare's global network in seconds."
        body={[
          "Skycally's Network Speed Test gives you a quick, accurate picture of your internet connection without installing anything. It runs entirely in your browser and uses Cloudflare's worldwide anycast endpoints to measure real download throughput, real upload throughput, ping latency and jitter — the four numbers that actually predict how a connection will feel when you stream, game or join a video call.",
          "Download and upload are reported in megabits per second (Mbps). Ping is the round-trip time to the nearest Cloudflare edge, measured in milliseconds. Jitter is the variation between successive ping samples — low jitter matters more than raw bandwidth for video conferencing and online gaming. For most home connections, anything above 25 Mbps down handles 4K streaming, and ping under 50 ms with single-digit jitter feels snappy.",
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
              "For a single user: 25+ Mbps download covers 4K streaming, 100+ Mbps is comfortable for most households, and 300+ Mbps is solid for heavy multi-user homes. Upload of 10+ Mbps handles HD video calls. Aim for ping under 50 ms and jitter under 10 ms for smooth gaming and video calls.",
          },
          {
            question: "Why is my result lower than my ISP plan?",
            answer:
              "Common causes are Wi-Fi (especially older 2.4 GHz networks), distance from the router, VPNs, other devices using bandwidth, browser overhead, and the device's own network hardware. Run the test on Ethernet next to the modem to see numbers closest to your plan.",
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
