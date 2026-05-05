## Replace logo file with new uploaded image

The header and footer already render `/logo.png` at the right sizes (36px / 28px). The issue is the current `public/logo.png` file doesn't display as the intended image. Replace it with the new upload.

### Changes

1. **Copy** `user-uploads://Skycally_LOGO.png` → `public/logo.png` (overwrite).
2. **Verify** `src/components/site-header.tsx` keeps:
   ```tsx
   <img src="/logo.png" alt="Skycally" style={{ height: "36px", width: "auto" }} />
   ```
3. **Verify** `src/components/site-footer.tsx` keeps:
   ```tsx
   <img src="/logo.png" alt="Skycally" style={{ height: "28px", width: "auto" }} />
   ```
4. No other code changes needed — favicon (`/logo.png`) will pick up the new file automatically.