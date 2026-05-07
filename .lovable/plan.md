## Goal

Turn the 4 hero quick-access buttons into 5 category shortcuts that jump straight to the matching section on the All Tools page — one button per real category (Video, Image, Audio, PDF & Documents, Text).

## Why this is better than the current state

Today the buttons point to 4 specific tools (Video Downloader, Image Converter, Merge PDF, Remove Background). That's inconsistent — "PDF Tools" already implies a category, but the others jump to a single tool. Replacing them with true category links matches the user's mental model and the new category-grouped layout we just built on the home page, the All Tools page, and the footer.

## Changes

### 1. `src/routes/index.tsx` — hero quick-access row
- Replace the `quickAccess` array with 5 entries, one per `ToolCategory`, each using `categoryMeta` for label + color and a matching lucide icon (Video, Image, Music, FileText, Type).
- Each button becomes `<Link to="/tools" search={{ cat: "<category>" }}>` so it lands on the All Tools page pre-filtered to that category.
- Keep the same pill styling, hover, and motion — only data + destination change.

### 2. `src/routes/tools.index.tsx` — read category from URL
- Add `validateSearch` to the route to accept `?cat=video|image|audio|pdf|text` (optional, defaults to `all`).
- Initialize the `cat` state from `Route.useSearch().cat ?? "all"` so deep links from the hero land on the right section.
- When the user clicks a category pill, also update the URL via `navigate({ search: { cat } })` so the filter is shareable and back/forward works. No change to search input or tool grid logic.

### 3. No changes elsewhere
- `src/lib/tools.ts`, footer, individual tool routes, `routeTree.gen.ts`, sitemap — untouched.
- No tool functionality is touched.

## Result

Hero pills: `Video Tools` · `Image Tools` · `Audio Tools` · `PDF & Documents` · `Text Tools` — each color-coded to its category and opening `/tools?cat=...` already filtered.
