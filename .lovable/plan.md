## Status of your four requests

Three of the four are **already done** in this project. Only one small gap remains.

### 1. Tool cards wrapped in static `<a href>` — ALREADY DONE
The project uses TanStack Start, not the `src/pages/Tools.tsx` file from your snippet (that file doesn't exist). The tools list lives at `src/routes/tools.index.tsx` and uses `<ToolCard>`, which renders TanStack's `<Link to={tool.path}>` — that compiles to a real `<a href="/tools/...">` in SSR HTML. Crawlable as-is.

### 2. Per-tool `<head>` tags (title, description, canonical) — ALREADY DONE
Every `src/routes/tools.*.tsx` calls `buildToolMeta(toolBySlug(...))` from `src/lib/seo.ts`, which emits:
- `<title>` (≤60 chars)
- `<meta name="description">` (≤160 chars)
- `<link rel="canonical" href="https://skycally.com{path}">`
- OG + Twitter tags + JSON-LD `SoftwareApplication`

### 3. `sitemap.xml` with every tool URL — ALREADY DONE
`src/routes/sitemap[.]xml.tsx` is a server route that iterates `tools.filter(t => !t.hidden)` and emits a `<url>` for each, plus home, /tools, /blog, blog posts, and static pages. Served at `https://skycally.com/sitemap.xml`. `robots.txt` already references it.

### 4. Hidden crawlable link list on `/tools` — THE ONE GAP
The homepage (`src/routes/index.tsx`) already has this hidden `<nav aria-label="All tools" className="sr-only">` from the previous prompt. But `/tools` does not — and when a category filter or search query is active, only a subset of tools appears in SSR. Add the same safety net there.

## The only change

**Edit `src/routes/tools.index.tsx`** — add just before the closing `</div>` of `ToolsPage` (after the `list.length === 0` line, ~line 135):

```tsx
{/* SEO: static crawlable index of every tool — visually hidden */}
<nav aria-label="All tools" className="sr-only">
  <ul>
    {tools.filter((t) => !t.hidden).map((t) => (
      <li key={t.slug}><Link to={t.path}>{t.name}</Link></li>
    ))}
  </ul>
</nav>
```

Add `Link` to the existing `@tanstack/react-router` import. `tools` is already imported.

## Out of scope (already correct, no changes)
- `ToolCard` (already uses `<Link>`)
- Per-tool `head()` / canonical (already via `buildToolMeta`)
- `sitemap.xml` (already dynamic and complete)
- `robots.txt` (already correct)
- Visual layout, filtering, search behavior — untouched
