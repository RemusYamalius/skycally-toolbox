import type { LucideIcon } from "lucide-react";

export type BlogAccent = "cyan" | "violet" | "pink" | "amber";

const ACCENT_GRADIENTS: Record<BlogAccent, string> = {
  cyan: "linear-gradient(135deg, var(--violet-brand) 0%, var(--cyan-brand) 100%)",
  violet: "linear-gradient(135deg, var(--cyan-brand) 0%, var(--violet-brand) 100%)",
  pink: "linear-gradient(135deg, var(--violet-brand) 0%, #ec4899 100%)",
  amber: "linear-gradient(135deg, var(--cyan-brand) 0%, #f59e0b 100%)",
};

/**
 * A single, consistent branded hero banner for every blog post — a gradient
 * (reusing the same violet→cyan brand gradient already established across
 * Blind Match, Purity Test, and Jigsaw Puzzle) with a large topic icon.
 *
 * Replaces per-post screenshot thumbnails: adding a new post only requires
 * picking an icon and an accent, not designing/exporting/maintaining an
 * image file.
 */
export function BlogHero({
  icon: Icon,
  accent = "cyan",
  variant = "card",
  className = "",
}: {
  icon: LucideIcon;
  accent?: BlogAccent;
  variant?: "card" | "hero";
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${
        variant === "card" ? "h-[200px] rounded-t-2xl" : "aspect-[16/9] rounded-2xl border border-border"
      } ${className}`}
      style={{ background: ACCENT_GRADIENTS[accent] }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <Icon
        className={`relative ${variant === "card" ? "h-16 w-16" : "h-24 w-24"} text-white/90`}
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}
