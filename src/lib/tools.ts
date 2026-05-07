import { Download, Image as ImageIcon, FileText, Scissors, FileType, Combine, Minimize2, FileImage, QrCode, ScanLine, ScanText, Sparkles, Volume2, Mic, Film, Lock, Code2, Type, Braces, Palette, Wand2, Stamp, Pencil, FileCode, Monitor, Scissors as ScissorsIcon } from "lucide-react";

export type ToolCategory = "video" | "image" | "pdf" | "text" | "audio";

export const categoryMeta: Record<ToolCategory, { label: string; color: string; icon: string }> = {
  video: { label: "Video Tools", color: "var(--cyan-brand)", icon: "🎬" },
  image: { label: "Image Tools", color: "var(--violet-brand)", icon: "🖼️" },
  audio: { label: "Audio Tools", color: "var(--violet-brand)", icon: "🎙️" },
  pdf: { label: "PDF & Documents", color: "var(--orange-brand)", icon: "📄" },
  text: { label: "Text Tools", color: "var(--green-brand)", icon: "✍️" },
};

export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: typeof Download;
  path: string;
}

export const tools: Tool[] = [
  { slug: "video-downloader", name: "Video Downloader", description: "Download videos from TikTok, Instagram, YouTube and more.", category: "video", icon: Download, path: "/tools/video-downloader" },
  { slug: "video-to-gif", name: "Video to GIF", description: "Convert any video clip to a high-quality animated GIF.", category: "video", icon: Film, path: "/tools/video-to-gif" },
  { slug: "image-converter", name: "Image Converter", description: "Convert PNG, JPG, WebP and AVIF in seconds.", category: "image", icon: FileImage, path: "/tools/image-converter" },
  { slug: "image-compressor", name: "Image Compressor", description: "Shrink images without losing quality.", category: "image", icon: Minimize2, path: "/tools/image-compressor" },
  { slug: "image-upscaler", name: "Image Upscaler", description: "Upscale images 2x or 4x with Real-ESRGAN AI.", category: "image", icon: Sparkles, path: "/tools/image-upscaler" },
  { slug: "remove-bg", name: "Remove Background", description: "Erase image backgrounds with one click.", category: "image", icon: Scissors, path: "/tools/remove-bg" },
  { slug: "pdf-text-extractor", name: "Extract Text from PDF", description: "Extract all text from any PDF instantly.", category: "pdf", icon: FileText, path: "/tools/pdf-text-extractor" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Turn Word documents into polished PDFs.", category: "pdf", icon: FileType, path: "/tools/word-to-pdf" },
  { slug: "merge-pdf", name: "Merge PDF", description: "Combine multiple PDFs into a single file.", category: "pdf", icon: Combine, path: "/tools/merge-pdf" },
  { slug: "qr-generator", name: "QR Code Generator", description: "Create custom QR codes from any URL or text.", category: "text", icon: QrCode, path: "/tools/qr-generator" },
  { slug: "qr-reader", name: "QR Code Reader", description: "Decode QR codes from images or your camera.", category: "text", icon: ScanLine, path: "/tools/qr-reader" },
  { slug: "image-to-text", name: "Image to Text (OCR)", description: "Extract text from images in multiple languages.", category: "image", icon: ScanText, path: "/tools/image-to-text" },
  { slug: "text-to-speech", name: "Text to Speech", description: "Convert text to natural speech in multiple languages.", category: "audio", icon: Volume2, path: "/tools/text-to-speech" },
  { slug: "speech-to-text", name: "Speech to Text", description: "Transcribe your voice to text in real-time.", category: "audio", icon: Mic, path: "/tools/speech-to-text" },
  { slug: "password-generator", name: "Password Generator", description: "Generate strong, secure passwords instantly.", category: "text", icon: Lock, path: "/tools/password-generator" },
  { slug: "base64", name: "Base64 Encoder / Decoder", description: "Encode plain text to Base64 or decode Base64 strings instantly.", category: "text", icon: Code2, path: "/tools/base64" },
  { slug: "word-counter", name: "Word Counter", description: "Count words, characters, sentences and estimate reading time.", category: "text", icon: Type, path: "/tools/word-counter" },
  { slug: "json-formatter", name: "JSON Formatter", description: "Format, prettify and minify JSON instantly.", category: "text", icon: Braces, path: "/tools/json-formatter" },
  { slug: "color-palette", name: "Color Palette Extractor", description: "Extract the dominant colors from any image instantly.", category: "image", icon: Palette, path: "/tools/color-palette" },
  { slug: "image-filters", name: "Image Filters", description: "Apply beautiful filters to your images instantly in the browser.", category: "image", icon: Wand2, path: "/tools/image-filters" },
  { slug: "add-watermark", name: "Add Watermark", description: "Add custom text watermarks to your images in seconds.", category: "image", icon: Stamp, path: "/tools/add-watermark" },
  { slug: "image-to-sketch", name: "Image to Sketch", description: "Transform any photo into a pencil or charcoal sketch instantly.", category: "image", icon: Pencil, path: "/tools/image-to-sketch" },
  { slug: "markdown-to-html", name: "Markdown to HTML", description: "Convert Markdown to clean HTML with live preview instantly.", category: "text", icon: FileCode, path: "/tools/markdown-to-html" },
  { slug: "screen-recorder", name: "Screen Recorder", description: "Record your screen with audio directly in the browser — no installs needed.", category: "video", icon: Monitor, path: "/tools/screen-recorder" },
  { slug: "split-pdf", name: "Split PDF", description: "Extract specific pages from any PDF file instantly.", category: "pdf", icon: Scissors, path: "/tools/split-pdf" },
];
