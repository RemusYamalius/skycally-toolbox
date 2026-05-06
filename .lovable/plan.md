## Fix dark-mode dropdowns + Image Upscaler

### Issue 1 — Global dark-mode fix for selects/dropdowns

Edit `src/styles.css` and append global rules so every native `<select>` (and its `<option>` popup, which the OS renders outside our React tree and therefore ignores Tailwind classes) is readable in both themes:

```css
select {
  background-color: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}
select option {
  background-color: var(--color-background);
  color: var(--color-foreground);
}
.dark select {
  background-color: #1e293b;
  color: #f1f5f9;
  border-color: #334155;
}
.dark select option {
  background-color: #1e293b;
  color: #f1f5f9;
}
```

Audit tool pages that use native `<select>` and ensure they also have `bg-background text-foreground border-border` classes (covers the trigger styling before the OS dropdown opens):
- `src/routes/tools.text-to-speech.tsx` (voice selector)
- `src/routes/tools.image-converter.tsx` (format)
- `src/routes/tools.speech-to-text.tsx` (language)
- `src/routes/tools.video-to-gif.tsx` (settings)
- Any other `<select>` discovered via `rg "<select"` in `src/routes`

For Radix-based components (`src/components/ui/select.tsx`, dropdown-menu, popover) — already use `bg-popover text-popover-foreground`, which resolves correctly in dark mode. No change needed unless audit finds a hardcoded `bg-white`.

### Issue 2 — Image Upscaler robustness

**Add secret**: store `VITE_REPLICATE_KEY = r8_bjHdOzp9LSkyChv85dZLwJCBHcUVO8q1cO4LX` via the secrets tool so it's exposed to the Vite client build.

**Update `src/services/imageUpscaler.ts`**:
- Switch endpoint to `https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions` (no `version` field needed — uses latest).
- Keep base64 data-URL upload.
- Poll every 2s, max 30 attempts (60s).
- Map errors: 401 → "Invalid API key. Check your Replicate key.", 429 → "Rate limit reached. Try again in a few minutes.", timeout → "Processing took too long. Try a smaller image.", else → "Upscaling failed. Please try again."
- Export `hasReplicateKey()` helper that returns `Boolean(import.meta.env.VITE_REPLICATE_KEY)`.

**Update `src/routes/tools.image-upscaler.tsx`**:
- On mount, check `hasReplicateKey()`. If missing, render a yellow warning card above the dropzone:
  > ⚙️ Setup required: Add your free Replicate API key in the project settings to enable this tool. [Get a free key at replicate.com →](https://replicate.com)
- Disable the "Upscale Image" button while key is missing.
- Replace toast-only error path with mapped messages from the service.
- Keep existing before/after slider, plus add explicit "Original" and "Upscaled ✨" labels and ensure download button uses the result URL.

### Files touched
- `src/styles.css` (append select rules)
- `src/services/imageUpscaler.ts` (rewrite per spec)
- `src/routes/tools.image-upscaler.tsx` (setup banner, labels, error mapping)
- Minor className tweaks on tool pages with native `<select>` if missing base classes
- New secret: `VITE_REPLICATE_KEY`
