## Add Pac-Man mini game

Mirror the Breakout / Bubble Shooter pattern.

### 1. Create `src/routes/tools.pac-man.tsx`
- `createFileRoute("/tools/pac-man")` with `buildPageMeta` head (title, description, og, canonical = `https://skycally.com/tools/pac-man`) + JSON-LD Game script.
- `ToolPageShell` title "Pac-Man", subtitle "Eat all the dots and avoid the ghosts. Classic arcade fun!"
- HTML5 `<canvas>` game:
  - Hand-crafted maze grid (~21 cols × 23 rows) with walls, dots, 4 power pellets
  - Pac-Man entity with tile-based movement + smooth interpolation, mouth animation
  - 4 ghosts (Blinky red, Pinky pink, Inky cyan, Clyde orange) — simple AI: Blinky chases, Pinky targets 4 tiles ahead, Inky/Clyde use semi-random/distance-based heuristics; reverse direction & turn blue when frightened
  - Power pellet → 6s frightened mode; eating ghost = 200/400/800/1600 points; ghost respawns in pen
  - Dot = 10 pts, power pellet = 50 pts; clear all dots → next level (ghost speed up)
  - 3 lives, lose life on ghost contact, reset positions; game over modal
  - Difficulty selector (Easy / Medium / Hard) → ghost speed multiplier
  - HUD: Score • Lives • Level • Best (localStorage key `pac-man-best`)
  - Controls: Arrow keys + WASD on desktop, swipe gestures on mobile (touchstart/touchend delta)
- Sections: `<HowToUse>` (3 steps), `<ToolSeoContent>` (title, description, 2-3 body paragraphs ~150-200 words, 4 FAQs), `<RelatedTools currentSlug="pac-man" />`

### 2. Edit `src/lib/tools.ts`
- Add `Ghost` to the lucide-react import
- Append minigames entry:
  ```ts
  { slug: "pac-man", name: "Pac-Man", description: "Eat all the dots and avoid the ghosts in this classic arcade maze game!", category: "minigames", icon: Ghost, path: "/tools/pac-man" }
  ```

### 3. Edit `src/lib/related-tools.ts`
- Add `"pac-man": ["snake", "breakout", "bubble-shooter"]`

### Auto-propagation
Tools index grid, footer Mini Games column, sitemap.xml, and the TanStack route tree iterate over `tools` — the new entry appears in all three automatically.
