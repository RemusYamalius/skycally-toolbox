import { Link } from "@tanstack/react-router";
import { Sparkle } from "lucide-react";
import { tools, categoryMeta, type ToolCategory } from "@/lib/tools";

export function SiteFooter() {
  const cats = Object.keys(categoryMeta) as ToolCategory[];
  return (
    <footer className="mt-24 border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <Link to="/" className="flex items-center gap-1.5 font-display font-bold text-xl">
            Sky<Sparkle className="w-4 h-4" style={{ color: "var(--cyan-brand)" }} fill="currentColor" />cally
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">Every tool you need, one place. Fast, free, and private — no registration required.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/tools" className="hover:text-foreground">All Tools</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Categories</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {cats.map((c) => {
              const list = tools.filter((t) => t.category === c).slice(0, 3);
              return (
                <li key={c}>
                  <span className="text-foreground/80 font-medium">{categoryMeta[c].label}</span>
                  <span className="ml-2">{list.map((t) => t.name).join(" · ")}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2025 Skycally.com · <Link to="/privacy" className="hover:text-foreground">Privacy</Link> · <Link to="/terms" className="hover:text-foreground">Terms</Link></p>
          <p>Free online tools — no registration required</p>
        </div>
      </div>
    </footer>
  );
}
