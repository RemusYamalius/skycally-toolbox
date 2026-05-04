import { Download, Image as ImageIcon, FileText, Scissors, FileType, Combine, Minimize2, FileImage } from "lucide-react";

export type ToolCategory = "video" | "image" | "pdf" | "text";

export const categoryMeta: Record<ToolCategory, { label: string; color: string; icon: string }> = {
  video: { label: "Video Tools", color: "var(--cyan-brand)", icon: "🎬" },
  image: { label: "Image Tools", color: "var(--violet-brand)", icon: "🖼️" },
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
  { slug: "image-converter", name: "Image Converter", description: "Convert PNG, JPG, WebP and AVIF in seconds.", category: "image", icon: FileImage, path: "/tools/image-converter" },
  { slug: "image-compressor", name: "Image Compressor", description: "Shrink images without losing quality.", category: "image", icon: Minimize2, path: "/tools/image-compressor" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Convert PDF documents into editable Word files.", category: "pdf", icon: FileText, path: "/tools/pdf-to-word" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Turn Word documents into polished PDFs.", category: "pdf", icon: FileType, path: "/tools/word-to-pdf" },
  { slug: "merge-pdf", name: "Merge PDF", description: "Combine multiple PDFs into a single file.", category: "pdf", icon: Combine, path: "/tools/merge-pdf" },
  { slug: "remove-bg", name: "Remove Background", description: "Erase image backgrounds with one click.", category: "image", icon: Scissors, path: "/tools/remove-bg" },
];
