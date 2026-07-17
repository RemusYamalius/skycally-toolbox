
# Word Groups — Connections-style daily word puzzle

New Mini Game at `/tools/word-groups` (slug avoids "connections" trademark issues while still targeting the keyword cluster in metadata). Architecture mirrors `tools.wordle.tsx` exactly: `ToolPageShell` → game UI → `AdZone` → `HowToUse` → `ToolSeoContent` → `RelatedTools`.

## Files

**New**
- `src/lib/word-groups/puzzles.ts` — array of **60 hand-authored, original puzzles**. Each puzzle:
  ```ts
  type Category = { name: string; difficulty: "yellow" | "green" | "blue" | "purple"; words: [string, string, string, string] };
  type Puzzle = { id: number; categories: [Category, Category, Category, Category] };
  ```
  Each puzzle: 4 categories × 4 words = 16 unique uppercase words, with at least one deliberate trap word (a word that plausibly fits >1 category). Themes span: things-that-can-precede/follow-a-word, synonyms, homophones, hidden-word wordplay, pop-culture-safe generics (colors, planets, weather, cooking, etc.). **Explicitly do not reuse NYT Connections groupings** — author fresh material.
- `src/lib/word-groups/storage.ts` — mirrors Wordle's `loadStats`/`saveStats` shape, key `"word-groups-stats"`. Stats: `{ played, wins, currentStreak, bestStreak, lastPlayedDay, lastPlayedResult }`. Also `loadCompletedDays()` / `markDayCompleted(dayIndex, result)` in key `"word-groups-history"` for archive badges and preventing double-count of streaks (only the daily puzzle updates streak; practice/archive don't).
- `src/lib/word-groups/daily.ts` — `dayIndex()` returns `Math.floor(Date.now() / 86400000)` (identical convention to Wordle). `puzzleForDay(day)` returns `PUZZLES[day % PUZZLES.length]`. `todaysPuzzle()` helper.
- `src/lib/word-groups/share.ts` — builds emoji share string from the guess history (`🟨🟩🟦🟪⬛` per row × 4), matches Wordle's copy-to-clipboard + toast pattern.
- `src/routes/tools.word-groups.tsx` — main route. Three modes via local state `mode: "daily" | "practice" | "archive"`:
  - **Daily** (default): today's puzzle, streak updates, share button on completion.
  - **Practice**: pulls a random puzzle from the bank excluding today's and last 5 played (tracked in localStorage `word-groups-recent`). "New puzzle" button. Does NOT touch streak stats.
  - **Archive**: simple month-grid calendar (current + previous months back to launch day of the puzzle bank). Each date cell is a button showing win/loss/unplayed state; clicking loads that day's puzzle in a replay view (no streak impact). Free, no gate.

**Edited**
- `src/lib/tools.ts` — register `word-groups` in Mini Games category with a `Grid3x3` (lucide) icon. Name "Word Groups", tagline "Sort 16 words into 4 hidden groups. Daily puzzle + free archive."
- `src/lib/related-tools.ts` — add `"word-groups": ["wordle", "word-search", "hangman", "sliding-puzzle", "memory-match"]`; add `word-groups` to reverse lists for `wordle`, `word-search`, `hangman`.
- `public/sitemap.xml`, `public/llms.txt` — add the new URL under Mini Games.

## Game logic

