## Update logo sizing in Navbar and Footer

Replace the existing logo `<img>` tags with the exact markup specified, removing the Tailwind size classes and brightness filter in favor of inline pixel heights.

### Changes

**`src/components/site-header.tsx`** (line 20)
- Replace current `<img>` with:
  ```tsx
  <img src="/logo.png" alt="Skycally" style={{ height: "36px", width: "auto" }} />
  ```

**`src/components/site-footer.tsx`** (line 12)
- Replace current `<img>` with:
  ```tsx
  <img src="/logo.png" alt="Skycally" style={{ height: "28px", width: "auto" }} />
  ```

No text logos or placeholders remain to remove (already replaced previously). The uploaded `logo.png` is already in `public/`.