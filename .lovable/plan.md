# Shooting Ball — Billiard Puzzle Game

Build a production-ready billiard/pool puzzle game at `/tools/shooting-ball` under Mini Games, using Matter.js loaded via CDN (matching the existing `loadScript` pattern used by gif.js, TF.js, COCO-SSD).

## Files

**New**
- `src/routes/tools.shooting-ball.tsx` — full game route: `ToolPageShell`, screens (Menu → Level Select → Game → Win/Lose → Settings), canvas rendering, aim UI, HUD, HowToUse, `ToolSeoContent`, `RelatedTools`, `AdZone` on Level Select only.
- `src/lib/shooting-ball/physics.ts` — Matter.js world setup, wall/ball bodies, pocket sensors, restitution/friction tuning, cue-strike impulse.
- `src/lib/shooting-ball/levels.ts` — level definitions (ball layout, required pockets, lives, par shots, goal type per level).
- `src/lib/shooting-ball/render.ts` — canvas draw: felt table, rails, pockets, balls with numbers/stripes, cue stick, aim line with predicted trajectory (dashed), power meter.
- `src/lib/shooting-ball/storage.ts` — localStorage for unlocked levels, stars, best scores, sound/vibration prefs.
- `src/lib/shooting-ball/matter-loader.ts` — mirrors `gif-loader.ts`: `loadMatterJs()` via `loadScript("https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js")`, typed `window.Matter` global.

**Edited**
- `src/lib/tools.ts` — register `shooting-ball` under Mini Games with 🎱 icon.
- `src/lib/related-tools.ts` — add to Bubble Shooter, Breakout, Ball Sort related arrays; give Shooting Ball its own related list.
- `public/sitemap.xml`, `public/llms.txt` — new URL entry.
- `src/routeTree.gen.ts` — auto handled by plugin; not manually edited.

## Game architecture

- **Screens**: state machine `"menu" | "levels" | "playing" | "won" | "lost" | "settings"`. Rendered conditionally inside ToolPageShell.
- **Physics**: Matter.js Engine + World running at 60fps via `Engine.update` in a `requestAnimationFrame` loop. Cue ball is a dynamic circle; colored balls dynamic; pockets are static sensor bodies detected via `Events.on(engine, "collisionStart")` to remove balls and score.
- **Aim**: on mousedown/touchstart on cue ball → drag to set direction + power (distance capped). Release applies `Body.applyForce`. Show dashed predicted line (raycast against nearest wall/ball, one bounce).
- **Levels**: 20 levels, increasing ball counts, obstacles (static pegs), and pocket-color constraints. Stars: 3 (par), 2 (par+2), 1 (any clear).
- **Lives**: shots remaining per level; scratch (cue ball pocketed) costs a life and respawns cue ball.
- **Assets**: pure canvas — no images. Felt gradient, wood rail, glossy ball shading via radial gradient.
- **Sounds**: reuse `src/lib/sound.ts` for hit/pocket/win/lose (WebAudio tones), gated by settings toggle.
- **Persistence**: `skycally.shooting-ball.v1` in localStorage.

## Integration

- Register only under Mini Games (per spec).
- Related: Bubble Shooter, Breakout, Ball Sort.
- SEO head(): title "Shooting Ball — Free Billiard Puzzle Game Online | Skycally", meta description with target keywords, OG/Twitter, `VideoGame` JSON-LD.
- `ToolSeoContent` with body + 4 FAQs (memory rule).
- `AdZone id="shooting-ball-mid" size="728x90"` rendered only on Level Select screen.

## Quality gates

- Matter.js loaded once, cached via existing `loadScript`; loading skeleton until ready.
- Cleanup: on unmount, `Engine.clear`, `World.clear`, cancel RAF, remove event listeners.
- Touch + mouse pointer events unified via Pointer Events API.
- Canvas resizes to container with `devicePixelRatio` scaling; logical table 800×450.
- No async event handlers; no `useCallback(async …)` at top level.
- TypeScript strict; declare `window.Matter` type in a local `.d.ts` block inside `matter-loader.ts`.
- English-only UI (memory rule).

## Out of scope

- No multiplayer, no leaderboards server-side, no npm dep (CDN only), no new images.
