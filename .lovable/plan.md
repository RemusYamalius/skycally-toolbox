## Business Card Generator — Implementation Plan

Build a new client-side tool at `/tools/business-card-generator` using Canvas API + the existing `qrcode` library. No backend.

### Files to create / edit

1. **`src/routes/tools.business-card-generator.tsx`** (new)
   - Wrap in `ToolPageShell` (title + description per memory rule).
   - 3-step wizard with state `step: 1 | 2 | 3` and a step indicator bar `[1 Template] → [2 Info] → [3 Design]`.
   - End with `<HowToUse steps={[...]} />` (per memory rule).
   - Include `<AdZone id="business-card-below-download" size="300x250" />` below download buttons.

2. **`src/lib/tools.ts`** (edit)
   - Add new entry `business-card-generator` under category `image`, icon `CreditCard` (lucide), so it appears on `/tools`, homepage, and footer automatically.

### Step 1 — Template picker
- Hardcoded `TEMPLATES` array (8 entries, exactly as specified).
- Grid: `grid-cols-2 md:grid-cols-4`.
- Each card shows a small static SVG/CSS mock preview using template colors + name + description.
- Click → set selected template, advance to step 2.

### Step 2 — Info form
- Controlled form with `CardInfo` shape exactly as specified.
- Two-column on `md:`, single on mobile.
- Char limits: name 30, title 40 (use `maxLength`).
- QR section: `Switch` (showQR) + Input (qrContent, auto-filled from website on change when untouched).
- Logo upload: `DropZone`-style small box with image preview, stored as object URL → loaded into `HTMLImageElement`.
- "Back" + "Preview Card" buttons.

### Step 3 — Customize & download
- Split layout: `lg:grid-cols-[1fr_360px]`.
- **Left preview pane:**
  - Two `<canvas>` refs (front + back), only one visible at a time, toggle button "Show Back / Show Front".
  - Canvas displayed scaled (CSS `max-width: 100%`) at 1050×600 (or rotated 600×1050 for vertical).
  - Re-renders via a single `useEffect` watching all relevant state.
- **Right customization panel** (stacked sections, scrollable):
  - **Colors**: 3 native `<input type="color">` (bg, accent, text) + 6 quick preset swatches (apply trio).
  - **Typography**: font `Select` (Inter, Playfair Display, Montserrat, Roboto, Georgia, Oswald), name size `Slider` 24-48, info size `Slider` 11-16. Load Google Fonts via injected `<link>` once on mount.
  - **Layout**: QR position (Bottom-Left / Bottom-Right / None) as toggle group, QR size (S/M/L), Logo position (TL/TC/TR), divider line show/hide + color.
  - **Orientation**: Horizontal / Vertical toggle.
- **Download buttons**: Front PNG, Back PNG, Both (combined). Use the exact code from the spec.
- Print spec note below buttons.

### Canvas drawing
- `drawCard` and `drawCardBack` implemented per the provided spec, parameterized to honor:
  - custom colors, font, name/info sizes, orientation, QR position+size, logo position, divider toggle+color.
- QR generation: `QRCode.toCanvas(offscreen, content, { width: 300, margin: 1, errorCorrectionLevel: 'H' })`. Auto-content = website, fallback to vCard built from name + phone.
- Logo: read uploaded file → `new Image()` → set `src` → on `onload` trigger redraw.
- All drawing happens inside a single effect that depends on every state input; QR + logo loads use async helpers that set state once ready.

### How to use steps
1. "Choose a template that fits your style"
2. "Fill in your contact information"
3. "Customize colors and download print-ready PNG"

### Site integration (via `tools.ts` edit)
- Adding the entry automatically populates: homepage tools grid, `/tools` Image Tools section, and the footer "Image Tools" column. No separate edits needed.
- The `head()` block on the new route sets title/description/og tags.

### Notes / constraints honored
- Pure frontend, no backend, no new deps (`qrcode` already installed).
- No design-token violations: colors used in form UI come from semantic tokens; the user-picked card colors are intentional raw values stored in state and only painted onto the canvas.
- Conforms to project memory: `ToolPageShell` wrapper + `HowToUse` block.
- `AdZone` left with `hasAd={false}` default → renders nothing until wired.

Ready to implement on approval.