## Add Crossword Mini Game

### Files to create

**`src/routes/tools.crossword.tsx`** — mirrors `tools.sliding-puzzle.tsx`:
- `createFileRoute("/tools/crossword")` with `head()` using `buildPageMeta` (title: `Crossword Puzzle — Free Online Game, No Download`, description as provided) + `scripts` entry for Game JSON-LD.
- `<ToolPageShell title="Crossword" description="Solve the clues across and down. Can you complete the puzzle?">`.
- 3 hand-authored puzzles (small ~10×10 grids with mixed Across/Down words and short clues). Each puzzle: `{ size, grid: string[][] (uppercase letter or "." for block), clues: { across: {num, clue, row, col, answer}[], down: same } }`. Numbering derived at render time from grid.
- State: current puzzle index, user letters 2D array, selected cell `{row,col}`, direction (`across`/`down`), timer, started flag, checked map (`correct`/`wrong`/`null` per cell), completed flag.
- Interactions: click cell to select; clicking same cell toggles direction; typing letter fills + advances within current word; Backspace clears + steps back; arrow keys move within grid skipping blocks.
- Selected word highlighted with `bg-primary/20`, active cell with `bg-primary/40`, blocks `bg-foreground` (black), correct cells green, wrong red.
- Buttons: Check (sets per-cell verdicts), Reveal (fills solution), New Puzzle (rotates), Reset.
- Completion detection: when all cells filled correctly → stop timer, show celebration banner.
- Clue panel beside/below grid: two columns (Across / Down) listing numbered clues, current clue highlighted.
- Ends with `<HowToUse>`, `<ToolSeoContent>` (4 FAQs), `<RelatedTools currentSlug="crossword" />`.

### Files to edit

**`src/lib/tools.ts`** — add to minigames block:
```ts
{ slug: "crossword", name: "Crossword", description: "Classic crossword puzzles with Across and Down clues. Solve them right in your browser.", category: "minigames", icon: Grid3x3, path: "/tools/crossword" }
```
(Import `Grid3x3` from lucide-react.)

**`src/lib/related-tools.ts`** — add:
```ts
"crossword": ["wordle", "hangman", "word-search"],
```

### Automatic propagation

`/tools` Mini Games grid, footer Mini Games column, and `sitemap.xml` iterate over `tools` filtered by category → new entry appears everywhere. TanStack Router regenerates `routeTree.gen.ts`.
