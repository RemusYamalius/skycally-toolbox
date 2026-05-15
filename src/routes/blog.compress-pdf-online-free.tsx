import { createFileRoute } from "@tanstack/react-router";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("compress-pdf-online-free")!;

export const Route = createFileRoute("/blog/compress-pdf-online-free")({
  head: () => {
    const base = buildPageMeta({
      title: post.title,
      description: post.description,
      path: post.path,
    });
    return {
      ...base,
      meta: [...base.meta, { property: "og:type", content: "article" }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  return (
    <BlogPostLayout post={post}>
      {/* ARTICLE CONTENT GOES HERE */}
      <p>Article content coming soon.</p>
    </BlogPostLayout>
  );
}
