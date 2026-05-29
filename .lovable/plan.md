## Add Tetris to Mini Games

Add a fully playable Tetris game to the `minigames` category, mirroring the structure of `src/routes/tools.snake.tsx`. English-only UI.

### 1. Registry (`src/lib/tools.ts`)
- Add `Layers` to the existing `lucide-react` import line.
- Append one tool entry after `sudoku`:
  - `tetris` → icon `Layers`, path `/tools/tetris`, category `minigames`.

### 2. Tetris route (`src/routes/tools.tetris.tsx`)
Standard shell: `createFileRoute("/tools/tetris")` + SEO `head()` + `ToolPageShell` + game UI + `HowToUse` + `RelatedTools` + `ToolSeoContent`.

**Constants**: 10×20 grid, 30px cell, 7 tetrominoes (I/O/T/S/Z/J/L) with all rotations pre-computed, classic colors, 20-tier level speed table (800ms → 30ms), score table `[0,100,300,500,800]`.

**State**: Canvas refs for board/next-piece; mutable refs for `board`, `piece`, `nextPiece`, `score`, `lines`, `level`, `interval`; React state mirrors for UI (`score`, `lines`, `level`, `best`, `phase`). `best` persisted to `localStorage["tetris-best"]` with SSR guard.

**Core logic**:
- `createEmptyBoard`, `randomPiece`, `getShape`, `spawnPiece`.
- `isColliding(board, piece, dx, dy, dr)` — wall + floor + occupied checks.
- `placePiece`, `clearLines` — lock + line clear with score multiplier × level.
- `tick`: gravity step, lock on collision, clear lines, update score/level, spawn next, game-over detection, re-arm interval based on new level speed.

**Rendering**:
- `drawBoard`: dark background, faint grid, placed cells, ghost piece (outline at landing position), active piece — all with 3D highlight/shadow per cell.
- `drawNextPiece`: 4×4 preview canvas, centered.

**Controls**:
- Keyboard: arrows (move/soft-drop), Up/X (rotate CW with wall-kick ±1), Z (rotate CCW), Space (hard drop +2pts/row), P/Escape (pause).
- Touch: swipe left/right to move (proportional steps), swipe down hard drop, swipe up or tap to rotate.
- Mobile on-screen buttons: rotate, left, hard drop, right.

**Game flow**: `startGame` resets all refs/state and starts interval; `togglePause` clears/restarts interval; game-over overlay with new-best badge.

**HowToUse**: 3 steps (keyboard, line clearing, mobile controls).

**ToolSeoContent**: title "Tetris — Free Online Classic Block Game", description, 2 paragraphs, 4 FAQs (rotation, ghost piece, scoring, speed progression).

### Technical Notes
- `routeTree.gen.ts` auto-regenerates via TanStack Router Vite plugin.
- All `localStorage` access SSR-guarded.
- Refs used for hot game-loop state to avoid React re-render thrash; React state only mirrors values shown in UI.
- No new dependencies, no backend changes.

### Out of Scope
- No edits to `routeTree.gen.ts`, footer, home, or `tools.index.tsx`.
- No hold-piece, no T-spin scoring, no SRS-complete wall kicks, no audio.
