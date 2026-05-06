## Goal
Replace `public/favicon.png` with the uploaded `Skycally_favicon-2.png`.

## Changes
1. `code--copy user-uploads://Skycally_favicon-2.png public/favicon.png` (overwrite).
2. No code changes — `src/routes/__root.tsx` already references `/favicon.png`.

## Notes
- A hard refresh may be required to bust browser cache.