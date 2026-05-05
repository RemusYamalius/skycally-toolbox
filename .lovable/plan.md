## Route Download button through backend proxy

Update `src/routes/tools.video-downloader.tsx` so the per-format Download button no longer links directly to the upstream CDN URL (which often 403s due to referer/cookies). Instead, hit our Railway proxy endpoint.

### Changes

**`src/routes/tools.video-downloader.tsx`**
- Keep the pasted `url` in scope (already in state). Replace the `<a href={f.url} download>` element with a `<button>` that builds:
  ```ts
  const API_URL = import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";
  const downloadUrl = `${API_URL}/api/download?url=${encodeURIComponent(url)}&video_url=${encodeURIComponent(f.url)}`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `video.${f.ext || "mp4"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast.success("Your download is starting...");
  ```
- Style the button identically to the previous anchor so the UI doesn't shift.

### Out of scope
- No changes to `src/services/videoApi.ts` (proxy URL is built inline at click time, matching the snippet you provided).
- Backend `/api/download` endpoint is assumed to exist on Railway already.
