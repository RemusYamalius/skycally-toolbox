# Add Chess to Mini Games

## Step 1 — Update `src/lib/tools.ts`
- Add `Crown` to the `lucide-react` import line.
- Append after the `flappy-bird` entry:
  ```ts
  { slug: "chess", name: "Chess", description: "Play chess against a smart AI opponent. Classic strategy game with full rules support!", category: "minigames", icon: Crown, path: "/tools/chess" },
  ```

## Step 2 — Create `src/routes/tools.chess.tsx`
Mirror the structure of `src/routes/tools.flappy-bird.tsx` (route export, `buildToolMeta` head, `ToolPageShell` + `HowToUse` + `RelatedTools` + `ToolSeoContent`).

### Engine (pure TS, no libs)
- **Types**: `Color`, `PieceType`, `Piece`, `Board`, `Move`, `GameState` as specified (includes castling rights, en passant target, half/full move counters).
- **Constants**: `SYMBOLS` (unicode), `INIT_BOARD`, `INIT_STATE`, `PIECE_VALUE`, `PST` (8×8 piece-square tables).
- **Move generation**:
  - `getPieceMoves(state, r, c)` — per-piece pseudo-legal moves. Sliding pieces (R/B/Q) via ray casting. Pawns: 1-step, 2-step from start row, diagonal captures, en passant. King: 1-step + castling (kingside/queenside) when rights intact, path clear, and king not in/through/into check. Knight: 8 jumps.
  - `getLegalMoves(state)` — filters out moves that leave own king in check.
  - `isInCheck(state, color)` — scans opponent attacks against own king's square.
  - `applyMove(state, move)` — immutable: returns new state with board updated; handles captures, castling rook move, en passant capture removal, promotion (defaults to Q if `promotion` unset), updates castling rights when K/R move or rook captured, sets `enPassant` only on pawn 2-step, updates `halfMove` (reset on pawn move/capture) and `fullMove`, toggles `turn`.

### AI
- `evaluate(state)` — material + PST (flip row for black) from white's perspective.
- `minimax(state, depth, alpha, beta, maximizing)` — alpha-beta as spec'd.
- `getBestMove(state)` — depth 3, minimizes (AI is black).
- Trigger via `useEffect` watching `gameState`/`phase`; guard with `aiThinking` ref; run inside `setTimeout(..., 50)` to yield to UI. After AI move call `checkGameOver`.

### Component state
`gameState`, `selected`, `legalMoves`, `phase` (`idle`|`playing`|`ended`), `result`, `aiThinkingState`, `promotionPending`, `capturedW`, `capturedB`. Update captured arrays inside the click/AI handlers by diffing before/after boards (or by inspecting the destination square in `applyMove`'s caller).

### UI
- **Status bar** above board: captured pieces left/right, center pill shows "Your turn" / "AI thinking..." / "AI's turn" / end result.
- **Board**: 8×8 grid, `#F0D9B5`/`#B58863` squares, selected = yellow ring, legal empty = center dot, legal capture = inset ring, rank labels on col 0, file labels on row 7. Unicode pieces with text-shadow for contrast.
- **Promotion modal**: shown when human pawn reaches row 0; 4 buttons (Q/R/B/N) apply the move with `promotion` field.
- **Game-over overlay**: emoji + result + Play Again button. Detection covers checkmate, stalemate, and 50-move rule.
- **Idle state**: a Start button sets `phase` to `playing` (same New Game reset path).
- **New Game button** below board resets full state.
- Click handler ignores input unless `phase === "playing"`, white's turn, and AI not thinking.

### Shell
- `HowToUse` steps (3) as specified.
- `RelatedTools currentSlug="chess"`.
- `ToolSeoContent` with title, description, 2-paragraph body, 4 FAQs (AI difficulty/depth-3, how to castle, pawn promotion modal, how to start a new game).
- English only, semantic tokens for chrome (board colors are intentional raw hex).

## Files
- edit: `src/lib/tools.ts`
- create: `src/routes/tools.chess.tsx`

Route file is auto-registered — do not edit `routeTree.gen.ts`.
