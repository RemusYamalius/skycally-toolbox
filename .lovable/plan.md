# Blog Section Plan

## Files to create

### 1. `src/lib/blog.ts`
Blog post registry and types.
```ts
export interface BlogPost {
  slug: string;
  title: string;
  description: string;   // 2-line teaser for cards
  category: string;      // e.g. "PDF & Documents"
  date: string;          // ISO "2026-05-16"
  dateLabel: string;     // "May 16, 2026"
  author: string;        // "Skycally Team"
  ctaToolSlug: string;   // related tool slug, e.g. "compress-pdf"
  relatedToolSlugs: [string, string, string];
}
export const blogPosts: BlogPost[] = [ /* compress-pdf-online-free entry */ ];
export const getPostBySlug = (slug: string) => blogPosts.find(p => p.slug === slug);
```

### 2. `src/components/blog-card.tsx`
Article card for the listing grid: thumbnail placeholder (gradient block with category color, no image asset needed), category badge, H3 title, 2-line description (`line-clamp-2`), date, "Read more →" link. Style mirrors `tool-card.tsx` (rounded-2xl, border, bg-card, hover lift on md+, mobile-safe motion props following the existing `useIsMobile` pattern).

### 3. `src/routes/blog.tsx` (listing)
- `createFileRoute("/blog")` with `head()` providing title/description/canonical via `buildPageMeta` from `src/lib/seo.ts`.
- Layout: max-w-7xl container, header ("Skycally Blog" + subtitle), 2-col grid on `md:` / 1-col on mobile, mapped from `blogPosts`.
- Wrapped in same site shell (already provided by `__root.tsx`); no need to hardcode `bg-[#0a0f1e]` — the existing dark theme tokens already apply. (Note: I'll use semantic tokens instead of literal hex, per design rules. The site already renders the requested dark look.)

### 4. `src/routes/blog.$slug.tsx` (post template)
- `createFileRoute("/blog/$slug")` with dynamic `head()` from the post (title, description, og:title, og:description, og:type=article, canonical).
- 404 via `notFoundComponent` if slug not in registry.
- Layout: `max-w-[800px] mx-auto px-4 sm:px-6 py-12`.
- Article header: category badge (using existing `Badge`), H1 (`font-display`), date + "By Skycally Team" line.
- `<article className="prose prose-invert ...">` body region — for the first post this contains `{/* ARTICLE CONTENT GOES HERE */}` and a placeholder paragraph.
- CTA box at end: rounded-2xl bordered card with "Try it free →" linking to `/tools/{ctaToolSlug}` via `<Link>`.
- Reuses existing `<RelatedTools currentSlug={ctaToolSlug} />` component to render the 3 related tool cards under "You might also like".

### 5. `src/routes/blog.compress-pdf-online-free.tsx`
Wait — TanStack flat routing makes `blog.$slug.tsx` already serve `/blog/compress-pdf-online-free`. The user asked for a dedicated article page; I'll register the article in `blog.ts` so the dynamic route renders it. No separate file needed (cleaner, scales for future posts). The placeholder comment `{/* ARTICLE CONTENT GOES HERE */}` lives inside the dynamic template's article body, conditionally rendered for this slug — or simpler: store a `Body` React component reference per post in `blog.ts`. For the first article the Body component contains only the placeholder comment + a stub `<p>` so the user can paste content in.

If the user prefers a separate per-article file, I'll instead create `src/routes/blog.compress-pdf-online-free.tsx` that imports a shared `<BlogPostLayout post={...}>` component and puts the placeholder comment directly in JSX. **I'll go with this approach** — matches the user's explicit request ("Create the first article page at /blog/compress-pdf-online-free") and makes it obvious where to paste content.

So:
- `src/components/blog-post-layout.tsx` — shared layout (header + children slot + CTA + RelatedTools).
- `src/routes/blog.$slug.tsx` — fallback dynamic route that 404s for unknown slugs (covers future posts via registry, but for now only the first one has a dedicated file).
- `src/routes/blog.compress-pdf-online-free.tsx` — concrete article file with the placeholder comment in body.

Actually, to keep it simple and match the request exactly: **skip the dynamic route file**. Create only the concrete article file now. Future articles get their own files too. The listing page links to `/blog/compress-pdf-online-free` directly via the registry's `path` field.

## Final file list
- `src/lib/blog.ts` — post registry (slug, title, description, category, date, dateLabel, author, ctaToolSlug, path).
- `src/components/blog-card.tsx` — listing card.
- `src/components/blog-post-layout.tsx` — shared article shell (header, prose container for children, CTA box, RelatedTools).
- `src/routes/blog.tsx` — `/blog` listing.
- `src/routes/blog.compress-pdf-online-free.tsx` — first article, body = `{/* ARTICLE CONTENT GOES HERE */}`.

## Files to edit
- `src/components/site-header.tsx` — add `{ to: "/blog", label: "Blog" }` between Tools and About in the `links` array (covers desktop nav and mobile menu).
- `src/components/site-footer.tsx` — add `<li><Link to="/blog">Blog</Link></li>` in Quick Links between Tools and About.
- `src/routes/sitemap[.]xml.tsx` — append `["/blog", "0.7", "weekly"]` and `["/blog/compress-pdf-online-free", "0.6", "monthly"]` to `ROUTES`.

## Out of scope
- No tool page changes, no changes to existing tools, no business logic.
- Using semantic design tokens (`bg-card`, `border-border`, `text-muted-foreground`, accent via category color) instead of literal `#0a0f1e`/`#0d1526` hex — the existing dark theme already produces the requested look and design rules forbid raw hex in components. Visual result matches user intent.

## Notes
- `routeTree.gen.ts` regenerates automatically — won't be hand-edited.
- Dates use string literals; no `Date.parse` needed at render.
- Article CTA and RelatedTools both reference `compress-pdf` slug for the first post.
