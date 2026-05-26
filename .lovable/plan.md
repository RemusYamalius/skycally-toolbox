## Homepage performance + UX redesign

### Change 1 — Remove framer-motion from the hero (`src/routes/index.tsx`)
- Drop `import { motion } from "framer-motion"` (keep the import only if "How it works" still uses it — it does, so keep it).
- Replace the 3 hero `motion.div` wrappers (badge+headline, search bar, quick-access pills) with plain `<div>` using CSS classes:
  - badge+headline: `class="hero-fade-up"`
  - search bar: `class="hero-fade-up-delay"`
  - quick-access pills: `class="hero-fade-up-delay2"`
- Keep `motion.div` only in the "How it works" steps (already below the fold with `viewport={{ once: true }}`).

Add to `src/styles.css` (project uses `styles.css`, not `index.css`):
```css
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-fade-up        { animation: heroFadeUp 0.55s ease both; }
.hero-fade-up-delay  { animation: heroFadeUp 0.55s 0.12s ease both; }
.hero-fade-up-delay2 { animation: heroFadeUp 0.55s 0.25s ease both; }
```

### Change 2 — Defer Sonner Toaster (`src/routes/__root.tsx`)
- `Toaster` is already `lazy()`-imported. Convert `RootComponent` to a stateful component:
  - `const [toasterReady, setToasterReady] = useState(false)`
  - `useEffect`: `setTimeout(() => setToasterReady(true), 1500)`, cleared on unmount.
  - Render `{toasterReady && <Suspense fallback={null}><Toaster position="top-center" richColors /></Suspense>}`.
- Add `useState`, `useEffect` to existing React import.

### Change 3 — Lazy-load below-the-fold categories (`src/routes/index.tsx`)
- Add `useState`, `useEffect`, `useRef` to existing react import.
- Inside `HomePage()`:
  - `const [visibleCats, setVisibleCats] = useState(2)`
  - `const loaderRef = useRef<HTMLDivElement>(null)`
  - `useEffect` (deps `[visibleCats]`): if `visibleCats >= 6` return; create `IntersectionObserver` with `rootMargin: "300px"` that bumps `visibleCats` by 2 (capped at 6); observe `loaderRef.current`; disconnect on cleanup.
- In the categories map, change `(["video", …]).map(...)` to `.slice(0, visibleCats).map(...)`.
- Render `<div ref={loaderRef} className="h-10" />` immediately after the categories `space-y-14` wrapper closes, only when `visibleCats < 6`.

### Change 4 — Hero copy + "Most Popular" strip (`src/routes/index.tsx`)
- Replace hero paragraph text with: `50+ free browser-based tools. No signup, no uploads, no limits.`
- Add a "Most Popular" section between the hero `</section>` and the top AdZone, inside the `max-w-7xl` wrapper. Render a horizontal grid of 6 featured tools by slug:
  - `compress-pdf`, `remove-bg`, `image-converter`, `qr-generator`, `video-to-gif`, `word-to-pdf`
  - For each, find via `tools.find(x => x.slug === slug)`, get `categoryMeta[t.category]`, render a `<Link to={t.path}>` card showing the tool icon (tinted with the category color) and tool name. Use the existing card styling vocabulary (`rounded-2xl border border-border bg-card` + small padding, hover translate/shadow consistent with `ToolCard`).
  - Grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3` so it fits on mobile and desktop.
  - Section heading: `<h2 class="font-display text-xl font-semibold mb-4">Most Popular</h2>` with `pt-10`.
- Keep all existing AdZones, "Browse All Tools", "How it works" sections in place and unchanged.

### Change 5 — Confirmation only
- "How it works" `motion.div`s already use `viewport={{ once: true }}` — leave untouched.

### Out of scope
- No changes to routing, `ToolCard`, `categoryMeta`, `tools` data, SEO meta, sitemap, footer, or any tool route.
- `Toaster` API surface unchanged.
