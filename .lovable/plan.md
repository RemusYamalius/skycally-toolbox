## Restore floating particles in the hero

Add back the decorative floating particles layer to the hero `<section>` in `src/routes/index.tsx` — a subtle animated effect that was present before the recent hero simplification.

### Implementation

In `src/routes/index.tsx`, inside the hero `<section>` (after the existing blurred radial gradients, before `.relative w-full max-w-6xl mx-auto ...`), inject a `pointer-events-none` absolute layer containing ~18 small particles.

Each particle:
- Absolute-positioned with pseudo-random `top` / `left` (deterministic array so SSR + client match — no `Math.random()` at render).
- Size ~2–6px, `rounded-full`, tinted with `var(--cyan-brand)` or `var(--violet-brand)` at low opacity (0.35–0.6).
- Soft glow via `box-shadow: 0 0 12px currentColor`.
- Uses existing `animate-float` utility (already defined in `src/styles.css`) with staggered `animation-delay` and slightly varied `animation-duration` so they don't move in unison.
- A couple of larger, more blurred particles for depth.

Respect existing mobile rule: `.animate-float { animation: none; }` on `max-width: 768px` already disables motion on mobile — no extra work needed.

### Out of scope
- Hero copy, typed word, search, stats grid — untouched.
- No new dependencies, no canvas, no JS animation loop (pure CSS keyframes).
- No changes to `styles.css` (the `float-slow` keyframe already exists).
