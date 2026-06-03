# Add Upload Speed Measurement

Extend the Network Speed Test with an upload phase that posts a 5 MB random payload to a Cloudflare Worker, then show the result in a new card alongside Download, Ping, Jitter.

## Changes to `src/routes/tools.network-speed-test.tsx`

### 1. Types and state
- Extend `Phase` to include `"upload"`.
- Extend `Results` with `upload: number`.
- Initialize `results.upload = 0` everywhere (initial state + reset in `runTest`).
- Add `Upload` to the lucide-react import.

### 2. New `measureUploadSpeed` function
```ts
async function measureUploadSpeed(controller: AbortController): Promise<number> {
  const sizeMB = 5;
  const bytes = new Uint8Array(sizeMB * 1024 * 1024);
  crypto.getRandomValues(bytes);
  const t0 = performance.now();
  await fetchWithRetry("https://speed-upload.skycally-tools.workers.dev", {
    method: "POST",
    body: bytes,
    cache: "no-store",
    signal: controller.signal,
  });
  const sec = (performance.now() - t0) / 1000;
  return (sizeMB * 8) / sec; // Mbps
}
```
Note: `crypto.getRandomValues` is limited to 65 536 bytes per call, so fill the buffer in chunks inside the helper.

### 3. Test sequence in `runTest`
After download completes and before `setPhase("done")`:
- `setPhase("upload")`
- `const upload = await measureUploadSpeed(controller)`
- `setResults(r => ({ ...r, upload }))`
- Then `setPhase("done")`

### 4. Phase label
Add to the `phaseLabel` ternary:
- `phase === "upload"` → `"Testing upload…"` (uppercase rendering already handled by existing class).

### 5. SpeedGauge center label
Currently shows `"Latency"` when `phase === "latency"`, else `"Download"`. Add an `"Upload"` branch when `phase === "upload"`; center number shows live download value during download, ping during latency, and a simple `"…"` (or last download value frozen) during upload since we don't stream upload progress. Simplest: when `phase === "upload"`, render label `"Upload"` and value `fmtMbps(results.upload)` (will be `—` until resolved, then the final number on `done`). Keeps gauge logic minimal.

### 6. Fourth result card
Add a 4th `<MetricCard>` after Jitter:
```tsx
<MetricCard
  label="Upload"
  value={fmtMbps(results.upload)}
  unit="Mbps"
  color="var(--cyan-brand)"
  icon={Upload}
  highlight={phase === "upload"}
/>
```
Change the grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` so four cards fit cleanly without altering visual styling of each card.

### 7. "Test Complete" timing
Already gated by `phase === "done"`, which now only fires after upload finishes — no extra change needed.

## Out of scope
- No other styling, layout, copy (SEO/FAQ), or behavior changes.
- No changes to download/latency logic.
- No new dependencies.
