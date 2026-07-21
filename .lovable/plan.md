## Issues confirmed

1. **Retirement Calculator missing from listings.** The route file `src/routes/tools.retirement-calculator.tsx` still exists and it is present in `related-tools.ts`, `sitemap.xml`, and `llms.txt`, but its entry in `src/lib/tools.ts` (the source of truth for the `/tools` grid, home page category filters, and search) is gone. That's why the card no longer appears.
2. **Hero particles reverted to DOM version.** `src/routes/index.tsx` still uses the old `PARTICLES` array with `<span className="animate-float">`, and `styles.css` disables `animate-float` on mobile (`@media (max-width: 768px) { .animate-float { animation: none !important; } }`). The previously-built `HeroParticles` canvas component was lost.

## Plan

### 1. Re-register Retirement Calculator in `src/lib/tools.ts`
Add the tool entry back next to the other finance calculators (near `compound-interest` / `paycheck-calculator` around line 1096-1128), category `utility`, with the same slug `retirement-calculator`, path `/tools/retirement-calculator`, an appropriate lucide icon (e.g. `PiggyBank` or `TrendingUp`), name "Retirement Calculator", and a concise description matching the tone of neighboring finance tools (e.g. "Project your 401(k) at retirement with a conservative-to-optimistic range, real employer match, and inflation-adjusted values.").

### 2. Restore animated canvas particles on the home hero
In `src/routes/index.tsx`:
- Reintroduce a `HeroParticles` component that renders a `<canvas>` filling the hero, animating ~48 particles on desktop / ~28 on mobile using `requestAnimationFrame`, with randomized velocities, gentle wobble, pulsing opacity, and soft radial-gradient glow (composite `lighter`).
- Use `ResizeObserver` to keep the canvas sized to its container, pause via the Page Visibility API when the tab is hidden, and respect `prefers-reduced-motion`.
- Replace the current `PARTICLES.map(...)` block (lines ~217–239) with `<HeroParticles />`, keeping it inside the same `absolute inset-0 pointer-events-none` wrapper and `aria-hidden`.
- Remove the now-unused `Particle` type and `PARTICLES` array.

Canvas-driven motion bypasses the mobile `animate-float` CSS kill-switch, so particles will move on both desktop and mobile with the requested faster, more random, prettier motion — no changes needed in `styles.css`.

### 3. Verify
Run typecheck; visually confirm the Retirement Calculator card appears under Utility on `/tools` and particles animate on both viewports.

## Out of scope
No changes to game logic, other tools, styles.css kill-switches (still valuable for other DOM-animated layers), or SEO files (retirement calculator is already listed there).
