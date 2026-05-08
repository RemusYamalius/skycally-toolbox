## Fix 1 — QR Reader camera access on mobile

File: `src/routes/tools.qr-reader.tsx`

- Already requests `{ video: { facingMode: "environment" } }` ✓ (keep as-is)
- Replace the generic `catch { toast.error("Could not access camera") }` with a typed catch that maps:
  - `NotAllowedError` / `PermissionDeniedError` → "Camera access denied. Please allow camera permission in your browser settings."
  - `NotFoundError` / `DevicesNotFoundError` → "No camera found on this device."
  - anything else → "Could not access camera. Try uploading an image instead."
- Guard the "Scan from Camera" button: only render when `navigator.mediaDevices?.getUserMedia` exists. Use a small `useState(false)` set in a `useEffect` to avoid SSR `navigator is not defined` errors.

## Fix 2 — Hide empty ad placeholders site-wide

File: `src/components/ad-zone.tsx` (single component used by every tool route via `<AdZone id=… size=… />`)

- Add an "is there an ad to show" check inside `AdZone`. Since this project has no real ad network wired up yet, the placeholder is *always* empty — so the component should `return null` by default.
- Implementation: add an optional `hasAd?: boolean` prop (default `false`). When `false`, return `null`. Keep the existing placeholder markup for the `hasAd` case so the `ADSENSE_ZONE` comment marker stays intact for future wiring.
- No call sites need to change — they will simply stop rendering the dashed grey box. When AdSense is later integrated, the integration code can pass `hasAd` (or the component can detect a filled slot internally).

## Out of scope

- No design/UI changes beyond removing the empty boxes.
- No changes to ad logic, ad loading, or AdSense integration.
- No changes to other tool routes.
