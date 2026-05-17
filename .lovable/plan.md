## Plan: SoftwareApplication schema + 4 new text tools

### Part 1 — SoftwareApplication JSON-LD on every tool page

Centralize the schema in `src/lib/seo.ts` so I don't have to edit 60+ route files manually.

- Update `buildToolMeta(tool)` to also return a `scripts` array containing a single `application/ld+json` script built from the tool's `name`, `description`, and `slug`:
  ```json
  { "@context": "https://schema.org", "@type": "SoftwareApplication",
    "name": tool.name, "applicationCategory": "WebApplication",
    "operatingSystem": "Any",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "url": `https://skycally.com/tools/${tool.slug}`,
    "description": tool.description }
  ```
- Every tool route already calls `head: () => buildToolMeta(...)`, so the schema propagates to all current and future tool pages with zero per-file edits.

### Part 2 — Four new browser-based text tools

Register each in `src/lib/tools.ts` (category: `text`) and add them to `src/routes/sitemap[.]xml.tsx` ROUTES (priority `0.6`, monthly). Each route uses the standard `ToolPageShell` + `HowToUse` + `RelatedTools` + `ToolSeoContent` layout consistent with `tools.base64.tsx`, dark theme, cyan/blue gradient buttons.

**1. `src/routes/tools.url-encoder.tsx`** — `/tools/url-encoder`
- Encode/Decode tabs, textarea input, action button, output card with Copy
- `encodeURIComponent` / `decodeURIComponent` with try/catch for malformed input

**2. `src/routes/tools.lorem-ipsum.tsx`** — `/tools/lorem-ipsum`
- Inputs: paragraphs (1–10), words per paragraph (20–100)
- Toggle: Plain text vs `<p>` HTML output
- Word pool drawn from classic lorem ipsum vocabulary; Generate + Copy All

**3. `src/routes/tools.uuid-generator.tsx`** — `/tools/uuid-generator`
- Count input (1–20), Generate button using `crypto.randomUUID()`
- List with per-row Copy + Copy All
- Fallback polyfill if `randomUUID` unavailable (manual v4 from `crypto.getRandomValues`)

**4. `src/routes/tools.hash-generator.tsx`** — `/tools/hash-generator`
- Single textarea input; on Generate computes MD5, SHA-1, SHA-256, SHA-512 in parallel
- SHA variants via `crypto.subtle.digest`
- MD5 via a small inline pure-JS implementation (Web Crypto doesn't support MD5)
- Four output cards, each with its own Copy button

### Files touched

- `src/lib/seo.ts` — extend `buildToolMeta` with JSON-LD `scripts`
- `src/lib/tools.ts` — add 4 entries (icons: `Link2`, `AlignLeft`, `Fingerprint`, `Hash`)
- `src/routes/sitemap[.]xml.tsx` — append 4 URLs
- `src/routes/tools.url-encoder.tsx` (new)
- `src/routes/tools.lorem-ipsum.tsx` (new)
- `src/routes/tools.uuid-generator.tsx` (new)
- `src/routes/tools.hash-generator.tsx` (new)

No new npm packages. `routeTree.gen.ts` regenerates automatically.