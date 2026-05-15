## Add 3 new tools to Skycally

Follow the existing tool patterns exactly (ToolPageShell + HowToUse + RelatedTools + ToolSeoContent, `buildToolMeta + toolBySlug` head, dark theme, Tailwind only).

### 1. Update `src/lib/tools.ts`
- Add `Link` and `Clock` to the `lucide-react` import (keep existing imports intact; `RotateCw` is already imported).
- Append three entries to the `tools` array:
  - `{ slug: "spinning-wheel", name: "Spinning Wheel", description: "Spin a customizable wheel to make random decisions. Add your own options.", category: "text", icon: RotateCw, path: "/tools/spinning-wheel" }`
  - `{ slug: "link-shortener", name: "Link Shortener", description: "Shorten any URL and generate a QR code for it instantly.", category: "text", icon: Link, path: "/tools/link-shortener" }`
  - `{ slug: "free-time-fixer", name: "Free Time Fixer", description: "Tell us how many minutes you have free — we'll tell you exactly what to do.", category: "text", icon: Clock, path: "/tools/free-time-fixer" }`

### 2. Create `src/routes/tools.spinning-wheel.tsx`
- Canvas-drawn wheel; segments derived from a `string[]` state (default 6 options).
- 8-color cycling palette; segment angles = `2π / n`.
- Spin: pick random target index, animate `rotation` over ~4s with easeOut (cubic), `requestAnimationFrame`. Disable Spin button while animating.
- Pointer fixed at top; on end, compute winner from final rotation, show centered modal (Dialog) with winner + "Spin again" / "Close".
- Editable list: input rows with remove button, "Add option" button. Min 2, max 16.
- Big primary "Spin" button.

### 3. Create `src/routes/tools.link-shortener.tsx`
- URL input (validate `http(s)://`).
- Fetch `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, get text. Handle errors with toast.
- Result box with shortened URL + Copy button (`navigator.clipboard`, sonner toast).
- Generate QR for short URL using existing `qrcode` package (already used by qr-generator) into a canvas. Download QR as PNG via `canvas.toDataURL` + anchor click.
- Will verify `qrcode` is installed by reading `tools.qr-generator.tsx`; if missing, install via `bun add qrcode @types/qrcode`.

### 4. Create `src/routes/tools.free-time-fixer.tsx`
- Two button groups: time (`5`,`15`,`30`,`60`,`120+` min) and mood (productive/relaxed/creative/social/active) — single select each.
- Hardcoded suggestions map keyed by `${time}-${mood}` with ≥5 items each (`{title, description, emoji}`).
- "What should I do?" reveals card with random pick; "Try another" rerolls (avoids repeating last).

### 5. Shared per-route
- `head: () => buildToolMeta(toolBySlug(slug, tools))`
- ToolPageShell title/description from tools.ts entry.
- HowToUse with the 3 steps from the spec.
- ToolSeoContent: title, 1–2 sentence description, 2–3 paragraph body (~150–200 words), 4 FAQs each.
- `<RelatedTools currentSlug="..." />` at the bottom.

### Out of scope
- No edits to routeTree.gen.ts (auto-generated).
- No changes to other tools or shared components.
