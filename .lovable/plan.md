## Goal
Add a new tool page **YouTube Comment Analyzer** at `/tools/youtube-comment-analyzer` that fetches comments from the existing Cloudflare Worker (`https://youtube-comments-proxy.skycally-tools.workers.dev`) and shows overview, sentiment, top comments, and a word cloud. Fully client-side, no backend changes.

## Files

### 1. New route: `src/routes/tools.youtube-comment-analyzer.tsx`
Standard tool route, mirrors the structure of `tools.sentiment-analysis.tsx`:
- `createFileRoute("/tools/youtube-comment-analyzer")` with `head: () => buildToolMeta(toolBySlug(...))`.
- Wraps content in `ToolPageShell` (title + description), ends with `HowToUse`, `RelatedTools`, and `ToolSeoContent` (title with keywords, ~150-200 word body, 4 FAQs) per project rules.
- All UI text in English; dark theme via existing semantic tokens; uses `Input`, `Button`, `Card`, `Progress`, `Skeleton`, `Badge`, `sonner` toast.

#### State
`url`, `videoId`, `loading`, `error`, `comments[]`, `filterWord`.

#### Logic (pure helpers inside the file)
- `extractVideoId(input)` — regex against `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, or a bare 11-char ID. Returns `null` on failure.
- `fetchComments(videoId)` — `GET {WORKER_URL}?videoId={id}&maxResults=100`. Maps response into `{author, text, likes, publishedAt}`. Distinguishes HTTP 403/"disabled" from generic failures so we can show the right toast message.
- `analyze(comments)` returns:
  - **Overview**: total, most active commenter (group by author, max count), avg length, total likes (sum).
  - **Sentiment**: per-comment classify against the keyword/emoji lists from the spec (case-insensitive, word-boundary for letters, direct includes for emojis). Tally Positive/Neutral/Negative → percentages.
  - **Top 5** by likes (stable sort desc).
  - **Word cloud**: tokenize (`/[\p{L}\p{N}']+/gu`, lowercase), drop stopwords (built-in ~50-word list) and words shorter than 3 chars, count, take top 20. Font size mapped linearly between `0.8rem` and `2rem` by frequency.

#### UI sections (in this order, inside `ToolPageShell`)
1. Input row: `Input` for URL/ID + `Button` "Analyze". Disabled while loading. Error message under input.
2. Loading: `Skeleton` rows + spinner.
3. Results (only when `comments.length > 0`):
   - **Overview cards**: 4 `Card`s in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
   - **Sentiment**: three labeled `Progress` bars (green/muted/red via semantic tokens) with percentages.
   - **Top comments**: list of 5 cards with author, text, likes, formatted date.
   - **Word cloud**: flex-wrap of buttons; click sets `filterWord`. When set, show a filtered comments list below with a "Clear filter" chip.
4. "No data is stored on our servers" badge is provided automatically by `ToolPageShell`.

#### Error handling (toast + inline message)
- Invalid URL → "Please enter a valid YouTube URL"
- Disabled comments (worker returns 403 / `commentsDisabled`) → "Comments are disabled for this video"
- Any other failure → "Could not fetch comments, please try again"

### 2. `src/lib/tools.ts`
Append one entry to the `tools` array:
```ts
{ slug: "youtube-comment-analyzer", name: "YouTube Comment Analyzer",
  description: "Fetch and analyze comments from any YouTube video — sentiment, top comments, word cloud.",
  category: "ai", icon: MessageSquare, path: "/tools/youtube-comment-analyzer" }
```
Add `MessageSquare` to the existing `lucide-react` import.

## Out of scope
- No backend, no edge function, no env vars, no DB.
- No edits to existing routes/components beyond the single `tools.ts` registration line.
- No new dependencies — uses existing shadcn UI, lucide-react, sonner, framer-motion.
