# Add Solitaire Mini Game

Mirror the pattern used by Breakout, Bubble Shooter, and Pac-Man.

## Files

**Create `src/routes/tools.solitaire.tsx`**
- `createFileRoute("/tools/solitaire")` with `buildPageMeta` (title, description, canonical, og:url) and JSON-LD Game script per spec.
- `ToolPageShell` — title "Solitaire", subtitle "Move all cards to the foundation piles to win. Classic Klondike Solitaire!", privacy badge "No files are stored on our servers".
- Game implementation (React + CSS, no canvas — DOM works better for drag/drop card games):
  - Standard 52-card deck, 4 suits (♠♥♦♣), shuffle via Fisher-Yates.
  - State: 7 tableau columns (1..7 cards, last face-up), 4 foundations, stock, waste.
  - Draw mode selector: Draw 1 (Easy) / Draw 3 (Hard).
  - Drag-and-drop using HTML5 DnD on desktop + pointer events fallback for touch (mobile drag).
  - Move validation: tableau = descending alternating colors; foundation = ascending same suit from Ace.
  - Multi-card drag from tableau (move stacks).
  - Double-click → auto-move to foundation if legal.
  - Auto-flip top tableau card when exposed.
  - Win detection (all 52 on foundations) → win modal.
  - HUD: Moves, Timer (mm:ss), Best time persisted in `localStorage` (`solitaire-best-time`).
  - Undo button (stack of last 3 states).
  - New Game button (reshuffles, resets timer/moves).
- `<HowToUse>` block (3 steps).
- `<ToolSeoContent>` with SEO title, description, 2–3 paragraph body (~150–200 words on Klondike Solitaire), 4 FAQs.
- `<RelatedTools currentSlug="solitaire" />`.

**Edit `src/lib/tools.ts`**
- Add `Spade` (or reuse existing) to lucide imports — use `Spade` icon.
- Append entry: `{ slug: "solitaire", name: "Solitaire", description: "Classic Klondike Solitaire — move all cards to the foundations to win!", category: "minigames", icon: Spade, path: "/tools/solitaire" }`.

**Edit `src/lib/related-tools.ts`**
- Add `"solitaire": ["memory-match", "minesweeper", "sudoku"]`.

## Auto-propagation
Tools index grid, footer Mini Games column, sitemap.xml, and TanStack route tree all iterate over `tools` → the new entry appears in all three automatically.
