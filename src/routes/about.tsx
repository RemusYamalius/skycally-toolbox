import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta, SITE_URL } from "@/lib/seo";
import { TOOL_COUNT } from "@/lib/tools";

export const Route = createFileRoute("/about")({
  head: () => {
    const title = `About Skycally — ${TOOL_COUNT}+ Free Browser Tools, No Signup Required`;
    const description = `Skycally is a free online toolkit with ${TOOL_COUNT}+ tools for images, PDFs, video, audio, calculators and more. Everything runs in your browser — no signup, no uploads, no limits.`;
    const base = buildPageMeta({ title, description, path: "/about" });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Skycally",
            description,
            url: `${SITE_URL}/about`,
            mainEntity: {
              "@type": "Organization",
              name: "Skycally",
              url: SITE_URL,
              description: `A free online toolkit with ${TOOL_COUNT}+ browser-based tools — no signup required.`,
            },
          }),
        },
      ],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 text-[16px] leading-[1.8]">
      <header className="mb-12">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">About Skycally</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Skycally is a free, browser-based toolkit with {TOOL_COUNT}+ tools for images, PDFs, video, audio, text,
          finance, and more — all running directly in your browser. No account. No file uploads. No paywalls.
        </p>
      </header>

      {/* Mission */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-muted-foreground">
          We believe the best online tools should be fast, private, and free — without tricks. Too many websites bury
          useful utilities behind signups, file size limits, watermarks, or paywalls. Skycally exists to change that.
          Every tool on this platform is completely free to use, requires no registration, and processes your files
          locally in your browser wherever possible.
        </p>
        <p className="text-muted-foreground mt-4">
          Whether you need to compress an image, convert a PDF, calculate compound interest, generate a strong password,
          or extract text from a photo — Skycally has you covered with a clean, fast, ad-light experience.
        </p>
      </section>

      {/* Privacy first */}
      <section className="mb-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-bold mb-4">Privacy by Default</h2>
        <p className="text-muted-foreground">
          The majority of Skycally tools run entirely in your browser using JavaScript and WebAssembly. This means your
          files, documents, and images are processed locally on your device and{" "}
          <strong className="text-foreground">never transmitted to any server</strong>. We cannot see, access, or store
          your files — because they never reach us in the first place.
        </p>
        <p className="text-muted-foreground mt-4">
          A small number of tools require server-side processing: our AI generation tools (AI Cover Letter Generator, AI
          Resume Builder, AI Email Writer, AI Bio Generator, and AI Image Generator) send your prompt to an AI provider
          to generate a result, and a small number of media tools (such as Audio Converter) process files briefly on our
          server. In every case, data is sent securely over HTTPS and is not stored beyond what's needed to return your
          result — see our{" "}
          <Link to="/privacy" className="text-foreground underline underline-offset-2 hover:opacity-80">
            Privacy Policy
          </Link>{" "}
          for full details.
        </p>
      </section>

      {/* What we offer */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-4">What We Offer</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: "🖼️", title: "Image Tools", desc: "Compress, convert, upscale, remove backgrounds, and more." },
            { icon: "📄", title: "PDF Tools", desc: "Merge, compress, convert to Word, remove watermarks." },
            {
              icon: "🧮",
              title: "Finance Calculators",
              desc: "Loan, compound interest, mortgage, EMI, car loan, tip.",
            },
            { icon: "🔤", title: "Text & Code", desc: "Word counter, JSON formatter, Base64, Markdown to HTML." },
            { icon: "🎨", title: "Design Utilities", desc: "Color picker, QR generator, password generator." },
            { icon: "🎮", title: "Games & Fun", desc: "Tetris, Chess, 2048, Flappy Bird, Typing Speed Test." },
            { icon: "📡", title: "Network Tools", desc: "IP lookup, DNS leak test, WebRTC leak test, speed test." },
            { icon: "🤖", title: "AI-Powered", desc: "Image to text (OCR), remove background, upscale images." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-4">Our Principles</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">✓</span>
            <span>
              <strong className="text-foreground">Free forever.</strong> Every tool on Skycally is free to use with no
              hidden tiers or usage limits.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">✓</span>
            <span>
              <strong className="text-foreground">No registration.</strong> You never need to create an account or
              provide an email address.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">✓</span>
            <span>
              <strong className="text-foreground">Privacy first.</strong> Most tools process files locally in your
              browser. Nothing is stored on our servers.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">✓</span>
            <span>
              <strong className="text-foreground">No watermarks.</strong> Downloads are clean — no branding, no
              watermarks, no strings attached.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">✓</span>
            <span>
              <strong className="text-foreground">Fast and lightweight.</strong> Tools load instantly and work on any
              device — desktop, tablet, or mobile.
            </span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="font-display text-xl font-bold mb-2">Ready to get started?</h2>
        <p className="text-muted-foreground text-sm mb-5">Browse all {TOOL_COUNT}+ tools — no signup needed.</p>
        <Link
          to="/tools"
          className="inline-block rounded-xl bg-foreground text-background font-semibold px-6 py-3 hover:opacity-90 transition"
        >
          Explore all tools →
        </Link>
      </section>

      {/* Contact */}
      <section className="mt-10 text-sm text-muted-foreground text-center">
        <p>
          Questions or suggestions?{" "}
          <Link to="/contact" className="text-foreground underline underline-offset-2 hover:opacity-80">
            Get in touch
          </Link>{" "}
          — we read every message.
        </p>
      </section>
    </div>
  );
}
