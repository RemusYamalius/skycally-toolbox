## Add Whack-a-Mole Mini Game

### Files to create

**`src/routes/tools.whack-a-mole.tsx`** — mirrors `tools.sliding-puzzle.tsx` / `tools.memory-match.tsx`:
- `createFileRoute("/tools/whack-a-mole")` with `head()` using `buildPageMeta` (title: `Whack-a-Mole — Free Online Game, No Download`, description as provided) plus `scripts` entry for the Game JSON-LD block.
- `<ToolPageShell title="Whack-a-Mole" description="Tap the moles before they disappear! How high can you score?">`.
- Game state: difficulty (easy/medium/hard) controlling duration (30/20/15s) and mole show interval (~900/650/450ms), 9-hole grid, active mole index, score, misses, high score persisted via `sessionStorage`, timer.
- Logic: on Start, schedule moles via `setInterval`; each mole stays visible briefly then auto-hides (counts as miss if not whacked). Click handler increments score and hides early. On timer end, show Game Over overlay with score, hits/misses, accuracy %, new high-score badge if beaten.
- Visual style matches existing minigames: rounded grid cells with `bg-secondary`, accent color on active mole (emoji or simple SVG), big score/timer stats above grid, Start / Reset buttons.
- Ends with `<HowToUse>`, `<ToolSeoContent>` (4 FAQs), `<RelatedTools currentSlug="whack-a-mole" />`.

### Files to edit

**`src/lib/tools.ts`** — add to minigames block:
```ts
{ slug: "whack-a-mole", name: "Whack-a-Mole", description: "Tap the moles before they disappear! Classic arcade reaction game.", category: "minigames", icon: Hammer, path: "/tools/whack-a-mole" }
```
(Import `Hammer` from `lucide-react`.)

**`src/lib/related-tools.ts`** — add:
```ts
"whack-a-mole": ["flappy-bird", "snake", "memory-match"],
```

### Automatic propagation

`/tools` Mini Games grid, footer Mini Games column, and `sitemap.xml` all iterate over `tools` filtered by category — new entry appears automatically. TanStack Router regenerates `routeTree.gen.ts`.
