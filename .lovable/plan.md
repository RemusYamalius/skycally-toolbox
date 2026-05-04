## Goal

Spin up a separate Python/FastAPI backend (`skycally-api`) for the 3 heavy tools and switch the Skycally frontend to call it. yt-dlp + LibreOffice can't run inside the Cloudflare Worker that hosts skycally.com, so they have to live on Railway (or any container host).

---

## Part A — Python backend files (in this repo, under `skycally-api/`)

I'll create the folder inside this Lovable project so you have one place to copy from. You then push that folder to its own GitHub repo and deploy on Railway.

Files:
- `skycally-api/main.py` — FastAPI app with `/api/video-info`, `/api/word-to-pdf`, `/api/pdf-to-word`, plus health check at `/`. Same code you pasted, with two small hardenings:
  - CORS also allows the Lovable preview domain (`*.lovable.app`) via regex so you can test before pointing skycally.com at it.
  - LibreOffice subprocess uses a unique `-env:UserInstallation` profile dir per request (otherwise concurrent conversions collide and fail intermittently on Railway).
  - Cleans up `tmp_dir` in a `finally` block.
- `skycally-api/requirements.txt` — `fastapi`, `uvicorn[standard]`, `yt-dlp`, `python-multipart`.
- `skycally-api/Dockerfile` — `python:3.11-slim` + `libreoffice` + `ffmpeg`, runs `uvicorn` on `$PORT` (Railway sets `$PORT`, not 8000 — important fix vs. the snippet you sent).
- `skycally-api/README.md` — short deploy guide (push to GitHub → New Project on Railway → Deploy from repo → copy public URL).
- `skycally-api/.dockerignore` — skip `__pycache__`, `.git`, etc.

These files do not affect the Lovable build (FastAPI/yt-dlp aren't imported by the frontend).

---

## Part B — Frontend integration (Skycally)

Once Railway gives you a public URL like `https://skycally-api-production.up.railway.app`, I'll wire the 3 tools to it.

**Config:** add a runtime secret `SKYCALLY_API_URL` (server-side env var, used by the existing TanStack server functions — keeps the URL out of the client bundle and lets you rotate/swap hosts without redeploying).

**`src/server/video.functions.ts`** — replace the RapidAPI call with:
```
GET ${SKYCALLY_API_URL}/api/video-info?url=...
```
Map the response into the existing `VideoResult` shape (fields already match: `title`, `thumbnail`, `formats[].quality|url|ext|size`). Keep the same friendly error codes (`VIDEO_NOT_FOUND`, `RATE_LIMITED`, `API_REQUEST_FAILED`).

**`src/server/pdfco.functions.ts`** → rename mentally to "pdf2word via Railway":
- Accept `{ fileBase64, name }` (unchanged client interface).
- POST a `multipart/form-data` body to `${SKYCALLY_API_URL}/api/pdf-to-word`.
- Receive the `.docx` bytes, base64-encode, return `{ dataUrl }` instead of an external URL.
- `tools.pdf-to-word.tsx` triggers a download from the data URL (works without window.open being blocked).

**New `src/server/word.functions.ts`** — `wordToPdf({ fileBase64, name })`:
- POST multipart to `${SKYCALLY_API_URL}/api/word-to-pdf`.
- Return `{ dataUrl }` of the resulting PDF.

**`src/routes/tools.word-to-pdf.tsx`** — replace the docx-preview + html2canvas + jsPDF pipeline (which is what's been failing on Arabic/RTL) with a simple call to `wordToPdf` and a download trigger. Keep the progress bar (Reading → Uploading → Converting → Done). LibreOffice handles RTL and Arabic shaping perfectly out of the box.

**Cleanup:** remove `docx-preview`, `jspdf`, `html2canvas` from `package.json` since they're no longer used (Image Compressor and Image Converter don't use them either). Keeps the bundle slim.

---

## Question before I start

Before I wire up Part B I need one thing from you:

**What's the public Railway URL for your `skycally-api` service?**
(It looks like `https://something.up.railway.app`. If you haven't deployed yet, I can do Part A only — you deploy, then come back with the URL and I'll do Part B in a second pass.)

---

## Files touched

Part A (new):
- `skycally-api/main.py`
- `skycally-api/requirements.txt`
- `skycally-api/Dockerfile`
- `skycally-api/.dockerignore`
- `skycally-api/README.md`

Part B (only after you give me the URL):
- add secret `SKYCALLY_API_URL`
- `src/server/video.functions.ts` (rewrite)
- `src/server/pdfco.functions.ts` (rewrite as Railway client; or rename to `src/server/pdf.functions.ts`)
- `src/server/word.functions.ts` (new)
- `src/routes/tools.word-to-pdf.tsx` (drop browser pipeline, call server fn)
- `src/routes/tools.pdf-to-word.tsx` (download from data URL)
- `package.json` (remove `docx-preview`, `jspdf`, `html2canvas`)
- old RapidAPI / pdf.co secrets can stay or be deleted — your call.

## Notes

- LibreOffice cold-start on Railway's free/hobby tier is ~3–8s on the first request; subsequent ones are fast. Word→PDF on a 10-page Arabic doc typically finishes in 2–5s warm.
- Railway free trial is limited; for production you'll want the Hobby plan ($5/mo) or similar so the service doesn't sleep.
- yt-dlp needs occasional updates as platforms change. Bump `yt-dlp` in `requirements.txt` and redeploy when extractors break.
