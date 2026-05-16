## Plan: Fix 4 tools per uploaded prompt

FFmpeg.wasm fails in this environment (no SharedArrayBuffer). Replace with native `MediaRecorder` / canvas approaches and add a mobile warning to Screen Recorder.

### 1. `src/routes/tools.video-merger.tsx`
- Replace `run()` with a `MediaRecorder` + `video.captureStream()` loop that records each input video sequentially into one `video/webm` blob.
- Remove `FFmpegBanner` and `PoweredByNote` imports + JSX. Replace with a small "Runs entirely in your browser — no uploads." note.
- Change DropZone hint to "Add 2 or more videos to merge".
- Update download filename to `merged_video.webm`.

### 2. `src/routes/tools.add-subtitles.tsx`
- Replace `run()` with a canvas-based renderer: draw each video frame to a canvas, overlay the active subtitle text (with stroke + fill color), capture the canvas as a stream into `MediaRecorder`.
- Add `timeToSec` and `parseSRT` helpers above the component.
- Remove `FFmpegBanner` import/JSX. Update download filename to `video_with_subtitles.webm`.

### 3. `src/routes/tools.video-compressor.tsx`
- Replace server API compression with a local canvas + `MediaRecorder` pipeline using `videoBitsPerSecond` chosen by quality (low/medium/high → 300k / 800k / 2M).
- Remove `const API = "..."` and any server error handling. Output downloads as `<name>_compressed.webm`.

### 4. `src/routes/tools.screen-recorder.tsx`
- Add `const isMobile = /Mobi|Android/i.test(navigator.userAgent);` and render a yellow warning banner at the top of the returned JSX when true.

### Notes
- All output is `.webm` (VP9 when supported, otherwise default WebM).
- No new dependencies. FFmpeg-related files (`ffmpegLoader`, `ffmpeg-banner`) are left in place — still used by `tools.video-trimmer.tsx`.
- After edits, the auto build/typecheck confirms the changes compile.
