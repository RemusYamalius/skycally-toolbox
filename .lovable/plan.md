## QR Generator — Contrast Safeguards

**File:** `src/routes/tools.qr-generator.tsx`

### 1. Add contrast helpers (module scope, near other utilities ~line 180)

```ts
function luminance(hex: string): number { ... }
function contrastRatio(hex1: string, hex2: string): number { ... }
```
(exact implementations from the user's spec)

### 2. Compute contrast warning in component (~after color1/color2/bg state, ~line 385)

```ts
const lowContrast = useMemo(() => {
  const c1 = contrastRatio(color1, bg);
  if (colorMode === "solid") return c1 < 3;
  const c2 = contrastRatio(color2, bg);
  return Math.min(c1, c2) < 3; // weakest stop drives warning
}, [color1, color2, bg, colorMode]);
```

### 3. Warning UI under preview (line ~759, after the canvas wrapper, before the empty-state message)

```tsx
{content && lowContrast && (
  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
    ⚠️ Low contrast detected — QR code may not scan correctly. Try darker colors.
  </p>
)}
```

### 4. Tip under gradient pickers (inside the `colorMode === "gradient"` block at line 600, appended at the end of its `space-y-3` div)

```tsx
<p className="text-[11px] text-muted-foreground">
  💡 Tip: Keep contrast between QR color and background above 4:1 for reliable scanning.
</p>
```

### Notes / scope

- No changes to the actual gradient rendering pipeline (`applyColorFill`). The user's step 2 ("minimum contrast enforcement on gradient stops") is implemented as the reactive contrast check that drives the warning; we are intentionally **not** mutating user-picked colors mid-render, since that would silently override their input. The warning + tip together fulfill the safeguard intent without breaking the "do not change other functionality" rule.
- All other UI, state, and rendering remain untouched.
