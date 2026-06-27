# Plan: Invoice Generator Tool

Build a professional invoice generator at `/tools/invoice-generator` matching the spec: split form/preview UI, live updates, 3 templates, PDF/print export, multi-currency, localStorage persistence.

## Files

**Create** `src/routes/tools.invoice-generator.tsx` — single-file route containing:
- `createFileRoute("/tools/invoice-generator")` with `buildToolMeta(toolBySlug("invoice-generator"))` head
- Wrapped in `ToolPageShell` + `HowToUse` + `ToolSeoContent` (per project memory)
- All state, components, helpers inline

**Edit** `src/lib/tools.ts` — register the new tool (icon: `FileText` or `Receipt`, category: `utility`, slug: `invoice-generator`)

**Edit** `src/lib/related-tools.ts` — cross-link with `qr-generator`, `business-card-generator`, `currency-converter`, `pdf-reader`

## Dependencies

Install via `bun add`: `jspdf`, `html2canvas`

## UI Architecture

```text
ToolPageShell
├── Template switcher (Classic | Modern | Minimal) + Download PDF + Print buttons
├── Grid: md:grid-cols-[2fr_3fr]
│   ├── Form panel (left/top)
│   │   ├── FROM card (logo upload + business details + "Remember my details" toggle)
│   │   ├── TO card (client details)
│   │   ├── Invoice details (number, dates, currency Select)
│   │   ├── Line items (dynamic rows, Add Item button)
│   │   ├── Discount (flat/% toggle) + global tax mode
│   │   └── Notes + Payment Terms
│   └── Preview panel (right/bottom) — id="invoice-preview", white card, template-scoped CSS classes
├── Sticky bottom Download button on mobile
├── HowToUse
└── ToolSeoContent (FAQ + body)
```

## State Model

```ts
type LineItem = { id: string; description: string; qty: number; price: number; tax: number };
type Invoice = {
  from: { name; email; phone; address; logo (base64) };
  to: { name; email; address };
  number: string; date: string; dueDate: string; currency: string;
  items: LineItem[];
  discount: { value: number; type: 'flat' | 'percent' };
  taxMode: 'per-line' | 'global'; globalTax: number;
  notes: string; terms: string;
  template: 'classic' | 'modern' | 'minimal';
};
```

- `useMemo` for subtotal, discount amount, tax amount, total
- 150ms debounce on localStorage writes
- Logo: FileReader → base64, max ~500KB enforced

## Calculation Logic

- Per-line subtotal = `qty * price`
- Per-line tax (if `taxMode==='per-line'`) = `subtotal * tax/100`
- Subtotal = Σ line subtotals
- Discount = `type==='flat' ? value : subtotal * value/100`
- Tax = `taxMode==='global' ? (subtotal - discount) * globalTax/100 : Σ per-line tax`
- Total = subtotal - discount + tax
- Format with `Intl.NumberFormat` + currency symbol prepended (per spec)

## PDF / Print

- `downloadPDF`: html2canvas (scale 2, useCORS, backgroundColor white) → jsPDF A4, multi-page if `canvas.height > pageHeight` (slice image across pages)
- After download: auto-increment `invoice-count` in localStorage, bump invoice number
- Print: `@media print` styles inside scoped `<style>` block — hide everything except `#invoice-preview`, reset margins, force white bg/black text

## Templates

Three CSS class variants on the preview root: `.tpl-classic`, `.tpl-modern`, `.tpl-minimal`. Each defines header layout, table styling, totals block, accent color. Scoped via a local `<style>` tag (no global token pollution) — preview is intentionally white/print-styled regardless of app theme.

## localStorage Keys

- `invoice-from` (if "Remember" toggle on)
- `invoice-settings` (currency, template, taxMode, rememberMe)
- `invoice-draft` (full current invoice state)
- `invoice-count` (numeric counter for auto-increment)

Restored on mount via `useEffect`.

## SEO Content

- Memory rule: include `ToolSeoContent` with title, 1-2 sentence description, 2-3 paragraph body (~150-200 words), 4 FAQs (currency support, offline/private, PDF quality, editing later)
- English only (per project memory)

## Acceptance

- Live preview updates as user types
- PDF downloads correctly with logo and all data, multi-page safe
- Print produces only the invoice
- Switching template doesn't lose form data
- Reload restores last draft
- Mobile: stacked layout, sticky download button
- Registered in tools.ts and related-tools.ts
