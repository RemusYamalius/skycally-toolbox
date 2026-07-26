# Would You Rather Generator — Build Plan

New client-side party-game tool at `/tools/would-you-rather`, matching Truth or Dare / Role Spinner conventions.

## Files to create

- `src/lib/would-you-rather/questions.ts` — ~160-180 hand-authored `{ a, b, category }` pairs across 8 categories (Funny, Deep, Gross, Hard Choices, Kids-Friendly, Couples, Work, Fantasy), ~20-25 each. Original content.
- `src/routes/tools.would-you-rather.tsx` — the route.

## Files to update

- `src/lib/tools.ts` — register tool (Party Games / same category as Truth or Dare).
- `src/lib/related-tools.ts` — add entry (relate to Truth or Dare, Role Spinner, Random Team Maker, Spinning Wheel, Dice Roller, Hangman).
- `public/sitemap.xml`, `public/llms.txt` — add URL/entry.

## Route behavior

- Category chip row (All + 8 categories) filters the pool.
- Big two-card layout: **Option A** / big "OR" divider / **Option B**, large tap targets, mobile-first.
- Primary "Next question" button; avoids immediate repeat within session (track last N shown).
- Per-card vote buttons ("I'd pick this") — increment a session-local tally stored in `useState`. Displayed as `A: 4 · B: 2` and a percentage bar **explicitly labeled "Your session votes"** — never implied as global.
- "Add your own" collapsible: two inputs (A / B) + category select → prepends into session pool, tagged `Custom`, mixed into rotation.
- Reset session votes button.

## Contextual internal links

Placed **directly under the question card**, above `AdZone` / `HowToUse` / `ToolSeoContent`:
- Link to Truth or Dare, Role Spinner, Random Team Maker via `<Link to=…>`.

## Structure (order)

`ToolPageShell` →
  question card + category chips + vote/next controls →
  custom-question adder →
  contextual internal links row →
  `AdZone id="would-you-rather-mid" size="728x90"` →
  `HowToUse` →
  `ToolSeoContent` (4+ prose paragraphs, plain strings; 8 FAQs) →
  `RelatedTools`.

## SEO

- `head()` uses `buildToolMeta` + explicit `scripts` array with JSON-LD `@type: "WebApplication"`, `applicationCategory: "GameApplication"`, `featureList` (unlimited free questions, 8 categories, custom questions, no signup, mobile-friendly, session vote tally).
- Meta title: "Would You Rather Generator — 150+ Free Questions, No Signup | Skycally".
- Description targets "would you rather questions / generator / game online".

## Verification checklist (applied before finishing)

1. JSON-LD `scripts` array present in `head()`.
2. Internal links near results, above AdZone/HowToUse.
3. `ToolSeoContent` body strings only — no JSX.
4. Order: HowToUse → ToolSeoContent → RelatedTools.
5. Only reference tools that exist (Truth or Dare, Role Spinner, Random Team Maker — all confirmed in codebase).
6. Vote % is labeled session-local; no fake global stats.
7. `<Link to=…>` for all internal nav, no `<a href>`.
8. English-only copy (per project memory).