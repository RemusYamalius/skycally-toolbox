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

function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type P = {
      x: number; y: number; vx: number; vy: number;
      r: number; baseOpacity: number; color: string;
      wobbleAmp: number; wobbleSpeed: number; wobblePhase: number;
      pulseSpeed: number; pulsePhase: number;
    };

    let w = 0, h = 0, dpr = 1;
    let particles: P[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const makeParticles = () => {
      const isMobile = w < 640;
      const count = isMobile ? 28 : 48;
      particles = new Array(count).fill(0).map(() => {
        const big = Math.random() < 0.15;
        const violet = Math.random() < 0.45;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: rand(-35, 35),
          vy: rand(-30, 30),
          r: big ? rand(6, 11) : rand(1.2, 3.8),
          baseOpacity: big ? rand(0.15, 0.28) : rand(0.35, 0.7),
          color: violet ? "139, 92, 246" : "0, 212, 255",
          wobbleAmp: rand(8, 26),
          wobbleSpeed: rand(0.4, 1.2),
          wobblePhase: Math.random() * Math.PI * 2,
          pulseSpeed: rand(0.6, 1.8),
          pulsePhase: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) makeParticles();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let last = performance.now();
    let rafId = 0;
    let running = true;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const t = now / 1000;
      for (const p of particles) {
        p.x += (p.vx + Math.sin(t * p.wobbleSpeed + p.wobblePhase) * p.wobbleAmp * 0.15) * dt;
        p.y += (p.vy + Math.cos(t * p.wobbleSpeed * 0.8 + p.wobblePhase) * p.wobbleAmp * 0.1) * dt;

        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;

        const pulse = 0.75 + 0.25 * Math.sin(t * p.pulseSpeed + p.pulsePhase);
        const op = p.baseOpacity * pulse;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `rgba(${p.color}, ${op})`);
        grad.addColorStop(0.4, `rgba(${p.color}, ${op * 0.4})`);
        grad.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${p.color}, ${Math.min(1, op * 1.6)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) rafId = requestAnimationFrame(step);
    };

    if (reduced) {
      // draw a single static frame
      step(performance.now());
      running = false;
    } else {
      rafId = requestAnimationFrame(step);
    }

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!reduced && !running) {
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

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

        {/* Floating particles (canvas — animates on desktop AND mobile) */}
        <HeroParticles />

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

          <div className="hero-fade-up-delay2 relative z-[70] mt-10 max-w-xl mx-auto">
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
                  borderRadius: "1rem",
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
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden text-left z-[80] animate-fade-in"
                style={{
                  background: "linear-gradient(180deg, oklch(0.17 0.045 270), oklch(0.125 0.04 270))",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,212,255,0.08)",
                }}
                onMouseDown={(e) => e.preventDefault()}
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
