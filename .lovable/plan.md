## Big Five Personality Test — Implementation Plan

Build a shareable Big Five (OCEAN) personality quiz at `/tools/big-five-personality-test`, matching site conventions exactly and avoiding the four specific mistakes flagged.

### Files to create

**`src/lib/big-five/items.ts`** — IPIP-based item bank
- 50 items (10 per trait: O, C, E, A, N), roughly balanced positive/negative keying (5/5 per trait where possible).
- Each item: `{ id, text, trait: 'O'|'C'|'E'|'A'|'N', keyed: '+'|'−' }`.
- Sourced from the public-domain IPIP 50-item Big Five marker set (Goldberg).
- A commented verification block at the end listing counts per trait and per keying to make the mapping auditable at a glance (addresses mistake #4).

**`src/lib/big-five/scoring.ts`** — scoring + bands
- `scoreResponses(responses: Record<id, 1..5>): { O,C,E,A,N: { raw1to5, score0to100, band } }`.
- Reverse-scoring: for `keyed === '−'`, use `6 − response`. Unit test-ready pure function.
- 5 bands per trait: Very Low / Low / Moderate / High / Very High from the 0–100 score (cutoffs at 20/40/60/80).
- `BAND_DESCRIPTIONS[trait][band]` — real behavioral one-liners for all 25 combinations, neutral non-pathologizing language (Neuroticism framed as emotional reactivity/sensitivity vs. calm/steady).
- `TRAIT_META[trait]` — full name, short blurb, color token.

**`src/lib/big-five/share.ts`** — share text builder
- Mirrors `src/lib/word-groups/share.ts` shape.
- Produces text like: `Big Five Personality — Skycally\nO 72 · C 58 · E 41 · A 80 · N 33\n<url>`.

**`src/routes/tools.big-five-personality-test.tsx`** — main page
- `createFileRoute("/tools/big-five-personality-test")` with `head()` returning `buildToolMeta(tool)` **spread** plus a `scripts` array containing a `WebApplication` JSON-LD block with `featureList` (addresses mistake #1 — verified present, not just described).
- Screen state machine: `intro → quiz → results`.
- Quiz screen: single scrollable page of all 50 items in **shuffled** order (deterministic seed per session to hide per-trait grouping and reduce bias); 5-point Likert radio row per item; disabled Submit until all answered; progress indicator (`answered / 50`).
- Results screen:
  - Horizontal bar chart of the 5 trait scores (0–100) using existing `recharts` (already in project via other tools).
  - Per-trait cards with band label + description.
  - **Contextual internal-links section placed HERE, immediately after the results cards and before `AdZone`/`HowToUse`/`ToolSeoContent`** (addresses mistake #2): links to Fancy Text Generator, Word Groups, Meme Generator using real `<Link to=...>` with contextual framing.
  - Share button (copy to clipboard, `sonner` toast) + Retake button.
  - Honest caveat block: self-report screening tool, not clinical/diagnostic, "relative score not a population percentile," reflects this day's answers.
- Then `AdZone` → `HowToUse` (3 steps) → `ToolSeoContent` → `RelatedTools`.
- `ToolSeoContent.body`: **4 plain-string paragraphs, no JSX/HTML tags inside** (addresses mistake #3) — covers Big Five vs. MBTI, IPIP + reverse-scoring + 0–100 relative scaling, plain-language trait meanings, and differentiators (free complete results, no signup, no paywall).
- 8 FAQs as listed in the brief.

### Files to edit

- **`src/lib/tools.ts`** — register slug `big-five-personality-test`, category `utility` (matches other quiz-ish tools), icon `Brain` or `UserCircle` from lucide, description mentioning "free, complete results, no signup."
- **`src/lib/related-tools.ts`** — add cross-links between big-five and: fancy-text-generator, word-groups, meme-generator.
- **`public/sitemap.xml`** — add `<url>` entry.
- **`public/llms.txt`** — add entry under the appropriate category.

### Verification checklist before declaring done

1. `head()` returns `{ ...buildToolMeta(tool), scripts: [{ type: "application/ld+json", children: JSON.stringify({...}) }] }` — JSON-LD literally present.
2. Internal links section renders **above** `AdZone` / `HowToUse` / `ToolSeoContent`, not below.
3. `ToolSeoContent` body paragraphs are all plain strings — no `<Link>`, no HTML.
4. Item bank counts: exactly 10 per trait, balanced keying; every `keyed: '−'` item is genuinely reverse-worded (e.g., "I don't like to draw attention to myself" for E−).
5. `tsgo` typecheck clean.

### Copy tone notes

- Never say MBTI, INTJ, "16 personalities," "type."
- Never say clinical / diagnostic / medical.
- Neuroticism band descriptions use "sensitive to stress / emotionally reactive" vs "calm / emotionally steady" — no pathologizing.
- Position the Big Five vs. MBTI point as scientific context, not a competitor callout.
