## Replace text logo with PNG across header, footer, and favicon

### 1. Add the logo asset
- Create `public/` folder and copy the uploaded `Skycally_LOGO-nobg.png` to `public/logo.png` so it's served at `/logo.png` at runtime.

### 2. Header (`src/components/site-header.tsx`)
Replace the current text+icon logo:
```tsx
<Link to="/" className="flex items-center gap-1.5 font-display font-bold text-xl">
  <span>Sky</span>
  <Sparkle ... />
  <span>cally</span>
</Link>
```
with:
```tsx
<Link to="/" className="flex items-center">
  <img src="/logo.png" alt="Skycally" className="h-8 w-auto" />
</Link>
```
Remove the now-unused `Sparkle` import.

### 3. Footer (`src/components/site-footer.tsx`)
Replace the same text+`Sparkle` logo block at the top of the footer with the same `<img src="/logo.png" alt="Skycally" className="h-8 w-auto" />` inside the existing `<Link to="/">`. Remove the unused `Sparkle` import.

### 4. Favicon (`src/routes/__root.tsx`)
This project has no `index.html` (TanStack Start manages `<head>` via the root route). Add a favicon entry to the `links` array in `Route.head()`:
```ts
{ rel: "icon", type: "image/png", href: "/logo.png" },
```

### Notes
- Files in `public/` are served from the site root, so `/logo.png` works in both dev and production.
- `h-8` keeps logo height consistent with the previous text logo's visual weight; the navbar's `h-16` provides ample padding.
