## Goal
Force Railway to use the Dockerfile (with Python + LibreOffice + yt-dlp) instead of auto-detecting via Railpack.

## Change
Create one new file: `skycally-api/railway.toml`

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port 8000"
restartPolicyType = "on_failure"
```

## Notes
- The existing `Dockerfile` already binds to `${PORT:-8000}`. Railway's `$PORT` injection still works because the `startCommand` in `railway.toml` overrides the Dockerfile `CMD` only if Railway chooses to — to keep `$PORT` support I'll use `uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}` instead of hardcoded `8000`, so it works on both Railway (which sets `$PORT`) and local.
- After I push this file, you commit & push to GitHub; Railway will redeploy using the Dockerfile (build takes ~5 min for LibreOffice).
- Once the service is live and you have the public URL, send it back and I'll do Part B (wire the 3 frontend tools to it via `SKYCALLY_API_URL`).

## Files touched
- `skycally-api/railway.toml` (new)
