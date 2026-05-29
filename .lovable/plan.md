## Add Sudoku to Mini Games

Add a fully playable Sudoku game to the `minigames` category, mirroring the structure of `src/routes/tools.minesweeper.tsx`. English-only UI.

### 1. Registry (`src/lib/tools.ts`)
- Add `Hash` to the existing `lucide-react` import line (note: `Hash` is already imported — will reuse without duplicating).
- Append one tool entry after `minesweeper`:
  - `sudoku` → icon `Hash`, path `/tools/sudoku`, category `minigames`.

### 2. Sudoku route (`src/routes/tools.sudoku.tsx`)
Standard shell: `createFileRoute("/tools/sudoku")` + SEO `head()` + `ToolPageShell` + game UI + `HowToUse` + `ToolSeoContent` + `RelatedTools`.

**Types & constants**
- `Grid = (number | null)[][]`, `Difficulty = "easy" | "medium" | "hard"`.
- `CLUES = { easy: 45, medium: 35, hard: 25 }`.

**Puzzle generation**
- `isValid(grid, r, c, n)` checks row, column, 3×3 box.
- `solveSudoku(grid)` backtracking solver (numbers shuffled for generation randomness).
- `generateSolved()` produces a complete valid grid.
- `createPuzzle(solved, clues)` removes cells in random order, restoring any removal that breaks solvability.

**State**
- `difficulty`, `puzzle`, `solution`, `userGrid`, `given: boolean[][]`, `selected: [r,c] | null`, `notes: Set<number>[][]`, `noteMode`, `errors: boolean[][]`, `phase: "setup" | "playing" | "won"`, `time`, `hints` (start 3), `best: Record<Difficulty, number>` persisted to `localStorage["sudoku-best"]` (SSR-guarded with `mounted` flag).

**Interactions**
- `startGame` generates solved → puzzle → resets all state, phase → `playing`.
- `handleInput(n)`: ignores given cells; in note mode toggles pencil marks; otherwise sets/clears digit, recomputes `errors` against `solution`, checks win → update best time.
- `useHint`: fills selected cell with solution value, decrements hints (max 3), clears that cell's error.
- Keyboard: `1–9` input, `Backspace`/`Delete` clear, `N` toggle notes, arrow keys move selection.
- `getCellClass`: highlights selected cell, same row/col/box, and matching number.

**UI**
- Setup screen: difficulty selector (with clue counts), per-difficulty best times, Start button.
- Toolbar above grid: timer, Notes toggle, hint button (💡 + count), New game (🔄), difficulty label.
- Grid: 9×9 with thick borders on 3×3 box boundaries; given cells bold foreground; errors red; user entries primary; notes rendered as a 3×3 mini-grid of pencil marks.
- Number pad (1–9 + clear).
- Win overlay with time, "New Best Time" badge when applicable, New Puzzle / Change Difficulty buttons.

**Timer**
- `useEffect` on `phase === "playing"` runs `setInterval(1000)`, cleared on cleanup.

**HowToUse + ToolSeoContent** per prompt (title, description, 2 paragraphs, 4 FAQs: notes, hints, difficulty levels, keyboard controls).

### Technical Notes
- `routeTree.gen.ts` auto-regenerates via the TanStack Router Vite plugin — no manual edit.
- All `localStorage` access SSR-guarded via `mounted` flag (same approach as Minesweeper/2048).
- Game-specific accent colors (red for errors, yellow for hints, primary for highlights) are intentional game-of-brand exceptions.
- No new dependencies, no backend changes.
- `Hash` icon already present in the `tools.ts` import line — will not duplicate.

### Out of Scope
- No edits to `routeTree.gen.ts`, `site-footer.tsx`, `index.tsx`, or `tools.index.tsx`.
- No shared components, no analytics, no persistence beyond `localStorage` best times.
