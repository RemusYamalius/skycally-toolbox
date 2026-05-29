### Summary
Apply 5 targeted CSS class fixes in `src/routes/tools.word-search.tsx` to improve text visibility in both Light and Dark modes. No game logic changes.

### Changes

1. **Grid wrapper background** (line 350): Add `bg-card` to the grid container div so cells have a consistent surface behind them in both themes.

2. **Grid cell default state** (line 373): Change `"text-foreground"` to `"text-foreground bg-card hover:bg-muted/40"` so unselected cells get an explicit background and hover state.

3. **Grid cell selected state** (line 372): Change `"bg-primary/40 text-primary-foreground"` to `"bg-primary/40 text-white"` so selected letters stay white and legible regardless of theme primary color.

4. **Word list badges default state** (line 391): Change `"bg-card border-border text-foreground"` to `"bg-card border-border text-foreground dark:bg-card dark:text-foreground"` for explicit dark-mode parity.

5. **Stats bar parent** (line 338): Already transparent (no explicit bg), no change needed — confirmed in review.