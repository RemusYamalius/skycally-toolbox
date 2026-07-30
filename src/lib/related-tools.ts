import { tools, type Tool } from "./tools";

// Map of tool slug -> 3 related tool slugs.
// Names not present in the registry are normalized to the closest existing slug.
export const relatedToolsMap: Record<string, string[]> = {
  "would-you-rather": ["truth-or-dare", "never-have-i-ever", "role-spinner", "random-team-maker", "spinning-wheel", "dice-roller"],
  "truth-or-dare": ["never-have-i-ever", "would-you-rather", "spinning-wheel", "role-spinner", "random-team-maker", "dice-roller"],
  "never-have-i-ever": ["truth-or-dare", "would-you-rather", "spinning-wheel", "dice-roller", "random-team-maker", "role-spinner"],
  "file-viewer": ["pdf-to-word", "word-processor", "pdf-reader", "pdf-text-extractor", "image-to-text"],
  "loan-calculator": ["emi-calculator", "mortgage-calculator", "car-loan-calculator", "tip-calculator", "currency-converter", "insurance-estimator"],
  "emi-calculator": ["loan-calculator", "mortgage-calculator", "car-loan-calculator", "tip-calculator", "currency-converter"],
  "mortgage-calculator": ["rent-vs-buy-calculator", "loan-calculator", "emi-calculator", "car-loan-calculator", "compound-interest", "currency-converter", "insurance-estimator"],
  "car-loan-calculator": ["loan-calculator", "emi-calculator", "mortgage-calculator", "tip-calculator", "currency-converter"],
  
  "margin-calculator": ["percentage-calculator", "tip-calculator", "currency-converter", "compound-interest", "loan-calculator", "unit-converter"],
  "percentage-calculator": ["margin-calculator", "tip-calculator", "currency-converter", "unit-converter", "compound-interest", "loan-calculator"],
  "tip-calculator": ["percentage-calculator", "margin-calculator", "currency-converter", "unit-converter", "loan-calculator"],
  "income-tax-calculator": ["paycheck-calculator", "retirement-calculator", "mortgage-calculator", "percentage-calculator", "compound-interest", "debt-payoff-calculator"],
  "paycheck-calculator": ["income-tax-calculator", "retirement-calculator", "rent-vs-buy-calculator", "loan-calculator", "mortgage-calculator", "compound-interest", "currency-converter", "debt-payoff-calculator", "insurance-estimator"],
  "debt-payoff-calculator": ["retirement-calculator", "paycheck-calculator", "loan-calculator", "compound-interest", "mortgage-calculator", "currency-converter", "insurance-estimator"],
  "rent-vs-buy-calculator": ["retirement-calculator", "mortgage-calculator", "compound-interest", "paycheck-calculator", "loan-calculator", "debt-payoff-calculator", "insurance-estimator"],
  "insurance-estimator": ["retirement-calculator", "paycheck-calculator", "debt-payoff-calculator", "mortgage-calculator", "rent-vs-buy-calculator", "loan-calculator"],
  "retirement-calculator": ["compound-interest", "paycheck-calculator", "debt-payoff-calculator", "rent-vs-buy-calculator", "mortgage-calculator", "insurance-estimator"],
  "compound-interest": ["retirement-calculator", "rent-vs-buy-calculator", "loan-calculator", "emi-calculator", "mortgage-calculator", "tip-calculator", "currency-converter"],
  "color-picker": ["color-palette", "image-filters", "meme-generator", "qr-generator", "add-text-to-image"],
  // AI
  "background-blur": ["face-landmarks", "hand-gesture", "remove-bg"],
  "face-landmarks": ["background-blur", "hand-gesture", "object-detection"],
  "hand-gesture": ["face-landmarks", "background-blur", "object-detection"],
  "object-detection": ["hand-gesture", "face-landmarks", "sentiment-analysis"],
  "sentiment-analysis": ["object-detection", "word-counter", "text-to-speech"],
  "ai-image-generator": ["image-animator", "image-filters", "image-resizer", "remove-bg", "collage-maker", "add-watermark", "image-upscaler", "meme-generator", "business-card-generator"],
  "image-animator": ["ai-image-generator", "video-to-gif", "image-filters", "image-resizer", "remove-bg", "collage-maker", "video-trimmer"],


  // Video
  "video-downloader": ["video-to-gif", "video-compressor", "extract-audio"],
  "video-to-gif": ["video-downloader", "video-compressor", "screen-recorder"],
  "video-trimmer": ["video-compressor", "video-to-gif", "video-downloader"],
  "video-merger": ["video-trimmer", "video-compressor", "video-downloader"],
  "add-subtitles": ["video-trimmer", "video-downloader", "screen-recorder"],
  "screen-recorder": ["video-to-gif", "video-compressor", "video-downloader"],
  "video-compressor": ["video-downloader", "extract-audio", "video-to-gif"],
  "extract-audio": ["audio-converter", "video-compressor", "video-downloader"],

  // Image
  "image-converter": ["image-compressor", "image-resizer", "image-to-pdf"],
  "image-compressor": ["image-resizer", "image-converter", "add-watermark"],
  "image-upscaler": ["image-compressor", "remove-bg", "image-filters"],
  "remove-bg": ["image-compressor", "passport-photo-maker", "image-upscaler"],
  "image-to-text": ["pdf-text-extractor", "word-counter", "image-to-pdf"],
  "color-palette": ["image-filters", "image-to-sketch", "add-watermark"],
  "image-filters": ["image-to-sketch", "add-watermark", "color-palette"],
  "add-watermark": ["image-filters", "image-to-sketch", "image-compressor"],
  "image-to-sketch": ["image-filters", "add-watermark", "color-palette"],
  "image-resizer": ["image-compressor", "image-cropper", "add-watermark"],
  "image-cropper": ["image-resizer", "add-watermark", "passport-photo-maker"],
  "passport-photo-maker": ["remove-bg", "image-cropper", "image-to-pdf"],
  "add-text-to-image": ["add-watermark", "image-filters", "meme-generator"],
  "image-to-pdf": ["image-compressor", "compress-pdf", "pdf-to-images"],
  "collage-maker": ["add-text-to-image", "image-filters", "meme-generator"],
  "meme-generator": ["add-text-to-image", "image-filters", "collage-maker"],
  "business-card-generator": ["qr-generator", "add-text-to-image", "add-watermark"],

  // Audio
  "text-to-speech": ["speech-to-text", "word-counter", "audio-converter"],
  "speech-to-text": ["text-to-speech", "audio-converter", "word-counter"],
  "audio-converter": ["extract-audio", "speech-to-text", "text-to-speech"],

  // PDF & Documents
  "pdf-text-extractor": ["image-to-text", "word-counter", "compress-pdf"],
  "word-to-pdf": ["compress-pdf", "merge-pdf", "pdf-text-extractor"],
  "merge-pdf": ["split-pdf", "compress-pdf", "rotate-pdf"],
  "split-pdf": ["merge-pdf", "compress-pdf", "rotate-pdf"],
  "compress-pdf": ["merge-pdf", "split-pdf", "pdf-to-images"],
  "pdf-to-images": ["compress-pdf", "split-pdf", "image-to-pdf"],
  "rotate-pdf": ["merge-pdf", "split-pdf", "compress-pdf"],
  "document-scanner": ["pdf-text-extractor", "image-to-text", "compress-pdf"],

  // Text
  "qr-generator": ["qr-reader", "password-generator", "base64"],
  "qr-reader": ["qr-generator", "image-to-text", "base64"],
  "password-generator": ["base64", "word-counter", "json-formatter"],
  base64: ["json-formatter", "password-generator", "word-counter"],
  "word-counter": ["fancy-text-generator", "markdown-to-html", "json-formatter", "text-to-speech"],
  "fancy-text-generator": ["word-counter", "add-text-to-image", "meme-generator", "qr-generator", "password-generator"],
  "json-formatter": ["base64", "markdown-to-html", "word-counter"],
  "markdown-to-html": ["word-counter", "json-formatter", "add-text-to-image"],
  "word-processor": ["currency-converter", "weather-checker", "text-to-speech"],

  // Finance / Travel
  "currency-converter": ["holiday-checker", "weather-checker", "country-info"],
  "time-zone-converter": ["currency-converter", "country-info", "holiday-checker", "weather-checker", "age-calculator", "unit-converter"],
  "satoshi-converter": ["currency-converter", "compound-interest", "loan-calculator", "tip-calculator", "qr-generator"],
  "unit-converter": ["currency-converter", "satoshi-converter", "color-picker", "qr-generator", "json-formatter"],

  // Mini Games
  "sliding-puzzle": ["sudoku", "memory-match", "minesweeper"],
  "whack-a-mole": ["flappy-bird", "snake", "memory-match"],
  "bubble-shooter": ["snake", "flappy-bird", "memory-match"],
  breakout: ["flappy-bird", "snake", "bubble-shooter"],
  "pac-man": ["snake", "breakout", "bubble-shooter"],
  solitaire: ["memory-match", "minesweeper", "sudoku"],
  mahjong: ["sudoku", "memory-match", "sliding-puzzle", "maze-puzzle"],
  "tunnel-dash": ["snake", "pac-man", "breakout"],
  pinball: ["breakout", "bubble-shooter", "pac-man"],
  "space-shooter": ["snake", "2048", "wordle"],
  tetris: ["2048", "snake", "pac-man", "breakout", "bubble-shooter", "minesweeper"],
  "word-groups": ["crossword", "wordle", "word-search", "hangman", "sliding-puzzle", "memory-match"],
  crossword: ["word-groups", "wordle", "word-search", "hangman", "sudoku", "memory-match"],
  "maze-puzzle": ["sliding-puzzle", "minesweeper", "sudoku", "memory-match", "ball-sort", "2048"],
  "ball-sort": ["2048", "sudoku", "memory-match", "sliding-puzzle", "minesweeper", "maze-puzzle"],
  "shooting-ball": ["bubble-shooter", "breakout", "ball-sort", "pinball", "pac-man"],
  // Utility
  "ip-address-lookup": ["network-speed-test", "qr-generator", "url-encoder"],
  "port-checker": ["ip-address-lookup", "network-speed-test", "qr-generator"],
  "webrtc-leak-test": ["ip-address-lookup", "network-speed-test", "port-checker"],
  "dns-leak-test": ["ip-address-lookup", "webrtc-leak-test", "port-checker"],
  "ssh-key-generator": ["password-generator", "hash-generator", "uuid-generator"],
  "timetable-generator": ["age-calculator", "qr-generator", "word-to-pdf"],
  "world-radio": ["network-speed-test", "ip-address-lookup", "qr-generator"],
  "element-mixer": ["age-calculator", "bmi-calculator", "wordle"],
  "calorie-calculator": ["macro-calculator", "bmi-calculator", "sleep-calculator", "age-calculator", "tip-calculator", "unit-converter"],
  "water-intake-calculator": ["calorie-calculator", "macro-calculator", "bmi-calculator", "sleep-calculator", "age-calculator", "unit-converter"],
  "heart-rate-zone-calculator": ["macro-calculator", "calorie-calculator", "bmi-calculator", "sleep-calculator", "water-intake-calculator", "unit-converter"],
  "intermittent-fasting-calculator": ["macro-calculator", "calorie-calculator", "sleep-calculator", "water-intake-calculator", "bmi-calculator", "heart-rate-zone-calculator"],
  "macro-calculator": ["calorie-calculator", "intermittent-fasting-calculator", "heart-rate-zone-calculator", "bmi-calculator", "water-intake-calculator"],
  "pregnancy-calculator": ["water-intake-calculator", "sleep-calculator", "calorie-calculator", "bmi-calculator", "age-calculator"],
  "attachment-style-test": ["big-five-personality-test", "would-you-rather", "fancy-text-generator", "word-groups", "meme-generator"],
  "big-five-personality-test": ["attachment-style-test", "fancy-text-generator", "word-groups", "meme-generator", "wordle", "hangman"],
  "invoice-generator": ["qr-generator", "business-card-generator", "currency-converter", "pdf-reader", "word-processor"],
  "ai-cover-letter-generator": ["ai-writing-assistant", "ai-resume-builder", "word-processor", "word-to-pdf", "pdf-text-extractor", "word-counter"],
  "ai-resume-builder": ["ai-writing-assistant", "ai-cover-letter-generator", "word-processor", "word-to-pdf", "pdf-text-extractor", "word-counter"],
  "ai-writing-assistant": ["ai-email-writer", "ai-cover-letter-generator", "ai-resume-builder", "word-counter", "word-processor"],
  "ai-bio-generator": ["fancy-text-generator", "ai-writing-assistant", "ai-email-writer", "word-counter", "meme-generator"],

  // SEO (Semrush)
  "keyword-research": ["keyword-difficulty", "competitor-analysis", "domain-analysis", "page-seo-analyzer", "backlink-checker"],
  "domain-analysis": ["competitor-analysis", "backlink-checker", "page-seo-analyzer", "keyword-research", "keyword-difficulty"],
  "backlink-checker": ["domain-analysis", "competitor-analysis", "page-seo-analyzer", "keyword-research", "keyword-difficulty"],
  "keyword-difficulty": ["keyword-research", "competitor-analysis", "page-seo-analyzer", "domain-analysis", "backlink-checker"],
  "competitor-analysis": ["domain-analysis", "backlink-checker", "keyword-research", "keyword-difficulty", "page-seo-analyzer"],
  "page-seo-analyzer": ["keyword-research", "domain-analysis", "keyword-difficulty", "competitor-analysis", "backlink-checker"],
};


export function getRelatedTools(slug: string): Tool[] {
  const bySlug = (s: string) => tools.find((t) => t.slug === s);
  const out: Tool[] = [];
  const seen = new Set<string>([slug]);

  for (const s of relatedToolsMap[slug] ?? []) {
    const t = bySlug(s);
    if (t && !seen.has(t.slug) && !t.hidden) {
      out.push(t);
      seen.add(t.slug);
    }
    if (out.length === 3) return out;
  }

  // Fallback: top up with same-category tools
  const current = bySlug(slug);
  if (current) {
    for (const t of tools) {
      if (out.length === 3) break;
      if (!seen.has(t.slug) && !t.hidden && t.category === current.category) {
        out.push(t);
        seen.add(t.slug);
      }
    }
  }
  // Final fallback: any other tool
  for (const t of tools) {
    if (out.length === 3) break;
    if (!seen.has(t.slug) && !t.hidden) {
      out.push(t);
      seen.add(t.slug);
    }
  }
  return out;
}
