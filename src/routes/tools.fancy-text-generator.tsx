import { createFileRoute, Link } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { Copy, Check, Star, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { AdZone } from "@/components/ad-zone";
import { STYLES, CATEGORIES, platformLength, visibleLength, type StyleCategory } from "@/lib/fancy-text/styles";

const SLUG = "fancy-text-generator";

export const Route = createFileRoute("/tools/fancy-text-generator")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const base = buildToolMeta(tool);
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Fancy Text Generator",
            description:
              "Free fancy text / font generator. Turn plain text into 40+ decorative Unicode styles — bold, italic, cursive, bubble, gothic, upside-down and more. Instant, copyable, no signup.",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            url: `${SITE_URL}/tools/fancy-text-generator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "40+ decorative Unicode text styles generated live as you type",
              "One-click copy per style",
              "Filter styles by category — Bold & Italic, Cursive & Script, Bubble & Circled, Gothic & Fancy, Upside-Down & Mirrored, Small & Tiny, Symbols & Decorative",
              "Dual character counter (visible vs. platform count) that warns before you exceed Instagram/TikTok bio limits",
              "Pin favorite styles to the top for the session",
              "Works across Instagram, TikTok, Discord, X, WhatsApp and more since it's standard Unicode, not custom fonts",
              "No signup, no download, no watermark — runs fully in your browser",
            ],
          }),
        },
      ],
    };
  },
  component: FancyTextGeneratorPage,
});

const PLATFORM_LIMIT = 150; // Instagram bio limit — the most commonly hit ceiling.

function FancyTextGeneratorPage() {
  const [input, setInput] = useState("Type your text");
  const [activeCategory, setActiveCategory] = useState<StyleCategory | "All">("All");
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = activeCategory === "All" ? STYLES : STYLES.filter((s) => s.category === activeCategory);
    return [...list.filter((s) => pinned.has(s.id)), ...list.filter((s) => !pinned.has(s.id))];
  }, [activeCategory, pinned]);

  const rendered = useMemo(
    () => filtered.map((style) => ({ style, output: style.transform(input || "") })),
    [filtered, input],
  );

  const copyOne = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied!");
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visible = visibleLength(input);
  const platform = platformLength(input);
  const overLimit = platform > PLATFORM_LIMIT;
  const differs = platform !== visible;

  return (
    <ToolPageShell
      title="Fancy Text Generator"
      description="Turn plain text into 40+ decorative Unicode styles — bold, italic, cursive, bubble, gothic, upside-down, and more. Instant, copyable, no signup."
      showFileDisclaimer={false}
    >
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <label htmlFor="fancy-input" className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4" style={{ color: "var(--cyan-brand)" }} />
          Type or paste your text
        </label>
        <textarea
          id="fancy-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your text…"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        />

        {/* ── Character counter ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Visible characters: <span className="font-mono text-foreground">{visible}</span>
            </span>
            <span className={overLimit ? "font-mono text-amber-400" : "text-muted-foreground"}>
              Platform count (Instagram/TikTok): <span className="font-mono">{platform}</span> / {PLATFORM_LIMIT}
            </span>
          </div>
          {differs && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Many fancy Unicode characters use 2 UTF-16 code units each, so Instagram, TikTok, and X count them as 2
                characters toward your bio/caption limit — even though you see one. That's why the two numbers differ.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Category chips ────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs sm:text-sm transition ${
                active
                  ? "border-cyan-400 bg-cyan-400/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Style list ────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-2">
        {rendered.map(({ style, output }) => {
          const isPinned = pinned.has(style.id);
          return (
            <div
              key={style.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 sm:px-4 sm:py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{style.category}</div>
                <div className="mt-0.5 break-words text-base sm:text-lg" style={{ wordBreak: "break-word" }}>
                  {output || <span className="text-muted-foreground italic">—</span>}
                </div>
              </div>
              <button
                onClick={() => togglePin(style.id)}
                aria-label={isPinned ? "Unpin style" : "Pin style to top"}
                className="shrink-0 rounded-lg border border-border bg-card p-2 transition hover:bg-secondary"
              >
                <Star
                  className="h-4 w-4"
                  fill={isPinned ? "currentColor" : "none"}
                  style={{ color: isPinned ? "var(--cyan-brand)" : undefined }}
                />
              </button>
              <button
                onClick={() => copyOne(style.id, output)}
                aria-label="Copy fancy text"
                className="shrink-0 rounded-lg border border-border bg-card p-2 transition hover:bg-secondary"
              >
                {copiedId === style.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Internal links — moved up here, right after the style list, so it's
          visible without scrolling past the full SEO block below. Every prior
          tool on the site places its contextual links near the main content,
          not buried after the FAQs. ──────────────────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-bold mb-3">Pair it with</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <Link to="/tools/word-counter" className="text-foreground hover:underline">
              Word Counter
            </Link>
            {" — "}
            check exactly how long your bio or caption is before you paste your fancy text in, since some platforms
            count these characters differently.
          </li>
          <li>
            <Link to="/tools/add-text-to-image" className="text-foreground hover:underline">
              Add Text to Image
            </Link>
            {" — "}
            turn your fancy text into a styled image instead, for platforms that don't render Unicode text the way you
            want.
          </li>
          <li>
            <Link to="/tools/meme-generator" className="text-foreground hover:underline">
              Meme Generator
            </Link>
            {" — "}
            drop your new stylish text straight onto a meme template.
          </li>
        </ul>
      </section>

      <AdZone id="fancy-text-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Type or paste any text into the input box at the top — every style below updates instantly as you type.",
          "Browse or filter styles by category (Bold, Cursive, Bubble, Gothic, Upside-Down, Symbols). Star your favorites to pin them to the top.",
          "Tap the copy button on any style and paste it straight into your Instagram bio, TikTok username, Discord tag, or wherever you need standout text.",
        ]}
      />

      <ToolSeoContent
        title="Free Fancy Text Generator — Cool Unicode Fonts for Instagram, TikTok & Discord"
        description="Convert plain text into 40+ decorative Unicode styles: bold, italic, cursive script, bubble letters, gothic fraktur, upside-down text, and more. Instant preview for every style, one-click copy, no signup, no download."
        body={[
          "Skycally's Fancy Text Generator instantly converts anything you type into dozens of decorative styles — bold, italic, cursive script, bubble and circled letters, gothic fraktur, upside-down and mirrored text, small caps, superscript, and decorative symbol-wrapped variants. Every style renders live as you type, and each has its own one-click copy button so you can drop stylish text straight into an Instagram bio, TikTok caption, Discord username, or gaming tag without opening ten browser tabs.",
          "Under the hood these aren't real fonts. Every style is built from characters that already exist in the Unicode standard — mostly the Mathematical Alphanumeric Symbols block (U+1D400 onward) plus older blocks like Enclosed Alphanumerics for circled letters and IPA extensions for upside-down letters. That's exactly why fancy text works everywhere: because it's Unicode, not a font file, it displays the same way on iOS, Android, Windows, and Mac without anyone needing to install anything. When a specific letter or symbol doesn't have a Unicode variant in a given style (this happens for punctuation and some accented letters), we fall back to the original character rather than dropping it or rendering a broken glyph.",
          "The most common places people paste this text are Instagram bios and captions, TikTok usernames and bios, Discord server nicknames, X (Twitter) display names, WhatsApp and Telegram messages, YouTube channel names, and in-game usernames for Fortnite, Roblox, Free Fire, and PUBG. All of these platforms render Unicode text natively — no plugins, no premium accounts, no image uploads. Because it's just text, it stays selectable, searchable, and screen-reader-friendly (though screen readers may pronounce mathematical Unicode letters as their formal names, so keep your actual name in plain text if accessibility matters).",
          "One trap almost every other fancy-text site ignores: many of these styles use characters outside the Basic Multilingual Plane, which JavaScript and most social platforms count as 2 characters each (they take two UTF-16 code units). So a bio that looks 100 characters long to you might actually count as 190 against Instagram's 150-character bio limit. The character counter above the styles shows both numbers side by side and warns you as soon as your text would go over — a small but genuinely useful detail if you're trying to fit a full styled bio into a tight character budget.",
        ]}
        faqs={[
          {
            question: "What is a fancy text generator?",
            answer:
              "A fancy text generator converts plain typed text into decorative styles — bold, italic, cursive, bubble, gothic, upside-down, and more — using Unicode characters that already exist in the standard. You type once, get 40+ styled versions instantly, and copy any of them with one click.",
          },
          {
            question: "Does fancy text work on Instagram, TikTok, and Discord?",
            answer:
              "Yes. Because these styles are all real Unicode characters (not custom fonts), they render natively on Instagram bios and captions, TikTok usernames and bios, Discord names and messages, X (Twitter), WhatsApp, Telegram, YouTube, and pretty much any modern app or platform. No installs required.",
          },
          {
            question: "Why does fancy text sometimes look like empty boxes or question marks?",
            answer:
              "That's the receiving device or app failing to render a Unicode character it doesn't recognize — usually a very old phone, a stripped-down messaging client, or a font that lacks the required glyphs. It's not a bug in the text itself. Try a different style (bold and italic are the most universally supported).",
          },
          {
            question: "Is this a real font I can download?",
            answer:
              "No — and that's the point. These aren't fonts, they're Unicode characters. There's nothing to install and nothing to download, which is exactly why the styled text works everywhere without you or the person reading it needing to do anything.",
          },
          {
            question: "Can I use fancy text in my Discord or gaming username?",
            answer:
              "Yes, in most cases. Discord, Fortnite, Roblox, Free Fire, PUBG, and most modern games accept Unicode usernames. A few platforms restrict usernames to ASCII only — if a style is rejected, try a simpler one (bold, italic, or small caps have the widest acceptance).",
          },
          {
            question: "Does fancy text count differently toward character limits?",
            answer:
              "Yes — this is the trap most sites don't tell you about. Many fancy styles use characters outside the Basic Multilingual Plane, which platforms like Instagram, TikTok, and X count as 2 characters each instead of 1. The counter above the styles shows both the visible count and the actual platform count so you don't hit a bio limit unexpectedly.",
          },
          {
            question: "Is this free to use?",
            answer:
              "Completely free, no signup, no download, no watermark, no daily limit. Everything runs in your browser — nothing you type is ever sent to a server.",
          },
          {
            question: "Why do some styles skip numbers or punctuation?",
            answer:
              "Unicode doesn't define every letter and digit in every style. For example, italic mathematical script has letters but no digits, and some circled styles cover only A–Z. When a character has no styled equivalent in a given style, we leave it as-is instead of dropping it or breaking the word.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}
