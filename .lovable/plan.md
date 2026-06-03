# Fix Solitaire game

All changes are confined to `src/routes/tools.solitaire.tsx`.

## 1. Card overflow in tableau columns

Today each tableau card is offset by a fixed `18px` and the column's `minHeight` grows linearly with the stack. With 13+ cards the column can exceed the viewport. Fix by measuring the available height per column and computing a dynamic offset.

- Track the rendered column height with a `ResizeObserver` on the tableau wrapper.
- For each column, compute `offset = clamp(6, 28, (availableH - CARD_H) / max(1, col.length - 1))`. Face-down cards get a tighter sub-offset (e.g. 0.45×) so flipped cards stay readable but hidden ones compress.
- Use the computed offset both for positioning (`top: cumulativeOffset`) and for the column's `minHeight`, so the column never overflows the board.
- Drag preview uses the same dynamic offset for visual consistency.

## 2. Card back pattern

Replace the flat cyan gradient `CardBack` with a themed diamond/crosshatch pattern.

- Dark teal base (`bg-slate-900` + subtle teal tint) with a repeating diagonal crosshatch built from two layered `repeating-linear-gradient`s in CSS (no image asset).
- Inner rounded border in cyan/teal at low opacity to frame the pattern, matching the site's cyan accent.

## 3. Gameplay correctness

- **Drag and drop smoothness:** capture pointer on the inner card element (not the wrapper) and use `setPointerCapture` on the same element that receives subsequent `pointermove`/`pointerup` so drags don't drop when the cursor leaves the card. Currently capture is set on `e.target` which can be a child span.
- **Stacking rules:** `canPlaceOnTableau` already enforces alternating colors + descending rank — verified correct. Add a guard so dragging a multi-card stack from the waste/foundation is blocked (already true), and ensure only contiguous valid sub-stacks can be picked up from tableau (validate alternating-color descending within the dragged slice; otherwise pick from the deepest valid card down).
- **Ace → foundation logic:** `canPlaceOnFoundation` is correct. Make `tryAutoFoundation` also work for the **waste** pile and for a tableau card that is the top of its column (already supported) — confirm by routing double-click and the auto button through the same path. Prefer the matching-suit foundation first.
- **Double-click reliability:** the current `onClick`+`handleCardTap` 350 ms timer competes with the native `onDoubleClick` and the pointer-down drag start. Replace with a single approach: on `pointerup` without movement, record the tap; if a second tap on the same card arrives within 350 ms call `onAuto`. Remove the redundant `onDoubleClick` handler so behavior is consistent on touch and mouse.
- **Auto-flip:** keep existing logic that flips the new top of each tableau column after every successful move.

## Technical notes

- No new dependencies.
- Card dimensions inferred from the first rendered tableau slot's `getBoundingClientRect()`; recompute on resize and on state changes via `useLayoutEffect`.
- Keep `aspectRatio: 5/7` for face/back so cards look identical in shape.
- Keep all existing SEO, HUD, undo, and timer code untouched.
