import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer, Plus, X, Upload, FileText } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/tools/invoice-generator")({
  head: () => buildToolMeta(toolBySlug("invoice-generator", tools)),
  component: InvoiceGeneratorPage,
});

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "MAD", symbol: "د.م.", label: "Moroccan Dirham" },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
];

type LineItem = {
  id: string;
  description: string;
  qty: number;
  price: number;
  tax: number;
};

type Template = "classic" | "modern" | "minimal";
type TaxMode = "per-line" | "global";
type DiscountType = "flat" | "percent";

type InvoiceState = {
  from: { name: string; email: string; phone: string; address: string; logo: string };
  to: { name: string; email: string; address: string };
  number: string;
  date: string;
  dueDate: string;
  currency: string;
  items: LineItem[];
  discountValue: number;
  discountType: DiscountType;
  taxMode: TaxMode;
  globalTax: number;
  notes: string;
  terms: string;
  template: Template;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const nextInvoiceNumber = (): string => {
  if (typeof window === "undefined") return "INV-001";
  const count = parseInt(localStorage.getItem("invoice-count") || "0", 10) + 1;
  return `INV-${String(count).padStart(3, "0")}`;
};

const bumpInvoiceCount = () => {
  const count = parseInt(localStorage.getItem("invoice-count") || "0", 10) + 1;
  localStorage.setItem("invoice-count", String(count));
};

const newItem = (): LineItem => ({
  id: Math.random().toString(36).slice(2, 9),
  description: "",
  qty: 1,
  price: 0,
  tax: 0,
});

const defaultState = (): InvoiceState => ({
  from: { name: "", email: "", phone: "", address: "", logo: "" },
  to: { name: "", email: "", address: "" },
  number: "INV-001",
  date: todayISO(),
  dueDate: plusDaysISO(30),
  currency: "USD",
  items: [newItem()],
  discountValue: 0,
  discountType: "flat",
  taxMode: "per-line",
  globalTax: 0,
  notes: "Thank you for your business!",
  terms: "Payment due within 30 days.",
  template: "modern",
});

function InvoiceGeneratorPage() {
  const tool = toolBySlug("invoice-generator", tools);
  const [state, setState] = useState<InvoiceState>(defaultState);
  const [rememberMe, setRememberMe] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const settings = localStorage.getItem("invoice-settings");
      const draft = localStorage.getItem("invoice-draft");
      const from = localStorage.getItem("invoice-from");
      let next = defaultState();
      next.number = nextInvoiceNumber();
      if (draft) {
        const parsed = JSON.parse(draft);
        next = { ...next, ...parsed };
        if (!parsed.items || parsed.items.length === 0) next.items = [newItem()];
      }
      if (settings) {
        const s = JSON.parse(settings);
        if (s.currency) next.currency = s.currency;
        if (s.template) next.template = s.template;
        if (typeof s.rememberMe === "boolean") setRememberMe(s.rememberMe);
      }
      if (from) {
        const f = JSON.parse(from);
        next.from = { ...next.from, ...f };
      }
      setState(next);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Debounced persistence
  useEffect(() => {
    if (!hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem("invoice-draft", JSON.stringify(state));
        localStorage.setItem(
          "invoice-settings",
          JSON.stringify({ currency: state.currency, template: state.template, rememberMe }),
        );
        if (rememberMe) {
          localStorage.setItem("invoice-from", JSON.stringify(state.from));
        }
      } catch {
        // ignore quota
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, rememberMe, hydrated]);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === state.currency) ?? CURRENCIES[0],
    [state.currency],
  );

  const fmt = useCallback(
    (n: number) => {
      const value = Number.isFinite(n) ? n : 0;
      try {
        const formatted = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
        return `${currency.symbol}${formatted}`;
      } catch {
        return `${currency.symbol}${value.toFixed(2)}`;
      }
    },
    [currency],
  );

  const totals = useMemo(() => {
    const subtotal = state.items.reduce((a, it) => a + (it.qty || 0) * (it.price || 0), 0);
    const discount =
      state.discountType === "percent"
        ? (subtotal * (state.discountValue || 0)) / 100
        : state.discountValue || 0;
    const afterDiscount = Math.max(0, subtotal - discount);
    const tax =
      state.taxMode === "global"
        ? (afterDiscount * (state.globalTax || 0)) / 100
        : state.items.reduce(
            (a, it) => a + ((it.qty || 0) * (it.price || 0) * (it.tax || 0)) / 100,
            0,
          );
    const total = afterDiscount + tax;
    return { subtotal, discount, tax, total };
  }, [state]);

  const updateFrom = (k: keyof InvoiceState["from"], v: string) =>
    setState((s) => ({ ...s, from: { ...s.from, [k]: v } }));
  const updateTo = (k: keyof InvoiceState["to"], v: string) =>
    setState((s) => ({ ...s, to: { ...s.to, [k]: v } }));
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  const addItem = () => setState((s) => ({ ...s, items: [...s.items, newItem()] }));
  const removeItem = (id: string) =>
    setState((s) => ({
      ...s,
      items: s.items.length > 1 ? s.items.filter((it) => it.id !== id) : s.items,
    }));

  const onLogoUpload = (file: File) => {
    if (!file) return;
    if (file.size > 600 * 1024) {
      toast.error("Logo too large. Please use an image under 600KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateFrom("logo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = document.getElementById("invoice-preview");
      if (!el) throw new Error("Preview not found");
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        // Multi-page slicing
        let heightLeft = imgH;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
      }
      pdf.save(`Invoice-${state.number || "draft"}.pdf`);
      bumpInvoiceCount();
      setState((s) => ({ ...s, number: nextInvoiceNumber() }));
      toast.success("Invoice downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const printInvoice = () => window.print();

  return (
    <ToolPageShell title={tool.name} description={tool.description} showFileDisclaimer={false}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-preview, #invoice-preview * { visibility: visible !important; }
          #invoice-preview {
            position: absolute !important;
            left: 0; top: 0;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 16mm !important;
          }
          @page { size: A4; margin: 0; }
        }
        .invoice-paper {
          background: #ffffff;
          color: #111827;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
          min-height: 297mm;
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
        }
        .invoice-paper h1, .invoice-paper h2, .invoice-paper h3 {
          color: #111827;
          margin: 0;
        }
        .invoice-paper table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .invoice-paper th, .invoice-paper td { padding: 10px 8px; text-align: left; }
        .invoice-paper th { font-weight: 600; }
        .invoice-paper .num { text-align: right; }

        /* Modern */
        .tpl-modern .inv-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 20px; border-bottom: 3px solid #06b6d4; margin-bottom: 24px;
        }
        .tpl-modern .inv-title { font-size: 36px; font-weight: 800; color: #06b6d4; letter-spacing: 2px; }
        .tpl-modern th { background: #ecfeff; color: #155e75; border-bottom: 2px solid #06b6d4; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        .tpl-modern tbody tr:nth-child(even) { background: #f8fafc; }
        .tpl-modern .totals-box { background: #f0fdfa; border-radius: 8px; padding: 16px; }
        .tpl-modern .grand { color: #06b6d4; font-size: 20px; font-weight: 800; }

        /* Classic */
        .tpl-classic .inv-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 16px; border-bottom: 2px solid #111827; margin-bottom: 24px;
        }
        .tpl-classic .inv-title { font-size: 30px; font-weight: 700; color: #111827; font-family: Georgia, serif; }
        .tpl-classic th { border-bottom: 2px solid #111827; color: #111827; }
        .tpl-classic td { border-bottom: 1px solid #e5e7eb; }
        .tpl-classic .grand { font-size: 18px; font-weight: 700; border-top: 2px solid #111827; }

        /* Minimal */
        .tpl-minimal .inv-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 40px;
        }
        .tpl-minimal .inv-title { font-size: 14px; font-weight: 500; color: #6b7280; letter-spacing: 4px; text-transform: uppercase; }
        .tpl-minimal th { color: #9ca3af; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; font-weight: 500; border-bottom: 1px solid #e5e7eb; }
        .tpl-minimal td { border-bottom: 1px solid #f3f4f6; }
        .tpl-minimal .grand { font-size: 22px; font-weight: 300; color: #111827; }

        .inv-section { margin-top: 24px; }
        .inv-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 4px; font-weight: 600; }
        .inv-meta-row { display: flex; gap: 16px; margin-top: 4px; font-size: 11px; color: #6b7280; }
        .inv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
      `}</style>

      {/* Top action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Template:
          </span>
          {(["modern", "classic", "minimal"] as Template[]).map((t) => (
            <button
              key={t}
              onClick={() => setState((s) => ({ ...s, template: t }))}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                state.template === t
                  ? "bg-[var(--cyan-brand)] text-black border-transparent"
                  : "bg-card border-border hover:border-foreground/30"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printInvoice}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={downloading}
            className="bg-[var(--cyan-brand)] text-black hover:bg-[var(--cyan-brand)]/90"
          >
            <Download className="w-4 h-4" /> {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* FORM */}
        <div className="space-y-5 print:hidden">
          {/* FROM */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">From</h2>
              <div className="flex items-center gap-2">
                <Label htmlFor="remember" className="text-xs text-muted-foreground">
                  Remember my details
                </Label>
                <Switch id="remember" checked={rememberMe} onCheckedChange={setRememberMe} />
              </div>
            </div>
            <div className="mb-4">
              <Label className="text-xs">Logo</Label>
              <div className="mt-2 flex items-center gap-3">
                {state.from.logo ? (
                  <img
                    src={state.from.logo}
                    alt="Logo"
                    className="w-16 h-16 rounded-md object-contain bg-white border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-secondary/50 border border-dashed border-border grid place-items-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary">
                  <Upload className="w-4 h-4" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onLogoUpload(e.target.files[0])}
                  />
                </label>
                {state.from.logo && (
                  <button
                    onClick={() => updateFrom("logo", "")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Business / Your Name *</Label>
                <Input
                  value={state.from.name}
                  onChange={(e) => updateFrom("name", e.target.value)}
                  placeholder="Acme Studio"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={state.from.email}
                  onChange={(e) => updateFrom("email", e.target.value)}
                  placeholder="hello@acme.com"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={state.from.phone}
                  onChange={(e) => updateFrom("phone", e.target.value)}
                  placeholder="+1 555 000 1234"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Address</Label>
                <Textarea
                  rows={2}
                  value={state.from.address}
                  onChange={(e) => updateFrom("address", e.target.value)}
                  placeholder="Street, City, Country"
                />
              </div>
            </div>
          </section>

          {/* TO */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-4">Bill To</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Client Name *</Label>
                <Input
                  value={state.to.name}
                  onChange={(e) => updateTo("name", e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Client Email</Label>
                <Input
                  type="email"
                  value={state.to.email}
                  onChange={(e) => updateTo("email", e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Client Address</Label>
                <Textarea
                  rows={2}
                  value={state.to.address}
                  onChange={(e) => updateTo("address", e.target.value)}
                  placeholder="Street, City, Country"
                />
              </div>
            </div>
          </section>

          {/* Invoice details */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-4">Invoice Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Invoice #</Label>
                <Input
                  value={state.number}
                  onChange={(e) => setState((s) => ({ ...s, number: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select
                  value={state.currency}
                  onValueChange={(v) => setState((s) => ({ ...s, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Invoice Date</Label>
                <Input
                  type="date"
                  value={state.date}
                  onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={state.dueDate}
                  onChange={(e) => setState((s) => ({ ...s, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Line Items</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Tax mode:</span>
                <button
                  onClick={() => setState((s) => ({ ...s, taxMode: "per-line" }))}
                  className={`px-2 py-1 rounded border ${
                    state.taxMode === "per-line"
                      ? "border-[var(--cyan-brand)] text-[var(--cyan-brand)]"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Per-line
                </button>
                <button
                  onClick={() => setState((s) => ({ ...s, taxMode: "global" }))}
                  className={`px-2 py-1 rounded border ${
                    state.taxMode === "global"
                      ? "border-[var(--cyan-brand)] text-[var(--cyan-brand)]"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Global
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {state.items.map((it) => {
                const sub = (it.qty || 0) * (it.price || 0);
                return (
                  <div
                    key={it.id}
                    className="grid gap-2 rounded-lg border border-border bg-background p-3"
                    style={{
                      gridTemplateColumns: "1fr",
                    }}
                  >
                    <Input
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Qty
                        </Label>
                        <Input
                          type="number"
                          min={0.01}
                          step="any"
                          value={it.qty}
                          onChange={(e) =>
                            updateItem(it.id, { qty: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Price
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={it.price}
                          onChange={(e) =>
                            updateItem(it.id, { price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      {state.taxMode === "per-line" && (
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Tax %
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={it.tax}
                            onChange={(e) =>
                              updateItem(it.id, { tax: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      )}
                      <div className={state.taxMode === "per-line" ? "" : "col-span-2"}>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Subtotal
                        </Label>
                        <div className="h-9 flex items-center justify-end px-2 rounded-md bg-secondary/50 text-sm font-mono">
                          {fmt(sub)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(it.id)}
                      disabled={state.items.length === 1}
                      className="self-end inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                );
              })}
              <Button variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>

            {/* Discount + global tax */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={state.discountValue}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        discountValue: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                  <Select
                    value={state.discountType}
                    onValueChange={(v) =>
                      setState((s) => ({ ...s, discountType: v as DiscountType }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">{currency.symbol}</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {state.taxMode === "global" && (
                <div>
                  <Label className="text-xs">Global Tax %</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={state.globalTax}
                    onChange={(e) =>
                      setState((s) => ({ ...s, globalTax: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-4">Notes & Terms</h2>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  value={state.notes}
                  onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Textarea
                  rows={2}
                  value={state.terms}
                  onChange={(e) => setState((s) => ({ ...s, terms: e.target.value }))}
                />
              </div>
            </div>
          </section>
        </div>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div
            id="invoice-preview"
            className={`invoice-paper tpl-${state.template}`}
          >
            <div className="inv-head">
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {state.from.logo && (
                  <img
                    src={state.from.logo}
                    alt="Logo"
                    style={{ width: 64, height: 64, objectFit: "contain" }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {state.from.name || "Your Business Name"}
                  </div>
                  {state.from.email && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{state.from.email}</div>
                  )}
                  {state.from.phone && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{state.from.phone}</div>
                  )}
                  {state.from.address && (
                    <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "pre-line" }}>
                      {state.from.address}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="inv-title">INVOICE</div>
                <div style={{ marginTop: 8, fontSize: 11 }}>
                  <div>
                    <strong>#</strong> {state.number}
                  </div>
                  <div>
                    <strong>Date:</strong> {state.date}
                  </div>
                  <div>
                    <strong>Due:</strong> {state.dueDate}
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-grid">
              <div>
                <div className="inv-label">Bill To</div>
                <div style={{ fontWeight: 600 }}>{state.to.name || "Client Name"}</div>
                {state.to.email && (
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{state.to.email}</div>
                )}
                {state.to.address && (
                  <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "pre-line" }}>
                    {state.to.address}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="inv-label">Amount Due</div>
                <div className="grand">{fmt(totals.total)}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Due {state.dueDate}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="num" style={{ width: 60 }}>
                    Qty
                  </th>
                  <th className="num" style={{ width: 90 }}>
                    Price
                  </th>
                  {state.taxMode === "per-line" && (
                    <th className="num" style={{ width: 60 }}>
                      Tax
                    </th>
                  )}
                  <th className="num" style={{ width: 100 }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.description || <span style={{ color: "#9ca3af" }}>—</span>}</td>
                    <td className="num">{it.qty || 0}</td>
                    <td className="num">{fmt(it.price || 0)}</td>
                    {state.taxMode === "per-line" && (
                      <td className="num">{it.tax || 0}%</td>
                    )}
                    <td className="num">{fmt((it.qty || 0) * (it.price || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="inv-section" style={{ display: "flex", justifyContent: "flex-end" }}>
              <div className={`totals-box ${state.template === "modern" ? "" : ""}`} style={{ minWidth: 240 }}>
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>{fmt(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="totals-row">
                    <span>Discount</span>
                    <span>-{fmt(totals.discount)}</span>
                  </div>
                )}
                {totals.tax > 0 && (
                  <div className="totals-row">
                    <span>Tax</span>
                    <span>{fmt(totals.tax)}</span>
                  </div>
                )}
                <div className="totals-row grand" style={{ marginTop: 8 }}>
                  <span>TOTAL</span>
                  <span>{fmt(totals.total)}</span>
                </div>
              </div>
            </div>

            {(state.notes || state.terms) && (
              <div className="inv-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {state.notes && (
                  <div>
                    <div className="inv-label">Notes</div>
                    <div style={{ whiteSpace: "pre-line", fontSize: 11 }}>{state.notes}</div>
                  </div>
                )}
                {state.terms && (
                  <div>
                    <div className="inv-label">Payment Terms</div>
                    <div style={{ whiteSpace: "pre-line", fontSize: 11 }}>{state.terms}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky download */}
      <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 print:hidden">
        <Button
          onClick={downloadPDF}
          disabled={downloading}
          className="w-full bg-[var(--cyan-brand)] text-black hover:bg-[var(--cyan-brand)]/90 shadow-2xl"
          size="lg"
        >
          <Download className="w-4 h-4" /> {downloading ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      <HowToUse
        steps={[
          "Fill in your business details on the left, upload your logo, and add your client.",
          "Add line items with description, quantity, price, and optional tax. Pick a currency and template.",
          "Click Download PDF to save your invoice, or Print to send directly to a printer.",
        ]}
      />

      <ToolSeoContent
        title="Free Invoice Generator — Create Professional PDF Invoices Online"
        description="Generate beautiful, professional invoices in seconds. Multi-currency, 3 templates, live preview, instant PDF download — 100% free and private."
        body={[
          "Our free Invoice Generator helps freelancers, small businesses, and consultants create polished invoices without signing up or installing software. Just fill in your business name, client details, and line items — the live preview updates as you type, so you know exactly how your invoice will look before you download it.",
          "Pick from three professional templates (Modern, Classic, Minimal) to match your brand. Choose from 9 currencies including USD, EUR, GBP, MAD, SAR, AED, CAD, AUD, and JPY. Add per-line or global tax, apply flat or percentage discounts, and include notes and payment terms — everything you need to bill clients professionally.",
          "Privacy comes first: nothing leaves your browser. Your invoice data, logo, and client info are saved locally on your device using your browser's storage. When you're ready, download a print-ready PDF or send it straight to your printer. No watermarks, no signup, no limits.",
        ]}
        faqs={[
          {
            question: "Is this invoice generator really free?",
            answer:
              "Yes — completely free with no signup, no watermarks, and no limits on how many invoices you create. All features including PDF download, multi-currency, and templates are unlocked.",
          },
          {
            question: "Where is my invoice data stored?",
            answer:
              "Everything is stored locally in your browser using localStorage. Your data never touches our servers, making it private and secure. Clearing your browser data will remove saved invoices.",
          },
          {
            question: "Can I edit an invoice after I download it?",
            answer:
              "Yes — your last draft is automatically saved. Come back any time, make changes, and download a new PDF. The invoice number auto-increments after each download.",
          },
          {
            question: "Which currencies are supported?",
            answer:
              "We support USD, EUR, GBP, MAD (Moroccan Dirham), SAR (Saudi Riyal), AED (UAE Dirham), CAD, AUD, and JPY. The selected currency symbol appears throughout your invoice and PDF.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
