import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  component: () => null,
  beforeLoad: () => {
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
      "video-to-gif",
      "video-trimmer",
      "video-merger",
      "add-subtitles",
      "video-compressor",
      "extract-audio",
      "screen-recorder",
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
      "audio-converter",
      "text-to-speech",
      "speech-to-text",
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
      "pdf-reader",
      "pdf-watermark-remover",
      "document-scanner",
      "file-viewer",
      "base64",
      "word-counter",
      "json-formatter",
      "markdown-to-html",
      "url-encoder",
      "uuid-generator",
      "hash-generator",
      "lorem-ipsum",
      "word-processor",
      "unit-converter",
      "currency-converter",
      "satoshi-converter",
      "loan-calculator",
      "emi-calculator",
      "mortgage-calculator",
      "car-loan-calculator",
      "compound-interest",
      "calorie-calculator",
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
      "background-blur",
      "face-landmarks",
      "hand-gesture",
      "object-detection",
      "sentiment-analysis",
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
      "spinning-wheel",
      "dice-roller",
      "role-spinner",
      "random-team-maker",
      "truth-or-dare",
    ];

    const allPages = [
      ...staticPages,
      ...toolSlugs.map((slug) => ({
        url: `/tools/${slug}`,
        priority: "0.8",
        changefreq: "weekly",
      })),
    ];

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      allPages
        .map(
          (p) =>
            "  <url>\n" +
            "    <loc>" +
            SITE +
            p.url +
            "</loc>\n" +
            "    <lastmod>" +
            now +
            "</lastmod>\n" +
            "    <changefreq>" +
            p.changefreq +
            "</changefreq>\n" +
            "    <priority>" +
            p.priority +
            "</priority>\n" +
            "  </url>",
        )
        .join("\n") +
      "\n</urlset>";

    throw new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});
