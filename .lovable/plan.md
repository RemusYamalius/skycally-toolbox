## Goal
Add a "You might also like" section showing exactly 3 related tool cards on every tool page, placed just above the FAQ block (which lives inside `ToolSeoContent`).

## Approach

### 1. New file: `src/lib/related-tools.ts`
- Export `relatedToolsMap: Record<string, string[]>` keyed by tool slug, with the 3 related slugs from the user's mapping.
- Normalize a few mapping names that don't have exact matches in `src/lib/tools.ts`:
  - "Extract Text from PDF" → `pdf-text-extractor`
  - "Image to Text (OCR)" → `image-to-text`
  - "Images to PDF" (mentioned for Image to PDF) → fallback to `image-compressor` (closest existing) since there is no separate "Images to PDF" tool
  - "PDF to Word" (mentioned for OCR / Word to PDF / Document Scanner) → fallback to `pdf-text-extractor` since no PDF-to-Word tool exists
- Export `getRelatedTools(slug: string): Tool[]` that resolves slugs against `tools` and returns up to 3 valid `Tool` objects. If fewer than 3 resolve, top up with same-category tools (excluding self) so the section always shows exactly 3.

### 2. New component: `src/components/related-tools.tsx`
- Props: `currentSlug: string`.
- Renders a section with heading "You might also like" matching existing tool-page typography (`font-display text-2xl sm:text-3xl font-bold tracking-tight`, with a short muted subtitle).
- Grid: `grid gap-5 sm:grid-cols-2 lg:grid-cols-3`.
- Reuses the existing `<ToolCard>` component for visual consistency with the All Tools page (icon + name + description + "Try it →"), passing `index` for stagger.
- Wrapper section uses `mt-16` for spacing and is hidden if no related tools resolve.

### 3. Insert into every tool page
- For each `src/routes/tools.*.tsx` (47 pages), add `<RelatedTools currentSlug="<slug>" />` immediately BEFORE the existing `<ToolSeoContent ... />` block.
- This places it under `HowToUse`, above the body+FAQ block — i.e. just above the FAQs as requested.
- Add the import `import { RelatedTools } from "@/components/related-tools";` once per file.
- No changes to `ToolSeoContent`, `ToolCard`, `ToolPageShell`, or any tool-specific UI/logic.

### 4. Out of scope
- No design tokens changed.
- No changes to the All Tools page, home, or any tool's actual functionality.
- No changes to `src/lib/tools.ts` (the existing tool registry is the source of truth).

## Files touched
- New: `src/lib/related-tools.ts`, `src/components/related-tools.tsx`
- Edited: all 47 `src/routes/tools.*.tsx` files (insert one import + one JSX line each)
