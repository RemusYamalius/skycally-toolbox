# Make Skycally tools fully functional

## Important security note (read first)

You shared three API keys in chat. I will treat them as compromised after this is done — please **rotate them** at RapidAPI, remove.bg, and pdf.co once we've stored fresh ones.

Also, your prompt asked for `VITE_*` env variables. Anything prefixed with `VITE_` is **shipped to every visitor's browser**, so anyone can open DevTools, copy your keys, and burn through your quotas in minutes. Since you specifically asked for "no backend server", the right middle-ground on this stack is:

- **Browser-only tools** (image converter, image compressor, merge PDF, word-to-PDF) — pure client, no key needed.
- **API-backed tools** (video downloader, remove.bg, pdf-to-word) — call a tiny **TanStack server function** (already supported by your stack, runs on Cloudflare Workers, no separate server to manage). The function holds the API key as a server-side secret and proxies the request.

This is still serverless, still one-click deploy, and your keys stay private. I'll proceed this way unless you tell me otherwise.

---

## Plan

### 1. Secrets (Lovable Cloud runtime secrets, not `.env`)
Store as project secrets so server functions can read them via `process.env`:
- `RAPIDAPI_KEY`
- `REMOVEBG_KEY`
- `PDFCO_KEY`

I'll request these via the secrets tool when in build mode (you'll paste fresh rotated keys).

### 2. Dependencies to install
- `browser-image-compression` — image compressor
- `jszip` — bulk ZIP downloads
- `pdf-lib` — merge PDF
- `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities` — drag-to-reorder
- `docx-preview` `jspdf` `html2canvas` — Word → PDF in browser
- `zod` — server-fn input validation

### 3. Server functions (new files under `src/server/`)
Each is a thin proxy that reads its key from `process.env` and forwards the request:
- `src/server/video.functions.ts` — `getVideo({ url })` → calls Social Media Video Downloader on RapidAPI, normalizes response into `{ title, thumbnail, formats[] }`.
- `src/server/removebg.functions.ts` — `removeBg({ imageBase64 })` → posts to `api.remove.bg/v1.0/removebg`, returns base64 PNG.
- `src/server/pdfco.functions.ts` — `pdfToWord({ fileBase64, name })` → uploads to pdf.co, requests DOCX conversion, returns result URL.

### 4. Tool rewrites

**Video Downloader** (`src/routes/tools.video-downloader.tsx` + rewrite `src/services/videoApi.ts`)
- Replace mock with `getVideo` server fn.
- Render returned formats; download button uses `<a href={url} download target="_blank">` + toast.
- Expand platform chips to: TikTok, Instagram, YouTube, Twitter/X, Facebook, Snapchat, Pinterest, Vimeo, Dailymotion.
- Friendly errors ("This video may be private or unsupported").

**Image Converter** (`src/routes/tools.image-converter.tsx`)
- Already canvas-based; extend to **batch** (multi-file), add AVIF/BMP/GIF inputs, JPG white-fill fix, before/after sizes, per-file Download + "Download all (ZIP)".

**Image Compressor** (`src/routes/tools.image-compressor.tsx`)
- Swap manual canvas for `browser-image-compression` for better quality + EXIF preservation.
- Quality slider 10–95 (default 80), per-file saved % badge, "Download all as ZIP" via `jszip`.

**Remove Background** (`src/routes/tools.remove-bg.tsx`)
- Replace fake delay with `removeBg` server fn (file → base64 → server → base64 PNG → blob URL).
- Side-by-side original vs result on checkerboard, "Download PNG", quota note "Free plan: 50 images/month".

**Merge PDF** (`src/routes/tools.merge-pdf.tsx`)
- Real merge via `pdf-lib`.
- Replace ▲▼ buttons with `@dnd-kit` sortable list, show page count per file and total.
- Download `merged.pdf`.

**Word → PDF** (`src/routes/tools.word-to-pdf.tsx`)
- Replace `MockConvert` with real flow: render `.docx` into hidden div via `docx-preview`, snapshot with `html2canvas`, build multi-page A4 PDF via `jsPDF`, auto-download.
- Show in-page preview after upload; progress indicator while converting.

**PDF → Word** (`src/routes/tools.pdf-to-word.tsx`)
- Replace `MockConvert` with real flow: send file to `pdfToWord` server fn, then `window.open(resultUrl)` to download `.docx`.
- Quota note "Free plan: 100 pages/month".

### 5. Cross-cutting polish
- Toasts via existing `sonner` for success/error on every tool.
- Standard error mapping: missing key → "Service not configured", >10MB → "File too large", network → "Connection error, please try again". Never expose raw errors.
- Per-tool "How to use" 3-step mini-guide added inside `ToolPageShell`.
- Verify mobile layout for each tool route at 375px.
- Update `README.md` with the three required secrets and where to get them.

### 6. Out of scope (flagging)
- I will **not** ship `VITE_*` keys to the client — see security note above.
- No Cloudflare Worker file system writes; all conversions stream through memory.
- The RapidAPI free tier is rate-limited; under load expect 429s — handled with friendly error.

---

## Technical notes

- **Server function shape**: `createServerFn({ method: "POST" }).inputValidator(z…).handler(async ({ data }) => { const key = process.env.RAPIDAPI_KEY!; … })` — env reads live inside `.handler()` per stack rules.
- **File transport**: client converts `File → ArrayBuffer → base64` before invoking server fn (server fns are JSON-RPC, not multipart). For remove.bg the server rebuilds a `Blob` and `FormData` before forwarding.
- **PDF rendering**: `html2canvas` + `jsPDF` slice canvas into A4 pages (`pageHeight = canvas.width * 297/210`) to support multi-page docs.
- **dnd-kit**: `DndContext` + `SortableContext` (vertical strategy) wrapping the file list; `arrayMove` on `onDragEnd`.

Reply **approve** to proceed and I'll request the three secrets and start implementing.