# Animate Upload Phase on Speedometer

Make the upload phase feel like the download phase: chunked POSTs with live speed updates, distinct purple color on the gauge, and gradual needle movement.

## Changes to `src/routes/tools.network-speed-test.tsx`

### 1. Chunked `measureUploadSpeed`
Replace the single 5 MB POST with 5 sequential 1 MB POSTs.

```ts
async function measureUploadSpeed(
  controller: AbortController,
  onLive: (mbps: number) => void,
): Promise<number> {
  const CHUNK_MB = 1;
  const CHUNKS = 5;
  const chunkBytes = CHUNK_MB * 1024 * 1024;
  const buf = new Uint8Array(chunkBytes);
  // fill once (random pattern), reuse across chunks
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
    // running average across completed chunks
    const totalBytes = samples.reduce((a, s) => a + s.bytes, 0);
    const totalSec = samples.reduce((a, s) => a + s.sec, 0);
    onLive((totalBytes * 8) / totalSec / 1e6);
    // small spacing delay (skip after last)
    if (i < CHUNKS - 1) await new Promise((r) => setTimeout(r, 150));
  }
  const totalBytes = samples.reduce((a, s) => a + s.bytes, 0);
  const totalSec = samples.reduce((a, s) => a + s.sec, 0);
  return (totalBytes * 8) / totalSec / 1e6;
}
```

### 2. Live upload state
- Extend `live` state to `{ download: number; upload: number }`.
- In `runTest`, during upload phase pass `(mbps) => setLive((l) => ({ ...l, upload: mbps }))` and update progress proportionally.
- Reset `live.upload = 0` at test start.

### 3. SpeedGauge updates
Add an `accentColor` prop (defaults to `var(--cyan-brand)`). When `phase === "upload"`, parent passes `var(--violet-brand)` (distinct from cyan).
- Center number uses `accentColor`.
- Progress arc stroke uses a gradient swapped per phase: cyan→violet (default) and violet→pink for upload — simplest is a solid `accentColor` stroke when uploading. Implementation: branch the `stroke` value on `phase`.
- Label text: "Upload" when `phase === "upload"`, value shows `fmtMbps(uploadLive)`.

### 4. Gauge `mbps` prop wiring in parent
```tsx
<SpeedGauge
  mbps={
    phase === "download" ? live.download :
    phase === "upload"   ? live.upload   :
    phase === "done"     ? results.upload :
    0
  }
  uploadMbps={live.upload}
  phase={phase}
  pingMs={results.ping}
/>
```
(On `done`, freeze on final upload value since that's the last phase.)

### 5. Status label
Update `phaseLabel` for `phase === "upload"` to `"Measuring upload speed…"` (existing uppercase tracking class renders it accordingly).

### 6. Upload MetricCard
Live value during phase: `value={fmtMbps(phase === "upload" ? live.upload : results.upload)}`. Keep card color/styling unchanged.

### 7. "Test Complete" timing
Already gated by `phase === "done"`, which only fires after the chunked upload loop resolves — no change needed.

## Out of scope
- No change to download, latency, ping, jitter logic or styling.
- No change to result card colors/layouts beyond the live upload value.
- No new dependencies.
