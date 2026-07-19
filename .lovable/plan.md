## Problem

The hero particles use `.animate-float` (a CSS keyframe). In `src/styles.css`, the mobile media query force-disables it:

```css
@media (max-width: 768px) {
  .animate-float { animation: none !important; }
}
```

That's why particles look static on phones. Also, every particle shares one 6–10s float keyframe, so movement looks uniform — not "random and lively" as requested.

## Fix

Replace the DOM-span + CSS keyframe approach with a small **Canvas 2D particle field** that runs on both desktop and mobile.

### File to change
- `src/routes/index.tsx` — only the "Floating particles" block (~lines 85–108 and 206–227). No changes to layout, gradients, or content.

### What the new component does
- New `HeroParticles` component rendered in the same absolute container.
- On mount:
  - Create a `<canvas>` sized to its parent (with `devicePixelRatio` scaling + `ResizeObserver`).
  - Generate ~40 particles on desktop, ~24 on mobile (based on viewport width), each with randomized:
    - position, radius (1.5–5px, plus a few large 8–12px blurred glow orbs),
    - velocity vector (faster than current: ~15–40 px/s), 
    - color (cyan / violet mix from CSS vars),
    - opacity, and a subtle sine "wobble" phase for organic drift.
  - `requestAnimationFrame` loop that:
    - Advances particles, wraps at edges,
    - Adds slow sine wobble to X so motion feels non-linear/random,
    - Redraws with `globalCompositeOperation = "lighter"` for a soft glow bloom.
  - Respects `prefers-reduced-motion`: renders a single static frame.
  - Pauses via `IntersectionObserver` / `document.visibilitychange` to avoid battery drain when off-screen.
- Uses `pointer-events: none` and `aria-hidden`.

### Why canvas
- One RAF loop is cheaper than 18 layered CSS-animated DOM nodes with `box-shadow` blur — better mobile perf than re-enabling the CSS animation.
- Sidesteps the site-wide mobile `animation: none !important` rule cleanly (no CSS override fight).
- Gives real randomness per particle instead of one shared keyframe.

### Cleanup
- Remove the `PARTICLES` constant and the `.map(...)` span block.
- Leave `.animate-float` keyframes in `styles.css` untouched (other files may use it).

## Out of scope
- No changes to gradients, headline, typed word, search, or below-the-fold sections.
- No new dependencies.
