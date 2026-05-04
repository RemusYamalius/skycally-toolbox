# skycally-api

FastAPI backend for Skycally's heavy tools:

- `GET  /api/video-info?url=...` — yt-dlp video metadata + direct download links
- `POST /api/word-to-pdf` (multipart `file`) — LibreOffice .doc/.docx → .pdf (full Arabic/RTL support)
- `POST /api/pdf-to-word` (multipart `file`) — LibreOffice .pdf → .docx

## Deploy on Railway

1. Push this folder to a new GitHub repo:
   ```bash
   cd skycally-api
   git init
   git add .
   git commit -m "skycally api"
   git remote add origin https://github.com/USERNAME/skycally-api.git
   git push -u origin main
   ```
2. Go to https://railway.app → **New Project → Deploy from GitHub repo** → pick `skycally-api`.
3. Railway detects the Dockerfile and builds automatically. First build takes ~5 min (LibreOffice).
4. In the service → **Settings → Networking → Generate Domain**. Copy the public URL (e.g. `https://skycally-api-production.up.railway.app`).
5. Send that URL back here — we'll wire the Skycally frontend to it.

## Local dev

```bash
docker build -t skycally-api .
docker run -p 8000:8000 skycally-api
# then visit http://localhost:8000
```

## Notes

- Recommend the Hobby plan ($5/mo) so the service doesn't sleep.
- Bump `yt-dlp` in `requirements.txt` and redeploy when extractors break.
