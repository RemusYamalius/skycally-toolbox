## Goal

A `/tools/crossword` Daily Crossword built on the exact Word Groups architecture: Daily / Practice / Archive tabs, deterministic day-index puzzle rotation, free everything, plus a printable PDF worksheet + answer key.

## Confirmed: LAUNCH_DAY_INDEX is a static literal = 20662

`src/lib/crossword/daily.ts` will contain a **hardcoded numeric literal**, matching `word-groups/daily.ts`'s `export const LAUNCH_DAY_INDEX = 20651;`:

```ts
// Launch day — computed once at build time (2026-07-28) and frozen.
// NEVER replace with a dayIndex() call: that would re-anchor the rotation
// on every deploy and break the archive.
export const LAUNCH_DAY_INDEX = 20662;
```

20662 = `floor(Date.parse("2026-07-28")/86400000)` (20454 days to 2026-01-01, +181 to Jul 1, +27). No dynamic call at the definition site, ever.

## Verified before planning

- `tools.word-groups.tsx` (732 lines) uses `buildPageMeta_with_schema` with a `VideoGame` JSON-LD schema, `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`, `AdZone`, plus `playSound`/`playChord` from `@/lib/sound`.
- `word-groups/daily.ts` pattern: `dayIndex()` = `floor(now/86400000)`, frozen `LAUNCH_DAY_INDEX`, `puzzleForDay` via positive modulo over bank length, `pickPracticePuzzle(recent, today)`, `dateFromDayIndex`/`formatDateISO`.
- `word-groups/storage.ts` pattern: `Stats`, `HistoryMap` (`day -> "win"|"loss"`), `loadRecent`/`pushRecent` — all SSR-guarded with `typeof window === "undefined"`.
- PDF: the site already generates vector PDFs by CDN-loading jsPDF via `loadScript` (`src/routes/tools.timetable-generator.tsx`, jspdf 2.5.1 UMD) and drawing with `doc.rect`/`doc.text`. Reuse that approach — no new dependency, no screenshot export.
- `related-tools.ts` has a `word-groups` key (line 105) but **no** `wordle` or `hangman` keys — those will be added, not just edited.
- `wordle`, `hangman`, `word-search` all exist as real tools.

## Files to create

**`src/lib/crossword/puzzles.ts`**
- Types `CrosswordWord` / `CrosswordPuzzle` exactly as specified.
- **40+ original puzzles**, each 10–16 words on simple rectangular grids (mostly 11×11 / 13×13), general-knowledge clues across geography, science, pop culture, history and everyday vocabulary. All clue wording written from scratch — no NYT/USA Today wording or grids.
- Puzzles are produced offline during development with a constructor script run in the sandbox, then emitted as a static data file. **Nothing generative ships to the browser.**
- Build-time sanity check (dev-only `console.warn`, mirroring `big-five/items.ts`) validating per puzzle: answers are `A–Z` only and fit within grid bounds; every across/down crossing cell has identical letters; clue numbers unique and following standard sequential numbering; no duplicate start+direction. Warnings name the puzzle id and the exact problem.
- Exports `CROSSWORD_PUZZLES` and `CROSSWORD_TOTAL`.

**`src/lib/crossword/daily.ts`** — `dayIndex`, the frozen `LAUNCH_DAY_INDEX = 20662`, `puzzleForDay`, `todaysPuzzle`, `pickPracticePuzzle(recent, today)`, `dateFromDayIndex`, `formatDateISO`.

**`src/lib/crossword/storage.ts`** — keys `crossword-stats`, `crossword-history`, `crossword-recent`: played/solved/current+best streak, per-day completion for archive badges, recent practice ids. Same SSR guards.

**`src/lib/crossword/pdf.ts`** — CDN-loads jsPDF via the existing `loadScript` helper and draws two A4 pages from the real puzzle data: page 1 = blank numbered grid + Across/Down clue lists, page 2 = the same grid fully filled from the answer data. Plain black-on-white vector drawing.

**`src/routes/tools.crossword.tsx`** — the route.

## Grid interaction (primary UX)

A single selection state `{ row, col, direction }` drives grid + clue list together.

- **Tap a cell** → select it, highlight its whole word (Across preferred when the cell belongs to both), scroll the matching clue into view.
- **Tap the already-selected cell** → toggle Across ↔ Down when both exist.
- **Swipe/drag across a straight run of cells** → selects that whole word and focuses its first empty cell. Implemented with pointer events (`pointerdown`/`pointermove`/`pointerup`, `touch-action: none` on the grid) so it works with real touch.
- **Typing** (hidden native input keeps the mobile keyboard up) fills the focused cell and advances to the next empty cell in the current direction; reaching the word end keeps the selection. Backspace clears and steps back.
- **Tapping a clue** = tapping that word's start cell — same state, not a parallel mechanism.
- **Arrow keys / Tab** are a desktop convenience layer on top.
- **Check** flags incorrect filled cells without revealing; **Reveal** works per-word or whole-puzzle and sets a flag used in the share summary.

## Tabs

- **Daily** — deterministic puzzle for today, elapsed timer, completion detection, streak display.
- **Practice** — random puzzle excluding today's, "Next Puzzle" with no-repeat-until-bank-exhausted via `recent`.
- **Archive** — month grid navigation identical to Word Groups', completion badges from history, every past day free.

Shareable completion summary (clipboard + `sonner` toast): puzzle date/number, time taken, whether anything was revealed — no answers. "Print / Download PDF" available in all three tabs.

## Section order (checklist item 3)

Puzzle interface → contextual `<Link>`s to Word Groups / Wordle / Hangman → `AdZone` → `HowToUse` → `ToolSeoContent` (4+ plain-prose paragraphs including the printable-worksheet use case for teachers/tutors/homeschoolers, plus 9 FAQs) → `RelatedTools` last. FAQPage schema comes only from `ToolSeoContent`.

## Registration

- `src/lib/tools.ts` — `crossword` entry, `category: "minigames"`, `dateAdded: "2026-07-28"`, featureList of shipped features only.
- `src/lib/related-tools.ts` — new `crossword` key; add `crossword` into `word-groups`'s list and create new `wordle` and `hangman` keys that include it.
- `public/sitemap.xml` + `public/llms.txt` — new entry.

## SEO

Title leads with the functional long-tail phrase, e.g. `Daily Crossword Puzzle — Free Online with Full Archive | Skycally`; description foregrounds the free daily puzzle, free archive of every past puzzle, practice mode, printable PDF, no signup. `buildPageMeta_with_schema` with a `VideoGame` JSON-LD block matching Word Groups' shape. No difficulty labels anywhere (out of scope).

## Verification before finishing

- Programmatic count of the puzzle bank; that number is the only one written into title/description/JSON-LD/copy/FAQs.
- Sanity check run in Node over the bank — must emit zero warnings.
- Assert `LAUNCH_DAY_INDEX` is the literal 20662 (grep the file) and that `puzzleForDay` is stable across two separate process runs.
- `rg '<a href'` on the new route → empty.
- Typecheck, then headless Chromium: desktop pass (tap, direction toggle, typing auto-advance, check, reveal, share) and a mobile 390×844 touch pass (real swipe-to-select), plus a PDF generation run inspected page-by-page as images.
- No new npm packages.
