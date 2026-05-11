import { Link } from "@tanstack/react-router";

import { tools, categoryMeta, toolInCategory, type ToolCategory } from "@/lib/tools";
import qrCodeImage from "@/assets/skycally-qrcode.webp";

const categoryOrder: ToolCategory[] = ["ai", "video", "image", "audio", "pdf", "text"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center">
            <img src="/logo.webp" alt="Skycally" width="173" height="30" decoding="async" style={{ height: "30px", width: "auto" }} />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">Every tool you need, one place. Fast, free, and private — no registration required.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition">Home</Link></li>
            <li><Link to="/tools" className="hover:text-foreground transition">All Tools</Link></li>
            <li><Link to="/about" className="hover:text-foreground transition">About</Link></li>
            <li><Link to="/contact" className="hover:text-foreground transition">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition">Terms</Link></li>
          </ul>
        </div>
        <div>
          <img src={qrCodeImage} alt="QR code linking to skycally.com" loading="lazy" decoding="async" width="100" height="100" className="rounded-lg w-[100px] h-[100px]" />
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h4 className="text-sm font-semibold mb-6 text-foreground/80">Explore all tools</h4>
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {categoryOrder.map((c) => {
              const meta = categoryMeta[c];
              const list = tools.filter((t) => toolInCategory(t, c));
              return (
                <div key={c}>
                  <h5
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {list.map((t) => (
                      <li key={t.slug}>
                        <Link to={t.path} className="hover:text-foreground transition">{t.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2025 Skycally.com · <Link to="/privacy" className="hover:text-foreground">Privacy</Link> · <Link to="/terms" className="hover:text-foreground">Terms</Link> · <Link to="/contact" className="hover:text-foreground">Contact</Link></p>
          <p>Free online tools — no registration required</p>
        </div>
      </div>
    </footer>
  );
}
