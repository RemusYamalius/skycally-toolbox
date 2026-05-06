## Plan: Switch Remove Background to self-hosted backend

### Frontend changes

1. **Create `src/services/removeBg.ts`** with the requested function:
   ```ts
   export const removeBackground = async (file: File): Promise<Blob> => {
     const formData = new FormData();
     formData.append("file", file);
     const response = await fetch(
       `${import.meta.env.VITE_API_URL}/api/remove-bg`,
       { method: "POST", body: formData }
     );
     if (!response.ok) {
       const err = await response.json().catch(() => ({}));
       throw new Error(err.detail || "Background removal failed");
     }
     return await response.blob();
   };
   ```

2. **Update `src/routes/tools.remove-bg.tsx`**:
   - Replace `import { removeBg } from "@/server/removebg.functions"` with `import { removeBackground } from "@/services/removeBg"`.
   - Replace the base64 round-trip in `run()` with a direct `removeBackground(file)` call returning a `Blob`.
   - Drop unused `fileToBase64` / `base64ToBlob` imports.
   - Remove the "Powered by remove.bg" footer line.

3. **Delete `src/server/removebg.functions.ts`** (no longer used; eliminates the `REMOVEBG_KEY` reference in code).

4. **Secrets**: remove `REMOVEBG_KEY` from project secrets (no `VITE_REMOVEBG_KEY` exists in this repo — already clean).

### Backend changes (`skycally-api/main.py`)

Add a new endpoint that performs background removal server-side using **rembg** (ONNX-based, free, runs locally in the container):

```python
from rembg import remove

@app.post("/api/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image files allowed")
    data = await _read_upload_limited(file)
    try:
        output = remove(data)
    except Exception as e:
        logger.exception("remove-bg failed: %s", e)
        raise HTTPException(500, "Background removal failed")
    return Response(
        content=output,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="nobg.png"'},
    )
```

Reuses the existing `_read_upload_limited` (20 MB cap) for DoS protection.

### `skycally-api/requirements.txt`

Add:
```
rembg[cpu]
onnxruntime
pillow
```

### `skycally-api/Dockerfile`

The `rembg` model (~170 MB u2net.onnx) downloads on first request by default. To avoid cold-start latency and outbound network at request time, pre-download during build:

```dockerfile
RUN python -c "from rembg import new_session; new_session('u2net')"
```

(Add after `pip install` step.)

### Notes / trade-offs

- **Container size & memory**: rembg + onnxruntime + u2net model adds ~500 MB to the image and needs ~1 GB RAM at runtime. Confirm the Railway plan can host it; if not, we can fall back to the lighter `u2netp` model (~5 MB, lower quality) by passing `model_name="u2netp"`.
- **Cold start**: first request after a deploy/restart will be slower (model load into memory, ~3–5 s). Subsequent requests are fast (~1–3 s for typical photos on CPU).
- **CORS**: already covered by the existing `CORSMiddleware` config.
- **No auth / rate limit**: same posture as the other endpoints — deferred until proper infra.

### Files touched

- create `src/services/removeBg.ts`
- edit `src/routes/tools.remove-bg.tsx`
- delete `src/server/removebg.functions.ts`
- edit `skycally-api/main.py`
- edit `skycally-api/requirements.txt`
- edit `skycally-api/Dockerfile`
