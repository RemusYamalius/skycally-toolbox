import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { BlogPost } from "@/lib/blog";
import { tools } from "@/lib/tools";
import { RelatedTools } from "@/components/related-tools";

export function BlogPostLayout({
  post,
  children,
}: {
  post: BlogPost;
  children: ReactNode;
}) {
  const ctaTool = tools.find((t) => t.slug === post.ctaToolSlug);

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {post.category}
        </span>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <time dateTime={post.date}>{post.dateLabel}</time>
          <span aria-hidden>·</span>
          <span>By {post.author}</span>
        </div>
      </header>

      <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground">
        {children}
      </article>

      {ctaTool && (
        <aside className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold">
            Ready to try {ctaTool.name}?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {ctaTool.description}
          </p>
          <Link
            to={ctaTool.path}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Try it free <ArrowRight className="w-4 h-4" />
          </Link>
        </aside>
      )}

      <RelatedTools currentSlug={post.ctaToolSlug} />
    </div>
  );
}
