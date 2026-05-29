import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { tools, categoryMeta, toolInCategory, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";
import { buildPageMeta, SITE_URL } from "@/lib/seo";

const VALID_CATS = ["all", "video", "image", "audio", "pdf", "text", "ai", "utility", "games", "minigames"] as const;
type CatParam = (typeof VALID_CATS)[number];

export const Route = createFileRoute("/tools/")({
  validateSearch: (search: Record<string, unknown>): { cat?: CatParam } => {
    const cat = search.cat;
    if (typeof cat === "string" && (VALID_CATS as readonly string[]).includes(cat)) {
      return { cat: cat as CatParam };
    }
    return {};
  },
  head: () => {
    const title = "All Free Online Tools — Skycally";
    const description = "Browse 40+ free tools: compress images, convert PDFs, generate QR codes, download videos and more. All free, all private.";
    const base = buildPageMeta({ title, description, path: "/tools" });
    const visible = tools.filter((t) => !t.hidden);
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            url: `${SITE_URL}/tools`,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: visible.length,
              itemListElement: visible.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}${t.path}`,
                name: t.name,
                description: t.description,
              })),
            },
          }),
        },
      ],
    };
  },
  component: ToolsPage,
});

const cats: ("all" | ToolCategory)[] = ["all", "ai", "video", "image", "audio", "pdf", "text", "utility", "games", "minigames"];

function ToolsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tools" });
  const [cat, setCat] = useState<"all" | ToolCategory>(search.cat ?? "all");
  const [q, setQ] = useState("");

  useEffect(() => {
    setCat(search.cat ?? "all");
  }, [search.cat]);

  const onPickCat = (c: "all" | ToolCategory) => {
    setCat(c);
    navigate({ search: c === "all" ? {} : { cat: c }, replace: true });
  };

  const list = useMemo(() => tools.filter((t) => !t.hidden && (cat === "all" || toolInCategory(t, cat)) && (t.name + t.description).toLowerCase().includes(q.toLowerCase())), [cat, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold">All Tools</h1>
        <p className="mt-3 text-muted-foreground">Filter by category or search by name.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools..." className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => onPickCat(c)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition border ${cat === c ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
            >
              {c === "all" ? "All" : categoryMeta[c].label}
            </button>
          ))}
        </div>
      </div>

      {cat === "all" ? (
        <div className="space-y-14">
          {(["ai", "video", "image", "audio", "pdf", "text", "utility", "games", "minigames"] as ToolCategory[]).map((c) => {
            const groupList = list.filter((t) => toolInCategory(t, c));
            if (groupList.length === 0) return null;
            const meta = categoryMeta[c];
            return (
              <section key={c} className="border-t border-border/60 pt-10 first:border-t-0 first:pt-0">
                <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)`, color: meta.color }}
                    >
                      <span aria-hidden>{meta.icon}</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold">{meta.label}</h2>
                  </div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ background: `color-mix(in oklab, ${meta.color} 12%, transparent)`, color: meta.color }}
                  >
                    {groupList.length} {groupList.length === 1 ? "tool" : "tools"}
                  </span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {groupList.map((t, i) => <ToolCard key={t.slug} tool={t} index={i} />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => <ToolCard key={t.slug} tool={t} index={i} />)}
        </div>
      )}
      {list.length === 0 && <p className="text-center py-20 text-muted-foreground">No tools match your search.</p>}
    </div>
  );
}
