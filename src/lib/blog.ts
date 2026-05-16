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
    description:
      "Shrink large PDF files in seconds — right in your browser. No installs, no accounts, no watermarks.",
    category: "PDF & Documents",
    date: "2026-05-16",
    dateLabel: "May 16, 2026",
    author: "Skycally Team",
    ctaToolSlug: "compress-pdf",
    thumbnail: "https://placehold.co/800x400/0d1526/22d3ee?text=Compress+PDF",
    thumbnailAlt: "Compress PDF tool interface",
  },
  {
    slug: "video-to-gif-online-free",
    path: "/blog/video-to-gif-online-free",
    title: "How to Convert Video to GIF Online for Free",
    description:
      "Turn any video clip into a shareable GIF in seconds — no software needed, works in your browser.",
    category: "Video Tools",
    date: "2026-05-17",
    dateLabel: "May 17, 2026",
    author: "Skycally Team",
    ctaToolSlug: "video-to-gif",
    thumbnail: "https://placehold.co/800x400/0d1526/22d3ee?text=Video+to+GIF",
    thumbnailAlt: "Video to GIF tool interface",
  },
];

export const getBlogPostBySlug = (slug: string) =>
  blogPosts.find((p) => p.slug === slug);
