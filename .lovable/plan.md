## Goal
Add the provided Product Hunt launch badge to `src/components/site-footer.tsx`, placing it directly beside the existing Fazier badge in the bottom-right corner of the footer.

## Change
In `src/components/site-footer.tsx`, inside the bottom copyright `<div>` that already contains the Fazier badge, insert the supplied `<a><img>` Product Hunt badge element immediately adjacent to the Fazier badge. Use the exact `href`, `src`, `width`, `height`, and `alt` values provided by the user.

## Verification
- Build passes without errors.
- Both badges render in the bottom-right footer area.
- No other footer content or styling is modified.