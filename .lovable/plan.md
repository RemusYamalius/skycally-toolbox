## AI Cover Letter Generator

Build `/tools/ai-cover-letter-generator` — a client form that collects job/applicant info, calls Lovable AI Gateway via a TanStack server function, and renders a streamed/returned cover letter with copy + download (TXT + PDF) actions.

### Files

**Create** `src/lib/ai-cover-letter.functions.ts` — `createServerFn` `generateCoverLetter` using `@/lib/ai-gateway.server` (Lovable AI) with `google/gemini-3-flash-preview`, Zod input validation, returns `{ letter: string }`. Reads `LOVABLE_API_KEY` inside `.handler()`. Surfaces 429 / 402 gateway errors as typed errors the UI can map to friendly messages.

**Create** `src/routes/tools.ai-cover-letter-generator.tsx`
- `createFileRoute("/tools/ai-cover-letter-generator")` + `buildToolMeta`
- `<ToolPageShell>` → form + output card → `<AdZone id="ai-cover-letter-generator-mid" size="728x90" />` → `<HowToUse>` → `<ToolSeoContent>` → `<RelatedTools currentSlug="ai-cover-letter-generator" />`
- All UI, debouncing, copy/download logic inline; English-only copy per project memory

**Edit** `src/lib/tools.ts` — register tool. **Deviation:** project has no `career` category; will use `ai` category (matches the AI Tools section, violet brand color) and add an icon (`FileSignature`). Documenting because user spec said "Career".

**Edit** `src/lib/related-tools.ts` — add entry for `ai-cover-letter-generator` linking to existing tools: `word-processor`, `pdf-text-extractor`, `word-to-pdf`, `markdown-to-html`, `word-counter` (closest "career/resume" adjacents — there is no `ai-resume-builder` route in the project).

**Edit** `public/sitemap.xml` — add the new route.

**Edit** `src/start.ts` only if the existing bearer-attaching middleware is missing; the server function is **public** (no `requireSupabaseAuth`) so no auth middleware is required.

### Form fields (left column on desktop, stacked on mobile)

- Your full name (required)
- Job title (required)
- Company name (required)
- Hiring manager name (optional)
- Years of experience (number)
- Key skills (textarea, comma-separated)
- Notable achievements (textarea, optional)
- Tone select: Professional / Friendly / Enthusiastic / Formal
- Length select: Short (~150w) / Medium (~250w) / Long (~400w)
- Language select: English (default), Spanish, French, German, Arabic
- Optional job description (textarea, used as extra context)

### Server function

```ts
generateCoverLetter({ data: CoverLetterInput }) -> { letter: string }
```

- Zod schema validates lengths, required fields, enum values
- Builds system prompt: "You are a professional career writer. Produce a complete, ready-to-send cover letter…"
- User prompt assembles the structured fields
- Uses `generateText` (non-stream) for simplicity; returns `{ letter: text.trim() }`
- On gateway 429 → throw `Error("RATE_LIMITED")`; on 402 → `Error("CREDITS_EXHAUSTED")`; other → `Error("GENERATION_FAILED")`

### UI behavior

- Submit button: "Generate cover letter" → disabled while `status === "loading"`, shows spinner
- Error states mapped to friendly toasts/inline messages:
  - RATE_LIMITED → "Too many requests — please wait a moment and try again."
  - CREDITS_EXHAUSTED → "AI credits exhausted — please try again later."
  - default → "Something went wrong — please try again."
- Output card: `aria-live="polite"`, preserves whitespace, shows skeleton while loading
- Actions row (wraps on mobile via `flex-wrap gap-2`): **Copy**, **Download .txt**, **Download .pdf** (uses `jspdf` already present in project), **Regenerate**
- **Regenerate** debounced 500ms via `useRef` timestamp guard (rejects clicks <500ms apart)
- Form state persisted to `localStorage` key `ai-cover-letter-inputs`

### Accessibility

- All inputs labeled with `<Label htmlFor>`
- Output region `<section aria-live="polite" aria-busy={isLoading}>`
- Buttons keyboard reachable, focus-visible rings
- Error alert uses `role="alert"`
- Mobile: form column stacks, action buttons wrap, min 44px tap targets

### Performance / quality

- TypeScript strict, no `any` (use Zod-inferred types, `unknown` in catches)
- `useMemo` for derived prompt preview if needed; otherwise simple state
- No external AI libraries beyond AI SDK (already convention)

### SEO content

- `HowToUse`: 3 steps (fill details → pick tone/length → generate & download)
- `ToolSeoContent` body: 2–3 paragraphs on how AI cover letters work, when to personalize, ATS tips. Plus 4 FAQs (Is it free? Is my data stored? How accurate is it? Can I edit the result?)
- Internal links inside SEO body to existing tools: `/tools/word-processor`, `/tools/word-to-pdf`, `/tools/pdf-text-extractor` (deviation: spec mentioned `/tools/ai-resume-builder`, `/tools/calorie-calculator`, `/tools/sleep-calculator` — only the last two exist as real routes; will link `calorie-calculator` and `sleep-calculator` where contextually reasonable, and replace the non-existent `ai-resume-builder` link with `word-processor` to avoid 404s)

### Acceptance

- Form validates required fields client-side and via Zod on server
- Submit disables form + shows spinner; success renders letter in output card
- Copy / Download .txt / Download .pdf all work
- Regenerate ignored if pressed twice within 500ms
- Errors show friendly inline message (no raw error strings)
- Mobile: no horizontal scroll, buttons wrap, inputs full width
- Registered in tools.ts (category `ai`), `related-tools.ts`, `sitemap.xml`
- Breadcrumb provided by ToolPageShell

### Note on spec deviations

- **Category**: spec says "Career" but project has no career category; using `ai` (matches existing AI Tools section and violet brand) — same approach taken for the Heart Rate Calculator (no fitness category → utility).
- **Internal links**: `/tools/ai-resume-builder` does not exist; substituting `/tools/word-processor` plus the requested `/tools/calorie-calculator` and `/tools/sleep-calculator` where contextually relevant.
- **Streaming**: using non-streamed `generateText` for a single returned letter — simpler and matches existing one-shot tools; can be upgraded to `streamText` later if requested.
