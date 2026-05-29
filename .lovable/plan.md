# Add Minesweeper to Mini Games

Add a fully playable Minesweeper game to the `minigames` category, following the exact pattern of `src/routes/tools.snake.tsx`. English-only UI.

## Scope

### 1. Registry (`src/lib/tools.ts`)
- Add `Bomb` to the existing `lucide-react` import line.
- Append one tool entry after `hangman`:
  - `minesweeper` → icon `Bomb`, path `/tools/minesweeper`, category `minigames`.

### 2. Minesweeper (`src/routes/tools.minesweeper.tsx`)
Standard route shell: `createFileRoute("/tools/minesweeper")` + SEO `head()` + `ToolPageShell` + game UI + `HowToUse` + `ToolSeoContent` + `RelatedTools`.

- **Difficulty configs:** `easy` (9×9, 10 mines), `medium` (16×16, 40), `hard` (16×30, 99).
- **Cell type:** `{ mine, revealed, flagged, adjacent }`.
- **State:** `difficulty`, `board`, `phase: "setup" | "playing" | "won" | "lost"`, `time`, `best: Record<Difficulty, number>` persisted to `localStorage["minesweeper-best"]` (SSR-guarded with `mounted` flag like 2048), `firstClick`, `flagCount`.
- **First-click safety:** mines are placed AFTER the first click, excluding the clicked cell and its 3×3 neighborhood.
- **Reveal:** flood-fill BFS expands when `adjacent === 0`.
- **Right-click:** toggles flag (also blocked when revealed); updates `flagCount`.
- **Chord click:** clicking a revealed numbered cell whose flagged-neighbor count equals its number reveals all unflagged neighbors (loses if any is a mine).
- **Loss:** reveals all mines, sets phase `lost`.
- **Win:** when revealed count === total − mines; update best time if lower (0 means unset).
- **Timer:** `useEffect` on `phase === "playing"` runs `setInterval(1000)`, cleared on cleanup.
- **Mobile:** `onTouchStart`/`onTouchEnd` long-press (500ms) triggers flag via a `useRef` timer.
- **UI:**
  - Setup screen: difficulty selector with labels + best times + Start button.
  - In-game header: `💣 mines − flags` left, smiley reset button (🙂/😎/😵) center, `⏱ time` right.
  - Board: horizontally scrollable wrapper for hard difficulty on mobile; classic numeric color palette (1 blue → 8 gray); cells use `bg-secondary` (covered), `bg-background` (revealed), `bg-red-500` (mine on loss), `bg-yellow-500/20` (flagged).
  - Win/Loss overlays with Play Again / Try Again buttons.
- HowToUse + ToolSeoContent (title, description, 2 paragraphs about the classic Windows game, 4 FAQs: mobile flagging, difficulty levels, chord clicking, best time tracking) per prompt.

## Technical Notes

- `routeTree.gen.ts` auto-regenerates via the TanStack Router Vite plugin — no manual edit.
- All `localStorage` access SSR-guarded; `best` initialized via `mounted` flag (same approach as 2048) to avoid hydration mismatch.
- Game-specific accent colors (classic Minesweeper number palette, red mine, yellow flag, green/red overlays) are intentional brand-of-game exceptions, same as Wordle/2048/Snake/Hangman.
- No new dependencies, no backend changes.

## Out of Scope

- No edits to `routeTree.gen.ts`, `site-footer.tsx`, `index.tsx`, or `tools.index.tsx`.
- No shared components, no analytics, no persistence beyond `localStorage` best times.
