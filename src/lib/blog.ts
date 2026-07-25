import compressPdfThumb from "@/assets/blog-compress-pdf.png";
import videoToGifThumb from "@/assets/blog-video-to-gif.png";
import designersToolsThumb from "@/assets/blog-designers-tools.png";
import developersToolsThumb from "@/assets/blog-developers-tools.png";
import networkSpeedTestThumb from "@/assets/blog-network-speed-test.png";

export interface BlogPost {
  slug: string;
  path: string;
  title: string;
  description: string;
  category: string;
  date: string;
  dateLabel: string;
  author: string;
  ctaToolSlug: string;
  thumbnail: string;
  thumbnailAlt: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "compress-pdf-online-free",
    path: "/blog/compress-pdf-online-free",
    title: "How to Compress a PDF Online for Free (No Signup Required)",
    description: "Shrink large PDF files in seconds — right in your browser. No installs, no accounts, no watermarks.",
    category: "PDF & Documents",
    date: "2026-05-16",
    dateLabel: "May 16, 2026",
    author: "Skycally Team",
    ctaToolSlug: "compress-pdf",
    thumbnail: compressPdfThumb,
    thumbnailAlt: "Compress PDF tool interface",
  },
  {
    slug: "video-to-gif-online-free",
    path: "/blog/video-to-gif-online-free",
    title: "How to Convert Video to GIF Online for Free",
    description: "Turn any video clip into a shareable GIF in seconds — no software needed, works in your browser.",
    category: "Video Tools",
    date: "2026-05-17",
    dateLabel: "May 17, 2026",
    author: "Skycally Team",
    ctaToolSlug: "video-to-gif",
    thumbnail: videoToGifThumb,
    thumbnailAlt: "Video to GIF tool interface",
  },
  {
    slug: "best-free-online-tools-for-designers",
    path: "/blog/best-free-online-tools-for-designers",
    title: "Best Free Online Tools for Designers",
    description: "The best browser-based tools for designers — free, no signup, no installs.",
    category: "Design Tools",
    date: "2026-05-22",
    dateLabel: "May 22, 2026",
    author: "Skycally Team",
    ctaToolSlug: "remove-bg",
    thumbnail: designersToolsThumb,
    thumbnailAlt: "Remove Background tool interface",
  },
  {
    slug: "best-free-online-tools-for-developers-2025",
    path: "/blog/best-free-online-tools-for-developers-2025",
    title: "Best Free Online Tools for Developers",
    description: "The best browser-based tools for developers — free, no signup, no installs.",
    category: "Developer Tools",
    date: "2026-06-02",
    dateLabel: "June 2, 2026",
    author: "Skycally Team",
    ctaToolSlug: "json-formatter",
    thumbnail: developersToolsThumb,
    thumbnailAlt: "JSON Formatter tool interface",
  },
  {
    slug: "how-to-test-internet-speed-online-free",
    path: "/blog/how-to-test-internet-speed-online-free",
    title: "How to Test Your Internet Speed Online — Free & No Signup Required",
    description:
      "Check your download speed, upload speed, ping, and jitter instantly in your browser — no apps, no signup, completely free.",
    category: "Network Tools",
    date: "2026-06-04",
    dateLabel: "June 4, 2026",
    author: "Skycally Team",
    ctaToolSlug: "network-speed-test",
    thumbnail: networkSpeedTestThumb,
    thumbnailAlt: "Network Speed Test tool interface",
  },
];

export const getBlogPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
