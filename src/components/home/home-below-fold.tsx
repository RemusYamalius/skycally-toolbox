import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Upload, Wand2, ArrowDown, ArrowRight } from "lucide-react";
import { tools, categoryMeta, toolInCategory, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";
import { AdZone } from "@/components/ad-zone";

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

const ALL_CATS: ToolCategory[] = ["video", "image", "audio", "pdf", "text", "utility", "seo", "games", "minigames", "ai"];

const CATEGORY_TAGLINES: Record<ToolCategory, string> = {
  ai: "Run AI models in your browser — no server, no cost.",
  video: "Download, convert, compress and record videos in seconds.",
  image: "Convert, compress, upscale and edit images instantly.",
  audio: "Convert, transcribe and synthesize audio fast.",
  pdf: "Merge, split, convert and extract from PDFs.",
  text: "Generate, format, encode and analyze text effortlessly.",
  utility: "Calculators, converters and everyday utilities.",
  seo: "Real Semrush data — keyword research, backlinks, competitors and more.",
  games: "Spinning wheels, role assignments, team makers and more.",
  minigames: "Play Wordle, 2048, Ball Sort and more — no download needed.",
};

const INITIAL_PER_CAT = 6;

export default function HomeBelowFold() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [visibleCats, setVisibleCats] = useState(2);
  const loaderRef = useRef<HTMLDivElement>(null);

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

  const popularTools = useMemo(
    () => POPULAR_SLUGS.map((s) => tools.find((t) => t.slug === s)).filter(Boolean) as typeof tools,
    [],
  );

  return (
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
          {popularTools.map((t) => {
            const Icon = t.icon;
            const color = categoryMeta[t.category].color;
            return (
              <Link
                key={t.slug}
                to={t.path}
                className="group flex flex-col items-center text-center gap-2.5 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1"
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
            <div
              key={s.title}
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
            </div>
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
              <div
                key={cat}
                className="rounded-3xl border border-border/60 bg-card/30 p-6 sm:p-8"
                style={{ backdropFilter: "blur(4px)" }}
              >
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
              </div>
            );
          })}
        </div>
        {visibleCats < ALL_CATS.length && <div ref={loaderRef} className="h-10" />}
      </section>

      <AdZone id="homepage-middle-rectangle" size="300x250" />

      {/* CTA banner */}
      <section className="py-16">
        <div
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
        </div>
      </section>

      <AdZone id="homepage-bottom-banner" size="728x90" />
    </div>
  );
}
