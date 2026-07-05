## AI Writing Assistant — Implementation Plan

Build a new tool at `/tools/ai-writing-assistant` combining Grammar Checker, Paraphraser, and Text Summarizer in a tabbed interface, matching the project's existing tool patterns.

### ⚠️ One deviation from the spec (security)

The spec says to call the Lovable AI gateway directly from the browser using `VITE_LOVABLE_API_KEY`. I will **not** do that. Reasons:

- `LOVABLE_API_KEY` is a workspace-billed secret that must stay server-side. Exposing it via `VITE_*` puts it in the client bundle where anyone can extract and drain project credits.
- The reference tool the spec points to (`tools.ai-cover-letter-generator.tsx`) does **not** use client-side fetch — it calls `generateCoverLetter` from `src/lib/ai-cover-letter.functions.ts`, a `createServerFn`. I'll follow that exact same pattern.

The spec's "no createServerFn / no useCallback(async)" rule was to avoid a specific Rollup build error. I'll still avoid `useCallback(async …)` at component level and use plain function declarations with `.then/.catch/.finally` on the client — that constraint stands. Only the transport changes to a server function.

If you want the insecure client-side fetch anyway, tell me and I'll switch it.

### Files to create

1. **`src/lib/ai-writing-assistant.functions.ts`** — one `createServerFn` (`runWritingAssistant`) with a Zod validator dispatching on `mode: "grammar" | "paraphrase" | "summarize"` plus per-mode options (paraphrase style; summary length & format). Reads `LOVABLE_API_KEY` inside `.handler()`, calls `google/gemini-3-flash-preview` (project default — spec's `gemini-2.0-flash-001` is not in the allowlist), maps 429/402/other to `RATE_LIMITED`/`CREDITS_EXHAUSTED`/`GENERATION_FAILED`.

2. **`src/routes/tools.ai-writing-assistant.tsx`** — the route/UI:
   - `Route` with `head: () => buildToolMeta(toolBySlug("ai-writing-assistant", tools))`
   - `ToolPageShell` → Tabs (Grammar / Paraphrase / Summarize) → per-tab input+output → `AdZone id="ai-writing-assistant-mid" size="728x90"` → `HowToUse` → `ToolSeoContent` → `RelatedTools`
   - Two-column desktop / single-column mobile
   - Char counters (5000 / 3000 / 8000), clear button, copy button, skeleton loader, `aria-live="polite"` output, fade-in via framer-motion
   - Paraphrase: 6 pill modes + regenerate + optional "Show comparison" toggle (naive word-diff between original and paraphrase, red strikethrough on removed / green highlight on added)
   - Summarize: length radio (short/medium/detailed, default medium) + style pills (paragraph/bullets/takeaways)
   - Handlers as plain `function submitGrammar() { … .then().catch().finally() }`, guarded by a `useRef<number>` 500ms debounce
   - Persist `{ activeTab, grammarInput, paraphraseInput, paraphraseMode, summarizeInput, summarizeLength, summarizeStyle }` to `localStorage["ai-writing-assistant-state"]`
   - Word-count comparison badge on paraphrase; "Reduced from X → Y (Z% shorter)" badge on summary; grammar output splits on `--- Changes ---` to render corrected text card + changes list

### Files to edit

3. **`src/lib/tools.ts`** — register the new tool (slug `ai-writing-assistant`, name "AI Writing Assistant", `PenLine` icon, path `/tools/ai-writing-assistant`, category matching existing AI tools, the SEO description from the spec).
4. **`src/lib/related-tools.ts`** — if it uses an explicit map, add related list: `ai-email-writer`, `ai-cover-letter-generator`, `ai-resume-builder`, `word-counter`, `word-processor`. Otherwise rely on category matching.
5. **`public/sitemap.xml`** — add the new URL.

`src/routeTree.gen.ts` regenerates automatically — I won't touch it.

### SEO

Use the spec's title, description, 4 SEO paragraphs, and 8 FAQs verbatim via `ToolSeoContent`. `SoftwareApplication` JSON-LD is emitted by `buildToolMeta` already. Canonical + og:url resolve to `https://skycally.com/tools/ai-writing-assistant` via `buildToolMeta`.

### Prompts

Grammar / paraphrase / summarize system prompts exactly as in the spec, including the "corrected text + blank line + `--- Changes ---` + bullet list" grammar format so the UI can split it.

### Non-goals

- No new npm packages.
- No changes to existing tools.
- No server route under `src/routes/api/` — server function is the right surface for this typed RPC.
