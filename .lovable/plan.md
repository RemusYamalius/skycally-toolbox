## Replace favicon with the uploaded square logo

1. **Copy** `user-uploads://Skycally_favicon.png` → `public/favicon.png` (square icon, suitable for browser tab).
2. **`src/routes/__root.tsx`** — update the favicon link from `/logo.png` to `/favicon.png`:
   ```tsx
   { rel: "icon", type: "image/png", href: "/favicon.png" },
   ```
3. Leave `public/logo.png` untouched — the navbar/footer continue using the wide horizontal logo.