# Space Shooter + Reusable Mobile Controls

## Part 1 — Space Shooter game

**Route:** `/tools/space-shooter` (matches existing game convention; tools list uses `/tools/*` paths, not `/games/*`).

**Files:**
- `src/routes/tools.space-shooter.tsx` — new route with head() (title, meta description, canonical = `https://skycally.com/tools/space-shooter`, og tags).
- `src/components/games/space-shooter/SpaceShooterGame.tsx` — canvas game component.
- Register entry in `src/lib/tools.ts` under `minigames` category with Rocket icon, slug `space-shooter`.

**Page structure** (follows existing game pages):
- `ToolPageShell` with H1 "Space Shooter" + subtitle "Destroy alien ships and survive the galaxy attack!" + "No signup required" badge.
- Game canvas (max-w 480px desktop, full width mobile).
- Desktop controls hint: "← → to move • Space to shoot".
- Mobile controls overlay (joystick bottom-left, fire button bottom-right, AUTO 🔥 toggle above canvas).
- `HowToUse` block.
- `ToolSeoContent` with H2, 3 paragraphs (~80 words each), 4 FAQs as specified.
- `RelatedTools` showing Snake, 2048, Wordle.

**Canvas game engine** (single rAF loop):
- Player ship bottom-center, left/right move, shoot upward, 3 lives, invincibility flash after hit.
- Enemy grid 5×3, left/right drift, descend on edge bounce, random downward bullets.
- Player bullets cyan, enemy bullets red/orange. AABB collision.
- Score (+10 per enemy), wave counter (faster each wave), lives icons — all rendered inside canvas.
- Parallax star background, occasional nebula sprite drawn procedurally.
- Particle explosion on hit, brief red flash when player loses life.
- Start screen ("SPACE SHOOTER" + Tap/Space to start + brief instructions), Game Over screen (final score, wave, Play Again button — hit-test inside canvas).
- High score persisted to `localStorage` (key `space-shooter:high`).

**Input:**
- Keyboard: ArrowLeft/A, ArrowRight/D, Space (with key-repeat throttled to ~150ms per shot).
- Touch: virtual joystick (outer 80px, thumb 35px) + fire button (80px, ⚡ icon, hold = auto-repeat 200ms) + AUTO toggle pill (default ON, fires every 300ms). Touch handlers use `touchstart/touchmove/touchend` with `preventDefault` on the joystick/fire zones so canvas swipes don't conflict.
- Mobile controls only rendered when `'ontouchstart' in window`. Opacity 0.75.

## Part 2 — Reusable MobileControls component

**File:** `src/components/games/MobileControls.tsx`

Exposes:
- `<MobileDpad onChange={(dir) => void} variant="4way" | "horizontal" />` — emits `'up'|'down'|'left'|'right'|null`.
- `<MobileActionButton label icon onPress onRelease />` — touch hold support.
- `<MobileControls>` wrapper that auto-hides when no touch capability.

**Applied to existing keyboard-driven games:**
- Snake (4-way dpad)
- Tetris (4-way + rotate button)
- 2048 (swipe is already supported via touch; add 4-way dpad for parity)
- Pac-Man (4-way)
- Breakout (horizontal dpad)
- Flappy Bird (single tap button — already touch-friendly; skip if already mobile-OK)
- Tunnel Dash (4-way)
- Pinball (left/right flipper buttons)

For each: import MobileControls, render below the canvas, dispatch synthetic key events or call existing input handlers. No business-logic changes — only adds a touch input surface alongside existing keyboard handling.

## Verification
- Visit `/tools/space-shooter` in preview at desktop + mobile viewports; confirm gameplay, controls, SEO content.
- Quick check each updated keyboard game still works with keyboard and now responds to on-screen controls in mobile viewport.

## Technical notes
- Canvas uses `requestAnimationFrame` with delta-time; logical resolution 480×640, CSS-scaled to container width preserving aspect ratio.
- All UI text English only (per project rule).
- Tools list entry uses Rocket from lucide-react.
