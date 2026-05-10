import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Zap, Globe, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// 🔧 Replace with your real Formspree form ID after signing up at https://formspree.io
const FORMSPREE_ID = "mbdwpooo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Skycally — Questions, Bug Reports & Feedback" },
      { name: "description", content: "Get in touch with the Skycally team. Ask a question, report a bug, request a feature or send a business inquiry. We reply within 24 hours." },
      { property: "og:title", content: "Contact Skycally" },
      { property: "og:description", content: "Have a question, suggestion, or found a bug? We'd love to hear from you." },
      { property: "og:url", content: "https://skycally.com/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contact Skycally" },
      { name: "twitter:description", content: "Questions, bug reports and feature requests welcome." },
    ],
    links: [{ rel: "canonical", href: "https://skycally.com/contact" }],
  }),
  component: ContactPage,
});

const SUBJECTS = [
  "General Question",
  "Bug Report",
  "Feature Request",
  "Business Inquiry",
  "Other",
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.enum(SUBJECTS),
  message: z.string().trim().min(1, "Please write a message").max(2000, "Message is too long (max 2000 chars)"),
});

type FormState = z.infer<typeof schema>;
type Status = "idle" | "submitting" | "success" | "error";

const FAQS = [
  {
    q: "Is Skycally completely free?",
    a: "Yes! All tools on Skycally are 100% free with no signup required. We may offer optional premium features in the future, but our core tools will always remain free.",
  },
  {
    q: "Are my files stored on your servers?",
    a: "No. Most tools run entirely in your browser — your files never leave your device. For tools that require server processing (like video downloading), files are processed and immediately deleted.",
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: "Use the contact form above or select \"Bug Report\" or \"Feature Request\" from the subject dropdown. We read every message and use your feedback to improve Skycally.",
  },
  {
    q: "Can I use Skycally on mobile?",
    a: "Absolutely! Skycally is fully responsive and works on all devices — phones, tablets, and desktops.",
  },
  {
    q: "Do you have an API?",
    a: "Not yet publicly, but we're working on it. If you're interested in API access, contact us with your use case.",
  },
];

function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "General Question",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<Status>("idle");

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setForm({ name: "", email: "", subject: "General Question", message: "" });
      toast.success("Message sent — thank you!");
    } catch {
      setStatus("error");
      toast.error("Could not send your message");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Hero */}
      <header className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight">
          Get in <span className="text-gradient">Touch</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question, suggestion, or found a bug? We'd love to hear from you.
        </p>
      </header>

      {/* Form */}
      <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name *</label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="mt-2 bg-background/50 focus-visible:ring-cyan-500"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email *</label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="your@email.com"
                maxLength={255}
                className="mt-2 bg-background/50 focus-visible:ring-cyan-500"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
            <Select value={form.subject} onValueChange={(v) => update("subject", v as FormState["subject"])}>
              <SelectTrigger className="mt-2 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="message" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message *</label>
            <Textarea
              id="message"
              rows={5}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="Describe your issue or suggestion..."
              maxLength={2000}
              className="mt-2 bg-background/50 focus-visible:ring-cyan-500 resize-y"
              aria-invalid={!!errors.message}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-red-400">{errors.message ?? " "}</span>
              <span className="text-muted-foreground">{form.message.length}/2000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-8 py-3 text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "submitting" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>✅ Message sent! We'll get back to you within 24 hours.</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>❌ Something went wrong. Please try emailing us directly at <a href="mailto:support@skycally.com" className="underline">support@skycally.com</a>.</span>
            </div>
          )}
        </form>
      </section>

      {/* Info cards */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { Icon: Mail, title: "Email Us", value: "support@skycally.com", sub: "We reply within 24 hours", color: "var(--cyan-brand)" },
          { Icon: Zap, title: "Quick Response", value: "24 hours", sub: "Monday to Friday", color: "var(--violet-brand)" },
          { Icon: Globe, title: "Follow Us", value: "@skycally", sub: "Updates and tips", color: "#22c55e" },
        ].map((c) => (
          <div key={c.title} className="bg-card border border-border rounded-2xl p-5 transition hover:border-foreground/20 hover:-translate-y-0.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `color-mix(in oklab, ${c.color} 15%, transparent)`, color: c.color }}
            >
              <c.Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold">{c.title}</h3>
            <p className="mt-1 font-medium">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="bg-card border border-border rounded-2xl px-6">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
