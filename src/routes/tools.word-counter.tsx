import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useMemo, useCallback } from "react";
import { Copy, Trash2, ClipboardPaste, BarChart2 } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

// SEO NOTE: Search Console shows real, proven demand for this exact cluster
// of phrasings — all currently ranking around position 27-39 (page 3-4) with
// ZERO clicks despite thousands of combined impressions: "word counter
// online" (821 impr), "online word counter" (617), "word count online"
// (546), "word calculator" (457), "online word count" (362), "words counter
// online" (328), "count my words" (299), "words calculator online" (283),
// "word count generator" (203). The title/description/body below are tuned
// to naturally cover these specific variants rather than the generic
// buildToolMeta() template, since the tool clearly already works — this is
// a ranking/relevance problem, not a functionality problem.

const SLUG = "word-counter";

export const Route = createFileRoute("/tools/word-counter")({
  head: () => {
    const tool = toolBySlug(SLUG, tools);
    const title = "Word Counter Online — Free Word & Character Count Calculator | Skycally";
    const description =
      "Free online word counter and character count calculator. Count words, characters, sentences and paragraphs instantly — no signup, works in your browser.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Word Counter",
            alternateName: ["Word Count Online", "Word Calculator", "Words Counter"],
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: [
              "Live word count and character count as you type",
              "Counts sentences, paragraphs and lines",
              "Estimates reading time and speaking time",
              "Shows unique word count and average word length",
              "No signup required",
              "100% browser-based — text never leaves your device",
              "Free forever, no word limit",
            ],
          }),
        },
      ],
    };
  },
  component: WordCounterPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the top N most frequent words (ignoring stop-words & short words) */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "its",
  "was",
  "are",
  "be",
  "been",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
  "not",
  "no",
  "so",
  "if",
  "as",
  "up",
  "out",
  "about",
  "into",
  "than",
  "then",
  "there",
  "when",
  "where",
  "who",
  "which",
  "what",
  "how",
]);

