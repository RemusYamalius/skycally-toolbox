## Plan: Element Mixer Improvements

### Improvement 1 — Sound Effects for Element Mixer

**File:** `src/routes/tools.element-mixer.tsx`

Add a self-contained Web Audio API sound engine inside the component. No external files, no npm packages, no imports needed.

1. **Sound engine** — Insert the `audioCtx` lazy singleton + `sounds` object (metalClick, bubblePop, tick, mixing, successDing, dangerBuzz, discovery, mystery) after the imports block and before the constants.

2. **State & helper** — Add `const [isMuted, setIsMuted] = useState(false);` and `const playSound = (fn: () => void) => { if (!isMuted) fn(); };` inside `ElementMixerPage`.

3. **Mute button** — Add a 🔊/🔇 toggle button next to the Reset button in the Discovery progress header.

4. **Wire interactions:**
   - **addElement** — After `setSelected`, look up the element category. If metal (alkali, alkaline-earth, transition, post-transition, lanthanide, actinide) → `sounds.metalClick()`, else → `sounds.bubblePop()`.
   - **changeCount** — After `setSelected`, play `sounds.tick()`.
   - **doMix** — Inside the `setTimeout` callback, right after `setIsMixing(true)` and before `mix()`, play `sounds.mixing()`.
   - **Result reveal** — After computing `wasNew` (local boolean before `setIsNewDiscovery`), play:
     - `sounds.discovery()` if `wasNew`
     - `sounds.dangerBuzz()` if `r.known` and `r.animation` is `"danger"` or `"explosion"`
     - `sounds.successDing()` if `r.known` and not dangerous
     - `sounds.mystery()` if unknown compound

### Improvement 2 — Fix Tool Card Colors

**File:** `src/lib/tools.ts`

The Element Mixer card is green, but because it has `categories: ["utility", "games"]`, it also renders in the Games section where every neighbor is purple (`var(--violet-brand)`). The card itself pulls color from `tool.category` ("utility" → green), creating a mismatch in the Games section.

**Surgical fix:** Remove `"games"` from the `categories` array on the Element Mixer entry so it only appears in the Utility Tools section. This eliminates the cross-category mismatch without touching any other tool, the ToolCard component, or category colors.

Before:
```typescript
{ slug: "element-mixer", ..., category: "utility", categories: ["utility", "games"], ... }
```

After:
```typescript
{ slug: "element-mixer", ..., category: "utility", ... }
```

This keeps Element Mixer in the Utility Tools section alongside QR Generator, Currency Converter, etc. — all using the same green `var(--green-brand)` color from `categoryMeta.utility`.

---

**Constraints respected:**
- No new npm packages
- No external audio files
- No routing or ToolPageShell changes
- No game logic, compounds DB, or CSS animation changes
- Mute state is session-only (no localStorage)
