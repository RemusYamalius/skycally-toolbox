# Part 1 — Attachment Style Test (new tool)

New route at `/tools/attachment-style-test`, reusing the Big Five build pattern exactly (intro → Likert quiz → results).

## Files to create

- `src/lib/attachment/items.ts` — **28 original first-person items**: 14 Anxiety + 14 Avoidance, each dimension 7 positively-keyed and 7 reverse-keyed. Written from scratch to reflect the well-documented two-dimensional construct; no ECR / ECR-R / Relationship Questionnaire wording reused.
  - Ends with a **build-time sanity check block** mirroring `src/lib/big-five/items.ts`: an IIFE-style bare block that tallies items per dimension and per keying and `console.warn`s if either dimension is not exactly 14 items or not exactly 7 `+` / 7 `-`, plus a duplicate-`id` check. Any future edit that breaks the balance surfaces immediately in the console instead of silently skewing scores.
- `src/lib/attachment/scoring.ts` — reverse-score as `6 − response`, average per dimension, rescale `((avg − 1) / 4) × 100` to 0–100 (same math as `src/lib/big-five/scoring.ts`). Exports quadrant mapping (50 boundary on both axes), a `nearBoundary` flag when either score falls within 45–55, and non-pathologizing description text for each of the four regions plus per-dimension band copy.
- `src/routes/tools.attachment-style-test.tsx` — the route.

## Files to update

- `src/lib/tools.ts` — register the tool (same category as `big-five-personality-test`).
- `src/lib/related-tools.ts` — add `attachment-style-test` entry and add it into the `big-five-personality-test` list.
- `public/sitemap.xml`, `public/llms.txt` — add the URL/entry.

## Route behaviour

- **Intro screen**: what the test measures, item count, time estimate, explicit "no email, no signup, results shown immediately", and an up-front note that this is not clinical or diagnostic.
- **Quiz**: one item at a time with a 5-point Likert scale, progress bar, back button — mirroring Big Five's state machine.
- **Results**:
  - 2D quadrant scatter chart (custom SVG, same approach as other charts on the site): Avoidance on x, Anxiety on y, the four regions labeled faintly in the background, the user plotted as a marker.
  - "Closest style" label worded as the *nearest* of four descriptive regions, not a fixed type; when `nearBoundary` is true, an explicit "you're genuinely in between" note appears.
  - Two dimension cards (Anxiety, Avoidance), each 0–100 with plain-language description.
  - Copy-to-clipboard shareable summary (sonner toast, same as Big Five / Word Groups).
  - Retake button.
  - Honest-caveat block: self-report, relative not population-normed, not clinical, plus one gentle general line that a licensed therapist is a good resource for anyone wanting to explore relationship patterns — framed as general, never as follow-up to a "finding".
- **Contextual internal links** directly under the results, above AdZone: Big Five Personality Test, Fancy Text Generator, Meme Generator — all three confirmed present in the registry, all via `<Link to="...">`.

## SEO

- `head()` with an explicit `scripts` array containing JSON-LD `"@context": "https://schema.org"`, `"@type": "WebApplication"`, and a `featureList` matching what actually ships.
- Title/description target "attachment style quiz", "attachment style test", "secure anxious avoidant test", "free attachment quiz", and state "no email, no signup, complete results".
- `ToolSeoContent`: 4+ plain-prose paragraphs (the two-dimensional model; how items are written and scored here; what each of the four regions looks like in relationships, neutrally; how this differs from quiz-funnel competitors) and 8+ FAQs. Body strings stay plain prose — no JSX.
- Section order: contextual links → AdZone → HowToUse → ToolSeoContent → RelatedTools.

## Numbers check

The final item count is counted programmatically before any copy referencing it is written, and the same number is used in the title, meta description, JSON-LD, SEO body, and FAQs.

# Part 2 — Random Team Maker audit

Audit findings against the three spec edge cases (read from `src/routes/tools.random-team-maker.tsx`):

| Edge case | Status |
| --- | --- |
| Duplicate names allowed, no silent dedupe | **Already correct** — `addPlayer` appends unconditionally; nothing dedupes. |
| Fewer names than teams | **Already correct** — `canStart` gates on `teamCount <= players.length`, the button is disabled, and an inline warning renders above it. No crash path. |
| Auto-detect comma-separated vs line-separated paste | **Missing** — the only input is a single-name field committed on Enter or the Add button. |

## Patch (the missing case only)

In `src/routes/tools.random-team-maker.tsx`, extend the existing player input so it accepts a bulk list without changing anything else:

- Add a collapsible "Paste a list" textarea beside the existing single-name field.
- Parse with one splitter that auto-detects both formats: split on newlines *and* commas, trim each token, drop empty tokens, keep duplicates. Semicolons and tab-separated pastes handled by the same splitter.
- Also route pastes into the existing single-line input through the same splitter, so pasting `Ana, Karim, Sam` there adds three players rather than one player with a comma in their name.
- Appends to the current player list; the existing team-count guard and inline message keep working unchanged.

No rebuild, no change to the wheel, distribution logic, copy-to-clipboard, or SEO content of that tool.
