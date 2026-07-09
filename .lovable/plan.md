# AI Image Generator — Implementation Plan

A production-ready `/tools/ai-image-generator` route matching Skycally's tool conventions (`ToolPageShell` + `HowToUse` + `AdZone` + `ToolSeoContent` + `RelatedTools`), powered by Replicate's `black-forest-labs/flux-schnell` for generation and Lovable AI Gateway for prompt enhancement.

## 1. Backend — Server functions

**`src/lib/generate-image.functions.ts`** (client-safe path, per project conventions)

- `generateImage` — `createServerFn({ method: "POST" })` with a Zod validator for `{ prompt, negativePrompt?, aspectRatio, style?, quality }`.
- Calls the Replicate connector through the Lovable connector gateway (NOT `api.replicate.com` directly — per project's `replicate` guidance):
  - URL: `https://connector-gateway.lovable.dev/replicate/v1/models/black-forest-labs/flux-schnell/predictions`
  - Headers: `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${LOVABLE_CONNECTOR_REPLICATE_API_KEY}`
  - Body: `{ input: { prompt, negative_prompt, num_inference_steps (draft=2/standard=4/high=8), aspect_ratio, output_format:"webp", output_quality:90 } }` with `Prefer: wait` header for a synchronous response.
  - Falls back to a poll loop on `/v1/predictions/{id}` (3s→10s, 3 min cap) if the `Prefer: wait` response comes back non-terminal.
- Returns `{ imageUrl }`. Surfaces provider status + body via typed errors: `REPLICATE_NOT_CONFIGURED` (missing env), `RATE_LIMITED` (429), `GENERATION_FAILED` (anything else) — logged server-side.

**`src/lib/enhance-prompt.functions.ts`**

- `enhancePrompt` server fn — calls Lovable AI Gateway (`google/gemini-2.5-flash`, non-streaming `generateText`) with the "professional art prompt engineer" system prompt (from user spec). Returns `{ enhanced }`. This lives server-side so `LOVABLE_API_KEY` never leaks to the client (the user's original snippet used `VITE_LOVABLE_API_KEY` which is unsafe — we correct this).

**Note on Replicate connector**: the project already has `LOVABLE_CONNECTOR_REPLICATE_API_KEY` if the Replicate connector is linked. If not, `generateImage` returns `REPLICATE_NOT_CONFIGURED` and the UI shows a helpful "Image generation is being set up" state. I'll verify the connector status when we switch to build mode and link it via `standard_connectors--connect` if missing.

## 2. Route — `src/routes/tools.ai-image-generator.tsx`

Structure inside `<ToolPageShell title="AI Image Generator" description="..." showFileDisclaimer={false}>`:

1. **Prompt panel** — large glass-morphism textarea with focus glow, character counter, and 3 actions:
   - 🎲 Random (picks from a 50-entry `RANDOM_PROMPTS` array in a local const)
   - ✨ Enhance (calls `enhancePrompt`, stores original in a ref for undo, shows spinner on the button)
   - Generate (gradient cyan→violet, shimmer on hover, disabled while pending)
2. **Style preset pills** (15 presets from spec) — horizontal scroll on mobile, selected state = glowing border + checkmark.
3. **Advanced options** (collapsible) — aspect ratio button group (5 options with square/landscape/portrait icons), quality radio (draft/standard/high), negative prompt textarea.
4. **Generation area**:
   - Empty state: 3×2 inspiration gallery (6 curated examples with prompt + hover overlay; clicking fills the prompt). Uses picsum placeholders keyed by a stable seed.
   - Loading: animated gradient shimmer sized to the selected aspect ratio, `aria-live="polite"` "✨ Creating your image…" + indeterminate progress bar.
   - Result: image fades in (scale 0.95→1). Action row: Download (blob→ObjectURL→click), Copy prompt, Variations (regenerate with fresh nonce appended to prompt), and cross-tool links (Image Filters, Collage Maker, Add Watermark, Image Resizer).
5. **Session history strip** — last 8 generations in React state only (no localStorage, per privacy). Clicking a thumb restores it + its prompt.
6. **Cross-tool links section** (the block from the spec).
7. `<AdZone id="ai-image-generator-mid" size="728x90" />`
8. `<HowToUse steps={[…3 steps from spec]} />`
9. `<ToolSeoContent title description body={SEO_BODY} faqs={SEO_FAQS} />` (4 paragraphs + 8 FAQs, all from spec).
10. `<RelatedTools currentSlug="ai-image-generator" />`

Route `head()` sets title/description/canonical/og per project's `head-meta` rules, plus a `SoftwareApplication` JSON-LD (spec).

## 3. Tool registry & discovery

- **`src/lib/tools.ts`** — add the tool entry with `category: "ai"` and (per spec) an additional `categories: ["ai", "image"]` field. Confirm the existing `Tool` shape supports multi-category or extend `toolInCategory()` accordingly. Icon: `Sparkles`. Featured flag so it appears at the top of the Image tab too.
- **`src/lib/related-tools.ts`** — add curated relations (Image Filters, Image Resizer, Remove Background, Collage Maker, Add Watermark, Image Upscaler, Meme Generator, Business Card Generator).
- **`public/sitemap.xml`** and **`public/llms.txt`** — add the new URL.

## 4. UX polish details

- Dark navy hero backdrop with two blurred gradient orbs (cyan + violet), reuses the app's existing `--cyan-brand` / `--violet-brand` semantic tokens (no hardcoded hex).
- All Tailwind uses semantic tokens; no `bg-black`/`text-white`.
- English UI throughout (per project memory).
- Accessibility: labelled buttons, aria-live for status, alt text = full prompt, focus rings on all interactive elements, keyboard-scrollable pill row.
- Mobile-first: presets scroll horizontally; controls stack; history scrolls horizontally.

## 5. Error & rate handling

- Toast + inline error card mapping the three server error codes to the user-facing copy in the spec.
- Enhance failure: silent fallback to original prompt + subtle toast.
- Generate button disables during in-flight requests; second click cancels via `AbortController`.

## 6. Verification steps (build mode)

1. `standard_connectors--list_connections` → ensure Replicate is linked; if not, call `standard_connectors--connect` for `replicate`.
2. `bun run typecheck` (automatic).
3. Playwright smoke: load `/tools/ai-image-generator`, screenshot empty state, type a prompt, click Generate, verify image renders + Download works, screenshot final state.
4. Confirm `/tools?cat=ai` and `/tools?cat=image` both list the new card.

## Out of scope (per spec)

- No persistent history (session-only React state).
- No user accounts / no watermark / no limits.
- No commercial licence handling beyond the FAQ copy.

---

**Assumptions to confirm** (I'll proceed with these unless you say otherwise):
- Route via Lovable's Replicate **connector** (gateway), not raw `REPLICATE_API_TOKEN`, matching the project's connector guidance.
- Prompt enhance runs server-side via Lovable AI Gateway (not `VITE_LOVABLE_API_KEY` in the browser).
- The existing `tools.ts` schema can accept multi-category placement; if it can't, I'll extend `toolInCategory` minimally.