# Add Sliding Puzzle Mini Game

## Files to create

**`src/routes/tools.sliding-puzzle.tsx`** — new route mirroring `tools.memory-match.tsx` / `tools.sudoku.tsx`:
- `createFileRoute("/tools/sliding-puzzle")` with `head: () => buildToolMeta(toolBySlug("sliding-puzzle", tools))` plus an extra `scripts` entry for the Game JSON-LD.
- `<ToolPageShell title="Sliding Puzzle" description="Slide the tiles into the correct order. How few moves can you do it in?">`.
- Game state: size selector (3/4/5), tile array, empty index, move counter, timer (starts on first move, stops on win, via `setInterval` ref).
- Logic: click/tap a tile adjacent to the empty slot to swap; arrow-key support; Shuffle button generates a solvable random permutation (apply N random valid moves from solved state to guarantee solvability); win when tiles are in order.
- Win overlay shows moves + formatted time; reset on size change or shuffle.
- Visual style matches other minigames (rounded grid, `bg-secondary`, accent on hover, big numbers).
- Ends with `<HowToUse>`, `<ToolSeoContent>` (4 FAQs), `<RelatedTools currentSlug="sliding-puzzle" />`.

## Files to edit

**`src/lib/tools.ts`** — add entry in the minigames block:
```ts
{ slug: "sliding-puzzle", name: "Sliding Puzzle", description: "Slide numbered tiles into order in the fewest moves. 3×3, 4×4, or 5×5.", category: "minigames", icon: Grid3x3, path: "/tools/sliding-puzzle" }
```
(Import `Grid3x3` from lucide-react if not already.)

**`src/lib/related-tools.ts`** — add:
```ts
"sliding-puzzle": ["sudoku", "memory-match", "minesweeper"],
```

## Automatic propagation

- Mini Games section on `/tools`, footer Mini Games column, and `sitemap.xml` all iterate over `tools` filtered by category, so the new entry appears in all three with no further edits.
- TanStack Router auto-regenerates `routeTree.gen.ts` from the new route file.

## SEO specifics

- Title: `Sliding Puzzle — Free Online Game, No Download` (overrides default `buildToolMeta` title by passing custom meta via a small inline override in `head()`, or by using `buildPageMeta` directly to set the exact title + description requested).
- Meta description: as provided in the prompt.
- JSON-LD Game block as provided, injected via `scripts` in `head()`.
- `ToolSeoContent` provides on-page SEO body + FAQs per project convention.
