import { Link } from "@tanstack/react-router";
import { tools, categoryMeta, toolInCategory, type ToolCategory } from "@/lib/tools";

const categoryOrder: ToolCategory[] = ["ai", "video", "image", "audio", "pdf", "text", "utility", "games", "minigames"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/30">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center">
            <img
              src="/logo.webp"
              alt="Skycally"
              width="200"
              height="35"
              decoding="async"
              style={{ height: "30px", width: "auto" }}
            />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
            90+ free browser-based tools — no signup, no uploads, no limits. Fast, private, and always free.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://www.pinterest.com/skycallytools/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              aria-label="Skycally on Pinterest"
            >
              📌 Pinterest
            </a>
            <a
              href="https://www.youtube.com/@Skycally"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              aria-label="Skycally on YouTube"
            >
              ▶️ YouTube
            </a>
            <a
              href="https://x.com/skycallytools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              aria-label="Skycally on X"
            >
              X / Twitter
            </a>
            <a
              href="https://www.producthunt.com/products/skycally"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              aria-label="Skycally on Product Hunt"
            >
              🚀 Product Hunt
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground transition">
                Home
              </Link>
            </li>
            <li>
              <Link to="/tools" className="hover:text-foreground transition">
                All Tools
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-foreground transition">
                Blog
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground transition">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground transition">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Popular Tools */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Popular Tools</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/tools/loan-calculator" className="hover:text-foreground transition">
                Loan Calculator
              </Link>
            </li>
            <li>
              <Link to="/tools/compound-interest" className="hover:text-foreground transition">
                Compound Interest
              </Link>
            </li>
            <li>
              <Link to="/tools/image-compressor" className="hover:text-foreground transition">
                Image Compressor
              </Link>
            </li>
            <li>
              <Link to="/tools/pdf-to-word" className="hover:text-foreground transition">
                PDF to Word
              </Link>
            </li>
            <li>
              <Link to="/tools/remove-background" className="hover:text-foreground transition">
                Remove Background
              </Link>
            </li>
            <li>
              <Link to="/tools/password-generator" className="hover:text-foreground transition">
                Password Generator
              </Link>
            </li>
            <li>
              <Link to="/tools/word-counter" className="hover:text-foreground transition">
                Word Counter
              </Link>
            </li>
            <li>
              <Link to="/tools/image-to-text" className="hover:text-foreground transition">
                Image to Text (OCR)
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-foreground transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground transition">
                Contact Us
              </Link>
            </li>
          </ul>
          <div className="mt-6 rounded-xl border border-border bg-card/50 p-3 text-xs text-muted-foreground leading-relaxed">
            🔒 Your files never leave your device.
          </div>
        </div>
      </div>

      {/* All tools by category */}
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h4 className="text-sm font-semibold mb-6 text-foreground/80">Explore all tools</h4>
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
            {categoryOrder.map((c) => {
              const meta = categoryMeta[c];
              const list = tools.filter((t) => toolInCategory(t, c));
              return (
                <div key={c}>
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: meta.color }}>
                    {meta.label}
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {list
                      .filter((t) => !t.hidden)
                      .map((t) => (
                        <li key={t.slug}>
                          <Link to={t.path} className="hover:text-foreground transition">
                            {t.name}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            {"© "}
            {new Date().getFullYear()}
            {" Skycally.com · "}
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            {" · "}
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            {" · "}
            <Link to="/contact" className="hover:text-foreground">
              Contact
            </Link>
          </p>
          <p>Free online tools — no registration required</p>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="https://fazier.com/launches/skycally.com" target="_blank" rel="noopener noreferrer">
              <img
                src="https://fazier.com/api/v1/public/badges/launch_badges.svg?badge_type=launched&theme=dark"
                width={120}
                alt="Launched on Fazier"
                className="opacity-70 hover:opacity-100 transition-opacity"
              />
            </a>
            <a
              href="https://www.producthunt.com/products/skycally?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-skycally"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1158564&theme=neutral&t=1780398527058"
                width={250}
                height={54}
                alt="Skycally on Product Hunt"
                className="opacity-70 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
