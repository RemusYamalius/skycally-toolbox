# Wire frontend tools to Railway backend

Backend is live at `https://skycally-api-production.up.railway.app` with three endpoints:
- `GET /api/video-info?url=...` → `{ title, thumbnail, formats[] }`
- `POST /api/word-to-pdf` (multipart `file`) → PDF blob
- `POST /api/pdf-to-word` (multipart `file`) → DOCX blob

## Note on env var

The codebase uses TanStack Start server functions, not direct `fetch` from the browser. But since the Railway API already has CORS open for the Lovable domain, we can call it directly from the client and skip the server-fn layer. I'll use `VITE_API_URL` as requested so it's overridable, with the Railway URL as a hardcoded fallback (Lovable's preview build doesn't always inject custom Vite env vars).

```ts
const API_URL = import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";
```

## Changes

### 1. `src/services/videoApi.ts`
Replace the re-export of the server function with a direct `fetch` to `/api/video-info`. Keep the exported names (`fetchVideo`, `VideoResult`, `VideoFormat`) so `tools.video-downloader.tsx` keeps working — but update the page to import from `@/services/videoApi` instead of `@/server/video.functions`. Throw on `!response.ok`.

### 2. `src/services/wordToPdf.ts` (new file)
Export `convertWordToPdf(file: File)`: POST multipart to `/api/word-to-pdf`, get blob, trigger download with `.pdf` extension, throw on `!response.ok`.

### 3. `src/services/pdfToWord.ts` (new file)
Export `convertPdfToWord(file: File)`: POST multipart to `/api/pdf-to-word`, get blob, trigger download with `.docx` extension, throw on `!response.ok`.

### 4. Update `src/routes/tools.video-downloader.tsx`
Switch import from `@/server/video.functions` to `@/services/videoApi` and call `fetchVideo({ url })` (signature: takes a plain object, no `{ data }` wrapper). Loading spinner already exists; toast on error already exists.

### 5. Replace `src/routes/tools.word-to-pdf.tsx`
Strip the heavy client-side `docx-preview` + `jspdf` + `html2canvas` rendering. Replace with a simple flow: drop file → click Convert → call `convertWordToPdf` → spinner (`Loader2`) while busy → toast success/error. Keep `ToolPageShell`, `DropZone`, `HowToUse`, `checkSize`.

### 6. Replace `src/routes/tools.pdf-to-word.tsx`
Swap `pdfToWord` from `@/server/pdfco.functions` for `convertPdfToWord` from `@/services/pdfToWord`. Same UI shell, spinner during call, toast on error.

### 7. Env var
Add `VITE_API_URL=https://skycally-api-production.up.railway.app` via Lovable env. (Hardcoded fallback ensures it works even if not set.)

## Out of scope
- Not removing `src/server/video.functions.ts` or `src/server/pdfco.functions.ts` yet — leaving them in case other code references them. Can clean up later.
- Not touching the now-unused `docx-preview` / `jspdf` / `html2canvas` dependencies.
