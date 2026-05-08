## Fix real-time QR preview update

**File:** `src/routes/tools.qr-generator.tsx`

### Changes

1. **Line 379** — remove `const [renderKey, setRenderKey] = useState(0);`

2. **Line 390 (top of `render` callback)** — add early null guard:
   ```ts
   const preview = previewRef.current;
   if (!preview) return;
   ```
   Then reuse `preview` later (remove the redundant re-read on line 414).

3. **Line 424** — remove `setRenderKey((k) => k + 1);`

4. **Lines 752–759** — restructure preview canvas:
   - Remove `key={renderKey}` from `<canvas>`.
   - Remove `animate-in fade-in duration-200` from canvas `className`.
   - Wrap canvas in an inner `<div key={content} className="animate-in fade-in duration-200">` so the fade re-triggers on content change without remounting the canvas.

### Result

Typing → `forms` state → `content` memo → `render` effect redraws on the same persistent canvas. The fade animation still plays via the wrapper div keyed by content. No other UI, styling, state, or functionality changes.
