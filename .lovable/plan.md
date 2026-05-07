## Goal

Improve presentation, grouping, and discoverability of the 28 existing tools across three surfaces — home, all-tools, footer — without touching any tool component code or routes. The tool list in `src/lib/tools.ts` and all `tools.*.tsx` route files stay untouched.

## 1. Homepage (`src/routes/index.tsx`)

Replace the flat 28-card grid in the "Browse All Tools" section with a category-grouped layout that mirrors the site's brand. Hero section stays as-is.

For each of the 5 categories (in this order: Video, Image, Audio, PDF & Documents, Text) render a dedicated block:

```text
[icon] Category Label                    Count: N tools
short tagline (e.g. "Download, convert, compress and edit videos.")
─────────────────────────────────────────────────
[ ToolCard ] [ ToolCard ] [ ToolCard ] ...    (responsive 1/2/3 col grid)
```

Visual treatment:
- Section header uses the category color (from `categoryMeta[c].color`) for the icon chip and a subtle accent underline / gradient bar.
- Spacing: `py-10` between category blocks, soft divider via `border-t border-border/60`.
- Each category gets a one-line tagline (added inline in the home file, not in `tools.ts`):
  - Video: "Download, convert, compress and record videos in seconds."
  - Image: "Convert, compress, upscale and edit images instantly."
  - Audio: "Convert, transcribe and synthesize audio fast."
  - PDF & Documents: "Merge, split, convert and extract from PDFs."
  - Text: "Generate, format, encode and analyze text effortlessly."
- Cards continue to use existing `ToolCard` component (no visual regression risk).

The search dropdown in the hero already covers fast lookup, so no per-section search is needed.

## 2. All Tools page (`src/routes/tools.index.tsx`)

Keep the search + category filter pills at the top exactly as they are (functionality intact). Change the results area:

- When `cat === "all"`: render results grouped by category (same 5 sections as on home), each with its header + tool count, with the search query filtering across all groups (empty groups hidden).
- When a specific category pill is selected: render a single section header for that category and its tools (no grouping needed, but keep the same header style for consistency).
- The "no results" message stays.

This makes `/tools` feel like a real catalog instead of a flat 28-card wall.

## 3. Footer (`src/components/site-footer.tsx`)

Replace the current single "Categories" column (which only lists 3 names per category as plain text) with a 5-column tools mega-list under the footer's main grid:

New layout:

```text
[Logo + tagline]  | Quick Links | Legal
─────────────────────────────────────────
Video Tools | Image Tools | Audio Tools | PDF & Documents | Text Tools
- tool A    | - tool A    | - tool A    | - tool A        | - tool A
- tool B    | - tool B    | - tool B    | - tool B        | - tool B
...         | ...         | ...         | ...             | ...
```

Implementation:
- Top row: 3 columns — brand+tagline, Quick Links (Home, All Tools, About), Legal (Privacy, Terms).
- Below, a second grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` listing every tool inside its category column, each as a `<Link to={tool.path}>` styled as a small muted link that goes to `--foreground` on hover.
- Category heading uses the category color accent matching the rest of the site.
- Bottom bar (copyright + tagline) unchanged.

Every one of the 28 tools gets a direct link from the footer.

## Scope guarantees (no breakage)

- No edits to `src/lib/tools.ts` (slugs, paths, icons, descriptions stay identical).
- No edits to any `src/routes/tools.*.tsx` tool route file.
- No edits to `src/routeTree.gen.ts` or sitemap.
- `ToolCard` component reused as-is.
- `categoryMeta` keys/colors reused as-is.

## Files touched

- edit: `src/routes/index.tsx` (replace flat tools grid with grouped sections + per-category headers)
- edit: `src/routes/tools.index.tsx` (group results by category when `cat === "all"`)
- edit: `src/components/site-footer.tsx` (add full per-category tool link grid)
