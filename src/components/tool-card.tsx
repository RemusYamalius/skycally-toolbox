import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { categoryMeta, isNewTool, type Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool; index?: number }) {
  const Icon = tool.icon;
  const color = categoryMeta[tool.category].color;
  const isNew = isNewTool(tool);
  return (
    <div>
      <Link
        to={tool.path}
        className="group relative block rounded-2xl border border-border bg-card p-6 transition-all md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-elevated)]"
        style={{ transform: "translateZ(0)" }}
      >
        <div
          className="hidden md:block absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
          style={{ boxShadow: `0 0 60px -20px ${color}` }}
        />
        {isNew && (
          <span
            className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: "linear-gradient(135deg, var(--cyan-brand), var(--violet-brand))" }}
          >
            New
          </span>
        )}
        <div className="flex items-center justify-between mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
          >
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {categoryMeta[tool.category].label}
          </span>
        </div>
        <h3 className="font-display font-semibold text-lg mb-1.5">{tool.name}</h3>
        <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{tool.description}</p>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
          Try it <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
}
