## Goal

A new interactive tool at `/tools/never-have-i-ever` that feels like the same family as Truth or Dare: category chips, animated card reveal, no-repeat shuffle, persistent custom statements — not a static listicle.

## Verified before planning

- `most-likely-to` does **not** exist on the site → the contextual link block will only link **Truth or Dare** and **Would You Rather**.
- `related-tools.ts` currently has a `would-you-rather` key but **no** `truth-or-dare` key (it falls back), so a `truth-or-dare` entry will be added alongside the new `never-have-i-ever` key.
- Registry shape confirmed from `attachment-style-test` / `truth-or-dare` entries (`slug`, `name`, `description`, `category`, `icon`, `path`, `featureList`, `schemaCategory`) plus optional `dateAdded` used by the "New" badge helper.
- Sitemap entry format confirmed (`<loc>/<lastmod>/<changefreq>/<priority>`), llms.txt one-line bullet format confirmed.

## Content bank

New file `src/lib/never-have-i-ever/statements.ts`:

- 7 categories: `funny`, `embarrassing`, `travel`, `food`, `dating`, `school-work`, `bold`.
- **160 original statements** authored from scratch (roughly 25 funny, 25 embarrassing, 22 travel, 22 food, 24 dating, 22 school/work, 20 bold). Every item safe-for-work and tasteful, including Bold (Bold = daring/confessional, never explicit).
- Exported `NHIE_STATEMENTS` (array of `{ text, category }`) and a `CATEGORIES` label/color list.
- Build-time `console.warn` sanity check (mirroring `src/lib/big-five/items.ts`): warns on duplicate text and reports the per-category tally.
- After writing the file, the count is verified programmatically (`rg`/node count) and the exact final number is what gets used in the title, meta description, JSON-LD featureList, `tools.ts` description/featureList, ToolSeoContent body, and FAQs. If the authored total differs from 160, every copy location uses the real number instead.

## Route: `src/routes/tools.never-have-i-ever.tsx`

Structure copied from `tools.truth-or-dare.tsx`:

- Hand-written `head()` with `buildPageMeta` + a `SoftwareApplication` JSON-LD `scripts` array (same shape as Truth or Dare), since keyword-specific title/description is needed.
  - Title: `Never Have I Ever Online — Free Generator with Custom Questions | Skycally`
  - Description leads with "Play Never Have I Ever online free" and includes "custom never have i ever questions" naturally, plus the verified count.
  - `alternateName`: ["Never Have I Ever Online", "Never Have I Ever Generator Online", "Custom Never Have I Ever Questions"].
- Component wrapped in `ToolPageShell` (`showFileDisclaimer={false}`).

Interactive behavior (all real, all implemented):

1. **Multi-select category chips**, all on by default; clicking the last active chip is blocked so at least one stays selected (same guard style as Truth or Dare's mode toggle).
2. **Card reveal** using the existing `framer-motion` `AnimatePresence` + `motion.div` opacity/scale transition already used by Truth or Dare's result card. No new animation lib.
3. **No-repeat-until-exhausted shuffle**: a `seen` Set of statement indices for the active pool; when the pool is exhausted it resets. Changing category selection (or toggling custom-only) resets `seen`.
4. **Session counter**: honest local "Statements shown this session: N", reset with a small "Reset session" action.
5. **Custom mode**: collapsible "Customize questions" section (`Collapsible` + `Switch` + `Input` + `Plus`/`Trash2`, same components as Truth or Dare) — add statements, delete individually, "Use custom only" toggle. Custom statements persist in `localStorage` under `skycally:nhie:custom` (read in a `useEffect` after mount to avoid SSR/hydration mismatch, written on change).

Section order (exactly as specified):

1. Category chips + generator card (Next Question button)
2. Contextual internal links (`<Link to="/tools/truth-or-dare">`, `<Link to="/tools/would-you-rather">`) — TanStack `Link`, never `<a href>`
3. `<AdZone id="never-have-i-ever-bottom" size="728x90" />`
4. Collapsible "Customize questions"
5. `HowToUse` (3 steps)
6. `ToolSeoContent` — 4 plain-prose paragraphs (what the game is / how this generator works vs. a static listicle / group settings incl. family-friendly category picks / privacy: custom list stays in the browser) and **9 FAQs** weighted to the long-tail phrasing, no JSX in `body`, no manually duplicated FAQPage schema
7. `RelatedTools currentSlug="never-have-i-ever"` — last

## Registration

- `src/lib/tools.ts`: new entry after `would-you-rather` — `category: "games"`, an existing lucide icon already imported in that file (`Sparkles`-style; will reuse one already present rather than adding a new import if available, otherwise add a single icon import), `dateAdded: "2026-07-28"`, `schemaCategory: "UtilitiesApplication"`, and a `featureList` listing only shipped features: verified statement count across 7 categories, multi-select category filters, no-repeat shuffle, custom statements saved in the browser, session counter, no signup.
- `src/lib/related-tools.ts`: add `never-have-i-ever` key (truth-or-dare, would-you-rather, spinning-wheel, dice-roller, random-team-maker, role-spinner); add `never-have-i-ever` into `would-you-rather`'s list and add a new `truth-or-dare` key that includes it.
- `public/sitemap.xml`: new `<url>` block, `lastmod 2026-07-28`, priority 0.8.
- `public/llms.txt`: one bullet matching the Attachment Style Test format.

## Verification before finishing

- Programmatic count of the statement bank; grep the route/tools.ts/llms.txt for the number to confirm consistency.
- `rg '<a href' ` on the new route → must be empty.
- Typecheck, then load `/tools/never-have-i-ever` in headless Chromium: chip toggle, several Next Question reveals, custom add/remove, custom-only toggle, and a reload to confirm localStorage persistence; check console for errors.
- No new package installs.
