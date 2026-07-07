import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  Type,
  Sparkles,
  Wrench,
  Gamepad2,
  Joystick,
  ArrowRight,
  Zap,
  Shield,
  Star,
  BarChart3,
} from "lucide-react";

import { tools, categoryMeta, type ToolCategory } from "@/lib/tools";
import { buildPageMeta } from "@/lib/seo";

const HomeBelowFold = lazy(() => import("@/components/home/home-below-fold"));

const HOME_META = buildPageMeta({
  title: "Skycally — 90+ Free Online Tools, No Signup Required",
  description:
    "90+ free browser-based tools for images, videos, PDFs, audio and more. No signup, no file uploads. Everything runs instantly in your browser.",
  path: "/",
});

export const Route = createFileRoute("/")({
  head: () => ({
    ...HOME_META,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Skycally",
          url: "https://skycally.com",
          description: "Free online tools — video converter, image editor, PDF tools, QR code generator and more.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://skycally.com/tools?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  component: HomePage,
});

const QUICK_CATS = [
  { icon: Video, label: "Video", cat: "video" as const },
  { icon: ImageIcon, label: "Image", cat: "image" as const },
  { icon: Music, label: "Audio", cat: "audio" as const },
  { icon: FileText, label: "PDF", cat: "pdf" as const },
  { icon: Type, label: "Text", cat: "text" as const },
  { icon: BarChart3, label: "SEO", cat: "seo" as const },
  { icon: Wrench, label: "Utility", cat: "utility" as const },
  { icon: Gamepad2, label: "Games", cat: "games" as const },
  { icon: Joystick, label: "Mini Games", cat: "minigames" as const },
  { icon: Sparkles, label: "AI", cat: "ai" as const },
];

const STATS = [
  { value: "90+", label: "Free Tools" },
  { value: "100%", label: "Browser-Based" },
  { value: "0", label: "Sign-ups Needed" },
  { value: "∞", label: "Free Forever" },
];

const TRUST_BADGES = [
  { icon: Zap, text: "Instant results" },
  { icon: Shield, text: "Private & secure" },
  { icon: Star, text: "No watermarks" },
];

const TYPED_WORDS = ["Images", "Videos", "PDFs", "Audio", "Text", "Links"];

function TypedWord() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const word = TYPED_WORDS[idx];
    if (!deleting && displayed.length < word.length) {
      ref.current = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      ref.current = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      ref.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % TYPED_WORDS.length);
    }
    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
  }, [displayed, deleting, idx]);

  return (
    <span className="relative inline-block min-w-[180px] sm:min-w-[260px]" style={{ color: "var(--cyan-brand)" }}>
      {displayed}
      <span
        className="inline-block w-0.5 h-[0.85em] ml-0.5 align-middle rounded-sm animate-pulse"
        style={{ background: "var(--cyan-brand)", verticalAlign: "middle" }}
      />
    </span>
  );
}

