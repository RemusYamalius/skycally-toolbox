import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { blogPosts } from "@/lib/blog";

const SITE = "https://skycally.com";

interface Entry {
  path: string;
  priority: string;
  changefreq: "weekly" | "monthly" | "yearly";
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);

        const entries: Entry[] = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/tools", priority: "0.9", changefreq: "weekly" },
          { path: "/blog", priority: "0.8", changefreq: "weekly" },
          ...tools
            .filter((t) => !t.hidden)
            .map<Entry>((t) => ({ path: t.path, priority: "0.8", changefreq: "monthly" })),
          ...blogPosts.map<Entry>((p) => ({ path: p.path, priority: "0.7", changefreq: "monthly" })),
          { path: "/about", priority: "0.5", changefreq: "monthly" },
          { path: "/contact", priority: "0.5", changefreq: "monthly" },
          { path: "/terms", priority: "0.3", changefreq: "yearly" },
          { path: "/privacy", priority: "0.3", changefreq: "yearly" },
        ];

        const urls = entries
          .map(
            (e) => `  <url>
    <loc>${SITE}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
