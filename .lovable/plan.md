## 1. Remove Crossword

No Crossword files or registry entries exist — only `.lovable/plan.md` references it. Clean that up so nothing dangling remains:

- Delete `.lovable/plan.md` (only contains the obsolete Crossword spec).

No other files mention `crossword` (verified with `rg -i crossword`), so `src/lib/tools.ts`, the tools page grid, the footer, the sitemap, and `related-tools.ts` need no edits for the removal.

## 2. Add Bubble Shooter mini game

### New file: `src/routes/tools.bubble-shooter.tsx`

Mirror the structure of `tools.sliding-puzzle.tsx` / `tools.snake.tsx`:

- `createFileRoute("/tools/bubble-shooter")` with `head()` using `buildPageMeta({ title, description, path })` and a `scripts` entry injecting the Game JSON-LD (genre: `Arcade`, playMode: `SinglePlayer`, applicationCategory: `Game`).
- Title: `Bubble Shooter — Free Online Game, No Download`
- Description: `Play Bubble Shooter free in your browser. Match and pop colored bubbles. No download, no signup required. Works on mobile.`
- `<ToolPageShell title="Bubble Shooter" description="Aim, shoot, and pop bubbles before they reach the bottom!">`
- Score + Level + Best displays styled like Snake's score chips. Best persisted in `localStorage` (`bubble-shooter-best`).
- Game canvas (HTML5 `<canvas>`) responsive, max width ~sm; hex-grid of bubbles:
  - 8 columns, ~12 visible rows tall.
  - 6 colors mapped to theme-friendly hex (red, blue, green, yellow, purple, cyan).
  - Shooter cannon at bottom center with a queued + next bubble.
- Aiming: `mousemove` / `touchmove` over canvas updates aim angle; render a dashed trajectory line with one wall bounce as guide.
- Shooting: click / tap fires a bubble traveling at constant speed; collision with grid bubbles or top wall snaps it to the nearest empty hex cell.
- Match logic: flood-fill same-color cluster from landed bubble; if size ≥ 3, remove cluster, then flood-fill from top row to find connected bubbles and drop any disconnected ones (animated fall, then removal). Points: 10 per popped + 20 per dropped.
- Every 5 shots add a new row at the top, shifting existing rows down; check game-over (any bubble crosses bottom line).
- Level system: every time the board is fully cleared, level += 1, shot count to add a row decreases (5 → 4 → 3, min 2), new starting rows grow.
- Buttons: Start / Play Again (game-over overlay) + Reset, styled like Snake.
- Sound effects via existing `playSound("score" | "fail")` for pops + game over.
- Sections after the game (same pattern as other minigames):
  - `<HowToUse steps={[...]} />` — 3 short steps (aim, shoot, match 3+).
  - `<ToolSeoContent title description body faqs />` with 2 paragraphs (~150–200 words total) and 4 FAQs (controls, scoring, level system, mobile support).
  - `<RelatedTools currentSlug="bubble-shooter" />`.
- All UI text in English.

### Edit `src/lib/tools.ts`

- Add `Target` (or similar) to the `lucide-react` import line. Use `Target` to match the "aim" theme (already an existing lucide icon, no install needed).
- Append in the minigames block:
  ```ts
  { slug: "bubble-shooter", name: "Bubble Shooter", description: "Aim, shoot, and pop colored bubbles. Match 3 or more before they reach the bottom!", category: "minigames", icon: Target, path: "/tools/bubble-shooter" },
  ```

### Edit `src/lib/related-tools.ts`

Add inside the Mini Games block:
```ts
"bubble-shooter": ["snake", "flappy-bird", "memory-match"],
```

### Automatic propagation

- `/tools` Mini Games grid iterates `tools.filter(category === "minigames")` → new card appears automatically.
- `src/components/site-footer.tsx` Mini Games column reads from the same registry → footer link appears automatically.
- `src/routes/sitemap[.]xml.tsx` iterates `tools` → `/tools/bubble-shooter` is included automatically.
- TanStack Router regenerates `routeTree.gen.ts` on dev/build.

### Verification

After implementation:
- Visit `/tools/bubble-shooter` and play one round (aim, shoot, pop, game over).
- Confirm card visible at `/tools?cat=minigames` and footer Mini Games column.
- Confirm `/sitemap.xml` includes `/tools/bubble-shooter`.
