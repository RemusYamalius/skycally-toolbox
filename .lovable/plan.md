# Plan: Mobile perf (unused JS) + SEO meta overhaul

## Part A — Reduce unused JavaScript on homepage

**Fix 1 — Icon imports**
Audit shows `lucide-react` is already imported by name everywhere (e.g. `index.tsx` uses `import { Search, Upload, ... } from "lucide-react"`, `tools.ts` uses named imports). Tree-shaking is already correct — no changes needed here. I'll do a quick `rg` sweep to confirm no `import * as` patterns slipped in elsewhere.

**Fix 2 — Defer the full tools grid (biggest win)**
The homepage currently renders **all 47 tool cards** across 5 categories on first paint. Each `ToolCard` ships its lucide icon + framer-motion animation. That's the bulk of the unused JS for users above the fold.

Approach: render the **first 6 tools per category by default**, with a "Show all N tools" button that reveals the rest. Per-category, client-side, no extra deps (avoids adding `@tanstack/react-virtual` ~7KB).

- Add `useState<Record<ToolCategory, boolean>>` in `HomePage` for expanded categories.
- Slice `list.slice(0, expanded[cat] ? list.length : 6)` when rendering grid.
- Show "Show N more →" button when there are hidden items.
- Keeps all SEO/SSR HTML for crawlers if we render all server-side… but to actually reduce client JS work and DOM nodes we render the truncated list on both server and client (consistent SSR). Crawlers still find the full inventory via the `/tools` page (already linked in nav + sitemap).

**Fix 3 — Cache headers** (deferred)
TanStack Start on Cloudflare Workers serves static assets through Vite's hashed filenames; long cache headers are a wrangler/`assets` config concern, but our `wrangler.jsonc` doesn't define an `assets` block — defaults from the framework apply. I will skip code changes for this fix and note it for the user (requires Cloudflare dashboard config or a custom asset handler, outside scope of a UI/code change).

**Fix 4 — LCP**
The hero `<h1>` is text and is already at the top of SSR HTML — no late-loading element. The decorative blurred div + `motion.div` opacity animation does not block paint. No change needed.

## Part B — SEO meta tags across all pages

**Goal:** Every page gets consistent title, description, robots, canonical, og:title, og:description, og:url, og:image — generated from a central helper.

**1. Create `src/lib/seo.ts`** with:
- `SITE_URL = "https://skycally.com"`
- `OG_IMAGE = "https://skycally.com/og-image.png"`
- `buildToolMeta(tool: Tool)` → returns the `head()` payload with:
  - title: `Free {tool.name} Online — No Signup | Skycally` (truncated to 60)
  - description: `{tool.description} Free, private, works in your browser.` (truncated to 160)
  - robots, canonical, full og:* set
- `buildPageMeta({ title, description, path })` → static-page variant with the same structure.

**2. Update each tool route** (47 files) to replace the existing `head: () => ({ ... })` with `head: () => buildToolMeta(toolBySlug("video-downloader"))` (or pass the tool object directly). I'll do this with a script that:
- Imports `buildToolMeta` and the matching tool from `@/lib/tools`.
- Replaces the `head: () => ({ meta: [...], links: [...] })` block.
- Preserves any route-specific JSON-LD `scripts` blocks if present.

**3. Update static pages** (`index.tsx`, `tools.index.tsx`, `about.tsx`, `contact.tsx`) with the exact title/description strings the user specified. `privacy.tsx` and `terms.tsx` keep their existing meta but get robots + canonical + og:image added via `buildPageMeta`.

**4. Root route** (`__root.tsx`) keeps fallback meta but adds `<meta name="robots" content="index, follow">` so child routes inherit it (and individual pages can still override).

## Files

```text
new   src/lib/seo.ts
edit  src/routes/index.tsx               (homepage meta + truncated grid)
edit  src/routes/tools.index.tsx         (meta)
edit  src/routes/about.tsx               (meta)
edit  src/routes/contact.tsx             (meta)
edit  src/routes/privacy.tsx             (meta)
edit  src/routes/terms.tsx               (meta)
edit  src/routes/__root.tsx              (default robots meta)
edit  src/routes/tools.*.tsx             (47 files via script)
```

## Out of scope / notes

- Cloudflare cache-control headers: requires dashboard or wrangler `assets` config — flagged for the user.
- `@tanstack/react-virtual` not added; per-category truncation is simpler and saves the dep weight.
- No UI/visual changes beyond the new "Show more" button under each category section.
