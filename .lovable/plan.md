# Add Sound Effects to All Mini Games

Shared Web Audio utility + targeted `playSound` calls in each mini-game route. No new dependencies, no UI changes.

## Step 1 — Create `src/lib/sound.ts`
New file with:
- `SoundType` union covering all events listed in the spec.
- Lazy `AudioContext` getter (created on first call, resumed if suspended).
- `SOUNDS` config map (freq / type / duration / gain / optional freqEnd) exactly as specified.
- `playSound(type)` — creates oscillator + gain, schedules frequency ramp and exponential gain decay, wrapped in `try/catch` so SSR / blocked-autoplay environments fail silently.
- `playChord(types)` — sequences `playSound` calls 80 ms apart via `setTimeout`.

## Step 2 — `src/routes/tools.flappy-bird.tsx`
- Import `playSound`.
- `flap()` → `playSound("flap")` (only when phase is `playing`; the start-game branch stays silent or also flaps — match spec: on flap).
- Inside the score increment block (`p.passed = true`) → `playSound("score")`.
- On collision (`hit` true) → `playSound("hit")` and `setTimeout(() => playSound("die"), 200)` before the early return.

## Step 3 — `src/routes/tools.chess.tsx`
- Import `playSound`, `playChord`.
- After human move applied: detect capture (target square non-empty pre-move) and castling (king moves 2 files) → play `capture` / `castle` / `move` accordingly. Then if `isInCheck(newState, "black")` → `playSound("check")`.
- After AI move applied: same classification for AI; check on white.
- In `checkGameOver`: checkmate with winner=white → `playChord(["win","success"])`; winner=black → `playSound("lose")`; stalemate / 50-move draw → `playSound("fail")`.

## Step 4 — `src/routes/tools.typing-speed.tsx`
- Import `playSound`, `playChord`.
- In the input change handler: compare new char vs target char. Correct char → `playSound("correct")` throttled via a `useRef<number>` timestamp (≥80 ms gap). Wrong char → `playSound("wrong")` (also throttled lightly to avoid spam on backspace loops).
- In `finishGame` → `playChord(["finish","success"])`.
- In the countdown effect, when `timeLeft <= 5 && timeLeft > 0` → `playSound("tick")` once per tick.

## Step 5 — `src/routes/tools.word-search.tsx`
- Import `playSound`, `playChord`.
- On word-found branch → `playSound("found")`.
- When `foundWords.length === words.length` after that update → `playChord(["allFound","success"])`.

## Step 6 — `src/routes/tools.tetris.tsx`
- Import `playSound`, `playChord`.
- On piece lock (merging into board) → `playSound("place")`.
- On hard drop key handler → `playSound("tetrisDrop")` (before lock sound is fine; both can fire).
- When cleared-lines count > 0 → `playSound("clear")`.
- On game-over transition → `playSound("lose")`.

## Step 7 — `src/routes/tools.memory-match.tsx`
- Import `playSound`, `playChord`.
- Card click that reveals → `playSound("flip")`.
- On match resolution → `playSound("match")`; on mismatch → `playSound("noMatch")`.
- When all pairs solved → `playChord(["match","success"])`.

## Step 8 — Remaining games
For each of `tools.2048.tsx`, `tools.sudoku.tsx`, `tools.hangman.tsx`, `tools.wordle.tsx`, `tools.snake.tsx`, `tools.minesweeper.tsx`, `tools.tic-tac-toe.tsx`:
- Import `playSound`, `playChord`.
- Wire per the mapping table in the spec:
  - 2048: move/merge → `click`; win (2048 tile) → `playChord(["success","win"])`; game-over → `fail`.
  - Sudoku: cell input → `click`; complete/correct solve → `playChord(["success","win"])`; invalid → `wrong`.
  - Hangman: correct letter → `click`; wrong letter → `wrong`; win → `success`; loss → `fail`.
  - Wordle: key press → `click`; letter in correct position on submit → `correct` (once per row reveal); win → `playChord(["success","win"])`; loss → `fail`.
  - Snake: direction key → `click`; food eaten → `score`; death → `fail`.
  - Minesweeper: reveal → `click`; mine → `die`; win → `playChord(["success","win"])`.
  - Tic-tac-toe: move → `click`; win → `playChord(["success","win"])`; draw → `fail`.

## Constraints
- All `playSound` calls live inside user interaction handlers or game-loop callbacks — never at mount.
- No mute UI, no settings, no extra deps.
- No changes to `tools.ts`, route tree, SEO blocks, or component shells.

## Files
- create: `src/lib/sound.ts`
- edit: all 12 mini-game route files listed above.
