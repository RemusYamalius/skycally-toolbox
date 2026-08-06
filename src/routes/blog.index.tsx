import { createFileRoute } from "@tanstack/react-router";
import { BlogCard } from "@/components/blog-card";
import { blogPosts } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  head: () =>
    buildPageMeta({
      title: "Skycally Blog — Tips, Guides & Tutorials",
      description: "Tips, guides and tutorials for getting the most out of free online tools.",
      path: "/blog",
    }),
  component: BlogIndex,
});

function BlogIndex() {
  // Sort newest-first. Previously rendered in array/insertion order, which
  // meant the newest articles (added at the end of the blogPosts array)
  // showed up at the bottom of the page instead of the top.
  const sortedPosts = [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10 sm:mb-14 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Skycally Blog</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Tips, guides and tutorials for getting the most out of free online tools.
        </p>
      </header>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        {sortedPosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
