import { Download, Image as ImageIcon, FileText, Scissors, FileType, Combine, Minimize2, FileImage, QrCode, ScanLine, ScanText, Sparkles, Volume2, Mic, Film, Lock, Code2 } from "lucide-react";

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
];
