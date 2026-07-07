# Ship Batch 1 — 6 Free SEO Tools (Semrush-powered)

Add a new **SEO Tools** category with 6 free, no-signup tools that use your Semrush workspace connection server-side. Every tool follows the exact existing structure: `ToolPageShell` → interactive UI → `HowToUse` → `ToolSeoContent` (4 body paragraphs + 8 FAQs) → `RelatedTools` ("You might also like").

## The 6 tools

| # | Route | Semrush endpoint(s) |
|---|---|---|
| 1 | `/tools/keyword-research` | `/keywords/phrase_this` + `/keywords/phrase_related` + `/keywords/phrase_questions` |
| 2 | `/tools/domain-analysis` (Website Traffic Checker) | `/domains/domain_ranks` + `/domains/domain_organic` |
| 3 | `/tools/backlink-checker` | `/backlinks/backlinks_overview` + `/backlinks/backlinks_refdomains` |
| 4 | `/tools/keyword-difficulty` | `/keywords/phrase_kdi` + `/keywords/phrase_this` |
| 5 | `/tools/competitor-analysis` (Keyword Gap) | `/domains/domain_organic_organic` |
| 6 | `/tools/page-seo-analyzer` | `/url/url_organic` + `/url/url_ranks` |

Every route accepts a "database" (country) selector where Semrush supports it — defaults to `us`.

## Structural conventions per tool (mandatory)

Matches every existing tool page:

1. `ToolPageShell` with a clear title + description, `showFileDisclaimer={false}` (no file upload).
2. Input form (keyword / domain / URL + country selector).
3. Results panel (metrics cards + result table).
4. `<HowToUse steps={[step1, step2, step3]} />`.
5. `<ToolSeoContent title="…" description="…" body={[p1, p2, p3, p4]} faqs={[…8 items]} />`.
6. `<RelatedTools currentSlug="…" />` — mapped in `src/lib/related-tools.ts` to the other 5 SEO tools + a relevant existing tool (e.g. `link-shortener`, `qr-generator`, `word-counter`).

## Backend (server functions)

For each tool, one `createServerFn({ method: "POST" })` under `src/lib/<slug>.functions.ts`:

- Zod-validate input.
- Call the Semrush gateway at `https://connector-gateway.lovable.dev/semrush/...` with `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $SEMRUSH_API_KEY`.
- Parse the CSV/`columnNames + rows` response into a typed JSON shape.
- Per-IP throttle (in-memory LRU) — 20 requests / hour per IP — to protect your Semrush quota.
- Graceful error messages when quota is exhausted (`ERROR 134 :: TOTAL LIMIT EXCEEDED`) or the connector isn't linked yet.

## Connector

Semrush is in the workspace catalog but not yet linked to this project. I'll trigger `standard_connectors--connect` for `semrush` so `SEMRUSH_API_KEY` becomes available server-side. If you skip, the routes still ship but show a friendly "SEO backend not connected yet" message until it is.

## New category + visibility

- Add `"seo"` to `ToolCategory` in `src/lib/tools.ts` with icon 🔎, color `var(--cyan-brand)`, label "SEO Tools".
- Register all 6 tools in the `tools[]` array.
- Add a `Search` chip to `QUICK_CATS` on the homepage hero.
- Add `seo` to the categories loop in `/tools` index and the `/tools/` route search validator.
- Extend `relatedToolsMap` in `src/lib/related-tools.ts` with the 6 slugs.
- Update `public/sitemap.xml` + `public/llms.txt` with the 6 new URLs.

## Files to add/edit

- **New**: `src/lib/keyword-research.functions.ts`, `src/lib/domain-analysis.functions.ts`, `src/lib/backlink-checker.functions.ts`, `src/lib/keyword-difficulty.functions.ts`, `src/lib/competitor-analysis.functions.ts`, `src/lib/page-seo-analyzer.functions.ts`
- **New**: `src/lib/semrush.server.ts` (shared gateway helper + CSV parser + rate limiter)
- **New**: 6 route files under `src/routes/tools.<slug>.tsx`
- **Edit**: `src/lib/tools.ts`, `src/lib/related-tools.ts`, `src/routes/index.tsx`, `src/routes/tools.index.tsx`, `public/sitemap.xml`, `public/llms.txt`

## Out of scope

- Hero animation revert (you parked it).
- KV/Durable-Object caching (in-memory rate limit is enough for now; DB caching can be a follow-up if quota pressure appears).
- Tier 2 tools (YouTube thumbnail, meta preview, etc.) — separate batch.
