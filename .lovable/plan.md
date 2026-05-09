## Goal

Add 3 new browser-based video tools (Trimmer, Merger, Subtitles) and refactor the existing Video to GIF tool to use a shared FFmpeg loader. All processing runs locally via `@ffmpeg/ffmpeg` + WASM — no backend.

The user-supplied snippets use raw Tailwind hex colors and `src/pages/...` paths. I will adapt them to match this project's conventions:
- Routes live under `src/routes/tools.<slug>.tsx` (TanStack Router)
- All tools wrap UI in `ToolPageShell` + end with `HowToUse` (per project memory rule)
- Use semantic design tokens (`bg-card`, `border-border`, `text-muted-foreground`, `var(--cyan-brand)`) instead of hardcoded `#0a0f1e` / `#1e2d4a`
- Reuse existing `DropZone`, `Progress`, `AdZone`, and `downloadBlob` helpers
- Register tools in `src/lib/tools.ts` so they auto-appear on home, `/tools`, and footer

## Files

### New
1. **`src/utils/ffmpegLoader.ts`** — singleton `getFFmpeg(onProgress?)` that loads core from `unpkg.com/@ffmpeg/core@0.12.6` once, attaches a progress listener, and returns the cached instance.
2. **`src/routes/tools.video-trimmer.tsx`** — upload → preview `<video>` → start/end range sliders → trim with `-c copy` → preview + download.
3. **`src/routes/tools.video-merger.tsx`** — multi-upload list with up/down/remove reordering → write all + `concat.txt` → `-f concat -safe 0 -c copy` merge.
4. **`src/routes/tools.add-subtitles.tsx`** — video upload + two modes (manual SRT editor with start/end/text rows, or `.srt` upload) + style controls (font size 14–48, color white/yellow/blue) → burn via `subtitles=` filter with `force_style`.

### Edited
5. **`src/services/videoToGif.ts`** — refactor to use the shared loader (delete duplicate FFmpeg bootstrap; keep two-pass palettegen→paletteuse pipeline currently used).
6. **`src/lib/tools.ts`** — add 3 new entries under `video` category with icons from lucide-react: `Scissors` (trimmer), `Combine` (merger), `Captions` (subtitles).
7. **`.lovable/plan.md`** — update.

The route tree (`src/routeTree.gen.ts`) auto-regenerates.

## Tool route shape (consistent across all 3 new tools)

```tsx
<ToolPageShell title="..." description="...">
  {/* one-time info banner about ~30MB FFmpeg download */}
  {/* DropZone or upload card */}
  {/* Tool-specific controls */}
  {/* Progress bar (Progress component) when busy */}
  {/* Result preview + Download button */}
  {/* AdZone id="<slug>-bottom" size="728x90" */}
  <HowToUse steps={[...]} />
</ToolPageShell>
```

All buttons/cards use design tokens, not raw hex. The "first-use ~30MB" banner is a small dismissable note shown until the FFmpeg cache is warmed (tracked in localStorage).

## Technical notes

- `@ffmpeg/ffmpeg` and `@ffmpeg/util` are already installed (used by current `videoToGif.ts`) — no `bun add` needed.
- FFmpeg loader is client-only; never import from server code (already the case, but worth noting for SSR safety — guard with dynamic import inside handlers).
- `-c copy` keyframe trimming is fast but cuts only at keyframes; acceptable trade-off for a browser tool.
- Subtitles filter requires the SRT file to exist in FFmpeg's virtual FS; written via `writeFile('subs.srt', …)` before `exec`.
- Merger requires same codec/container across inputs for `-c copy`; if the user mixes formats it will fail — surface the FFmpeg error via `toast.error`.
- Each tool registers a unique AdZone id matching the existing `ADSENSE_ZONE` comment pattern.

## Out of scope

- No backend changes.
- No changes to the existing footer/home grids (they auto-pick up new entries from `tools.ts`).
- No changes to other tools.
