import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { categoryMeta, type Tool } from "@/lib/tools";

export function ToolCard({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const Icon = tool.icon;
  const color = categoryMeta[tool.category].color;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Link
        to={tool.path}
        className="group relative block rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
      >
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
          style={{ boxShadow: `0 0 60px -20px ${color}` }}
        />
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
    </motion.div>
  );
}
