import { createFileRoute } from "@tanstack/react-router";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("video-to-gif-online-free")!;

export const Route = createFileRoute("/blog/video-to-gif-online-free")({
  head: () => {
    const base = buildPageMeta({
      title: post.title,
      description: post.description,
      path: post.path,
    });
    return {
      ...base,
      meta: [...base.meta, { property: "og:type", content: "article" }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "How to Convert Video to GIF Online for Free",
          "datePublished": "2026-05-17",
          "dateModified": "2026-05-17",
          "author": {
            "@type": "Organization",
            "name": "Skycally",
            "url": "https://skycally.com"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Skycally",
            "url": "https://skycally.com",
            "logo": {
              "@type": "ImageObject",
              "url": "https://skycally.com/favicon.ico"
            }
          },
          "url": "https://skycally.com/blog/video-to-gif-online-free",
          "description": "Turn any video clip into a shareable GIF in seconds — no software needed, works in your browser."
        }),
      }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  return (
    <BlogPostLayout post={post}>
      <p>Article content coming soon.</p>
    </BlogPostLayout>
  );
}
