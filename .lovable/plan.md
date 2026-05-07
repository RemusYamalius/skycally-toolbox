## Fix Split PDF page — add title and tool info

The `/tools/split-pdf` page renders only the drop zone with no header, breaking consistency with all other tool pages.

### Changes to `src/routes/tools.split-pdf.tsx`

1. Import `ToolPageShell` from `@/components/tool-page-shell` and `HowToUse` from `@/components/how-to-use`.
2. Wrap the existing component JSX in `<ToolPageShell title="Split PDF" description="Extract specific pages or page ranges from any PDF file instantly.">`.
3. Remove the hard-coded full-screen `bg-[#0a0f1e]` wrapper (the shell handles layout). Keep the inner card markup unchanged.
4. Append a `<HowToUse>` block with three steps:
   - "Upload your PDF file by dropping it or clicking to browse."
   - "Type the pages you want to extract (e.g. 1-3,5,7-9)."
   - "Click Split PDF to download the extracted pages instantly."

### Memory

Save a Core rule to `mem://index.md` so future tool pages always include title + description + HowToUse via `ToolPageShell`:
- "Every new tool route must wrap its UI in ToolPageShell (title + description) and end with a HowToUse block — matches all existing tool pages."

### Files touched
- edit: `src/routes/tools.split-pdf.tsx`
- edit: `mem://index.md`
