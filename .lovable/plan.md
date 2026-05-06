## Add Password Generator tool

### Heads-up on the pasted code
The component code you pasted has its JSX stripped (only text and attributes remain — all `<div>`, `<button>`, `<input>` tags are gone), so it won't compile as-is. I'll keep the **logic exactly as you specified** (charsets, `getStrength`, `crypto.getRandomValues`, length state, options state, copy behavior) and reconstruct the JSX to match the intent and the rest of the Skycally tool pages.

Also, the project doesn't use `src/pages/` — it uses TanStack Start file-based routing under `src/routes/`. I'll place the page there to stay consistent (and so the router actually picks it up).

### Changes

1. **Create `src/routes/tools.password-generator.tsx`**
   - TanStack `createFileRoute("/tools/password-generator")` with `head()` meta (title, description, og tags), matching other tool routes.
   - Wraps content in `<ToolPageShell title="Password Generator" description="Generate strong, secure passwords instantly.">`.
   - Implements your exact logic:
     - `CHARSETS` constant
     - `getStrength()` helper (Weak/Fair/Strong with the same colors and widths)
     - `length` (default 16), `options` (uppercase/lowercase/numbers/symbols, symbols off), `password`, `copied` state
     - `generate()` using `crypto.getRandomValues(new Uint32Array(length))`
     - `copy()` using `navigator.clipboard.writeText` with 2s reset
   - UI (rebuilt JSX, styled with project tokens — `border`, `bg-card`, `text-foreground`, `text-muted-foreground`, brand cyan accent — to match other tools rather than hard-coded `#1e2d4a`):
     - Password display card with monospace text + copy button (Check icon when copied, Copy icon otherwise, from `lucide-react`)
     - Strength bar (hidden until a password exists)
     - Length slider (range 4–64, value badge, tick labels 4 / 64)
     - Four toggle option pills (Uppercase, Lowercase, Numbers, Symbols)
     - "Generate Password" primary button (disabled when no charset selected)

2. **Register the tool in `src/lib/tools.ts`**
   - Import `Lock` from `lucide-react`.
   - Append:
     ```ts
     { slug: "password-generator", name: "Password Generator",
       description: "Generate strong, secure passwords instantly.",
       category: "text", icon: Lock, path: "/tools/password-generator" }
     ```
   - This automatically makes it appear on `/tools` (the grid maps over `tools`) and in the homepage tool listings.

3. **Add `/tools/password-generator` to `src/routes/sitemap[.]xml.tsx`**
   - Insert the new path into the `ROUTES` array (alphabetically, before `/tools/pdf-text-extractor`) so it ships in the sitemap for Google Search Console.

### Routing
No manual router edits needed — TanStack Router's Vite plugin auto-generates `routeTree.gen.ts` from the new file in `src/routes/`.

### Files touched
- new: `src/routes/tools.password-generator.tsx`
- edit: `src/lib/tools.ts`
- edit: `src/routes/sitemap[.]xml.tsx`
