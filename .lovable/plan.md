## Update favicon to new Skycally logo

### Steps

1. **Copy the uploaded logo** to `public/`:
   - `public/favicon.png` (overwrite the old one) — main favicon
   - `public/apple-touch-icon.png` — same image, used by iOS/macOS

2. **Update `src/routes/__root.tsx` head links** to declare a complete favicon set and bust browser/Google caches with a version query:
   ```ts
   { rel: "icon", type: "image/png", href: "/favicon.png?v=2" },
   { rel: "shortcut icon", type: "image/png", href: "/favicon.png?v=2" },
   { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
   ```

3. **Publish** so the new favicon is live at `skycally.com`.

4. **Request re-indexing** (manual, on the user side) in Google Search Console → URL Inspection → `https://skycally.com/` → Request Indexing. Google's favicon refresh typically takes from a few days up to several weeks; there is no way to force it instantly.

### Notes
- No tool routes, components, or logic are touched.
- The `?v=2` query forces browsers (and Google's crawler) to re-fetch the file instead of using a cached old version.
- The uploaded image is already square (~512×512) and works fine as both favicon and apple-touch-icon.
