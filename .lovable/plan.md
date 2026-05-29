# Light Mode Text Visibility Fix

## Diagnosis adjustments before implementing

Two things in the original brief don't match the project, so the plan corrects them:

1. **`.light` class doesn't exist.** `theme-provider.tsx` only toggles `.dark` on `<html>`. Light is the default (no class). So `.light .bg-card { … }` selectors would never match. The fix below uses the default cascade + a `:root:not(.dark)` scope where needed.
2. **`src/routes/tools.role-spinner.tsx` already uses semantic tokens** (`bg-card`, `border-border`, `text-muted-foreground`, `text-foreground`). It does NOT contain `text-white`, `text-gray-*`, or inline white colors. No edits needed there — flagging this so we don't invent diffs.
3. **The proposed broad selectors (`[class*="rounded-xl"]`, blanket `input { color !important }`) are too aggressive** — they'd repaint hero CTAs, badges, and the homepage search input (which is intentionally white-on-dark inside `.bg-hero`). The plan scopes the safeguard to actual card containers only.

## Real culprits (from a repo-wide audit)

These tool routes were authored assuming a permanent dark canvas and break in light mode:

```
tools.add-watermark.tsx
tools.extract-audio.tsx
tools.markdown-to-html.tsx
tools.lorem-ipsum.tsx
tools.json-formatter.tsx
tools.image-upscaler.tsx
tools.image-filters.tsx
tools.image-to-sketch.tsx
tools.audio-converter.tsx
tools.video-compressor.tsx
tools.pdf-watermark-remover.tsx
tools.screen-recorder.tsx
tools.split-pdf.tsx
contact.tsx (submit button uses hardcoded gradient + text-white — OK, it's a button)
```

They use combinations of: `text-gray-{200,300,400,500,600,700}`, `bg-[#0a0f1e]`, `border-[#1e2d4a]`, `text-white` on non-button surfaces, custom drop zones, etc.

## Plan

### 1. Corrected safeguard in `src/styles.css`

Append (NOT prepend — keeping existing animation/critical CSS intact):

```css
/*
  COLOR RULES — always use semantic tokens, never hardcode:
  ✅ text-foreground, text-muted-foreground, text-card-foreground
  ✅ bg-card, bg-background, bg-muted, border-border
  ❌ Avoid: text-white, text-gray-*, bg-white, bg-[#hex] inside content surfaces.
     Exceptions: hero section (.bg-hero), intentionally inverted UI, buttons.
*/

/* Light-mode safeguard: any card/panel inherits readable color even if a
   child author forgot to set one. Scoped to .bg-card so we don't repaint
   hero buttons, badges, or .bg-hero descendants. */
:root:not(.dark) .bg-card {
  color: var(--card-foreground);
}
```

(No `input { color !important }` rule — `Input`/`Textarea` shadcn components already inherit `text-base` from `currentColor` and work correctly in both themes. Forcing it would break the hero search input which is intentionally white-on-dark.)

### 2. Tool-route cleanup (semantic-token rewrite)

For each of the 12 files listed above, replace hardcoded color patterns with tokens:

| Hardcoded | Replacement |
|---|---|
| `text-gray-200`, `text-gray-300` | `text-foreground` |
| `text-gray-400`, `text-gray-500`, `text-gray-600`, `text-gray-700` | `text-muted-foreground` |
| `text-white` (on non-button surfaces) | `text-foreground` |
| `bg-[#0a0f1e]` | `bg-background` (or `bg-card` for nested panels) |
| `border-[#1e2d4a]` | `border-border` |
| `placeholder-gray-700` etc. | `placeholder:text-muted-foreground` |
| Inline `style={{ color: 'white' }}` on text | remove + add `className="text-foreground"` |

Keep untouched:
- Hero section in `src/routes/index.tsx` (`text-white`, `bg-white/8`, `text-white/40`) — these sit on `.bg-hero` and are intentional.
- Gradient action buttons (`bg-gradient-to-r ... text-white`) — buttons are inverted by design.
- `bg-black` on `<video>`/`<canvas>` letterbox backgrounds and dialog overlays (`bg-black/80`) — these are media frames, not text surfaces.

### 3. Verify no regressions

- Scan `src/components/` — already uses tokens (verified: ai-badges, tool-page-shell, card/input/textarea). No edits needed.
- Confirm `role-spinner.tsx` and `spinning-wheel.tsx` already use tokens — no edits.
- Toggle theme in preview after edits; the listed tool pages should render with readable text in both light and dark mode.

## Out of scope

- No functionality, layout, behavior, or animation changes.
- No edits to hero, header, footer, buttons, dialogs, video/canvas backgrounds, or `routeTree.gen.ts`.
- No new dependencies.
