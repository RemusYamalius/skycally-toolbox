## Problem

The AI Cover Letter Generator tool is broken because the build fails with a
Rollup `import-protection-plugin` error, and the tool page will not load in
production.

Root cause (verified):

- `src/routes/tools.ai-cover-letter-generator.tsx` imports the server
  function from `@/server/ai-cover-letter.functions`.
- The current TanStack Start template's import-protection plugin blocks the
  entire `src/server/` directory from client bundles. `.functions.ts` files
  imported by client code must live in a client-safe path such as `src/lib/`.
- Result: `bun run build:dev` fails inside
  `start-plugin-core/import-protection-plugin` (the stack trace matches),
  and the route cannot ship.

The server-function code itself (Zod validation, Lovable AI Gateway call,
error mapping to `RATE_LIMITED` / `CREDITS_EXHAUSTED` / `GENERATION_FAILED`)
is correct and does not need changes.

## Fix

Definitive, one-shot fix — no other files change:

1. Move `src/server/ai-cover-letter.functions.ts` to
   `src/lib/ai-cover-letter.functions.ts` (contents unchanged). This matches
   the plan of record (`.lovable/plan.md`) and the project's other
   client-imported server functions.
2. Update the single import in
   `src/routes/tools.ai-cover-letter-generator.tsx` from
   `@/server/ai-cover-letter.functions` to
   `@/lib/ai-cover-letter.functions`.
3. Delete the old file at `src/server/ai-cover-letter.functions.ts`.

## Verification

- Re-run the dev build; the import-protection error must be gone.
- Load `/tools/ai-cover-letter-generator`, submit a minimal valid form
  (name + job title + company), and confirm a letter is returned.
- Confirm error paths still surface friendly messages when the gateway
  returns 429 / 402 (unchanged code path).

## Out of scope

No UI redesign, no prompt changes, no changes to `tools.ts`,
`related-tools.ts`, or `sitemap.xml`. This is strictly the minimal fix that
makes the tool build and run.
