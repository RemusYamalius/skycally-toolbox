# Mobile PageSpeed improvements (target 82+)

All five fixes applied without changing UI, styles, or tool logic.

## 1. Logo resize + fetchpriority (highest impact, ~70 KiB)

- Re-encode `public/logo.webp` from 1920×333 down to **400×70** (2× retina) at quality 85 using `cwebp` (via `nix run nixpkgs#libwebp`). New file replaces the old at the same path.
- `src/components/site-header.tsx`: change `<img>` to `width="200" height="35"` and add `fetchpriority="high"` + `loading="eager"`. Keep inline style intact so visual size is unchanged.
- `src/components/site-footer.tsx`: update `width`/`height` attributes to match the new intrinsic ratio (200×35 displayed). Add `loading="lazy"` (footer is below the fold).

## 2. Defer non-critical CSS (~160 ms)

The single Vite-bundled stylesheet (`styles.css`) is the only render-blocking sheet. In `src/routes/__root.tsx`:

- Replace `{ rel: "stylesheet", href: appCss }` with `{ rel: "preload", as: "style", href: appCss, onload: "this.onload=null;this.rel='stylesheet'" }`.
- Keep the existing `<noscript><link rel="stylesheet" href={FONTS_HREF} /></noscript>` block and add a second `<noscript><link rel="stylesheet" href={appCss} /></noscript>` for crawlers/no-JS users.

Note: true "inline critical CSS" extraction requires a build-time tool (Critters/Beasties) that isn't wired into this project. The `preload + onload` swap covers the same Lighthouse audit ("Eliminate render-blocking resources") without introducing a new build step or risking FOUC mismatches in SSR. Flagging this trade-off because the original request mentioned inlining critical CSS — happy to add Beasties as a follow-up if the score still falls short.

## 3. Defer Google Tag Manager (~62 KiB)

In `src/routes/__root.tsx` `scripts` array:

- Remove the two GTM-related entries (the `gtag/js` external script and the inline `dataLayer` init).
- Add a single inline script that registers a `load` listener which injects the GTM `<script src="…gtag/js?id=G-WHRM5Z08KR">` tag and runs the `gtag('js', new Date()); gtag('config', 'G-WHRM5Z08KR');` snippet after the page is interactive.

GA still records the session because gtag fires on `load`, before the user typically interacts.

## 4. Lazy-load `ToolCard` JS (~22 KiB)

- Convert `ToolCard` import in `src/routes/index.tsx` to `React.lazy(() => import("@/components/tool-card").then(m => ({ default: m.ToolCard })))`.
- Wrap the category grid in a small `<LazyVisible>` wrapper component (new file `src/components/lazy-visible.tsx`) that uses `IntersectionObserver` with `rootMargin: "200px"` and only renders `children` once the grid container is near the viewport. Until then, render a same-size placeholder div (min-height matched to one row) so layout is preserved (no CLS).
- Inside the lazy region, wrap the `ToolCard` rendering in `<Suspense fallback={null}>`.
- `src/routes/tools.index.tsx` continues to import `ToolCard` directly (entire page is the grid, so lazy-loading there adds no value).

## 5. Cache headers for static assets

Cloudflare Workers (TanStack Start) serves `public/` via the assets binding, which honors a Cloudflare `_headers` file. Create `public/_headers`:

```text
/logo.webp
  Cache-Control: public, max-age=31536000, immutable

/favicon.png
  Cache-Control: public, max-age=31536000, immutable

/apple-touch-icon.png
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Vite already content-hashes everything under `/assets/`, so `immutable` is safe.

## Out of scope

- No changes to tool routes, tool logic, design tokens, colors, or copy.
- No new dependencies (Beasties/Critters intentionally skipped — see note in Fix 2).
- `src/routes/__root.tsx` edits are limited to the `links`/`scripts` arrays; the shell, providers, and `<Outlet />` remain untouched.

## Files touched

- `public/logo.webp` (re-encoded in place)
- `public/_headers` (new)
- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/components/lazy-visible.tsx` (new)
