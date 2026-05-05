## Update logo file and sizes

1. **Replace** `public/logo.png` with the newly uploaded `user-uploads://Skycally.png` (2048x356, transparent).
2. **`src/components/site-header.tsx`** — change height from `36px` to `38px`:
   ```tsx
   <img src="/logo.png" alt="Skycally" style={{ height: "38px", width: "auto" }} />
   ```
3. **`src/components/site-footer.tsx`** — change height from `28px` to `30px`:
   ```tsx
   <img src="/logo.png" alt="Skycally" style={{ height: "30px", width: "auto" }} />
   ```
4. **Favicon** — already wired in `src/routes/__root.tsx` via `{ rel: "icon", type: "image/png", href: "/logo.png" }`. No `index.html` exists in this TanStack Start project; the root route head() handles it. Will pick up the new file automatically.
5. No background containers exist behind the logos — the `<Link>` wrappers have no bg classes. Nothing to remove.
