# Improve Mobile Controls for Mini Games

The user reports that several mini games work great on desktop but are hard to control on mobile (Tetris, Pinball, Pac-Man, and others). Audit shows most games already have *some* touch handler, but quality varies: tiny buttons, swipe-only with no on-screen pad, no auto-repeat for hold, ghost touches scrolling the page, etc.

## Scope (games to upgrade)

Keyboard-driven games that need mobile-friendly controls:

1. **Tetris** — has small on-screen buttons; needs bigger, properly spaced D-pad + Rotate/Drop, hold-to-repeat for left/right/soft-drop, prevent page scroll.
2. **Pinball** — has left/right flipper buttons; enlarge them, lock them to fixed bottom-left / bottom-right zones spanning full half-width so any thumb press triggers, add launch button.
3. **Pac-Man** — swipe only; add a visible 4-way D-pad overlay below the canvas for users who prefer tapping over swiping, keep swipe as alt.
4. **Snake** — same treatment: visible 4-way D-pad on mobile.
5. **Flappy Bird** — already tap-to-flap; just ensure the whole canvas area is the tap target and page doesn't scroll while playing.
6. **Space Shooter** — add on-screen left/right/fire buttons (hold-to-repeat fire).
7. **Breakout** — add a wide drag strip / left+right hold buttons under the canvas; ensure paddle follows finger drag on the canvas itself.
8. **Tunnel Dash** — add left/right hold buttons.
9. **2048** — swipe already works but is finicky; tighten swipe threshold and add a small 4-arrow pad fallback.

## Shared approach

Create one reusable component `src/components/game-controls.tsx` exporting:

- `<DPad onDirection={(dir) => ...} onRelease?={...} />` — 4-way pad with hold-to-repeat (configurable interval), `touch-none`, `pointerdown`/`pointerup`/`pointercancel`, `e.preventDefault()` to stop scroll.
- `<ActionButton label icon onPress onRelease repeatMs?>` — single button with optional hold-repeat.
- `<TouchZone side="left|right" onPress onRelease>` — full-half-width invisible flipper zone for pinball-style games.

All buttons:
- Min 56×56 px tap target.
- `touch-action: none` and `user-select: none`.
- `pointerdown` (not `touchstart`) so it works with stylus/mouse too.
- Visible only on `md:hidden` (mobile/tablet); desktop keeps keyboard.

Each game's mobile control block is rendered just below its canvas inside the existing layout, so the SEO/HowToUse sections stay untouched.

## Per-game edits

For every game above:
1. Replace its current ad-hoc touch buttons (or add a new block where missing) with the shared `<DPad>` / `<ActionButton>` / `<TouchZone>`.
2. Wire callbacks to the same internal move/rotate/fire functions the keyboard handlers already call (no game-logic changes).
3. Add `touch-action: none` to the canvas wrapper while the game is running to stop page scroll during play.
4. Keep all desktop keyboard behavior unchanged.
5. Update FAQ/HowToUse text only where it currently says "swipe only" to mention the on-screen pad.

## Out of scope

- No changes to game logic, scoring, or visuals.
- No changes to non-keyboard tools.
- No new dependencies.
- No router / SEO / related-tools changes.

## Verification

- Build passes.
- Preview each updated game on mobile viewport (487px): controls visible, big enough, page doesn't scroll while pressing, hold-to-repeat works for Tetris left/right and Space Shooter fire.
