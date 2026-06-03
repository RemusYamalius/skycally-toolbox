## Network Speed Test Tool

Add a new client-side tool at `/tools/network-speed-test` that measures download, upload, latency, and jitter against Cloudflare's public speed endpoints — no backend or storage required.

### Files

**New: `src/routes/tools.network-speed-test.tsx`**
- `createFileRoute("/tools/network-speed-test")` with SEO `head()` (title, description, og tags).
- Wrap UI in `ToolPageShell` (title "Network Speed Test", description about measuring connection speed in-browser).
- States: `idle | running | done`, plus live values for `ping`, `jitter`, `download`, `upload`, and a `phase` label ("Measuring latency…", "Measuring download…", "Measuring upload…").
- Four result cards (Download Mbps, Upload Mbps, Ping ms, Jitter ms) using `--cyan-brand`, `--violet-brand`, `--green-brand`, `--orange-brand` tokens; large display font, subtle border/`bg-card/50`, lucide icons (`Download`, `Upload`, `Activity`, `Waves`).
- Animated progress bar (`@/components/ui/progress`) + framer-motion fade/slide for cards and phase label. Animated number counter while running.
- Primary button: "Run Test" (idle) / "Testing…" (disabled while running) / "Test Again" (done). Secondary "Cancel" while running (aborts fetches via `AbortController`).
- Below results: `HowToUse` with 3 steps, then `ToolSeoContent` (SEO title with "internet speed test, bandwidth test, ping test" keywords, 1–2 sentence description, ~150–200 word body across 2–3 paragraphs, 4 FAQs covering accuracy vs ISP tests, what good speeds look like, why results vary, privacy).
- All copy in English.

**Edit: `src/lib/tools.ts`**
- Import `Gauge` (or similar) from lucide-react.
- Append a tool entry: `{ slug: "network-speed-test", name: "Network Speed Test", description: "Test your internet download, upload, ping and jitter speeds instantly.", category: "utility", icon: Gauge, path: "/tools/network-speed-test" }`.
- No changes needed to `tools.index.tsx` or category nav — they read from this array.

### Speed test implementation (client-only)

Cloudflare exposes simple HTTP endpoints at `https://speed.cloudflare.com`:
- Latency/jitter: `GET https://speed.cloudflare.com/__down?bytes=0` × 20, measure `performance.now()` deltas. Ping = median, jitter = mean absolute deviation of consecutive samples.
- Download: `GET https://speed.cloudflare.com/__down?bytes=<n>` with progressive sizes (1 MB warmup, then 10 MB × 4, then 25 MB × 2). Compute Mbps = `bits / seconds / 1e6` from the largest stable samples; update live every chunk via `ReadableStream` reader.
- Upload: `POST https://speed.cloudflare.com/__up` with random `Uint8Array` payloads (1 MB warmup, then 10 MB × 3). Same Mbps formula based on request duration.
- All fetches use `cache: "no-store"` and an `AbortController` so Cancel stops the test cleanly.
- Total test budget ~15–25 s depending on connection.

Progress bar advances across phases: 0–15% latency, 15–60% download, 60–100% upload, with smooth interpolation tied to bytes received/sent.

### Design

- Dark theme — use only semantic tokens from `src/styles.css` (`--background`, `--card`, `--muted-foreground`, brand color vars). No raw hex.
- Card grid: 2×2 on desktop, single column on mobile.
- Gauge-style hero number for the currently-measuring metric while running, then settle into the 4-card grid.
- `ShieldCheck` "No files are stored on our servers" badge comes from `ToolPageShell` automatically.

### Out of scope

- No server functions, no Lovable Cloud, no history/persistence, no sharing.
- No server selection or multi-server testing — Cloudflare's anycast endpoint only.
