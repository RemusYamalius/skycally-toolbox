import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://skycally.com";

// [path, priority, changefreq]
const ROUTES: [string, string, string][] = [
  ["/", "1.0", "weekly"],
  ["/tools", "0.9", "weekly"],
  ["/tools/video-downloader", "0.9", "weekly"],
  ["/tools/qr-generator", "0.8", "monthly"],
  ["/tools/remove-bg", "0.8", "monthly"],
  ["/tools/image-converter", "0.8", "monthly"],
  ["/tools/image-compressor", "0.8", "monthly"],
  ["/tools/image-resizer", "0.8", "monthly"],
  ["/tools/image-cropper", "0.8", "monthly"],
  ["/tools/add-text-to-image", "0.7", "monthly"],
  ["/tools/image-to-pdf", "0.7", "monthly"],
  ["/tools/collage-maker", "0.7", "monthly"],
  ["/tools/meme-generator", "0.7", "monthly"],
  ["/tools/business-card-generator", "0.8", "monthly"],
  ["/tools/merge-pdf", "0.8", "monthly"],
  ["/tools/word-to-pdf", "0.8", "monthly"],
  ["/tools/split-pdf", "0.7", "monthly"],
  ["/tools/compress-pdf", "0.7", "monthly"],
  ["/tools/rotate-pdf", "0.7", "monthly"],
  ["/tools/document-scanner", "0.8", "monthly"],
  ["/tools/pdf-to-images", "0.7", "monthly"],
  ["/tools/pdf-text-extractor", "0.7", "monthly"],
  ["/tools/text-to-speech", "0.7", "monthly"],
  ["/tools/speech-to-text", "0.7", "monthly"],
  ["/tools/audio-converter", "0.7", "monthly"],
  ["/tools/video-compressor", "0.7", "monthly"],
  ["/tools/extract-audio", "0.7", "monthly"],
  ["/tools/video-to-gif", "0.7", "monthly"],
  ["/tools/video-trimmer", "0.7", "monthly"],
  ["/tools/video-merger", "0.7", "monthly"],
  ["/tools/add-subtitles", "0.7", "monthly"],
  ["/tools/object-detection", "0.7", "monthly"],
  ["/tools/sentiment-analysis", "0.7", "monthly"],
  ["/tools/background-blur", "0.7", "monthly"],
  ["/tools/face-landmarks", "0.6", "monthly"],
  ["/tools/hand-gesture", "0.6", "monthly"],
  ["/tools/qr-reader", "0.7", "monthly"],
  ["/tools/image-to-text", "0.7", "monthly"],
  ["/tools/image-upscaler", "0.7", "monthly"],
  ["/tools/image-to-sketch", "0.7", "monthly"],
  ["/tools/image-filters", "0.7", "monthly"],
  ["/tools/add-watermark", "0.7", "monthly"],
  ["/tools/screen-recorder", "0.7", "monthly"],
  ["/tools/json-formatter", "0.6", "monthly"],
  ["/tools/markdown-to-html", "0.6", "monthly"],
  ["/tools/word-counter", "0.6", "monthly"],
  ["/tools/password-generator", "0.6", "monthly"],
  ["/tools/base64", "0.6", "monthly"],
  ["/tools/color-palette", "0.6", "monthly"],
  ["/blog", "0.8", "weekly"],
  ["/blog/compress-pdf-online-free", "0.7", "monthly"],
  ["/about", "0.5", "monthly"],
  ["/contact", "0.5", "monthly"],
  ["/privacy", "0.3", "yearly"],
  ["/terms", "0.3", "yearly"],
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = "2026-05-17";
        const urls = ROUTES.map(([path, priority, changefreq]) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n");

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
