## Add animated speedometer gauge to Network Speed Test

Add a circular speedometer gauge above the existing metric cards on `/tools/network-speed-test`, replacing the current center number display during the download phase.

### Changes (single file: `src/routes/tools.network-speed-test.tsx`)

1. **New `SpeedGauge` component** rendered inside the test card, replacing the current `AnimatePresence` numeric display block:
   - SVG-based semicircular arc (270° sweep), ~280px wide
   - Track arc: muted border color
   - Progress arc: cyan→violet gradient (`--cyan-brand` → `--violet-brand`), `stroke-dasharray` animated via Framer Motion's `animate` on the `pathLength` (smooth, GPU-friendly, no needle math headaches)
   - Tick marks every 50 Mbps (0, 50, 100, …, 500) with small labels
   - Center: large speed number (`font-display`, ~5xl, tabular-nums) + "Mbps" unit below
   - Phase-aware center label above the number ("Latency" during latency phase showing ping ms; "Download" during download / done)

2. **Driving value**:
   - During `latency` phase: gauge stays at 0, center shows ping in ms (unit "ms")
   - During `download` phase: gauge animates to `live.download` clamped to 500, center shows live Mbps
   - During `done`: gauge holds at final `results.download`, checkmark badge shown next to or above gauge
   - During `idle` / `error`: gauge at 0, idle Activity icon or "!" overlay preserved

3. **Animation**: use `motion.path` with `animate={{ pathLength: clamped/500 }}` and `transition={{ type: "spring", stiffness: 60, damping: 20 }}` for smooth catch-up to live values (~10 updates/sec from existing `onLive`).

4. **Preserve everything else**:
   - Existing 3 metric cards (Download, Ping, Jitter) untouched below
   - Existing Progress bar, phase label, Run/Cancel/Test Again buttons, checkmark on done, error message, "No files stored" / Cloudflare footnote
   - `HowToUse`, `ToolSeoContent`, `RelatedTools`, route head, shell — unchanged
   - Dark theme tokens only (`var(--cyan-brand)`, `var(--violet-brand)`, `var(--muted-foreground)`, `var(--border)`)

### Out of scope
- No needle/pointer (arc fill is cleaner, less janky on rapid updates, and matches modern Speedtest variants); can swap later if requested
- No changes to measurement logic, tools.ts, navigation, or any other route
