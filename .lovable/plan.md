## Mobile PageSpeed fixes (no CSS changes)

### Fix 1 — Resize `/logo.webp` (1920×333 → 400×70)
- Regenerate `public/logo.webp` at 400×70, WebP quality 85, using ImageMagick via `nix run nixpkgs#imagemagick`.
- `src/components/site-header.tsx`: add `fetchpriority="high"` to the logo `<img>` and set `width="200" height="35"` (keeps current rendered size; intrinsic 2× for retina).
- `src/components/site-footer.tsx`: update logo `<img>` to `width="200" height="35"` for consistency with the new intrinsic size (no `fetchpriority` — footer is below the fold). No CSS changes; existing inline `style={{height:"30px",width:"auto"}}` / `"38px"` preserved so rendered size is unchanged.

### Fix 2 — Cache headers for static assets
Deployment uses Cloudflare Workers Assets (`wrangler.jsonc`); the `public/_headers` file is honored by the Workers Assets runtime and by the Lovable preview/published Pages serving.

Create `public/_headers`:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/logo.webp
  Cache-Control: public, max-age=31536000, immutable
```

### Fix 3 — Defer GTM until `load`
In `src/routes/__root.tsx`, replace the two GTM `scripts` entries (the `googletagmanager.com/gtag/js` src tag and the inline `gtag('config', …)` tag) with a single inline script that, on `window.addEventListener('load', …)`, injects the GTM `<script src>` and then runs the existing `dataLayer` / `gtag('js', new Date())` / `gtag('config','G-WHRM5Z08KR')` initialization. No change to the existing font-loading script or any other head entry.

### Out of scope
No CSS, stylesheet order, critical-path, UI, or tool-logic changes. `buildPageMeta`, sitemap, schema markup, and all routes other than `__root.tsx` / `site-header.tsx` / `site-footer.tsx` untouched.
