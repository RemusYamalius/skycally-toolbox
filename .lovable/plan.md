## Plan: Fix Network Speed Test by removing Upload

Cloudflare's `/__up` endpoint does not return CORS headers for browser POSTs, so the upload measurement will keep failing regardless of payload size. The simplest reliable fix is to drop the Upload metric entirely and keep Download, Ping, and Jitter (which all work).

### Changes to `src/routes/tools.network-speed-test.tsx`

1. **Remove all upload logic**
   - Delete `uploadOnce`, `uploadOnceWithRetry`, and the upload measurement loop.
   - Remove `upload` state, `uploadProgress`, and any upload phase from the test state machine (`latency` → `download` → `done`).
   - Remove `Upload` icon import.

2. **Remove the Upload `MetricCard`**
   - Grid becomes 3 cards: Download, Ping, Jitter.
   - Adjust grid classes from `md:grid-cols-2 lg:grid-cols-4` to `md:grid-cols-3` so the three cards lay out cleanly on desktop and stack on mobile. Keep all existing colors, icons, and styling.

3. **Adjust progress + phase labels**
   - Progress bar weighting updated so latency + download sum to 100%.
   - Phase label strings reduced to "Measuring latency…" and "Measuring download speed…".

4. **Update copy to match**
   - `ToolPageShell` description: replace "download, upload, ping" with "download, ping, and jitter".
   - `HowToUse` steps: drop the upload mention.
   - `ToolSeoContent` title/description/body/FAQs: remove upload references; clarify the tool measures download, ping, and jitter using Cloudflare's global network. Keep word count and FAQ count (4) within existing conventions.

5. **No changes to** `src/lib/tools.ts`, navigation, routing, or design tokens. Existing dark theme, brand colors, "No files are stored" badge, and layout shell stay intact.

### Out of scope
- No alternative upload measurement (any browser-based upload to a third party will hit the same CORS wall; a reliable upload test would require our own backend endpoint, which the user did not ask for).
- No backend / server function changes.
