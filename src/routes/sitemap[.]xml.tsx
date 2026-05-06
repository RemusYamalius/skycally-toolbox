import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://skycally.com";

const ROUTES = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/tools",
  "/tools/base64",
  "/tools/image-compressor",
  "/tools/image-converter",
  "/tools/image-to-text",
  "/tools/image-upscaler",
  "/tools/merge-pdf",
  "/tools/password-generator",
  "/tools/pdf-text-extractor",
  "/tools/qr-generator",
  "/tools/qr-reader",
  "/tools/remove-bg",
  "/tools/speech-to-text",
  "/tools/text-to-speech",
  "/tools/video-downloader",
  "/tools/video-to-gif",
  "/tools/word-counter",
  "/tools/word-to-pdf",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().split("T")[0];
        const urls = ROUTES.map((path) => {
          const priority = path === "/" ? "1.0" : path.startsWith("/tools") ? "0.8" : "0.5";
          return `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
        }).join("\n");

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
