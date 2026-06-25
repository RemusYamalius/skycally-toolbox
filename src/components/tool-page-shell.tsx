import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  title: string;
  description: string;
  children: React.ReactNode;
  showFileDisclaimer?: boolean;
}

export function ToolPageShell({ title, description, children, showFileDisclaimer = true }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link
        to="/tools"
        aria-label="Back to all tools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to all tools
      </Link>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{description}</p>
        {showFileDisclaimer && (
          <div
            role="note"
            aria-label="Privacy notice: no files are stored on our servers"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--green-brand)" }} aria-hidden="true" />
            No files are stored on our servers
          </div>
        )}
      </motion.header>
      {children}
    </div>
  );
}
