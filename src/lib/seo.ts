import type { Tool } from "@/lib/tools";

export const SITE_URL = "https://skycally.com";
export const OG_IMAGE = "https://skycally.com/og-image.png";

const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

export interface PageMetaInput {
  title: string;
  description: string;
  path: string; // leading slash, e.g. "/about" or "/"
  ogImage?: string;
}

export function buildPageMeta({ title, description, path, ogImage = OG_IMAGE }: PageMetaInput) {
  const url = SITE_URL + (path === "/" ? "" : path);
  const t = truncate(title, 60);
  const d = truncate(description, 160);
  return {
    meta: [
      { title: t },
      { name: "description", content: d },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: t },
      { property: "og:description", content: d },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: t },
      { name: "twitter:description", content: d },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function buildToolMeta(tool: Tool) {
  const title = `Free ${tool.name} Online — No Signup | Skycally`;
  const description = `${tool.description} Free, private, works in your browser.`;
  const base = buildPageMeta({ title, description, path: tool.path });
  return {
    ...base,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: tool.name,
          applicationCategory: "WebApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: `${SITE_URL}${tool.path}`,
          description: tool.description,
        }),
      },
    ],
  };
}

export function toolBySlug(slug: string, tools: Tool[]): Tool {
  const t = tools.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool slug: ${slug}`);
  return t;
}
