## Plan: Fix Video to GIF tool by switching to backend API

Replace the failing ffmpeg.wasm conversion in `/tools/video-to-gif` with a call to the Skycally backend at `https://skycally-api-production.up.railway.app/api/video-to-gif`. Frontend-only change — backend endpoint will be added separately.

### Files to edit

**1. `src/routes/tools.video-to-gif.tsx`** — rewrite the page

- Remove imports: `Progress`, `convertToGif` and `MAX_VIDEO_BYTES` from `@/services/videoToGif`.
- Add local `MAX_VIDEO_BYTES = 50 * 1024 * 1024` and `API = import.meta.env.VITE_API_URL` (already set in `.env`).
- Remove state: `progress`, `status`.
- Rename `busy` usage to `loading` (or keep `busy`; keep change minimal — keep `busy`).
- Replace `run()` with a direct `fetch` to `${API}/api/video-to-gif` using FormData fields `file`, `start`, `duration`, `width`, `fps`. On success, set `gif` from the returned blob; on failure, toast the `detail` from JSON.
- Remove the `<Progress>` block tied to ffmpeg loading; replace with a simple muted helper line: "Converting your video... this may take a few seconds." shown while `busy`.
- Keep: drop zone, file info card, Start/Duration/Width/FPS controls, Convert button (still using `Loader2`/`Film` icons), result preview + Download button.
- Update SEO body and one FAQ that currently claim "runs in your browser" / "FFmpeg WebAssembly" to reflect server-side processing (single small text update — keep structure identical).

**2. `src/services/videoToGif.ts`** — delete

No longer referenced after the rewrite.

### Files NOT changed

- `src/utils/ffmpegLoader.ts`, `src/components/ffmpeg-banner.tsx` — still used by `tools.video-trimmer.tsx`, `tools.video-merger.tsx`, `tools.add-subtitles.tsx`. Leave intact.
- `@ffmpeg/*` npm deps — still used by the three tools above. Leave installed.
- `skycally-api/main.py` — backend endpoint will be added separately per user choice.

### Validation

After edits, the project build/typecheck runs automatically. Confirm no remaining import of `@/services/videoToGif` and that the page compiles. No runtime test possible until backend endpoint exists.
