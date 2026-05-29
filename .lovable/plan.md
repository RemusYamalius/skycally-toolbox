# Add Games & Fun category + Random Team Maker

## 1. `src/lib/tools.ts`
- Add `Gamepad2` to lucide-react import (`Users` already imported).
- Extend `ToolCategory` union with `"games"`.
- Add `games: { label: "Games & Fun", color: "var(--violet-brand)", icon: "🎮" }` to `categoryMeta`.
- Change `category` from `"utility"` to `"games"` for `spinning-wheel` and `role-spinner` entries.
- Append new tool entry after `role-spinner`:
  ```ts
  { slug: "random-team-maker", name: "Random Team Maker", description: "Split any group of players into balanced random teams instantly.", category: "games", icon: Users, path: "/tools/random-team-maker" }
  ```

## 2. `src/components/site-footer.tsx`
- Append `"games"` to `categoryOrder`.

## 3. `src/routes/index.tsx`
- Add `Gamepad2` to lucide imports.
- Add `{ icon: Gamepad2, label: "Games & Fun", cat: "games", color: categoryMeta.games.color }` to `quickAccess`.
- Add `games: "Spinning wheels, role assignments, team makers and more party games."` to `categoryTaglines`.
- Update `ALL_CATS` constant to include `"games"` (file uses `ALL_CATS`, not `allCats` — adapt the user's instruction accordingly).

## 4. `src/routes/tools.random-team-maker.tsx` (new)
Mirror structure of `tools.role-spinner.tsx`: same `Route` declaration, `Wheel` canvas component reused verbatim, `PALETTE`, `ToolPageShell` + `HowToUse` + `ToolSeoContent` + `RelatedTools`.

State:
- `phase: "setup" | "spin" | "done"`
- `players: string[]` (defaults: Alice…Hannah, 8 names)
- `playerInput: string`
- `teamCount: 2|3|4|5` (default 2)
- `balanced: boolean` (default true)
- `teamNames: string[]` (auto "Team 1"…"Team N", inline editable; resync when count changes)
- `editingTeamIdx: number | null`
- `assignments: string[][]` (one array per team)
- `queue: string[]` (shuffled players remaining to assign)
- `nextTeamIdx: number` (rotation pointer; with `balanced` true → rotate 0,1,2…; with `balanced` false → pick random team each spin)
- `rotation`, `spinning` (for wheel)

Phase 1 — Setup (two-panel grid like role-spinner):
- Left: Players panel with Input+Add, list with delete buttons (min 2 enforced), header "Players (N)".
- Right: Teams panel — row of `2 3 4 5` buttons (active styled), preview text `~{Math.floor(players.length / teamCount)} players per team`, "Balanced teams" toggle (Switch), editable team name list (click name → input; blur/Enter commits).
- "Make Teams!" button disabled when `players.length < 2` or `teamCount > players.length`.

Phase 2 — Spin:
- Single `Wheel` with `nameSegments` from `queue`.
- Status line: `Assigning to: {teamNames[nextTeamIdx]} ({assignments[nextTeamIdx].length}/{targetCount} players)`.
- "Spin" button → reuses `spin()` from role-spinner; on land: push picked player into `assignments[nextTeamIdx]`, drop from `queue`, advance `nextTeamIdx` (round-robin when balanced; random otherwise).
- "Skip animation — assign all randomly" button → loops through remaining queue applying same assignment logic, then sets `phase="done"`.
- When `queue.length === 0` after a spin → `phase="done"`.

Phase 3 — Results:
- Responsive grid (`sm:grid-cols-2 lg:grid-cols-3`) of team cards. Each card: colored header (color from PALETTE[i]), team name, divider, player list.
- Buttons: "Shuffle Again" (re-shuffle players into new `assignments` keeping names/teamCount, jumps back to phase "done" with new result, no spin), "Start Over" (reset to "setup"), "Copy Results" (plaintext: `Team 1:\n  Alice\n  Bob\n\nTeam 2:\n…`).

Helpers:
- `shuffle<T>(arr)`: Fisher–Yates.
- `distribute(players, k, balanced)`: returns `string[][]`. Balanced → shuffled, then round-robin assign by `i % k`. Unbalanced → shuffled, each player to random bucket.

SEO content:
- `HowToUse` steps: `["Enter all player names and choose how many teams you need.", "Hit Make Teams and watch the wheel assign each player randomly.", "Share the results or shuffle again for a different split."]`
- `ToolSeoContent` with title/description/2 paragraphs/4 FAQs as specified.

## Out of scope
- No edits to `routeTree.gen.ts` beyond auto-regeneration.
- No changes to other tool routes, hero, dark mode, or category colors.
- No new dependencies.
