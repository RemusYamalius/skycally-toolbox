import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to="/blog/compress-pdf-online-free"
      className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-elevated)]"
    >
      <div
        className="aspect-[16/9] flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, hsl(var(--primary)) 22%, transparent), color-mix(in oklab, hsl(var(--primary)) 6%, transparent))",
        }}
        aria-hidden
      >
        <FileText className="w-12 h-12 text-primary/70" />
      </div>
      <div className="p-6">
        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {post.category}
        </span>
        <h3 className="mt-3 font-display font-semibold text-xl leading-snug">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {post.description}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <time className="text-xs text-muted-foreground" dateTime={post.date}>
            {post.dateLabel}
          </time>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Read more <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
