import type { LucideIcon } from "lucide-react";
import {
  FileArchive,
  Video,
  Palette,
  Code2,
  Gauge,
  BarChart3,
  MessageCircleHeart,
  TrendingUp,
  Wallet,
  Brain,
  Users,
  Ban,
} from "lucide-react";
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
  {
    slug: "3-months-of-search-console-data-free-tools-site",
    path: "/blog/3-months-of-search-console-data-free-tools-site",
    title: "We Tracked Our Own Google Search Console Data for 3 Months — Here's What Actually Drives Traffic",
    description:
      "Real numbers from Skycally's own Search Console and Analytics data: which free tools actually get clicked, which get buried on page 7, and what that taught us about ranking a multi-tool site.",
    category: "Behind the Scenes",
    date: "2026-08-05",
    dateLabel: "August 5, 2026",
    author: "Skycally Team",
    ctaToolSlug: "word-counter",
    heroIcon: BarChart3,
    heroAccent: "cyan",
  },
  {
    slug: "psychology-behind-truth-or-dare",
    path: "/blog/psychology-behind-truth-or-dare",
    title: "The Psychology Behind Truth or Dare: Why We Confess to Near-Strangers",
    description:
      "Why does a party game get people to admit things they'd never say otherwise? A look at self-disclosure, reciprocity, and the 'stranger on a train' effect behind Truth or Dare.",
    category: "Psychology",
    date: "2026-08-06",
    dateLabel: "August 6, 2026",
    author: "Skycally Team",
    ctaToolSlug: "truth-or-dare",
    heroIcon: MessageCircleHeart,
    heroAccent: "pink",
  },
  {
    slug: "silent-bug-costing-ad-revenue-39-pages",
    path: "/blog/silent-bug-costing-ad-revenue-39-pages",
    title: "The Silent Bug That Was Quietly Costing Us Ad Revenue on 39 Pages",
    description:
      "No error, no crash, no console warning — just 39 tool pages on our own site with no ad slot at all. How we found it, why it happened, and what auditing your own site actually looks like.",
    category: "Behind the Scenes",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    author: "Skycally Team",
    ctaToolSlug: "link-shortener",
    heroIcon: BarChart3,
    heroAccent: "amber",
  },
  {
    slug: "how-compound-interest-actually-works",
    path: "/blog/how-compound-interest-actually-works",
    title: "How Compound Interest Actually Works: The Math Behind the Calculator",
    description:
      "The real formula behind compound interest, worked examples with actual numbers, why monthly contributions change everything, and the difference between interest rate and APY that most explanations skip.",
    category: "Finance",
    date: "2026-08-08",
    dateLabel: "August 8, 2026",
    author: "Skycally Team",
    ctaToolSlug: "compound-interest",
    heroIcon: TrendingUp,
    heroAccent: "cyan",
  },
  {
    slug: "why-your-paycheck-isnt-what-you-expect",
    path: "/blog/why-your-paycheck-isnt-what-you-expect",
    title: "Why Your Paycheck Isn't What You Expect: FICA, Taxes, and Deductions Explained",
    description:
      "The real math behind the gap between your salary and your take-home pay — Social Security and Medicare tax, the wage base cap high earners hit, and how pre-tax deductions actually work.",
    category: "Finance",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    author: "Skycally Team",
    ctaToolSlug: "paycheck-calculator",
    heroIcon: Wallet,
    heroAccent: "amber",
  },
  {
    slug: "psychology-of-jigsaw-puzzles",
    path: "/blog/psychology-of-jigsaw-puzzles",
    title: "The Psychology of Jigsaw Puzzles: Why Your Brain Finds Them So Satisfying",
    description:
      "What's actually happening in your brain when you solve a jigsaw puzzle — the dopamine, the flow state, why it's used in cognitive research, and why unfinished puzzles are so hard to walk away from.",
    category: "Psychology",
    date: "2026-08-10",
    dateLabel: "August 10, 2026",
    author: "Skycally Team",
    ctaToolSlug: "jigsaw-puzzle",
    heroIcon: Brain,
    heroAccent: "violet",
  },
  {
    slug: "attachment-styles-explained",
    path: "/blog/attachment-styles-explained",
    title: "Attachment Styles Explained: What Secure, Anxious, and Avoidant Actually Mean",
    description:
      "Where attachment theory actually comes from, what the four adult attachment styles really describe, and why your style isn't a fixed label you're stuck with forever.",
    category: "Psychology",
    date: "2026-08-10",
    dateLabel: "August 10, 2026",
    author: "Skycally Team",
    ctaToolSlug: "attachment-style-test",
    heroIcon: Users,
    heroAccent: "pink",
  },
  {
    slug: "why-we-rejected-5-tool-ideas",
    path: "/blog/why-we-rejected-5-tool-ideas",
    title: "Why We Rejected 5 Tool Ideas That Looked Profitable on Paper",
    description:
      "Background remover, PDF converters, mortgage calculators, tip calculators, and a wheel-of-names tool all looked like great opportunities — until we checked who actually ranks for them. Here's the research that changed our roadmap.",
    category: "Behind the Scenes",
    date: "2026-08-11",
    dateLabel: "August 11, 2026",
    author: "Skycally Team",
    ctaToolSlug: "image-compressor",
    heroIcon: Ban,
    heroAccent: "violet",
  },
];

export const getBlogPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
