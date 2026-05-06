## Goal
Replace the current site logo with the uploaded `Skycally_LOGO-2.png` while keeping the existing header placement and dimensions (height 38px, auto width).

## Changes

### 1. Copy the uploaded image into the public folder
- `code--copy user-uploads://Skycally_LOGO-2.png public/logo.png` (overwrite)
- This replaces the file already referenced by `<img src="/logo.png">` in `src/components/site-header.tsx`, so no code change is required.

### 2. No edits to `site-header.tsx`
- Existing markup stays the same — same `height: 38px`, same position, same link to `/`.

## Notes
- Browsers may cache `/logo.png`; a hard refresh shows the new logo immediately.
- Favicon (`/favicon.png`) is a separate file and is left untouched. If you want the favicon updated too, say the word and I'll regenerate it from the same image.
