## Add Color Picker tool

### Files

1. **Create `src/routes/tools.color-picker.tsx`** — single-file route component at `/tools/color-picker` implementing all 9 feature sections in tabs (Picker / Harmony / Contrast / Gradient / Extract), plus Saved Palette and Recently Used rows shown under the picker. Uses existing primitives: `ToolPageShell`, `HowToUse`, `ToolSeoContent`, `RelatedTools`, `Tabs`, `Input`, `Slider`, `Button`, `buildToolMeta`, `toolBySlug`. No new dependencies — color math is hand-rolled, image extraction is pure canvas.

2. **Edit `src/lib/tools.ts`** — append the `color-picker` entry to the tools array. Add `Pipette` to the existing `lucide-react` import if not already present.

3. **Edit `src/lib/related-tools.ts`** — add a `color-picker` mapping pointing to relevant utility/design tools (e.g. `color-palette`, `image-filters`, `meme-generator`, `qr-generator`).

### Implementation outline

Inside `tools.color-picker.tsx`:

- **Color math (top of file, pure functions)**: `hexToRgb`, `rgbToHex`, `rgbToHsl`, `hslToRgb`, `rgbToHsb`, `rgbToCmyk`, `relativeLuminance` + `getContrastRatio`, `getHarmonyColors(hex, mode)`, `getShades(hex)`, `getTints(hex)`, `getRandomColor()`, `findClosestTailwindColor(hex)` backed by a hardcoded `TAILWIND_COLORS` map covering slate→rose, shades 50-950.
- **State**: HSV (`h`, `s`, `v`, `a`) as source of truth — derive HEX/RGB/etc. Default `#06b6d4`. Saved palette + recents in `localStorage` (`cp:saved`, `cp:recents`). Push to recents on color change (debounced).
- **Picker tab**: 
  - SV canvas (`<div>` with layered gradients: white→transparent horizontally, transparent→black vertically, hue background) with pointer/touch handlers; draggable knob.
  - Hue `<input type="range">` styled as rainbow.
  - Alpha `<input type="range">` styled with checker + color gradient.
  - Large preview swatch, Random button, Recently Used row (12 max), Saved Palette row (20 max, with X / Clear all / Copy all as JSON array).
  - Format outputs grid: HEX, HEX+alpha, RGB, RGBA, HSL, HSLA, HSB, CMYK, `--color-primary: #hex;`, Tailwind closest match. Each row has a `CopyButton` that flips to a checkmark for 1500ms via `setTimeout`.
- **Harmony tab**: buttons for Complementary / Analogous / Triadic / Split-Complementary / Tetradic; render swatches (click to set as current, copy on second click via per-swatch copy button).
- **Shades & Tints**: row of 10 swatches under the picker (5 darker + current + 4 lighter), clickable+copyable.
- **Contrast tab**: foreground + background color inputs (text + native color picker), ratio (rounded to 2 dp), AA/AAA badges for normal (4.5 / 7) and large text (3 / 4.5), live preview block with sample text.
- **Gradient tab**: up to 5 stops (add/remove buttons), each stop has color input + position slider; angle slider (0-360) + preset buttons (0/45/90/135/180/225/270/315); Linear/Radial toggle; full-width preview; Copy CSS + Copy Tailwind buttons (Tailwind uses `bg-gradient-to-*` + `from-[#hex] via-[#hex] to-[#hex]`).
- **Extract tab**: drop zone + file input, draw image to offscreen canvas (downscaled to ~100px max edge), bucket pixels into a 4-bit-per-channel histogram, sort by count, return top 8 distinct colors as clickable+copyable swatches. All client-side, never uploaded.
- **Active tab accent**: inline style on `TabsTrigger` data-state=active uses the current hex (apply via a thin CSS variable wrapper).
- **Mobile**: pointer events for canvas; `touch-action: none` on the SV canvas to prevent scroll while dragging.

Bottom of page: `HowToUse` (3 steps as specified), `ToolSeoContent` (title/description as specified, 2-3 paragraph body, 8 FAQs covering formats, WCAG, harmony, image extraction, saved palette, Tailwind match, gradient, privacy), and `<RelatedTools currentSlug="color-picker" />`.

### Verification

- Dev server compiles, `/tools/color-picker` renders with default `#06b6d4`.
- All 5 tabs switch; copy buttons flash checkmark; saved palette and recents persist across reload; image extractor returns 8 swatches for a test image.
