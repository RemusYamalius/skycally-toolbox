## New blog post: "How to Test Your Internet Speed Online — Free & No Signup Required"

Matches the existing blog post structure (compress-pdf, video-to-gif, designers-tools, developers-tools).

### Files

1. **`src/assets/blog-network-speed-test.png`** (new, generated via imagegen) — thumbnail in the same screenshot style as other blog hero images. Shows the Skycally Network Speed Test UI with download/upload/ping/jitter readouts on the dark theme.

2. **`src/lib/blog.ts`** — append new `BlogPost` entry:
   - `slug: "how-to-test-internet-speed-online-free"`
   - `path: "/blog/how-to-test-internet-speed-online-free"`
   - `title`, `description`, `category: "Network Tools"` (sentence-case to match the existing pattern — the UI uppercases it via CSS), `date: "2026-06-04"`, `dateLabel: "June 4, 2026"`
   - `author: "Skycally Team"`, `ctaToolSlug: "network-speed-test"`
   - `thumbnail` import, `thumbnailAlt: "Network Speed Test tool interface"`

3. **`src/routes/blog.how-to-test-internet-speed-online-free.tsx`** (new) — same shape as `blog.compress-pdf-online-free.tsx`:
   - `createFileRoute("/blog/how-to-test-internet-speed-online-free")`
   - `head()` returns `buildPageMeta(...)` + `og:type: article` + JSON-LD Article schema
   - `<BlogPostLayout post={post}>` wraps the content
   - Content sections (h2 + p/ul/ol, no inline styles — uses BlogPostLayout's prose styles):
     1. **What Is an Internet Speed Test?** — paragraph + ul defining Download, Upload, Ping, Jitter
     2. **Why Your Internet Speed Matters** — intro paragraph + HTML `<table>` (Activity | Recommended Speed): HD Streaming 5 Mbps, 4K Streaming 25 Mbps, Video Calls 3 Mbps, Online Gaming 10 Mbps, Working From Home 25+ Mbps. Table gets minimal Tailwind classes to render on the dark theme since the layout's prose styles don't target tables.
     3. **How to Test Your Speed with Skycally** — ordered list (Open the tool → Click Run Test → Wait ~15s → View results), with link `<a href="/tools/network-speed-test">`. Immediately after the ol, an `<img src="https://www.pinterest.com/pin/1100356121480435073" alt="Network Speed Test - Skycally" />` per user request.
     4. **Understanding Your Results** — h3/h4-grouped paragraphs for Download (good/bad), Upload, Ping (<30 ms great), Jitter (<10 ms great)
     5. **Tips to Improve Your Internet Speed** — 5-item `<ol>`: restart router, use 5 GHz / wired, move closer to router, close bandwidth-heavy apps, upgrade plan or contact ISP
     6. **Why Use Skycally's Speed Test?** — `<ul>` (no signup, runs in browser, powered by Cloudflare, accurate ping/jitter, fully free) ending with `<Link to="/tools/network-speed-test">` styled CTA button matching the `BlogPostLayout` CTA aside style

### Untouched

- Existing posts and `BlogPostLayout` component are NOT modified.
- `routeTree.gen.ts` regenerates automatically from the new route file.

### Notes

- The Pinterest URL the user provided (`pinterest.com/pin/...`) is an HTML page, not an image asset, so it will render as a broken image in browsers. I'll wire it in exactly as requested per the user's instruction, but flag this in the closing message so they can swap it for a direct image URL if desired.
