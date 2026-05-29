# Add "Mini Games" Category with Wordle and 2048

Add a new `minigames` category to Skycally and ship two fully playable browser games: **Wordle** (daily 5-letter word puzzle) and **2048** (slide-and-merge tile puzzle). All UI in English, following existing tool route conventions (ToolPageShell + HowToUse + ToolSeoContent + RelatedTools).

## Scope

### 1. Registry (`src/lib/tools.ts`)
- Add `Joystick`, `Grid2x2` to the `lucide-react` import line.
- Extend `ToolCategory` union with `"minigames"`.
- Add `categoryMeta.minigames`: label `"Mini Games"`, color `var(--cyan-brand)`, icon `🕹️`.
- Append two tool entries after the existing `games` block:
  - `wordle` → icon `Grid2x2`, path `/tools/wordle`
  - `2048` → icon `Joystick`, path `/tools/2048`

### 2. Footer (`src/components/site-footer.tsx`)
- Append `"minigames"` to `categoryOrder`.

### 3. Home page (`src/routes/index.tsx`)
- Add `Joystick` to lucide imports.
- Push `{ icon: Joystick, label: "Mini Games", cat: "minigames", color: categoryMeta.minigames.color }` into `quickAccess`.
- Add `minigames` entry to `categoryTaglines` ("Play Wordle, 2048 and more — directly in your browser, no download needed.").
- Add `"minigames"` to the `ALL_CATS` array so the homepage renders the new category section.

### 4. Wordle (`src/routes/tools.wordle.tsx`)
Standard route shell (`createFileRoute` + SEO `head()` + `ToolPageShell` + `HowToUse` + `ToolSeoContent` + `RelatedTools`).

- **Word list:** ~100 common 5-letter words as a `const WORDS` array (from prompt).
- **Daily word:** `WORDS[Math.floor(Date.now() / 86400000) % WORDS.length]`.
- **State:** `target`, `guesses[]`, `current`, `gameOver`, `won`, `letterStates` (Record of `correct | present | absent | unused`).
- **Evaluation:** two-pass algorithm (correct first, then present) so duplicate letters score correctly.
- **Board:** 6×5 grid, semantic tokens for empty/filled, raw Tailwind colors for correct/present/absent (green-500, yellow-500, muted).
- **Keyboard:** on-screen 3-row QWERTY + Enter/Backspace, each key tinted by best known state. Physical `keydown` listener mirrors input.
- **Win/Lose:** sonner `toast.success` / `toast.error`; CSS-keyframes confetti on win; `Play Again` button reseeds a random word (not just daily).
- **Stats panel:** Games played, Win %, Current streak, Best streak — persisted under `localStorage["wordle-stats"]` (guarded by `typeof window !== "undefined"` to keep SSR safe).
- HowToUse + ToolSeoContent copy per the prompt.

### 5. 2048 (`src/routes/tools.2048.tsx`)
Same shell. **Route string:** `createFileRoute("/tools/2048")` — the filename `tools.2048.tsx` is valid (numeric segment) and the path string must match exactly.

- **Types:** `Board = (number | null)[][]`, 4×4.
- **Helpers:** `addTile` (90% 2 / 10% 4), `slideRow` (filter → merge adjacent equals → pad), `transpose`, `move(dir)` (rotate-to-left → slide → rotate-back), `canMove` (any empty cell OR any adjacent equal pair), `boardsEqual` (to skip illegal moves so no tile spawns when nothing moved).
- **State:** `board`, `score`, `best` (lazy-init from `localStorage["2048-best"]`, SSR-guarded), `gameOver`, `won`.
- **Controls:** `keydown` listener for arrow keys; `onTouchStart` / `onTouchEnd` on board for swipe (threshold ~20px, pick axis by larger |Δ|). Effect cleanup on unmount; deps include `board`/`score` so the latest closure is used.
- **Rendering:** `grid grid-cols-4 gap-2` board with `aspect-square`, `max-w-sm`. Tiles use inline `TILE_COLORS` map (classic palette) with a fallback for values >2048. Header shows title + Score + Best chips.
- **Game flow:** On every move, update score, persist new best, spawn new tile, set `won` once a 2048 appears (game keeps going), set `gameOver` when no moves remain. `New Game` button resets board and score, keeps best.
- HowToUse + ToolSeoContent copy per the prompt.

## Technical Details

- **Route IDs:** filenames `tools.wordle.tsx` and `tools.2048.tsx` map to `createFileRoute("/tools/wordle")` and `createFileRoute("/tools/2048")`. `routeTree.gen.ts` is auto-regenerated — not edited by hand.
- **SSR safety:** all `localStorage` reads wrapped in `typeof window !== "undefined"` checks (lazy-init form in `useState`).
- **Design tokens:** chrome/text uses semantic tokens; game-specific colors (Wordle green/yellow, 2048 tile palette) are intentional brand-of-game colors and kept inline — these are the documented exception for "intentionally inverted UI elements".
- **English-only:** every label, toast, FAQ, body paragraph in English.
- **No new dependencies.**

## Out of Scope

- No edits to `src/routeTree.gen.ts` (auto-generated).
- No changes to `tools.index.tsx` filter chip list (it currently shows `ai/video/image/audio/pdf/text` only — leaving as-is to match how `games` is already handled).
- No new shared components, no backend, no analytics.
