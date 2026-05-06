## Add Base64 Encoder / Decoder tool

### Changes

1. **Create `src/routes/tools.base64.tsx`** — TanStack route at `/tools/base64`, wrapped in `ToolPageShell`. Preserves the exact logic from the pasted component (mode toggle, `btoa`/`atob` with UTF-8 safe escape/unescape, copy, swap, clear, error handling). UI is adapted to use project tokens (`bg-card`, `border-border`, `text-muted-foreground`, `text-foreground`) instead of hard-coded `#0a0f1e`/`#0d1526`/`#1e2d4a`, while keeping the cyan→blue gradient accent. Adds a `HowToUse` block at the bottom for consistency. Uses TanStack `head()` meta (title, description, og tags). Note: the project uses `src/routes/`, not `src/pages/`.

2. **Edit `src/lib/tools.ts`** — Import `Code2` from `lucide-react`, append:
   ```ts
   { slug: "base64", name: "Base64 Encoder / Decoder",
     description: "Encode plain text to Base64 or decode Base64 strings instantly.",
     category: "text", icon: Code2, path: "/tools/base64" }
   ```
   This auto-lists it on `/tools` and the homepage grid.

3. **Edit `src/routes/sitemap[.]xml.tsx`** — Insert `/tools/base64` into the `ROUTES` array (alphabetically, right after `/tools`).

### Routing
TanStack's Vite plugin auto-regenerates `routeTree.gen.ts` from the new file — no manual router edits needed.

### Files touched
- new: `src/routes/tools.base64.tsx`
- edit: `src/lib/tools.ts`
- edit: `src/routes/sitemap[.]xml.tsx`
