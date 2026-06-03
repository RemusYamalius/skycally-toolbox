# Add Pinball Mini Game

Mirror the pattern used by Tunnel Dash, Solitaire, and Pac-Man.

## Files

**Create `src/routes/tools.pinball.tsx`**
- `createFileRoute("/tools/pinball")` with `buildPageMeta` (title "Pinball — Free Online Arcade Game, No Download", description, canonical, og:url) and JSON-LD Game schema per spec.
- `ToolPageShell` — title "Pinball", subtitle "Choose your table and beat the high score. Classic arcade pinball!".
- Canvas-based pinball engine (~640×900 playfield, scaled responsively):
  - **Custom 2D physics** (no external lib): circle ball with gravity (~0.35 px/frame²), velocity integration, air friction (0.999), wall collisions with restitution (~0.7), bumper/slingshot kick impulses, flipper swept-arc collision using angular velocity to impart speed.
  - **Flippers**: two rotating segments anchored near the bottom, rest angle ~25°, active angle ~-35°, angular speed tuned for snappy response and momentum.
  - **3 tables**, each defined as a data object (walls, arcs, bumpers, slingshots, ramps, targets, plunger lane, drain gap, theme colors, label, special-mode trigger):
    1. **Amazon Hunt** (default) — green/gold/brown, 3 bumpers, 2 ramps, 1 loop, 4 targets, 2 slingshots; clearing all 4 targets triggers "Amazon Bonus" multiball (2 extra balls for 15s).
    2. **Space Odyssey** — dark blue/purple/neon, 3 bumpers, 2 ramps, rotating targets (orientation cycles), wormhole loop; hitting wormhole triggers "Hyperspace" (ball speed ×2 for 10s).
    3. **Dragon's Lair** — red/orange/black, 4 bumpers, 3 ramps, dragon target, drawbridge that opens after 3 dragon hits → "Dragon Fire" massive bonus (+25000 × multiplier).
  - **Table picker** above canvas (3 buttons with theme color swatches); switching resets the current game.
  - **Game mechanics**: 3 balls, multiplier 1×→2×→3×→5× (steps on ramp/loop completions), end-of-ball bonus, in-session high score (`useRef`/`useState`, no persistence per spec — "saved in session"), tilt meter that fills on nudges (X / Space hold) and drains over time; over-tilt drains the ball + flashes "TILT"; "Shoot Again" awarded above a score threshold per ball.
  - **Controls**:
    - Desktop: Z / ArrowLeft = left flipper, / / ArrowRight = right flipper, Space = launch (hold to charge plunger power), X = nudge.
    - Mobile: on-screen left/right flipper buttons (pointer events, large touch targets), tap plunger area to launch (drag down then release to charge), nudge button (or `devicemotion` shake when available, fall back to button).
  - **Web Audio API** sound module (no external assets — synthesize on the fly):
    - Flipper click (short noise burst + high-pass), launch spring (descending sawtooth sweep), bumper (square pop + decay), ramp swoosh (filtered noise sweep), target thud (low sine pluck), multiball fanfare (3-note major arpeggio), drain (descending tone + brief filtered noise "oh no"), high-score jingle (4-note motif), tilt buzz (50Hz square gated), "Shoot Again" (two-note rising chime).
    - Per-table background loop (simple retro arpeggio pattern using oscillators with table-specific scale + tempo); starts on first user interaction (autoplay policy). Mute button in HUD.
  - **Visual effects**: bumpers flash bright on hit (8-frame decay), targets light up persistently when cleared, score counter scales+pulses on big hits, full-canvas white flash on multiball, particle burst (8–12 short-lived dots) on bumper hits using table accent color, scrolling glow gradient on active ramps.
  - **HUD overlay**: score, multiplier, balls remaining, current table name, high score, tilt meter bar, mute toggle, "New Game" button.
  - **End-of-game modal**: final score, high-score celebration if beaten, "Play Again" + "Change Table" buttons.
- `<HowToUse>` block (3 steps: launch the ball, control flippers, hit bumpers and targets for multipliers).
- `<ToolSeoContent>` with SEO title, description, 2–3 paragraph body (~150–200 words on browser pinball), 4 FAQs (controls, tables, mobile support, sound).
- `<RelatedTools currentSlug="pinball" />`.

**Edit `src/lib/tools.ts`**
- Add `Zap` (or reuse an existing arcade icon like `Joystick`) to lucide imports — use `Zap` for Pinball.
- Append entry: `{ slug: "pinball", name: "Pinball", description: "Classic arcade pinball with 3 tables, realistic physics, and full sound effects!", category: "minigames", icon: Zap, path: "/tools/pinball" }`.

**Edit `src/lib/related-tools.ts`**
- Add `"pinball": ["breakout", "bubble-shooter", "pac-man"]`.

## Auto-propagation
Tools index grid (Mini Games category), site footer Mini Games column, `sitemap.xml`, and TanStack route tree all iterate over `tools` → the new entry appears in all three automatically.
