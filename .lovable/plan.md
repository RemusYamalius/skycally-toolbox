## Goal
Improve document corner detection accuracy in the Document Scanner tool and make the corner handles easier to grab.

## Changes

### 1. `src/utils/edgeDetection.ts` — Detection algorithm
- Drop the `adaptiveThreshold` step entirely (remove `thresh` Mat, the `adaptiveThreshold` call, and the `bitwise_or` that combined it with edges). Use Canny edges directly as input to `dilate`.
- Switch `findContours` mode from `cv.RETR_LIST` to `cv.RETR_EXTERNAL` so only outer contours are considered.
- Before iterating, collect all contours into an array, compute area for each once, and sort by area descending. Iterate only the top 10.
- Replace the epsilon list with `[0.01, 0.02, 0.03, 0.04, 0.05, 0.06]` for `approxPolyDP`.
- When reading approximated polygon points, use `approx.data32S` (integer) instead of `approx.data32F`.
- After successfully accepting a quad, if its area exceeds 50% of `imageArea`, break out of the outer loop early.
- Keep all existing Mat cleanup (`finally` block) — just remove the `thresh` reference from the cleanup list since it's gone.

### 2. `src/routes/tools.document-scanner.tsx` — Drag UX
- Line ~631–632: change tolerance from `30` to `50` pixels (`const tol = (50 / overlayRef.current.width) * imageSize.w;`).
- Line ~670: overlay canvas `className` becomes `"absolute touch-none cursor-crosshair"` (drop `inset-0 w-full h-full`).

## Out of scope
No styling, content, or other behavior changes.