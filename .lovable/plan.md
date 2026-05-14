# Fix mobile rendering tearing on Skycally

## Root cause

The horizontal colored tearing in your screenshot is a GPU compositing bug on mobile (most often seen on Samsung Internet / Chromium on Android). It happens when too many heavy compositing layers stack and animate at the same time — and Skycally currently triggers all of the worst-offenders together on the homepage:

1. A sticky header with `backdrop-blur-xl` (a full-viewport blurred layer that re-rasterizes on every scroll frame).
2. Two large `blur-3xl` decorative blobs in the hero with the `animate-float` keyframe (each is a huge GPU layer constantly transforming).
3. Every `ToolCard` uses framer-motion `whileInView` with stagger + `hover:-translate-y-1` + a glow shadow layer — dozens of compositing layers materialising as the user scrolls.
4. Search input/results and quick-access pills all use `backdrop-blur-xl` / `backdrop-blur` stacked over the hero blur.

On desktop the GPU absorbs this; on mobile the tile cache overflows and you get the colored line tearing between sections.

## What I'll change (CSS + a small amount of JSX, no design or layout changes)

### 1. `src/styles.css` — add a mobile-safe compositing layer

Add at the bottom (no token changes):

- A utility `.gpu-isolate` → `transform: translateZ(0); -webkit-transform: translateZ(0); -webkit-backface-visibility: hidden; backface-visibility: hidden; isolation: isolate;` for sections that own animations.
- `.contain-paint` → `contain: layout paint;` for the tools grid wrapper.
- A `@media (max-width: 768px)` block that:
  - Disables `.animate-float` (`animation: none`) so the two giant blurred blobs stop re-rastering.
  - Tones down `.bg-hero` extra blur layers / removes one of the radial gradients on mobile (visual is preserved — gradient still present).
  - Forces `backdrop-filter: none` on the sticky header and replaces it with a slightly more opaque solid `bg-background/90` fallback (kept identical-looking on mobile, just no real-time blur).
  - Adds `touch-action: pan-y` to `html, body`.
- Remove the `mask-image` on `.grid-overlay` on mobile (mask + transform = known Android tearing trigger) — fall back to a softer opacity.

### 2. `src/components/site-header.tsx`

- Replace `backdrop-blur-xl bg-background/70` with classes `bg-background/70 backdrop-blur-xl md:backdrop-blur-xl` and add the `gpu-isolate` class. The mobile `@media` rule above strips the actual backdrop-filter so the header stops creating a full-viewport compositing layer on phones. No visual change on desktop.

### 3. `src/routes/index.tsx`

- Add `gpu-isolate` to the hero `<section>` and to the "Browse All Tools" `<section>`.
- Add `contain-paint` to the tools grid wrapper (`<div className="grid ...">`).
- Add `overflow-hidden` to the tools section wrapper to prevent the cards' hover translate from bleeding into compositing of the next section.
- Keep all existing classes — only additive.

### 4. `src/components/tool-card.tsx`

- Keep the design and the entrance animation, but make it mobile-friendly:
  - Wrap the `whileInView` motion props in a check: on mobile (`useIsMobile()` already exists in `src/hooks/use-mobile.tsx`) skip the `initial`/`whileInView`/`transition` so cards render statically. This eliminates dozens of simultaneous compositing layers during scroll, which is the actual source of the tearing strip visible in the screenshot between the "Compression PDF" and "PDF vers images" cards.
  - Remove the always-mounted glow `<div>` overlay on mobile (kept on desktop via `hidden md:block`). It's an extra always-painted layer per card.
  - Add `transform: translateZ(0)` only to the `<Link>` element (the actually-animated thing), not the wrapper.

### 5. `src/routes/__root.tsx`

- Viewport meta is already correct (`width=device-width, initial-scale=1`) — no change needed.
- No other changes.

## Out of scope

- No redesign, no color/typography/layout changes.
- No removal of any animation on desktop.
- No changes to tool pages, Document Scanner, or any business logic.
- No changes to the build/router setup.

## Verification

After the change I will:

1. Open the preview at 390×844 and 375×812 via the browser tool, scroll the homepage, and confirm no tearing strip appears between cards.
2. Confirm desktop (1347×823, current viewport) is visually unchanged.
3. Confirm no horizontal overflow at 375px.
