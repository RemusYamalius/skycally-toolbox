## Goal
Add a Contact page, wire up Formspree, expand SEO metadata across pages, refresh sitemap/robots, and add JSON-LD on the homepage.

## Important notes on stack adaptation
- The project is **TanStack Start**, not CRA/Vite-React. We already manage `<head>` via each route's `head()` (see `src/routes/__root.tsx`, `src/routes/tools.json-formatter.tsx`). **We will NOT install `react-helmet-async`** — it duplicates and conflicts with TanStack's `HeadContent`. All `<Helmet>` blocks in your spec will be translated 1:1 into `head: () => ({ meta, links, scripts })`.
- The sitemap is already a **dynamic route** at `src/routes/sitemap[.]xml.tsx`, not a static `public/sitemap.xml`. We'll update that route's `ROUTES` list to match your new spec. `public/robots.txt` already exists and already points to the sitemap — no changes needed there.
- Formspree form ID: I'll use a placeholder constant `FORMSPREE_ID` at the top of the contact page so you only edit one line after signing up.

## Part 1 — Contact page (`/contact`)
Create `src/routes/contact.tsx`:
- `head()` with title/description/og/canonical for `/contact`.
- Hero: "Get in Touch" + subtitle.
- **Form** (controlled React state, `fetch` POST to `https://formspree.io/f/${FORMSPREE_ID}` with `Accept: application/json`):
  - Name, Email, Subject (Select with the 5 options), Message (Textarea rows=5).
  - Zod validation client-side (name 1–100, email valid + ≤255, message 1–2000, subject enum). Errors shown inline.
  - States: idle / submitting / success / error → toast + inline message exactly as specified.
  - Reset form on success.
- **3 info cards** (Email / Quick Response / Follow Us) using the existing card styling pattern (`bg-card border border-border rounded-2xl`).
- **FAQ section** using the existing `Accordion` component from `@/components/ui/accordion` for the 5 Q&As.
- Dark theme + cyan→blue gradient submit button matching site tokens.

## Part 2 — Navigation
- `src/components/site-header.tsx`: add `{ to: "/contact", label: "Contact" }` to `links` (between About and theme toggle area).
- `src/components/site-footer.tsx`: add Contact to Quick Links and to the bottom legal bar.

## Part 3 — Per-page SEO (`head()` upgrades)
For each route below, ensure `head()` includes title, description, og:title, og:description, og:url, twitter equivalents, and `<link rel="canonical">` via `links: [{ rel: "canonical", href: "https://skycally.com/..." }]`. Use the exact copy from your spec.

Routes to update:
- `src/routes/index.tsx` — homepage copy + JSON-LD WebSite schema (added via `scripts: [{ type: "application/ld+json", children: JSON.stringify(...) }]`).
- `src/routes/tools.video-downloader.tsx`
- `src/routes/tools.qr-generator.tsx`
- `src/routes/tools.remove-bg.tsx`
- `src/routes/tools.image-converter.tsx`
- `src/routes/tools.image-compressor.tsx`
- `src/routes/tools.image-resizer.tsx`
- `src/routes/tools.image-cropper.tsx`
- `src/routes/tools.merge-pdf.tsx`
- `src/routes/tools.word-to-pdf.tsx`
- `src/routes/tools.split-pdf.tsx`
- `src/routes/tools.business-card-generator.tsx`
- `src/routes/tools.text-to-speech.tsx`
- `src/routes/tools.object-detection.tsx`
- `src/routes/tools.sentiment-analysis.tsx`

We will only change `head()` on these — no UI/business-logic changes.

## Part 4 — Sitemap
Update `src/routes/sitemap[.]xml.tsx` `ROUTES` to match your full list (adds `/contact`, `/tools/business-card-generator`, the new video tools, AI tools, `image-resizer`, `image-cropper`, `add-text-to-image`, `image-to-pdf`, `collage-maker`, `meme-generator`, `background-blur`, `face-landmarks`, `hand-gesture`, etc.). Priorities mirror your spec.

`public/robots.txt` already correct — no change.

## Part 5 — JSON-LD
Added on homepage via the `scripts` array in `head()` (TanStack-native, see Part 3).

## Files touched
**Created:** `src/routes/contact.tsx`
**Edited:** `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/routes/sitemap[.]xml.tsx`, `src/routes/index.tsx`, plus the 14 tool route files listed above (only their `head()` blocks).
**Auto-regenerated:** `src/routeTree.gen.ts` (TanStack plugin handles it).

## After implementation
You'll need to:
1. Sign up at formspree.io, grab the form ID, and replace `FORMSPREE_ID` at the top of `src/routes/contact.tsx`.
2. Optionally provide a real `og-image.png` at `/og-image.png` (homepage references it).