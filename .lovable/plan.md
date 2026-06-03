# Add Mahjong Solitaire Mini Game

Mirror the pattern used by Solitaire, Pac-Man, and Breakout.

## Files

**Create `src/routes/tools.mahjong.tsx`**
- `createFileRoute("/tools/mahjong")` with `buildPageMeta` (title, description, canonical, og:url) and JSON-LD Game script per spec.
- `ToolPageShell` — title "Mahjong Solitaire", subtitle "Match identical free tiles to clear the board. Classic Mahjong Solitaire!".
- Game implementation (React + CSS, DOM-based — better than canvas for click/tap tile matching):
  - 144-tile set: 4 copies of 34 standard tile faces (Dots 1–9, Bamboo 1–9, Characters 1–9 — 4 each), plus Winds (E/S/W/N — 4 each), Dragons (Red/Green/White — 4 each), Flowers (4 unique, match any flower) and Seasons (4 unique, match any season).
  - Classic Turtle layout (5 layers): hardcoded list of `{x, y, z}` tile slots producing the canonical turtle shape (144 slots).
  - Tile freedom test: no tile occupying any of the 4 overlapping slots on layer `z+1`; AND no tile on the immediate left OR no tile on the immediate right at the same `z`.
  - Click first free tile → highlight. Click second free matching tile → remove both. Clicking same tile again deselects. Invalid second click swaps selection.
  - **Hint** button — scan free tiles for a matching pair, pulse-highlight both for ~1.5s. Optional small move penalty (no, just info).
  - **Shuffle** button — reshuffle face IDs across remaining tile positions while keeping layout. Useful when no moves left.
  - **New Game** — regenerates a solvable deal: shuffle deck, then build the layout by repeatedly placing pairs only on currently-free slots (guarantees solvability).
  - **Auto-detect deadlock** → modal "No moves left — Shuffle or New Game".
  - **Win detection** (0 tiles remaining) → win modal with time + moves.
  - HUD: Moves, Timer (mm:ss), Pairs remaining, Best time persisted in `localStorage` (`mahjong-best-time`).
  - Responsive: scale tile size based on container width; horizontal scroll on very small screens.
  - Tile rendering: CSS-styled tiles with Unicode Mahjong glyphs (🀀–🀫) and subtle 3D bevel via box-shadow stacking for layer depth.
- `<HowToUse>` block (3 steps: select a free tile, click its identical match, clear the board).
- `<ToolSeoContent>` with SEO title, description, 2–3 paragraph body (~150–200 words on Mahjong Solitaire), 4 FAQs.
- `<RelatedTools currentSlug="mahjong" />`.

**Edit `src/lib/tools.ts`**
- Add `Puzzle` (or reuse `Grid2x2`) to lucide imports — use `Puzzle` icon for Mahjong.
- Append entry: `{ slug: "mahjong", name: "Mahjong Solitaire", description: "Classic Mahjong Solitaire — match identical free tiles to clear the board!", category: "minigames", icon: Puzzle, path: "/tools/mahjong" }`.

**Edit `src/lib/related-tools.ts`**
- Add `"mahjong": ["sudoku", "memory-match", "sliding-puzzle"]`.

## Auto-propagation
Tools index grid, footer Mini Games column, sitemap.xml, and TanStack route tree all iterate over `tools` → new entry appears in all three automatically.
