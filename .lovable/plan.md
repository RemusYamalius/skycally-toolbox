## Goal

Fix the 3 broken tools. Keep API keys in server functions (`process.env`) — do NOT switch to `VITE_*` env vars, since those would ship the keys to every visitor's browser.

---

## Fix 1 — Video Downloader (real RapidAPI response parsing)

The server function already calls RapidAPI, but the response parser is wrong, so it silently returns no formats and the UI looks "mock-ish" / empty.

In `src/server/video.functions.ts`:
- Check `json.success` (RapidAPI returns `{ success, title, picture, links: [...] }`).
- Map links using the actual fields: `link.quality`, `link.link`, `link.type`, `link.size`.
- Throw clearer errors: `VIDEO_NOT_FOUND` when `success === false` or `links` empty; `RATE_LIMITED` on 429; `API_REQUEST_FAILED` otherwise.

In `src/routes/tools.video-downloader.tsx`:
- Map error codes to friendly messages ("Video not found or is private", "Server busy, try again", etc.).
- Show file size next to quality when present.

`src/services/videoApi.ts` keeps re-exporting from the server function (no change to public surface).

---

## Fix 2 — PDF → Word (correct pdf.co endpoint + simpler upload)

Root cause: endpoint `/v1/pdf/convert/to/docx` does not exist on pdf.co. Correct endpoint is `/v1/pdf/convert/to/doc` (it produces a `.docx`).

Rewrite `src/server/pdfco.functions.ts`:
- Accept `{ fileBase64, name }` (already does).
- Upload via the simpler `POST /v1/file/upload` multipart endpoint instead of presigned URL (one request instead of two, avoids the PUT step entirely).
- Convert via `POST /v1/pdf/convert/to/doc` with `{ url, async: false, name }`.
- Return `{ url }` of the result.
- Surface pdf.co's `message` field in thrown errors.

`src/routes/tools.pdf-to-word.tsx`: improve toast messages for upload vs. convert failures. No structural changes.

---

## Fix 3 — Word → PDF (proper page slicing, RTL/Arabic support)

Root cause: the current code uses `pdf.addImage(imgData, ..., 0, position, imgW, imgH)` with a negative `position` to paginate. This re-encodes the entire tall image on every page and frequently produces blank pages on Cloudflare/Workers-bundled jsPDF builds. Also, the off-screen container has no explicit color/`dir`, so docx-preview output sometimes renders with transparent text.

Rewrite `src/routes/tools.word-to-pdf.tsx`:
- Off-screen container: `width: 794px`, `padding: 60px 72px`, `background: white`, `color: black`, `direction` left as document default (docx-preview emits `dir="rtl"` per paragraph from the .docx itself, so Arabic works automatically).
- After `renderAsync`, wait ~600ms for fonts/images.
- Capture once with `html2canvas({ scale: 2, useCORS: true, backgroundColor: "#fff", windowWidth: 794 })`.
- **Slice the tall canvas into per-page sub-canvases** (draw segments into a fresh canvas sized to one A4 page, then add as JPEG to jsPDF). This is the bit that fixes the failure.
- Add a progress callback so the UI shows: "Reading document…" → "Rendering…" → "Building PDF…" → "Done".
- On error, toast: "Conversion failed. Try saving the file as .docx (not .doc) and retry."
- Add a small note under the button: "Arabic and RTL text are fully supported."

Use shadcn `Progress` for the bar.

---

## Files touched

- `src/server/video.functions.ts` — fix response parsing + error codes
- `src/server/pdfco.functions.ts` — switch to multipart upload + correct convert endpoint
- `src/routes/tools.video-downloader.tsx` — friendly error mapping, optional size display
- `src/routes/tools.pdf-to-word.tsx` — better error toasts
- `src/routes/tools.word-to-pdf.tsx` — proper page slicing + progress bar + RTL note

No new dependencies (html2canvas, jspdf, docx-preview already installed).

## Why not use `VITE_RAPIDAPI_KEY` / `VITE_PDFCO_KEY` as the prompt suggests?

Anything prefixed `VITE_` is **inlined into the JS bundle** sent to every browser. Anyone visiting skycally.com could open DevTools and steal the keys, then burn through your RapidAPI / pdf.co quota. The current server-function setup keeps the keys on the Cloudflare Worker and is the correct pattern. The fixes above are applied inside those server functions.
