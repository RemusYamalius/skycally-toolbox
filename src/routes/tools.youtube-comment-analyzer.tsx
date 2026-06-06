import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, MessageSquare, User, X } from "lucide-react";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/youtube-comment-analyzer")({
  head: () => buildToolMeta(toolBySlug("youtube-comment-analyzer", tools)),
  component: YouTubeCommentAnalyzer,
});

const WORKER_URL = "https://youtube-comments-proxy.skycally-tools.workers.dev";

interface Comment {
  author: string;
  text: string;
  likes: number;
  publishedAt: string;
}

function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // fallthrough
  }
  const m = s.match(/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const POSITIVE = ["good", "great", "love", "amazing", "excellent", "fantastic", "wonderful", "best", "perfect", "awesome", "nice", "cool", "happy"];
const NEGATIVE = ["bad", "terrible", "hate", "worst", "awful", "boring", "ugly", "horrible", "sucks", "trash", "stupid"];
const POS_EMOJI = ["👍", "❤️", "😍", "🔥", "💯", "😊", "😁"];
const NEG_EMOJI = ["👎", "😡", "🤮", "💩", "😠"];

type Sentiment = "positive" | "negative" | "neutral";

function classify(text: string): Sentiment {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE) if (new RegExp(`\\b${w}\\b`, "i").test(lower)) pos++;
  for (const w of NEGATIVE) if (new RegExp(`\\b${w}\\b`, "i").test(lower)) neg++;
  for (const e of POS_EMOJI) if (text.includes(e)) pos++;
  for (const e of NEG_EMOJI) if (text.includes(e)) neg++;
  if (pos === 0 && neg === 0) return "neutral";
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

const STOPWORDS = new Set([
  "the","a","an","is","in","it","of","and","to","for","on","at","by","be","this","that","with","as","are","was","were","or","but","not","you","your","my","me","we","us","our","they","them","their","he","she","his","her","i","im","ive","id","ill","its","so","do","does","did","have","has","had","just","like","get","got","very","much","really","one","all","can","will","would","should","could","there","here","what","when","where","how","why","then","than","also","too","from","about","out","up","down","if","no","yes","im","u","ur","r","n","ya","yo","oh","ah"
]);

interface Analysis {
  total: number;
  topAuthor: { name: string; count: number };
  avgLength: number;
  totalLikes: number;
  sentiment: { positive: number; neutral: number; negative: number };
  top5: Comment[];
  words: { word: string; count: number }[];
}

function analyze(comments: Comment[]): Analysis {
  const total = comments.length;
  const authorCounts = new Map<string, number>();
  let totalLikes = 0;
  let totalLen = 0;
  const sentTally = { positive: 0, neutral: 0, negative: 0 };
  const wordCounts = new Map<string, number>();
  for (const c of comments) {
    authorCounts.set(c.author, (authorCounts.get(c.author) ?? 0) + 1);
    totalLikes += c.likes;
    totalLen += c.text.length;
    sentTally[classify(c.text)]++;
    const tokens = c.text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    for (const t of tokens) {
      if (t.length < 3 || STOPWORDS.has(t)) continue;
      wordCounts.set(t, (wordCounts.get(t) ?? 0) + 1);
    }
  }
  let topAuthor = { name: "—", count: 0 };
  for (const [name, count] of authorCounts) {
    if (count > topAuthor.count) topAuthor = { name, count };
  }
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const top5 = [...comments].sort((a, b) => b.likes - a.likes).slice(0, 5);
  const words = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  return {
    total,
    topAuthor,
    avgLength: total ? Math.round(totalLen / total) : 0,
    totalLikes,
    sentiment: { positive: pct(sentTally.positive), neutral: pct(sentTally.neutral), negative: pct(sentTally.negative) },
    top5,
    words,
  };
}

function formatDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function YouTubeCommentAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [filterWord, setFilterWord] = useState<string | null>(null);

  const analysis = useMemo(() => (comments.length ? analyze(comments) : null), [comments]);

  const filtered = useMemo(() => {
    if (!filterWord) return [];
    const f = filterWord.toLowerCase();
    return comments.filter((c) => c.text.toLowerCase().includes(f));
  }, [comments, filterWord]);

  const handleAnalyze = async () => {
    setError(null);
    setComments([]);
    setFilterWord(null);
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}?videoId=${videoId}&maxResults=100`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Comments are disabled for this video");
          toast.error("Comments are disabled for this video");
          return;
        }
        let body: any = null;
        try { body = await res.json(); } catch { /* ignore */ }
        const reason = (body?.error || body?.reason || "").toString().toLowerCase();
        if (reason.includes("disabled")) {
          setError("Comments are disabled for this video");
          toast.error("Comments are disabled for this video");
          return;
        }
        throw new Error("fetch failed");
      }
      const data = await res.json();
      const raw: any[] = Array.isArray(data) ? data : (data.items ?? data.comments ?? []);
      const mapped: Comment[] = raw.map((it: any) => {
        const snip = it?.snippet?.topLevelComment?.snippet ?? it?.snippet ?? it;
        return {
          author: snip.authorDisplayName ?? snip.author ?? "Anonymous",
          text: (snip.textDisplay ?? snip.textOriginal ?? snip.text ?? "").replace(/<[^>]+>/g, ""),
          likes: Number(snip.likeCount ?? snip.likes ?? 0),
          publishedAt: snip.publishedAt ?? snip.published ?? "",
        };
      }).filter((c) => c.text.trim().length > 0);
      if (mapped.length === 0) {
        setError("Comments are disabled for this video");
        toast.error("Comments are disabled for this video");
        return;
      }
      setComments(mapped);
    } catch (e) {
      setError("Could not fetch comments, please try again");
      toast.error("Could not fetch comments, please try again");
    } finally {
      setLoading(false);
    }
  };

  const wordSize = (count: number, max: number) => {
    const min = 0.8;
    const maxSize = 2;
    const ratio = max > 1 ? count / max : 1;
    return `${(min + (maxSize - min) * ratio).toFixed(2)}rem`;
  };

  return (
    <ToolPageShell title="YouTube Comment Analyzer" description="Fetch and analyze comments from any YouTube video — sentiment, top comments, and a word cloud.">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL or video ID..."
            onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
            disabled={loading}
          />
          <Button onClick={handleAnalyze} disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {loading && (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {analysis && !loading && (
        <div className="mt-8 space-y-8">
          {/* Overview */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <OverviewCard label="Total comments" value={analysis.total.toString()} />
              <OverviewCard label="Most active commenter" value={analysis.topAuthor.name} sub={`${analysis.topAuthor.count} comments`} />
              <OverviewCard label="Average length" value={`${analysis.avgLength} chars`} />
              <OverviewCard label="Total likes" value={analysis.totalLikes.toLocaleString()} />
            </div>
          </section>

          {/* Sentiment */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Sentiment</h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <SentimentBar label="Positive" value={analysis.sentiment.positive} color="var(--green-brand)" />
                <SentimentBar label="Neutral" value={analysis.sentiment.neutral} color="var(--muted-foreground)" />
                <SentimentBar label="Negative" value={analysis.sentiment.negative} color="#ef4444" />
              </CardContent>
            </Card>
          </section>

          {/* Top comments */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Top comments</h2>
            <div className="space-y-3">
              {analysis.top5.map((c, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{c.author}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(c.publishedAt)}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{c.text}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="w-3.5 h-3.5" /> {c.likes.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Word cloud */}
          {analysis.words.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold mb-3">Word cloud</h2>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-x-3 gap-y-2 items-baseline">
                    {analysis.words.map((w) => (
                      <button
                        key={w.word}
                        onClick={() => setFilterWord(w.word)}
                        className={`transition-colors hover:text-primary ${filterWord === w.word ? "text-primary font-semibold" : ""}`}
                        style={{ fontSize: wordSize(w.count, analysis.words[0].count) }}
                        title={`${w.count} occurrences`}
                      >
                        {w.word}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {filterWord && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {filtered.length} comment{filtered.length === 1 ? "" : "s"} containing "{filterWord}"
                    </Badge>
                    <button
                      onClick={() => setFilterWord(null)}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear filter
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filtered.map((c, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <div className="text-xs font-medium text-muted-foreground">{c.author}</div>
                          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <HowToUse steps={[
        "Paste any YouTube video URL or video ID into the input.",
        "Click Analyze to fetch up to 100 comments.",
        "Review the overview, sentiment, top comments, and word cloud.",
        "Click any word in the cloud to filter comments containing it.",
      ]} />
      <RelatedTools currentSlug="youtube-comment-analyzer" />
      <ToolSeoContent
        title={"YouTube Comment Analyzer — Free Sentiment & Word Cloud Tool"}
        description={"Analyze YouTube video comments instantly — get sentiment breakdown, top comments by likes, most active commenters, and a word cloud."}
        body={[
          "The YouTube Comment Analyzer fetches up to 100 comments from any public YouTube video and turns them into actionable insights. Paste a YouTube link or video ID and instantly see how viewers are reacting — the overall sentiment, who is commenting the most, and which words dominate the conversation.",
          "Sentiment is detected from common positive and negative keywords and emojis, then displayed as colored progress bars. The top 5 comments by like count surface the responses that other viewers found most valuable, while the word cloud highlights the topics being discussed. Click any word to filter the comments containing it.",
          "All analysis happens locally in your browser. The tool only relays the video ID through a lightweight proxy to fetch the public comment thread — no comments, accounts, or personal data are stored on our servers.",
        ]}
        faqs={[
          { question: "How many comments are analyzed?", answer: "Up to 100 top-level comments per video — the most relevant ones returned by YouTube's public API." },
          { question: "Why are some videos showing 'Comments are disabled'?", answer: "The video owner has turned off comments on YouTube, so there is nothing for the tool to fetch." },
          { question: "How is sentiment calculated?", answer: "Each comment is matched against curated lists of positive and negative keywords and emojis. The dominant signal determines whether the comment counts as positive, negative, or neutral." },
          { question: "Is any data stored?", answer: "No. Comments are fetched on demand, analyzed in your browser, and discarded as soon as you leave the page." },
        ]}
      />
    </ToolPageShell>
  );
}

function OverviewCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold truncate" title={value}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SentimentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color }}>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
