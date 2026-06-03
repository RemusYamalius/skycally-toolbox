1. Remove the white `<Progress>` bar block (lines 410-414) from the layout entirely. Also remove the unused `Progress` import and the `progress` state/setters if they become dead code.

2. Enhance the "Test Complete" state:
   - Increase the checkmark circle from `w-10 h-10` to `w-14 h-14` and the checkmark text from `text-xl` to `text-2xl`.
   - Add a soft green box-shadow glow behind the checkmark circle using `var(--green-brand)` at low opacity.
   - Add a repeating pulse animation (Framer Motion `animate` with scale + opacity looping) so the checkmark gently breathes after appearing.
   - When `phase === "done"`, render the phase label above the gauge with `text-sm font-semibold text-green-brand` instead of the default `text-xs text-muted-foreground` styling, keeping it uppercase.