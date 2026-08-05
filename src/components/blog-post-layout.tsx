import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { BlogPost } from "@/lib/blog";
import { tools } from "@/lib/tools";
import { RelatedTools } from "@/components/related-tools";
import { BlogHero } from "@/components/blog-hero";

export function BlogPostLayout({ post, children }: { post: BlogPost; children: ReactNode }) {
  const ctaTool = tools.find((t) => t.slug === post.ctaToolSlug);

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]">
      <header className="mb-10">
        <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {post.category}
        </span>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <time dateTime={post.date}>{post.dateLabel}</time>
          <span aria-hidden>·</span>
          <span>By {post.author}</span>
        </div>
        <BlogHero icon={post.heroIcon} accent={post.heroAccent} variant="hero" className="mt-8" />
      </header>

      <article
        className="max-w-none text-foreground/90
          [&_h2]:font-display [&_h2]:tracking-tight [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-foreground
          [&_h3]:font-display [&_h3]:tracking-tight [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-foreground
          [&_p]:my-5 [&_p]:leading-[1.8]
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol]:space-y-2
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-2
          [&_li]:leading-[1.8] [&_li>ul]:my-2
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80"
      >
        {children}
      </article>

      {ctaTool && (
        <aside className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold">Ready to try {ctaTool.name}?</h2>
          <p className="mt-2 text-sm text-muted-foreground">{ctaTool.description}</p>
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
