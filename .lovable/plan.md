## Add Compound Interest Calculator tool

### Files

1. **Edit `src/lib/tools.ts`** — add `compound-interest` entry to the tools array, placed after the `loan-calculator` entry. Use the `Calculator` icon (ensure import is present; reuse if already imported, otherwise add to the `lucide-react` import).

2. **Create `src/routes/tools.compound-interest.tsx`** — paste the provided component code verbatim. It uses existing primitives (`ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`, `Input`, `Slider`, `buildToolMeta`, `toolBySlug`) and `recharts` (already used by the loan calculator, so no new deps).

3. **Edit `src/lib/related-tools.ts`** — add a mapping for `compound-interest` pointing to related finance tools (e.g., `loan-calculator`, `emi-calculator`, `mortgage-calculator`, `tip-calculator`) so `<RelatedTools currentSlug="compound-interest" />` renders meaningful links, matching the pattern used by the other calculators.

4. **No manual route registration** — TanStack Router's file-based routing auto-picks up the new file via `routeTree.gen.ts` on dev server reload. No edits to `__root.tsx`.

### Verification

- Confirm dev server compiles and `/tools/compound-interest` renders with inputs, chart, table, SEO content, and related tools.
