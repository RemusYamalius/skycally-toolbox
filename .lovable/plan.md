Plan to fix the Maze Puzzle emoji color fading:

1. Update only `src/routes/tools.maze-puzzle.tsx`.
2. Change the goal animation so it never scales, fades, filters, or recolors the emoji glyph itself.
   - Keep any pulse as a subtle canvas shape behind the goal emoji.
   - Draw the goal emoji afterward at a fixed font size with `globalAlpha = 1`, `filter = none`, `shadowBlur = 0`, and `source-over`.
3. Isolate canvas drawing state between layers.
   - Trail/path/fog/walls draw first.
   - Animated halo/particles draw separately.
   - Start, goal, and player emojis draw last in a dedicated “natural emoji” pass.
4. On `newMaze()`, reset animation refs and the emoji/font drawing state so a new maze cannot inherit any stale animation state.
5. Keep the existing rAF cleanup behavior, with no new dependencies and no DOM overlay.
6. Verify in preview by moving at least two steps, starting a new maze, and confirming the emojis remain full-color without needing a page refresh.