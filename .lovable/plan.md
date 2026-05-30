## Plan — Add "Arrows GO!" Mini Game

### Step 1 — `src/lib/tools.ts`
- Add `ArrowRight` to the existing `lucide-react` import.
- Insert new tool entry right after the `chess` entry:
  ```ts
  { slug: "arrows-go", name: "Arrows GO!", description: "Follow the arrows and visit every cell exactly once. Can you clear the board?", category: "minigames", icon: ArrowRight, path: "/tools/arrows-go" },
  ```

### Step 2 — `src/routes/tools.arrows-go.tsx`
Create new route file mirroring the structure of `tools.chess.tsx`:
- `createFileRoute("/tools/arrows-go")` with `head()` SEO meta.
- Wrap UI in `ToolPageShell` (title "Arrows GO!", description as above).
- Game engine per spec:
  - Types `Dir`, `CellState`, `Cell`, `Level`.
  - `ARROW_SYMBOL`, `DIR_DELTA` constants.
  - 20 handcrafted `LEVELS` exactly as provided.
  - State: `levelIndex`, `grid`, `pos`, `path`, `visitedCount`, `totalCells`, `phase`, `lives` (5), `hints` (3), `moves`, `bestMoves` (localStorage `arrowsgo-best`), `hintCell`.
  - `initLevel`, `step`, `handleDead`, `useHint` per spec.
  - Keyboard: Space/ArrowRight → step, R → reset, H → hint.
  - SSR-safe localStorage read inside `useEffect` (like Flappy Bird fix).
- UI:
  - Top bar with hearts (lives), level label, progress count.
  - Progress bar (`visitedCount / totalCells`).
  - CSS grid board with arrow cells, current/visited/hint highlighting, dynamic `cellSize`.
  - GO button (primary action), Hint button (shows remaining), Reset button.
  - Level selector grid (1–20) showing current/cleared/locked styling using `bestMoves`.
  - Win overlay (🎉 with Next Level / Replay, "🏆 Best!" badge when applicable).
  - Game-Over overlay (💔 Try Again) when `lives <= 0`.
- Sound effects via `@/lib/sound`: `click` on valid step + hint, `fail` on dead end, `playChord(["success","win"])` on win, `die` when lives hit 0.
- Add `HowToUse` block with the 3 steps provided.
- Add `RelatedTools` (matching chess pattern).
- Add `ToolSeoContent` with provided title/description plus 2 body paragraphs and 4 FAQs (how to win, dead-end behavior, keyboard shortcuts, hint system).

### Step 3 — Route tree
- TanStack Router Vite plugin auto-regenerates `src/routeTree.gen.ts`; manually add the new route to keep types in sync (matching how previous mini-games were registered).

### Notes
- Pure JSX/CSS grid — no canvas, no new deps.
- All design tokens via `bg-card`, `border-border`, `text-primary-foreground`, etc. — no raw colors.
- English-only UI strings.
