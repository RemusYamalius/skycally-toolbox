## Goal
Ensure Google can discover every tool URL via static `<a href>` links rendered on initial HTML, without changing any visible UI.

## Current state (already good)
- `ToolCard` already uses TanStack's `<Link>` (renders a real `<a href>`), so tool cards on `/` and `/tools` are crawlable in the SSR output.
- Each `src/routes/tools.*.tsx` already calls `buildToolMeta(...)` which emits `<title>`, description, OG tags, and a `<link rel="canonical">` pointing at `https://skycally.com{path}`.
- `public/robots.txt` already has `User-agent: * / Allow: / / Sitemap: https://skycally.com/sitemap.xml`.

No changes needed in those areas. The project does not use `react-helmet` / `src/pages/` — it's TanStack Start, so the user's `<Helmet>` / `src/pages/Tools.tsx` snippets don't apply literally; equivalent mechanisms are already in place.

## The one real gap
The homepage (`src/routes/index.tsx`) only renders the first 2 categories on initial paint (lazy `visibleCats` + IntersectionObserver) and caps each category at 6 tools until "Show more" is clicked. Tools beyond that are not present in the SSR HTML, so crawlers may miss newly added ones. Same risk on `/tools` if filters are active.

## Change
Add a single hidden-but-crawlable link list of every non-hidden tool, rendered unconditionally in SSR.

**Edit `src/routes/index.tsx`** — append just before the closing `</>` of `HomePage`'s return:

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

Notes:
- Use `<Link>` (not raw `<a>`) so TanStack's type-safe routing stays intact; it renders an `<a href>` in HTML, which is what crawlers need.
- Drop `aria-hidden="true"` from the user's snippet — combined with `sr-only` it would hide the links from assistive tech too. `sr-only` alone keeps them invisible to sighted users but crawlable and accessible.
- `tools` is already imported.

## Out of scope (intentionally not touched)
- `ToolCard` / `<Link>` usage — already correct.
- Per-tool `head()` / canonical — already correct via `buildToolMeta`.
- `robots.txt` — already correct.
- `/tools` page — every tool already renders in SSR when `cat=all` and search is empty (the default), so no extra hidden list needed there.
- Visual design, layout, lazy-loading behavior, and the "Show more" button stay exactly as they are.
