import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Search,
  Upload,
  Wand2,
  ArrowDown,
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
} from "lucide-react";

import { tools, categoryMeta, toolInCategory, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";
import { AdZone } from "@/components/ad-zone";
import { buildPageMeta } from "@/lib/seo";

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

/* ---------- Data ---------- */
const POPULAR_SLUGS = [
  "compress-pdf",
  "remove-bg",
  "image-converter",
  "qr-generator",
  "video-to-gif",
  "word-to-pdf",
  "currency-converter",
  "satoshi-converter",
  "unit-converter",
  "ball-sort",
];

const ALL_CATS: ToolCategory[] = ["video", "image", "audio", "pdf", "text", "utility", "games", "minigames", "ai"];

const CATEGORY_TAGLINES: Record<ToolCategory, string> = {
  ai: "Run AI models in your browser — no server, no cost.",
  video: "Download, convert, compress and record videos in seconds.",
  image: "Convert, compress, upscale and edit images instantly.",
  audio: "Convert, transcribe and synthesize audio fast.",
  pdf: "Merge, split, convert and extract from PDFs.",
  text: "Generate, format, encode and analyze text effortlessly.",
  utility: "Calculators, converters and everyday utilities.",
  games: "Spinning wheels, role assignments, team makers and more.",
  minigames: "Play Wordle, 2048, Ball Sort and more — no download needed.",
};

const QUICK_CATS = [
  { icon: Video, label: "Video", cat: "video" as const },
  { icon: ImageIcon, label: "Image", cat: "image" as const },
  { icon: Music, label: "Audio", cat: "audio" as const },
  { icon: FileText, label: "PDF", cat: "pdf" as const },
  { icon: Type, label: "Text", cat: "text" as const },
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

/* ---------- Animated typing hero ---------- */
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

/* ---------- Floating particle ---------- */
function Particle({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, opacity: 0.18 }}
      animate={{ y: [0, -30, 0], opacity: [0.18, 0.32, 0.18] }}
      transition={{ duration: 5 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const PARTICLES = [
  { x: 8, y: 20, size: 6, delay: 0, color: "#00D4FF" },
  { x: 92, y: 15, size: 4, delay: 1.2, color: "#8B5CF6" },
  { x: 15, y: 75, size: 5, delay: 0.8, color: "#00D4FF" },
  { x: 85, y: 65, size: 7, delay: 2, color: "#8B5CF6" },
  { x: 50, y: 10, size: 3, delay: 1.5, color: "#00D4FF" },
  { x: 72, y: 85, size: 5, delay: 0.3, color: "#8B5CF6" },
  { x: 28, y: 88, size: 4, delay: 2.5, color: "#00D4FF" },
];

const INITIAL_PER_CAT = 6;

/* ---------- HomePage ---------- */
function HomePage() {
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [visibleCats, setVisibleCats] = useState(2);
  const loaderRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);

  const filtered = useMemo(
    () => tools.filter((t) => !t.hidden && (t.name + t.description).toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  useEffect(() => {
    if (visibleCats >= ALL_CATS.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCats((p) => Math.min(p + 2, ALL_CATS.length));
      },
      { rootMargin: "300px" },
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCats]);

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

  const popularTools = useMemo(
    () => POPULAR_SLUGS.map((s) => tools.find((t) => t.slug === s)).filter(Boolean) as typeof tools,
    [],
  );

  return (
    <>
      {/* ===== HERO ===== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-hero text-white gpu-isolate mobile-no-backdrop"
        style={{ minHeight: "92vh", display: "flex", alignItems: "center" }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-40" />

        {/* Ambient orbs */}
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

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <Particle key={i} {...p} />
        ))}

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center"
        >
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold backdrop-blur-md uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--cyan-brand)" }} />
              Free · Fast · Private · No signup
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-8 font-display font-extrabold tracking-tight leading-[1.04]"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)" }}
          >
            The Free Tool
            <br />
            for Your <TypedWord />
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            90+ browser-based tools that run entirely on your device.
            <br className="hidden sm:block" />
            No uploads. No accounts. No waiting.
          </motion.p>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-4"
          >
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
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 max-w-xl mx-auto"
          >
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

            {/* Search dropdown */}
            <AnimatePresence>
              {searchOpen && q.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden text-left z-50"
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
                      <ArrowRight
                        className="w-4 h-4 ml-auto flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
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
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px max-w-2xl mx-auto rounded-2xl overflow-hidden"
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
          </motion.div>
        </motion.div>
      </section>

      {/* ===== BODY ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Popular Tools */}
        <section className="pt-16 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold">Most Popular</h2>
              <p className="text-sm text-muted-foreground mt-0.5">The tools our users reach for most</p>
            </div>
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {popularTools.map((t, i) => {
              const Icon = t.icon;
              const color = categoryMeta[t.category].color;
              return (
                <motion.div
                  key={t.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={t.path}
                    className="group flex flex-col items-center text-center gap-2.5 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1"
                    style={{ "--hover-glow": color } as any}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.2), 0 0 0 1px ${color}33`;
                      e.currentTarget.style.borderColor = `${color}44`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "";
                      e.currentTarget.style.borderColor = "";
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold leading-tight">{t.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{t.description}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <AdZone id="homepage-top-banner" size="728x90" />

        {/* How it works */}
        <section className="py-20">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">Three steps. Zero friction.</p>
          </div>
          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-1/2 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px"
              style={{
                background: "linear-gradient(90deg, transparent, var(--border), transparent)",
                transform: "translateY(-50%)",
              }}
            />
            {[
              {
                icon: Upload,
                title: "Upload or Paste",
                desc: "Drop a file, paste a URL, or type directly. Skycally accepts it all.",
              },
              {
                icon: Wand2,
                title: "Instant Processing",
                desc: "Everything runs in your browser — no server, no queue, no waiting.",
              },
              {
                icon: ArrowDown,
                title: "Download in Seconds",
                desc: "Get your result instantly. No watermarks, no sign-ups, no strings.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative rounded-2xl border border-border bg-card p-8 text-center group hover:border-[var(--cyan-brand)]/30 transition-colors"
              >
                <div
                  className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110"
                  style={{
                    background: "color-mix(in oklab, var(--cyan-brand) 12%, transparent)",
                    color: "var(--cyan-brand)",
                  }}
                >
                  <s.icon className="w-7 h-7" />
                </div>
                <div
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black mb-3"
                  style={{
                    background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)",
                    color: "var(--cyan-brand)",
                  }}
                >
                  {i + 1}
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* All Tools by Category */}
        <section className="pb-20 gpu-isolate overflow-hidden">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">Browse All Tools</h2>
              <p className="mt-2 text-muted-foreground">Every tool, organized by category.</p>
            </div>
            <Link
              to="/tools"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              All tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-16">
            {ALL_CATS.slice(0, visibleCats).map((cat) => {
              const list = tools.filter((t) => !t.hidden && toolInCategory(t, cat));
              if (list.length === 0) return null;
              const meta = categoryMeta[cat];
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  className="rounded-3xl border border-border/60 bg-card/30 p-6 sm:p-8"
                  style={{ backdropFilter: "blur(4px)" }}
                >
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                        style={{
                          background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                          boxShadow: `0 0 0 1px ${meta.color}30`,
                        }}
                      >
                        <span aria-hidden>{meta.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-display text-xl sm:text-2xl font-bold">{meta.label}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{CATEGORY_TAGLINES[cat]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                        style={{ background: `color-mix(in oklab, ${meta.color} 10%, transparent)`, color: meta.color }}
                      >
                        {list.length} {list.length === 1 ? "tool" : "tools"}
                      </span>
                      <Link
                        to="/tools"
                        search={{ cat }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
                      >
                        View all →
                      </Link>
                    </div>
                  </div>

                  {/* Tool cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 contain-paint">
                    {(expanded[cat] ? list : list.slice(0, INITIAL_PER_CAT)).map((t, i) => (
                      <ToolCard key={t.slug} tool={t} index={i} />
                    ))}
                  </div>

                  {list.length > INITIAL_PER_CAT && !expanded[cat] && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [cat]: true }))}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition"
                      >
                        Show {list.length - INITIAL_PER_CAT} more {meta.label.toLowerCase()}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {visibleCats < ALL_CATS.length && <div ref={loaderRef} className="h-10" />}
        </section>

        <AdZone id="homepage-middle-rectangle" size="300x250" />

        {/* CTA banner */}
        <section className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden text-white text-center px-6 py-16"
            style={{
              background:
                "radial-gradient(ellipse at 30% 50%, rgba(139,92,246,0.35) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(0,212,255,0.25) 0%, transparent 60%), linear-gradient(135deg, #0a0a1e 0%, #0d0d2b 100%)",
            }}
          >
            <div className="absolute inset-0 grid-overlay opacity-20" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight">
                Start using Skycally.
                <br />
                <span style={{ color: "var(--cyan-brand)" }}>Completely free.</span>
              </h2>
              <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
                No account. No credit card. No limits. Just tools.
              </p>
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold text-base transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{ background: "var(--cyan-brand)", color: "#000" }}
              >
                Explore All Tools <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </section>

        <AdZone id="homepage-bottom-banner" size="728x90" />
      </div>

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
