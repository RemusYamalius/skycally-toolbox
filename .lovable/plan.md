## Fix: Add Text to Image — replace Fabric.js with pure Canvas API

The current Fabric.js v7 implementation fails to render the canvas after upload. Replace it with a pure Canvas API approach (no external library) that supports draggable text layers, selection, and PNG export.

### Single file change

**`src/routes/tools.add-text-to-image.tsx`** — full rewrite, keeping the project's route conventions (do not paste the user's standalone component verbatim, since it duplicates back-link, page title, and uses raw Tailwind hex classes that bypass the design system).

Adapt the user's pure-Canvas component as follows:

- Keep `createFileRoute("/tools/add-text-to-image")` + existing `head()` meta block.
- Wrap content in `<ToolPageShell title="Add Text to Image" description="…">` (provides back-link, H1, "no files stored" badge — so drop the user's manual versions of those).
- Use the existing `<DropZone accept="image/*" onFiles={…} label="Drop an image to start" hint="PNG, JPG or WEBP" />` for the empty state instead of the raw drop div.
- Keep `<AdZone id="image-tool-below-result" size="300x250" />` and `<HowToUse steps={[…]} />` at the bottom.
- Replace hard-coded hex colors (`#0a0f1e`, `#0d1526`, `#1e2d4a`, `cyan-500`, `from-cyan-500 to-blue-600`) with semantic tokens already used elsewhere: `bg-card`, `border-border`, `bg-background`, `text-muted-foreground`, `bg-[var(--cyan-brand)] text-background` for the primary action, `bg-foreground text-background` for the download button — matching the existing add-text-to-image and other tool routes.
- Use `toast.success("✅ Download started!")` from `sonner` on download (matches plan convention).
- Use `<a download>` pattern for export (already in the snippet).

### Logic preserved from the user's snippet

- `TextLayer` interface and state (text, x, y, font, color, bold/italic, shadow, outline + width).
- `draw()` redraws image + each layer with shadow/outline/fill, plus dashed cyan selection rect.
- Mouse handlers: `onMouseDown` hit-tests via `ctx.measureText`, starts drag with offset; `onMouseMove` updates layer position; `onMouseUp` clears dragging.
- `getCanvasCoords` accounts for CSS-vs-canvas scale (`canvas.width / rect.width`), so dragging stays accurate when the canvas is rendered at `width: 100%`.
- "Add Text Layer" creates a new layer centered on canvas; "Edit Selected" panel updates the active layer; "Delete" removes it; layer list lets users reselect.
- Download uses `canvas.toDataURL("image/png")`.

### Notes

- Removes runtime dependency on `fabric` for this route. The package stays in `package.json` (no other route uses it currently, but leaving it avoids a separate uninstall step — can be removed later if desired).
- No new files, no new deps, no backend changes.
