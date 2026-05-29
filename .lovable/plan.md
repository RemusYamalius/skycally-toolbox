## Plan: Add Truth or Dare & Dice Roller to Games & Fun

### 1. `src/lib/tools.ts`
- Add `Flame` and `Dices` to the existing `lucide-react` import line.
- Append two new entries to the `tools` array after `random-team-maker`:
  - `truth-or-dare` → category `games`, icon `Flame`, path `/tools/truth-or-dare`
  - `dice-roller` → category `games`, icon `Dices`, path `/tools/dice-roller`

### 2. `src/routes/tools.truth-or-dare.tsx` (new)
Mirror the structure of `tools.role-spinner.tsx`:
- `createFileRoute("/tools/truth-or-dare")` with `head()` SEO meta (title, description, og tags).
- Wrap UI in `ToolPageShell` → content → `HowToUse` → `ToolSeoContent` → `RelatedTools`.
- Constants: `TRUTHS` (20 items) and `DARES` (20 items) as specified.
- State: `mode`, `current`, `spinning`, `customTruths`, `customDares`, `useCustomOnly`, `showCustomize`.
- Sections:
  - **Mode selector**: two toggle buttons (Truth 🔥 / Dare 💀); clicking toggles inclusion, defaults to both selected. Internally normalized to `"both" | "truth" | "dare"`.
  - **Spin area**: animated bottle div (CSS `@keyframes spin`, 1.5s) + large `Spin!` button with `Flame` icon, disabled while spinning.
  - **Result card**: framer-motion scale+fade in, shows type badge (TRUTH/DARE) + question text + Spin Again button.
  - **Customize panel**: `Collapsible` with two textareas/inputs to add custom truths and dares (list + add/remove), plus a `Switch` for "Use custom only".
- `spin()` implements the timeout-based pick exactly as specified.
- Uses semantic tokens only (`text-foreground`, `bg-card`, `border-border`, brand vars for accent color).

### 3. `src/routes/tools.dice-roller.tsx` (new)
Same shell pattern:
- `createFileRoute("/tools/dice-roller")` with SEO `head()`.
- Constants: `DIE_SIDES`, `DICE_COLORS`.
- State: `selected`, `modifier`, `results`, `history`, `rolling`.
- Sections:
  - **Dice selector**: 6 dice-type buttons (D4–D20). Selected state highlighted with `DICE_COLORS[die]`. Below each selected die, a `+`/`-` counter (clamped 1–10; 0 means unselected).
  - **Modifier input**: small numeric input with `+`/`-` controls.
  - **Roll button**: large primary button with 🎲 emoji; disabled while rolling.
  - **Results grid**: animated cards (framer-motion bounce/scale) showing die label + value, tinted with `DICE_COLORS`. Total line below = sum + modifier. "Roll Again" button reuses config.
  - **History**: last 5 roll summaries as small `Badge` chips.
- `roll()` follows the spec (600ms delay, history capped at 5).
- All colors via tokens + the inline `DICE_COLORS` map (allowed since die colors are intentional brand-ish accents per the spec).

### 4. Out of scope
- No edits to `routeTree.gen.ts` (auto-generated).
- No changes to footer, homepage, or other tool routes (Games category already wired up).
- No new dependencies (framer-motion, lucide-react, shadcn primitives already available).

### Verification
After implementation, confirm both routes render in preview, dice colors apply, and spin/roll animations trigger.
