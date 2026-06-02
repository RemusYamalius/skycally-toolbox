## Add Breakout (Brick Breaker)

Mirror the Bubble Shooter implementation pattern.

### 1. Create `src/routes/tools.breakout.tsx`
- `createFileRoute("/tools/breakout")` with `buildPageMeta` head (title, description, og tags, canonical) + JSON-LD Game scripts block.
- `ToolPageShell` title "Breakout", description "Break all the bricks before you run out of lives!"
- HTML5 `<canvas>` game:
  - Paddle controlled by mouse move, arrow keys, and touch drag
  - Ball with wall/paddle/brick collision and angle deflection based on paddle hit position
  - Brick grid (e.g. 10 cols × 6 rows) with 3 tiers: red=3 hits/30pts, orange=2 hits/20pts, green=1 hit/10pts
  - 3 lives, lives + score HUD, level counter
  - Difficulty selector (Easy/Medium/Hard) → controls ball speed and paddle width
  - Speed ramps up slightly per level; win → next level with faster ball
  - Game over modal with restart; best score in `localStorage` (`breakout-best`)
- Sections: `<HowToUse>` (3 steps), `<ToolSeoContent>` (title, desc, 2-3 body paragraphs ~150-200 words, 4 FAQs), `<RelatedTools currentSlug="breakout" />`

### 2. Edit `src/lib/tools.ts`
- Add lucide icon (reuse existing e.g. `Square` or add `Gamepad2` — already imported; use a non-duplicate one like `Boxes` — already used. Use `Grid2x2` — used. Add new icon `LayoutPanelTop` or reuse `Layers` — used. Use new import `Brick`? Not in lucide. Use `Rows3` → add to import.)
- Append entry: `{ slug: "breakout", name: "Breakout", description: "Classic brick breaker — bounce the ball and clear all the bricks!", category: "minigames", icon: Rows3, path: "/tools/breakout" }`

### 3. Edit `src/lib/related-tools.ts`
- Add `"breakout": ["flappy-bird", "snake", "bubble-shooter"]`

### Auto-propagation
Tools page Mini Games grid, footer Mini Games column, sitemap.xml, and the TanStack route tree all iterate over `tools` — new entry shows up everywhere.
