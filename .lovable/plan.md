## Add Word Search to Mini Games

Add a fully playable Word Search game to the `minigames` category, mirroring the structure of `src/routes/tools.hangman.tsx`. English-only UI.

### 1. Registry (`src/lib/tools.ts`)
- Add `Search` to the existing `lucide-react` import line.
- Append one tool entry after `tetris`:
  - `word-search` → icon `Search`, path `/tools/word-search`, category `minigames`.

### 2. Word Search route (`src/routes/tools.word-search.tsx`)
Standard shell: `createFileRoute("/tools/word-search")` + SEO `head()` + `ToolPageShell` + game UI + `HowToUse` + `RelatedTools` + `ToolSeoContent`.

**Word bank**: 6 categories (Animals, Countries, Sports, Technology, Food, Space), 12 words each.

**Difficulty configs**:
- Easy: 10×10 grid, 6 words, H+V only.
- Medium: 13×13 grid, 9 words, H+V+2 diagonals.
- Hard: 15×15 grid, 12 words, all 8 directions including reverses.

**Grid generation**: random placement per word (up to 100 attempts each), overlap allowed when letters match, remaining cells filled with random letters.

**State**: `difficulty`, `category`, `grid`, `placedWords`, `selecting`, `startCell`, `currentCell`, `foundCells`, `phase` (`setup` | `playing` | `won`), `time`, `best` per-difficulty in `localStorage["wordsearch-best"]` (SSR-guarded).

**Selection**: mouse + touch drag on the grid container; pointer position resolved to a `[row, col]` via container `getBoundingClientRect`. `getLineCells` snaps the selection to a straight line (H/V/D). On pointer-up, compare selected letters (and reverse) against unfound words; mark all matching cells as found.

**Rendering**:
- Square grid with `display: grid` + `gridTemplateColumns: repeat(N, 1fr)`, `touch-none select-none`.
- Each found word gets its own color from a 12-color palette; cells show the word's color persistently. In-progress selection highlights with `bg-primary/40`.
- Word list below grid: chips strike-through with their assigned color when found.
- Stats bar: words found counter, timer, best time for current difficulty.

**Setup screen**: category grid (6 buttons), difficulty selector (Easy/Medium/Hard), Start button.

**Win overlay**: centered modal with time, new-best badge when applicable, Play Again + Change Category buttons.

**Timer**: 1s interval while `phase === "playing"`.

**HowToUse**: 3 steps (choose category/difficulty, drag to select, find all words fast).

**ToolSeoContent**: title "Word Search — Free Online Word Finding Puzzle", description, 2 paragraphs, 4 FAQs (directions, categories, difficulty differences, touch support).

### Technical Notes
- `routeTree.gen.ts` auto-regenerates via the TanStack Router Vite plugin.
- All `localStorage` access SSR-guarded.
- `cn` from `@/lib/utils` used for conditional class composition.
- No new dependencies, no backend changes.

### Out of Scope
- No edits to `routeTree.gen.ts`, footer, home, or `tools.index.tsx`.
- No hints, no word definitions, no multiplayer, no audio.
