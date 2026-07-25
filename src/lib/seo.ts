import type { Tool } from "@/lib/tools";

export const SITE_URL = "https://skycally.com";
export const OG_IMAGE = "https://skycally.com/og-image.png";

const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}

export function buildPageMeta({ title, description, path, ogImage = OG_IMAGE }: PageMetaInput) {
  const url = SITE_URL + (path === "/" ? "" : path);
  const t = truncate(title, 60);
  const d = truncate(description, 160);
  return {
    meta: [
      // Primary
      { title: t },
      { name: "description", content: d },
      { name: "robots", content: "index, follow" },
      // Open Graph — use og:type "article" for tool pages (more specific than "website")
      { property: "og:title", content: t },
      { property: "og:description", content: d },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: t },
      { property: "og:site_name", content: "Skycally" },
      // Twitter / X — use summary_large_image consistently
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@skycally" },
      { name: "twitter:title", content: t },
      { name: "twitter:description", content: d },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: t },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function buildToolMeta(tool: Tool) {
  // Unique title per tool — avoids duplicate title warnings
  const title = `Free ${tool.name} Online — No Signup | Skycally`;
  // Unique description per tool using tool.description (already unique per tool)
  const description = truncate(`${tool.description} Free, private, works in your browser.`, 160);
  const base = buildPageMeta({ title, description, path: tool.path });
  return {
    ...base,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": tool.schemaType ?? "SoftwareApplication",
          name: tool.name,
          applicationCategory: tool.schemaCategory ?? "WebApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: `${SITE_URL}${tool.path}`,
          description: tool.description,
          featureList: tool.featureList ?? [
            "No signup required",
            "100% browser-based",
            "Private — files never leave your device",
            "Free forever",
          ],
        }),
      },
    ],
  };
}

export function buildPageMeta_with_schema({
  title,
  description,
  path,
  ogImage,
  schema,
}: PageMetaInput & { schema?: object }) {
  const base = buildPageMeta({ title, description, path, ogImage });
  if (!schema) return base;
  return {
    ...base,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(schema),
      },
    ],
  };
}

export function toolBySlug(slug: string, tools: Tool[]): Tool {
  const t = tools.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool slug: ${slug}`);
  return t;
}
