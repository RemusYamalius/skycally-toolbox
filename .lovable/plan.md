## AI Image Animator — Implementation Plan

Build a fully client-side image-to-video animator at `/tools/image-animator` using Canvas API + MediaRecorder + the existing gif.js pipeline. No server functions, no external APIs.

### Files to create

1. **`src/routes/tools.image-animator.tsx`** — the tool route
   - `createFileRoute("/tools/image-animator")` with `head()` using `buildToolMeta`
   - Wraps UI in `ToolPageShell`, ends with `HowToUse` + `AdZone` (id `image-animator-mid`, 728x90) + `ToolSeoContent` + `RelatedTools`
   - Two-column layout (controls / preview), single column on mobile
   - Detects `?from=generator` search param → shows tip banner
   - Reads image via `DropZone` (accept `image/*`, max 20MB, warning above 10MB)
   - 8 effect cards in 2×4 grid with cyan gradient border on selected
   - Live CSS preview: applies alternating transform with `transition: transform 2s ease-in-out` to the uploaded image while no render is running
   - Settings: duration (3/5/8/10s), fps (24/30), format (MP4/GIF), resolution (480/720/1080), loop toggle, easing (linear / ease-in-out)
   - Generate button (cyan→violet gradient, shimmer on hover, disabled until image loaded)
   - Progress bar + live canvas preview during render; final `<video autoplay loop muted playsinline>` for MP4 or `<img>` for GIF
   - Post-render actions: Download, Re-animate, Try another effect, Open in Image Filters
   - Cleanup: revoke object URLs on unmount + before each new render

2. **`src/lib/image-animator/effects.ts`** — the 8 effect definitions
   - `EffectId` union + `Effect` interface (`id`, `label`, `emoji`, `description`, `animate(ctx, img, progress, w, h)`, `cssPreview` string)
   - Exports `EFFECTS` array exactly as specified in the request

3. **`src/lib/image-animator/render.ts`** — rendering engine
   - `getOutputDimensions(img, resolution)` (rounds to even numbers)
   - `renderVideo(img, settings, effect, onProgress, onPreviewFrame)` — uses `canvas.captureStream(fps)` + `MediaRecorder`; picks `video/mp4` when supported else falls back to `video/webm;codecs=vp9` (returned blob type reflects actual encoding so download extension matches)
   - `renderGif(img, settings, effect, onProgress)` — reuses the existing gif.js loader used by the Video to GIF tool (I'll locate its helpers in the codebase and import them; if they aren't reusable I'll add a small `gif-loader.ts` mirroring that setup)
   - Applies ease-in-out per frame; uses `setTimeout(0)` between frames to keep UI responsive
   - Plain function declarations, `.then().catch()` at call sites — no `useCallback(async…)`

### Files to edit

4. **`src/lib/tools.ts`** — register the new tool
   - Add entry with slug `image-animator`, icon `Clapperboard`, path `/tools/image-animator`, listed under both Image Tools and Video Tools (or the closest existing categorisation — I'll match how other dual-category tools are handled)

5. **`src/lib/related-tools.ts`** — add mapping
   - `"image-animator": ["ai-image-generator", "video-to-gif", "image-filters", "image-resizer", "remove-bg", "collage-maker", "video-trimmer"]`
   - Add `image-animator` into the related lists of `ai-image-generator`, `video-to-gif`, `image-filters`, `image-resizer`, `remove-bg`, `collage-maker`

6. **`src/routes/tools.ai-image-generator.tsx`** — add "✨ Animate this image →" link on the generated-image result panel, pointing to `/tools/image-animator?from=generator`

7. **`public/sitemap.xml`** and **`public/llms.txt`** — add the new URL/entry

### SEO

- `head()` returns title `Free AI Image Animator — Bring Photos to Life | Skycally`, meta description as specified, canonical, OG/Twitter tags (via `buildPageMeta`), plus a `SoftwareApplication` / `WebApplication` JSON-LD script matching the spec
- `ToolSeoContent` receives the 4 body paragraphs and 8 FAQs verbatim; the FAQPage JSON-LD is emitted by the component

### Quality gates

- TypeScript strict, no `any` on public surfaces
- All async work uses plain function declarations + `.then().catch()`; no async arrow event handlers, no `useCallback(async …)`
- MediaRecorder MIME probed at runtime with graceful WebM fallback (download filename adjusts to `.webm` when MP4 unsupported)
- Canvas `crossOrigin = "anonymous"` on the loaded image element
- Aria-live region for progress, aria-label on the preview canvas naming the current effect
- Amber warning banner if the uploaded file is > 10 MB
- Object URLs revoked on unmount + before each new generation
- Verify build with tsgo after wiring

### Out of scope

- No real AI/ML model — "AI" in the tool name refers to the same marketing convention already used across Skycally tools (matches user's spec)
- No server functions, no new npm dependencies (gif.js is already in the project)