function HomePage() {
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => tools.filter((t) => !t.hidden && (t.name + t.description).toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // Defer below-fold load until after hero is painted (idle callback, then observer).
  useEffect(() => {
    if (belowFoldReady) return;
    const ric =
      (window as any).requestIdleCallback ||
      ((cb: () => void) => setTimeout(cb, 1));
    const cancel =
      (window as any).cancelIdleCallback ||
      ((id: any) => clearTimeout(id));
    const id = ric(() => setBelowFoldReady(true));
    return () => cancel(id);
  }, [belowFoldReady]);

  return (
    <>
      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden bg-hero text-white gpu-isolate mobile-no-backdrop"
        style={{ minHeight: "92vh", display: "flex", alignItems: "center" }}
      >
        <div className="absolute inset-0 grid-overlay opacity-40" />

        <div
          className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,212,255,0.22) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)" }}
        />

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="hero-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold backdrop-blur-md uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--cyan-brand)" }} />
              Free · Fast · Private · No signup
            </span>
          </div>

          <h1
            className="hero-fade-up mt-8 font-display font-extrabold tracking-tight leading-[1.04]"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)" }}
          >
            The Free Tool
            <br />
            for Your <TypedWord />
          </h1>

          <p
            className="hero-fade-up-delay mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            90+ browser-based tools that run entirely on your device.
            <br className="hidden sm:block" />
            No uploads. No accounts. No waiting.
          </p>

          <div className="hero-fade-up-delay mt-5 flex flex-wrap items-center justify-center gap-4">
            {TRUST_BADGES.map((b) => (
              <span
                key={b.text}
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <b.icon className="w-3.5 h-3.5" style={{ color: "var(--cyan-brand)" }} />
                {b.text}
              </span>
            ))}
          </div>

          <div className="hero-fade-up-delay2 mt-10 max-w-xl mx-auto">
            <div
              className="relative group"
              onClick={() => {
                setSearchOpen(true);
                searchRef.current?.focus();
              }}
            >
              <div
                className="absolute -inset-px rounded-2xl transition-opacity duration-300 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(0,212,255,0.5), rgba(139,92,246,0.5))",
                  opacity: searchOpen ? 1 : 0,
                  borderRadius: "inherit",
                }}
              />
              <div
                className="relative rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  placeholder='Search 90+ tools... (press "/")'
                  className="w-full bg-transparent pl-12 pr-4 py-4 text-base placeholder:text-white/35 focus:outline-none text-white"
                />
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/30 font-mono">
                  /
                </kbd>
              </div>
            </div>

            {searchOpen && q.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden text-left z-50 animate-fade-in"
                style={{
                  background: "rgba(10,10,30,0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  maxWidth: "36rem",
                  margin: "8px auto 0",
                }}
              >
                {filtered.slice(0, 7).map((t) => (
                  <Link
                    key={t.slug}
                    to={t.path}
                    className="flex items-center gap-3 px-4 py-3 transition"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in oklab, ${categoryMeta[t.category].color} 15%, transparent)`,
                      }}
                    >
                      <t.icon className="w-4 h-4" style={{ color: categoryMeta[t.category].color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {t.description.slice(0, 55)}…
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                  </Link>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-5 text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                    No tools found for "{q}"
                  </div>
                )}
                {filtered.length > 7 && (
                  <Link
                    to="/tools"
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition"
                    style={{ color: "var(--cyan-brand)" }}
                  >
                    See all {filtered.length} results <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="hero-fade-up-delay2 mt-8 flex flex-wrap items-center justify-center gap-2">
            {QUICK_CATS.map((c) => (
              <Link
                key={c.label}
                to="/tools"
                search={{ cat: c.cat }}
                className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = `color-mix(in oklab, ${categoryMeta[c.cat].color} 14%, transparent)`;
                  el.style.borderColor = `color-mix(in oklab, ${categoryMeta[c.cat].color} 40%, transparent)`;
                  el.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.06)";
                  el.style.borderColor = "rgba(255,255,255,0.1)";
                  el.style.color = "rgba(255,255,255,0.75)";
                }}
              >
                <c.icon className="w-3.5 h-3.5" style={{ color: categoryMeta[c.cat].color }} />
                {c.label}
              </Link>
            ))}
          </div>

          <div
            className="hero-fade-up-delay2 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px max-w-2xl mx-auto rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.08)" }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center py-5 px-4"
                style={{ background: "rgba(10,10,26,0.8)", backdropFilter: "blur(10px)" }}
              >
                <span
                  className="text-2xl sm:text-3xl font-black"
                  style={{ color: "var(--cyan-brand)", textShadow: "0 0 20px rgba(0,212,255,0.4)" }}
                >
                  {s.value}
                </span>
                <span className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BODY (lazy) ===== */}
      {belowFoldReady && (
        <Suspense fallback={<div style={{ minHeight: 800 }} />}>
          <HomeBelowFold />
        </Suspense>
      )}

      {/* SEO nav — crawlable */}
      <nav aria-label="All tools" className="sr-only">
        <ul>
          {tools
            .filter((t) => !t.hidden)
            .map((t) => (
              <li key={t.slug}>
                <Link to={t.path}>{t.name}</Link>
              </li>
            ))}
        </ul>
      </nav>
    </>
  );
}
