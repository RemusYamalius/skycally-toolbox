## Add new blog post: Best Free Online Tools for Developers (2025)

Follows the exact same pattern as the existing designers post.

### Files to create

**1. `src/assets/blog-developers-tools.png`** — cover image generated via imagegen (developer-themed: JSON Formatter / code editor interface aesthetic, matching the visual style of the existing blog thumbnails).

**2. `src/routes/blog.best-free-online-tools-for-developers-2025.tsx`** — new route file mirroring `blog.best-free-online-tools-for-designers.tsx`:
- `createFileRoute("/blog/best-free-online-tools-for-developers-2025")`
- `head()` with `buildPageMeta` + Article JSON-LD (datePublished/Modified `2026-06-02`)
- `ArticlePage` component returning `<BlogPostLayout post={post}>` with the 8 tool sections (JSON Formatter, Base64, Hash Generator, Password Generator, URL Encoder, Markdown to HTML, UUID Generator, Link Shortener), each linking to its `/tools/*` route, plus "Why Browser-Based Tools Work for Developers" and FAQ sections — all written in the same `<h2>`/`<p>`/`<strong>` style as the designers post.

### Files to edit

**3. `src/lib/blog.ts`**
- Import the new thumbnail: `import developersToolsThumb from "@/assets/blog-developers-tools.png";`
- Append a new `BlogPost` entry to `blogPosts`:
  - slug: `best-free-online-tools-for-developers-2025`
  - path: `/blog/best-free-online-tools-for-developers-2025`
  - title: `Best Free Online Tools for Developers (2025)`
  - description: `The best browser-based tools for developers in 2025 — free, no signup, no installs.`
  - category: `Developer Tools`
  - date: `2026-06-02`, dateLabel: `June 2, 2026`
  - author: `Skycally Team`
  - ctaToolSlug: `json-formatter`
  - thumbnail + alt

### Automatic behavior (no extra work)

- Blog index (`/blog`) already maps over `blogPosts`, so the new card appears automatically.
- `BlogPostLayout` already renders the "Ready to try {ctaTool.name}?" CTA from `ctaToolSlug` (`json-formatter` → "Ready to try JSON Formatter?", links to `/tools/json-formatter`) and the "You might also like" section via `RelatedTools` based on the CTA tool's category/related logic. The user's requested related items (UUID / Hash / Password Generator) will surface naturally from the developer-tools category relations; no manual override needed.
- Sitemap route already enumerates blog posts from `src/lib/blog.ts`, so the new URL is included automatically.

No other files need changes.
