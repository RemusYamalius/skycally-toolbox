## Plan: Add "Send Invoice by Email" to /tools/invoice-generator

Add a Send Invoice button + modal that emails a clean HTML invoice via the **Resend connector through the Lovable gateway**. No PDF attachment (per your choice) — the email itself contains a well-formatted invoice summary.

### Steps

1. **Link the Resend connector** to the project (if not already linked) via `standard_connectors--connect` with `connector_id: "resend"`. This provisions `RESEND_API_KEY` and `LOVABLE_API_KEY` as server env vars.

2. **Create `src/lib/send-invoice.functions.ts`** (in `src/lib/`, not `src/server/`, to match the working cover-letter/resume pattern that avoids import-protection Rollup errors):
   - `createServerFn({ method: "POST" })` with a Zod `inputValidator` for: `to` (email), `toName?`, `fromName`, `fromEmail?`, `invoiceNumber`, `invoiceDate`, `dueDate?`, `totalAmount`, `currency?`, `customMessage?` (max 500), plus a compact `items[]` (description, qty, price, line total) so the email body can list them.
   - Handler POSTs to `https://connector-gateway.lovable.dev/resend/emails` with headers `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${RESEND_API_KEY}`.
   - `from` uses `onboarding@resend.dev` by default (safe for testing without a verified domain) with the sender name: `"{fromName} via Skycally <onboarding@resend.dev>"`. If the user later verifies a domain, we can swap the from address.
   - `reply_to: fromEmail` when provided, so replies go to the sender's own email.
   - Subject: `Invoice #{invoiceNumber} from {fromName}`.
   - HTML body: branded, inline-styled invoice summary — header with invoice #, greeting, optional custom message block, table of line items, totals row (total in bold), due date, and a "Sent via Skycally Invoice Generator" footer. All fields HTML-escaped.
   - Status mapping: `422 → INVALID_EMAIL`, `429 → RATE_LIMITED`, missing keys → `RESEND_NOT_CONFIGURED`, else `SEND_FAILED`.

3. **Edit `src/routes/tools.invoice-generator.tsx`**:
   - Import `sendInvoiceEmail` from `@/lib/send-invoice.functions` and `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` from `@/components/ui/dialog`.
   - Add state (`useState`): `emailOpen`, `sending`, `emailForm` (`to`, `toName`, `fromName` prefilled from `state.from.name`, `customMessage`).
   - Add a **✉️ Send Invoice** button next to the existing Download PDF button (same size, `variant="outline"` with the cyan accent, `Mail` icon from lucide-react). Opens the dialog.
   - Dialog layout: rounded-2xl, matches existing tool modal style. Fields:
     - Send to (email, required)
     - Client name (optional)
     - Your name / business (required, prefilled)
     - Personal note (Textarea, `maxLength={500}`, char counter)
     - Cancel + Send buttons; Send shows spinner + "Sending…" while `sending`.
   - `handleSend` is a **plain `function` declaration** (no async arrow, no `useCallback(async)`) that:
     1. Validates fields (`toast.error` on missing/invalid).
     2. Sets `sending=true`, builds the payload from current `state` + `totals` (already computed via `useMemo` in the file), then calls `sendInvoiceEmail({ data: payload }).then(...).catch(...).finally(...)`.
     3. On success: `toast.success("Invoice sent to " + email)`, close dialog, reset the form.
     4. On error: map `err.message` to the four user-facing messages you listed, via `toast.error`.
   - No changes to any existing invoice-generation, PDF-download, SEO, HowToUse, RelatedTools code.

4. **No new npm packages, no new secrets to add manually** — the connector link handles `RESEND_API_KEY` automatically.

### Technical notes

- Server function lives in `src/lib/` (not `src/server/`) because the current TanStack Start template blocks `src/server/*` from the client bundle in a way that has broken past tools in this project; the cover-letter and resume server fns already live in `src/lib/` for this exact reason.
- All async work stays server-side. The component uses only plain `function` decls and `.then/.catch/.finally` — no top-level `async` arrows, matching the build rules that already govern this project.
- Currency symbol comes from the existing `CURRENCIES` lookup; `totalAmount` is formatted with the same helper the preview uses so the email matches the on-screen invoice.
- Rate-limit / error toasts use `sonner`, already imported in the file.

### Out of scope

- PDF attachment (skipped per your choice).
- Sender email verification / custom from-domain: emails go from `onboarding@resend.dev` with the user's name as the display name and their own email in `reply_to`. Switching to a verified domain is a follow-up if/when you want to remove the "via" line.
- Storing sent history, resending, CC/BCC, multi-recipient.