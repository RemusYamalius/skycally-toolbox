## Ball Sort Puzzle — Implementation Plan

Build a premium Ball Sort Puzzle game at `/tools/ball-sort` with 30 solvable levels, polished visuals, Web Audio SFX, and full mobile/desktop support.

### Files to change

1. **`src/lib/tools.ts`** — register entry:
   - `{ slug: "ball-sort", name: "Ball Sort Puzzle", description: "Sort colored balls into matching tubes. 30 free levels, mobile and desktop, no download.", category: "game", icon: CircleDot, path: "/tools/ball-sort" }`
2. **`src/lib/related-tools.ts`** — map `ball-sort` → `["2048", "sudoku", "memory-match", "sliding-puzzle", "minesweeper"]`
3. **`src/routes/tools.ball-sort.tsx`** — new route (single file)
4. `src/routeTree.gen.ts` regenerates automatically.

### Route file structure

```tsx
createFileRoute("/tools/ball-sort")({ head: buildToolMeta(toolBySlug("ball-sort")!), component: BallSortPage })
```

Wrap content in `<ToolPageShell title description>` followed by:
- Game area
- `<HowToUse steps={...} />`
- `<ToolSeoContent ... 8 FAQs />`
- `<RelatedTools currentSlug="ball-sort" />`

### Level generation (static, pre-baked)

- Tier config:
  - L1–5: 5 tubes, 3 colors, 3 balls each (1 + 1 empty buffer = 2 empties)
  - L6–15: 6 tubes, 4 colors, 4 balls each (2 empties)
  - L16–25: 7 tubes, 5 colors, 4 balls each (2 empties)
  - L26–30: 8 tubes, 6 colors, 4 balls each (2 empties)
- **Reverse-solve generator**: start from solved state, perform N random *valid* reverse-moves (N scales with level: 15→80). Guarantees solvability. Seed RNG with level index so all clients see identical layouts. Store `optimalMoves` = floor(N * 0.6) heuristic OR just N for the star threshold baseline; thresholds: 3★ ≤ optimal, 2★ ≤ optimal+5, 1★ ≤ optimal+10.
- Generated **once at module load** into a `const LEVELS: Level[]` array.

### State (useReducer)

```ts
type State = {
  tubes: Color[][];           // current
  selected: number | null;
  moves: number;
  history: Snapshot[];        // for undo
  undosLeft: number;          // 3 per level
  status: "playing" | "won";
  shake: number | null;       // tube id flashing
  hint: { from: number; to: number } | null;
}
type Action =
  | { type: "select"; tube: number }
  | { type: "undo" } | { type: "restart" } | { type: "hint" }
  | { type: "loadLevel"; level: number } | { type: "clearShake" } | { type: "clearHint" };
```

Move validation: source non-empty; dest empty OR (dest not full AND top colors match). Auto-deselect if same tube clicked again.

### Visuals (dark premium)

- Page bg: radial gradient `from-[#0a0a1a] to-[#000008]`
- Tube: `w-16 sm:w-20 h-64` rounded-b-[2rem] glass — `bg-white/5 backdrop-blur-md border border-white/15`
- Selected tube: `shadow-[0_0_30px_rgba(0,212,255,0.6)] border-cyan-400`
- Ball: 56px circle, `radial-gradient(circle at 30% 30%, light, dark)` per color, inner glossy white highlight overlay, drop-shadow
- Layout: flex-wrap grid centered; mobile splits to 4+rest rows naturally via `flex-wrap justify-center gap-3`
- Animations via **framer-motion** (already in project): `layout` for ball reposition, spring drop (`stiffness:400 damping:18`), lifted ball `y:-24`, shake variant `x: [0,-8,8,-8,8,0]`
- Tube-complete: `motion.div` ring pulse + 8 CSS particle dots `animate-ping`
- Level-complete overlay: full-screen `motion.div` with staggered star scale-in + "Next Level" CTA

### Colors

Inline gradient objects: cyan `#00D4FF→#0088AA`, purple `#A855F7→#6B21A8`, orange `#F97316→#C2410C`, green `#22C55E→#15803D`, pink `#EC4899→#9D174D`, yellow `#EAB308→#A16207`. Applied via `style={{ background: \`radial-gradient(...)\` }}`.

### Web Audio SFX

Local `useSound()` helper inside the file (NOT shared `src/lib/sound.ts` — needs custom envelopes). Lazy `AudioContext` on first user gesture. Six functions: `pick`, `place`, `tubeComplete`, `invalid`, `levelComplete` (arpeggio C4-E4-G4-C5), `click`. Reads `localStorage('ballsort.muted')`.

### Controls

- Click/tap tube → select; click another → attempt move. Click selected tube to deselect.
- Keyboard 1–8 → select tube (`window.addEventListener('keydown')`)
- 150ms debounce via `useRef<number>` timestamp guard
- Min tube width 64px (mobile-safe tap target)

### UI Layout inside ToolPageShell

- Top bar inside the game card: `LEVEL X / 30` (glowing cyan), `Moves: N`, 3 stars preview filled by current move count vs thresholds
- Tubes container centered
- Bottom row: Undo (with 3 dots showing remaining), Restart, Hint, Level Select, Mute toggle
- **Level Select**: modal/sheet with 30 bubbles — locked (🔒) past `maxUnlocked`, completed shows star count

### localStorage keys

- `ballsort.progress` → `{ currentLevel: number, maxUnlocked: number, bestMoves: Record<number, number>, stars: Record<number, 0|1|2|3> }`
- `ballsort.muted` → `"0"|"1"`

### SEO content (exact)

`ToolSeoContent`:
- title: "Ball Sort Puzzle — Free Online Color Sorting Game"
- description: "Sort colored balls into tubes in this satisfying puzzle game. 30 levels from easy to expert. Free, no download, works on mobile and desktop."
- body: 4 paragraphs (~150–200 words total) on the game, color-sorting genre appeal, brain training benefit, strategy tips
- 8 FAQs: how to play, level count, win condition, undo limit, mobile support, hint use, tips for hard levels, data privacy

### Dependencies

None new. Uses existing framer-motion, lucide-react, shadcn Button/Dialog, `createFileRoute`, `buildToolMeta`, `toolBySlug`, `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`.

### Verification

After build: open `/tools/ball-sort`, play L1 to win, check star rating + persistence, verify undo stack, keyboard 1–5, mute toggle, level select gating.
