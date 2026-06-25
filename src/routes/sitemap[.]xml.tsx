import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  component: () => null,
  loader: () => {
    const SITE = "https://skycally.com";
    const now = new Date().toISOString().slice(0, 10);

    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/tools", priority: "0.9", changefreq: "daily" },
      { url: "/blog", priority: "0.7", changefreq: "weekly" },
      { url: "/about", priority: "0.5", changefreq: "monthly" },
      { url: "/contact", priority: "0.5", changefreq: "monthly" },
      { url: "/privacy", priority: "0.3", changefreq: "monthly" },
      { url: "/terms", priority: "0.3", changefreq: "monthly" },
    ];

    const toolSlugs = [
      // Video
      "video-to-gif",
      "video-trimmer",
      "video-merger",
      "add-subtitles",
      "video-compressor",
      "extract-audio",
      "screen-recorder",
      // Image
      "image-converter",
      "image-compressor",
      "image-upscaler",
      "remove-bg",
      "image-resizer",
      "image-cropper",
      "image-filters",
      "image-to-sketch",
      "add-watermark",
      "add-text-to-image",
      "image-to-pdf",
      "image-to-text",
      "collage-maker",
      "meme-generator",
      "business-card-generator",
      "color-palette",
      "color-picker",
      // Audio
      "audio-converter",
      "text-to-speech",
      "speech-to-text",
      // PDF
      "pdf-text-extractor",
      "word-to-pdf",
      "merge-pdf",
      "compress-pdf",
      "split-pdf",
      "pdf-to-images",
      "pdf-to-word",
      "rotate-pdf",
      "delete-pdf-pages",
      "pdf-page-numbers",
      "protect-pdf",
      "pdf-reader",
      "pdf-watermark-remover",
      "document-scanner",
      "file-viewer",
      // Text
      "base64",
      "word-counter",
      "json-formatter",
      "markdown-to-html",
      "url-encoder",
      "uuid-generator",
      "hash-generator",
      "lorem-ipsum",
      "word-processor",
      // Finance / Utility
      "unit-converter",
      "currency-converter",
      "satoshi-converter",
      "loan-calculator",
      "emi-calculator",
      "mortgage-calculator",
      "car-loan-calculator",
      "compound-interest",
      "tip-calculator",
      "age-calculator",
      "bmi-calculator",
      "sleep-calculator",
      "country-info",
      "holiday-checker",
      "weather-checker",
      "world-radio",
      "network-speed-test",
      "ip-address-lookup",
      "webrtc-leak-test",
      "dns-leak-test",
      "port-checker",
      "ssh-key-generator",
      "password-generator",
      "qr-generator",
      "qr-reader",
      "link-shortener",
      "element-mixer",
      "free-time-fixer",
      "timetable-generator",
      "youtube-comment-analyzer",
      // AI
      "background-blur",
      "face-landmarks",
      "hand-gesture",
      "object-detection",
      "sentiment-analysis",
      // Games
      "wordle",
      "2048",
      "tetris",
      "chess",
      "snake",
      "connect-four",
      "hangman",
      "minesweeper",
      "sudoku",
      "memory-match",
      "tic-tac-toe",
      "flappy-bird",
      "typing-speed",
      "ball-sort",
      "sliding-puzzle",
      "word-search",
      "bubble-shooter",
      "breakout",
      "pac-man",
      "solitaire",
      "mahjong",
      "space-shooter",
      "tunnel-dash",
      "pinball",
      "whack-a-mole",
      // Mini games / utilities
      "spinning-wheel",
      "dice-roller",
      "role-spinner",
      "random-team-maker",
      "truth-or-dare",
    ];

    const toolPages = toolSlugs.map((slug) => ({
      url: `/tools/${slug}`,
      priority: "0.8",
      changefreq: "weekly",
    }));

    const allPages = [...staticPages, ...toolPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${SITE}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});
