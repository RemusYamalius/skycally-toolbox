## Plan — Replace Arrows GO! with Connect Four

### 1. Remove Arrows GO!
- Delete `src/routes/tools.arrows-go.tsx`.
- Remove the `arrows-go` entry from `src/lib/tools.ts`.
- Remove `ArrowRight` from the `lucide-react` import in `src/lib/tools.ts` (no other usage).
- Update `src/routeTree.gen.ts` to remove the `ToolsArrowsGoRoute` registration and type entries.

### 2. Add Connect Four to tools registry
- In `src/lib/tools.ts`, add `Circle` to the `lucide-react` import.
- Add the new tool entry in the minigames section:
  ```ts
  { slug: "connect-four", name: "Connect Four", description: "Drop discs and connect four in a row before the AI does. Classic strategy game!", category: "minigames", icon: Circle, path: "/tools/connect-four" }
  ```

### 3. Create `src/routes/tools.connect-four.tsx`
Full Connect Four implementation following the spec:

- **Route**: `createFileRoute("/tools/connect-four")` with `head()` SEO meta (title/description/og).
- **Game engine**: `ROWS=6`, `COLS=7`, `Cell` type, `emptyBoard()`, `dropDisc()`, `checkWinner()` (returns winning 4-cell list), `isDraw()`.
- **AI**: Minimax with alpha-beta pruning, `scoreWindow`/`scoreBoard` heuristic with center-column preference; depth per difficulty (easy 2 with 30% random, medium 4, hard 6).
- **State**: `board`, `turn`, `phase` (`idle | playing | won | draw`), `winner`, `winCells`, `hoverCol`, `scores`, `difficulty`.
- **Flow**:
  - `idle` → setup screen with title, difficulty selector, Start button.
  - `playing` → board with hover-column preview, click-to-drop, AI moves via `useEffect` with 400ms delay.
  - `won`/`draw` → modal overlay with emoji, message, score totals, Play Again button.
- **Sounds** (`@/lib/sound`):
  - Drop disc → `playSound("click")`
  - Human wins → `playChord(["success", "win"])`
  - AI wins → `playSound("lose")`
  - Draw → `playSound("fail")`
- **UI**:
  - Wrap in `ToolPageShell` (title + description).
  - Top: score/status bar (You · status · AI), with red/yellow disc indicators.
  - Disc preview row (shows red disc above hovered column on human turn).
  - 6×7 grid using CSS grid; cells use design tokens (no raw colors). Red = `--red-brand` (or fallback semantic), Yellow = `--yellow-brand`/`--orange-brand`; winning cells get a ring/glow.
  - Difficulty pills + New Game button.
  - `HowToUse` block with 3 steps.
  - `ToolSeoContent` with title, description, 2-paragraph body, 4 FAQs (how to win, difficulty levels, draw handling, controls).
  - `RelatedTools` (matching other minigame routes).
- **English-only** UI text throughout.

### 4. Update generated route tree
- Manually edit `src/routeTree.gen.ts`:
  - Remove all `ToolsArrowsGoRoute` references (import, registration, type maps).
  - Add `ToolsConnectFourRoute` import, child registration, `FileRoutesByPath`, `FileRoutesByFullPath`, `FileRoutesByTo`, `FileRoutesById`, and `rootRouteChildren` entries mirroring sibling tool routes.

### Notes
- Pure JSX/CSS — no canvas, no extra dependencies.
- All `playSound` calls inside user handlers or AI `useEffect` (not on mount).
- Responsive: board scales via grid with min cell size; column hover works on desktop, tap-to-drop on mobile.
