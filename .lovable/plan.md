## Goal

Fix indexing signals by rebuilding the sitemap to cover every public route automatically, add `lastmod` + tuned `priority` to every entry, and `noindex` hidden/utility routes. No UI, styling, or tool-logic changes.

## Findings

- **Fix 4 (internal links)** is already satisfied: `src/components/tool-card.tsx` uses TanStack `<Link to={tool.path}>` which renders a real `<a href>` server-side. No change needed; will note in response.
- **Fix 5 (`/generate`)**: route does not exist in the project, so nothing to noindex there. The only hidden/utility tool route is `/tools/video-downloader` (`hidden: true` in `src/lib/tools.ts`) — it is currently offline and should be `noindex, follow`.
- Current `src/routes/sitemap[.]xml.tsx` hardcodes a partial list and is missing recent tools (`lorem-ipsum`, `uuid-generator`, `add-text-to-image`, `audio-converter`, `background-blur`, `base64`, `collage-maker`, `color-palette`, `face-landmarks`, `hash-generator`, plus `image-resizer`, `image-cropper`, calculators, etc.) and the new blog post `best-free-online-tools-for-designers`. It also has a stale hardcoded `lastmod`.

## Changes

### 1. `src/routes/sitemap[.]xml.tsx` — rebuild dynamically

- Import `tools` from `@/lib/tools` and `blogPosts` from `@/lib/blog`.
- Build entries programmatically so new tools/posts are picked up automatically on every deploy:
  - `/` → priority `1.0`, changefreq `weekly`
  - `/tools` → `0.9`, `weekly`
  - `/blog` → `0.8`, `weekly`
  - Every `tools.filter(t => !t.hidden)` path → `0.8`, `monthly`
  - Every `blogPosts` path → `0.7`, `monthly`
  - `/about`, `/contact` → `0.5`, `monthly`
  - `/terms`, `/privacy` → `0.3`, `yearly` (kept indexed)
- `<lastmod>` = today's date (`new Date().toISOString().slice(0, 10)`) computed at request time, so it refreshes on every deploy/request.
- Output the same XML shape as today (Content-Type `application/xml`, 1h cache).

### 2. Noindex hidden tool route — `src/routes/tools.video-downloader.tsx`

Replace the route's `head: () => buildToolMeta(...)` with a thin wrapper that spreads `buildToolMeta(tool)` and appends a `{ name: "robots", content: "noindex, follow" }` meta entry (overrides the default `index, follow` from `buildPageMeta`). No other tool route changes.

### 3. Verification notes (no code change)

- `tool-card.tsx` already emits crawlable anchors via `<Link to=...>`; Fix 4 confirmed.
- `/generate` route does not exist; no action.

## Out of scope

UI, styles, tool logic, copy, and any non-listed routes are untouched. `buildToolMeta` / `buildPageMeta` are not modified.
