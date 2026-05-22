## Add third blog post: "Best Free Online Tools for Designers (2025)"

Follow the exact pattern of the two existing posts. No component, layout, or style changes.

### 1. Hero image
Generate `src/assets/blog-designers-tools.png` — a clean screenshot-style mock of the Remove Background tool interface (matches the visual style of `blog-compress-pdf.png` and `blog-video-to-gif.png`).

### 2. Register post in `src/lib/blog.ts`
Append a third entry to `blogPosts`:
- slug: `best-free-online-tools-for-designers`
- path: `/blog/best-free-online-tools-for-designers`
- title: `Best Free Online Tools for Designers (2025)`
- description: `The best browser-based tools for designers in 2025 — free, no signup, no installs.`
- category: `Design Tools` (rendered uppercase by the card)
- date: `2026-05-22`, dateLabel: `May 22, 2026`
- author: `Skycally Team`
- ctaToolSlug: `remove-bg`
- thumbnail: imported `blog-designers-tools.png`
- thumbnailAlt: `Remove Background tool interface`

### 3. New route `src/routes/blog.best-free-online-tools-for-designers.tsx`
Mirror `blog.compress-pdf-online-free.tsx` exactly:
- `createFileRoute('/blog/best-free-online-tools-for-designers')`
- `head()` returning `buildPageMeta(...)` + `og:type: article` + Article JSON-LD (headline, datePublished/Modified `2026-05-22`, author/publisher Skycally, url, description)
- `<BlogPostLayout post={post}>` body containing:
  - Intro paragraph
  - Ten `<h2>` sections (Remove Background, Image Compressor, Image Filters, Image to Sketch, Add Watermark, Word to PDF, Merge PDF, Compress PDF, QR Code Generator, PDF Watermark Remover) — each with description paragraph + `<strong>Best for:</strong>` line
  - `<h2>Why Browser-Based Tools Work for Designers</h2>` section
  - `<h2>Frequently Asked Questions</h2>` with 5 Q/A pairs in the same `<strong>Q</strong><br/>A` format used by existing posts
- Internal links use `<a href="/tools/{slug}">` for each mentioned tool

The CTA card and "You might also like" rail render automatically from `BlogPostLayout` via `ctaToolSlug: "remove-bg"`.

### 4. Tweak related-tools for the requested rail
The user asked the "You might also like" rail to show Remove Background, Image Compressor, QR Code Generator. `RelatedTools` derives this from `relatedToolsMap[ctaToolSlug]`. Since the CTA tool is `remove-bg`, change `relatedToolsMap["remove-bg"]` in `src/lib/related-tools.ts` from `["image-upscaler", "add-watermark", "image-compressor"]` to `["image-compressor", "qr-generator", "image-upscaler"]` — keeps remove-bg itself out of its own list (it's the CTA tool, can't be in the rail), satisfies 2 of the 3 requested, and uses `image-upscaler` as the third since the rail can only show 3 and the CTA tool can't appear in its own related list. This is the only existing-file change.

Note: this also affects the Remove Background tool page's related rail. If you'd prefer to leave that map untouched, I'll skip step 4 and the rail will show the current defaults instead.

### Files
- new: `src/assets/blog-designers-tools.png`
- new: `src/routes/blog.best-free-online-tools-for-designers.tsx`
- edit: `src/lib/blog.ts` (append entry + import)
- edit: `src/lib/related-tools.ts` (one-line map change — optional, see step 4)

No edits to existing posts, routes, components, or styles.