## Add CollectionPage + ItemList JSON-LD to `/tools`

Inject structured data into the tools listing route so Google can recognize it as a curated collection of tools.

### File to edit
`src/routes/tools.index.tsx` — extend the existing `head()` to add a `scripts` array alongside the current `buildPageMeta(...)` return.

### Schema shape
Single JSON-LD `<script type="application/ld+json">` containing a `CollectionPage` whose `mainEntity` is an `ItemList`. Each entry maps a visible (non-hidden) tool to its absolute URL, name, and description.

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "All Free Online Tools — Skycally",
  "description": "Browse 40+ free tools: compress images, convert PDFs, generate QR codes, download videos and more.",
  "url": "https://skycally.com/tools",
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 40,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "url": "https://skycally.com/tools/video-to-gif",
        "name": "Video to GIF",
        "description": "Convert any video clip to a high-quality animated GIF."
      }
      // ...one entry per visible tool
    ]
  }
}
```

### Implementation details
- Build the list inside `head()` from `tools.filter(t => !t.hidden)`, preserving the array order (which already groups by category).
- Use `SITE_URL` from `@/lib/seo` to produce absolute URLs (`${SITE_URL}${tool.path}`).
- Spread the existing `buildPageMeta(...)` result and append a `scripts` array — do not duplicate or alter `meta`/`links`.
- No new helper file; the schema is page-specific and only used here.

### Out of scope
- No changes to UI, styles, tool logic, or any other route.
- No changes to `buildToolMeta` (per-tool `SoftwareApplication` schema already in place).
