## Goal
Add 4 new tools (Image Upscaler, Text to Speech, Speech to Text, Video to GIF) plus a new "Audio Tools" category.

## Setup
- `bun add @ffmpeg/ffmpeg @ffmpeg/util`
- Add runtime secret `VITE_REPLICATE_KEY` (Replicate token). Note: `VITE_*` keys are public — exposed in client bundle. Acceptable since user explicitly requested browser-side calls; will surface a warning in chat.

## File changes

### 1. `src/lib/tools.ts`
- Add `"audio"` to `ToolCategory` union with `categoryMeta.audio = { label: "Audio Tools", color: "var(--violet-brand)", icon: "🎙️" }`.
- Import icons `Sparkles, Volume2, Mic, Film`.
- Append entries:
  - `image-upscaler` (image, Sparkles)
  - `text-to-speech` (audio, Volume2)
  - `speech-to-text` (audio, Mic)
  - `video-to-gif` (video, Film)

### 2. `src/routes/tools.index.tsx`
- Update `cats` array to `["all", "video", "image", "audio", "pdf", "text"]`.

### 3. New service files
- `src/services/imageUpscaler.ts` — Replicate POST + poll (per spec). Throws friendly errors for missing key / oversize / failure.
- `src/services/textToSpeech.ts` — `speak()` + `downloadAudio()` using Web Speech + MediaRecorder.
- `src/services/speechToText.ts` — `startRecognition()` wrapper around webkitSpeechRecognition.
- `src/services/videoToGif.ts` — ffmpeg.wasm loader + convert (dynamic import inside function to keep SSR safe).

### 4. New routes (each uses `ToolPageShell` + `<HowToUse>` + `<AdZone>` comment, mobile responsive)

**`src/routes/tools.image-upscaler.tsx`**
- DropZone (image, max 5MB), 2x/4x select, "Upscale" button.
- Animated step indicator: Analyzing → Upscaling → Finalizing.
- Before/after slider built with a range input over absolutely-positioned overlay (no extra dep).
- Download result via anchor.
- "Powered by Real-ESRGAN AI" footer note.

**`src/routes/tools.text-to-speech.tsx`**
- Textarea (max 5000 chars, counter), voice select filtered by lang prefix (`ar/en/fr/es`) with flag emoji map, Slider rate (0.5–2), Slider pitch (0.5–2).
- Play / Stop / Download MP3 buttons.
- Populates voices on mount + `voiceschanged` event.

**`src/routes/tools.speech-to-text.tsx`**
- Big circular Mic button (pulsing ring while recording via tailwind `animate-ping`).
- Language `<select>` (ar-MA, ar-SA, ar-EG, en-US, en-GB, fr-FR, es-ES).
- Transcript textarea (final + greyed interim), word counter, Copy / Download .txt / Clear buttons.
- "Works best in Google Chrome" note + unsupported-browser warning.

**`src/routes/tools.video-to-gif.tsx`**
- DropZone (video, max 50MB).
- Inputs: start (number), duration (1–10), width select (320/480/640), fps select (10/15/24).
- Convert button → status messages + Progress bar.
- Preview `<img>` with object URL + Download button.

### 5. `src/components/site-footer.tsx`
No code change — Categories list iterates `categoryMeta`; the new "Audio Tools" entry appears automatically.

### 6. Sitemap
No sitemap file exists in the project; new routes auto-register via `routeTree.gen.ts` (TanStack plugin). Skipping.

## Notes
- All ffmpeg + tesseract + pdfjs imports remain dynamic inside handlers (Cloudflare Worker SSR safety).
- Replicate key prefixed `VITE_` is bundled into client JS; this matches the user's spec but is not a private secret — flagged in the response.
- Existing categories use `text` color tokens; `audio` reuses violet.
