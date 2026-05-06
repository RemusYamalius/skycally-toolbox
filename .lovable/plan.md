## Move Image Upscaler to backend proxy

### Backend (`skycally-api/main.py`)
Add a new `/api/upscale` endpoint that proxies to Replicate using a server-side `REPLICATE_API_TOKEN` env var:

- Accept `multipart/form-data` with `file` (image) + `scale` (2 or 4).
- If `os.environ.get("REPLICATE_API_TOKEN")` is missing → return `400 {"detail": "REPLICATE_KEY_MISSING"}`.
- Validate file type (png/jpg/webp) and size (≤ 5MB) → 400 with descriptive `detail`.
- Read file bytes, base64-encode into a `data:` URL.
- POST to `https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions` with `Authorization: Token …` and `{ "input": { "image": <dataURL>, "scale": scale, "face_enhance": false } }`.
- Poll `GET /v1/predictions/{id}` every 2s up to 30 attempts.
  - On `succeeded` → return `{"output": url}` (handle list-or-string).
  - On `failed`/`canceled` → 500 `{"detail": "Upscaling failed"}`.
  - On timeout → 504 `{"detail": "Processing took too long. Try a smaller image."}`.
  - Map upstream 401 → 500 `{"detail": "REPLICATE_KEY_MISSING"}`, 429 → 429 `{"detail": "Rate limit reached. Try again in a few minutes."}`.
- Add `httpx` to `skycally-api/requirements.txt` (async HTTP) — or use `urllib`/`requests` if already present. Will check and pick what's there.

Add `REPLICATE_API_TOKEN=r8_bjHdOzp9LSkyChv85dZLwJCBHcUVO8q1cO4LX` documented in the API README so it's set on Railway. (User must set the env var in Railway dashboard — we cannot push secrets there from here.)

### Frontend

**`src/services/imageUpscaler.ts`** — full rewrite:
```ts
export const MAX_UPSCALE_BYTES = 5 * 1024 * 1024;

export const upscaleImage = async (
  file: File,
  scale: number,
  onProgress: (msg: string) => void
): Promise<string> => {
  onProgress("Uploading image...");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("scale", String(scale));

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/upscale?scale=${scale}`,
    { method: "POST", body: formData }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (err.detail === "REPLICATE_KEY_MISSING") {
      throw new Error("API key not configured on server.");
    }
    throw new Error(err.detail || "Upscaling failed");
  }
  onProgress("Processing with AI...");
  const data = await response.json();
  onProgress("Almost done...");
  return data.output;
};
```
Removes `hasReplicateKey`, `mapHttpError`, and all `VITE_REPLICATE_KEY` references.

**`src/routes/tools.image-upscaler.tsx`**:
- Drop the `hasReplicateKey` import + warning banner + key-disabled state (server now owns the key; if missing, error toast says "API key not configured on server.").
- Drop the manual `STEPS`/`step` timer; replace with a `progressMsg` state set by the new `onProgress` callback. Button label shows `progressMsg` when busy, else "Upscale Image".
- Pass `(msg) => setProgressMsg(msg)` to `upscaleImage`.

**`.env`**: remove `VITE_REPLICATE_KEY`. Add/confirm `VITE_API_URL` points at the deployed FastAPI base URL (will check current `.env` to know the value).

### Files touched
- `skycally-api/main.py` (new endpoint)
- `skycally-api/requirements.txt` (httpx if needed)
- `skycally-api/README.md` (note new env var)
- `src/services/imageUpscaler.ts` (rewrite)
- `src/routes/tools.image-upscaler.tsx` (banner + progress refactor)
- `.env` (drop `VITE_REPLICATE_KEY`)

### Note for the user
The Replicate key must be set in the Railway/host environment as `REPLICATE_API_TOKEN`. I'll remove it from the client `.env`. Also recommend rotating the key since it was shared in chat.