- **Selection state**: `selected: Set<string>` capped at 4. Tapping a selected tile deselects it. `Submit` disabled unless `selected.size === 4`.
- **Submit**: sort selected as canonical key `"A|B|C|D"`. If already in `pastWrongGuesses`, show inline "Already guessed" banner, no mistake consumed.
- **Correct guess**: find category whose words match exactly → push to `solved: Category[]`, remove those 4 from remaining tile order, animate slide-to-top with the category's difficulty color and name shown above the remaining grid. Play `success` chord.
- **Wrong guess**: push key into `pastWrongGuesses`, record `guessHistory` row (array of the 4 words' colors for share emoji), decrement `mistakesLeft`. Detect "One away": iterate categories not yet solved, if `|guessedWords ∩ categoryWords| === 3` → show "One away!" inline toast (sonner) for 2s. Play `fail`.
- **Loss** (`mistakesLeft === 0`): reveal all remaining categories in order (yellow→green→blue→purple), show all category names/colors. Streak resets if daily.
- **Win**: all 4 solved. Streak increments if daily. Show share button.
- **Shuffle**: Fisher-Yates on the visible `tileOrder` array (only unsolved words). Pure visual — doesn't reset selection or state.

## UI

- Header row: mode tabs (Daily / Practice / Archive), and on daily mode a small "Puzzle #{dayIndex}" label so archive dates align.
- Solved categories stack: each is a full-width band in its difficulty color with the category name centered and the 4 words shown as a comma-separated caption. Colors use semantic tokens plus explicit palette in the same file (yellow `#f5c518`, green `#22c55e`, blue `#3b82f6`, purple `#a855f7`) so they read correctly in dark mode — matching Wordle's inline color approach.
- Remaining grid: 4×4 (or fewer rows as categories solve) of buttons. Tile: rounded, min-height 64px mobile / 76px desktop, uppercase word, `aria-pressed` when selected, selected state = filled dark background with high contrast text and subtle scale. Comfortable tap targets on mobile (min 44px hit area).
- Mistakes indicator: 4 dots, filled/empty, aria-live polite.
- Controls row: `Shuffle`, `Deselect all`, `Submit` (primary).
- Inline banner area above grid (aria-live polite) for "One away!" / "Already guessed" / "Correct!".
- End-of-game panel: win/lose message, share button (copies emoji grid + `Word Groups #{day} — 3/4 correct — skycally.com/tools/word-groups`), "Next puzzle" button (only in practice/archive), and stats row (Played / Win% / Streak / Best), matching Wordle's `StatBox`.

## Archive UI (concise)

- Month header with prev/next chevrons; grid of dates from the puzzle bank's day-zero (`Math.floor(Date.now()/86400000)` at first launch — hardcode a constant `LAUNCH_DAY_INDEX` in `daily.ts` set to today's index at build time) up to today. Future dates and pre-launch dates are disabled. Each cell shows the date number and a small colored dot (green=won, red=lost, gray=unplayed). Clicking loads that puzzle read-only-of-streak.

## SEO

- `head()` — title "Word Groups — Free Daily Puzzle & Unlimited Archive | Skycally"; description mentions "connections-style word grouping game, free daily puzzle, play every past puzzle free, unlimited practice mode, no signup". Uses `buildPageMeta` + inline JSON-LD `VideoGame` matching Shooting Ball's shape:
  ```json
  { "@type": "VideoGame", "applicationCategory": "Game", "genre": ["Puzzle","Word"], "playMode": "SinglePlayer", "offers": {"price":"0"},
    "featureList": "Daily word grouping puzzle; 4 difficulty tiers (yellow/green/blue/purple); free unlimited archive of every past puzzle; unlimited practice mode; one-away hint; shareable emoji result; streak tracking; runs fully in browser" }
  ```
- `ToolSeoContent` body — 4 paragraphs: (1) what the game is + how it plays; (2) how the 4 color tiers work and why some words look like they fit multiple groups (overlap traps); (3) strategy tips (start with confident group, watch the "too easy" color, expect one trap, use shuffle to see new adjacencies, save the hardest category for last since it may be revealed by elimination); (4) how this differs from the original — free unlimited archive, unlimited practice, no subscription, original hand-authored puzzles.
- 8 FAQs as spec'd (What is Word Groups / mistakes allowed / what colors mean / what "One away" means / new puzzle daily / can I play past puzzles / can I play more than once a day / is it free).
- Contextual internal links block above `RelatedTools`: full-sentence intros pointing to `/tools/wordle` ("if you enjoy daily word puzzles, try today's Wordle"), `/tools/word-search` ("for a more relaxed, no-pressure word game"), `/tools/hangman` ("another quick word-guessing game").

## HowToUse (3 steps)

1. Tap four words that you think share a hidden category, then press Submit.
2. Guess correctly and the group is revealed with its color; guess wrong and you lose one of four mistakes — "One away!" means three of your four were right.
3. Solve all four groups before you run out of mistakes. Come back for a new puzzle daily, or open the archive to play any past puzzle free.

## Non-negotiables checklist

- 60 original puzzles (no NYT Connections reuse) — every category name and word grouping authored fresh for this site.
- Daily rotation identical convention to Wordle (`Math.floor(Date.now()/86400000)`), same UTC-day rollover.
- Streak storage mirrors Wordle's shape but under a distinct key (`word-groups-stats`), so no collision.
- Archive and Practice are fully free, no gate, no signup, no server calls — everything in localStorage + module data.
- Reuses `ToolPageShell`, `HowToUse`, `AdZone`, `ToolSeoContent`, `RelatedTools` — no custom equivalents.

## Out of scope

- Server-persisted per-account stats or cross-device sync.
- Daily notification/reminder.
- Multiplayer or leaderboard.
- Themed / seasonal puzzle packs (single unified bank for now).

## Note on tax/legal-style disclaimers

Not applicable to this game — no financial or medical content. Copyright note kept in code comments only, not user-facing.
