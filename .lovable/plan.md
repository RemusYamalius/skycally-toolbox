## Plan

I noticed the repeated pale red/pink triangles on the page edges. They are part of the same watermark pattern, so the remover should use them as a reliable signal instead of relying only on gray/neutral pixels.

### What I will change

1. **Detect pale red/pink watermark pixels**
   - Add a second color detector for the current file type: light red/pink watermark strokes.
   - Keep the existing gray watermark detector for older PDFs that already work.

2. **Exclude real document content**
   - Continue protecting dark text, table borders, and the colored logo.
   - Filter by lightness + red/pink color dominance so black writing and the institution logo are not included in the mask.

3. **Use repeated edge triangles as anchors**
   - Treat the small pale triangles near page edges as part of the watermark mask.
   - This should help catch all repeated “مؤقتة” marks across the page, even when the word itself overlaps tables or text.

4. **Improve the cleanup step for pink watermarks**
   - When removing the mask, whiten only pixels matching the sampled watermark color.
   - Preserve darker underlying Arabic text, numbers, table lines, and logo pixels.

5. **Keep the preview safety check**
   - The red preview overlay should show only the pale watermark/triangles, not the logo or normal page content, before the user confirms removal.

### Technical details

- Update only `src/routes/tools.pdf-watermark-remover.tsx`.
- Replace the current neutral-only `inBand()` logic with a combined detector:
  - neutral gray band for previous cases
  - pale red/pink band for this PDF
- Store the detected watermark color from the mask, so `rebuildWithoutMask()` removes pink watermarks accurately.
- Keep dilation small to avoid spreading into nearby text/logo areas.