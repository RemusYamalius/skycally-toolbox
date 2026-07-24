# AI Bio Generator — `/tools/ai-bio-generator`

Personal/social bio generator (Instagram, TikTok, X, LinkedIn About, Dating), distinct from the professional AI writing tools. Follows the exact conventions of the existing AI writing tools on the site.

## Files to create

1. **`src/lib/ai-bio-generator.functions.ts`** — TanStack `createServerFn` mirroring `ai-email-writer.functions.ts` exactly (same fetch to `https://ai.gateway.lovable.dev/v1/chat/completions`, same key handling, same 429/402/GENERATION_FAILED errors, same `google/gemini-2.5-flash` model). Input schema: `platform` (`instagram` | `tiktok` | `twitter` | `linkedin` | `dating`), `name` (opt), `role`, `interests`, `tone` (`funny` | `professional` | `minimalist` | `aesthetic` | `bold`), `emojiDensity` (`none` | `light` | `heavy`), `variations` (3–5). Returns `{ bios: string[] }`. Prompt instructs the model to:
   - Produce exactly N variations separated by a stable delimiter (e.g. `---`) so we can split reliably.
   - Respect platform-specific structural convention (IG: short lines each led by an emoji; X: single line, `·`/`|` separators; LinkedIn: first-person paragraph; TikTok: 2–3 punchy lines; Dating: conversational, end with a hook question).
   - Stay under the platform character limit (IG 150, TikTok 80, X 160, LinkedIn 2600, Dating 500) — counted as UTF-16 code units.
   - Use the exact `role`/`interests` specifics, not generic filler.
   Parse response by splitting on the delimiter, trimming, filtering empties, clamping to requested count.

2. **`src/routes/tools.ai-bio-generator.tsx`** — Route mirroring `tools.ai-email-writer.tsx` structure:
   - Form: platform select (with visible limit + structural convention hint per platform), name/handle input, role textarea, interests textarea, tone select, emoji density select, variation count (3/4/5), Generate button, Regenerate button after first result.
   - Results list: each variation in a card with copy button, character counter `X / LIMIT` using `platformLength` from `@/lib/fancy-text/styles` (UTF-16-aware, already solves lesson 6), red badge when over limit.
   - Loading / error states matching email writer.
   - **Contextual internal links block placed immediately after the results list**, before AdZone/HowToUse: Fancy Text Generator (required framing: "style your new bio with decorative Unicode text before you post"), AI Writing Assistant ("polish or grammar-check"), Word Counter ("double-check length for platforms not listed here"). All via `<Link to="...">` from `@tanstack/react-router`.
   - Section order after results + internal links: `AdZone` → `HowToUse` → `ToolSeoContent` → `RelatedTools` (matches lesson 4; every other AI writing tool uses this order).
   - `ToolSeoContent` `body` is 4 plain-string paragraphs (no JSX/Link inside — lesson 3); 8 FAQs as listed in spec.
   - `head`: `buildToolMeta(toolBySlug("ai-bio-generator", tools))` — `buildToolMeta` already emits the `WebApplication` JSON-LD schema (lesson 1 satisfied via the shared helper, same as every other tool).

3. **Registrations:**
   - `src/lib/tools.ts` — add `ai-bio-generator` entry in the AI category with icon (e.g. `Sparkles` or `UserRound`), path `/tools/ai-bio-generator`, description targeting keywords "AI bio generator, Instagram bio generator, TikTok bio generator, dating profile bio — free, no signup, no credit limits".
   - `src/lib/related-tools.ts` — link to/from Fancy Text Generator, AI Writing Assistant, AI Email Writer, Word Counter.
   - `public/sitemap.xml` — add URL entry.
   - `public/llms.txt` — add tool description line.

## Lessons applied (verification checklist before finishing)

1. JSON-LD schema present via `buildToolMeta` (same helper as all sibling tools). ✓
2. Internal links rendered directly under results, above AdZone/HowToUse/ToolSeoContent. ✓
3. `ToolSeoContent.body` = 4 plain strings, no embedded JSX/Link. ✓
4. Order: results → internal links → AdZone → HowToUse → ToolSeoContent → RelatedTools. ✓
5. Reuse the exact `fetch` + gateway pattern from `ai-email-writer.functions.ts`. No new integration. ✓
6. Character counting uses existing `platformLength` (UTF-16 code units) from `src/lib/fancy-text/styles.ts`. ✓

## Non-goals

No signup, no rate limiting, no credit UI. No new dependencies.
