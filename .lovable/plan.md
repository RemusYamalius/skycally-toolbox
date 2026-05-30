## Plan — Rewrite Arrows GO! as a Snake-Exit Puzzle

Replace `src/routes/tools.arrows-go.tsx` entirely with a new game where the player taps "free" arrows (arrows with a clear path to the board edge) to slide them out snake-style, freeing space for others. Goal: clear all arrows from a shaped grid.

### Step 1 — `src/lib/tools.ts`
No changes — the `arrows-go` entry already exists.

### Step 2 — `src/routes/tools.arrows-go.tsx` (full replacement)

Delete current contents and rebuild from scratch following the spec.

**Types & constants**
- `Dir`, `Arrow { id, dir, cells: [r,c][], exiting }`, `LevelDef`, `GridCell = -1 | 0 | number`.
- `DELTA`, `ARROW_SYMBOL`, `S(rows)` shape helper.
- `ARROW_COLORS` palette (10 tailwind color classes).

**Level pack**
- 15 handcrafted `LEVELS` exactly as provided in the prompt (square, diamond, plus, heart, arrow, star, T, anchor, butterfly, dog, trophy, 8×8 expert, etc.). Shapes built via `S([...])`.

**Core logic**
- `buildGrid(level, arrows)` — fills `-1` outside shape, `0` empty, `arrowId` on occupied cells.
- `isFree(arrow, grid, level)` — walks from head in `dir`; free if every cell until exit is either outside shape or empty.
- `initLevel(idx, currentLives=5)` — resets arrows, grid, phase, moves, exitingIds, hintArrowId.

**State**
- `levelIndex`, `arrows`, `grid`, `phase: "playing"|"won"`, `lives` (5), `hints` (3), `moves`, `hintArrowId`, `exitingIds: Set<number>`, `bestMoves` (localStorage `arrowsgo-best`, read SSR-safe inside `useEffect`).

**Interaction**
- `handleArrowClick(id)`:
  - If not free → `playSound("fail")`, `lives--`; if 0 → `playSound("die")` (game-over overlay).
  - If free → `playSound("correct")`, increment `moves`, mark arrow `exiting`, start `setInterval(80ms)` snake animation: each tick advances head by `DELTA`, drops tail; when all cells lie outside shape, clear interval, remove arrow, rebuild grid, `playSound("score")`. When `arrows.length===0` → `phase="won"`, `playChord(["success","win"])`, update `bestMoves` in localStorage.
- `useHint()` — finds first free arrow, sets `hintArrowId` for 1500ms, decrements hints, `playSound("click")`.
- Keyboard: `R` → reset current level (preserve lives), `H` → hint.

**Rendering**
- Top bar: 5 hearts (filled by `lives`), level label, `{arrows.length} left`.
- Board: CSS grid `rows × cols`, dynamic `cellPx = min(floor(340/max(rows,cols)), 44)`. For each cell:
  - Outside shape (`!level.shape[r][c]`) → empty spacer div.
  - Inside, no arrow → `bg-card border-border` empty tile.
  - Inside, has arrow → colored tile using `ARROW_COLORS[(arrowId-1)%10]`. Head cell shows `ARROW_SYMBOL[dir]`. Free arrows get `ring-2 ring-white/70 cursor-pointer scale-105 shadow-lg`. Exiting arrows get `opacity-60 scale-95`. Hint arrow gets `ring-4 ring-yellow-300 animate-pulse`.
  - `arrowMeta` precomputed via `useMemo` mapping `"r-c" → {arrowId, isHead, isTail, dir, exiting}`.
- Action row: Hint button (`💡 {hints}`, disabled at 0), Reset button.
- Level selector: 15-button grid; current = primary, cleared (`bestMoves[id]`) = green tint, else card.
- Keyboard hint line (`R` reset, `H` hint).

**Overlays**
- Win (`phase==="won" && lives>0`): 🎉, "Level Cleared!", moves, "🏆 Best!" badge if matched, Next/Replay buttons.
- Game-over (`lives<=0`): 💔, "No Lives Left!", Try Again resets lives to 5.

**SEO / shell**
- `createFileRoute("/tools/arrows-go")` with `head: () => buildToolMeta(toolBySlug("arrows-go", tools))`.
- Wrap in `ToolPageShell` (title "Arrows GO!", description from tools.ts).
- `HowToUse` with the 3 provided steps (tap glowing arrow / slides out snake-style / clear all).
- `RelatedTools currentSlug="arrows-go"`.
- `ToolSeoContent` with title, description, 2 body paragraphs (~150–200 words total) and 4 FAQs: which arrow is free (glowing ring), wrong tap penalty, hint system, `R` to reset.

### Step 3 — `src/routeTree.gen.ts`
Already registered from previous version — no change.

### Notes
- Pure JSX + CSS grid, no canvas, no new deps.
- All colors via tailwind utility classes (arrow palette uses explicit colors as it's gameplay state, not theme chrome — same pattern as Tetris/Sudoku).
- All UI strings English. SSR-safe localStorage. Sounds via `@/lib/sound`.
