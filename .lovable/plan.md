## Add Google Analytics (gtag.js) — G-WHRM5Z08KR

Inject the Google tag site-wide via the root route in `src/routes/__root.tsx` so it loads on every page (SSR-safe, appears in `<head>` once).

### Changes

**`src/routes/__root.tsx`** — add two entries to the `head()` `scripts` array:

```ts
scripts: [
  {
    src: "https://www.googletagmanager.com/gtag/js?id=G-WHRM5Z08KR",
    async: true,
  },
  {
    children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-WHRM5Z08KR');`,
  },
],
```

TanStack's `HeadContent` renders these into `<head>` on every route automatically — no need to touch individual route files. Single instance per page (no duplication).

### Notes

- After publish, verify in Google Analytics → Realtime that hits arrive from `skycally.com`.
- GDPR/cookie consent isn't added here. If you later need consent gating, we can wrap the tag in a consent check — let me know.
