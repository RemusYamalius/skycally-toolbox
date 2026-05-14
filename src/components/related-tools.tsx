import { ToolCard } from "./tool-card";
import { getRelatedTools } from "@/lib/related-tools";

export function RelatedTools({ currentSlug }: { currentSlug: string }) {
  const related = getRelatedTools(currentSlug);
  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <header className="mb-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          You might also like
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Other tools you might find useful.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((tool, i) => (
          <ToolCard key={tool.slug} tool={tool} index={i} />
        ))}
      </div>
    </section>
  );
}
