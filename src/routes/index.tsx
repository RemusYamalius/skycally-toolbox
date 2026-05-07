import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, Image as ImageIcon, FileText, Scissors, Upload, Wand2, ArrowDown } from "lucide-react";
import { tools, categoryMeta, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";
import { AdZone } from "@/components/ad-zone";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skycally — Every tool you need, one place" },
      { name: "description", content: "Download videos, convert files, compress images, edit PDFs — all free, all fast, all in one place." },
      { property: "og:title", content: "Skycally — Every tool you need, one place" },
      { property: "og:description", content: "Free online tools — no registration required." },
    ],
  }),
  component: HomePage,
});

const quickAccess = [
  { icon: Download, label: "Video Downloader", to: "/tools/video-downloader", color: "var(--cyan-brand)" },
  { icon: ImageIcon, label: "Image Converter", to: "/tools/image-converter", color: "var(--violet-brand)" },
  { icon: FileText, label: "PDF Tools", to: "/tools/merge-pdf", color: "var(--orange-brand)" },
  { icon: Scissors, label: "Remove Background", to: "/tools/remove-bg", color: "var(--green-brand)" },
] as const;

const categoryTaglines: Record<ToolCategory, string> = {
  video: "Download, convert, compress and record videos in seconds.",
  image: "Convert, compress, upscale and edit images instantly.",
  audio: "Convert, transcribe and synthesize audio fast.",
  pdf: "Merge, split, convert and extract from PDFs.",
  text: "Generate, format, encode and analyze text effortlessly.",
};

function HomePage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => tools.filter((t) => (t.name + t.description).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 grid-overlay" />
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full opacity-30 blur-3xl animate-float" style={{ background: "var(--violet-brand)" }} />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-30 blur-3xl animate-float" style={{ background: "var(--cyan-brand)", animationDelay: "2s" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cyan-brand)" }} /> Free · Fast · No signup
            </span>
            <h1 className="mt-6 font-display text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Every Tool <br className="sm:hidden" />
              <span className="text-gradient">You Need.</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
              Download videos, convert files, compress images — all free, all fast.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="mt-10 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for a tool..."
                className="w-full rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl pl-12 pr-4 py-4 text-base placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--cyan-brand)] transition"
              />
            </div>
            {q && (
              <div className="mt-3 rounded-xl bg-white/8 backdrop-blur-xl border border-white/10 overflow-hidden text-left">
                {filtered.slice(0, 5).map((t) => (
                  <Link key={t.slug} to={t.path} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                    <t.icon className="w-4 h-4" style={{ color: categoryMeta[t.category].color }} />
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="ml-auto text-xs text-white/40">{categoryMeta[t.category].label}</span>
                  </Link>
                ))}
                {filtered.length === 0 && <div className="px-4 py-3 text-sm text-white/50">No tools match "{q}"</div>}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {quickAccess.map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/10"
              >
                <q.icon className="w-4 h-4" style={{ color: q.color }} />
                {q.label}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ADSENSE_ZONE: homepage-top-banner 728x90 */}
        <AdZone id="homepage-top-banner" size="728x90" />

        {/* Tools by category */}
        <section className="py-16">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">Browse All Tools</h2>
              <p className="mt-2 text-muted-foreground">Organized by category — pick a tool and get going.</p>
            </div>
            <Link to="/tools" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">View all →</Link>
          </div>

          <div className="space-y-14">
            {(["video", "image", "audio", "pdf", "text"] as ToolCategory[]).map((cat) => {
              const list = tools.filter((t) => t.category === cat);
              if (list.length === 0) return null;
              const meta = categoryMeta[cat];
              return (
                <div key={cat} className="border-t border-border/60 pt-10">
                  <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)`, color: meta.color }}
                      >
                        <span aria-hidden>{meta.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold">{meta.label}</h3>
                        <p className="text-sm text-muted-foreground">{categoryTaglines[cat]}</p>
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: `color-mix(in oklab, ${meta.color} 12%, transparent)`, color: meta.color }}
                    >
                      {list.length} {list.length === 1 ? "tool" : "tools"}
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((t, i) => <ToolCard key={t.slug} tool={t} index={i} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ADSENSE_ZONE: homepage-middle-rectangle 300x250 */}
        <AdZone id="homepage-middle-rectangle" size="300x250" />

        {/* How it works */}
        <section className="py-20">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Upload, title: "Paste or Upload", desc: "Drop a file or paste a link — we handle the rest." },
              { icon: Wand2, title: "Process Instantly", desc: "Lightning-fast processing right in your browser." },
              { icon: ArrowDown, title: "Download", desc: "Grab your file. No watermarks, no waiting." },
            ].map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)", color: "var(--cyan-brand)" }}>
                  <s.icon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">STEP {i + 1}</div>
                <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ADSENSE_ZONE: homepage-bottom-banner 728x90 */}
        <AdZone id="homepage-bottom-banner" size="728x90" />
      </div>
    </>
  );
}
