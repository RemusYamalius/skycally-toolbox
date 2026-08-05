import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { BlogHero } from "@/components/blog-hero";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={post.path}
      className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-elevated)]"
    >
      <BlogHero icon={post.heroIcon} accent={post.heroAccent} variant="card" />
      <div className="p-6">
        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {post.category}
        </span>
        <h3 className="mt-3 font-display font-semibold text-xl leading-snug">{post.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <time className="text-xs text-muted-foreground" dateTime={post.date}>
            {post.dateLabel}
          </time>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Read post<span className="sr-only">: {post.title}</span>{" "}
            <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
