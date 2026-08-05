import type { LucideIcon } from "lucide-react";
import { FileArchive, Video, Palette, Code2, Gauge } from "lucide-react";
import type { BlogAccent } from "@/components/blog-hero";

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
  heroIcon: LucideIcon;
  heroAccent: BlogAccent;
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
    heroIcon: FileArchive,
    heroAccent: "violet",
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
    heroIcon: Video,
    heroAccent: "cyan",
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
    heroIcon: Palette,
    heroAccent: "pink",
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
    heroIcon: Code2,
    heroAccent: "violet",
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
    heroIcon: Gauge,
    heroAccent: "amber",
  },
];

export const getBlogPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
