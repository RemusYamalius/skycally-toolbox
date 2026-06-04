import { tools, type Tool } from "./tools";

// Map of tool slug -> 3 related tool slugs.
// Names not present in the registry are normalized to the closest existing slug.
export const relatedToolsMap: Record<string, string[]> = {
  // AI
  "background-blur": ["face-landmarks", "hand-gesture", "remove-bg"],
  "face-landmarks": ["background-blur", "hand-gesture", "object-detection"],
  "hand-gesture": ["face-landmarks", "background-blur", "object-detection"],
  "object-detection": ["hand-gesture", "face-landmarks", "sentiment-analysis"],
  "sentiment-analysis": ["object-detection", "word-counter", "text-to-speech"],

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
  "remove-bg": ["image-compressor", "qr-generator", "image-upscaler"],
  "image-to-text": ["pdf-text-extractor", "word-counter", "image-to-pdf"],
  "color-palette": ["image-filters", "image-to-sketch", "add-watermark"],
  "image-filters": ["image-to-sketch", "add-watermark", "color-palette"],
  "add-watermark": ["image-filters", "image-to-sketch", "image-compressor"],
  "image-to-sketch": ["image-filters", "add-watermark", "color-palette"],
  "image-resizer": ["image-compressor", "image-cropper", "add-watermark"],
  "image-cropper": ["image-resizer", "add-watermark", "image-compressor"],
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
  "base64": ["json-formatter", "password-generator", "word-counter"],
  "word-counter": ["markdown-to-html", "json-formatter", "text-to-speech"],
  "json-formatter": ["base64", "markdown-to-html", "word-counter"],
  "markdown-to-html": ["word-counter", "json-formatter", "add-text-to-image"],

  // Mini Games
  "sliding-puzzle": ["sudoku", "memory-match", "minesweeper"],
  "whack-a-mole": ["flappy-bird", "snake", "memory-match"],
  "bubble-shooter": ["snake", "flappy-bird", "memory-match"],
  "breakout": ["flappy-bird", "snake", "bubble-shooter"],
  "pac-man": ["snake", "breakout", "bubble-shooter"],
  "solitaire": ["memory-match", "minesweeper", "sudoku"],
  "mahjong": ["sudoku", "memory-match", "sliding-puzzle"],
  "tunnel-dash": ["snake", "pac-man", "breakout"],
  "pinball": ["breakout", "bubble-shooter", "pac-man"],

  // Utility
  "ip-address-lookup": ["network-speed-test", "qr-generator", "url-encoder"],
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
