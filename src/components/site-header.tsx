import { Link } from "@tanstack/react-router";
import { Moon, Sun, Menu, X, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useTheme } from "./theme-provider";
import { categoryMeta, type ToolCategory } from "@/lib/tools";

// Same category list used by /tools' filter buttons — deliberately excludes
// "seo" since that category is intentionally unlinked site-wide for now.
const NAV_CATS: ToolCategory[] = ["ai", "video", "image", "audio", "pdf", "text", "utility", "games", "minigames"];

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [desktopToolsOpen, setDesktopToolsOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const links = [
    { to: "/blog", label: "Blog" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ] as const;

  const openToolsMenu = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setDesktopToolsOpen(true);
  };
  const closeToolsMenuSoon = () => {
    closeTimer.current = window.setTimeout(() => setDesktopToolsOpen(false), 150);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 md:bg-background/70 max-md:bg-background/95 border-b border-border gpu-isolate mobile-no-backdrop">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center">
          <img
            src="/logo.webp"
            alt="Skycally"
            width="200"
            height="35"
            decoding="async"
            fetchPriority="high"
            style={{ height: "38px", width: "auto" }}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
            activeProps={{ className: "text-foreground" }}
          >
            Home
          </Link>

          {/* Tools — hover mega-menu on desktop. The link itself still goes
              straight to /tools; the chevron/hover area reveals categories
              so browsing a specific category doesn't require a stop at the
              full unfiltered list first. */}
          <div className="relative" onMouseEnter={openToolsMenu} onMouseLeave={closeToolsMenuSoon}>
            <Link
              to="/tools"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
              activeProps={{ className: "text-foreground" }}
              aria-expanded={desktopToolsOpen}
            >
              Tools
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${desktopToolsOpen ? "rotate-180" : ""}`} />
            </Link>

            {desktopToolsOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[420px]"
                onMouseEnter={openToolsMenu}
                onMouseLeave={closeToolsMenuSoon}
              >
                <div className="rounded-2xl border border-border bg-card shadow-xl p-3">
                  <div className="grid grid-cols-2 gap-1">
                    {NAV_CATS.map((c) => {
                      const meta = categoryMeta[c];
                      return (
                        <Link
                          key={c}
                          to="/tools"
                          search={{ cat: c }}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary"
                          onClick={() => setDesktopToolsOpen(false)}
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                            style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)` }}
                            aria-hidden
                          >
                            {meta.icon}
                          </span>
                          <span className="font-medium">{meta.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    to="/tools"
                    className="mt-1 flex items-center justify-center rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-secondary transition"
                    onClick={() => setDesktopToolsOpen(false)}
                  >
                    Browse all tools
                  </Link>
                </div>
              </div>
            )}
          </div>

          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle theme" className="p-2 rounded-lg hover:bg-secondary transition">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="md:hidden p-2 rounded-lg hover:bg-secondary"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-1">
          <Link to="/" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
            Home
          </Link>

          {/* Tools — no hover on touch devices, so this becomes a tap-to-expand
              accordion instead. The row itself toggles the category list;
              "Browse all tools" inside it is the direct link to /tools. */}
          <button
            onClick={() => setMobileToolsOpen((v) => !v)}
            className="flex items-center justify-between py-2 text-sm font-medium text-left"
            aria-expanded={mobileToolsOpen}
          >
            Tools
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileToolsOpen && (
            <div className="pl-3 pb-2 flex flex-col gap-1 border-l border-border ml-1">
              <Link
                to="/tools"
                onClick={() => {
                  setOpen(false);
                  setMobileToolsOpen(false);
                }}
                className="py-2 text-sm font-semibold text-[var(--cyan-brand)]"
              >
                Browse all tools
              </Link>
              {NAV_CATS.map((c) => {
                const meta = categoryMeta[c];
                return (
                  <Link
                    key={c}
                    to="/tools"
                    search={{ cat: c }}
                    onClick={() => {
                      setOpen(false);
                      setMobileToolsOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 text-sm text-muted-foreground"
                  >
                    <span aria-hidden>{meta.icon}</span>
                    {meta.label}
                  </Link>
                );
              })}
            </div>
          )}

          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
