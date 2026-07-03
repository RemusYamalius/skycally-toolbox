import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ItemSchema = z.object({
  description: z.string().max(300),
  qty: z.number().finite(),
  price: z.number().finite(),
  lineTotal: z.string().max(50),
});

const InputSchema = z.object({
  to: z.string().trim().email(),
  toName: z.string().trim().max(120).optional().default(""),
  fromName: z.string().trim().min(1).max(120),
  fromEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  invoiceNumber: z.string().trim().max(50),
  invoiceDate: z.string().trim().max(50),
  dueDate: z.string().trim().max(50).optional().default(""),
  currency: z.string().trim().max(10).optional().default("USD"),
  subtotal: z.string().trim().max(50),
  discount: z.string().trim().max(50).optional().default(""),
  tax: z.string().trim().max(50).optional().default(""),
  totalAmount: z.string().trim().max(50),
  customMessage: z.string().trim().max(500).optional().default(""),
  items: z.array(ItemSchema).max(100),
});

export type SendInvoiceInput = z.infer<typeof InputSchema>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(d: SendInvoiceInput): string {
  const greeting = d.toName ? `Hi ${escapeHtml(d.toName)},` : "Hello,";
  const messageBlock = d.customMessage
    ? `<div style="margin:16px 0;padding:14px 16px;background:#f8fafc;border-left:3px solid #06b6d4;border-radius:6px;color:#334155;font-size:14px;white-space:pre-wrap;">${escapeHtml(d.customMessage)}</div>`
    : "";

  const rows = d.items
    .filter((it) => it.description || it.qty || it.price)
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">${escapeHtml(it.description || "—")}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;text-align:right;">${it.qty}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;text-align:right;">${escapeHtml(it.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  const dueRow = d.dueDate
    ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Due date</td><td style="padding:4px 0;text-align:right;color:#111827;font-size:13px;">${escapeHtml(d.dueDate)}</td></tr>`
    : "";

  const discountRow =
    d.discount && d.discount !== "0" && d.discount !== "0.00"
      ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Discount</td><td style="padding:4px 0;text-align:right;color:#111827;font-size:13px;">− ${escapeHtml(d.discount)}</td></tr>`
      : "";
  const taxRow =
    d.tax && d.tax !== "0" && d.tax !== "0.00"
      ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Tax</td><td style="padding:4px 0;text-align:right;color:#111827;font-size:13px;">${escapeHtml(d.tax)}</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${escapeHtml(d.invoiceNumber)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="padding:28px 32px 20px;border-bottom:3px solid #06b6d4;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#06b6d4;font-weight:600;">Invoice</div>
          <div style="font-size:26px;font-weight:800;color:#0f172a;margin-top:4px;">#${escapeHtml(d.invoiceNumber)}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 8px;color:#0f172a;font-size:15px;">${greeting}</p>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.55;">Please find your invoice from <strong>${escapeHtml(d.fromName)}</strong> below.</p>
          ${messageBlock}
        </td></tr>
        <tr><td style="padding:12px 32px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:13px;">Invoice date</td>
              <td style="padding:4px 0;text-align:right;color:#111827;font-size:13px;">${escapeHtml(d.invoiceDate)}</td>
            </tr>
            ${dueRow}
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;background:#ecfeff;color:#155e75;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #06b6d4;">Description</th>
                <th style="text-align:right;padding:8px;background:#ecfeff;color:#155e75;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #06b6d4;">Qty</th>
                <th style="text-align:right;padding:8px;background:#ecfeff;color:#155e75;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #06b6d4;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Subtotal</td><td style="padding:4px 0;text-align:right;color:#111827;font-size:13px;">${escapeHtml(d.subtotal)}</td></tr>
            ${discountRow}
            ${taxRow}
            <tr>
              <td style="padding:12px 0 0;border-top:2px solid #0f172a;color:#0f172a;font-size:15px;font-weight:700;">Total due</td>
              <td style="padding:12px 0 0;border-top:2px solid #0f172a;text-align:right;color:#06b6d4;font-size:20px;font-weight:800;">${escapeHtml(d.totalAmount)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Sent via Skycally Invoice Generator</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: true }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (!lovableKey || !resendKey) throw new Error("RESEND_NOT_CONFIGURED");

    const displayFrom = `${data.fromName} via Skycally <onboarding@resend.dev>`;
    const body: Record<string, unknown> = {
      from: displayFrom,
      to: [data.to],
      subject: `Invoice #${data.invoiceNumber} from ${data.fromName}`,
      html: buildHtml(data),
    };
    if (data.fromEmail) body.reply_to = data.fromEmail;

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 422 || res.status === 400) throw new Error("INVALID_EMAIL");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (!res.ok) throw new Error("SEND_FAILED");

    return { success: true };
  });