function topWords(text: string, n = 10): Array<{ word: string; count: number }> {
  if (!text.trim()) return [];
  const freq: Record<string, number> = {};
  const words = text.toLowerCase().match(/\b[a-záéíóúàèìòùäëïöüâêîôûçñ']{3,}\b/g) || [];
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

// ─── Main component ───────────────────────────────────────────────────────────
function WordCounterPage() {
  const [text, setText] = useState("");
  const [showTopWords, setShowTopWords] = useState(false);

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    const chars = text.length;
    const charsNoSp = text.replace(/\s/g, "").length;
    const sentences =
      trimmed === "" ? 0 : (text.match(/[^.!?]*[.!?]+/g) || []).filter((s) => s.trim().length > 0).length;
    const paragraphs = trimmed === "" ? 0 : text.split(/\n{2,}|\n/).filter((p) => p.trim().length > 0).length;
    const lines = trimmed === "" ? 0 : text.split(/\n/).length;
    // Reading: 238 wpm (silent adult average), Speaking: 130 wpm
    const readMin = Math.max(1, Math.ceil(words / 238));
    const speakMin = Math.max(1, Math.ceil(words / 130));
    const uniqueWords = trimmed === "" ? 0 : new Set(trimmed.toLowerCase().match(/\b\w+\b/g) || []).size;
    const avgWordLen = words === 0 ? 0 : (charsNoSp / words).toFixed(1);
    return { words, chars, charsNoSp, sentences, paragraphs, lines, readMin, speakMin, uniqueWords, avgWordLen };
  }, [text]);

  const top = useMemo(() => (showTopWords ? topWords(text) : []), [text, showTopWords]);

  const clear = () => {
    setText("");
    setShowTopWords(false);
  };

  const copy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Copy failed — try selecting manually.");
    }
  }, [text]);

  const paste = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      toast.success("Text pasted!");
    } catch {
      toast.error("Paste failed — try Ctrl+V in the text area.");
    }
  }, []);

  // Primary stats (always shown)
  const primary = [
    { label: "Words", value: stats.words.toLocaleString(), color: "text-cyan-400" },
    { label: "Characters", value: stats.chars.toLocaleString(), color: "text-violet-400" },
    { label: "No Spaces", value: stats.charsNoSp.toLocaleString(), color: "text-blue-400" },
    { label: "Sentences", value: stats.sentences.toLocaleString(), color: "text-emerald-400" },
    { label: "Paragraphs", value: stats.paragraphs.toLocaleString(), color: "text-amber-400" },
    { label: "Lines", value: stats.lines.toLocaleString(), color: "text-pink-400" },
  ];

  // Secondary stats
  const secondary = [
    { label: "Read Time", value: `~${stats.readMin} min`, hint: "at 238 wpm" },
    { label: "Speak Time", value: `~${stats.speakMin} min`, hint: "at 130 wpm" },
    { label: "Unique Words", value: stats.uniqueWords.toLocaleString(), hint: "" },
    { label: "Avg Word Len", value: `${stats.avgWordLen} chars`, hint: "" },
  ];

  return (
    <ToolPageShell
      title="Word Counter"
      description="Free online word count and character count calculator — count words, characters, sentences, paragraphs and reading time live as you type."
    >
      <div className="space-y-4">
        {/* ── Primary stats ── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {primary.map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Secondary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {secondary.map(({ label, value, hint }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground font-mono">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              {hint && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{hint}</p>}
            </div>
          ))}
        </div>

        {/* ── Textarea ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Text</span>
            <div className="flex items-center gap-1">
              <button
                onClick={paste}
                title="Paste from clipboard"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition"
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste
              </button>
              <button
                onClick={copy}
                title="Copy text"
                disabled={!text}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={clear}
                title="Clear text"
                disabled={!text}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here — stats update in real time..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none outline-none text-sm min-h-[300px] leading-relaxed p-4"
            spellCheck
            aria-label="Text input for word counting"
          />
          {/* Live word count foot bar */}
          {text && (
            <div className="px-4 py-2 border-t border-border bg-secondary/30 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <span className="text-foreground font-semibold">{stats.words.toLocaleString()}</span> words
              </span>
              <span>
                <span className="text-foreground font-semibold">{stats.chars.toLocaleString()}</span> characters
              </span>
              <span>
                <span className="text-foreground font-semibold">{stats.sentences.toLocaleString()}</span> sentences
              </span>
            </div>
          )}
        </div>

        {/* ── Top words ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTopWords((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> Top Words
              {stats.words > 0 && <span className="text-xs text-muted-foreground">(excluding common stop words)</span>}
            </span>
            <span className="text-xs text-muted-foreground">{showTopWords ? "Hide ▲" : "Show ▼"}</span>
          </button>

          {showTopWords && (
            <div className="px-4 pb-4">
              {top.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No significant words found yet.</p>
              ) : (
                <div className="space-y-2">
                  {top.map(({ word, count }, i) => {
                    const pct = Math.round((count / top[0].count) * 100);
                    return (
                      <div key={word} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium truncate">{word}</span>
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">×{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <HowToUse
        steps={[
          "Type or paste your text into the box — all stats update instantly as you type.",
          "The primary row shows Words, Characters, Characters without Spaces, Sentences, Paragraphs and Lines.",
          "The secondary row shows estimated Reading Time (238 wpm), Speaking Time (130 wpm), Unique Word count and Average Word Length.",
          "Click 'Top Words' to reveal the most frequent meaningful words in your text, with a visual frequency bar.",
        ]}
      />

      <ToolSeoContent
        title="Word Counter Online — Free Word & Character Count Calculator"
        description="Instantly count words, characters (with and without spaces), sentences, paragraphs and lines in any text. This free online word counter and word calculator estimates reading time and speaking time, updating live as you type — no signup, no limit."
        body={[
          "Skycally's Word Counter gives you a complete picture of any text in real time. Paste an essay, blog post, email, speech or tweet and instantly see the word count, character count (with and without spaces), sentence count, paragraph count, line count, estimated silent reading time, estimated speaking time, unique word count and average word length — all updating as you type, with no button to press. Whether you search for 'word counter online', 'word count online', or 'word calculator', this is the same tool: a fast, accurate way to count my words and characters directly in the browser, with nothing sent to a server.",
          "Writers use a word counter or word count generator to hit publication targets — a standard news article runs 400–800 words, a blog post 1,000–2,500 words, a short story 1,000–7,500 words, and a novel 80,000+ words. Academic and professional writing platforms impose strict word or character limits: X (Twitter) allows 280 characters per post, LinkedIn recommendations cap at 3,000 characters, and most university essays specify a word count range. Skycally's counter covers all these cases at once. The 'Top Words' feature also surfaces your most-used terms, which doubles as a basic keyword density tool for SEO writers.",
          "Reading time is calculated at 238 words per minute — the average silent reading speed for adult English readers, based on research published in the journal Reading and Writing. Speaking time uses 130 words per minute, the pace recommended for presentations and podcasts to be clearly understood. Both estimates are approximations and vary by content complexity and individual reader speed, but they give a reliable starting point for planning speeches, video scripts and blog posts.",
          "Some people look for a 'word calculator' rather than a 'word counter' — both terms describe exactly the same tool here. Whether you need to count words online for a school essay, check a caption fits a character limit, or calculate the word count of a manuscript before submission, this single free tool covers every version of that request without needing a separate 'words counter online' or 'word count generator' tool.",
        ]}
        faqs={[
          {
            question: "Does the word counter update in real time?",
            answer:
              "Yes. Every stat — words, characters, sentences, paragraphs, lines, reading time, speaking time, unique words and average word length — updates instantly as you type or paste text. There is no submit button.",
          },
          {
            question: "Is this the same as a 'word calculator' or 'word count generator'?",
            answer:
              "Yes. 'Word counter', 'word calculator', 'word count generator' and 'words counter online' all describe the same task — counting the words and characters in a piece of text. This tool covers all of them in one place, free and with no signup.",
          },
          {
            question: "How is reading time calculated?",
            answer:
              "Reading time is estimated at 238 words per minute, which is the average silent reading speed for adults according to research published in the journal Reading and Writing (2019). So a 500-word article takes approximately 2 minutes to read.",
          },
          {
            question: "How is speaking time calculated?",
            answer:
              "Speaking time uses 130 words per minute — the recommended pace for presentations, speeches and podcasts to be clearly understood by an audience. A 1,300-word speech would take roughly 10 minutes to deliver at that pace.",
          },
          {
            question: "Is there a word or character limit?",
            answer:
              "No. Paste as much text as you need — the counter handles novels, research papers, and large documents. Performance stays smooth because all counting happens locally in your browser without any server round-trips.",
          },
          {
            question: "Does it count words in other languages?",
            answer:
              "Yes, for any language that separates words with spaces — including French, Spanish, Arabic, German, Portuguese and more. Languages without spaces between words (such as Chinese, Japanese and Thai) will not return an accurate word count, though the character count will still be correct.",
          },
          {
            question: "What does the 'Top Words' feature do?",
            answer:
              "Top Words shows the 10 most frequently used meaningful words in your text, ranked by count with a visual bar. Common words like 'the', 'a', 'and' are filtered out automatically. This is useful for checking keyword density in SEO content or spotting overused words in your writing.",
          },
          {
            question: "Is my text saved or sent to a server?",
            answer:
              "No. The word counter runs entirely in your browser. Your text is never uploaded, stored, or sent anywhere. You can even use it offline once the page has loaded.",
          },
          {
            question: "How does this compare to Microsoft Word's word counter?",
            answer:
              "Results are very close. Microsoft Word counts contractions (like 'don't') as one word — so does Skycally's counter. Minor differences can occur with hyphenated words or punctuation-heavy text, but for standard prose the counts will match.",
          },
        ]}
      />

      <RelatedTools currentSlug={SLUG} />
    </ToolPageShell>
  );
}
