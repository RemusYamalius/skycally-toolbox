## Add Google AdSense script sitewide

Add the AdSense loader script to `src/routes/__root.tsx` so it appears in `<head>` on every page (SSR + client).

### Change

In the `scripts` array of the root route's `head()`, add:

```ts
{
  src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6034027517286271",
  async: true,
  crossOrigin: "anonymous",
}
```

Placed alongside the existing GA loader entry. TanStack Start's `<HeadContent />` in the root shell renders it inside `<head>` for every route automatically — no per-route edit needed.

### Notes

- Uses `async` + `crossorigin="anonymous"` exactly as AdSense requires.
- Does not add ad units; only loads the AdSense library. Ad placements can be added later via the existing `AdZone` component.
